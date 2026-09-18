/**
 * S6 follow-up B: is the warning a compositor resize race?
 *
 * Hypothesis: "Offset overflows texture dimensions" is emitted by Chrome's
 * compositor (glCopySubTextureCHROMIUM) when it copies the WebGL canvas's
 * backing texture using the canvas's LAYOUT size while the GL drawing buffer
 * is still smaller — i.e. the CSS size grew before the app's coalesced rAF
 * resize ran. That is a browser/renderer artifact, not an app draw call.
 *
 * Tests:
 *  S6b  load 1280x800 -> shrink to 1x1 -> grow back to 1280x800
 *  S6c  load 700x800  -> grow to 1280x800 (grow only, no degenerate size)
 *  S6d  load 1x1      -> grow to 1280x800, polling drawing-buffer vs layout size
 *
 * Output: .shots/gl-probe-s6b.json
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/WanSou/AppData/Roaming/npm/node_modules/omniroute/node_modules/playwright-core/index.js');
import { writeFileSync } from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://localhost:5199';
const OUT = '.shots/gl-probe-s6b.json';

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

// ── S6b: shrink then grow ───────────────────────────────────────────────────
console.log('S6b: 1280x800 -> 1x1 -> 1280x800');
{
  const { page, warnings } = await loadAt(1280, 800);
  const t0 = Date.now();
  await page.setViewportSize({ width: 1, height: 1 });
  await page.waitForTimeout(1500);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(3000);
  const shrinkWarnings = warnings.filter((w) => w.ts < t0 + 1600).length;
  const growWarnings = warnings.filter((w) => w.ts >= t0 + 1600).length;
  console.log(`  after-shrink warnings=${shrinkWarnings}  after-grow warnings=${growWarnings}`);
  var s6b = { shrinkWarnings, growWarnings, total: warnings.length };
  await page.close();
}

// ── S6c: grow only, no degenerate size ───────────────────────────────────────
console.log('S6c: 700x800 -> 1280x800 (grow only)');
{
  const { page, warnings } = await loadAt(700, 800);
  const t0 = Date.now();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(3000);
  console.log(`  after-grow warnings=${warnings.length}`);
  var s6c = { growWarnings: warnings.length };
  await page.close();
}

// ── S6d: measure the drawing-buffer vs layout-size lag around the 1x1 grow ──
console.log('S6d: 1x1 -> 1280x800 with size polling');
{
  const { page, warnings } = await loadAt(1, 1);

  // In-page poller: sample the output canvas's GL drawing buffer vs its layout
  // size every ~10ms and log every sample where they disagree.
  await page.evaluate(() => {
    window.__sizeTrace = [];
    const canvas = globalThis.asciiPortfolio.composite.renderer.domElement;
    let n = 0;
    const tick = () => {
      const r = canvas.getBoundingClientRect();
      window.__sizeTrace.push({
        n: n++,
        drawing: `${canvas.width}x${canvas.height}`,
        layout: `${Math.round(r.width)}x${Math.round(r.height)}`,
        inner: `${window.innerWidth}x${window.innerHeight}`,
        asciiCanvas: `${globalThis.asciiPortfolio.ascii.canvas.width}x${globalThis.asciiPortfolio.ascii.canvas.height}`,
      });
      if (n < 600) setTimeout(tick, 10);
    };
    tick();
  });
  await page.waitForTimeout(300);

  const t0 = Date.now();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(3000);

  const trace = await page.evaluate(() => window.__sizeTrace);
  // Frames where the layout (CSS) box is LARGER than the GL drawing buffer:
  // that is exactly the state in which a compositor copy of layout-size region
  // would overflow the texture.
  const mismatches = trace.filter((t) => {
    const [dw, dh] = t.drawing.split('x').map(Number);
    const [lw, lh] = t.layout.split('x').map(Number);
    return lw > dw || lh > dh;
  });
  const firstMismatch = mismatches[0];
  const lastMismatch = mismatches[mismatches.length - 1];
  const mismatchSpanMs = firstMismatch && lastMismatch
    ? (lastMismatch.n - firstMismatch.n) * 10
    : 0;

  const w0 = warnings[0];
  console.log(`  warnings=${warnings.length}`);
  console.log(`  layout>drawing mismatch samples: ${mismatches.length} of ${trace.length}, span ~${mismatchSpanMs}ms`);
  if (firstMismatch) console.log(`  first mismatch: ${JSON.stringify(firstMismatch)}`);
  if (lastMismatch) console.log(`  last  mismatch: ${JSON.stringify(lastMismatch)}`);
  if (w0) console.log(`  first warning ts offset from jump: ${w0.ts - t0}ms`);

  var s6d = {
    warnings: warnings.length,
    firstWarningOffsetMs: w0 ? w0.ts - t0 : null,
    lastWarningOffsetMs: warnings.length ? warnings[warnings.length - 1].ts - t0 : null,
    samples: trace.length,
    mismatchSamples: mismatches.length,
    mismatchSpanMs,
    firstMismatch,
    lastMismatch,
    warningWithinMismatchWindow: w0
      ? mismatches.some((m) => Math.abs(m.n * 10 - (w0.ts - t0)) < 500)
      : null,
  };
  await page.close();
}

await browser.close();

writeFileSync(OUT, JSON.stringify({ s6b, s6c, s6d }, null, 2));
console.log(`\nReport: ${OUT}`);
