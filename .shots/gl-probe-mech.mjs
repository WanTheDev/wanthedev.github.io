/**
 * Mechanism probe: WHY does a viewport growth emit glCopySubTextureCHROMIUM
 * warnings, and is it an app-level race or a pure compositor artifact?
 *
 * Facts so far:
 *  - steady state (any size)                    -> 0 warnings
 *  - shrink                                     -> 0 warnings
 *  - growth on a FRESH page                     -> 22-39 warnings
 *  - growth on a page that has ALREADY been big -> 0 warnings
 *  - warnings begin ~42ms after the jump and trail for ~2.4s
 *
 * Experiments:
 *  E1  fresh 1280 -> shrink to 100 -> grow back to 1280   ("ever-been-big" cache?)
 *  E2  fresh 700  -> grow 1280 -> shrink 700 -> grow 1280  (repeat on same page)
 *  E3  fresh 700  -> grow 1280, but with a SYNCHRONOUS resize of the composite
 *      canvas installed via an extra 'resize' listener (no rAF coalescing).
 *      If warnings -> 0, the proximate cause is the coalesced-resize gap.
 *  E4  per-warning cadence timing.
 *
 * Output: .shots/gl-probe-mech.json
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/WanSou/AppData/Roaming/npm/node_modules/omniroute/node_modules/playwright-core/index.js');
import { writeFileSync } from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://localhost:5199';
const OUT = '.shots/gl-probe-mech.json';

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-web-security', '--no-sandbox'],
  headless: true,
});

async function loadAt(w, h, opts = {}) {
  const page = await browser.newPage();
  const warnings = [];
  page.on('console', (msg) => {
    if (/GL_INVALID_VALUE|glCopySubTexture/.test(msg.text())) warnings.push({ ts: Date.now(), text: msg.text() });
  });
  await page.setViewportSize({ width: w, height: h });
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForFunction(() => typeof globalThis.asciiPortfolio !== 'undefined', { timeout: 10000 });
  await page.waitForTimeout(1200);
  if (opts.syncResize) {
    await page.evaluate(() => {
      // Close the coalesced-resize gap: resize the composite canvas's GL
      // drawing buffer SYNCHRONOUSLY at 'resize' time, ahead of the app's
      // coalesced rAF pass. Diagnostic only — does not touch app state.
      const { composite } = globalThis.asciiPortfolio;
      window.__syncResize = (e) => {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        try {
          composite.setSize(window.innerWidth, window.innerHeight, dpr);
        } catch (_) { /* app may be mid-resize; ignore */ }
      };
      window.addEventListener('resize', window.__syncResize, true);
    });
  }
  return { page, warnings };
}

const results = [];

// E1: ever-been-big cache test
{
  const { page, warnings } = await loadAt(1280, 800);
  const t = [];
  await page.setViewportSize({ width: 100, height: 800 });
  await page.waitForTimeout(800);
  const b1 = warnings.length;
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(2500);
  t.push({ phase: 'shrink 1280->100', warnings: b1 }, { phase: 'grow 100->1280', warnings: warnings.length - b1 });
  results.push({ E1: t });
  console.log('E1 (ever-been-big):', JSON.stringify(t));
  await page.close();
}

// E2: repeat on a page that started small
{
  const { page, warnings } = await loadAt(700, 800);
  const t = [];
  for (let i = 0; i < 3; i++) {
    const b = warnings.length;
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(1200);
    t.push({ cycle: i, phase: 'grow', warnings: warnings.length - b });
    const b2 = warnings.length;
    await page.setViewportSize({ width: 700, height: 800 });
    await page.waitForTimeout(800);
    t.push({ cycle: i, phase: 'shrink', warnings: warnings.length - b2 });
  }
  results.push({ E2: t });
  console.log('E2 (repeat from small start):', JSON.stringify(t));
  await page.close();
}

// E3: synchronous composite resize closes the gap?
{
  const { page, warnings } = await loadAt(700, 800, { syncResize: true });
  const before = warnings.length;
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(2500);
  results.push({ E3: { syncResize: true, warnings: warnings.length - before } });
  console.log('E3 (synchronous composite resize):', warnings.length - before);
  await page.close();
}

// E3b: control — same as E3 without the sync resize, to compare against E2 cycle 0
{
  const { page, warnings } = await loadAt(700, 800);
  const before = warnings.length;
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(2500);
  results.push({ E3b: { syncResize: false, warnings: warnings.length - before } });
  console.log('E3b (control, no sync resize):', warnings.length - before);
  await page.close();
}

// E4: cadence
{
  const { page, warnings } = await loadAt(700, 800);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(3000);
  const ts = warnings.map((w) => w.ts);
  const deltas = ts.slice(1).map((t, i) => t - ts[i]);
  const sorted = [...deltas].sort((a, b) => a - b);
  results.push({
    E4: {
      count: ts.length,
      spanMs: ts.length ? ts[ts.length - 1] - ts[0] : 0,
      medianGapMs: sorted.length ? sorted[Math.floor(sorted.length / 2)] : null,
      minGapMs: sorted[0] ?? null,
      maxGapMs: sorted[sorted.length - 1] ?? null,
      firstGaps: deltas.slice(0, 12),
    },
  });
  console.log('E4 (cadence):', JSON.stringify(results[results.length - 1].E4));
  await page.close();
}

await browser.close();
writeFileSync(OUT, JSON.stringify(results, null, 2));
console.log(`\nReport: ${OUT}`);
