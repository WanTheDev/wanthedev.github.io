/**
 * final-resize.mjs — Verify BUG 1 (resize freeze/stretch) and BUG 2 (centring).
 *
 * Tests:
 *   1A — coalescing: 200 synchronous resize events from inside one evaluate
 *   1B — coalescing with real size change via Playwright then 50 events
 *   1C — DPR override (0.75, 1, 1.25, 1.5, 2) stretch check
 *   1D — freeze check after 1280→900→1280 resize cycle
 *    2  — knot centring (large-component isolation) at 1920x1080, 390x844, 1600x500
 *
 * Output: .shots/final-resize.json
 * Screenshots: .shots/final-*.png
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/WanSou/AppData/Roaming/npm/node_modules/omniroute/node_modules/playwright-core/index.js');
import { writeFileSync, mkdirSync } from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://localhost:5199';
const OUT = '.shots/final-resize.json';
const SCREENSHOTS = '.shots/final';

mkdirSync('.shots', { recursive: true });

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function snap(label) { return page.screenshot({ path: `${SCREENSHOTS}-${label}.png`, type: 'png' }); }

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function getState() {
  return await page.evaluate(() => {
    const { ascii } = globalThis.asciiPortfolio;
    const canvas = document.querySelector('#ascii-background');
    const rect = canvas.getBoundingClientRect();
    return {
      innerW: window.innerWidth,
      innerH: window.innerHeight,
      dpr: window.devicePixelRatio,
      asciiW: ascii.canvas.width,
      asciiH: ascii.canvas.height,
      columns: ascii.columns,
      rows: ascii.rows,
      cssW: rect.width,
      cssH: rect.height,
      attrW: ascii.canvas.width,
      attrH: ascii.canvas.height,
    };
  });
}

/**
 * Patch the four resize-path functions with counters.
 * Also instruments a raf-based capture so we can distinguish
 * resize-driven passes from the normal animation-loop draws.
 */
async function patchFunctions(page) {
  await page.evaluate(() => {
    const { ascii, bloom, composite } = globalThis.asciiPortfolio;

    const makeCounter = (obj, key) => {
      const orig = obj[key].bind(obj);
      obj[key] = function(...args) {
        obj[`__${key}Calls`]++;
        obj[`__${key}Times`].push(performance.now());
        return orig(...args);
      };
      obj[`__${key}Calls`] = 0;
      obj[`__${key}Times`] = [];
    };

    makeCounter(ascii, 'resize');
    makeCounter(bloom, 'setSize');
    makeCounter(composite, 'setSize');
    makeCounter(composite, 'render');

    // fx.setSize on world.fx
    const { fx } = globalThis.asciiPortfolio;
    makeCounter(fx, 'setSize');

    // Mark resize-pass timestamps separately from render-pass timestamps
    // by also tracking when ascii.resize is called (the gatekeeper).
    window.__resizePassTimes = [];
    const origResize = ascii.resize;
    ascii.resize = function(...args) {
      window.__resizePassTimes.push(performance.now());
      return origResize(...args);
    };
    window.__resizePassCount = 0;
    const wrappedResize = ascii.resize;
    ascii.resize = function(...args) {
      window.__resizePassCount++;
      window.__resizePassTimes.push(performance.now());
      return wrappedResize(...args);
    };
  });
}

async function readPatches() {
  return await page.evaluate(() => {
    const { ascii, bloom, composite, fx } = globalThis.asciiPortfolio;
    return {
      asciiResizeCalls: ascii.__resizeCalls,
      bloomSetSizeCalls: bloom.__setSizeCalls,
      compositeSetSizeCalls: composite.__setSizeCalls,
      compositeRenderCalls: composite.__renderCalls,
      fxSetSizeCalls: fx.__setSizeCalls,
      resizePassCount: window.__resizePassCount,
      resizePassTimes: window.__resizePassTimes.slice(0, 20),
    };
  });
}

