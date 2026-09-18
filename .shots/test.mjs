import { chromium } from 'C:/Users/WanSou/AppData/Roaming/npm/node_modules/omniroute/node_modules/playwright-core/index.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const SHOTS_DIR = 'F:/vibe-projects/wanthedev-github-io/wanthedev.github.io/.shots';
mkdirSync(SHOTS_DIR, { recursive: true });

const results = [];
const consoleMessages = [];
const pageErrors = [];

function assert(name, condition, detail = '') {
  const pass = !!condition;
  results.push({ name, pass, detail });
  if (!pass) {
    console.error(`FAIL: ${name} - ${detail}`);
  }
  return pass;
}

async function main() {
  // Start with Chrome executable for reliability
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    channel: 'chrome',
    headless: true,
    args: [
      '--enable-unsafe-swiftshader',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--disable-web-security',
      '--no-sandbox',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  // Collect console and page errors
  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });
  page.on('pageerror', err => {
    pageErrors.push(err.toString());
  });

  console.log('Navigating to site...');
  await page.goto('http://localhost:5199', { waitUntil: 'networkidle', timeout: 15000 });

  // Wait for asciiPortfolio to be exposed
  await page.waitForFunction(() => typeof globalThis.asciiPortfolio !== 'undefined', {}, { timeout: 10000 });

  console.log('Testing Claim 1: BLOOM RUNS ON ASCII CANVAS');

  // 1(a): Exactly one canvas in DOM, it's WebGL
  const canvasInfo = await page.evaluate(() => {
    const canvases = document.querySelectorAll('canvas');
    const asciiCanvas = document.querySelector('#ascii-background');
    let ctxType = null;
    let isWebGL = false;
    if (asciiCanvas) {
      const ctx = asciiCanvas.getContext('webgl') || asciiCanvas.getContext('experimental-webgl');
      ctxType = ctx ? ctx.constructor.name : 'none';
      isWebGL = ctx !== null;
    }
    return {
      totalCanvases: canvases.length,
      hasAsciiBackground: !!asciiCanvas,
      ctxType,
      isWebGL,
    };
  });

  assert('1(a) Exactly one canvas in DOM', canvasInfo.totalCanvases === 1,
    `Found ${canvasInfo.totalCanvases} canvases`);
  assert('1(a) Canvas is #ascii-background', canvasInfo.hasAsciiBackground,
    'No #ascii-background found');
  assert('1(a) Canvas context is WebGL', canvasInfo.isWebGL,
    `Context type: ${canvasInfo.ctxType}`);

  // 1(b): Bloom composite samples ASCII canvas via TexturePass
  const bloomCheck = await page.evaluate(() => {
    const { bloom } = globalThis.asciiPortfolio;
    const passes = bloom.composer.passes;
    let texturePassMap = null;
    for (const pass of passes) {
      if (pass instanceof bloom.composer ? null : pass) {
        // Check for TexturePass which exposes .map
        if (pass._texture || pass.map) {
          texturePassMap = pass.map || pass._texture;
        }
      }
    }
    // Walk passes more directly
    const asciiCanvas = globalThis.asciiPortfolio.ascii.canvas;
    let samplesAsciiCanvas = false;
    let rendererToneMapping = bloom.renderer.toneMapping;

    // Check if any pass has a map pointing to asciiCanvas
    for (const pass of passes) {
      if (pass.material && pass.material.uniforms && pass.material.uniforms.tDiffuse) {
        const tex = pass.material.uniforms.tDiffuse.value;
        if (tex && tex.image === asciiCanvas) {
          samplesAsciiCanvas = true;
        }
      }
      // Also check for TexturePass which stores in _texture
      if (pass._texture && pass._texture.image === asciiCanvas) {
        samplesAsciiCanvas = true;
      }
    }

    return {
      samplesAsciiCanvas,
      rendererToneMapping,
      noToneMapping: rendererToneMapping === 0, // THREE.NoToneMapping = 0
    };
  });

  assert('1(b) Bloom composite samples ASCII canvas', bloomCheck.samplesAsciiCanvas,
    'TexturePass does not reference ascii.canvas');
  assert('1(c/d) Renderer has NoToneMapping', bloomCheck.noToneMapping,
    `toneMapping = ${bloomCheck.rendererToneMapping}`);

  // 1(c): Bloom brightness delta test
  console.log('Running bloom brightness delta test...');
  const bloomDelta = await page.evaluate(() => {
    const { bloom, ascii, config } = globalThis.asciiPortfolio;
    const w = bloom.composer.renderTarget.width;
    const h = bloom.composer.renderTarget.height;
    const buf = new Uint8Array(w * h * 4);

    // Get background color from config
    const bgHex = config.ascii.colors.background;
    const bgR = parseInt(bgHex.slice(1, 3), 16);
    const bgG = parseInt(bgHex.slice(3, 5), 16);
    const bgB = parseInt(bgHex.slice(5, 7), 16);

    // Capture with bloom ON
    config.post.bloom.enabled = true;
    bloom.render();
    bloom.renderer.readRenderTargetPixels(bloom.composer.renderTarget, 0, 0, w, h, buf);
    const onPixels = new Uint8Array(buf);

    // Capture with bloom OFF
    config.post.bloom.enabled = false;
    bloom.render();
    bloom.renderer.readRenderTargetPixels(bloom.composer.renderTarget, 0, 0, w, h, buf);
    const offPixels = new Uint8Array(buf);

    // Compare offscreen ASCII canvas
    const asciiCtx = ascii.canvas.getContext('2d');
    const asciiOn = asciiCtx.getImageData(0, 0, ascii.canvas.width, ascii.canvas.height).data;

    // Re-enable bloom and re-render to get consistent state
    config.post.bloom.enabled = true;
    bloom.render();

    // Calculate brightness delta on composite buffer
    let brightOn = 0;
    let brightOff = 0;
    let affectedCount = 0;
    const step = 4; // Sample every 4th pixel for speed
    for (let i = 0; i < onPixels.length; i += 4 * step) {
      const rOn = onPixels[i], gOn = onPixels[i + 1], bOn = onPixels[i + 2];
      const rOff = offPixels[i], gOff = offPixels[i + 1], bOff = offPixels[i + 2];
      const lumOn = 0.299 * rOn + 0.587 * gOn + 0.114 * bOn;
      const lumOff = 0.299 * rOff + 0.587 * gOff + 0.114 * bOff;
      brightOn += lumOn;
      brightOff += lumOff;
      // Count pixels that are background-ish in OFF but brighter in ON
      const isBgOff = Math.abs(rOff - bgR) < 5 && Math.abs(gOff - bgG) < 5 && Math.abs(bOff - bgB) < 5;
      if (isBgOff && lumOn > lumOff + 2) {
        affectedCount++;
      }
    }
    const sampleCount = Math.floor(onPixels.length / (4 * step));
    const meanOn = brightOn / sampleCount;
    const meanOff = brightOff / sampleCount;
    const meanDelta = meanOn - meanOff;

    // Compare ASCII canvas (should be identical)
    let asciiIdentical = true;
    for (let i = 0; i < asciiOn.length; i += 16) { // Check every 4th pixel
      if (asciiOn[i] !== offPixels[i] || asciiOn[i+1] !== offPixels[i+1] ||
          asciiOn[i+2] !== offPixels[i+2] || asciiOn[i+3] !== offPixels[i+3]) {
        asciiIdentical = false;
        break;
      }
    }

    return {
      meanDelta,
      meanOn,
      meanOff,
      affectedCount,
      asciiIdentical,
      w, h
    };
  });

  assert('1(c) Background brightens with bloom ON', bloomDelta.meanDelta > 0.5,
    `Mean delta: ${bloomDelta.meanDelta.toFixed(3)}`);
  assert('1(c) Affected pixels count > 0', bloomDelta.affectedCount > 0,
    `Affected: ${bloomDelta.affectedCount}`);
  assert('1(c) ASCII canvas identical with/without bloom', bloomDelta.asciiIdentical,
    'ASCII canvas changed when bloom toggled');

  // 1(d): No vignette/grain in post, no flick/damping/etc in interact
  const configCheck = await page.evaluate(() => {
    const { config } = globalThis.asciiPortfolio;
    const postKeys = Object.keys(config.post);
    const interactKeys = Object.keys(config.interact);
    return {
      hasVignette: postKeys.includes('vignette'),
      hasGrain: postKeys.includes('grain'),
      hasFlick: interactKeys.includes('flick'),
      hasDamping: interactKeys.includes('damping'),
      hasDeadzone: interactKeys.includes('deadzone'),
      hasReturnOnRelease: interactKeys.includes('returnOnRelease'),
      hasPuppeteer: interactKeys.includes('puppeteer'),
      postKeys,
      interactKeys,
    };
  });

  assert('1(d) No vignette in config.post', !configCheck.hasVignette,
    `post keys: ${JSON.stringify(configCheck.postKeys)}`);
  assert('1(d) No grain in config.post', !configCheck.hasGrain,
    `post keys: ${JSON.stringify(configCheck.postKeys)}`);
  assert('1(d) No flick in config.interact', !configCheck.hasFlick,
    `interact keys: ${JSON.stringify(configCheck.interactKeys)}`);
  assert('1(d) No damping in config.interact', !configCheck.hasDamping,
    `interact keys: ${JSON.stringify(configCheck.interactKeys)}`);
  assert('1(d) No deadzone in config.interact', !configCheck.hasDeadzone,
    `interact keys: ${JSON.stringify(configCheck.interactKeys)}`);
  assert('1(d) No returnOnRelease in config.interact', !configCheck.hasReturnOnRelease,
    `interact keys: ${JSON.stringify(configCheck.interactKeys)}`);
  assert('1(d) No puppeteer in config.interact', !configCheck.hasPuppeteer,
    `interact keys: ${JSON.stringify(configCheck.interactKeys)}`);

  console.log('Testing Claim 2: NOTHING IS SELECTABLE');

  // 2: No selection
  const selectCheck = await page.evaluate(() => {
    // Test h1
    const h1 = document.querySelector('h1');
    const nav = document.querySelector('nav');

    // Try programmatic selection
    const range = document.createRange();
    range.selectNodeContents(h1);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    const h1Selected = sel.toString();
    sel.removeAllRanges();

    // Check CSS
    const h1UserSelect = getComputedStyle(h1).userSelect;
    const navLink = nav.querySelector('a');
    const navLinkUserSelect = getComputedStyle(navLink).userSelect;
    const navLinkPointerEvents = getComputedStyle(navLink).pointerEvents;

    return {
      h1Selected,
      h1UserSelect,
      navLinkUserSelect,
      navLinkPointerEvents,
    };
  });

  assert('2(a) h1 selection is empty', selectCheck.h1Selected === '',
    `Got: "${selectCheck.h1Selected}"`);
  assert('2(b) h1 user-select is none', selectCheck.h1UserSelect === 'none',
    `Got: ${selectCheck.h1UserSelect}`);
  assert('2(c) nav a user-select is none', selectCheck.navLinkUserSelect === 'none',
    `Got: ${selectCheck.navLinkUserSelect}`);
  assert('2(d) nav a pointer-events is not none', selectCheck.navLinkPointerEvents !== 'none',
    `Got: ${selectCheck.navLinkPointerEvents}`);

  console.log('Testing Claim 3: HOLD = ZOOM IN + DOUBLE ROTATION');

  // 3(a): Camera behavior on hold
  const cameraData = await page.evaluate(() => {
    const { camera, config, pointer } = globalThis.asciiPortfolio;

    // Move mouse to right half
    const evt = new PointerEvent('pointermove', {
      clientX: window.innerWidth * 0.75,
      clientY: window.innerHeight * 0.5,
      pointerType: 'mouse',
      bubbles: true,
    });
    window.dispatchEvent(evt);

    // Wait for springs to settle
    return {
      initialPos: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      initialDist: camera.position.length(),
      initialAngle: Math.atan2(camera.position.x, camera.position.z),
      pointerState: { ...pointer },
      config: {
        cameraZ: config.scene.cameraZ,
        zoom: config.interact.zoom,
        holdStrength: config.interact.holdStrength,
      }
    };
  });

  // Wait for spring to settle
  await page.waitForTimeout(1300);

  // Now record pre-hold state
  const preHold = await page.evaluate(() => {
    const { camera, pointer } = globalThis.asciiPortfolio;
    return {
      pos: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      dist: camera.position.length(),
      angle: Math.atan2(camera.position.x, camera.position.z),
      held: pointer.held,
    };
  });

  // Simulate hold via mouse down on right half
  await page.mouse.move(window.innerWidth * 0.75, window.innerHeight * 0.5);
  await page.mouse.down();
  await page.waitForTimeout(1300);

  const heldState = await page.evaluate(() => {
    const { camera, pointer } = globalThis.asciiPortfolio;
    return {
      pos: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      dist: camera.position.length(),
      angle: Math.atan2(camera.position.x, camera.position.z),
      held: pointer.held,
    };
  });

  // Release
  await page.mouse.up();
  await page.waitForTimeout(1300);

  const postHold = await page.evaluate(() => {
    const { camera, pointer } = globalThis.asciiPortfolio;
    return {
      pos: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      dist: camera.position.length(),
      angle: Math.atan2(camera.position.x, camera.position.z),
      held: pointer.held,
    };
  });

  // Restore pointer to center
  await page.mouse.move(window.innerWidth / 2, window.innerHeight / 2);
  await page.waitForTimeout(500);

  assert('3(a) pointer.held becomes true on down', heldState.held === true,
    `held = ${heldState.held}`);
  assert('3(a) Distance decreases on hold', heldState.dist < preHold.dist,
    `pre: ${preHold.dist.toFixed(4)}, held: ${heldState.dist.toFixed(4)}`);

  // Expected zoomed distance: cameraZ * (1 - zoom)
  const expectedHeldDist = 8.5 * (1 - 0.12);
  assert('3(a) Held distance near expected',
    Math.abs(heldState.dist - expectedHeldDist) < 0.5,
    `expected ~${expectedHeldDist.toFixed(2)}, got ${heldState.dist.toFixed(4)}`);

  // Swing angle should roughly double (holdStrength = 2)
  const preAngle = preHold.angle;
  const heldAngle = heldState.angle;
  const swingRatio = preAngle !== 0 ? Math.abs(heldAngle / preAngle) : (heldAngle !== 0 ? Infinity : 0);
  assert('3(a) Swing approximately doubles on hold',
    swingRatio >= 1.5 && swingRatio <= 2.5,
    `preAngle: ${preAngle.toFixed(4)}, heldAngle: ${heldAngle.toFixed(4)}, ratio: ${swingRatio.toFixed(4)}`);

  assert('3(a) Distance returns after release',
    Math.abs(postHold.dist - preHold.dist) < 0.3,
    `pre: ${preHold.dist.toFixed(4)}, post: ${postHold.dist.toFixed(4)}`);
  assert('3(a) pointer.held is false after release', postHold.held === false,
    `held = ${postHold.held}`);

  // 3(b): No flicker - sample camera position during hold
  console.log('Sampling camera positions for flicker test...');
  const cameraSeries = await page.evaluate(() => {
    const { camera } = globalThis.asciiPortfolio;
    const samples = [];
    const startTime = performance.now();

    return new Promise((resolve) => {
      function sample() {
        samples.push({
          time: performance.now() - startTime,
          dist: camera.position.length(),
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z,
        });
        if (performance.now() - startTime < 2000) {
          requestAnimationFrame(sample);
        } else {
          resolve(samples);
        }
      }
      sample();
    });
  });

  // Short tap flicker test
  await page.mouse.move(window.innerWidth * 0.75, window.innerHeight * 0.5);
  await page.mouse.down();
  await page.waitForTimeout(80);
  await page.mouse.up();

  const shortTapSeries = await page.evaluate(() => {
    const { camera } = globalThis.asciiPortfolio;
    const samples = [];
    const startTime = performance.now();

    return new Promise((resolve) => {
      function sample() {
        samples.push({
          time: performance.now() - startTime,
          dist: camera.position.length(),
        });
        if (performance.now() - startTime < 1000) {
          requestAnimationFrame(sample);
        } else {
          resolve(samples);
        }
      }
      sample();
    });
  });

  // Analyze series for oscillations
  function countCrossings(series, threshold, target) {
    let crossings = 0;
    let above = null;
    for (const s of series) {
      const current = s.dist > target;
      if (above !== null && current !== above) {
        crossings++;
      }
      above = current;
    }
    return crossings;
  }

  const flickCrossings = countCrossings(shortTapSeries, 0.1, 8.5);
  assert('3(b) No flicker on short tap (crossings < 3)', flickCrossings < 3,
    `Crossings: ${flickCrossings}, series: ${JSON.stringify(shortTapSeries.slice(0, 10))}`);

  console.log('Testing Claim 4: LINKS OPEN IN NEW TAB');

  // 4: Link attributes and behavior
  const linkCheck = await page.evaluate(() => {
    const links = document.querySelectorAll('nav a');
    return Array.from(links).map(a => ({
      href: a.href,
      text: a.textContent,
      target: a.target,
      rel: a.rel,
    }));
  });

  assert('4(a) Both nav links have target="_blank"',
    linkCheck.every(l => l.target === '_blank'),
    `Targets: ${linkCheck.map(l => l.target).join(', ')}`);
  assert('4(b) Links have rel with noopener and noreferrer',
    linkCheck.every(l => l.rel.includes('noopener') && l.rel.includes('noreferrer')),
    `Rel: ${linkCheck.map(l => l.rel).join(', ')}`);

  // 4(c): Behavioral test - click should open popup
  const initialState = page.url();
  const popupPromises = [];

  context.on('page', popup => {
    popupPromises.push(popup);
  });

  // Click GitHub link
  await page.click('nav a[href*="github"]');
  await page.waitForTimeout(1000);

  const popupOpened = popupPromises.length > 0;
  const stillOnOriginal = page.url() === initialState;

  assert('4(c) Popup opened on GitHub click', popupOpened,
    `Popups: ${popupPromises.length}`);
  assert('4(d) Original page did not navigate', stillOnOriginal,
    `Original: ${initialState}, Current: ${page.url()}`);

  // Close popups
  for (const popup of popupPromises) {
    await popup.close().catch(() => {});
  }

  // Take screenshots
  console.log('Taking screenshots...');

  // Reset camera to rest position
  await page.mouse.move(window.innerWidth / 2, window.innerHeight / 2);
  await page.waitForTimeout(500);

  // Bloom ON screenshot
  await page.evaluate(() => {
    globalThis.asciiPortfolio.config.post.bloom.enabled = true;
    globalThis.asciiPortfolio.render();
  });
  await page.screenshot({ path: join(SHOTS_DIR, 'bloom-on.png'), fullPage: false });

  // Bloom OFF screenshot
  await page.evaluate(() => {
    globalThis.asciiPortfolio.config.post.bloom.enabled = false;
    globalThis.asciiPortfolio.render();
  });
  await page.screenshot({ path: join(SHOTS_DIR, 'bloom-off.png'), fullPage: false });

  // Hold screenshot (mouse down on right)
  await page.evaluate(() => {
    globalThis.asciiPortfolio.config.post.bloom.enabled = true;
  });
  await page.mouse.move(window.innerWidth * 0.75, window.innerHeight * 0.5);
  await page.mouse.down();
  await page.waitForTimeout(1300);
  await page.screenshot({ path: join(SHOTS_DIR, 'hold.png'), fullPage: false });
  await page.mouse.up();

  // Generate report
  const report = {
    summary: results.filter(r => !r.pass).map(r => r.name),
    results,
    consoleMessages,
    pageErrors,
    cameraPreHold: preHold,
    cameraHeld: heldState,
    cameraPostHold: postHold,
    cameraSeriesSample: cameraSeries.slice(0, 20),
    shortTapSeries: shortTapSeries.slice(0, 20),
    bloomDelta: bloomDelta,
  };

  writeFileSync(join(SHOTS_DIR, 'report.json'), JSON.stringify(report, null, 2));

  console.log('\n=== RESULTS ===');
  for (const r of results) {
    console.log(`${r.pass ? 'PASS' : 'FAIL'}: ${r.name}${r.detail ? ` - ${r.detail}` : ''}`);
  }

  if (consoleMessages.length > 0) {
    console.log('\n=== CONSOLE MESSAGES ===');
    for (const m of consoleMessages) {
      console.log(`[${m.type}] ${m.text}`);
    }
  }

  if (pageErrors.length > 0) {
    console.log('\n=== PAGE ERRORS ===');
    for (const e of pageErrors) {
      console.log(e);
    }
  }

  await browser.close();
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
