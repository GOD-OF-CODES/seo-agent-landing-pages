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
    // Emits the per-currency copies of this page that `middleware.js` rewrites
    // to. See the CURRENCIES map below.
    currencies: true,
    // Swaps the flat agent.log mock-up in the hero for the Three.js model in
    // `design/agent/`. See "the hero agent" below.
    heroModel: true,
    // Sets the two testimonials travelling instead of sitting in a grid.
    testimonialMarquee: true,
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
    // Asked for as: no blue anywhere, any shade, replaced with something that
    // belongs. What was blue is `--violet` (19 uses — the headline strike, the
    // avatar circles, filled cards and pills, a hero blob, the progress bar) and
    // `--sky` (15 — a hero blob, the chart bars, a card, the step markers).
    //
    // Plum and amber rather than more teal or more ochre: the page ran on four
    // accent hues and both of those choices would have collapsed it to two,
    // which costs the plum headline its separation from the teal "start free
    // trial" and the ochre header CTA. The strike that used to sit under that
    // headline has since been removed; the headline still needs the contrast. Teal / plum / ochre / amber over sand
    // keeps the structure and stays in the same earthy register.
    //
    // Contrast improves rather than drifts: `--violet` carries white text on
    // filled cards and is itself text on the ground, and plum is the darker
    // colour (6.6:1 -> 10.0:1 against white). `--sky` is only ever a fill or a
    // mark on the ink sections, so amber's brightness is free there (10.8:1 on
    // ink).
    palette: {
      '--cream': '#ffffff',
      '--violet': '#6b2b52',
      '--sky': '#f2b656',
      // Reads as black — the blue lift is 7/255 — but it is a blue-violet black,
      // and the ask was any shade. Rotated to a warm hue at the same luminance,
      // 0.00375 -> 0.00382, so every border and dark section looks unchanged.
      '--ink': '#0f0c08',
    },
    // Body copy, secondary text and two SVG strokes are raw hexes in the markup,
    // so the palette above misses them and the page would end up half
    // recoloured. Each is rotated to a warm hue at its own luminance, which
    // holds its contrast on white: 11.62 -> 11.67 and 6.26 -> 6.29.
    literals: {
      '#3b3648': { to: '#3f372f', count: 12 }, // body copy
      '#5a5f7a': { to: '#6b5e4f', count: 10 }, // secondary text
      '#0d0b14': { to: '#0f0c08', count: 3 }, // --ink written out longhand
      'rgba(13,11,20': { to: 'rgba(15,12,8', count: 2 }, // and again, at .18
    },
    // Outfit is not in the canvas's font request; the two testimonial quotes
    // below are the only thing that uses it. The weight axis covers the 500 they
    // are set in.
    fonts: ['Outfit:wght@300..700'],
    overrides: [
      {
        // The header CTA, blue against a page that has blue in several other
        // places; asked for as the palette's ochre so it stops competing with
        // the teal "start free trial" in the hero. Its hover already goes to
        // teal (`--pink`), which still reads as a change from ochre.
        what: 'header CTA',
        find: 'padding:12px 22px;border:3px solid var(--ink);border-radius:999px;background:var(--violet)',
        css: 'background:var(--tang)',
      },
      {
        // The two testimonial quotes, asked for in Outfit. Everything else the
        // canvas sets in Caveat stays handwritten, so the `find` has to pin
        // these two and nothing else — hence the size and line-height in it as
        // well as the family.
        //
        // Size is not the 25/34px the design set: those are tuned for a script
        // face with a small x-height, and Outfit's is half again as large.
        // Measured on a canvas at 100px, Caveat 600 has an x-height of 36.2 and
        // Outfit 47.5, so 0.762 of the original holds the optical size —
        // 25 -> 19, 2.4vw -> 1.83vw, 34 -> 26. It holds the measure too, which
        // is luck worth keeping: Outfit is the wider face (1170 vs 894 units for
        // the same string), and 1170 x 0.762 is 891, so the quotes wrap to
        // about the same line count and the cards keep their proportions.
        //
        // 1.2 was right for a script that carries its own rhythm; 1.4 is right
        // here, a little tighter than the 1.5 the page's body copy uses because
        // this is set larger.
        what: 'testimonial quotes',
        find: "font-family:'Caveat',cursive;font-weight:600;font-size:clamp(25px,2.4vw,34px);line-height:1.2",
        count: 2,
        css: "font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:500;font-size:clamp(19px,1.83vw,26px);line-height:1.4",
      },
    ],
  },
];
/* ── currency variants ───────────────────────────────────────────────────── */