async function resetPatches() {
  await page.evaluate(() => {
    const { ascii, bloom, composite, fx } = globalThis.asciiPortfolio;
    const reset = (obj, key) => {
      const orig = obj[key];
      const wrapped = function(...args) {
        obj[`__${key}Calls`]++;
        obj[`__${key}Times`].push(performance.now());
        return orig(...args);
      };
      obj[`__${key}Calls`] = 0;
      obj[`__${key}Times`] = [];
      obj[key] = wrapped;
    };
    reset(ascii, 'resize');
    reset(bloom, 'setSize');
    reset(composite, 'setSize');
    reset(composite, 'render');
    reset(fx, 'setSize');

    // Re-wrap resize to also track pass count
    const origR = ascii.resize;
    let __count = 0;
    let __times = [];
    ascii.resize = function(...args) {
      __count++;
      __times.push(performance.now());
      return origR(...args);
    };
    window.__resizePassCount = 0;
    window.__resizePassTimes = [];
    const origRR = ascii.resize;
    ascii.resize = function(...args) {
      window.__resizePassCount++;
      window.__resizePassTimes.push(performance.now());
      return origRR(...args);
    };
  });
}

// ─── Knot isolation: large bright connected blob with morphological closing ───
//
// Pitfall this exists to avoid: a naive ink centroid over the whole frame
// measures the 250-particle starfield (small dots spread over radius 3.2..13),
// not the knot. Two things make the knot identifiable:
//   1. It is BRIGHT — glyph pixels reach luminance ~250, while starfield dots
//      that survive a moderate threshold are isolated and tiny.
//   2. It is a big CONNECTED mass. On the raw glyph canvas, individual
//      strokes don't touch across cell boundaries, so we apply morphological
//      closing (dilate by R then erode by R) to bridge the gaps between
//      adjacent bright cells. After closing, the knot is one huge component
//      (hundreds of thousands of pixels) while any surviving starfield dots
//      remain small (tens of pixels).
//
// Coordinates are CSS pixels: the backing store is viewport*dpr while the
// rendered box is the viewport, so dividing buffer coords by dpr gives the
// comparable fraction-of-frame value.
async function measureKnotCentroid(page, thresholds = [60]) {
  return await page.evaluate((threshs) => {
    const { ascii } = globalThis.asciiPortfolio;
    const ctx = ascii.canvas.getContext('2d');
    const W = ascii.canvas.width;
    const H = ascii.canvas.height;
    const dpr = ascii.devicePixelRatio || 1;
    const cssW = W / dpr;
    const cssH = H / dpr;

    const img = ctx.getImageData(0, 0, W, H);
    const px = img.data;
    const lum = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) {
      const o = i * 4;
      lum[i] = 0.2126 * px[o] + 0.7152 * px[o + 1] + 0.0722 * px[o + 2];
    }

    const results = { canvasW: W, canvasH: H, dpr, cssW, cssH };
    // Closing kernel radius: 3 px bridges gaps between adjacent glyph cells
    // without swallowing the entire frame.
    const R = 3;

    for (const L of threshs) {
      // Threshold
      const bin = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) bin[i] = lum[i] > L ? 1 : 0;

      // Dilate: set (x,y) to 1 if any neighbor within R is 1
      const dil = new Uint8Array(W * H);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          let v = 0;
          outer:
          for (let dy = -R; dy <= R && !v; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= H) continue;
            for (let dx = -R; dx <= R; dx++) {
              const nx = x + dx;
              if (nx >= 0 && nx < W && bin[ny * W + nx]) { v = 1; break outer; }
            }
          }
          dil[y * W + x] = v;
        }
      }
      // Erode: set (x,y) to 1 only if ALL neighbors within R are 1
      const ero = new Uint8Array(W * H);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          let v = 1;
          outer:
          for (let dy = -R; dy <= R && v; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= H) { v = 0; continue outer; }
            for (let dx = -R; dx <= R; dx++) {
              const nx = x + dx;
              if (nx < 0 || nx >= W || !dil[ny * W + nx]) { v = 0; break outer; }
            }
          }
          ero[y * W + x] = v;
        }
      }

      // Largest and second-largest 4-connected component on the closed image
      const visited = new Uint8Array(W * H);
      const dirs = [-1, 1, -W, W];
      let best = null;
      let second = null;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const idx = y * W + x;
          if (!ero[idx] || visited[idx]) continue;
          const stack = [idx];
          visited[idx] = 1;
          let cnt = 0;
          let minX = x, maxX = x, minY = y, maxY = y;
          while (stack.length > 0) {
            const cur = stack.pop();
            cnt++;
            const cy = Math.floor(cur / W);
            const cx = cur - cy * W;
            if (cx < minX) minX = cx;
            if (cx > maxX) maxX = cx;
            if (cy < minY) minY = cy;
            if (cy > maxY) maxY = cy;
            for (const d of dirs) {
              const nb = cur + d;
              if (nb >= 0 && nb < W * H && ero[nb] && !visited[nb]) {
                visited[nb] = 1;
                stack.push(nb);
              }
            }
          }
          const comp = { pixels: cnt, bbox: { minX, maxX, minY, maxY } };
          if (!best || comp.pixels > best.pixels) { second = best; best = comp; }
          else if (!second || comp.pixels > second.pixels) { second = comp; }
        }
      }

      best = best || { pixels: 0, bbox: { minX: 0, maxX: 0, minY: 0, maxY: 0 } };
      second = second || { pixels: 0, bbox: { minX: 0, maxX: 0, minY: 0, maxY: 0 } };

      // bbox centre in CSS pixels, then as a fraction of the CSS box
      const cxPx = (best.bbox.minX + best.bbox.maxX) / 2 / dpr;
      const cyPx = (best.bbox.minY + best.bbox.maxY) / 2 / dpr;
      results[`L${L}_pixels`] = best.pixels;
      results[`L${L}_secondPixels`] = second.pixels;
      results[`L${L}_bboxCssPx`] = {
        minX: best.bbox.minX / dpr, maxX: best.bbox.maxX / dpr,
        minY: best.bbox.minY / dpr, maxY: best.bbox.maxY / dpr,
      };
      results[`L${L}_cx`] = cssW > 0 ? cxPx / cssW : 0.5;
      results[`L${L}_cy`] = cssH > 0 ? cyPx / cssH : 0.5;
      results[`L${L}_spanX`] = (best.bbox.maxX - best.bbox.minX) / dpr / Math.max(1, cssW);
      results[`L${L}_spanY`] = (best.bbox.maxY - best.bbox.minY) / dpr / Math.max(1, cssH);
    }

    return results;
  }, thresholds);
}

