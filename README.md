# SEO Agent — landing page

The original landing page is served at `/`; the `seo-cg` redesign is at `/v2`.

| URL | Page | Source |
| --- | --- | --- |
| `/` | The landing page | `design/landing page muted version.dc.html` |
| `/v2` | Editorial redesign with an interactive 3D robot agent | `design/v2/` (shares the original copy) |

## V2 redesign

Run `npm run dev` and open `http://localhost:3000/v2`. Both routes also work
with Vercel's existing `cleanUrls` setting. `npm run build` regenerates both.

V2 uses cream, olive, charcoal and muted terracotta, with quieter borders,
editorial typography, responsive cards, and a real Three.js cream robot beside a dark activity console, with raised chart bars and integrated metrics.
The model responds to the pointer, has a pause control, respects reduced motion,
and suspends its animation when offscreen or when the tab is hidden. The reference-inspired 3D console and robot form one hero scene, with no explanatory cards beneath it. If WebGL is
unavailable, a short fallback message is displayed. Three.js 0.180.0 is vendored
locally with its MIT license; the model needs no external asset service.

`design/v2/build.mjs` derives the new page from the original build, preserving
all copy, prices, testimonials and FAQs. `design/v2/style.css` owns its design;
`design/v2/scene.js` owns the 3D scene. Edit these source files, not `public/v2*`.
Discovery buttons link to the existing workflow or pricing sections. The
original website supplies no signup or booking integration; pricing and booking
buttons retain that limitation.

There were three of these until 2026-09-09 — a monochrome product-led one at
`/v1`, a loud cream-and-lime one at `/v2`, and this quiet one at `/v3`, with a
chooser at `/`. The quiet one won; the other two and the chooser are gone, and
`git log` has them if they are ever wanted back.

The source file keeps its canvas name, `landing page muted version.dc.html`. It
is the import target from the design project, so renaming it here would break
the next import.

## Run it

```sh
npm run dev     # builds, then serves on http://localhost:3000
```

## How it's put together

