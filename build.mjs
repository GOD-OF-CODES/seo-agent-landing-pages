/**
 * Builds the landing page in public/ from the Claude Design source in design/.
 *
 * The .dc.html source is a canvas document: it leans on the design-canvas
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
 * The site was three pages until 2026-09-09 — a product-led one, a loud one and
 * this quiet one — and the loop expander, the renderVals() sandbox and the
 * data-alt state swap below are all machinery the product-led page needed. The
 * page that remains uses none of them. They are kept deliberately, so a canvas
 * document with loops or state can be dropped in without rebuilding this file;
 * `git log` has the two pages that are gone.
 *
 * A page marked `responsive` additionally gets a mobile layout the canvas does
 * not emit — see MOBILE_RULES below.
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
    // The site. `index.html`, so it is served at `/` — it was `/v3` while there
    // were three of these to choose between, and the file name is what makes it
    // the root now; nothing else routes.
    //
    // The source file keeps its canvas name: it is the import target from the
    // design project, and renaming it here would break the next import.
    src: 'landing page muted version.dc.html',
    out: 'index.html',
    responsive: true,
    // Titled from its own copy rather than "the muted one", which only meant
    // anything next to the louder version it was picked over.
    title: 'seo agent — fire your digital marketer',
    description:
      'Every job a digital marketer does — keywords, content, backlinks, technical, local, paid, reporting. You approve; it works through the night.',
    props: {},
    rootAccent: null,
    // The page ground, asked for as plain white. `--cream` is the body
    // background and three bordered surfaces on top of it — the header pill and
    // the two pricing cards — which read as separate from the ground because of
    // their 4px ink border and hard shadow, not because of their fill. So the
    // token moves as one and they stay legible on the lighter ground.
    palette: { '--cream': '#ffffff' },
    recolours: [
      {
        // The header CTA, blue against a page that has blue in several other
        // places; asked for as the palette's ochre so it stops competing with
        // the teal "start free trial" in the hero. Its hover already goes to
        // teal (`--pink`), which still reads as a change from ochre.
        what: 'header CTA',
        find: 'padding:12px 22px;border:3px solid var(--ink);border-radius:999px;background:var(--violet)',
        css: 'background:var(--tang)',
      },
    ],
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

/* ── mobile layout ───────────────────────────────────────────────────────── */

/**
 * The canvas emits one desktop layout: `clamp()` for type and padding, and
 * `auto-fit` for most grids — those already reflow. What does not are the grids
 * with an explicit column count, and the header, which assumes there is room for
 * the wordmark and the whole nav on one line. There are no media queries at all.
 *
 * Rather than edit the .dc.html (it is overwritten on the next import from the
 * design project), each rule below finds elements by a distinctive slice of
 * their inline style, gives them a generated class, and emits a media query
 * against it. Declarations need !important for the same reason the hover rules
 * do — they are competing with an inline style attribute.
 *
 * `find` should be a slice of *layout* only, and colour belongs in `recolours`
 * instead. That was once load-bearing — this pass ran on the louder page too,
 * which was the same markup in a different palette, so a colour-keyed rule
 * matched one and missed the other. With one page left it is a convention
 * rather than a constraint, but it is the right split: these rules are about
 * what the layout does at a width, and nothing here should move if the palette
 * changes.
 *
 * A rule that matches nothing is a hard build error either way — it means the
 * design moved underneath us and the page silently lost its mobile layout.
 */
