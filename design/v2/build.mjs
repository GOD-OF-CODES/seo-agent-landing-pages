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
  const sections = ['hero', 'features', 'workflow', 'comparison', 'testimonials', 'plans', 'faq', 'closing'];
  let index = 0;
  html = html.replace(/<section\b/g, () => `<section class="${sections[index++]}"`);
  if (index !== sections.length) throw new Error('V2 source sections changed; update section mapping.');
  html = html.replace('<body>', '<body class="v2">');
  html = html.replace('</head>', '<link rel="stylesheet" href="/v2/style.css">\n</head>');
  // Replace the entire dashboard subtree, rather than hiding a mockup behind
  // the model. Keep the surrounding hero grid and all other sections intact.
  const stageStart = html.indexOf('<div style="position:relative;margin-top:52px');
  if (stageStart < 0) throw new Error('V2 hero dashboard not found.');
  const tags = /<div\b[^>]*>|<\/div>/g;
  tags.lastIndex = stageStart;
  let depth = 0;
  let stageEnd = -1;
  for (let match; (match = tags.exec(html));) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (depth === 0) { stageEnd = tags.lastIndex; break; }
  }
  if (stageEnd < 0) throw new Error('V2 hero dashboard is unbalanced.');
  html = html.slice(0, stageStart) + `<div class="hero-model">
    <div class="sculpture" role="img" aria-label="A cream robot peeking over the top-left corner of a front-facing SEO console, saying: I work. You grow. The console shows rising chart bars, completed tasks and traffic metrics"><canvas id="agent-sculpture"></canvas></div>
    <button class="motion-toggle" type="button" aria-label="Pause 3D animation" aria-pressed="false">Ⅱ</button>
    <p class="model-fallback" hidden>Your agent works through the night.</p>
  </div>` + html.slice(stageEnd);
  html = html.replace('</body>', '<script type="module" src="/v2/scene.js"></script>\n</body>');
  // Existing trial controls have no destination in the supplied website. V2's
  // discovery CTAs link to the relevant existing sections without inventing signup.
  html = html.replace(/<button([^>]*)>(get the agent|start free trial →?|watch it work)<\/button>/g, (_, attrs, label) => {
    const destination = label === 'watch it work' ? '#how' : '#pricing';
    return `<a${attrs.replace('type="button"', '')} href="${destination}">${label}</a>`;
  });
  fs.mkdirSync(path.join(out, 'v2'), { recursive: true });
  for (const name of ['style.css', 'scene.js']) fs.copyFileSync(path.join(directory, name), path.join(out, 'v2', name));
  fs.cpSync(path.join(directory, 'vendor'), path.join(out, 'v2/vendor'), { recursive: true });
  fs.writeFileSync(path.join(out, 'v2.html'), html);
  console.log('v2.html  shared content + editorial layout + local Three.js sculpture');
}