/**
 * ~12 samples ~500ms apart (the knot rotates: rot.x = t*0.147, rot.y = t*0.21
 * plus a ±0.12 rad group z-wobble, so one sample is not representative).
 * Report the mean of the per-sample bbox centres and the min/max over samples.
 */
async function sampleKnotCentroid(page, sampleCount = 12, intervalMs = 500) {
  const samples = [];
  for (let i = 0; i < sampleCount; i++) {
    samples.push(await measureKnotCentroid(page));
    if (i < sampleCount - 1) await sleep(intervalMs);
  }

  const key = 'L60';
  const cxs = samples.map(s => s[`${key}_cx`] ?? 0.5);
  const cys = samples.map(s => s[`${key}_cy`] ?? 0.5);
  const pxCounts = samples.map(s => s[`${key}_pixels`] ?? 0);
  const pxCounts2 = samples.map(s => s[`${key}_secondPixels`] ?? 0);
  const spansX = samples.map(s => s[`${key}_spanX`] ?? 0);
  const spansY = samples.map(s => s[`${key}_spanY`] ?? 0);

  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  return {
    samples,
    avgCx: avg(cxs), avgCy: avg(cys),
    minCx: Math.min(...cxs), maxCx: Math.max(...cxs),
    minCy: Math.min(...cys), maxCy: Math.max(...cys),
    avgPixels: avg(pxCounts), avgPixels2: avg(pxCounts2),
    avgSpanX: avg(spansX), avgSpanY: avg(spansY),
    cxRange: Math.max(...cxs) - Math.min(...cxs),
    cyRange: Math.max(...cys) - Math.min(...cys),
  };
}

