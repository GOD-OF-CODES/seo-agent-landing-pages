/**
 * Builds the two standalone landing pages in public/ from the Claude Design
 * sources in design/.
 *
 * The .dc.html sources are canvas documents: they lean on the design-canvas
 * runtime (support.js / image-slot.js) for four things that plain HTML does not
 * have. This script replaces each of them with real markup at build time, so the
 * output is a self-contained page with no framework and no template runtime:
 *
 *   <x-dc> / <helmet>      ->  a real <head> + body
 *   style-hover="..."      ->  a generated class + a :hover rule
 *   <sc-for> and {{ ... }} ->  expanded, with the component's own renderVals()
 *                              executed here in Node
 *   <image-slot>           ->  <img>
 *
 * The one piece of genuine interactivity in the "current" page (the audit
 * button flipping the health score) survives as ~15 lines of vanilla JS: every
 * binding whose value differs between audited/not-audited is emitted carrying
 * its other value in data-alt, and the click handler swaps them in.
 *
 * Run: node build.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, 'design');
const OUT = path.join(ROOT, 'public');

const PAGES = [
  {
    src: 'current landing page.dc.html',
    out: 'v1.html',
    title: 'SEO Agent — the marketing hire that never sleeps',
    description:
      'An AI agent that audits your site, plans the quarter, writes and publishes the work, runs outreach and reports every Friday.',
    // The canvas stores the chosen prop values as the `default` in data-props.
    props: { accent: '#101014', motion: 'Playful' },
    // :root ships a blue --a that componentDidMount overwrites with props.accent.
    // Bake the resolved value in so the page needs no JS to look right.
    rootAccent: '#101014',
  },
  {
    src: 'landing page funky version.dc.html',
    out: 'v2.html',
    title: 'seo agent — the funky one',
    description:
      'Same agent, louder. Audits, plans, writes, publishes, chases links and reports every Friday.',
    props: {},
    rootAccent: null,
  },
];

/* ── template evaluation ─────────────────────────────────────────────────── */

const esc = s =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Every expression in these two pages is either a bare name, a single property
// access, or the literal `true` — no operators, no calls. Keep the evaluator
// that small rather than pulling in a parser.
function evalExpr(expr, scope) {
  const src = expr.trim();
  if (src === 'true') return true;
  if (src === 'false') return false;
  const parts = src.split('.');
  let v = scope[parts[0]];
  for (let i = 1; i < parts.length && v != null; i++) v = v[parts[i]];
  if (v === undefined) throw new Error(`unresolved binding: {{ ${src} }}`);
  return v;
}

const BINDING = /\{\{([^}]*)\}\}/g;

/** Resolve every {{ }} in an attribute value against one scope. */
const fillAttr = (value, scope) =>
  value.replace(BINDING, (_, expr) => esc(evalExpr(expr, scope)));

/**
 * Resolve bindings in a chunk of markup against two scopes — the current state
 * and the state the page moves to when the audit button is pressed. Anything
 * that reads the same in both is emitted plainly; anything that differs is
 * emitted with its alternate value alongside, for the click handler to pick up.
 */
function interpolate(html, scopeA, scopeB) {
  // Attributes first, so the leftover bindings are unambiguously text nodes.
  html = html.replace(
    /\s([a-zA-Z][a-zA-Z0-9:-]*)="([^"]*\{\{[^"]*)"/g,
    (whole, name, value) => {
      // onClick="{{ handler }}" is a canvas event binding, not an attribute:
      // keep the handler's name for the script at the foot of the page.
      if (/^on/i.test(name)) {
        return ` data-dc-click="${esc(value.replace(BINDING, '$1').trim())}"`;
      }

      const a = fillAttr(value, scopeA);
      const b = fillAttr(value, scopeB);

      // A lone boolean binding is a presence attribute: open="{{ true }}".
      const bare = value.trim().match(/^\{\{([^}]*)\}\}$/);
      if (bare) {
        const v = evalExpr(bare[1], scopeA);
        if (v === true) return ` ${name}`;
        if (v === false || v == null) return '';
      }

      return a === b
        ? ` ${name}="${a}"`
        : ` ${name}="${a}" data-alt-attr="${esc(JSON.stringify({ [name]: b }))}"`;
    }
  );

  return html.replace(BINDING, (_, expr) => {
    const a = esc(evalExpr(expr, scopeA));
    const b = esc(evalExpr(expr, scopeB));
    return a === b ? a : `<span data-alt="${b}">${a}</span>`;
  });
}

/** Expand every <sc-for list="{{ xs }}" as="x"> block. They are never nested. */
function expandLoops(html, valsA, valsB) {
  return html.replace(
    /<sc-for\s+list="\{\{([^}]*)\}\}"\s+as="([^"]*)"[^>]*>([\s\S]*?)<\/sc-for>/g,
    (_, listExpr, alias, body) => {
      const listA = evalExpr(listExpr, valsA);
      const listB = evalExpr(listExpr, valsB);
      return listA
        .map((item, i) =>
          interpolate(
            body,
            { ...valsA, [alias]: item },
            { ...valsB, [alias]: listB[i] ?? item }
          )
        )
        .join('');
    }
  );
}

/* ── canvas-only markup -> real markup ───────────────────────────────────── */

/**
 * style-hover / style-focus become a generated class plus a rule. Each
 * declaration needs !important: the base styling is an inline style attribute,
 * which outranks any selector no matter how specific.
 */