const MOBILE_RULES = [
  {
    // Hero: copy on the left, the agent.log dashboard on the right. The two
    // stay side by side at any width, so on a phone each gets ~150px.
    find: 'grid-template-columns:minmax(0,1.15fr)',
    at: 860,
    css: 'grid-template-columns:1fr',
  },
  {
    // The hand-drawn strike under "digital marketer." is an SVG at width:100% of
    // its span, and the span is display:block — so it measures the column, not
    // the words. The design gets away with it because at 104px the headline
    // very nearly fills its column anyway. Once the hero stacks, that column is
    // the full page width while the headline is still at its 46px floor, so the
    // line runs on past the text: 38px over at 390px, 296px over at 720px.
    // fit-content makes the span measure the words instead, which is what the
    // SVG wanted all along. It stays block, so it still gets its own line, and
    // where the headline wraps (under ~340px) it sizes to the longest line.
    find: 'display:block;position:relative;color:var(--violet)',
    at: 860,
    css: 'width:fit-content',
  },
  {
    // Same strike, vertical placement. Everything about it scales with the type
    // — the span's font-size, the `bottom:-.02em` it hangs from — except its own
    // `height:16px`. So the box keeps its size while the text shrinks, and the
    // stroke rides up: at 104px it sits 2.9px below the baseline and reads as an
    // underline, at 46px it sits 5.1px above it and crosses the letters.
    //
    // 16px at the design's 104px reference is .1538em, so saying that instead
    // holds the proportion at every size. It resolves to 16px at 104px, which
    // means the full-width desktop rendering is untouched; only the sizes that
    // were wrong move. The stroke thins with the type as it should, since the
    // path's width follows the viewBox.
    find: 'bottom:-.02em;width:100%;height:16px',
    at: null,
    css: 'height:.1538em',
  },
  {
    // Below ~360px "digital marketer." no longer fits one line at the clamp's
    // 46px floor, and a wrapped headline puts fit-content back to the column
    // width — fit-content clamps to what is available, so it tracks the column
    // rather than the longest line. Dropping the floor keeps the headline on one
    // line, which both reads better and lets the rule above do its job. 12.8vw
    // is the largest that still fits, and 360 is where it hands back over: at
    // 361px the 46px floor has just enough room again.
    find: 'font-size:clamp(46px,7.4vw,104px)',
    at: 360,
    css: 'font-size:12.8vw',
  },
  {
    // The header pill. Wrapping it puts the wordmark on one line and the nav on
    // the next, which is what the shape can afford; a pill radius that big looks
    // wrong once it is two rows tall.
    find: 'padding:11px 14px 11px 20px',
    at: 720,
    css: 'flex-wrap:wrap;row-gap:12px;border-radius:26px;padding:14px 16px',
  },
  {
    // "seo agent" is 2 words at 21px and breaks across 3 lines in a narrow pill.
    find: 'font-size:21px;font-weight:800;letter-spacing:-.04em',
    at: 720,
    css: 'white-space:nowrap',
  },
  {
    // The nav links + CTA. Once the pill wraps, this becomes the second row, so
    // it wants the full width rather than `margin-left:auto`.
    find: 'margin-left:auto;display:flex;align-items:center;gap:20px',
    at: 720,
    css: 'width:100%;margin-left:0;justify-content:space-between;gap:10px;font-size:14px',
    // "what it does" is three words and breaks mid-link otherwise, which leaves
    // the row on two ragged baselines.
    childCss: 'white-space:nowrap',
  },
  {
    // The CTA, once it is sharing a row with all three links.
    find: 'padding:12px 22px',
    at: 720,
    css: 'padding:10px 15px;font-size:14px',
  },
  {
    // Below ~360px the row cannot hold three links and the CTA even at their
    // tightest — the links are anchors to sections further down the same page,
    // so drop them and keep the one control that goes somewhere else. 375px
    // (the narrowest iPhone still in use) keeps the full nav.
    find: 'color:var(--ink);font-size:15px;font-weight:600',
    at: 360,
    css: 'display:none',
  },
  {
    // ...which leaves the CTA alone on its row, so let it span.
    find: 'padding:12px 22px',
    at: 360,
    css: 'width:100%',
  },
  {
    // The four-column comparison table. Only the row labels are prose and the
    // values are all short ("no", "$5,000+"), so it fits a phone on tighter
    // metrics — better than stacking a comparison into cards or a scroller.
    find: 'grid-template-columns:minmax(160px,1.6fr) 1fr 1fr 1fr',
    at: 560,
    css: 'grid-template-columns:minmax(84px,1.5fr) 1fr 1fr 1fr',
    childCss: 'padding:9px 6px',
  },
  {
    find: "grid-template-columns:minmax(160px,1.6fr) 1fr 1fr 1fr;font-family:'Space Mono',monospace;font-size:12px",
    at: 560,
    css: 'font-size:9.5px',
  },
  {
    find: 'grid-template-columns:minmax(160px,1.6fr) 1fr 1fr 1fr;font-size:16px',
    at: 560,
    css: 'font-size:12.5px',
  },
];