// ─── Launch browser ────────────────────────────────────────────────────────────
const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-web-security','--no-sandbox'],
  headless: true,
});
const context = await browser.newContext();
const page = await context.newPage();

const consoleMessages = [];
const pageErrors = [];
page.on('console', (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }));
page.on('pageerror', (err) => pageErrors.push({ message: err.message, stack: err.stack }));

const result = {
  test1A: null,
  test1B: null,
  test1C: null,
  test1D: null,
  test2: null,
  consoleMessages: [],
  errors: [],
};

await page.setViewportSize({ width: 1280, height: 800 });
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForFunction(() => typeof globalThis.asciiPortfolio !== 'undefined', { timeout: 10000 });
await sleep(800);

// ══════════════════════════════════════════════════════════════════════════════
// TEST 1A: coalescing — 200 synchronous resize events from inside one evaluate
// ══════════════════════════════════════════════════════════════════════════════
console.log('TEST 1A: 200 synchronous resize events (coalescing)');

await page.setViewportSize({ width: 1280, height: 800 });
await sleep(600);
await patchFunctions(page);

const test1AResult = await page.evaluate(() => {
  // Fire 200 resize events synchronously from inside the page
  for (let i = 0; i < 200; i++) {
    window.dispatchEvent(new Event('resize'));
  }
  return { eventsFired: 200 };
});

// Wait for any coalesced resize to complete (scheduleResize uses rAF)
await sleep(800);

const test1APatches = await readPatches();
const test1AState = await getState();

// Confirm a final pass happened
const finalPassOccurred = test1APatches.asciiResizeCalls > 0;
const canvasMatchesViewport =
  test1AState.asciiW === Math.floor(test1AState.innerW * test1AState.dpr) &&
  test1AState.asciiH === Math.floor(test1AState.innerH * test1AState.dpr);

result.test1A = {
  description: '200 synchronous resize events from inside one evaluate; coalescing should limit real passes',
  eventsFired: test1AResult.eventsFired,
  ...test1APatches,
  stateAfter: test1AState,
  finalPassOccurred,
  canvasMatchesViewport,
  pass: test1APatches.asciiResizeCalls <= 5 && canvasMatchesViewport,
  notes: test1APatches.asciiResizeCalls > 5
    ? `ascii.resize called ${test1APatches.asciiResizeCalls} times — coalescing failed`
    : `Coalescing working: ${test1APatches.asciiResizeCalls} real resize passes for 200 events`,
};
console.log('TEST 1A PASS:', result.test1A.pass, '| ascii.resize calls:', test1APatches.asciiResizeCalls);
await snap('1A-end');

// ══════════════════════════════════════════════════════════════════════════════
// TEST 1B: coalescing with real size change — 50 resize events after viewport change
// ══════════════════════════════════════════════════════════════════════════════
console.log('\nTEST 1B: real size change + 50 resize events');

await page.setViewportSize({ width: 1280, height: 800 });
await sleep(600);
await resetPatches();

// Set a different viewport size
await page.setViewportSize({ width: 900, height: 1000 });
await sleep(200); // let one frame render at new size

// Fire 50 resize events from inside the page immediately after
const test1BResult = await page.evaluate(() => {
  for (let i = 0; i < 50; i++) {
    window.dispatchEvent(new Event('resize'));
  }
  return { eventsFired: 50 };
});