// Where someone opens the page decides which prices they see. `middleware.js`
// reads the request's country at Vercel's edge and rewrites `/` to one of the
// variants built below, so what arrives is still a static file: no client-side
// swap, no flash of the wrong currency, and each variant caches on the CDN
// under its own path. USD is the baseline — it is `index.html` itself, which is
// why there is no `usd` entry here.
//
// The figures are round local price points, not a live conversion. $49 at
// today's rate is ₹4,083, which is not a number anyone charges; each tier is
// set to the nearest price that reads as deliberate in its own market, and the
// comparison table's market rates are rounded the same way. Two consequences
// worth knowing: nothing here goes stale when the exchange rate moves, and the
// numbers are a pricing decision rather than arithmetic, so they want a
// product owner's sign-off before they are treated as final.
//
// Keys are the exact strings in the *built* page, anchored by the characters
// either side — `>$49<span` rather than `$49` — so a price can only match where
// it is actually a price. Each must appear exactly once; a design change that
// moves one throws, in the same spirit as the palette and literal checks above,
// rather than shipping a half-converted page.
//
// The `$4,000-a-month agency` in Priya Raman's testimonial is deliberately
// absent. It is reported speech — a named customer said a number, in her own
// currency — and restating it in rupees would be putting words in her mouth.
const CURRENCIES = {
  inr: {
    '>$130+<': '>₹11,000+<',
    '>$5,000+<': '>₹4,00,000+<',
    '>from $49<': '>from ₹3,999<',
    '>$49<span': '>₹3,999<span',
    '>$99<span': '>₹7,999<span',
    '>$299<span': '>₹24,999<span',
  },
  eur: {
    '>$130+<': '>€120+<',
    '>$5,000+<': '>€4,600+<',
    '>from $49<': '>from €45<',
    '>$49<span': '>€45<span',
    '>$99<span': '>€89<span',
    '>$299<span': '>€279<span',
  },
  gbp: {
    '>$130+<': '>£105+<',
    '>$5,000+<': '>£4,000+<',
    '>from $49<': '>from £39<',
    '>$49<span': '>£39<span',
    '>$99<span': '>£79<span',
    '>$299<span': '>£249<span',
  },
};

// Variants live beside the page they came from, at `/cur/<code>`. Nothing links
// to them — the only way in is the middleware rewrite, which leaves the address
// bar on `/` — so they carry `noindex` to keep a crawler that guesses the path
// from filing three more copies of the page. `noindex` alone, without a
// canonical: Google treats the two together as conflicting signals, and the
// variants are duplicates that should simply not be in the index.
function writeCurrencyVariants(baseHtml, page) {
  const marker = '<meta charset="utf-8">';

  for (const [code, prices] of Object.entries(CURRENCIES)) {
    let html = baseHtml;

    for (const [from, to] of Object.entries(prices)) {
      const hits = html.split(from).length - 1;
      if (hits !== 1) {
        throw new Error(
          `${page.out} (${code}): price ${from} found ${hits} times, expected 1 — the design has moved`
        );
      }
      html = html.replace(from, to);
    }

    html = html.replace(marker, `${marker}\n<meta name="robots" content="noindex">`);

    const file = path.join(OUT, 'cur', `${code}.html`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, html);
  }

  console.log(
    `${'cur/'.padEnd(8)} ${Object.keys(CURRENCIES).join(', ')}  <- ${page.out}, prices only`
  );
}

/* ── the hero agent ──────────────────────────────────────────────────────── */

// The hero visual is a real 3D model — a robot leaning over the agent.log
// console — rendered with Three.js from `design/agent/scene.js`, in place of
// the flat HTML mock-up the canvas draws.
//
// It costs the page the one property it used to be able to claim outright: no
// JavaScript at all. Three.js is ~712 KB of vendored module on top of a 54 KB
// page, all of it in the hero. That is the trade, and it was asked for. What
// keeps it honest is that the scene is lazy about running rather than about
// loading: it stops rendering when scrolled out of view, when the tab is
// hidden, when the visitor pauses it, and when the system asks for reduced
// motion — so it costs frames only while it is actually being looked at.
//
// The scene was written for the v2 redesign and lives in `design/agent/` rather
// than `design/v2/` because both pages draw it now, and 712 KB is not a thing
// to vendor twice. `design/v2/build.mjs` points at the same copy.
//
// The colours needed no translation. The scene's clay, teal and cream were
// picked against this page's palette in the first place — 0xb86119 to `--tang`
// #b5611a, 0x10876d to `--pink` #12876c, 0xf1e5bf to `--lime` #efe3c4 — so the
// model already belongs on the ground it now sits on.
const HERO_STAGE = '<div style="position:relative;margin-top:52px';

