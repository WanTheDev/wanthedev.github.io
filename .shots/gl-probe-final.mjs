/**
 * Final confirmation: the warning only fires when the growth target EXCEEDS
 * the largest size the page has EVER rendered at (per renderer context).
 *
 * Observed so far:
 *   fresh 1280 -> 100 -> 1280 : 0 warnings  (target 1280 already reached)
 *   fresh 700  -> 1280 -> 700 -> 1280 : 14/15 per growth (target NEW each time)
 *
 * Tests:
 *  F1 fresh 1280x800, idle, NO resize at all (is it ever nonzero at steady state?)
 *  F2 fresh 100x800 -> 1280x800 -> 100 -> 1280 (does the 2nd growth still warn?)
 *  F3 fresh 800x600 -> 900x700 -> 1280x800 (staircase; when does it start/stop?)
 *  F4 ink + liveness at the 1x1 minimum and after recovery, so the warning's
 *     impact on rendering is stated.
 *
 * Output: .shots/gl-probe-final.json
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/WanSou/AppData/Roaming/npm/node_modules/omniroute/node_modules/playwright-core/index.js');
import { writeFileSync } from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://localhost:5199';
const OUT = '.shots/gl-probe-final.json';

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

async function ink(page) {
  return await page.evaluate(() => {
    const { ascii } = globalThis.asciiPortfolio;
    const ctx = ascii.canvas.getContext('2d');
    const w = ascii.canvas.width, h = ascii.canvas.height;
    let ink = 0;
    try {
      const d = ctx.getImageData(0, 0, w, h).data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] * 0.2126 + d[i + 1] * 0.7152 + d[i + 2] * 0.0722 > 8) ink++;
      }
    } catch (e) { return { inkPixels: -1 }; }
    return { inkPixels: ink, total: w * h, canvas: `${w}x${h}`, inner: `${window.innerWidth}x${window.innerHeight}` };
  });
}

async function alive(page) {
  return await page.evaluate(async () => {
    const { ascii } = globalThis.asciiPortfolio;
    const ctx = ascii.canvas.getContext('2d');
    const w = ascii.canvas.width, h = ascii.canvas.height;
    if (w < 2 || h < 2) return { measurable: false };
    const a = ctx.getImageData(0, 0, w, h).data;
    await new Promise((r) => setTimeout(r, 400));
    const b = ctx.getImageData(0, 0, w, h).data;
    let diff = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
    return { measurable: true, differingFraction: diff / a.length, isFrozen: diff === 0 };
  });
}

const results = [];

// F1
{
  const { page, warnings } = await loadAt(1280, 800);
  await page.waitForTimeout(3000);
  results.push({ F1: { viewport: '1280x800 steady', warnings: warnings.length, ink: await ink(page) } });
  console.log('F1 steady 1280x800:', warnings.length, 'warnings');
  await page.close();
}

// F2: 100 -> 1280 -> 100 -> 1280 (both growths to an already-reached size)
{
  const { page, warnings } = await loadAt(100, 800);
  const t = [];
  let b = warnings.length;
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(1500);
  t.push({ phase: 'grow#1 100->1280', warnings: warnings.length - b });
  b = warnings.length;
  await page.setViewportSize({ width: 100, height: 800 });
  await page.waitForTimeout(1000);
  t.push({ phase: 'shrink 1280->100', warnings: warnings.length - b });
  b = warnings.length;
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(1500);
  t.push({ phase: 'grow#2 100->1280', warnings: warnings.length - b });
  results.push({ F2: t });
  console.log('F2:', JSON.stringify(t));
  await page.close();
}

// F3: staircase from small
{
  const { page, warnings } = await loadAt(400, 400);
  const t = [];
  for (const [w, h] of [[600, 500], [800, 600], [1100, 700], [1280, 800], [1600, 900]]) {
    const b = warnings.length;
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(1200);
    t.push({ to: `${w}x${h}`, warnings: warnings.length - b });
  }
  results.push({ F3: t });
  console.log('F3 staircase:', JSON.stringify(t));
  await page.close();
}

// F4: 1x1 liveness and ink
{
  const { page, warnings } = await loadAt(1, 1);
  const inkAt1 = await ink(page);
  const aliveAt1 = await alive(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(2500);
  const inkAfter = await ink(page);
  const aliveAfter = await alive(page);
  results.push({ F4: { inkAt1x1: inkAt1, aliveAt1x1: aliveAt1, inkAfterRecovery: inkAfter, aliveAfterRecovery: aliveAfter } });
  console.log('F4 ink@1x1:', JSON.stringify(inkAt1), 'alive:', JSON.stringify(aliveAt1));
  console.log('F4 ink after recovery:', JSON.stringify(inkAfter), 'alive:', JSON.stringify(aliveAfter));
  await page.close();
}

await browser.close();
writeFileSync(OUT, JSON.stringify(results, null, 2));
console.log(`\nReport: ${OUT}`);