await sleep(800);
const test1BPatches = await readPatches();
const test1BState = await getState();

result.test1B = {
  description: 'Viewport changed to 900x1000, then 50 synchronous resize events fired',
  eventsFired: test1BResult.eventsFired,
  finalViewport: { w: 900, h: 1000 },
  ...test1BPatches,
  stateAfter: test1BState,
  canvasMatchesViewport:
    test1BState.asciiW === Math.floor(test1BState.innerW * test1BState.dpr) &&
    test1BState.asciiH === Math.floor(test1BState.innerH * test1BState.dpr),
  pass: test1BPatches.asciiResizeCalls <= 5 && test1BState.asciiW === 900 && test1BState.asciiH === 1000,
  notes: test1BPatches.asciiResizeCalls > 5
    ? `ascii.resize called ${test1BPatches.asciiResizeCalls} times — coalescing weak`
    : `Coalescing OK: ${test1BPatches.asciiResizeCalls} passes for 50 events at 900x1000`,
};
console.log('TEST 1B PASS:', result.test1B.pass, '| ascii.resize calls:', test1BPatches.asciiResizeCalls);
await snap('1B-end');

// ══════════════════════════════════════════════════════════════════════════════
// TEST 1C: DPR override stretch check
// ══════════════════════════════════════════════════════════════════════════════
console.log('\nTEST 1C: DPR override stretch check');

const dprSettings = [0.75, 1, 1.25, 1.5, 2];
const test1CResults = [];

for (const dpr of dprSettings) {
  // Create a fresh context for each DPR to ensure clean load
  const dprContext = await browser.newContext();
  const dprPage = await dprContext.newPage();
  const dprConsole = [];
  const dprPageErrors = [];
  dprPage.on('console', (msg) => dprConsole.push({ type: msg.type(), text: msg.text() }));
  dprPage.on('pageerror', (err) => dprPageErrors.push({ message: err.message, stack: err.stack }));

  // Set DPR via CDP BEFORE loading
  const cdp = await dprContext.newCDPSession(dprPage);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: dpr,
    mobile: false,
  });

  await dprPage.goto(URL, { waitUntil: 'networkidle' });
  await dprPage.waitForFunction(() => typeof globalThis.asciiPortfolio !== 'undefined', { timeout: 10000 });
  await sleep(800);

  const state = await dprPage.evaluate(() => {
    const { ascii } = globalThis.asciiPortfolio;
    const canvas = document.querySelector('#ascii-background');
    const rect = canvas.getBoundingClientRect();
    return {
      windowDpr: window.devicePixelRatio,
      cssW: rect.width,
      cssH: rect.height,
      attrW: ascii.canvas.width,
      attrH: ascii.canvas.height,
      innerW: window.innerWidth,
      innerH: window.innerHeight,
    };
  });

  // The app caps DPR at config.performance.maxDevicePixelRatio (1.5)
  const effectiveDpr = Math.min(dpr, 1.5);
  const expectedAttrW = Math.floor(1280 * effectiveDpr);
  const expectedAttrH = Math.floor(800 * effectiveDpr);
  const expectedCSSW = 1280;
  const expectedCSSH = 800;

  // Ratio check: CSS box / (buffer / effectiveDpr) should be ~1.0
  // Use effectiveDpr (what the app actually used) so the ratio is 1.0 even when
  // the app caps DPR below the window's devicePixelRatio.
  const ratioW = state.cssW / (state.attrW / effectiveDpr);
  const ratioH = state.cssH / (state.attrH / effectiveDpr);

  const stretchBug = Math.abs(ratioW - 1.0) > 0.01 || Math.abs(ratioH - 1.0) > 0.01;

  test1CResults.push({
    dprSetting: dpr,
    windowDpr: state.windowDpr,
    effectiveDpr,
    cssW: state.cssW,
    cssH: state.cssH,
    attrW: state.attrW,
    attrH: state.attrH,
    expectedAttrW,
    expectedAttrH,
    expectedCSSW,
    expectedCSSH,
    ratioW,
    ratioH,
    stretchBug,
    pass: Math.abs(ratioW - 1.0) <= 0.01 && Math.abs(ratioH - 1.0) <= 0.01 &&
          state.cssW === expectedCSSW && state.cssH === expectedCSSH &&
          state.attrW === expectedAttrW && state.attrH === expectedAttrH,
    errors: dprPageErrors.length > 0 ? dprPageErrors.slice(0, 3) : [],
  });

  await dprPage.screenshot({ path: `${SCREENSHOTS}-1C-dpr${dpr}.png`, type: 'png' });
  await dprContext.close();
  await sleep(200);
}

