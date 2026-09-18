/**
 * GL_INVALID_VALUE glCopySubTextureCHROMIUM probe.
 * Determines exactly when the warning fires across 7 viewport scenarios.
 * Output: .shots/gl-probe.json
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/WanSou/AppData/Roaming/npm/node_modules/omniroute/node_modules/playwright-core/index.js');
import { writeFileSync } from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://localhost:5199';
const OUT = '.shots/gl-probe.json';

const scenarios = [
  { id: 'S1', label: '1920x1080 steady 6s',       viewport: { width: 1920, height: 1080 }, action: 'idle', idleMs: 6000 },
  { id: 'S2', label: '1280x800 steady 6s',        viewport: { width: 1280, height: 800 }, action: 'idle', idleMs: 6000 },
  {
    id: 'S3', label: '1280x800 resize storm 30 steps',
    viewport: { width: 1280, height: 800 },
    action: 'storm',
    steps: (() => {
      const vals = [];
      let w = 1280;
      for (let i = 0; i < 15; i++) { w -= 60; if (w < 700) w = 700; vals.push(w); }
      for (let i = 0; i < 15; i++) { w += 60; if (w > 1280) w = 1280; vals.push(w); }
      return vals;
    })(),
    idleMs: 3000,
  },
  { id: 'S4', label: '400x3000 extreme portrait',  viewport: { width: 400, height: 3000 }, action: 'idle', idleMs: 6000 },
  { id: 'S5', label: '3000x400 extreme landscape', viewport: { width: 3000, height: 400 }, action: 'idle', idleMs: 6000 },
  {
    id: 'S6', label: '1x1 -> 1280x800',
    viewport: { width: 1, height: 1 },
    action: 'jump',
    idleMs: 3000,
    jumpTo: { width: 1280, height: 800 },
    jumpAfterMs: 3000,
  },
  {
    id: 'S7', label: '1280x800 DPR=2 via CDP',
    viewport: { width: 1280, height: 800 },
    action: 'dpr2',
    idleMs: 6000,
  },
];

async function runScenario(sc, browser) {
  const page = await browser.newPage();
  const cdp = await page.context().newCDPSession(page);

  const glWarnings = [];
  const otherWarnings = [];
  const errors = [];

  page.on('console', (msg) => {
    const text = msg.text();
    const type = msg.type();
    if (/GL_INVALID_VALUE|glCopySubTexture/.test(text)) {
      glWarnings.push({ ts: Date.now(), type, text });
    } else if (type === 'warning') {
      otherWarnings.push({ ts: Date.now(), text });
    }
  });
  page.on('pageerror', (err) => errors.push({ message: err.message, stack: err.stack }));

  // S7: apply DPR override BEFORE navigation
  if (sc.action === 'dpr2') {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: sc.viewport.width,
      height: sc.viewport.height,
      deviceScaleFactor: 2,
      mobile: false,
    });
  }

  await page.setViewportSize(sc.viewport);
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForFunction(() => typeof globalThis.asciiPortfolio !== 'undefined', { timeout: 10000 });
  await page.waitForTimeout(500); // let first frame render

  // S3: resize storm
  if (sc.action === 'storm') {
    for (const w of sc.steps) {
      await page.setViewportSize({ width: w, height: 800 });
      await page.waitForTimeout(80); // small delay between steps
    }
    await page.waitForTimeout(sc.idleMs);
  }

  // S6: jump from 1x1 to 1280x800
  if (sc.action === 'jump') {
    await page.waitForTimeout(sc.jumpAfterMs);
    await page.setViewportSize(sc.jumpTo);
    await page.waitForTimeout(sc.idleMs);
  }

  // S1/S2/S4/S5/S7: just idle
  if (sc.action === 'idle' || sc.action === 'dpr2') {
    await page.waitForTimeout(sc.idleMs);
  }

  // Read state
  const state = await page.evaluate(() => {
    const { ascii, bloom, composite, camera, renderer, fx } = globalThis.asciiPortfolio;
    const ctx = ascii.canvas.getContext('2d');
    const w = ascii.canvas.width;
    const h = ascii.canvas.height;
    let inkPixels = 0;
    try {
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const lum = (d[i] * 0.2126 + d[i + 1] * 0.7152 + d[i + 2] * 0.0722);
        if (lum > 8) inkPixels++;
      }
    } catch (e) {
      inkPixels = -1; // read failed
    }
    return {
      innerW: window.innerWidth,
      innerH: window.innerHeight,
      dpr: window.devicePixelRatio,
      asciiW: ascii.canvas.width,
      asciiH: ascii.canvas.height,
      asciiColumns: ascii.columns,
      asciiRows: ascii.rows,
      bloomPassExists: !!bloom,
      bloomRendererPixelRatio: composite.renderer.getPixelRatio(),
      compositeRendererPixelRatio: composite.renderer.getPixelRatio(),
      fxComposerReadW: fx.composer.readBuffer?.width ?? null,
      fxComposerReadH: fx.composer.readBuffer?.height ?? null,
      compositeComposerReadW: composite.composer.readBuffer?.width ?? null,
      compositeComposerReadH: composite.composer.readBuffer?.height ?? null,
      compositeComposerWidth: composite.composer.width ?? null,
      compositeComposerHeight: composite.composer.height ?? null,
      sceneFxW: fx.composer.width ?? null,
      sceneFxH: fx.composer.height ?? null,
      rendererDrawingBufferW: renderer.domElement.width,
      rendererDrawingBufferH: renderer.domElement.height,
      bloomOutputW: composite.renderer.domElement.width,
      bloomOutputH: composite.renderer.domElement.height,
      bloomTextureW: composite.texture?.image?.width ?? null,
      bloomTextureH: composite.texture?.image?.height ?? null,
      inkPixels,
      totalPixels: w * h,
    };
  });

  // S7: confirm DPR
  let s7Dpr = null;
  let s7CanvasW = null;
  if (sc.action === 'dpr2') {
    s7Dpr = state.dpr;
    s7CanvasW = state.asciiW;
  }

  await page.close();
  try { await cdp.detach(); } catch (_) { /* page already closed */ }

  return {
    scenario: sc.id,
    label: sc.label,
    viewport: sc.viewport,
    warnings: glWarnings.length,
    warningDetails: glWarnings,
    otherWarnings: otherWarnings.length,
    errors: errors.length,
    inkPixels: state.inkPixels,
    totalPixels: state.totalPixels,
    hasInk: state.inkPixels > 0,
    state,
    s7Dpr,
    s7CanvasW,
  };
}

