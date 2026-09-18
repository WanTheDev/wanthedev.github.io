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
  if (!pass) console.error(`FAIL: ${name} - ${detail}`);
  return pass;
}

async function main() {
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
  page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', err => pageErrors.push(err.toString()));

  console.log('Navigating...');
  await page.goto('http://localhost:5199', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForFunction(() => typeof globalThis.asciiPortfolio !== 'undefined', {}, { timeout: 10000 });

  // ── Structural assertions ────────────────────────────────────────────────
  const structural = await page.evaluate(() => {
    const { composite, ascii, config } = globalThis.asciiPortfolio;
    const domCanvas = document.querySelector('#ascii-background');

    const texImageSame = composite.texture.image === ascii.canvas;
    const toneMapping = composite.renderer.toneMapping;
    const domElementSame = composite.renderer.domElement === domCanvas;
    const passes = composite.composer.passes.map(p => p.constructor.name);
    const bloomIdentity = composite.composer.passes[1] === composite.bloom;

    // renderTarget info
    const rt = composite.composer.readBuffer || composite.composer.renderTarget;
    const rtInfo = rt ? { w: rt.width, h: rt.height } : null;

    return {
      texImageSame,
      toneMapping,
      noToneMapping: toneMapping === 0,
      domElementSame,
      passes,
      bloomIdentity,
      rtInfo,
      composerWidth: composite.composer.width,
      composerHeight: composite.composer.height,
      asciiCanvasW: ascii.canvas.width,
      asciiCanvasH: ascii.canvas.height,
      configBloom: { ...config.post.bloom },
    };
  });

  assert('S1: texture.image === ascii.canvas', structural.texImageSame);
  assert('S2: toneMapping is 0 (NoToneMapping)', structural.noToneMapping,
    `toneMapping = ${structural.toneMapping}`);
  assert('S3: renderer.domElement === #ascii-background', structural.domElementSame);
  assert('S4: passes are [TexturePass,UnrealBloomPass,ShaderPass]',
    JSON.stringify(structural.passes) === '["TexturePass","UnrealBloomPass","ShaderPass"]',
    `got ${JSON.stringify(structural.passes)}`);
  assert('S4b: composer.passes[1] === composite.bloom', structural.bloomIdentity);

  console.log('Structural:', JSON.stringify(structural, null, 2));

  // ── Core measurement ─────────────────────────────────────────────────────
  console.log('Running core measurement...');
  const core = await page.evaluate(() => {
    const { composite, ascii, config } = globalThis.asciiPortfolio;
    const composer = composite.composer;
    const renderer = composite.renderer;

    // Pause animation and render once for a stable frame
    asciiPortfolio.pause();
    asciiPortfolio.render();

    // Snapshot the ASCII source canvas (unchanged by bloom)
    const asciiCtx = ascii.canvas.getContext('2d');
    const asciiW = ascii.canvas.width;
    const asciiH = ascii.canvas.height;
    const asciiOn = asciiCtx.getImageData(0, 0, asciiW, asciiH);

    // Enable bloom, render, read buffer
    config.post.bloom.enabled = true;
    composite.render();
    // render the composer to readBuffer (not to screen)
    composer.renderToScreen = false;
    composer.render();

    const W = composer.readBuffer ? composer.readBuffer.width : composer.renderTarget.width;
    const H = composer.readBuffer ? composer.readBuffer.height : composer.renderTarget.height;
    const bufA = new Uint8ClampedArray(W * H * 4);
    renderer.readRenderTargetPixels(composer.readBuffer || composer.renderTarget, 0, 0, W, H, bufA);

    // Snapshot B: disable bloom, re-render
    config.post.bloom.enabled = false;
    composite.render();
    composer.renderToScreen = false;
    composer.render();
    const bufB = new Uint8ClampedArray(W * H * 4);
    renderer.readRenderTargetPixels(composer.readBuffer || composer.renderTarget, 0, 0, W, H, bufB);

    // Snapshot ASCII with bloom off (should be identical)
    const asciiOff = asciiCtx.getImageData(0, 0, asciiW, asciiH);

    // Re-enable bloom for final state
    config.post.bloom.enabled = true;
    composite.render();

    // ── Stability check: two consecutive renders with bloom ON ────────────
    composer.renderToScreen = false;
    composer.render();
    const bufStab1 = new Uint8ClampedArray(W * H * 4);
    renderer.readRenderTargetPixels(composer.readBuffer || composer.renderTarget, 0, 0, W, H, bufStab1);
    composer.render();
    const bufStab2 = new Uint8ClampedArray(W * H * 4);
    renderer.readRenderTargetPixels(composer.readBuffer || composer.renderTarget, 0, 0, W, H, bufStab2);
    let stabDiff = 0;
    for (let i = 0; i < bufStab1.length; i++) stabDiff += Math.abs(bufStab1[i] - bufStab2[i]);

    // ── ASCII canvas SAD ─────────────────────────────────────────────────
    let asciiSAD = 0;
    const asciiLen = Math.min(asciiOn.data.length, asciiOff.data.length);
    for (let i = 0; i < asciiLen; i++) asciiSAD += Math.abs(asciiOn.data[i] - asciiOff.data[i]);

    // ── Luminance stats ──────────────────────────────────────────────────
    function lum(r, g, b) { return 0.299 * r + 0.587 * g + 0.114 * b; }

    let sumA = 0, sumB = 0, count = W * H;
    let darkCountB = 0, darkSumB = 0, darkSumADelta = 0;
    let brightCountB = 0, brightSumB = 0, brightSumADelta = 0;
    let brighterBy2 = 0, brighterBy8 = 0, brighterBy24 = 0;
    let darkerBy2 = 0;
    let maxVal = 0;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const rA = bufA[i], gA = bufA[i+1], bA = bufA[i+2];
        const rB = bufB[i], gB = bufB[i+1], bB = bufB[i+2];
        const la = lum(rA, gA, bA);
        const lb = lum(rB, gB, bB);
        sumA += la;
        sumB += lb;
        const delta = la - lb;
        maxVal = Math.max(maxVal, rA, gA, bA, rB, gB, bB);

        if (lb <= 12) {
          darkCountB++;
          darkSumB += lb;
          darkSumADelta += delta;
        }
        if (lb >= 120) {
          brightCountB++;
          brightSumB += lb;
          brightSumADelta += delta;
        }
        if (delta > 2) brighterBy2++;
        if (delta > 8) brighterBy8++;
        if (delta > 24) brighterBy24++;
        if (delta < -2) darkerBy2++;
      }
    }

    const meanA = sumA / count;
    const meanB = sumB / count;
    const darkMeanB = darkCountB > 0 ? darkSumB / darkCountB : 0;
    const darkMeanDelta = darkCountB > 0 ? darkSumADelta / darkCountB : 0;
    const brightMeanB = brightCountB > 0 ? brightSumB / brightCountB : 0;
    const brightMeanDelta = brightCountB > 0 ? brightSumADelta / brightCountB : 0;

    return {
      W, H, count,
      asciiSAD,
      asciiIdentical: asciiSAD === 0,
      maxVal,
      meanA,
      meanB,
      darkCountB,
      darkMeanB,
      darkMeanDelta,
      brightCountB,
      brightMeanB,
      brightMeanDelta,
      brighterBy2,
      brighterBy8,
      brighterBy24,
      darkerBy2,
      stabDiff,
      stabilityOk: stabDiff === 0,
      nonZeroBuf: maxVal > 0,
    };
  });

  assert('C1: Buffer is non-zero (not all black read)', core.nonZeroBuf,
    `maxVal=${core.maxVal}`);
  assert('C2: ASCII canvas SAD is 0 (bloom does not modify source)', core.asciiIdentical,
    `SAD=${core.asciiSAD}`);
  assert('C3: Composer buffer is stable across consecutive renders', core.stabilityOk,
    `stabDiff=${core.stabDiff}`);
  assert('C4: Sanity — thousands of pixels brighter by >8', core.brighterBy8 > 1000,
    `brighterBy8=${core.brighterBy8}`);

  // Restore animation
  await page.evaluate(() => { asciiPortfolio.resume(); });

  console.log('\n=== CORE RESULTS ===');
  console.log(JSON.stringify(core, null, 2));

  const report = { results, consoleMessages, pageErrors, core, structural };
  writeFileSync(join(SHOTS_DIR, 'bloom-measure.json'), JSON.stringify(report, null, 2));

  console.log('\n=== ASSERTIONS ===');
  for (const r of results) {
    console.log(`${r.pass ? 'PASS' : 'FAIL'}: ${r.name}${r.detail ? ` - ${r.detail}` : ''}`);
  }
  if (consoleMessages.length) {
    console.log('\n=== CONSOLE ===');
    for (const m of consoleMessages) console.log(`[${m.type}] ${m.text}`);
  }
  if (pageErrors.length) {
    console.log('\n=== PAGE ERRORS ===');
    for (const e of pageErrors) console.log(e);
  }

  await browser.close();
}

main().catch(err => { console.error('Test failed:', err); process.exit(1); });