// `role="img"` with a description, because to a screen reader a <canvas> is an
// empty box. The text says what the model shows, in the order it reads.
const HERO_MODEL_HTML = `<div class="hero-model">
        <div class="sculpture" role="img" aria-label="A cream robot leaning over the top of a dark SEO console, saying: I work. You grow. The console shows rising chart bars from week 1 to week 12, tasks the agent has finished, and its traffic, keyword and hiring numbers."><canvas id="agent-sculpture"></canvas></div>
        <p class="model-fallback" hidden>Your agent works through the night.</p>
      </div>`;

// `fSlideR` is the entry the dashboard it replaces had, so the hero still
// arrives as two halves. 860px is where the hero grid drops to one column
// (see MOBILE_RULES), so that is where the model stops being a side-by-side
// column and becomes a centred block.
const HERO_MODEL_CSS = `
.hero-model{position:relative;isolation:isolate;width:100%;height:640px;min-width:0;margin-top:-12px;animation:fSlideR 1s cubic-bezier(.2,.8,.2,1) both}
.hero-model:before{content:'';position:absolute;inset:45px -10px 20px;border-radius:50%;background:radial-gradient(ellipse,#f4ead2 0,transparent 70%);z-index:-1}
.hero-model:after{content:'';position:absolute;width:65%;height:30px;bottom:35px;left:20%;background:#29271d24;border-radius:50%;filter:blur(16px);z-index:-1}
.hero-model .sculpture{position:absolute;inset:0;z-index:2}
.hero-model .sculpture canvas{width:100%;height:100%;display:block;cursor:grab}
.hero-model .motion-toggle{position:absolute;bottom:5px;right:10px;z-index:4;width:38px;height:38px;border:3px solid var(--ink);border-radius:999px;background:var(--cream);color:var(--ink);font-family:inherit;font-size:13px;line-height:1;cursor:pointer}
.hero-model .motion-toggle:hover{background:var(--lime)}
.hero-model .model-fallback{position:absolute;top:40%;width:100%;margin:0;text-align:center;font-family:'Caveat',cursive;font-size:28px}
@media (max-width:860px){.hero-model{height:520px;max-width:470px;margin-top:16px;margin-left:auto;margin-right:auto}.hero-model:after{bottom:25px}}
@media (max-width:560px){.hero-model{height:440px}}`;

// Swaps the flat dashboard for the model, on the finished page rather than the
// body: the mobile and override passes assert against the markup the canvas
// emitted, and none of their selectors reach inside the dashboard, so taking it
// out afterwards leaves every one of those counts intact.
function applyHeroModel(html, page) {
  const start = html.indexOf(HERO_STAGE);
  if (start < 0) {
    throw new Error(`${page.out}: hero dashboard not found — the design has moved`);
  }

  // Walk the tags to find where the wrapper closes; the dashboard is a nest of
  // divs, so the first </div> is not the end of it.
  const tags = /<div\b[^>]*>|<\/div>/g;
  tags.lastIndex = start;
  let depth = 0;
  let end = -1;
  for (let m; (m = tags.exec(html)); ) {
    depth += m[0].startsWith('</') ? -1 : 1;
    if (depth === 0) {
      end = tags.lastIndex;
      break;
    }
  }
  if (end < 0) throw new Error(`${page.out}: hero dashboard is unbalanced`);

  return (
    html.slice(0, start) +
    HERO_MODEL_HTML +
    html.slice(end)
  )
    .replace('</style>', `${HERO_MODEL_CSS}\n</style>`)
    .replace('</body>', '<script type="module" src="/agent/scene.js"></script>\n</body>');
}

/* ── the testimonial marquee ─────────────────────────────────────────────── */