async function main() {
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-web-security', '--no-sandbox'],
    headless: true,
  });

  const results = [];
  for (const sc of scenarios) {
    console.log(`Running ${sc.id}: ${sc.label}`);
    const r = await runScenario(sc, browser);
    results.push(r);
    console.log(`  warnings=${r.warnings} otherWarnings=${r.otherWarnings} errors=${r.errors} ink=${r.inkPixels}/${r.totalPixels}`);
  }

  await browser.close();

  const report = {
    summary: results.map((r) => ({
      scenario: r.scenario,
      label: r.label,
      viewport: r.viewport,
      warnings: r.warnings,
      otherWarnings: r.otherWarnings,
      errors: r.errors,
      inkPixels: r.inkPixels,
      totalPixels: r.totalPixels,
      hasInk: r.hasInk,
    })),
    details: results,
  };

  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(`\nReport written to ${OUT}`);

  // Print summary table
  console.log('\n=== SUMMARY TABLE ===');
  console.log('Scenario | Viewport     | Warnings | OtherWarn | Errors | InkPixels | HasInk');
  console.log('---------|-------------|----------|-----------|--------|-----------|-------');
  for (const r of results) {
    console.log(
      `${r.scenario.padEnd(8)} | ${(r.viewport.width + 'x' + r.viewport.height).padEnd(12)} | ${String(r.warnings).padEnd(8)} | ${String(r.otherWarnings).padEnd(9)} | ${String(r.errors).padEnd(6)} | ${String(r.inkPixels).padEnd(9)} | ${r.hasInk}`
    );
  }

  // Sub-question answers
  const s1 = results.find((r) => r.scenario === 'S1');
  const s2 = results.find((r) => r.scenario === 'S2');
  const s3 = results.find((r) => r.scenario === 'S3');
  const s4 = results.find((r) => r.scenario === 'S4');
  const s5 = results.find((r) => r.scenario === 'S5');
  const s6 = results.find((r) => r.scenario === 'S6');
  const s7 = results.find((r) => r.scenario === 'S7');

  console.log('\n=== SUB-QUESTION A ===');
  console.log(`S1 (1920x1080 steady): warnings=${s1.warnings} — ${s1.warnings > 0 ? 'YES' : 'NO'}`);
  console.log(`S2 (1280x800 steady):  warnings=${s2.warnings} — ${s2.warnings > 0 ? 'YES' : 'NO'}`);

  console.log('\n=== SUB-QUESTION B ===');
  const baseline = Math.max(s1.warnings, s2.warnings);
  console.log(`Baseline (S1/S2 no-resize): ${baseline}`);
  console.log(`S3 (resize storm):          ${s3.warnings} — ${s3.warnings > baseline ? 'CORRELATES WITH RESIZE' : 'NO RESIZE CORRELATION'}`);
  console.log(`S4 (extreme portrait):      ${s4.warnings} — ${s4.warnings > 0 ? 'YES (extreme AR)' : 'NO'}`);
  console.log(`S5 (extreme landscape):     ${s5.warnings} — ${s5.warnings > 0 ? 'YES (extreme AR)' : 'NO'}`);
  console.log(`S6 (1x1->1280x800):         ${s6.warnings} — ${s6.warnings > 0 ? 'YES (small size)' : 'NO'}`);

  console.log('\n=== SUB-QUESTION C ===');
  console.log('S1 state:', JSON.stringify({
    bloomRendererPR: s1.state.bloomRendererPixelRatio,
    compositeRendererPR: s1.state.compositeRendererPixelRatio,
    sceneRendererPR: s1.state.sceneRendererPixelRatio,
    cameraAspect: s1.state.cameraAspect,
    fxComposerRead: `${s1.state.fxComposerReadW}x${s1.state.fxComposerReadH}`,
    compositeComposerRead: `${s1.state.compositeComposerReadW}x${s1.state.compositeComposerReadH}`,
    compositeComposerSize: `${s1.state.compositeComposerWidth}x${s1.state.compositeComposerHeight}`,
    sceneFxSize: `${s1.state.sceneFxW}x${s1.state.sceneFxH}`,
    rendererDrawingBuffer: `${s1.state.rendererDrawingBufferW}x${s1.state.rendererDrawingBufferH}`,
    bloomOutputSize: `${s1.state.bloomOutputW}x${s1.state.bloomOutputH}`,
    bloomTextureSize: `${s1.state.bloomTextureW}x${s1.state.bloomTextureH}`,
    asciiCanvasSize: `${s1.state.asciiW}x${s1.state.asciiH}`,
    asciiGrid: `${s1.state.asciiColumns}x${s1.state.asciiRows}`,
    innerSize: `${s1.state.innerW}x${s1.state.innerH}`,
    dpr: s1.state.dpr,
  }, null, 2));

  console.log('S3 state:', JSON.stringify({
    bloomRendererPR: s3.state.bloomRendererPixelRatio,
    compositeRendererPR: s3.state.compositeRendererPixelRatio,
    sceneRendererPR: s3.state.sceneRendererPixelRatio,
    cameraAspect: s3.state.cameraAspect,
    fxComposerRead: `${s3.state.fxComposerReadW}x${s3.state.fxComposerReadH}`,
    compositeComposerRead: `${s3.state.compositeComposerReadW}x${s3.state.compositeComposerReadH}`,
    compositeComposerSize: `${s3.state.compositeComposerWidth}x${s3.state.compositeComposerHeight}`,
    sceneFxSize: `${s3.state.sceneFxW}x${s3.state.sceneFxH}`,
    rendererDrawingBuffer: `${s3.state.rendererDrawingBufferW}x${s3.state.rendererDrawingBufferH}`,
    bloomOutputSize: `${s3.state.bloomOutputW}x${s3.state.bloomOutputH}`,
    bloomTextureSize: `${s3.state.bloomTextureW}x${s3.state.bloomTextureH}`,
    asciiCanvasSize: `${s3.state.asciiW}x${s3.state.asciiH}`,
    asciiGrid: `${s3.state.asciiColumns}x${s3.state.asciiRows}`,
    innerSize: `${s3.state.innerW}x${s3.state.innerH}`,
    dpr: s3.state.dpr,
  }, null, 2));

  console.log('S7 DPR check:', { dpr: s7.s7Dpr, asciiCanvasW: s7.s7CanvasW });
  console.log('S7 state:', JSON.stringify({
    bloomRendererPR: s7.state.bloomRendererPixelRatio,
    compositeRendererPR: s7.state.compositeRendererPixelRatio,
    sceneRendererPR: s7.state.sceneRendererPixelRatio,
    cameraAspect: s7.state.cameraAspect,
    compositeComposerRead: `${s7.state.compositeComposerReadW}x${s7.state.compositeComposerReadH}`,
    bloomOutputSize: `${s7.state.bloomOutputW}x${s7.state.bloomOutputH}`,
    bloomTextureSize: `${s7.state.bloomTextureW}x${s7.state.bloomTextureH}`,
    asciiCanvasSize: `${s7.state.asciiW}x${s7.state.asciiH}`,
    innerSize: `${s7.state.innerW}x${s7.state.innerH}`,
    dpr: s7.state.dpr,
  }, null, 2));
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
