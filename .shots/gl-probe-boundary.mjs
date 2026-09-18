/**
 * Boundary tests for the glCopySubTextureCHROMIUM warning.
 *
 * S6c showed: a viewport GROWTH (700x800 -> 1280x800) on a fresh page emits
 * ~39 warnings, while a shrink and steady states emit 0. This script pins the
 * boundary: at what growth magnitude does it start, and does it need a fresh
 * page or also occur on an already-running page?
 *
 * Output: .shots/gl-probe-boundary.json
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/WanSou/AppData/Roaming/npm/node_modules/omniroute/node_modules/playwright-core/index.js');
import { writeFileSync } from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://localhost:5199';
const OUT = '.shots/gl-probe-boundary.json';

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-web-security', '--no-sandbox'],
  headless: true,
});

async function loadAt(w, h) {
  const page = await browser.newPage();
  const warnings = [];
  page.on('console', (msg) => {
    if (/GL_INVALID_VALUE|glCopySubTexture/.test(msg.text())) warnings.push({ ts: Date.now(), text: msg.text() });
  });
  await page.setViewportSize({ width: w, height: h });
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForFunction(() => typeof globalThis.asciiPortfolio !== 'undefined', { timeout: 10000 });
  await page.waitForTimeout(1200);
  return { page, warnings };
}

const results = [];

// ── Growth magnitude ladder, each on a FRESH page ───────────────────────────
const ladder = [
  [100, 800], [200, 800], [300, 800], [400, 800], [500, 800], [700, 800],
  [900, 800], [1100, 800], [1279, 800],
];
for (const [startW, h] of ladder) {
  const { page, warnings } = await loadAt(startW, h);
  const before = warnings.length;
  await page.setViewportSize({ width: 1280, height: h });
  await page.waitForTimeout(2500);
  const after = warnings.length;
  results.push({ test: 'grow', from: `${startW}x${h}`, to: `1280x${h}`, warningsBefore: before, warnings: after - before });
  console.log(`grow ${startW} -> 1280 : warnings=${after - before}`);
  await page.close();
}

// ── Same page, repeated growths (does it repeat?) ───────────────────────────
{
  const { page, warnings } = await loadAt(1280, 800);
  const rep = [];
  for (let i = 0; i < 5; i++) {
    const before = warnings.length;
    await page.setViewportSize({ width: 700, height: 800 });
    await page.waitForTimeout(600);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(900);
    rep.push({ cycle: i, warnings: warnings.length - before });
  }
  results.push({ test: 'repeat-grow-same-page', cycles: rep });
  console.log('repeat grow on same page:', JSON.stringify(rep));
  await page.close();
}

// ── Height-only growth ──────────────────────────────────────────────────────
{
  const { page, warnings } = await loadAt(1280, 400);
  const before = warnings.length;
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(2500);
  results.push({ test: 'grow-height', from: '1280x400', to: '1280x800', warnings: warnings.length - before });
  console.log(`grow height 400 -> 800 : warnings=${warnings.length - before}`);
  await page.close();
}

// ── Growth with browser zoom (DPR>1) — does DPR change the count? ──────────
{
  const page = await browser.newPage();
  const cdp = await page.context().newCDPSession(page);
  const warnings = [];
  page.on('console', (msg) => {
    if (/GL_INVALID_VALUE|glCopySubTexture/.test(msg.text())) warnings.push({ ts: Date.now(), text: msg.text() });
  });
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 700, height: 800, deviceScaleFactor: 2, mobile: false });
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForFunction(() => typeof globalThis.asciiPortfolio !== 'undefined', { timeout: 10000 });
  await page.waitForTimeout(1200);
  const before = warnings.length;
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 2, mobile: false });
  await page.waitForTimeout(2500);
  results.push({ test: 'grow-dpr2', from: '700x800@dpr2', to: '1280x800@dpr2', warnings: warnings.length - before });
  console.log(`grow 700->1280 @ dpr2 : warnings=${warnings.length - before}`);
  try { await cdp.detach(); } catch (_) {}
  await page.close();
}

await browser.close();
writeFileSync(OUT, JSON.stringify(results, null, 2));
console.log(`\nReport: ${OUT}`);