// The two testimonials used to sit in a two-up grid. They travel now: a slow
// right-to-left rail, new card in from the right, old one out through the left.
//
// The cards keep the width the grid gave them — (1240 - 2x56 panel padding -
// 18 gap) / 2 = 555px — so nothing about the boxes themselves changes. Below
// that they fall back to 84vw, which keeps one card to a screen the way the
// grid's own collapse did.
//
// The 18px gap is a `margin-right` on each card rather than `gap` on the track,
// and that is not a style preference. `fMarquee` travels -50% of the track, and
// with `gap` the track is `2n` cards plus `2n-1` gaps, so half of it lands half
// a gap short and the loop jumps 9px every time it comes round. As a margin the
// gap belongs to the card, the track is exactly two identical halves, and -50%
// is seamless. The page's other two marquees have the same half-gap error; it
// is invisible there because they carry text, not hard-edged boxes.
//
// Duplication happens here rather than in the canvas source for two reasons:
// the `testimonial quotes` override asserts it matches exactly twice, which a
// duplicated source would break, and the next import from the design project
// would quietly undo it.
const TESTIMONIAL_GRID =
  '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr));gap:18px">';

// `display:contents` lets each set's cards be flex items of the rail directly,
// so the sets are a grouping for the duplicate's `aria-hidden` and for reduced
// motion to switch off, and cost nothing in layout.
//
// The rail owns the clip, never the panel: the "BETA CUSTOMER" pill above it is
// `position:absolute;top:-24px`, and `overflow:hidden` on the panel would take
// its head off. The padding is there so the cards' 8px hard shadow is inside
// the clip rather than sliced off, and the negative margins hand back the space
// it costs so nothing below the rail moves.
const TESTIMONIAL_CSS = `
.tm-rail{overflow:hidden;padding:4px 0 14px;margin:-4px 0 -14px;-webkit-mask-image:linear-gradient(90deg,transparent,#000 48px,#000 calc(100% - 48px),transparent);mask-image:linear-gradient(90deg,transparent,#000 48px,#000 calc(100% - 48px),transparent)}
.tm-track{display:flex;align-items:stretch;width:max-content;animation:fMarquee 120s linear infinite}
.tm-set{display:contents}
.tm-set>div{flex:0 0 min(555px,84vw);margin-right:18px}
.tm-rail:focus-within .tm-track{animation-play-state:paused}
@media (prefers-reduced-motion:reduce){
.tm-rail{overflow-x:auto;-webkit-mask-image:none;mask-image:none;scroll-snap-type:x mandatory}
.tm-track{animation:none}
.tm-set[aria-hidden]{display:none}
.tm-set>div{scroll-snap-align:center}
}`;