`design/` holds the `.dc.html` imported from the Claude Design project
[`AI SEO Agent Landing Page`](https://claude.ai/design/p/b6164131-48bb-48ab-9157-c6c0e05ee4d0).
It is a canvas document, so it leans on the design-canvas runtime for a few
things plain HTML does not have. `build.mjs` replaces each of those with real
markup and writes `public/index.html`:

- `<x-dc>` / `<helmet>` → a real `<head>` and body
- `style-hover="…"` → a generated class and a `:hover` rule (`!important` per
  declaration, since the base styling is an inline `style` attribute)
- `<sc-for>` and `{{ … }}` → expanded at build time; the page's own
  `renderVals()` is executed in Node to supply the data
- `<image-slot>` → `<img>`

It also adds the mobile layout the canvas does not emit, the colour and type
departures below, and the hero model.

`design/agent/` holds the 3D hero — `scene.js` and a vendored Three.js — which
is not canvas output and is copied to `public/agent/` as-is.

The output has no framework and no template runtime. It used to have no
JavaScript either; the hero model is now the single exception, and the only
script the page loads — see [The hero agent](#the-hero-agent). Everything else
is still markup and CSS that arrives finished.

The loop expander, the `renderVals()` sandbox and the `data-alt` state machinery
in `build.mjs` are all things the product-led page needed and this one does not.
They are kept on purpose, so a canvas document with loops or state can be
dropped in without rebuilding the script.

Re-run `npm run build` after pulling changes from the design project.

## Colour and type

Departures from what the canvas exported. All of them live in the page's `PAGES`
entry in `build.mjs` rather than in the `.dc.html`, which is overwritten on the
next import, and all of them fail the build if they find nothing to change.

- **`palette`** retints a `:root` token, moving every use of it at once.
- **`fonts`** adds families to the Google Fonts request already in the head,
  rather than emitting a second `<link>`, so the page still makes one stylesheet
  round trip. `Outfit:wght@300..700` is there for the testimonial quotes.
- **`literals`** swaps a colour the canvas wrote as a raw hex rather than
  through a token, everywhere it appears in the body. Each entry states the
  count it expects, since a bare hex is a blunt thing to search for.
- **`overrides`** restyles one element, found by a slice of its inline style the
  same way the mobile rules find theirs. Two of them:
  - The header CTA is `--tang` (ochre) rather than `--violet`, so it stops
    competing with the teal "start free trial" in the hero. Its hover already
    goes to teal, which still reads as a change from ochre.
  - The two testimonial quotes are Outfit rather than Caveat. Everything else
    the canvas sets in Caveat stays handwritten, so this rule carries a `count`
    — it claims to hit exactly two of the page's fourteen handwritten pieces,
    and the build fails if a third drifts into range rather than restyling it in
    silence.

### No blue

The canvas palette was built on blue: `--violet` `#3352c9` (19 uses — the
headline strike, the avatar circles, filled cards and pills, a hero blob, the
progress bar) and `--sky` `#3fa8cf` (15 — a hero blob, the chart bars, a card,
the step markers). Both are gone.

| was | is | |
|---|---|---|
| `--violet` `#3352c9` | `#6b2b52` | deep plum |
| `--sky` `#3fa8cf` | `#f2b656` | amber |
| `--ink` `#0d0b14` | `#0f0c08` | warm near-black |
| `--cream` `#fff6e9` | `#ffffff` | the page ground |
| `#3b3648` ×12 | `#3f372f` | body copy |
| `#5a5f7a` ×10 | `#6b5e4f` | secondary text |

Plum and amber rather than more teal or more ochre: the page ran on four accent
hues, and either of those would have collapsed it to two — costing the plum
headline its separation from the teal "start free trial" and the ochre header
CTA. (The strike that used to sit under that headline is gone; the separation
still matters for the headline itself.)
Teal / plum / ochre / amber over sand keeps the structure and stays in the same
earthy register.

Contrast improves rather than drifts. `--violet` carries white text on filled
cards and is itself text on the ground, and plum is the darker colour, so that
goes 6.6:1 → 10.0:1 against white. `--sky` is only ever a fill or a mark on the
ink sections, so amber's brightness is free there (10.8:1 on ink).

The three near-neutrals were rotated to a warm hue *at their own luminance*,
which holds their contrast on white almost exactly: body copy 11.62 → 11.67,
secondary 6.26 → 6.29, ink 19.53 → 19.51. `--ink` reads as black either way — the
blue lift was 7/255 — so every border and dark section looks unchanged; it moved
because the ask was any shade of blue, not any visible one.

Verified by parsing every colour literal out of the built page and computing its
hue: nothing left sits between 175° and 285° at any meaningful saturation.

### Two off-palette leftovers, not fixed

Neither is blue, so neither was in scope, but both are visible:

- `rgba(216,243,74,.35)` on the comparison table's four "yes" cells is
  `#d8f34a` — the *louder* page's lime, from when the two shared markup. It is
  the only yellow-green left and it now sits oddly against the earthy palette.
- `#fff6e9` on one element is the old cream, stranded when `--cream` went white.

### Sizing Outfit against the Caveat it replaces

Not the 25/34px the design set. Those are tuned for a script face with a small
x-height, and Outfit's is half again as large. Measured on a canvas at 100px:

| face | x-height | width of a 25-char string |
|---|---|---|
| Caveat 600 | 36.2 | 894 |
| Outfit 400 | 47.5 | 1170 |

So 0.762 of the original size holds the optical size — 25 → 19px, 2.4vw →
1.83vw, 34 → 26px. It holds the measure too, which is luck worth keeping: 1170 ×
0.762 is 891, near enough Caveat's 894 that the quotes wrap to the same line
count and the cards keep their proportions. Line-height moves from 1.2 to 1.4 —
1.2 suited a script that carries its own rhythm, and 1.4 is a little tighter than
the 1.5 the page's body copy uses because this is set larger.

## Mobile

The canvas exports one desktop layout and no media queries at all. Most of it
reflows anyway — `clamp()` on type and padding, `auto-fit` on most grids — but
the grids with an explicit column count do not, and the header assumes the
wordmark and the whole nav fit on one line. At 390px the old build overflowed
the viewport by 50px and the hero ran as two ~150px columns.

The page carries `responsive: true`, which turns on two build passes:

- **`MOBILE_RULES`** — each rule finds elements by a distinctive slice of their
  inline style, gives them a generated class and emits a media query against it
  (`!important`, since they compete with a `style` attribute). This stacks the
  hero, wraps the header pill onto two rows, and tightens the four-column
  comparison table so it stays a table on a phone rather than becoming cards.
- **`fluidGrids`** — rewrites `repeat(auto-fit,minmax(320px,1fr))` to
  `minmax(min(320px,100%),1fr)`. The bare `320px` is a hard floor, so the track
  overflows once the container is narrower than it; `min(…,100%)` is correct at
  every width, so it is rewritten in place rather than behind a breakpoint.

**A rule that matches nothing fails the build**: if the design moves underneath
us, `npm run build` says so instead of quietly shipping a page that lost its
mobile layout. Rules key on *layout* only, never a colour — that was once
load-bearing, when this pass also ran on the louder page and a colour-keyed rule
would have matched one and missed the other. With one page left it is a
convention rather than a constraint, but it is still the right split: nothing in
`MOBILE_RULES` should move when the palette or the typeface changes. Those go
in `overrides`.

### Sideways scroll

The build adds `html,body{overflow-x:clip}`. The design tries to stop sideways
scroll with `body{overflow-x:hidden}`, but a body-level guard does not reach the
viewport — measured on the built page in a 390px viewport, as
`documentElement.scrollWidth / clientWidth`:

| guard | | |
|---|---|---|
| design only, `body{overflow-x:hidden}` | 459 / 375 | scrolls sideways |
| `body{overflow-x:clip}` | 459 / 375 | scrolls sideways |
| `html{overflow-x:clip}` | 375 / 375 | clipped |

What pokes out is the entry animations. They run on `animation-timeline:view()`,
so every section still below the fold sits parked on its `from` keyframe —
`fRise` rotated 1.5deg, `fSlideL`/`fSlideR` shifted 70px. That is not a flash
during load; it is the page's resting state at any scroll position, and the
rotation overshoot grows with section height, so it is worst on a phone.

Both selectors matter. `html` does the clipping. `body` is there only to override
the design's own `hidden`: once the root has an overflow of its own, body's value
stops propagating and applies to body itself, and `hidden` on one axis drags the
other to `auto` — body becomes a scroll container, and the sticky header, whose
nearest scrollport is now body rather than the viewport, scrolls away with the
page (measured: header at `top:-1495` after a 1500px scroll). `clip` does not
drag the other axis, so body stays a normal box and the header holds at `top:5`.
`clip` rather than `hidden` on `html` for the same reason. It leaves `overflow-y`
computed `visible`, and `animation-timeline:scroll(root)` on the progress bar
still drives.

### The headline strike, removed

There used to be a hand-drawn teal stroke under "digital marketer.", and two of
the mobile rules here existed only to keep it behaving: one made its span
measure the words rather than the column, so the line stopped where the text
did, and one expressed its `height` in `em` so it stayed below the baseline
instead of riding up through the letters as the type shrank.

The stroke is gone, and both rules went with it — a rule whose only job was to
correct something no longer on the page is worse than no rule, because it still
has to match. What is left of it is the `12.8vw` floor below 360px, which had a
second reason of its own: "digital marketer." reads better on one line than
broken across two.

### What is dropped rather than reflowed

The three nav links, below 360px, where the pill cannot hold them and the CTA at
any size. They are anchors to sections further down the same page; the CTA,
which is not, stays and spans the row. 375px — the narrowest iPhone still in use
— keeps the full nav.

### Verified

At 320/375/390/430/440px and on desktop, sampling scroll positions down the whole
page: `scrollWidth` never exceeds `clientWidth`, so the page cannot be scrolled
sideways at any scroll position, and the header stays at `top:5`. The `view()`
animations still fire — sections scrolled into view resolve to
`opacity:1; transform:none`, so the clip is not hiding a page that stopped
animating. Desktop is unchanged — same page height, same grid tracks, header
still sticky.

## The hero agent

The hero is a real 3D model: a robot leaning over the agent.log console, saying
"I work. You grow." It replaces the flat HTML mock-up the canvas draws, and it
is the same scene the v2 redesign uses — `design/agent/scene.js`, with Three.js
vendored beside it under `design/agent/vendor/`. Both pages load that one copy;
712 KB is not a thing to vendor twice.

`applyHeroModel()` in `build.mjs` does the swap on the finished page rather than
on the body, walking the tags to find where the dashboard wrapper closes and
putting `<div class="hero-model">` in its place. Doing it last matters: the
mobile and override passes assert against the markup the canvas emitted, and
none of their selectors reach inside the dashboard, so removing it afterwards
leaves every one of those counts intact. It also runs before the currency
variants are cut, so all four pages get the model. If the wrapper ever moves,
the build throws rather than quietly shipping a hero-less page.

The colours needed no translation — the scene's clay, teal and cream were picked
against this page's palette in the first place (`0xb86119` to `--tang`,
`0x10876d` to `--pink`, `0xf1e5bf` to `--lime`), so the model already belongs on
the ground it sits on. The pill that used to float above the dashboard said
"WORKING 24/7"; the model carries that badge itself, so nothing was lost.

### How the console text stays sharp

Every label on the console is a canvas texture painted onto a flat plane, and
three things decide whether it reads as print or as mush.

Resolution follows the screen. A fixed-size canvas is wasted on a phone and
starved on a 5K display, so each label is redrawn at the density the renderer
is about to show it at — device pixels per world unit, recomputed in the resize
pass, clamped either side and with a deadband so a drag-resize does not
re-rasterise the console every frame.

Mipmaps are off. They exist to stop a minified texture shimmering, and they buy
that by blurring; once the texture is sized to the screen there is nothing to
minify and the blur is pure loss. Linear on both filters, no mipmap chain, and
the device pixel ratio is allowed up to 2 rather than 1.75.

The type is the page's own — Space Mono for the machine labels, Bricolage
Grotesque for the copy — rather than whatever `system-ui` happens to be. Those
fonts arrive with the stylesheet, so the first paint can beat them; every label
is drawn again once `document.fonts.ready` settles. Labels that overrun their
plane are fitted by shrinking the type, never by canvas `maxWidth`, which
scales glyphs horizontally and is instantly obvious on a monospace face.

### What it costs

712 KB of vendored Three.js on top of a 51 KB page, all of it in the hero, and
the page can no longer claim to ship no JavaScript. That is the trade.

What keeps it honest is that the scene is lazy about *running*, not about
loading. It stops rendering when scrolled out of view, when the tab is hidden,
when the visitor pauses it with the button in the corner, and when the system
asks for reduced motion — so it costs frames only while it is being looked at.
If WebGL is missing or the context is lost, the canvas is hidden and a line of
copy stands in. The `role="img"` label describes the scene for screen readers,
to which a `<canvas>` is otherwise an empty box.

## The testimonial rail

The two testimonials travel rather than sitting in a two-up grid: a slow
right-to-left rail, new card in from the right, old one out through the left.
The cards keep exactly the width the grid gave them — (1240 − 2×56 panel
padding − 18 gap) / 2 = 555px — falling back to 84vw below that, which keeps one
card to a screen the way the grid's own collapse did.

Two details are load-bearing.

The 18px gap is a `margin-right` on each card, not `gap` on the track. The
`fMarquee` keyframe travels −50%, and with `gap` the track is `2n` cards plus
`2n−1` gaps, so half of it lands half a gap short and the loop jumps 9px every
time it comes round. As a margin the gap belongs to the card, the track is two
identical halves, and −50% is seamless. The page's other two marquees have the
same half-gap error and get away with it because they carry text, not
hard-edged boxes.

The clip lives on an inner rail, never on the ochre panel — the `BETA CUSTOMER`
pill is `position:absolute;top:-24px` and `overflow:hidden` on the panel would
take its head off. The rail's padding keeps the cards' 8px hard shadow inside
the clip instead of slicing it, and equal negative margins hand that space back
so nothing below moves. Both edges fade with a `mask-image` gradient.

The duplicate set is built here rather than in the canvas source: the
`testimonial quotes` override asserts it matches exactly twice, which a
duplicated source would break, and the next design import would undo it. That
copy carries `aria-hidden`, so a screen reader does not hear the same two people
twice, and `prefers-reduced-motion` switches it off entirely and turns the rail
into a snap-scroller people can swipe.

**It wants more testimonials.** With two, the same face returns every loop and
it reads as a cycle rather than a stream — four to six would fix that. The
mechanism takes any number; only the copy is missing.

## Prices in local currency

The page shows its prices in the currency of wherever it is opened from: rupees
in India, euros in the eurozone, pounds in the UK, dollars everywhere else.

It works without any client-side JavaScript, which a page with none of it
otherwise would have had to take on. `build.mjs` writes the whole page once per
currency into `public/cur/` — `inr.html`, `eur.html`, `gbp.html` — with only the
price strings swapped, and `middleware.js` runs at Vercel's edge, reads the
request's country and *rewrites* `/` to the matching file. A rewrite is not a
redirect: the address bar stays on `/`, the response is still a prebuilt static
file off the CDN, and there is no moment where the wrong currency is on screen.
USD is `index.html` itself, so an unlisted country and a crawler both get the
page exactly as it was before any of this.

**The numbers are prices, not conversions.** `$49` at today's rate is `₹4,083`,
which is not a figure anyone charges, so each tier is set to the nearest price
point that reads as deliberate in its own market. Nothing goes stale when the
exchange rate moves, and nothing recalculates — to change a price, edit the
`CURRENCIES` map in `build.mjs` and rebuild. They want a product owner's
sign-off before they are treated as final.

Priya Raman's `$4,000-a-month agency` stays in dollars in every variant. It is
reported speech; restating a named customer's number in rupees would be putting
words in her mouth.

Each price is matched by its exact string with the characters either side
(`>$49<span`, not `$49`) and must appear exactly once, so a design change that
moves a price throws at build time rather than shipping a half-converted page.

### Seeing the other currencies

Geolocation follows the IP, so it cannot be reached from a laptop in one
country — not by DevTools device mode, not by changing the browser's language.
Append `?cur=` to force one:

```
https://<deployment>/?cur=inr     rupees
https://<deployment>/?cur=eur     euros
https://<deployment>/?cur=gbp     pounds
https://<deployment>/             whatever your IP says, USD by default
```

**Only on a Vercel deployment.** `node server.js` has no middleware, so `/` is
always the USD page locally; the variants are reachable directly at
`/cur/inr`, `/cur/eur`, `/cur/gbp`.

Adding a currency means an entry in `CURRENCIES` in `build.mjs`, the same code
in `VARIANTS` in `middleware.js`, and its countries in `BY_COUNTRY`. The
eurozone is listed country by country there on purpose: "in Europe" and "pays in
euros" are different sets, and Poland or Sweden seeing euro prices is the kind
of mistake that is hard to spot from here.

## Known rough edge

The nav links (`#does`, `#how`, `#pricing`) scroll their section to the very top
of the viewport, which puts the heading behind the sticky header pill. The fix is
`scroll-margin-top` on the section targets; not done yet.

## Deploying

`vercel.json` runs the build and serves `public/` with `cleanUrls`. `/` is the
page. `middleware.js` sits in front of `/` alone and rewrites it to a currency
variant under `/cur/` — see above; every other path, and every asset, skips it.

The middleware is the one thing here with a dependency: `@vercel/functions`,
for `geolocation()` and `rewrite()`. Vercel installs it at build time. The page
build itself is still dependency-free — `node build.mjs` needs nothing
installed.
