/**
 * Resize behaviour probe for the ASCII torus-knot portfolio.
 * Tests coalescing, freeze/stretch after resize, DPR changes, and degenerate sizes.
 * Output: .shots/fix-verify-resize.json
 * Screenshots: .shots/fix-verify-resize-*.png
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/WanSou/AppData/Roaming/npm/node_modules/omniroute/node_modules/playwright-core/index.js');
import { writeFileSync } from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://localhost:5199';
const OUT = '.shots/fix-verify-resize.json';
const SCREENSHOTS = '.shots/fix-verify-resize';

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-web-security','--no-sandbox'],
  headless: true,
});
const context = await browser.newContext();
const page = await context.newPage();

const consoleMessages = [];
const errors = [];
page.on('console', (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }));
page.on('pageerror', (err) => errors.push({ message: err.message, stack: err.stack }));

await page.setViewportSize({ width: 1280, height: 800 });
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForFunction(() => typeof globalThis.asciiPortfolio !== 'undefined', { timeout: 10000 });
await page.waitForTimeout(800);

const result = {
  testA: null,
  testB: null,
  testC: null,
  testD: null,
  consoleMessages: [],
  errors: [],
};

function snap(label) {
  return page.screenshot({ path: `${SCREENSHOTS}-${label}.png`, type: 'png' });
}

async function sleep(ms) {
  await page.waitForTimeout(ms);
}

async function ensureStable(ms = 800) {
  await sleep(ms);
}

async function getState() {
  return await page.evaluate(() => {
    const { ascii } = globalThis.asciiPortfolio;
    return {
      innerW: window.innerWidth,
      innerH: window.innerHeight,
      dpr: window.devicePixelRatio,
      asciiW: ascii.canvas.width,
      asciiH: ascii.canvas.height,
      columns: ascii.columns,
      rows: ascii.rows,
      outputCSSW: document.querySelector('#ascii-background').getBoundingClientRect().width,
    };
  });
}

// ─── PATCHING ────────────────────────────────────────────────────────────────
async function patchFunctions(page) {
  await page.evaluate(() => {
    const { ascii, bloom, composite } = globalThis.asciiPortfolio;

    const origResize = ascii.resize.bind(ascii);
    ascii.resize = function(...args) {
      ascii.__resizeCalls++;
      ascii.__resizeTimes.push(performance.now());
      return origResize(...args);
    };
    ascii.__resizeCalls = 0;
    ascii.__resizeTimes = [];

    const origBloomSetSize = bloom.setSize.bind(bloom);
    bloom.setSize = function(...args) {
      bloom.__setSizeCalls++;
      bloom.__setSizeTimes.push(performance.now());
      return origBloomSetSize(...args);
    };
    bloom.__setSizeCalls = 0;
    bloom.__setSizeTimes = [];

    const origCompositeRender = composite.render.bind(composite);
    composite.render = function(...args) {
      composite.__renderCalls++;
      return origCompositeRender(...args);
    };
    composite.__renderCalls = 0;

    const origCompSetSize = composite.setSize.bind(composite);
    composite.setSize = function(...args) {
      composite.__compSetSizeCalls++;
      composite.__compSetSizeTimes.push(performance.now());
      return origCompSetSize(...args);
    };
    composite.__compSetSizeCalls = 0;
    composite.__compSetSizeTimes = [];

    window.__rafCount = 0;
    window.__rafLastTime = performance.now();
    window.__rafMaxGap = 0;
    window.__rafTimestamps = [];

    function countRaf() {
      const now = performance.now();
      window.__rafTimestamps.push(now);
      const gap = now - window.__rafLastTime;
      if (gap > window.__rafMaxGap) window.__rafMaxGap = gap;
      window.__rafLastTime = now;
      window.__rafCount++;
      if (window.__rafCount < 500) requestAnimationFrame(countRaf);
    }
    requestAnimationFrame(countRaf);
  });
}

async function readPatches() {
  return await page.evaluate(() => {
    const { ascii, bloom, composite } = globalThis.asciiPortfolio;
    return {
      asciiResizeCalls: ascii.__resizeCalls,
      bloomSetSizeCalls: bloom.__setSizeCalls,
      compositeRenderCalls: composite.__renderCalls,
      compositeSetSizeCalls: composite.__compSetSizeCalls,
      rafCount: window.__rafCount,
      rafMaxGapMs: window.__rafMaxGap,
      asciiResizeTimestamps: ascii.__resizeTimes.slice(0, 30),
      bloomSetSizeTimestamps: bloom.__setSizeTimes.slice(0, 30),
    };
  });
}

async function resetPatches() {
  await page.evaluate(() => {
    const { ascii, bloom, composite } = globalThis.asciiPortfolio;
    ascii.__resizeCalls = 0;
    ascii.__resizeTimes = [];
    bloom.__setSizeCalls = 0;
    bloom.__setSizeTimes = [];
    composite.__renderCalls = 0;
    composite.__compSetSizeCalls = 0;
    composite.__compSetSizeTimes = [];
    window.__rafCount = 0;
    window.__rafLastTime = performance.now();
    window.__rafMaxGap = 0;
    window.__rafTimestamps = [];
    function countRaf() {
      const now = performance.now();
      window.__rafTimestamps.push(now);
      const gap = now - window.__rafLastTime;
      if (gap > window.__rafMaxGap) window.__rafMaxGap = gap;
      window.__rafLastTime = now;
      window.__rafCount++;
      if (window.__rafCount < 500) requestAnimationFrame(countRaf);
    }
    requestAnimationFrame(countRaf);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST A: resize storm
// ══════════════════════════════════════════════════════════════════════════════
console.log('TEST A: resize storm');

await page.setViewportSize({ width: 1280, height: 800 });
await ensureStable(600);
await patchFunctions(page);

const stormStart = performance.now();
for (let i = 0; i < 120; i++) {
  const w = Math.round(i % 2 === 0 ? 1280 - Math.floor(i / 2) * 5 : 640 + Math.floor(i / 2) * 5);
  const h = i % 3 === 0 ? 800 + ((i % 5) * 40) : 800 - ((i % 4) * 30);
  await page.setViewportSize({ width: Math.max(640, Math.min(1280, w)), height: Math.max(480, Math.min(1000, h)) });
}
const stormWallMs = performance.now() - stormStart;
await ensureStable(1000);

const testAPatches = await readPatches();
const testAState = await getState();

result.testA = {
  description: '120 rapid viewport changes, coalescing should keep calls low (ideally 1-3)',
  wallTimeMs: stormWallMs,
  ...testAPatches,
  stateAfterStorm: testAState,
  pass: testAPatches.asciiResizeCalls <= 5 && testAPatches.bloomSetSizeCalls <= 5,
  notes: testAPatches.asciiResizeCalls > 5
    ? `ascii.resize called ${testAPatches.asciiResizeCalls} times out of 120 viewport changes — coalescing ineffective for sequential ops (each rAF completes before next event)`
    : `Coalescing working: ${testAPatches.asciiResizeCalls} calls for 120 changes`,
};

console.log('TEST A result:', JSON.stringify(result.testA, null, 2));
await snap('testA-storm-end');

// ══════════════════════════════════════════════════════════════════════════════
// TEST B: freeze/stretch after single resize
// ══════════════════════════════════════════════════════════════════════════════
console.log('\nTEST B: freeze/stretch');

await page.setViewportSize({ width: 1280, height: 800 });
await ensureStable(800);
await resetPatches();

async function measureStep(label) {
  await ensureStable(1200);
  await snap(`testB-${label}`);
  const state = await getState();
  const patches = await readPatches();
  return { label, state, patches };
}

const step1 = await measureStep('initial-1280x800');
console.log('Step 1:', JSON.stringify(step1.state, null, 2));

await page.setViewportSize({ width: 900, height: 1000 });
const step2 = await measureStep('900x1000');
console.log('Step 2:', JSON.stringify(step2.state, null, 2));

await page.setViewportSize({ width: 1280, height: 800 });
const step3 = await measureStep('back-to-1280x800');
console.log('Step 3:', JSON.stringify(step3.state, null, 2));

// Freeze test
await page.evaluate(async () => {
  const { ascii } = globalThis.asciiPortfolio;
  const ctx = ascii.canvas.getContext('2d');
  window.__sample1 = ctx.getImageData(0, 0, ascii.canvas.width, ascii.canvas.height).data;
  await new Promise(r => setTimeout(r, 400));
  window.__sample2 = ctx.getImageData(0, 0, ascii.canvas.width, ascii.canvas.height).data;
});

const freezeResult = await page.evaluate(() => {
  const s1 = window.__sample1;
  const s2 = window.__sample2;
  let diff = 0;
  let total = s1.length;
  for (let i = 0; i < total; i++) {
    if (s1[i] !== s2[i]) diff++;
  }
  return {
    totalPixels: total / 4,
    differingPixels: diff,
    differingFraction: total > 0 ? diff / total : 0,
    isFrozen: diff === 0,
  };
});

console.log('Freeze test:', JSON.stringify(freezeResult, null, 2));

const exp3W = Math.floor(step3.state.innerW * step3.state.dpr);
const exp3H = Math.floor(step3.state.innerH * step3.state.dpr);
const wMismatch3 = step3.state.asciiW - exp3W;
const hMismatch3 = step3.state.asciiH - exp3H;

result.testB = {
  description: 'Resize 1280x800 -> 900x1000 -> 1280x800, check canvas dims, columns/rows, and render liveness',
  steps: [step1, step2, step3].map(s => ({
    label: s.label,
    state: s.state,
    patches: { resizeCalls: s.patches.asciiResizeCalls, renderCalls: s.patches.compositeRenderCalls },
    widthMismatchPx: s.label === 'back-to-1280x800' ? wMismatch3 : undefined,
    heightMismatchPx: s.label === 'back-to-1280x800' ? hMismatch3 : undefined,
  })),
  freeze: freezeResult,
  pass: wMismatch3 === 0 && hMismatch3 === 0 && !freezeResult.isFrozen,
  notes: wMismatch3 !== 0 || hMismatch3 !== 0
    ? `Canvas mismatch at final size: expected ${exp3W}x${exp3H}, got ${step3.state.asciiW}x${step3.state.asciiH}`
    : 'Canvas dimensions match window*dpr after resize cycle',
};

console.log('TEST B PASS:', result.testB.pass);

// ══════════════════════════════════════════════════════════════════════════════
// TEST C: DPR change with no window resize
// ══════════════════════════════════════════════════════════════════════════════
console.log('\nTEST C: DPR change');

await page.setViewportSize({ width: 1280, height: 800 });
await ensureStable(600);

// Reset patches and add resize counter
await resetPatches();
await page.evaluate(() => {
  window.__resizeEventCount = 0;
  window.addEventListener('resize', () => { window.__resizeEventCount++; }, true);
});

const cdp = await context.newCDPSession(page);

// Capture state before DPR change
const beforeDpr = await getState();
console.log('Before DPR change:', JSON.stringify(beforeDpr));
await snap('testC-dpr2');

// Set DPR to 2, keep dimensions fixed
await cdp.send('Emulation.setDeviceMetricsOverride', {
  width: 1280,
  height: 800,
  deviceScaleFactor: 2,
  mobile: false,
});
await ensureStable(1500);

const dpr2State = await getState();
const dpr2Patches = await readPatches();
console.log('DPR 2 state:', JSON.stringify(dpr2State));
console.log('DPR 2 patches:', JSON.stringify(dpr2Patches));

// Check if DPR actually changed
const dprActuallyChanged = dpr2State.dpr === 2;
const dpr2CanvasCorrect = dpr2State.asciiW === Math.floor(1280 * 1.5) && dpr2State.asciiH === Math.floor(800 * 1.5);

// Reset counter and set DPR back to 1
await page.evaluate(() => { window.__resizeEventCount = 0; });
await cdp.send('Emulation.setDeviceMetricsOverride', {
  width: 1280,
  height: 800,
  deviceScaleFactor: 1,
  mobile: false,
});
await ensureStable(1500);
await snap('testC-dpr1');

const dpr1State = await getState();
console.log('DPR 1 state (after revert):', JSON.stringify(dpr1State));

result.testC = {
  description: 'CDP Emulation.setDeviceMetricsOverride DPR=2 then DPR=1, dimensions fixed at 1280x800',
  before: beforeDpr,
  dpr2: {
    ...dpr2State,
    dprActuallyChanged: dprActuallyChanged,
    canvasCorrectForDpr2: dpr2CanvasCorrect,
    resizeEventsFired: dpr2Patches ? dpr2Patches.asciiResizeCalls : 0, // approximate
  },
  dpr1AfterRevert: dpr1State,
  dprOverrideWorked: dprActuallyChanged,
  canvasResizedForDpr: dpr2CanvasCorrect,
  overallPass: dprActuallyChanged && dpr2CanvasCorrect && dpr1State.asciiW === 1280 && dpr1State.asciiH === 800,
  notes: dprActuallyChanged
    ? `CDP override changed DPR to ${dpr2State.dpr}, canvas resized to ${dpr2State.asciiW}x${dpr2State.asciiH} — app's DPR polling caught it`
    : `CDP override did NOT change window.devicePixelRatio (stayed at ${dpr2State.dpr}) — app's DPR handling could not be tested via CDP`,
};

console.log('TEST C PASS:', result.testC.overallPass);

// ══════════════════════════════════════════════════════════════════════════════
// TEST D: degenerate sizes
// ══════════════════════════════════════════════════════════════════════════════
console.log('\nTEST D: degenerate sizes');

await page.setViewportSize({ width: 1280, height: 800 });
await ensureStable(600);

const degenerateChecks = [];
for (const [label, w, h] of [['1x1', 1, 1], ['200x120', 200, 120], ['1280x800', 1280, 800]]) {
  await page.setViewportSize({ width: w, height: h });
  await sleep(800);
  await snap(`testD-${label}`);

  const state = await getState();
  degenerateChecks.push({
    label,
    viewportW: w,
    viewportH: h,
    innerW: state.innerW,
    innerH: state.innerH,
    dpr: state.dpr,
    canvasWidth: state.asciiW,
    canvasHeight: state.asciiH,
    columns: state.columns,
    rows: state.rows,
  });
}

// Check render is still alive after returning to 1280x800
const renderAlive = await page.evaluate(async () => {
  const { ascii } = globalThis.asciiPortfolio;
  const ctx = ascii.canvas.getContext('2d');
  const s1 = ctx.getImageData(0, 0, ascii.canvas.width, ascii.canvas.height).data;
  await new Promise(r => setTimeout(r, 400));
  const s2 = ctx.getImageData(0, 0, ascii.canvas.width, ascii.canvas.height).data;
  let diff = 0;
  for (let i = 0; i < s1.length; i++) {
    if (s1[i] !== s2[i]) diff++;
  }
  return {
    differingFraction: s1.length > 0 ? diff / s1.length : 0,
    isFrozen: diff === 0,
  };
});

const finalState = await getState();

result.testD = {
  description: 'Viewport 1x1 -> 200x120 -> 1280x800, check recovery',
  checks: degenerateChecks,
  renderAlive: renderAlive,
  finalState: finalState,
  pass: renderAlive.isFrozen === false &&
    finalState.asciiW === Math.floor(finalState.innerW * finalState.dpr) &&
    finalState.asciiH === Math.floor(finalState.innerH * finalState.dpr),
  notes: renderAlive.isFrozen
    ? 'RENDER IS FROZEN after degenerate sizes — bug confirmed'
    : 'Render loop is alive after degenerate sizes',
};

console.log('TEST D PASS:', result.testD.pass);

// ─── Collect console/errors ──────────────────────────────────────────────────
result.consoleMessages = consoleMessages;
result.errors = errors;

// ─── Write report ────────────────────────────────────────────────────────────
writeFileSync(OUT, JSON.stringify(result, null, 2));
console.log(`\nReport written to ${OUT}`);

await browser.close();