/**
 * `repeat(auto-fit,minmax(320px,1fr))` reflows down to one column on its own —
 * but the 320px floor is a hard minimum, so once the container is narrower than
 * that the track overflows instead. `min(320px,100%)` is the standard repair and
 * is correct at every width: identical wherever the track fits, capped at the
 * container where it does not. Rewritten in place rather than overridden in a
 * media query, since there is no width at which the original is preferable.
 */
function fluidGrids(html) {
  let n = 0;
  const NEEDLE = 'repeat(auto-fit,minmax(';

  const out = html.replace(/grid-template-columns:[^;"]*/g, decl => {
    const at = decl.indexOf(NEEDLE);
    if (at === -1) return decl;

    // The minimum may itself be a function — minmax(max(280px,31%),1fr) — so
    // balance parens rather than splitting on the first comma.
    const start = at + NEEDLE.length;
    let depth = 0;
    for (let i = start; i < decl.length; i++) {
      const c = decl[i];
      if (c === '(') depth++;
      else if (c === ')') depth--;
      else if (c === ',' && depth === 0) {
        const min = decl.slice(start, i);
        if (min.startsWith('min(') || !/\d/.test(min)) return decl;
        n++;
        return `${decl.slice(0, start)}min(${min},100%)${decl.slice(i)}`;
      }
    }
    return decl;
  });

  return { html: out, count: n };
}

/**
 * The design guards against sideways scroll with `body{overflow-x:hidden}`, and
 * the guard has to sit on `html` for it to bite. Measured on the built page in
 * a 390px viewport, `documentElement.scrollWidth` / `clientWidth`:
 *
 *   design only, body{overflow-x:hidden}   459 / 375   scrolls sideways
 *   body{overflow-x:clip}                  459 / 375   scrolls sideways
 *   html{overflow-x:clip}                  375 / 375   clipped
 *
 * So a body-level guard does not reach the viewport in either flavour, and only
 * the root one does. What pokes out is the entry animations: they run on
 * `animation-timeline:view()`, so every section still below the fold sits parked
 * on the `from` keyframe — `fRise` rotated 1.5deg, `fSlideL`/`fSlideR` shifted
 * 70px. That is not a flash during load, it is the page's resting state at any
 * scroll position, and the rotation overshoot grows with section height, so it
 * is worst on a phone.
 *
 * Both selectors are in the guard and both matter. `html` does the clipping.
 * `body` is there only to override the design's own `hidden`: once the root has
 * an overflow of its own, body's value stops propagating and applies to body
 * itself, and `hidden` on one axis drags the other to `auto` — body becomes a
 * scroll container, and the sticky header, whose nearest scrollport is now body
 * rather than the viewport, scrolls away with the page (measured: header at
 * top:-1495 after a 1500px scroll). `clip` does not drag the other axis, so body
 * stays a normal box and the header holds at top:5.
 *
 * `clip` rather than `hidden` on `html` for the same reason — `hidden` would make
 * the root a scroll container and take the header down the same way. It leaves
 * `overflow-y` computed `visible`, and `animation-timeline:scroll(root)` on the
 * progress bar still drives.
 *
 * Browsers without `clip` ignore both declarations and keep the design's
 * `hidden`, i.e. today's behaviour.
 */
const VIEWPORT_GUARD = `html,body{overflow-x:clip}`;

const important = decls =>
  decls
    .split(';')
    .map(d => d.trim())
    .filter(Boolean)
    .map(d => `${d} !important`)
    .join(';');

/* ── per-page recolouring ────────────────────────────────────────────────── */

/**
 * Two ways to depart from the palette the canvas exported, both per page.
 *
 * They cannot go in the `.dc.html`: it is overwritten on the next import from
 * the design project. They are kept out of `MOBILE_RULES` because that pass is
 * about what the layout does at a width — a colour is not a breakpoint, and
 * `palette` has no equivalent there at all.
 *
 * `palette` retints a `:root` token, which moves every use of it at once.
 * `recolours` overrides one element, found by a slice of its inline style the
 * same way the mobile rules find theirs, and needs `!important` for the same
 * reason — it is competing with a `style` attribute.
 *
 * Both fail the build when they match nothing, so a design that moves underneath
 * us says so instead of quietly shipping the old colour.
 */
function applyPalette(head, palette) {
  let out = head;
  Object.entries(palette).forEach(([token, value]) => {
    const decl = new RegExp(`${token}:[^;}]*`);
    if (!decl.test(out)) {
      throw new Error(`palette token ${token} is not in :root — the design has moved`);
    }
    out = out.replace(decl, `${token}:${value}`);
  });
  return out;
}