// Wraps the testimonial cards in a rail and repeats them once, on the finished
// page: the override pass has already counted the two quotes it expects by the
// time this runs, and the copy it makes is presentational.
function applyTestimonialMarquee(html, page) {
  const start = html.indexOf(TESTIMONIAL_GRID);
  if (start < 0) {
    throw new Error(`${page.out}: testimonial grid not found — the design has moved`);
  }

  const tags = /<div\b[^>]*>|<\/div>/g;
  tags.lastIndex = start;
  let depth = 0;
  let end = -1;
  for (let m; (m = tags.exec(html)); ) {
    depth += m[0].startsWith('</') ? -1 : 1;
    if (depth === 0) {
      end = tags.lastIndex;
      break;
    }
  }
  if (end < 0) throw new Error(`${page.out}: testimonial grid is unbalanced`);

  // The cards themselves, untouched — only what surrounds them changes.
  // Fictional review copy for this practice website.
  const reviews = [
    ['Maya Kapoor', 'FOUNDER, FERN & FABLE', 'I used to save keyword ideas in five different spreadsheets and never do anything with them. Willy turns that scattered list into work I can actually review. Finally, some follow-through.'],
    ['Theo Brooks', 'OWNER, LITTLE LOAF STUDIO', 'I’m good at baking. Meta descriptions? Less so. Having someone keep the website tidy while I deal with the morning rush feels like a very fair division of labour.'],
    ['Anika Shah', 'MARKETING LEAD, PAPER TRAIL', 'The approval queue is my favourite bit. I can read the draft, make a change, and give it the go-ahead without chasing an update across three different tools.'],
    ['Lucas Reed', 'CO-FOUNDER, MOSS & METRIC', 'Most dashboards tell me what’s wrong and leave me with another to-do list. This one actually gets started. The little activity log has become my first coffee check.'],
    ['Nora Ellis', 'OWNER, CORNER BLOOM', 'Keeping our opening hours and local listings straight used to be a Friday chore. Now I can see what’s been updated and get back to the customers standing in front of me.'],
    ['Arjun Mehta', 'DIRECTOR, ORBIT DESK', 'The internal links were the job we kept putting off. Willy spotted the gaps and made the fixes easy to review. Small details, but our site feels much more connected now.'],
    ['Sofia Chen', 'CONSULTANT, GOOD THREAD', 'I expected a lot of generic copy. Being able to steer the drafts toward our tone made the difference. It feels like working with a keen teammate who actually takes notes.'],
    ['Ben Foster', 'FOUNDER, TINY SUMMIT', 'The weekly report is short enough that I actually read it. I know what got done, what needs my input, and what’s next. That’s exactly the level of detail I wanted.'],
  ];
  const cards = reviews.map(([name, role, quote]) => `<div style="display:flex;flex-direction:column;border:4px solid var(--ink);border-radius:26px;background:var(--cream);color:var(--ink);padding:clamp(22px,2.6vw,34px);box-shadow:8px 8px 0 var(--ink)">
    <p style="font-family:'Caveat',cursive;font-weight:600;font-size:clamp(25px,2.4vw,34px);line-height:1.2;margin:0">“${esc(quote)}”</p>
    <div style="display:flex;align-items:center;gap:16px;margin-top:auto;padding-top:18px"><span style="flex:none;width:62px;height:62px;border:3px solid var(--ink);border-radius:999px;background:var(--violet);color:#fff;display:flex;align-items:center;justify-content:center;font-size:23px;font-weight:800;box-shadow:3px 3px 0 var(--ink)">${name.split(' ').map(word => word[0]).join('')}</span><div><b style="display:block;font-size:18px;font-weight:800;letter-spacing:-.02em">${esc(name)}</b><p style="font-family:'Space Mono',monospace;font-size:11.5px;margin:3px 0 0">${esc(role)}</p></div></div>
  </div>`).join('');

  // The second set is scenery: a screen reader that read it would hear the same
  // same people twice over.
  const rail = `<div class="tm-rail">
        <div class="tm-track">
          <div class="tm-set">${cards}</div>
          <div class="tm-set" aria-hidden="true">${cards}</div>
        </div>
      </div>`;

  return (html.slice(0, start) + rail + html.slice(end)).replace(
    '</style>',
    `${TESTIMONIAL_CSS}\n</style>`
  );
}

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
 * `find` should be a slice of *layout* only, and colour belongs in `overrides`
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
    // Below ~360px "digital marketer." no longer fits one line at the clamp's
    // 46px floor. Dropping the floor keeps the headline on one line, which
    // reads better than a two-line "digital / marketer." — 12.8vw is the
    // largest that still fits, and 360 is where it hands back over: at 361px
    // the 46px floor has just enough room again.
    //
    // This used to carry a second reason: the strike under the headline
    // measured the column rather than the words, and a wrapped headline undid
    // the rule that fixed that. The strike is gone, so only the reading
    // argument is left — which is reason enough on its own.
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

/* ── per-page overrides ────────────────────────────────────────────────── */

/**
 * Three ways to depart from what the canvas exported, all per page.
 *
 * None of them can go in the `.dc.html`: it is overwritten on the next import
 * from the design project. They are kept out of `MOBILE_RULES` because that pass
 * is about what the layout does at a width — a colour or a typeface is not a
 * breakpoint, and the two head rewrites have no equivalent there at all.
 *
 * `palette`   retints a `:root` token, which moves every use of it at once.
 * `fonts`     adds families to the Google Fonts request in the head, for a face
 *             the canvas never asked for.
 * `literals`  swaps a colour the canvas wrote as a raw hex rather than through
 *             a token, everywhere it appears in the body. Each entry states the
 *             count it expects, since a literal is a blunt instrument.
 * `overrides` restyles one element, found by a slice of its inline style the
 *             same way the mobile rules find theirs, and needs `!important` for
 *             the same reason — it is competing with a `style` attribute.
 *
 * All four fail the build when they find nothing to change, so a design that
 * moves underneath us says so instead of quietly shipping the old styling.
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

/**
 * Not everything the canvas colours goes through `:root`. Body copy, secondary
 * text and a couple of SVG strokes are written as raw hexes in the markup, so a
 * palette change misses them and the page ends up half-recoloured.
 *
 * Each entry gives the count it expects rather than just "at least one": a bare
 * hex is a blunt thing to search for, and if the design starts using one of
 * these somewhere new, that is worth stopping for rather than absorbing.
 */
