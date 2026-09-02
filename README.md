# SEO Agent — landing pages

Three versions of the landing page, served side by side.

| URL | Page | Source |
| --- | --- | --- |
| `/v1` | The current landing page — monochrome, product-led | `design/current landing page.dc.html` |
| `/v2` | The funky version — cream, lime, hard shadows | `design/landing page funky version.dc.html` |
| `/v3` | The muted version — v2's layout in sand, teal and ink | `design/landing page muted version.dc.html` |
| `/` | Chooser linking to all three | `public/index.html` |

## Run it

```sh
npm run dev     # builds, then serves on http://localhost:3000
```

Then open `http://localhost:3000/v1`, `/v2` or `/v3`.

## How it's put together

`design/` holds the three `.dc.html` files imported from the Claude Design project
[`AI SEO Agent Landing Page`](https://claude.ai/design/p/b6164131-48bb-48ab-9157-c6c0e05ee4d0).
They are canvas documents, so they lean on the design-canvas runtime for a few
things plain HTML does not have. `build.mjs` replaces each of those with real
markup and writes the result to `public/`:

- `<x-dc>` / `<helmet>` → a real `<head>` and body
- `style-hover="…"` → a generated class and a `:hover` rule (`!important` per
  declaration, since the base styling is an inline `style` attribute)
- `<sc-for>` and `{{ … }}` → expanded at build time; the page's own
  `renderVals()` is executed in Node to supply the data
- `<image-slot>` → `<img>`

It also adds the mobile layout the canvas does not emit — see below.

The output has no framework and no template runtime. The only JavaScript that
ships is ~15 lines on `/v1` for the audit button — every binding whose value
differs once the audit has run is emitted carrying its other value in
`data-alt`, and the handler swaps them in place so no entry animation replays.

Re-run `npm run build` after pulling changes from the design project.

## Three things worth knowing

- **v1 = current, v2 = funky, v3 = muted.** Nothing in the design project fixes
  that order; swap the `out` fields in `PAGES` at the top of `build.mjs` to
  change it.
- **v3 is v2 recoloured.** Same layout and same copy — the design project's
  muted version only moves the palette, so it needs no build changes beyond its
  `PAGES` entry. Only `/v1` ships JavaScript; v2 and v3 are static.

## Mobile

The canvas exports one desktop layout and no media queries at all. Most of it
reflows anyway — `clamp()` on type and padding, `auto-fit` on most grids — but
the grids with an explicit column count do not, and the header assumes the
wordmark and the whole nav fit on one line. At 390px the old build overflowed
the viewport by 50px and the hero ran as two ~150px columns.

`/v2` and `/v3` carry `responsive: true`, which turns on two build passes:

- **`MOBILE_RULES`** — each rule finds elements by a distinctive slice of their
  inline style, gives them a generated class and emits a media query against it
  (`!important`, since they compete with a `style` attribute). This stacks the
  hero, wraps the header pill onto two rows, and tightens the four-column
  comparison table so it stays a table on a phone rather than becoming cards.
- **`fluidGrids`** — rewrites `repeat(auto-fit,minmax(320px,1fr))` to
  `minmax(min(320px,100%),1fr)`. The bare `320px` is a hard floor, so the track
  overflows once the container is narrower than it; `min(…,100%)` is correct at
  every width, so it is rewritten in place rather than behind a breakpoint.

It also re-declares `body{overflow-x:clip}`. The design already tries to stop
sideways scroll with `body{overflow-x:hidden}`, but that has never worked: a box
with one axis `hidden` and the other `visible` computes the visible axis to
`auto`, so body quietly becomes its own scroll container and the clip never
propagates to the viewport. The page was left scrollable sideways by whatever
poked out — here the `fRise` entry animation, which rotates each section 1.5deg
as it scrolls into view, so the overshoot grows with section height and was
worst on a phone (50px on the old build at 390px). `clip` does not drag the
other axis to `auto`, so the propagation survives and the header stays sticky —
putting the guard on `html` instead also stops the scrolling, but takes the
sticky header down with it.

Two things keep this honest. The rules match on *layout* only, never a colour —
v2 and v3 are one markup in two palettes, so a rule keyed on a colour would
match one page and miss the other. And **a rule that matches nothing fails the
build**: if the design moves underneath us, `npm run build` says so instead of
quietly shipping a page that lost its mobile layout.

The one thing that is dropped rather than reflowed is the three nav links,
below 360px, where the pill cannot hold them and the CTA at any size. They are
anchors to sections further down the same page; the CTA, which is not, stays and
spans the row. 375px — the narrowest iPhone still in use — keeps the full nav.

Verified on both pages at 280–1440px: no element overflows the viewport, and the
page cannot be scrolled sideways at any scroll position. Desktop is unchanged —
same page height, same grid tracks, header still sticky. `/v1` is untouched and
gets none of this.
- **v1's accent is `#101014`.** The `.dc.html` ships a blue `--a: #2f4bff` in
  `:root` that the canvas overwrites at runtime with the `accent` prop, whose
  stored default is `#101014`. The build bakes `#101014` in so the page needs no
  JS to look right; change `rootAccent` in `build.mjs` for a different accent
  (the design's other options were `#2f4bff`, `#ff5c1f`, `#12c48b`).

## Deploying

`vercel.json` runs the build and serves `public/` with `cleanUrls`, so `/v1`,
`/v2` and `/v3` work on Vercel exactly as they do locally.
