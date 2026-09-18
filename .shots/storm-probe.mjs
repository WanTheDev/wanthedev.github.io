/**
 * Storm-probe: instruments the live ASCII portfolio resize path and measures
 * cost, size-consistency and failure modes for three reported bug hypotheses.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/WanSou/AppData/Roaming/npm/node_modules/omniroute/node_modules/playwright-core/index.js');
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const SHOTS_DIR = 'F:/vibe-projects/wanthedev-github-io/wanthedev.github.io/.shots';
mkdirSync(SHOTS_DIR, { recursive: true });

const RESULTS = {
  instrumentation: {},
  test1: {},
  test2: {},
  test3: {},
  test4: {},
  test5: {},
};

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function launchBrowser() {
  return chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    channel: 'chrome', headless: true,
    args: [
      '--enable-unsafe-swiftshader',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--disable-web-security',
      '--no-sandbox',
    ],
  });
}

async function waitForPortfolio(page, url, waitMs = 1500) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => typeof globalThis.asciiPortfolio !== 'undefined', [], { timeout: 10000 });
  await sleep(waitMs);
}

// Helper to read all probe counters from the page
async function readProbe(page) {
  return await page.evaluate(() => {
    const ap = globalThis.asciiPortfolio;
    return {
      asciiResizeCount: ap.ascii._resizeCount || 0,
      asciiResizeTotalMs: ap.ascii._resizeTotalMs || 0,
      compositeSetSizeCount: ap.composite._setSizeCount || 0,
      compositeSetSizeTotalMs: ap.composite._setSizeTotalMs || 0,
      compositeRendererSetSizeCount: ap.composite.renderer._setSizeCount || 0,
      compositeRendererSetSizeTotalMs: ap.composite.renderer._setSizeTotalMs || 0,
      compositeComposerSetSizeCount: ap.composite.composer._setSizeCount || 0,
      compositeComposerSetSizeTotalMs: ap.composite.composer._setSizeTotalMs || 0,
      compositeComposerRenderCount: ap.composite.composer._renderCount || 0,
      compositeComposerRenderTotalMs: ap.composite.composer._renderTotalMs || 0,
      fxSetSizeCount: ap.fx._setSizeCount || 0,
      fxSetSizeTotalMs: ap.fx._setSizeTotalMs || 0,
      fxComposerSetSizeCount: ap.fx.composer._setSizeCount || 0,
      fxComposerSetSizeTotalMs: ap.fx.composer._setSizeTotalMs || 0,
      fxComposerRenderCount: ap.fx.composer._renderCount || 0,
      fxComposerRenderTotalMs: ap.fx.composer._renderTotalMs || 0,
      rendererSetSizeCount: ap.renderer._setSizeCount || 0,
      rendererSetSizeTotalMs: ap.renderer._setSizeTotalMs || 0,
      asciiRenderCount: ap.ascii._renderCount || 0,
      asciiRenderTotalMs: ap.ascii._renderTotalMs || 0,
      rafCount: window._probeRafCount || 0,
      resizeEventCount: window._probeResizeEventCount || 0,
      contextLost: { ...(window._probeContextLost || {scene:0, composite:0}) },
      contextRestored: { ...(window._probeContextRestored || {scene:0, composite:0}) },
    };
  });
}

// Helper to reset all probe counters
async function resetProbe(page) {
  await page.evaluate(() => {
    const ap = globalThis.asciiPortfolio;
    ap.ascii._resizeCount = 0; ap.ascii._resizeTotalMs = 0;
    ap.composite._setSizeCount = 0; ap.composite._setSizeTotalMs = 0;
    ap.composite.renderer._setSizeCount = 0; ap.composite.renderer._setSizeTotalMs = 0;
    ap.composite.composer._setSizeCount = 0; ap.composite.composer._setSizeTotalMs = 0;
    ap.composite.composer._renderCount = 0; ap.composite.composer._renderTotalMs = 0;
    ap.fx._setSizeCount = 0; ap.fx._setSizeTotalMs = 0;
    ap.fx.composer._setSizeCount = 0; ap.fx.composer._setSizeTotalMs = 0;
    ap.fx.composer._renderCount = 0; ap.fx.composer._renderTotalMs = 0;
    ap.renderer._setSizeCount = 0; ap.renderer._setSizeTotalMs = 0;
    ap.ascii._renderCount = 0; ap.ascii._renderTotalMs = 0;
    window._probeRafCount = 0; window._probeRafTimestamps = [];
    window._probeResizeEventCount = 0;
    window._probeContextLost = { scene: 0, composite: 0 };
    window._probeContextRestored = { scene: 0, composite: 0 };
  });
}

// ─── TEST 1: resize storm ─────────────────────────────────────────────────────
async function test1Storm(page) {
  const label = 'test1';
  RESULTS[label] = {};

  await page.setViewportSize({ width: 1920, height: 1080 });
  await sleep(500);
  await page.evaluate(() => globalThis.asciiPortfolio.resume());
  await sleep(200);

  // Build storm: 120 viewport changes interpolating 1920x1080 -> 900x600 -> back
  const n = 120;
  const stormStart = Date.now();
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const val = Math.sin(t * Math.PI);
    const w = Math.round(1920 + (900 - 1920) * val);
    const h = Math.round(1080 + (600 - 1080) * val);
    await page.setViewportSize({ width: w, height: h });
  }
  const stormWallMs = Date.now() - stormStart;

  await sleep(1200);

  const afterNoSleep = await readProbe(page);
  afterNoSleep.stormWallMs = stormWallMs;
  afterNoSleep.totalResizes = n;

  // Compute max rAF gap
  const maxGapInfo = await page.evaluate(() => {
    const ts = window._probeRafTimestamps || [];
    let maxGap = 0;
    for (let i = 1; i < ts.length; i++) {
      const gap = ts[i] - ts[i-1];
      if (gap > maxGap) maxGap = gap;
    }
    return { maxRafGapMs: maxGap, rafCount: ts.length };
  });
  afterNoSleep.maxRafGapMs = maxGapInfo.maxRafGapMs;

  RESULTS[label].stormNoSleep = afterNoSleep;

  // Repeat with 8ms sleep
  await page.setViewportSize({ width: 1920, height: 1080 });
  await sleep(500);
  await resetProbe(page);

  const stormStart2 = Date.now();
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const val = Math.sin(t * Math.PI);
    const w = Math.round(1920 + (900 - 1920) * val);
    const h = Math.round(1080 + (600 - 1080) * val);
    await page.setViewportSize({ width: w, height: h });
    await sleep(8);
  }
  const stormWallMs2 = Date.now() - stormStart2;
  await sleep(1200);

  const afterWithSleep = await readProbe(page);
  afterWithSleep.stormWallMs = stormWallMs2;
  afterWithSleep.totalResizes = n;

  const maxGapInfo2 = await page.evaluate(() => {
    const ts = window._probeRafTimestamps || [];
    let maxGap = 0;
    for (let i = 1; i < ts.length; i++) {
      const gap = ts[i] - ts[i-1];
      if (gap > maxGap) maxGap = gap;
    }
    return { maxRafGapMs: maxGap, rafCount: ts.length };
  });
  afterWithSleep.maxRafGapMs = maxGapInfo2.maxRafGapMs;

  RESULTS[label].stormWith8msSleep = afterWithSleep;

  // Same-size 10x test
  await page.setViewportSize({ width: 1920, height: 1080 });
  await sleep(200);
  await resetProbe(page);
  for (let i = 0; i < 10; i++) {
    await page.setViewportSize({ width: 1920, height: 1080 });
  }
  await sleep(300);
  const sameSize = await readProbe(page);
  RESULTS[label].sameSizeTenTimes = sameSize;
}

// ─── TEST 2: stretched frames ─────────────────────────────────────────────────
async function test2Stretch(page) {
  const label = 'test2';
  RESULTS[label] = {};

  await page.setViewportSize({ width: 1920, height: 1080 });
  await sleep(500);
  await page.evaluate(() => globalThis.asciiPortfolio.resume());
  await sleep(200);

  let stretchedFrames = 0;
  let worstMismatchPx = 0;
  const samples = [];

  for (let i = 0; i < 50; i++) {
    const t = i / 49;
    const val = Math.sin(t * Math.PI);
    const w = Math.round(1920 + (900 - 1920) * val);
    const h = Math.round(1080 + (600 - 1080) * val);
    await page.setViewportSize({ width: w, height: h });

    if (i % 2 === 0) {
      const snap = await page.evaluate(() => {
        const { ascii, renderer, composite } = globalThis.asciiPortfolio;
        const outputEl = document.querySelector('#ascii-background');
        const dpr = window.devicePixelRatio || 1;
        const attrW = composite.renderer.domElement.width;
        const attrH = composite.renderer.domElement.height;
        const rect = outputEl.getBoundingClientRect();
        const rectW = rect.width * dpr;
        const rectH = rect.height * dpr;
        return {
          attrW, attrH, rectW, rectH,
          mismatchW: Math.abs(attrW - rectW),
          mismatchH: Math.abs(attrH - rectH),
          asciiCanvasW: ascii.canvas.width,
          asciiCanvasH: ascii.canvas.height,
          sceneCanvasW: renderer.domElement.width,
          sceneCanvasH: renderer.domElement.height,
          expectedAsciiW: Math.floor(window.innerWidth * dpr),
          expectedAsciiH: Math.floor(window.innerHeight * dpr),
          columns: ascii.columns,
          rows: ascii.rows,
        };
      });
      const mismatch = Math.max(snap.mismatchW, snap.mismatchH);
      if (mismatch > 1) {
        stretchedFrames++;
        if (mismatch > worstMismatchPx) worstMismatchPx = mismatch;
      }
      samples.push(snap);
    }
    await sleep(3);
  }
  await sleep(800);

  const finalSnap = await page.evaluate(() => {
    const { ascii, renderer, composite } = globalThis.asciiPortfolio;
    const dpr = window.devicePixelRatio || 1;
    return {
      asciiCanvasW: ascii.canvas.width,
      asciiCanvasH: ascii.canvas.height,
      expectedAsciiW: Math.floor(window.innerWidth * dpr),
      expectedAsciiH: Math.floor(window.innerHeight * dpr),
      sceneCanvasW: renderer.domElement.width,
      sceneCanvasH: renderer.domElement.height,
      compositeAttrW: composite.renderer.domElement.width,
      compositeAttrH: composite.renderer.domElement.height,
      columns: ascii.columns,
      rows: ascii.rows,
    };
  });

  RESULTS[label] = {
    samples,
    stretchedFrameCount: stretchedFrames,
    worstMismatchPx,
    finalSnapshot: finalSnap,
  };
}

// ─── TEST 3: DPR-only change ──────────────────────────────────────────────────
async function test3DprChange(page) {
  const label = 'test3';
  RESULTS[label] = {};

  await page.setViewportSize({ width: 1920, height: 1080 });
  await sleep(500);
  await page.evaluate(() => globalThis.asciiPortfolio.resume());
  await sleep(300);
  await resetProbe(page);

  const cdp = await page.context().newCDPSession(page);

  const before = await page.evaluate(() => {
    const { ascii } = globalThis.asciiPortfolio;
    return {
      dpr: window.devicePixelRatio,
      asciiCanvasW: ascii.canvas.width,
      asciiCanvasH: ascii.canvas.height,
      columns: ascii.columns,
      rows: ascii.rows,
    };
  });
  RESULTS[label].before = before;

  // DPR = 2
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1920, height: 1080,
    deviceScaleFactor: 2,
    mobile: false,
  });
  await sleep(800);

  const afterDpr2 = await page.evaluate(() => {
    const { ascii } = globalThis.asciiPortfolio;
    const outputEl = document.querySelector('#ascii-background');
    return {
      dpr: window.devicePixelRatio,
      asciiCanvasW: ascii.canvas.width,
      asciiCanvasH: ascii.canvas.height,
      columns: ascii.columns,
      rows: ascii.rows,
      compositeAttrW: outputEl.width,
      compositeAttrH: outputEl.height,
      resizeEventCount: window._probeResizeEventCount || 0,
      expectedCanvasW: Math.floor(1920 * Math.min(2, 1.5)),
      expectedCanvasH: Math.floor(1080 * Math.min(2, 1.5)),
    };
  });
  RESULTS[label].afterDpr2 = afterDpr2;
  RESULTS[label].dpr2Stretched = Math.abs(afterDpr2.compositeAttrW - 1920 * 2) + Math.abs(afterDpr2.compositeAttrH - 1080 * 2) > 1;

  // DPR = 1.5
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1920, height: 1080,
    deviceScaleFactor: 1.5,
    mobile: false,
  });
  await sleep(800);
  const afterDpr15 = await page.evaluate(() => {
    const { ascii } = globalThis.asciiPortfolio;
    return {
      dpr: window.devicePixelRatio,
      asciiCanvasW: ascii.canvas.width,
      asciiCanvasH: ascii.canvas.height,
      columns: ascii.columns,
      rows: ascii.rows,
      resizeEventCount: window._probeResizeEventCount || 0,
    };
  });
  RESULTS[label].afterDpr15 = afterDpr15;

  // DPR = 0.75
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1920, height: 1080,
    deviceScaleFactor: 0.75,
    mobile: false,
  });
  await sleep(800);
  const afterDpr075 = await page.evaluate(() => {
    const { ascii } = globalThis.asciiPortfolio;
    return {
      dpr: window.devicePixelRatio,
      asciiCanvasW: ascii.canvas.width,
      asciiCanvasH: ascii.canvas.height,
      columns: ascii.columns,
      rows: ascii.rows,
      resizeEventCount: window._probeResizeEventCount || 0,
    };
  });
  RESULTS[label].afterDpr075 = afterDpr075;

  // Restore DPR = 1
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1920, height: 1080,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await sleep(500);
  await cdp.detach();
}

// ─── TEST 4: context loss ─────────────────────────────────────────────────────
async function test4ContextLoss(page) {
  const label = 'test4';
  RESULTS[label] = {};

  await page.setViewportSize({ width: 1920, height: 1080 });
  await sleep(500);
  await page.evaluate(() => globalThis.asciiPortfolio.resume());
  await sleep(300);

  // Check if WEBGL_lose_context is available
  const extAvailable = await page.evaluate(() => {
    const { composite, renderer } = globalThis.asciiPortfolio;
    const compGl = composite.renderer.domElement.getContext('webgl');
    const sceneGl = renderer.domElement.getContext('webgl');
    return {
      compositeHasExt: !!(compGl && compGl.getExtension('WEBGL_lose_context')),
      sceneHasExt: !!(sceneGl && sceneGl.getExtension('WEBGL_lose_context')),
    };
  });
  RESULTS[label].extensionsAvailable = extAvailable;

  if (!extAvailable.compositeHasExt || !extAvailable.sceneHasExt) {
    RESULTS[label].skipped = true;
    RESULTS[label].reason = 'WEBGL_lose_context extension not available on one or both contexts (SwiftShader/headless limitation)';
    return;
  }

  const hashBefore = await page.evaluate(() => {
    const { composite } = globalThis.asciiPortfolio;
    const el = composite.renderer.domElement;
    const ctx = el.getContext('2d');
    if (!ctx) return null;
    const w = el.width;
    const h = el.height;
    try {
      const data = ctx.getImageData(0, 0, w, h).data;
      let sum = 0;
      for (let i = 0; i < data.length; i += 100) sum += data[i] + data[i+1] + data[i+2];
      return sum;
    } catch(e) { return null; }
  });
  RESULTS[label].hashBefore = hashBefore;

  // Lose COMPOSITE context
  const lostComposite = await page.evaluate(() => {
    const { composite } = globalThis.asciiPortfolio;
    const gl = composite.renderer.domElement.getContext('webgl');
    const ext = gl.getExtension('WEBGL_lose_context');
    ext.loseContext();
    return { lost: true };
  });
  RESULTS[label].loseComposite = lostComposite;

  await sleep(1500);

  const duringLoss = await page.evaluate(() => {
    const { composite } = globalThis.asciiPortfolio;
    const el = composite.renderer.domElement;
    const ctx = el.getContext('2d');
    if (!ctx) return { alive: false, reason: 'no 2d context' };
    try {
      const w = Math.min(el.width, 10);
      const h = Math.min(el.height, 10);
      const data = ctx.getImageData(0, 0, w, h).data;
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      return { alive: true, pixelSum: sum, rafCount: window._probeRafCount || 0 };
    } catch(e) {
      return { alive: false, reason: e.message, rafCount: window._probeRafCount || 0 };
    }
  });
  RESULTS[label].duringCompositeLoss = duringLoss;

  // Restore composite context
  const restoredComposite = await page.evaluate(() => {
    const { composite } = globalThis.asciiPortfolio;
    const gl = composite.renderer.domElement.getContext('webgl');
    const ext = gl.getExtension('WEBGL_lose_context');
    ext.restoreContext();
    return { restored: true };
  });
  RESULTS[label].restoreComposite = restoredComposite;

  await sleep(1000);

  const afterRestore = await page.evaluate(() => {
    const { composite } = globalThis.asciiPortfolio;
    const el = composite.renderer.domElement;
    const ctx = el.getContext('2d');
    if (!ctx) return { alive: false, reason: 'no 2d context' };
    try {
      const w = Math.min(el.width, 10);
      const h = Math.min(el.height, 10);
      const data = ctx.getImageData(0, 0, w, h).data;
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      return { alive: true, pixelSum: sum, rafCount: window._probeRafCount || 0 };
    } catch(e) {
      return { alive: false, reason: e.message, rafCount: window._probeRafCount || 0 };
    }
  });
  RESULTS[label].afterRestoreComposite = afterRestore;

  // Lose SCENE context
  const lostScene = await page.evaluate(() => {
    const { renderer } = globalThis.asciiPortfolio;
    const gl = renderer.domElement.getContext('webgl');
    const ext = gl.getExtension('WEBGL_lose_context');
    ext.loseContext();
    return { lost: true };
  });
  RESULTS[label].loseScene = lostScene;

  await sleep(1500);

  const duringSceneLoss = await page.evaluate(() => {
    const { composite } = globalThis.asciiPortfolio;
    const el = composite.renderer.domElement;
    const ctx = el.getContext('2d');
    if (!ctx) return { alive: false, reason: 'no 2d context' };
    try {
      const w = Math.min(el.width, 10);
      const h = Math.min(el.height, 10);
      const data = ctx.getImageData(0, 0, w, h).data;
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      return { alive: true, pixelSum: sum, rafCount: window._probeRafCount || 0 };
    } catch(e) {
      return { alive: false, reason: e.message, rafCount: window._probeRafCount || 0 };
    }
  });
  RESULTS[label].duringSceneLoss = duringSceneLoss;

  // Restore scene context
  const restoredScene = await page.evaluate(() => {
    const { renderer } = globalThis.asciiPortfolio;
    const gl = renderer.domElement.getContext('webgl');
    const ext = gl.getExtension('WEBGL_lose_context');
    ext.restoreContext();
    return { restored: true };
  });
  RESULTS[label].restoreScene = restoredScene;

  await sleep(1000);

  const afterSceneRestore = await page.evaluate(() => {
    const { composite } = globalThis.asciiPortfolio;
    const el = composite.renderer.domElement;
    const ctx = el.getContext('2d');
    if (!ctx) return { alive: false, reason: 'no 2d context' };
    try {
      const w = Math.min(el.width, 10);
      const h = Math.min(el.height, 10);
      const data = ctx.getImageData(0, 0, w, h).data;
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      return { alive: true, pixelSum: sum, rafCount: window._probeRafCount || 0 };
    } catch(e) {
      return { alive: false, reason: e.message, rafCount: window._probeRafCount || 0 };
    }
  });
  RESULTS[label].afterSceneRestore = afterSceneRestore;

  // Check console errors
  const errors = await page.evaluate(() => {
    const el = document.querySelector('#ascii-background');
    const gl = el ? el.getContext('webgl') : null;
    if (gl) {
      const ext = gl.getExtension('WEBGL_lose_context');
      if (ext && ext.isContextLost()) return { contextStillLost: true };
    }
    return { contextStillLost: false };
  });
  RESULTS[label].contextStatus = errors;
}

// ─── TEST 5: misc edge cases ──────────────────────────────────────────────────
async function test5EdgeCases(page) {
  const label = 'test5';
  RESULTS[label] = {};

  await page.setViewportSize({ width: 1920, height: 1080 });
  await sleep(500);
  await page.evaluate(() => globalThis.asciiPortfolio.resume());
  await sleep(200);
  await resetProbe(page);

  // 5a: Small and extreme viewports
  const smallTests = [
    { w: 200, h: 120, lbl: '200x120' },
    { w: 100, h: 100, lbl: '100x100' },
    { w: 320, h: 180, lbl: '320x180' },
    { w: 3000, h: 400, lbl: '3000x400' },
    { w: 400, h: 3000, lbl: '400x3000' },
  ];

  for (const { w, h, lbl } of smallTests) {
    await page.setViewportSize({ width: w, height: h });
    await sleep(600); // Give more time for resize to complete
    const snap = await page.evaluate(({ lbl }) => {
      const { ascii, renderer, composite, camera } = globalThis.asciiPortfolio;
      return {
        label: lbl,
        winW: window.innerWidth,
        winH: window.innerHeight,
        asciiCanvasW: ascii.canvas.width,
        asciiCanvasH: ascii.canvas.height,
        columns: ascii.columns,
        rows: ascii.rows,
        sceneCanvasW: renderer.domElement.width,
        sceneCanvasH: renderer.domElement.height,
        compositeAttrW: composite.renderer.domElement.width,
        compositeAttrH: composite.renderer.domElement.height,
        cameraAspect: camera.aspect,
        rafCount: window._probeRafCount || 0,
      };
    }, { lbl });
    RESULTS[label].smallViewports = RESULTS[label].smallViewports || [];
    RESULTS[label].smallViewports.push(snap);
  }

  // Reset
  await page.setViewportSize({ width: 1920, height: 1080 });
  await sleep(300);
  await resetProbe(page);

  // 5b: Resize while hidden
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { get() { return true; }, configurable: true });
    window.dispatchEvent(new Event('visibilitychange'));
  });
  await sleep(200);

  const beforeHidden = await page.evaluate(() => ({
    rafCountBefore: window._probeRafCount || 0,
  }));

  await page.setViewportSize({ width: 800, height: 600 });
  await sleep(400);

  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { get() { return false; }, configurable: true });
    window.dispatchEvent(new Event('visibilitychange'));
  });
  await sleep(400);

  const afterHidden = await page.evaluate(() => ({
    rafCountAfter: window._probeRafCount || 0,
    asciiCanvasW: globalThis.asciiPortfolio.ascii.canvas.width,
    asciiCanvasH: globalThis.asciiPortfolio.ascii.canvas.height,
  }));
  RESULTS[label].hiddenResize = { before: beforeHidden, after: afterHidden };

  // 5c: 30 synthetic resize events in one frame
  await page.setViewportSize({ width: 1920, height: 1080 });
  await sleep(300);
  await resetProbe(page);

  const dispatchStart = Date.now();
  for (let i = 0; i < 30; i++) {
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  }
  await sleep(300);
  const dispatchEnd = Date.now();

  const syntheticResult = await page.evaluate(({ start, end }) => {
    const ap = globalThis.asciiPortfolio;
    return {
      wallMs: end - start,
      asciiResizeCount: ap.ascii._resizeCount || 0,
      compositeSetSizeCount: ap.composite._setSizeCount || 0,
      rendererSetSizeCount: ap.renderer._setSizeCount || 0,
      resizeEventCount: window._probeResizeEventCount || 0,
      asciiCanvasW: ap.ascii.canvas.width,
      asciiCanvasH: ap.ascii.canvas.height,
    };
  }, { start: dispatchStart, end: dispatchEnd });
  RESULTS[label].syntheticDispatch = syntheticResult;
}

// ─── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })).newPage();

  console.log('Loading page...');
  await waitForPortfolio(page, 'http://localhost:5199');

  console.log('Installing instrumentation...');
  await page.evaluate(() => {
    const ap = globalThis.asciiPortfolio;
    const ascii = ap.ascii;
    const composite = ap.composite;
    const fx = ap.fx;
    const renderer = ap.renderer;

    // Store original methods and init counters
    ascii._origResize = ascii.resize;
    ascii._resizeCount = 0; ascii._resizeTotalMs = 0;
    ascii._origRender = ascii.render;
    ascii._renderCount = 0; ascii._renderTotalMs = 0;

    composite._origSetSize = composite.setSize;
    composite._setSizeCount = 0; composite._setSizeTotalMs = 0;

    composite.renderer._origSetSize = composite.renderer.setSize;
    composite.renderer._setSizeCount = 0; composite.renderer._setSizeTotalMs = 0;

    composite.composer._origSetSize = composite.composer.setSize;
    composite.composer._setSizeCount = 0; composite.composer._setSizeTotalMs = 0;
    composite.composer._origRender = composite.composer.render;
    composite.composer._renderCount = 0; composite.composer._renderTotalMs = 0;

    fx._origSetSize = fx.setSize;
    fx._setSizeCount = 0; fx._setSizeTotalMs = 0;

    fx.composer._origSetSize = fx.composer.setSize;
    fx.composer._setSizeCount = 0; fx.composer._setSizeTotalMs = 0;
    fx.composer._origRender = fx.composer.render;
    fx.composer._renderCount = 0; fx.composer._renderTotalMs = 0;

    renderer._origSetSize = renderer.setSize;
    renderer._setSizeCount = 0; renderer._setSizeTotalMs = 0;

    // Install wrappers
    ascii.resize = function(w, h, dpr) {
      this._resizeCount++;
      const t0 = performance.now();
      try { return this._origResize(w, h, dpr); }
      finally { this._resizeTotalMs += performance.now() - t0; }
    };
    composite.setSize = function(w, h, dpr) {
      this._setSizeCount++;
      const t0 = performance.now();
      try { return this._origSetSize(w, h, dpr); }
      finally { this._setSizeTotalMs += performance.now() - t0; }
    };
    composite.renderer.setSize = function(w, h, noFlush) {
      this._setSizeCount++;
      const t0 = performance.now();
      try { return this._origSetSize(w, h, noFlush); }
      finally { this._setSizeTotalMs += performance.now() - t0; }
    };
    composite.composer.setSize = function(w, h) {
      this._setSizeCount++;
      const t0 = performance.now();
      try { return this._origSetSize(w, h); }
      finally { this._setSizeTotalMs += performance.now() - t0; }
    };
    composite.composer.render = function() {
      this._renderCount++;
      const t0 = performance.now();
      try { return this._origRender(); }
      finally { this._renderTotalMs += performance.now() - t0; }
    };
    fx.setSize = function(w, h) {
      this._setSizeCount++;
      const t0 = performance.now();
      try { return this._origSetSize(w, h); }
      finally { this._setSizeTotalMs += performance.now() - t0; }
    };
    fx.composer.setSize = function(w, h) {
      this._setSizeCount++;
      const t0 = performance.now();
      try { return this._origSetSize(w, h); }
      finally { this._setSizeTotalMs += performance.now() - t0; }
    };
    fx.composer.render = function() {
      this._renderCount++;
      const t0 = performance.now();
      try { return this._origRender(); }
      finally { this._renderTotalMs += performance.now() - t0; }
    };
    renderer.setSize = function(w, h, noFlush) {
      this._setSizeCount++;
      const t0 = performance.now();
      try { return this._origSetSize(w, h, noFlush); }
      finally { this._setSizeTotalMs += performance.now() - t0; }
    };
    ascii.render = function() {
      this._renderCount++;
      const t0 = performance.now();
      try { return this._origRender(); }
      finally { this._renderTotalMs += performance.now() - t0; }
    };

    // rAF counter
    window._probeRafCount = 0;
    window._probeRafTimestamps = [];
    const origRaf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = function(cb) {
      return origRaf((t) => {
        window._probeRafCount++;
        window._probeRafTimestamps.push(t);
        return cb(t);
      });
    };

    // Context loss/restored counters
    window._probeContextLost = { scene: 0, composite: 0 };
    window._probeContextRestored = { scene: 0, composite: 0 };
    renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); window._probeContextLost.scene++; }, true);
    renderer.domElement.addEventListener('webglcontextrestored', e => { window._probeContextRestored.scene++; }, true);
    composite.renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); window._probeContextLost.composite++; }, true);
    composite.renderer.domElement.addEventListener('webglcontextrestored', e => { window._probeContextRestored.composite++; }, true);

    // Resize event counter
    window._probeResizeEventCount = 0;
    window.addEventListener('resize', () => { window._probeResizeEventCount++; }, true);
  });
  console.log('Instrumentation installed.');
  await sleep(500);

  console.log('\n=== TEST 1: Resize storm ===');
  await test1Storm(page);
  console.log('  Done.');

  console.log('\n=== TEST 2: Stretched frames ===');
  await test2Stretch(page);
  console.log('  Done.');

  console.log('\n=== TEST 3: DPR-only change ===');
  await test3DprChange(page);
  console.log('  Done.');

  console.log('\n=== TEST 4: Context loss ===');
  await test4ContextLoss(page);
  console.log('  Done.');

  console.log('\n=== TEST 5: Edge cases ===');
  await test5EdgeCases(page);
  console.log('  Done.');

  // Capture full-page screenshot at 1280x800
  console.log('\nCapturing storm-final.png at 1280x800...');
  await page.setViewportSize({ width: 1280, height: 800 });
  await sleep(800);
  const screenshotData = await page.screenshot({ type: 'png', fullPage: true });
  writeFileSync(join(SHOTS_DIR, 'storm-final.png'), screenshotData);
  console.log('  Screenshot saved.');

  writeFileSync(join(SHOTS_DIR, 'storm-probe.json'), JSON.stringify(RESULTS, null, 2));
  console.log('Results saved to .shots/storm-probe.json');

  await browser.close();
}

main().catch(err => {
  console.error('Probe failed:', err);
  process.exit(1);
});