function applyLiterals(html, literals) {
  let out = html;
  const wrong = [];

  Object.entries(literals).forEach(([from, { to, count }]) => {
    // A colour is a string, not a pattern — `rgba(13,11,20,.18)` is a perfectly
    // ordinary key and its parens are not a group.
    const all = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const found = (out.match(all) ?? []).length;
    if (found !== count) {
      wrong.push(`${from}: found ${found}, expected ${count}`);
      return;
    }
    out = out.replace(all, to);
  });

  if (wrong.length) {
    throw new Error(`literal colour not where expected — the design has moved:\n  ${wrong.join('\n  ')}`);
  }
  return out;
}

/**
 * The canvas emits one `fonts.googleapis.com/css2` <link> listing every family
 * it uses. Add to that request rather than emitting a second one, so the page
 * still makes a single stylesheet round trip.
 *
 * The URL is HTML-escaped by the time it reaches here — the separators are
 * `&amp;`, not `&` — so match on that rather than on a bare ampersand.
 */
function applyFonts(head, fonts) {
  const link = /(href="https:\/\/fonts\.googleapis\.com\/css2\?)([^"]*)(")/;
  const m = head.match(link);
  if (!m) throw new Error('no Google Fonts link in the head — the design has moved');

  const missing = fonts.filter(f => !m[2].includes(`family=${f.split(':')[0]}`));
  if (!missing.length) {
    throw new Error(`already requested: ${fonts.join(', ')} — this page config is stale`);
  }

  const params = m[2].split('&amp;');
  const display = params.pop(); // display=swap sorts last, and should stay there
  return head.replace(
    link,
    `$1${[...params, ...missing.map(f => `family=${f}`), display].join('&amp;')}$3`
  );
}