const test1CAllPass = test1CResults.every(r => r.pass);
result.test1C = {
  description: 'DPR override 0.75/1/1.25/1.5/2 with 1280x800 CSS viewport; check CSS box = viewport, buffer = viewport*dpr, ratio ≈ 1.0',
  results: test1CResults,
  overallPass: test1CAllPass,
  notes: test1CAllPass
    ? 'All DPR settings: CSS box matches viewport, buffer matches viewport*dpr, ratio ≈ 1.0 — no stretch bug'
    : `Stretch bug detected at some DPR settings`,
};
console.log('TEST 1C OVERALL PASS:', test1CAllPass);
for (const r of test1CResults) {
  console.log(`  DPR=${r.dprSetting}: css=${r.cssW}x${r.cssH}, attr=${r.attrW}x${r.attrH}, ratio=${r.ratioW.toFixed(3)}, pass=${r.pass}`);
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST 1D: freeze check — sample glyph canvas twice ~700ms apart after resize
// ══════════════════════════════════════════════════════════════════════════════
console.log('\nTEST 1D: freeze check after resize cycle');

await page.setViewportSize({ width: 1280, height: 800 });
await sleep(600);

async function sampleFreeze(label, w, h) {
  await page.setViewportSize({ width: w, height: h });
  await sleep(800);
  await snap(`1D-${label}`);

  const freezeData = await page.evaluate(async () => {
    const { ascii } = globalThis.asciiPortfolio;
    const ctx = ascii.canvas.getContext('2d');
    const s1 = ctx.getImageData(0, 0, ascii.canvas.width, ascii.canvas.height).data;
    await new Promise(r => setTimeout(r, 700));
    const s2 = ctx.getImageData(0, 0, ascii.canvas.width, ascii.canvas.height).data;
    let diff = 0;
    for (let i = 0; i < s1.length; i++) {
      if (s1[i] !== s2[i]) diff++;
    }
    return {
      totalPixels: ascii.canvas.width * ascii.canvas.height,
      differingPixels: diff,
      differingFraction: s1.length > 0 ? diff / s1.length : 0,
      isFrozen: diff === 0,
    };
  });

  return { label, viewport: { w, h }, ...freezeData };
}

const freeze1 = await sampleFreeze('1280x800', 1280, 800);
const freeze2 = await sampleFreeze('900x1000', 900, 1000);
const freeze3 = await sampleFreeze('back-1280x800', 1280, 800);

// After returning to 1280x800, also do one more freeze check
const freeze4 = await sampleFreeze('back-1280x800-second', 1280, 800);

result.test1D = {
  description: 'After 1280→900→1280 resize cycle, sample glyph canvas twice ~700ms apart; zero differing pixels = frozen renderer',
  samples: [freeze1, freeze2, freeze3, freeze4],
  pass: !freeze1.isFrozen && !freeze2.isFrozen && !freeze3.isFrozen && !freeze4.isFrozen,
  notes: [freeze1, freeze2, freeze3, freeze4].some(s => s.isFrozen)
    ? 'RENDER IS FROZEN after resize — bug confirmed'
    : 'Render loop stays alive after resize cycle',
};
console.log('TEST 1D PASS:', result.test1D.pass);
for (const s of result.test1D.samples) {
  console.log(`  ${s.label}: diff=${s.differingFraction.toFixed(4)} (${s.differingPixels}/${s.totalPixels}), frozen=${s.isFrozen}`);
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST 2: knot centring across sizes (large-component isolation)
// ══════════════════════════════════════════════════════════════════════════════
console.log('\nTEST 2: knot centring at 1920x1080, 390x844, 1600x500');

const test2Viewports = [
  { label: '1920x1080', w: 1920, h: 1080 },
  { label: '390x844', w: 390, h: 844 },
  { label: '1600x500', w: 1600, h: 500 },
];

const test2Results = [];
for (const vp of test2Viewports) {
  await page.setViewportSize({ width: vp.w, height: vp.h });
  await sleep(800);
  await snap(`2-${vp.label.replace('x', '-')}`);

  const agg = await sampleKnotCentroid(page, 12, 500);
  const cxInBounds = agg.avgCx >= 0.48 && agg.avgCx <= 0.52;
  const cyInBounds = agg.avgCy >= 0.48 && agg.avgCy <= 0.52;

  test2Results.push({
    viewport: vp.label,
    cssWidth: vp.w,
    cssHeight: vp.h,
    avgCx: agg.avgCx,
    avgCy: agg.avgCy,
    minCx: agg.minCx,
    maxCx: agg.maxCx,
    minCy: agg.minCy,
    maxCy: agg.maxCy,
    cxRange: agg.cxRange,
    cyRange: agg.cyRange,
    avgPixels: agg.avgPixels,
    avgPixels2: agg.avgPixels2,
    dominant: agg.avgPixels / Math.max(1, agg.avgPixels2),
    samples: agg.samples.map(s => ({
      L60_cx: s['L60_cx'], L60_cy: s['L60_cy'],
      L60_pixels: s['L60_pixels'], L60_secondPixels: s['L60_secondPixels'],
    })),
    cyInBounds,
    pass: cxInBounds,  // primary check: cx within 0.48..0.52
    notes: cxInBounds
      ? `cx=${agg.avgCx.toFixed(4)} within [0.48, 0.52], range=${agg.cxRange.toFixed(4)}`
      : `cx=${agg.avgCx.toFixed(4)} OUTSIDE [0.48, 0.52] — centring bug`,
  });

  console.log(`  ${vp.label}: avgCx=${agg.avgCx.toFixed(4)}, avgCy=${agg.avgCy.toFixed(4)}, pixels=${agg.avgPixels.toFixed(0)}, 2nd=${agg.avgPixels2.toFixed(0)}, span=[${agg.avgSpanX.toFixed(3)},${agg.avgSpanY.toFixed(3)}], cxRange=${agg.cxRange.toFixed(4)}, cyRange=${agg.cyRange.toFixed(4)}`);
}

result.test2 = {
  description: 'Knot centring via largest 4-connected component on downscaled glyph grid; ~12 samples at 500ms intervals; cx must be in [0.48, 0.52]',
  results: test2Results,
  overallPass: test2Results.every(r => r.pass),
  notes: test2Results.every(r => r.pass)
    ? 'All viewports: knot cx within [0.48, 0.52] — centring OK'
    : 'Centring bug detected at one or more viewports',
};
console.log('TEST 2 OVERALL PASS:', result.test2.overallPass);

// ─── Collect console/errors ──────────────────────────────────────────────────
result.consoleMessages = consoleMessages;
result.errors = pageErrors;

// ─── Write report ────────────────────────────────────────────────────────────
writeFileSync(OUT, JSON.stringify(result, null, 2));
console.log(`\nReport written to ${OUT}`);

await browser.close();