function extractStateStyles(html) {
  const rules = [];
  let n = 0;

  const out = html.replace(
    /<([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|[^>"])*)>/g,
    (whole, tag, attrs) => {
      if (!/style-(hover|focus)=/.test(attrs)) return whole;
      const cls = `s${++n}`;
      const cleaned = attrs.replace(
        /\s(style-(?:hover|focus))="([^"]*)"/g,
        (_, kind, decls) => {
          const body = decls
            .split(';')
            .map(d => d.trim())
            .filter(Boolean)
            .map(d => `${d} !important`)
            .join(';');
          rules.push(`.${cls}:${kind === 'style-hover' ? 'hover' : 'focus'}{${body}}`);
          return '';
        }
      );
      return `<${tag} class="${cls}"${cleaned}>`;
    }
  );

  return { html: out, css: rules.join('\n') };
}

/** <image-slot> is a drag-and-drop placeholder in the canvas; here it is an <img>. */
function replaceImageSlots(html) {
  return html.replace(
    /<image-slot((?:"[^"]*"|[^>"])*)><\/image-slot>/g,
    (_, attrs) => {
      const attr = name => {
        const m = attrs.match(new RegExp(`\\s${name}="([^"]*)"`));
        return m ? m[1] : '';
      };
      const style = [
        attr('style'),
        'display:block',
        'object-fit:cover',
        attr('style') ? '' : 'width:100%;height:100%',
        attr('shape') === 'circle' ? 'border-radius:50%' : '',
      ]
        .filter(Boolean)
        .join(';');
      const alt = attr('credit') || attr('placeholder');
      return `<img src="${attr('src')}" alt="${alt}" loading="lazy" style="${style}">`;
    }
  );
}

/* ── the canvas component, executed here ─────────────────────────────────── */

/**
 * Run the page's own <script type="text/x-dc"> and pull renderVals() out of it,
 * once per state. The class extends DCLogic, so stub the base and skip the
 * lifecycle hooks — they only push props.accent into a CSS variable, which the
 * build bakes into :root instead.
 */
function renderVals(logic, props, state) {
  const ctx = vm.createContext({
    DCLogic: class {
      setState() {}
    },
    console,
  });
  const Component = vm.runInContext(`${logic}\n;Component`, ctx);
  const inst = new Component();
  inst.props = props;
  inst.state = { ...inst.state, ...state };
  return inst.renderVals();
}

/* ── page assembly ───────────────────────────────────────────────────────── */

function build(page) {
  const raw = fs.readFileSync(path.join(SRC, page.src), 'utf8');

  const helmet = raw.match(/<helmet[^>]*>([\s\S]*?)<\/helmet>/)[1];
  let body = raw.slice(raw.indexOf('</helmet>') + '</helmet>'.length, raw.lastIndexOf('</x-dc>'));

  // The component script is a sibling of <x-dc>, not a child of it.
  const logicMatch = raw.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/);
  let interactive = false;
  if (logicMatch) {
    const valsA = renderVals(logicMatch[1], page.props, { audited: false });
    const valsB = renderVals(logicMatch[1], page.props, { audited: true });
    body = expandLoops(body, valsA, valsB);
    body = interpolate(body, valsA, valsB);
    interactive = true;
  } else {
    body = interpolate(body, {}, {});
  }

  body = replaceImageSlots(body);
  body = body.replace(/\shint-placeholder-count="[^"]*"/g, '');

  const { html: bodyHtml, css: stateCss } = extractStateStyles(body);

  // Head: the helmet's font <link> and <style>, minus the canvas runtime script.
  let head = helmet.replace(/<script src="\.\/image-slot\.js"><\/script>\s*/g, '').trim();
  if (page.rootAccent) {
    head = head.replace(/--a:#[0-9a-fA-F]{3,8}/, `--a:${page.rootAccent}`);
  }

  const audit = interactive
    ? `
<script>
  // The audit button is the page's only stateful control. Every binding that
  // reads differently once the audit has run carries its other value in
  // data-alt / data-alt-attr; swap them in place so nothing re-renders and no
  // entry animation replays.
  document.querySelectorAll('[data-dc-click="runAudit"]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (document.documentElement.dataset.audited === 'true') return;
      document.documentElement.dataset.audited = 'true';
      document.querySelectorAll('[data-alt]').forEach(function (el) {
        el.textContent = el.getAttribute('data-alt');
      });
      document.querySelectorAll('[data-alt-attr]').forEach(function (el) {
        var next = JSON.parse(el.getAttribute('data-alt-attr'));
        Object.keys(next).forEach(function (name) { el.setAttribute(name, next[name]); });
      });
    });
  });
</script>`
    : '';

  const out = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${page.title}</title>
<meta name="description" content="${esc(page.description)}">
${head}
<style>
${stateCss}
</style>
</head>
<body>
${bodyHtml.trim()}
${audit}
</body>
</html>
`;

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, page.out), out);

  // Nothing canvas-specific may survive into the output.
  const leftovers = ['{{', '<sc-for', 'style-hover=', 'style-focus=', '<image-slot', '<x-dc', '<helmet']
    .filter(needle => out.includes(needle));
  if (leftovers.length) throw new Error(`${page.out}: unconverted ${leftovers.join(', ')}`);

  console.log(`${page.out.padEnd(8)} ${(out.length / 1024).toFixed(1)} KB  <- ${page.src}`);
}

PAGES.forEach(build);
