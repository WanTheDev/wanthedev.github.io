/**
 * S6 follow-up: which composer (scene-fx vs bloom-composite) emits the warning,
 * and at what size? Runs the 1x1 page, samples GL state during the storm.
 * Output: .shots/gl-probe-s6.json
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/WanSou/AppData/Roaming/npm/node_modules/omniroute/node_modules/playwright-core/index.js');
import { writeFileSync } from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://localhost:5199';
const OUT = '.shots/gl-probe-s6.json';

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-web-security', '--no-sandbox'],
  headless: true,
});
const page = await browser.newPage();

const warnings = [];
page.on('console', (msg) => {
  if (/GL_INVALID_VALUE|glCopySubTexture/.test(msg.text())) {
    warnings.push({ ts: Date.now(), text: msg.text() });
  }
});

await page.setViewportSize({ width: 1, height: 1 });
await page.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForFunction(() => typeof globalThis.asciiPortfolio !== 'undefined', { timeout: 10000 });
await page.waitForTimeout(1500);

// Instrument after load: count render calls and record sizes around each one.
await page.evaluate(() => {
  const { composite, fx } = globalThis.asciiPortfolio;
  window.__trace = [];
  const wrap = (obj, name, fn) => {
    obj[name] = function (...args) {
      const rec = {
        pass: name,
        ts: Date.now(),
        asciiCanvas: `${globalThis.asciiPortfolio.ascii.canvas.width}x${globalThis.asciiPortfolio.ascii.canvas.height}`,
        sourceTexture: `${composite.texture.image.width}x${composite.texture.image.height}`,
        compositeRead: `${composite.composer.readBuffer.width}x${composite.composer.readBuffer.height}`,
        compositeWrite: `${composite.composer.writeBuffer.width}x${composite.composer.writeBuffer.height}`,
        compositeRenderer: `${composite.renderer.domElement.width}x${composite.renderer.domElement.height}`,
        compositePR: composite.renderer.getPixelRatio(),
        sceneRead: `${fx.composer.readBuffer.width}x${fx.composer.readBuffer.height}`,
        sceneRenderer: `${globalThis.asciiPortfolio.renderer.domElement.width}x${globalThis.asciiPortfolio.renderer.domElement.height}`,
        inner: `${window.innerWidth}x${window.innerHeight}`,
        dpr: window.devicePixelRatio,
      };
      window.__trace.push(rec);
      return fn.apply(this, args);
    };
  };
  wrap(composite, 'composite.render', composite.render.bind(composite));
  wrap(fx, 'fx.render', fx.render.bind(fx));
  // Also catch the size transitions
  const origCompSetSize = composite.setSize.bind(composite);
  composite.setSize = function (w, h, pr) {
    window.__trace.push({ setSize: 'composite', w, h, pr, ts: Date.now() });
    return origCompSetSize(w, h, pr);
  };
});

await page.waitForTimeout(500);
const beforeJump = Date.now();

// Jump to 1280x800 — the transition that emits warnings
await page.setViewportSize({ width: 1280, height: 800 });
await page.waitForTimeout(2500);

const trace = await page.evaluate(() => window.__trace);

// Find warnings that landed within +/-50ms of a trace entry
const correlated = warnings.map((w) => {
  const near = trace.filter((t) => Math.abs(t.ts - w.ts) < 60);
  return { warningTs: w.ts, near: near.slice(-3) };
});

await browser.close();

writeFileSync(OUT, JSON.stringify({
  warningCount: warnings.length,
  firstWarningTs: warnings[0]?.ts ?? null,
  lastWarningTs: warnings[warnings.length - 1]?.ts ?? null,
  beforeJumpTs: beforeJump,
  warningsBeforeJump: warnings.filter((w) => w.ts < beforeJump).length,
  warningsAfterJump: warnings.filter((w) => w.ts >= beforeJump).length,
  traceCount: trace.length,
  traceFirst: trace.slice(0, 6),
  traceAroundJump: trace.filter((t) => Math.abs(t.ts - beforeJump) < 3000).slice(0, 20),
  correlated: correlated.slice(0, 15),
}, null, 2));
console.log(`Report: ${OUT}`);
console.log(`warnings: ${warnings.length} (before jump: ${warnings.filter((w) => w.ts < beforeJump).length}, after: ${warnings.filter((w) => w.ts >= beforeJump).length})`);
console.log(`trace entries: ${trace.length}`);
console.log('first trace:', JSON.stringify(trace.slice(0, 3), null, 2));
