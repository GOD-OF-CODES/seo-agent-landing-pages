# SEO Agent — landing page

One page, served at `/`.

| URL | Page | Source |
| --- | --- | --- |
| `/` | The landing page | `design/landing page muted version.dc.html` |

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

It also adds the mobile layout the canvas does not emit, and the two colour
departures below.

The output has no framework, no template runtime and no JavaScript at all. The
loop expander, the `renderVals()` sandbox and the `data-alt` state machinery in
`build.mjs` are all things the product-led page needed and this one does not.
They are kept on purpose, so a canvas document with loops or state can be
dropped in without rebuilding the script.

Re-run `npm run build` after pulling changes from the design project.

## Colour

Two departures from the palette the canvas exported. Both live in the page's
`PAGES` entry in `build.mjs` rather than in the `.dc.html`, which is overwritten
on the next import, and both fail the build if they match nothing.

- **`palette`** retints a `:root` token, moving every use of it at once.
  `--cream` is `#ffffff` — the page ground, asked for as plain white. The token
  is also the fill of three surfaces sitting on that ground: the header pill and
  the two pricing cards. They read as separate because of their 4px ink border
  and hard shadow, not their fill, so the token moves as one and they stay
  legible.
- **`recolours`** overrides one element, found by a slice of its inline style
  the same way the mobile rules find theirs. The header CTA is `--tang` (ochre)
  rather than `--violet`: the page has blue in several other places, and ochre
  stops the header CTA competing with the teal "start free trial" in the hero.
  Its hover already goes to teal, which still reads as a change from ochre.

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
`MOBILE_RULES` should move when the palette changes. Colour goes in `recolours`.

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

### The headline strike

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

## Known rough edge

The nav links (`#does`, `#how`, `#pricing`) scroll their section to the very top
of the viewport, which puts the heading behind the sticky header pill. The fix is
`scroll-margin-top` on the section targets; not done yet.

## Deploying

`vercel.json` runs the build and serves `public/` with `cleanUrls`. `/` is the
page; nothing else routes.
