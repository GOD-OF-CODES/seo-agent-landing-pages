import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));

export function buildV2(out) {
  let html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
  // Keep content in one place. Normalize the canvas presentation before applying
  // V2's named section styles; no copy or original output is modified.
  html = html.replace(/<style>[\s\S]*?<\/style>/g, '');
  html = html.replace(/style="([^"]*)"/g, (_, style) => {
    const declarations = style.split(';').filter(rule => !/^\s*(animation[^:]*|box-shadow|transform):/.test(rule));
    return `style="${declarations.join(';')
      .replace(/([234])px solid var\(--ink\)/g, '1px solid var(--line)')
      .replace(/([23])px solid rgba/g, '1px solid rgba')
      .replace(/font-size:(10|11|11\.5|12)px/g, 'font-size:12px')
      .replace(/#12876c/g, '#657044')
      .replace(/rgba\(216,243,74,\.35\)/g, '#e8ebdc')}"`;
  });
  const sections = ['hero', 'about', 'features', 'workflow', 'comparison', 'testimonials', 'plans', 'faq', 'closing'];
  let index = 0;
  html = html.replace(/<section\b/g, () => `<section class="${sections[index++]}"`);
  if (index !== sections.length) throw new Error('V2 source sections changed; update section mapping.');
  html = html.replace('<body>', '<body class="v2">');
  // Keep V2's control; the main landing page intentionally has none.
  html = html.replace('<p class="model-fallback"', '<button class="motion-toggle" type="button" aria-label="Pause 3D animation" aria-pressed="false">Ⅱ</button><p class="model-fallback"');
  html = html.replace('</head>', '<link rel="stylesheet" href="/v2/style.css">\n</head>');
  // The hero model arrives already in place: the main build swaps the flat
  // dashboard for `<div class="hero-model">` and loads `/agent/scene.js`, and
  // V2 inherits both from `index.html`. V2 styles the same markup its own way
  // in `style.css`; only that file is V2's to ship.
  // Existing trial controls have no destination in the supplied website. V2's
  // discovery CTAs link to the relevant existing sections without inventing signup.
  html = html.replace(/<button([^>]*)>(get the agent|start free trial →?|watch it work)<\/button>/g, (_, attrs, label) => {
    const destination = label === 'watch it work' ? '#how' : '#pricing';
    return `<a${attrs.replace('type="button"', '')} href="${destination}">${label}</a>`;
  });
  fs.mkdirSync(path.join(out, 'v2'), { recursive: true });
  fs.copyFileSync(path.join(directory, 'style.css'), path.join(out, 'v2/style.css'));
  fs.writeFileSync(path.join(out, 'v2.html'), html);
  console.log('v2.html  shared content + editorial layout + the shared 3D agent');
}
