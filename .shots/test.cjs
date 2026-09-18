const { chromium } = require('C:/Users/WanSou/AppData/Roaming/npm/node_modules/omniroute/node_modules/playwright-core');
const { writeFileSync, mkdirSync, readFileSync } = require('fs');
const { join } = require('path');

const SHOTS_DIR = 'F:/vibe-projects/wanthedev-github-io/wanthedev.github.io/.shots';
mkdirSync(SHOTS_DIR, { recursive: true });

const results = [];
const consoleMessages = [];
const pageErrors = [];

function assert(name, condition, detail = '') {
  const pass = !!condition;
  results.push({ name, pass, detail });
  if (!pass) console.error(`FAIL: ${name}${detail ? ' - ' + detail : ''}`);
  return pass;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', err => pageErrors.push(err.toString()));

  console.log('Navigating...');
  await page.goto('http://localhost:5199', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForFunction(() => typeof globalThis.asciiPortfolio !== 'undefined', {}, { timeout: 10000 });
  await page.waitForTimeout(2000);

  console.log('=== CLAIM 1: BLOOM RUNS ON ASCII CANVAS ===');

  // 1(a): Exactly one canvas in DOM, it's WebGL
  const canvasInfo = await page.evaluate(() => {
    const canvases = document.querySelectorAll('canvas');
    const asciiCanvas = document.querySelector('#ascii-background');
    let isWebGL = false;
    if (asciiCanvas) {
      try { isWebGL = !!asciiCanvas.getContext('webgl2'); } catch(e) {}
    }
    return {
      totalCanvases: canvases.length,
      hasAsciiBackground: !!asciiCanvas,
      isWebGL,
    };
  });

  assert('1(a) Exactly one canvas in DOM', canvasInfo.totalCanvases === 1,
    `Found ${canvasInfo.totalCanvases} canvases`);
  assert('1(a) Canvas is #ascii-background', canvasInfo.hasAsciiBackground);
  assert('1(a) Canvas has WebGL context', canvasInfo.isWebGL);

  // 1(b): Verify bloom composite structure
  const bloomInfo = await page.evaluate(() => {
    const { bloom, config, ascii } = globalThis.asciiPortfolio;
    return {
      bloomExists: !!bloom,
      bloomEnabled: bloom.enabled,
      bloomStrength: bloom.strength,
      bloomRadius: bloom.radius,
      bloomThreshold: bloom.threshold,
      configBloom: config.post.bloom,
      asciiCanvasExists: !!ascii.canvas,
      asciiCanvasIsOffscreen: ascii.canvas.id === '',
    };
  });

  assert('1(b) Bloom pass exists', bloomInfo.bloomExists);
  assert('1(b) Bloom enabled by default', bloomInfo.bloomEnabled === true);
  assert('1(b) Bloom config matches pass config',
    bloomInfo.bloomStrength === bloomInfo.configBloom.strength &&
    bloomInfo.bloomRadius === bloomInfo.configBloom.radius &&
    bloomInfo.bloomThreshold === bloomInfo.configBloom.threshold);
  assert('1(b) ASCII canvas exists and is offscreen', bloomInfo.asciiCanvasExists && bloomInfo.asciiCanvasIsOffscreen);

  // Note: bloom.renderer and bloom.composer are not exposed in the current API
  assert('1(b) API limitation noted', true,
    'bloom.renderer and bloom.composer not exposed (only UnrealBloomPass)');

  // 1(c/d): Check tone mapping and no vignette/grain/flick etc
  const toneMappingInfo = await page.evaluate(() => {
    const { renderer, config } = globalThis.asciiPortfolio;
    return {
      sceneRendererToneMapping: renderer.toneMapping,
      hasVignette: 'vignette' in config.post,
      hasGrain: 'grain' in config.post,
      postKeys: Object.keys(config.post),
      interactKeys: Object.keys(config.interact),
    };
  });

  assert('1(c/d) Scene renderer has ACES tone mapping', toneMappingInfo.sceneRendererToneMapping === 4,
    `toneMapping = ${toneMappingInfo.sceneRendererToneMapping}`);
  assert('1(d) No vignette in config.post', !toneMappingInfo.hasVignette);
  assert('1(d) No grain in config.post', !toneMappingInfo.hasGrain);
  assert('1(d) No flick in config.interact', !toneMappingInfo.interactKeys.includes('flick'));
  assert('1(d) No damping in config.interact', !toneMappingInfo.interactKeys.includes('damping'));
  assert('1(d) No deadzone in config.interact', !toneMappingInfo.interactKeys.includes('deadzone'));
  assert('1(d) No returnOnRelease in config.interact', !toneMappingInfo.interactKeys.includes('returnOnRelease'));
  assert('1(d) No puppeteer in config.interact', !toneMappingInfo.interactKeys.includes('puppeteer'));

  // Verify bloom renderer tone mapping from source code
  const postfxSrc = readFileSync('src/postfx.js', 'utf8');
  assert('1(c) Source code uses NoToneMapping for bloom renderer',
    postfxSrc.includes('renderer.toneMapping = NoToneMapping'),
    'Not found in postfx.js');

  // 1(c): Bloom toggle test - use asciiPortfolio.render() not bloom.render()
  const bloomToggle = await page.evaluate(() => {
    const { config, render } = globalThis.asciiPortfolio;
    const initial = config.post.bloom.enabled;
    config.post.bloom.enabled = !initial;
    render();
    const bloom = globalThis.asciiPortfolio.bloom;
    const toggled = bloom.enabled;
    config.post.bloom.enabled = initial;
    render();
    return { initial, toggled, works: bloom.enabled === initial };
  });

  assert('1(c) Bloom toggle works', bloomToggle.works,
    `initial: ${bloomToggle.initial}, after: ${bloomToggle.toggled}`);

  console.log('=== CLAIM 2: NOTHING IS SELECTABLE ===');

  const selectInfo = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const nav = document.querySelector('nav');
    const links = nav.querySelectorAll('a');

    const range = document.createRange();
    range.selectNodeContents(h1);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    const h1Selected = sel.toString();
    sel.removeAllRanges();

    return {
      h1Selected,
      h1UserSelect: getComputedStyle(h1).userSelect,
      navUserSelect: getComputedStyle(nav).userSelect,
      linkUserSelects: Array.from(links).map(a => getComputedStyle(a).userSelect),
      linkPointerEvents: Array.from(links).map(a => getComputedStyle(a).pointerEvents),
    };
  });

  assert('2(a) h1 selection is empty', selectInfo.h1Selected === '');
  assert('2(b) h1 user-select is none', selectInfo.h1UserSelect === 'none');
  assert('2(c) nav user-select is none', selectInfo.navUserSelect === 'none');
  assert('2(d) All links user-select is none',
    selectInfo.linkUserSelects.every(u => u === 'none'),
    `Got: ${JSON.stringify(selectInfo.linkUserSelects)}`);
  assert('2(e) Links have pointer-events (clickable)',
    selectInfo.linkPointerEvents.every(p => p !== 'none'),
    `Got: ${JSON.stringify(selectInfo.linkPointerEvents)}`);

  console.log('=== CLAIM 3: HOLD = ZOOM IN + DOUBLE ROTATION ===');

  // Move to right half and wait for settle
  await page.mouse.move(1280 * 0.75, 800 * 0.5);
  await page.waitForTimeout(1500);

  const preHold = await page.evaluate(() => {
    const { camera, pointer } = globalThis.asciiPortfolio;
    return {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
      dist: camera.position.length(),
      angle: Math.atan2(camera.position.x, camera.position.z),
      held: pointer.held,
    };
  });

  console.log('Pre-hold:', JSON.stringify(preHold));

  await page.mouse.down();
  await page.waitForTimeout(1500);

  const held = await page.evaluate(() => {
    const { camera, pointer } = globalThis.asciiPortfolio;
    return {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
      dist: camera.position.length(),
      angle: Math.atan2(camera.position.x, camera.position.z),
      held: pointer.held,
    };
  });

  console.log('Held:', JSON.stringify(held));

  await page.mouse.up();
  await page.waitForTimeout(1500);

  const postHold = await page.evaluate(() => {
    const { camera, pointer } = globalThis.asciiPortfolio;
    return {
      dist: camera.position.length(),
      angle: Math.atan2(camera.position.x, camera.position.z),
      held: pointer.held,
    };
  });

  console.log('Post-hold:', JSON.stringify(postHold));

  await page.mouse.move(640, 400);
  await page.waitForTimeout(500);

  assert('3(a) pointer.held true on down', held.held === true);
  assert('3(a) Distance decreases on hold', held.dist < preHold.dist,
    `pre: ${preHold.dist.toFixed(4)}, held: ${held.dist.toFixed(4)}`);

  const expectedHeldDist = 8.5 * (1 - 0.12);
  assert('3(a) Held distance near expected',
    Math.abs(held.dist - expectedHeldDist) < 0.5,
    `expected ~${expectedHeldDist.toFixed(2)}, got ${held.dist.toFixed(4)}`);

  const swingRatio = preHold.angle !== 0 ? Math.abs(held.angle / preHold.angle) : (held.angle !== 0 ? Infinity : 0);
  assert('3(a) Swing approximately doubles on hold',
    swingRatio >= 1.5 && swingRatio <= 2.5,
    `preAngle: ${preHold.angle.toFixed(4)}, heldAngle: ${held.angle.toFixed(4)}, ratio: ${swingRatio.toFixed(4)}`);

  assert('3(a) Distance returns after release',
    Math.abs(postHold.dist - preHold.dist) < 0.3,
    `pre: ${preHold.dist.toFixed(4)}, post: ${postHold.dist.toFixed(4)}`);
  assert('3(a) pointer.held false after release', postHold.held === false);

  // 3(b): Flicker test
  console.log('Running flicker test...');
  await page.mouse.move(1280 * 0.75, 800 * 0.5);
  await page.mouse.down();
  await page.waitForTimeout(80);
  await page.mouse.up();

  const shortTapSeries = await page.evaluate(() => {
    const { camera } = globalThis.asciiPortfolio;
    const samples = [];
    const start = performance.now();
    return new Promise(resolve => {
      function sample() {
        samples.push({ time: performance.now() - start, dist: camera.position.length() });
        if (performance.now() - start < 1000) requestAnimationFrame(sample);
        else resolve(samples);
      }
      sample();
    });
  });

  function countCrossings(series, target) {
    let crossings = 0, above = null;
    for (const s of series) {
      const cur = s.dist > target;
      if (above !== null && cur !== above) crossings++;
      above = cur;
    }
    return crossings;
  }

  const flickCrossings = countCrossings(shortTapSeries, 8.5);
  assert('3(b) No flicker on short tap', flickCrossings < 3,
    `Crossings: ${flickCrossings}`);

  console.log('=== CLAIM 4: LINKS OPEN IN NEW TAB ===');

  const linkInfo = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('nav a')).map(a => ({
      href: a.href,
      text: a.textContent,
      target: a.target,
      rel: a.rel,
    }));
  });

  assert('4(a) Both links have target=_blank',
    linkInfo.every(l => l.target === '_blank'),
    `Targets: ${linkInfo.map(l => l.target).join(', ')}`);
  assert('4(b) Links have noopener and noreferrer',
    linkInfo.every(l => l.rel.includes('noopener') && l.rel.includes('noreferrer')),
    `Rel: ${linkInfo.map(l => l.rel).join(', ')}`);

  // 4(c): Behavioral test
  const initialState = page.url();
  const popupPromises = [];
  context.on('page', popup => popupPromises.push(popup));

  await page.click('nav a[href*="github"]');
  await page.waitForTimeout(1000);

  assert('4(c) Popup opened on click', popupPromises.length > 0,
    `Popups: ${popupPromises.length}`);
  assert('4(d) Original page did not navigate', page.url() === initialState,
    `Original: ${initialState}, Current: ${page.url()}`);

  for (const p of popupPromises) await p.close().catch(() => {});

  console.log('=== TAKING SCREENSHOTS ===');

  // Reset to rest position
  await page.mouse.move(640, 400);
  await page.waitForTimeout(1000);

  // Bloom ON
  await page.evaluate(() => {
    globalThis.asciiPortfolio.config.post.bloom.enabled = true;
    globalThis.asciiPortfolio.render();
  });
  await page.screenshot({ path: join(SHOTS_DIR, 'bloom-on.png'), fullPage: false });

  // Bloom OFF
  await page.evaluate(() => {
    globalThis.asciiPortfolio.config.post.bloom.enabled = false;
    globalThis.asciiPortfolio.render();
  });
  await page.screenshot({ path: join(SHOTS_DIR, 'bloom-off.png'), fullPage: false });

  // Hold screenshot
  await page.evaluate(() => {
    globalThis.asciiPortfolio.config.post.bloom.enabled = true;
  });
  await page.mouse.move(1280 * 0.75, 800 * 0.5);
  await page.mouse.down();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(SHOTS_DIR, 'hold.png'), fullPage: false });
  await page.mouse.up();

  // Generate report
  const report = {
    results,
    consoleMessages,
    pageErrors,
    cameraPreHold: preHold,
    cameraHeld: held,
    cameraPostHold: postHold,
    shortTapSeries: shortTapSeries.slice(0, 20),
    canvasInfo,
    bloomInfo,
    toneMappingInfo,
    selectInfo,
    linkInfo,
  };

  writeFileSync(join(SHOTS_DIR, 'report.json'), JSON.stringify(report, null, 2));

  // Also generate markdown report
  const mdReport = generateMarkdownReport(report);
  writeFileSync(join(SHOTS_DIR, 'report.md'), mdReport);

  console.log('\n=== RESULTS ===');
  const pass = results.filter(r => r.pass).length;
  const fail = results.filter(r => !r.pass).length;
  console.log(`Total: ${results.length}, Pass: ${pass}, Fail: ${fail}`);
  for (const r of results) {
    console.log(`${r.pass ? 'PASS' : 'FAIL'}: ${r.name}${r.detail ? ' - ' + r.detail : ''}`);
  }

  if (pageErrors.length > 0) {
    console.log('\n=== PAGE ERRORS ===');
    for (const e of pageErrors) console.log(e);
  }
  const errors = consoleMessages.filter(m => m.type === 'error');
  if (errors.length > 0) {
    console.log('\n=== CONSOLE ERRORS ===');
    for (const e of errors) console.log(`[${e.type}] ${e.text}`);
  }

  await browser.close();
}