function applyRecolours(html, recolours) {
  const hits = recolours.map(() => 0);

  const out = html.replace(
    /<([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|[^>"])*)>/g,
    (whole, tag, attrs) => {
      let el = whole;
      recolours.forEach((rule, i) => {
        if (!attrs.includes(rule.find)) return;
        hits[i]++;
        el = addClass(el, `c${i + 1}`);
      });
      return el;
    }
  );

  const missed = hits.map((n, i) => (n ? null : recolours[i].what)).filter(Boolean);
  if (missed.length) {
    throw new Error(
      `recolour matched nothing — the design has moved:\n  ${missed.join('\n  ')}`
    );
  }

  const css = recolours.map((rule, i) => `.c${i + 1}{${important(rule.css)}}`).join('\n');
  return { html: out, css };
}

/** Add a class to an opening tag, merging with one the hover pass already set. */
function addClass(open, cls) {
  return /\sclass="/.test(open)
    ? open.replace(/\sclass="([^"]*)"/, (_, c) => ` class="${c} ${cls}"`)
    : open.replace(/^<([a-zA-Z][a-zA-Z0-9-]*)/, `<$1 class="${cls}"`);
}

function applyMobileRules(html) {
  const hits = MOBILE_RULES.map(() => 0);

  const out = html.replace(
    /<([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|[^>"])*)>/g,
    (whole, tag, attrs) => {
      let el = whole;
      MOBILE_RULES.forEach((rule, i) => {
        if (!attrs.includes(rule.find)) return;
        hits[i]++;
        el = addClass(el, `m${i + 1}`);
      });
      return el;
    }
  );

  const missed = hits
    .map((n, i) => (n ? null : MOBILE_RULES[i].find))
    .filter(Boolean);
  if (missed.length) {
    throw new Error(
      `mobile rule matched nothing — the design has moved:\n  ${missed.join('\n  ')}`
    );
  }

  // One media query per breakpoint, widest first, so a narrower one still wins.
  // `at: null` means the rule holds at every width — a repair that is simply
  // correct rather than a small-screen accommodation.
  const base = [];
  const byBreakpoint = new Map();
  MOBILE_RULES.forEach((rule, i) => {
    const decls = [`.m${i + 1}{${important(rule.css)}}`];
    if (rule.childCss) decls.push(`.m${i + 1}>*{${important(rule.childCss)}}`);
    if (rule.at == null) base.push(...decls);
    else byBreakpoint.set(rule.at, [...(byBreakpoint.get(rule.at) ?? []), ...decls]);
  });

  const css = [
    VIEWPORT_GUARD,
    ...base,
    ...[...byBreakpoint.keys()]
      .sort((a, b) => b - a)
      .map(at => `@media (max-width:${at}px){\n${byBreakpoint.get(at).join('\n')}\n}`),
  ].join('\n');

  return { html: out, css };
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

  let { html: bodyHtml, css: stateCss } = extractStateStyles(body);

  let mobileCss = '';
  let fluid = 0;
  if (page.responsive) {
    ({ html: bodyHtml, css: mobileCss } = applyMobileRules(bodyHtml));
    ({ html: bodyHtml, count: fluid } = fluidGrids(bodyHtml));
  }

  // Carries its own newline so a page with no recolours is byte-identical.
  let recolourCss = '';
  if (page.recolours) {
    const r = applyRecolours(bodyHtml, page.recolours);
    bodyHtml = r.html;
    recolourCss = `\n${r.css}`;
  }

  // Head: the helmet's font <link> and <style>, minus the canvas runtime script.
  let head = helmet.replace(/<script src="\.\/image-slot\.js"><\/script>\s*/g, '').trim();
  if (page.rootAccent) {
    head = head.replace(/--a:#[0-9a-fA-F]{3,8}/, `--a:${page.rootAccent}`);
  }
  if (page.palette) head = applyPalette(head, page.palette);

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
${mobileCss}${recolourCss}
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

  const notes = page.responsive ? `  responsive (${MOBILE_RULES.length} rules, ${fluid} grids)` : '';
  console.log(`${page.out.padEnd(8)} ${(out.length / 1024).toFixed(1)} KB  <- ${page.src}${notes}`);
}

PAGES.forEach(build);
