# SEO Agent — landing pages

Two versions of the landing page, served side by side.

| URL | Page | Source |
| --- | --- | --- |
| `/v1` | The current landing page — monochrome, product-led | `design/current landing page.dc.html` |
| `/v2` | The funky version — cream, lime, hard shadows | `design/landing page funky version.dc.html` |
| `/` | Chooser linking to both | `public/index.html` |

## Run it

```sh
npm run dev     # builds, then serves on http://localhost:3000
```

Then open `http://localhost:3000/v1` or `/v2`.

## How it's put together

`design/` holds the two `.dc.html` files imported from the Claude Design project
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

The output has no framework and no template runtime. The only JavaScript that
ships is ~15 lines on `/v1` for the audit button — every binding whose value
differs once the audit has run is emitted carrying its other value in
`data-alt`, and the handler swaps them in place so no entry animation replays.

Re-run `npm run build` after pulling changes from the design project.

## Two things worth knowing

- **v1 = current, v2 = funky.** Nothing in the design project fixes that order;
  swap the `out` fields in `PAGES` at the top of `build.mjs` to flip it.
- **v1's accent is `#101014`.** The `.dc.html` ships a blue `--a: #2f4bff` in
  `:root` that the canvas overwrites at runtime with the `accent` prop, whose
  stored default is `#101014`. The build bakes `#101014` in so the page needs no
  JS to look right; change `rootAccent` in `build.mjs` for a different accent
  (the design's other options were `#2f4bff`, `#ff5c1f`, `#12c48b`).

## Deploying

`vercel.json` runs the build and serves `public/` with `cleanUrls`, so `/v1` and
`/v2` work on Vercel exactly as they do locally.
