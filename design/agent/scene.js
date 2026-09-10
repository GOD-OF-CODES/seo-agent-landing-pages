import * as THREE from './vendor/three.module.min.js';

const canvas = document.querySelector('#agent-sculpture');
const toggle = document.querySelector('.motion-toggle');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
try {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-2, 2, 2.55, -1.95, 0.1, 30);
  camera.position.set(0, 0, 10);
  // A little working agent: screen face, antenna, and a report in its hand.
  // Real bevelled meshes give it a soft, tactile toy finish from every angle.
  const world = new THREE.Group();
  scene.add(world);
  const agent = new THREE.Group();
  let modelParent = agent;
  const shell = new THREE.MeshStandardMaterial({ color: 0xeee3c1, roughness: 0.38, metalness: 0.12 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x151412, roughness: 0.48 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xf1e5bf, roughness: 0.48 });
  const clay = new THREE.MeshStandardMaterial({ color: 0xb86119, roughness: 0.4 });
  const glow = new THREE.MeshStandardMaterial({ color: 0x20a789, emissive: 0x10876d, emissiveIntensity: 0.3 });
  function roundedBox(width, height, depth, material, x, y, z, radius = 0.12) {
    const w = width / 2 - radius, h = height / 2 - radius;
    const shape = new THREE.Shape();
    shape.moveTo(-w, -h); shape.lineTo(w, -h); shape.lineTo(w, h);
    shape.lineTo(-w, h); shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(0.01, depth - radius * 2), bevelEnabled: true, bevelSegments: 5,
      steps: 1, bevelSize: radius, bevelThickness: Math.min(radius, depth / 2),
    });
    geometry.center();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    modelParent.add(mesh);
    return mesh;
  }
  function sphere(radius, material, x, y, z) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 16), material);
    mesh.position.set(x, y, z); modelParent.add(mesh); return mesh;
  }
  roundedBox(1.5, 0.97, 0.85, shell, 0, 0.62, 0);
  roundedBox(1.22, 0.66, 0.12, dark, 0, 0.62, 0.46, 0.06);
  const eyes = [-0.28, 0.28].map(x => roundedBox(0.13, 0.22, 0.09, glow, x, 0.67, 0.55, 0.035));
  const smileCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-0.16, 0.45, 0.55), new THREE.Vector3(0, 0.34, 0.58), new THREE.Vector3(0.16, 0.45, 0.55),
  );
  agent.add(new THREE.Mesh(new THREE.TubeGeometry(smileCurve, 16, 0.022, 8, false), glow));
  roundedBox(0.15, 0.36, 0.15, dark, 0, 1.22, 0, 0.05);
  sphere(0.13, clay, 0, 1.43, 0);
  sphere(0.19, clay, -0.81, 0.64, 0);
  sphere(0.19, clay, 0.81, 0.64, 0);
  roundedBox(1.05, 0.82, 0.72, shell, 0, -0.38, 0, 0.14);
  roundedBox(0.26, 0.2, 0.1, cream, 0, -0.27, 0.39, 0.035);
  sphere(0.043, clay, 0, -0.27, 0.46);
  roundedBox(0.37, 0.28, 0.62, dark, -0.31, -0.91, 0.11, 0.1);
  roundedBox(0.37, 0.28, 0.62, dark, 0.31, -0.91, 0.11, 0.1);
  const leftArm = roundedBox(0.28, 0.62, 0.3, shell, -0.68, -0.28, 0, 0.1);
  leftArm.rotation.z = -0.3;
  sphere(0.16, clay, -0.77, -0.6, 0.03);
  const rightArm = roundedBox(0.28, 0.55, 0.3, shell, 0.68, -0.13, 0.04, 0.1);
  rightArm.rotation.z = 0.55;
  // A tiny growth report connects the mascot to the SEO work it performs.
  roundedBox(0.67, 0.86, 0.13, cream, 0.95, -0.23, 0.38, 0.045);
  [0.18, 0.3, 0.44].forEach((height, i) => {
    roundedBox(0.1, height, 0.045, i === 2 ? clay : shell, 0.76 + i * 0.18, -0.49 + height / 2, 0.47, 0.016);
  });
  roundedBox(0.38, 0.045, 0.045, dark, 0.95, 0.05, 0.47, 0.015);
  sphere(0.14, clay, 0.73, -0.52, 0.53);
  agent.rotation.set(0, 0, -0.06);
  agent.scale.setScalar(0.68);
  agent.position.set(-0.85, 1.04, -0.25);
  world.add(agent);

  // The reference becomes a solid, bevelled console with physical chart bars.
  const teal = new THREE.MeshStandardMaterial({ color: 0x10876d, roughness: 0.32, metalness: 0.18 });
  const graphite = new THREE.MeshStandardMaterial({ color: 0x41413d, roughness: 0.55 });
  const inset = new THREE.MeshStandardMaterial({ color: 0x242420, roughness: 0.48 });
  const consoleModel = new THREE.Group();
  consoleModel.position.set(0.05, -0.43, 0.1);
  consoleModel.rotation.set(0, 0, 0);
  world.add(consoleModel);
  modelParent = consoleModel;
  roundedBox(3.0, 3.08, 0.3, teal, 0.1, -0.08, -0.13, 0.17);
  roundedBox(3.0, 3.08, 0.33, dark, 0, 0, 0, 0.17);
  // Flat text sits on actual extruded geometry, like print on a physical model.
  //
  // The console's labels are canvas textures, and how many pixels each one is
  // drawn at decides whether they read as print or as mush. Three things matter
  // and all three used to be wrong.
  //
  // Resolution has to follow the screen. A fixed-size canvas is either wasted
  // on a phone or starved on a 5K display, so each label is redrawn at whatever
  // the renderer is actually about to show it at — see `retexture()` below,
  // driven from the resize pass.
  //
  // Mipmaps have to be off. They exist to stop a minified texture shimmering,
  // and they do it by blurring; when the texture is already sized to the screen
  // there is nothing to minify, and the blur is pure loss. Linear on both
  // filters, no mipmap chain.
  //
  // And the type has to be the page's own — Space Mono for the machine labels,
  // Bricolage Grotesque for the copy — not whatever `system-ui` resolves to.
  // Those fonts load with the page, so the first draw can land before they
  // arrive; every label is redrawn once `document.fonts.ready` settles.
  const MONO = "'Space Mono', ui-monospace, monospace";
  const SANS = "'Bricolage Grotesque', system-ui, sans-serif";
  // Texels per world unit, clamped: below the floor type breaks up, above the
  // ceiling it costs memory for detail no display resolves.
  const TEXEL_FLOOR = 190;
  const TEXEL_CEIL = 1600;
  const prints = [];
  let texels = TEXEL_FLOOR;

  function print(text, width, height, x, y, z, parent, color = '#38422b', size = 46, font = SANS) {
    const surface = document.createElement('canvas');
    const texture = new THREE.CanvasTexture(surface);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    function draw() {
      const pixels = Math.round(width * texels);
      surface.width = pixels;
      surface.height = Math.max(2, Math.round(pixels * height / width));
      // The original geometry was laid out against a 768px canvas; keeping that
      // as the unit means resolution can change without the layout moving.
      const scale = surface.width / 768;
      const ctx = surface.getContext('2d');
      ctx.clearRect(0, 0, surface.width, surface.height);
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      // Fit by shrinking the type, never by squeezing it: canvas `maxWidth`
      // scales glyphs horizontally, which on Space Mono is instantly obvious.
      let px = size * scale;
      const room = surface.width - 30 * scale;
      ctx.font = `600 ${px}px ${font}`;
      const measured = ctx.measureText(text).width;
      if (measured > room) {
        px *= room / measured;
        ctx.font = `600 ${px}px ${font}`;
      }
      ctx.fillText(text, 15 * scale, surface.height / 2);
      texture.needsUpdate = true;
    }

    draw();
    prints.push(draw);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
    mesh.position.set(x, y, z); parent.add(mesh);
    return mesh;
  }

  // Redraw every label at the resolution it is about to be shown at. Called
  // from the resize pass, where the frustum width is known; the 12% deadband
  // keeps a drag-resize from re-rasterising the whole console every frame.
  function retexture(next) {
    const wanted = Math.max(TEXEL_FLOOR, Math.min(TEXEL_CEIL, next));
    if (Math.abs(wanted - texels) / texels < 0.12) return;
    texels = wanted;
    prints.forEach(draw => draw());
  }
  [teal, clay, cream].forEach((material, i) => sphere(0.042, material, -1.22 + i * 0.14, 1.27, 0.21));
  print('agent.log', 0.7, 0.17, 0.95, 1.27, 0.22, consoleModel, '#aaa99e', 85, MONO);
  roundedBox(2.65, 0.018, 0.025, graphite, 0, 1.08, 0.19, 0.005);
  const heights = [0.18, 0.28, 0.23, 0.43, 0.39, 0.58, 0.72, 0.86];
  heights.forEach((height, i) => {
    const material = i < 3 ? graphite : i < 5 ? clay : i < 7 ? cream : teal;
    roundedBox(0.26, height, 0.19, material, -1.13 + i * 0.323, 0.05 + height / 2, 0.26, 0.035);
  });
  print('WEEK 1', 0.64, 0.15, -1.06, -0.065, 0.22, consoleModel, '#aaa99e', 85, MONO);
  print('WEEK 12', 0.65, 0.15, 1.02, -0.065, 0.22, consoleModel, '#aaa99e', 85, MONO);
  print('◆  Drafting content   62%', 2.48, 0.18, 0, -0.34, 0.23, consoleModel, '#eee3c1', 55);
  print('✓  Fixed 3 broken links', 2.48, 0.18, 0, -0.57, 0.23, consoleModel, '#f3f1e8', 55);
  print('✓  Sent 8 outreach emails', 2.48, 0.18, 0, -0.8, 0.23, consoleModel, '#f3f1e8', 55);
  const metrics = [['+312%', 'TRAFFIC'], ['37', 'TOP-10 KWS'], ['0', 'HIRES']];
  metrics.forEach(([value, label], i) => {
    const x = -0.89 + i * 0.9;
    roundedBox(0.78, 0.45, 0.075, inset, x, -1.18, 0.21, 0.05);
    print(value, 0.62, 0.19, x, -1.11, 0.26, consoleModel, '#fff8e7', 150);
    print(label, 0.62, 0.11, x, -1.29, 0.26, consoleModel, '#aaa99e', 85, MONO);
  });
  const badge = new THREE.Group();
  badge.position.set(0.75, 1.57, 0.27); badge.rotation.z = 0.08;
  consoleModel.add(badge); modelParent = badge;
  roundedBox(1.3, 0.36, 0.16, dark, 0, 0, 0, 0.12);
  roundedBox(1.22, 0.29, 0.09, clay, 0, 0, 0.1, 0.09);
  print('WORKING 24/7', 1.08, 0.19, 0, 0, 0.16, badge, '#fff8e7', 88, MONO);
  // The robot peeks from behind the top edge, with its hands on the rim.
  modelParent = world;
  sphere(0.105, cream, -1.22, 1.12, 0.44);
  sphere(0.105, cream, -0.43, 1.12, 0.44);
  const speech = new THREE.Group();
  speech.position.set(0.65, 1.78, 0.18);
  world.add(speech); modelParent = speech;
  roundedBox(1.65, 0.58, 0.12, cream, 0, 0, 0, 0.1);
  const tail = new THREE.Shape();
  tail.moveTo(-0.65, -0.2); tail.lineTo(-0.8, -0.43); tail.lineTo(-0.35, -0.2); tail.closePath();
  speech.add(new THREE.Mesh(new THREE.ExtrudeGeometry(tail, { depth: 0.06, bevelEnabled: false }), cream));
  print('I work.', 1.35, 0.2, 0, 0.12, 0.08, speech, '#242420', 88);
  print('You grow.', 1.35, 0.22, 0, -0.12, 0.08, speech, '#10876d', 102);
  world.rotation.set(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xfff7e5, 0x4c4432, 3));
  const key = new THREE.DirectionalLight(0xfff5dc, 5);
  key.position.set(-3, 4, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xe7bda2, 2.2);
  rim.position.set(4, 0, 2);
  scene.add(rim);
  let paused = reduced.matches;
  let visible = true;
  let frame = 0;
  let last = 0;
  let elapsed = 0;
  let targetX = 0;
  let targetY = 0;
  function render(time = 0) {
    frame = 0;
    const delta = Math.min((time - last) / 1000, 0.04);
    last = time;
    if (!paused) {
      elapsed += delta;
      // Time-based damping keeps the response consistent at any refresh rate.
      const follow = 1 - Math.exp(-14 * delta);
      agent.rotation.y += (targetX - agent.rotation.y) * follow;
      agent.rotation.x += (targetY - agent.rotation.x) * follow;
      agent.rotation.z = -0.07 + Math.sin(elapsed * 1.3) * 0.025;
      agent.position.y = 1.04 + Math.sin(elapsed * 1.5) * 0.035;
      // Keep the console front-facing; only the robot follows the pointer.

      const blink = elapsed % 5.2;
      eyes.forEach(eye => { eye.scale.y = blink > 4.95 ? 0.15 : 1; });
    }
    renderer.render(scene, camera);
    if (!paused && visible && !document.hidden) frame = requestAnimationFrame(render);
  }
  function resume() {
    if (!frame) { last = performance.now(); frame = requestAnimationFrame(render); }
  }
  const observer = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    renderer.setSize(width, height, false);
    const aspect = width / Math.max(height, 1);
    const viewHeight = Math.max(4.5, 3.55 / aspect);
    camera.left = -viewHeight * aspect / 2;
    camera.right = viewHeight * aspect / 2;
    camera.top = 0.18 + viewHeight / 2;
    camera.bottom = 0.18 - viewHeight / 2;
    camera.updateProjectionMatrix();
    // Device pixels the console is actually drawn across, per world unit.
    retexture((width * renderer.getPixelRatio()) / (camera.right - camera.left));
    resume();
  });
  observer.observe(canvas.parentElement);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) resume(); }).observe(canvas);
  const hero = canvas.closest('section') || canvas.parentElement;
  const headPosition = new THREE.Vector3();
  hero.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || paused || !visible) return;
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    // Aim from the robot's face, not the middle of the entire console canvas.
    agent.localToWorld(headPosition.set(0, 0.62, 0));
    headPosition.project(camera);
    const faceX = bounds.left + (headPosition.x + 1) * bounds.width / 2;
    const faceY = bounds.top + (1 - headPosition.y) * bounds.height / 2;
    targetX = THREE.MathUtils.clamp(Math.atan2(event.clientX - faceX, bounds.width * 0.6), -0.65, 0.65);
    targetY = THREE.MathUtils.clamp(Math.atan2(event.clientY - faceY, bounds.height * 0.65), -0.4, 0.4);
  }, { passive: true });
  function resetGaze() { targetX = targetY = 0; }
  hero.addEventListener('pointerleave', resetGaze);
  hero.addEventListener('pointercancel', resetGaze);
  window.addEventListener('blur', resetGaze);
  function updateToggle() {
    if (!toggle) return;
    toggle.textContent = paused ? '▶' : 'Ⅱ';
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute('aria-label', `${paused ? 'Play' : 'Pause'} 3D animation`);
  }
  toggle?.addEventListener('click', () => { paused = !paused; updateToggle(); resume(); });
  reduced.addEventListener('change', () => { paused = reduced.matches; updateToggle(); resume(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) resume(); });
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); cancelAnimationFrame(frame); canvas.parentElement.hidden = true; if (toggle) toggle.hidden = true; document.querySelector('.model-fallback').hidden = false; });
  updateToggle();
  resume();
  // Space Mono and Bricolage Grotesque come from the page's stylesheet, so the
  // first rasterisation can happen before they are ready and fall back. Draw
  // the labels again once they land.
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => { prints.forEach(draw => draw()); resume(); });
  }
} catch {
  // Keep a useful message when the browser cannot render the 3D model.
  canvas.parentElement.hidden = true;
  if (toggle) toggle.hidden = true;
  document.querySelector('.model-fallback').hidden = false;
}