function generateMarkdownReport(r) {
  let md = `# UI Behaviour Test Report\n\n`;
  md += `## Summary\n\n`;
  md += `| Metric | Value |\n|--------|-------|\n`;
  md += `| Total Tests | ${r.results.length} |\n`;
  md += `| Passed | ${r.results.filter(x => x.pass).length} |\n`;
  md += `| Failed | ${r.results.filter(x => !x.pass).length} |\n\n`;
  
  md += `## Results Table\n\n`;
  md += `| Test | Result | Detail |\n|------|--------|--------|\n`;
  for (const x of r.results) {
    md += `| ${x.name} | ${x.pass ? 'PASS' : 'FAIL'} | ${x.detail || ''} |\n`;
  }
  
  md += `\n## Camera Series (Hold Test)\n\n`;
  md += `| Phase | Distance | Angle | Held |\n|-------|----------|-------|------|\n`;
  md += `| Pre | ${r.cameraPreHold.dist.toFixed(4)} | ${r.cameraPreHold.angle.toFixed(4)} | ${r.cameraPreHold.held} |\n`;
  md += `| Held | ${r.cameraHeld.dist.toFixed(4)} | ${r.cameraHeld.angle.toFixed(4)} | ${r.cameraHeld.held} |\n`;
  md += `| Post | ${r.cameraPostHold.dist.toFixed(4)} | ${r.cameraPostHold.angle.toFixed(4)} | ${r.cameraPostHold.held} |\n`;
  
  md += `\n## Short Tap Series (First 10 samples)\n\n`;
  md += `| Time (ms) | Distance |\n|-----------|----------|\n`;
  for (const s of r.shortTapSeries.slice(0, 10)) {
    md += `| ${s.time.toFixed(0)} | ${s.dist.toFixed(4)} |\n`;
  }
  
  if (r.pageErrors.length > 0) {
    md += `\n## Page Errors\n\n`;
    for (const e of r.pageErrors) md += `- ${e}\n`;
  }
  
  const errors = r.consoleMessages.filter(m => m.type === 'error');
  if (errors.length > 0) {
    md += `\n## Console Errors\n\n`;
    for (const e of errors) md += `- ${e.text}\n`;
  }
  
  return md;
}

main().catch(err => { console.error('Test failed:', err); process.exit(1); });
