/**
 * Prices in the visitor's own currency.
 *
 * Vercel Routing Middleware runs at the edge, before the CDN cache, and is the
 * only place in this project that knows where a request came from — a static
 * file cannot ask. It reads the country off the request and rewrites `/` to the
 * matching page built by `build.mjs` into `public/cur/`. A rewrite is not a
 * redirect: the visitor stays on `/`, and what they get is still a prebuilt
 * static file, so there is no flash of dollars and nothing to swap in the
 * browser.
 *
 * USD is the default. Anywhere not listed below falls through to `index.html`
 * untouched, which is also what a crawler gets.
 */
import { geolocation, next, rewrite } from '@vercel/functions';

// The currencies `build.mjs` emits. Anything not in here — including a typo or
// a poked-at `?cur=` value — falls through to the USD page rather than
// rewriting to a path that does not exist.
const VARIANTS = new Set(['inr', 'eur', 'gbp']);

// Country to currency. The eurozone is spelled out rather than inferred: "in
// Europe" and "pays in euros" are different sets, and Poland or Sweden seeing
// euro prices would be wrong in a way that is hard to spot from here.
const BY_COUNTRY = {
  IN: 'inr',
  GB: 'gbp',
  AT: 'eur',
  BE: 'eur',
  // The 21st member, since 1 January 2026.
  BG: 'eur',
  HR: 'eur',
  CY: 'eur',
  EE: 'eur',
  FI: 'eur',
  FR: 'eur',
  DE: 'eur',
  GR: 'eur',
  IE: 'eur',
  IT: 'eur',
  LV: 'eur',
  LT: 'eur',
  LU: 'eur',
  MT: 'eur',
  NL: 'eur',
  PT: 'eur',
  SK: 'eur',
  SI: 'eur',
  ES: 'eur',
};

export default function middleware(request) {
  const url = new URL(request.url);

  // `?cur=inr` beats geolocation. Geo follows the IP, so it cannot be reached
  // from a laptop in one country — not by DevTools device mode, not by changing
  // the browser's language — and without this override the other currencies
  // would be unverifiable short of a VPN.
  const forced = url.searchParams.get('cur');
  const code = forced ?? BY_COUNTRY[geolocation(request).country ?? ''];

  if (!code || !VARIANTS.has(code)) return next();

  url.pathname = `/cur/${code}`;
  // `cleanUrls` in vercel.json serves `public/cur/inr.html` at `/cur/inr`, so
  // the extension is deliberately left off. The query goes too: it has done its
  // job, and carrying `?cur=` onto the rewrite target would fragment the cache.
  url.search = '';
  return rewrite(url);
}

// Only the page itself. Every asset, and the variants when fetched directly,
// skip the middleware entirely.
//
// Node rather than the default edge runtime: Vercel runs middleware on Fluid
// Compute now, in the same regions and at the same price, without the edge
// runtime's API restrictions. Nothing here needs them, but there is no reason
// to take them on.
export const config = { matcher: '/', runtime: 'nodejs' };
