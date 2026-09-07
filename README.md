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

It also adds `html,body{overflow-x:clip}`. The design tries to stop sideways
scroll with `body{overflow-x:hidden}`, but a body-level guard does not reach the
viewport — measured on the built `/v3` in a 390px viewport, as
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

Two things keep this honest. The rules match on *layout* only, never a colour —
v2 and v3 are one markup in two palettes, so a rule keyed on a colour would
match one page and miss the other. And **a rule that matches nothing fails the
build**: if the design moves underneath us, `npm run build` says so instead of
quietly shipping a page that lost its mobile layout.

The hand-drawn strike under "digital marketer." needed the same treatment. It
is an SVG at `width:100%` of its span, and the span is `display:block` — so it
measures the column, not the words. The design gets away with that because at
104px the headline nearly fills its column anyway; once the hero stacks, the
column is the full page width while the headline is still at its 46px floor, and
the line ran on past the text by 38px at 390px and 296px at 720px. `fit-content`
makes the span measure the words instead. Below 360px the headline no longer
fits one line at that floor, and a wrapped headline puts `fit-content` back to
the column width, so the floor drops to `12.8vw` there to keep it on one line.

Its vertical placement had the same shape of bug. Everything about the strike
scales with the type — the span's font-size, the `bottom:-.02em` it hangs from —
except its own `height:16px`, so the box kept its size as the text shrank and the
stroke rode up over the letters: 2.9px *below* the baseline at 104px, 5.1px
*above* it at 46px. 16px at the design's 104px reference is `.1538em`, so saying
that instead holds the proportion at every size, and resolves back to 16px at
104px — the full-width desktop rendering is untouched.

The one thing that is dropped rather than reflowed is the three nav links,
below 360px, where the pill cannot hold them and the CTA at any size. They are
anchors to sections further down the same page; the CTA, which is not, stays and
spans the row. 375px — the narrowest iPhone still in use — keeps the full nav.

Verified on both pages at 320/375/390/430px and on desktop, sampling scroll
positions down the whole page: `scrollWidth` never exceeds `clientWidth`, so the
page cannot be scrolled sideways at any scroll position, and the header stays at
`top:5`. The `view()` animations still fire — sections scrolled into view resolve
to `opacity:1; transform:none`, so the clip is not hiding a page that stopped
animating. Desktop is unchanged — same page height, same grid tracks, header
still sticky. `/v1` is untouched and gets none of this; it still overflows by ~13px at
390px, but it has no mobile layout at all, so a clip there would hide content
rather than reflow it.
- **v1's accent is `#101014`.** The `.dc.html` ships a blue `--a: #2f4bff` in
  `:root` that the canvas overwrites at runtime with the `accent` prop, whose
  stored default is `#101014`. The build bakes `#101014` in so the page needs no
  JS to look right; change `rootAccent` in `build.mjs` for a different accent
  (the design's other options were `#2f4bff`, `#ff5c1f`, `#12c48b`).

## Deploying

`vercel.json` runs the build and serves `public/` with `cleanUrls`, so `/v1`,
`/v2` and `/v3` work on Vercel exactly as they do locally.