function applyOverrides(html, overrides) {
  const hits = overrides.map(() => 0);

  const out = html.replace(
    /<([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|[^>"])*)>/g,
    (whole, tag, attrs) => {
      let el = whole;
      overrides.forEach((rule, i) => {
        if (!attrs.includes(rule.find)) return;
        hits[i]++;
        el = addClass(el, `o${i + 1}`);
      });
      return el;
    }
  );

  // A rule that names a `count` is claiming to know exactly which elements it
  // hits — the quotes rule restyles two of the page's fourteen handwritten
  // pieces, and a third one drifting into range would be restyled in silence.
  // Without a `count`, matching anything at all is enough.
  const wrong = overrides
    .map((rule, i) =>
      hits[i] && (rule.count == null || hits[i] === rule.count)
        ? null
        : `${rule.what}: matched ${hits[i]}, expected ${rule.count ?? 'at least 1'}`
    )
    .filter(Boolean);
  if (wrong.length) {
    throw new Error(`override did not match as expected — the design has moved:\n  ${wrong.join('\n  ')}`);
  }

  const css = overrides.map((rule, i) => `.o${i + 1}{${important(rule.css)}}`).join('\n');
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

  // Before the hover pass lifts style-hover out into its own stylesheet, so a
  // literal inside a hover state is swapped along with the rest.
  if (page.literals) body = applyLiterals(body, page.literals);

  let { html: bodyHtml, css: stateCss } = extractStateStyles(body);

  let mobileCss = '';
  let fluid = 0;
  if (page.responsive) {
    ({ html: bodyHtml, css: mobileCss } = applyMobileRules(bodyHtml));
    ({ html: bodyHtml, count: fluid } = fluidGrids(bodyHtml));
  }

  // Carries its own newline so a page with no overrides is byte-identical.
  let overrideCss = '';
  if (page.overrides) {
    const r = applyOverrides(bodyHtml, page.overrides);
    bodyHtml = r.html;
    overrideCss = `\n${r.css}`;
  }

  // Head: the helmet's font <link> and <style>, minus the canvas runtime script.
  let head = helmet.replace(/<script src="\.\/image-slot\.js"><\/script>\s*/g, '').trim();
  if (page.rootAccent) {
    head = head.replace(/--a:#[0-9a-fA-F]{3,8}/, `--a:${page.rootAccent}`);
  }
  if (page.palette) head = applyPalette(head, page.palette);
  if (page.fonts) head = applyFonts(head, page.fonts);

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

  let out = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${page.title}</title>
<meta name="description" content="${esc(page.description)}">
${head}
<style>
${stateCss}
${mobileCss}${overrideCss}
</style>
</head>
<body>
${bodyHtml.trim()}
${audit}
</body>
</html>
`;

  // Before the file is written, and before the currency variants are cut from
  // `out`, so every one of them gets the model too. The hero holds no prices,
  // so the swap and the currency pass never touch the same bytes.
  if (page.heroModel) {
    out = applyHeroModel(out, page);
    out = out.replace('<a class="m7" href="#pricing"', '<a class="m7" href="/about" style="color:var(--ink);font-size:15px;font-weight:600">about us</a>\n      <a class="m7" href="#pricing"');
    out = out.replace('<a class="s26" href="#"', '<a class="s26" href="/about"');

    const featureIntro = /(<section id="does"[^>]*>\s*<div[^>]*>)([\s\S]*?<\/p>)/;
    if (!featureIntro.test(out)) throw new Error('Feature introduction not found');
    out = out.replace(featureIntro, '$1<div class="feature-intro"><div class="feature-copy">$2</div><div class="feature-agent"><div class="feature-sculpture" role="img" aria-label="A robot holding a checklist of all seven SEO jobs: keywords, content, backlinks, technical SEO, local SEO, paid and social, and reporting."><canvas data-scene="checklist"></canvas></div><p class="model-fallback" hidden>Seven jobs. One agent.</p></div></div>');
    const comparisonStart = out.indexOf('THE COMPARISON');
    const tableStart = out.indexOf('<div style="border:4px solid var(--ink);border-radius:28px;overflow:hidden', comparisonStart);
    if (comparisonStart < 0 || tableStart < 0) throw new Error('Comparison table not found');
    const tableTags = /<div\b[^>]*>|<\/div>/g;
    tableTags.lastIndex = tableStart;
    let tableDepth = 0;
    let tableEnd = -1;
    for (let match; (match = tableTags.exec(out));) {
      tableDepth += match[0].startsWith('</') ? -1 : 1;
      if (!tableDepth) { tableEnd = tableTags.lastIndex; break; }
    }
    if (tableEnd < 0) throw new Error('Comparison table is unbalanced');
    out = out.slice(0, tableStart) + '<div class="comparison-stage"><div class="comparison-agent"><div class="comparison-sculpture" role="img" aria-label="A robot with heart-shaped eyes above the SEO Agent column, saying: That’s me! Only its eyes follow the pointer."><canvas data-scene="admirer"></canvas></div><p class="model-fallback" hidden>That’s me!</p></div>' + out.slice(tableStart, tableEnd) + '</div>' + out.slice(tableEnd);
    const pricingStart = out.indexOf('<section id="pricing"');
    const pricingEnd = out.indexOf('</section>', pricingStart);
    if (pricingStart < 0 || pricingEnd < 0) throw new Error('Pricing section not found');
    let pricingHtml = out.slice(pricingStart, pricingEnd);
    for (const [className, tier] of [['s11', 1], ['s13', 2], ['s15', 3]]) {
      const card = new RegExp(`<div class="${className}"([^>]*)>`);
      if (!card.test(pricingHtml)) throw new Error(`Pricing card ${className} not found`);
      pricingHtml = pricingHtml.replace(card, `<div class="${className}" data-plan-tier="${tier}"$1>` + (tier === 3 ? '<div class="pricing-agent"><div class="pricing-sculpture" role="img" aria-label="A robot above the Agency plan. Its eyes follow the pointer and it looks increasingly happy when Starter, Growth, or Agency is hovered."><canvas data-scene="pricing"></canvas></div><p class="model-fallback" hidden>Ready to grow.</p></div>' : ''));
    }
    out = out.slice(0, pricingStart) + pricingHtml + out.slice(pricingEnd);
    const faqLayout = /<div([^>]*display:grid[^>]*)>\s*<div>(\s*<span[^>]*>FAQ<\/span>)/;
    if (!faqLayout.test(out)) throw new Error('FAQ columns not found');
    out = out.replace(faqLayout, '<div class="faq-three-column"$1><div class="faq-agent"><div class="faq-sculpture" role="img" aria-label="A smirking robot with a raised eyebrow saying: More reliable than your ex. Its eyes follow the pointer."><canvas data-scene="faq"></canvas></div><p class="model-fallback" hidden>More reliable than your ex.</p></div><div class="faq-intro">$2');
    const footerStart = out.indexOf('<footer');
    const footerRow = out.indexOf('<div style="display:flex;flex-wrap:wrap;gap:clamp(24px,4vw,56px);align-items:flex-start">',footerStart);
    if (footerStart < 0 || footerRow < 0) throw new Error('Footer row not found');
    const footerTags=/<div\b[^>]*>|<\/div>/g;
    footerTags.lastIndex=footerRow;
    let footerDepth=0;
    let footerEnd=-1;
    for(let m;(m=footerTags.exec(out));){
      footerDepth+=m[0].startsWith('</')?-1:1;
      if(!footerDepth){footerEnd=m.index;break;}
    }
    if(footerEnd<0) throw new Error('Footer row is unbalanced');
    out=out.slice(0,footerEnd)+'<div class="footer-agent"><div class="footer-sculpture" role="img" aria-label="A friendly SEO robot waving goodbye."><canvas data-scene="farewell"></canvas></div><p class="model-fallback" hidden>See you soon!</p></div>'+out.slice(footerEnd);
    out=out.slice(0,footerRow)+out.slice(footerRow).replace('<div style=', '<div class="footer-top" style=');
    out = out.replace('</head>', '<link rel="stylesheet" href="/agent/feature.css">\n</head>');
    fs.cpSync(path.join(SRC, 'agent'), path.join(OUT, 'agent'), { recursive: true });
  }

  if (page.testimonialMarquee) out = applyTestimonialMarquee(out, page);

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, page.out), out);
  if (page.heroModel) {
    const aboutSection = `<section id="about" aria-labelledby="about-title"><div class="about-layout"><div class="about-agent"><div class="about-sculpture" role="img" aria-label="Willy, your friendly SEO robot, continuously waving hello."><canvas data-scene="farewell"></canvas></div><p class="model-fallback" hidden>Hi, I’m Willy!</p><span class="about-sticker" aria-hidden="true">YOUR NEW WORK BESTIE</span></div><div class="about-copy"><span class="about-label">ABOUT US</span><h2 id="about-title">Meet Willy.<br><em>Your growth guy.</em></h2><p class="about-lead">Big wave. Bigger plans for your website.</p><p>I’m Willy, the SEO agent behind the scenes. I find the keywords, write the content, fix the technical bits, and keep your growth moving.</p><p>Seven jobs. One very enthusiastic robot. Think of me as the teammate who loves the to-do list you’ve been avoiding.</p><a class="about-link" href="#does">See what I can do <span aria-hidden="true">↗</span></a><p class="about-signoff">I work. You grow.</p></div></div></section>`;
    const firstSection = out.indexOf('<section');
    const lastSection = out.lastIndexOf('</section>') + '</section>'.length;
    if (firstSection < 0 || lastSection < firstSection) throw new Error('About page shell not found');
    let about = out.slice(0, firstSection) + '<main>' + aboutSection + '</main>' + out.slice(lastSection);
    about = about.replace(/<title>[\s\S]*?<\/title>/, '<title>Meet Willy — About SEO Agent</title>')
      .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="Meet Willy, your friendly SEO agent. Seven jobs, one enthusiastic robot. I work. You grow.">')
      .replace(/href="#(does|how|pricing)"/g, 'href="/#$1"')
      .replace('<body>', '<body class="about-page">')
      .replace('href="/about" style=', 'href="/about" aria-current="page" style=')
      .replace(/<span class="m4"([^>]*)>seo agent<\/span>/, '<a class="m4" href="/" aria-label="SEO Agent home"$1>seo agent</a>');
    fs.writeFileSync(path.join(OUT, 'about.html'), about);
  }


  // Nothing canvas-specific may survive into the output.
  const leftovers = ['{{', '<sc-for', 'style-hover=', 'style-focus=', '<image-slot', '<x-dc', '<helmet']
    .filter(needle => out.includes(needle));
  if (leftovers.length) throw new Error(`${page.out}: unconverted ${leftovers.join(', ')}`);

  const notes = page.responsive ? `  responsive (${MOBILE_RULES.length} rules, ${fluid} grids)` : '';
  console.log(`${page.out.padEnd(8)} ${(out.length / 1024).toFixed(1)} KB  <- ${page.src}${notes}`);

  // After the leftover check, so a variant can only ever be made from a page
  // that already passed it.
  if (page.currencies) writeCurrencyVariants(out, page);
}

PAGES.forEach(build);

// V2 shares the original copy, with its own presentation and local 3D assets.
const { buildV2 } = await import('./design/v2/build.mjs');
buildV2(OUT);
