/**
 * Resize bug probe for wanthedev portfolio.
 * 
 * Tests two reported bugs:
 * 1. ASCII rendering freezes/stretches on resize
 * 2. Camera lookAt target not centered on torus
 * 
 * Run: node .shots/resize-probe.mjs
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/WanSou/AppData/Roaming/npm/node_modules/omniroute/node_modules/playwright-core/index.js');
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync, spawn } from 'child_process';

const SHOTS_DIR = 'F:/vibe-projects/wanthedev-github-io/wanthedev.github.io/.shots';
mkdirSync(SHOTS_DIR, { recursive: true });

const RESULTS = { phaseA: [], phaseB: {}, phaseC: {}, errors: [] };

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

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
  await page.waitForFunction(() => typeof globalThis.asciiPortfolio !== 'undefined', {}, { timeout: 10000 });
  await sleep(waitMs);
}

// Compute ASCII canvas bounding box of lit pixels
async function getAsciiBBox(page, threshold = 12) {
  return await page.evaluate((thresh) => {
    const { ascii } = globalThis.asciiPortfolio;
    const ctx = ascii.canvas.getContext('2d');
    const w = ascii.canvas.width;
    const h = ascii.canvas.height;
    const data = ctx.getImageData(0, 0, w, h).data;
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let litPixels = 0;
    
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = data[i], g = data[i+1], b = data[i+2];
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (lum > thresh) {
          litPixels++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    
    if (litPixels === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0, threshold: thresh, litPixels: 0,
               fracCenterX: 0.5, fracCenterY: 0.5, fracSpanX: 0, fracSpanY: 0 };
    }
    
    return {
      minX, minY, maxX, maxY,
      threshold: thresh,
      litPixels,
      fracCenterX: (minX + maxX) / 2 / w,
      fracCenterY: (minY + maxY) / 2 / h,
      fracSpanX: (maxX - minX) / w,
      fracSpanY: (maxY - minY) / h,
    };
  }, threshold);
}

// Simple hash of canvas pixels for change detection
async function hashCanvas(page, steps = 997) {
  return await page.evaluate((step) => {
    const { ascii } = globalThis.asciiPortfolio;
    const ctx = ascii.canvas.getContext('2d');
    const w = ascii.canvas.width;
    const h = ascii.canvas.height;
    const data = ctx.getImageData(0, 0, w, h).data;
    
    let sum = 0;
    for (let i = 0; i < data.length; i += step) {
      sum += data[i] + data[i+1] + data[i+2] + data[i+3];
    }
    return sum;
  }, steps);
}

async function measureViewport(page, label) {
  const info = await page.evaluate(() => {
    const { ascii, renderer, composite } = globalThis.asciiPortfolio;
    const sizeTracker = { x: 0, y: 0, set(x, y) { this.x = x; this.y = y; return this; }, floor() { this.x = Math.floor(this.x); this.y = Math.floor(this.y); return this; } };

    const bbox = document.querySelector('#ascii-background').getBoundingClientRect();

    renderer.getSize(sizeTracker);
    renderer.getDrawingBufferSize(sizeTracker);
    
    return {
      win: [window.innerWidth, window.innerHeight, window.devicePixelRatio],
      ascii: {
        canvasW: ascii.canvas.width,
        canvasH: ascii.canvas.height,
        cssW: ascii.canvas.style.width,
        cssH: ascii.canvas.style.height,
        clientW: ascii.canvas.clientWidth,
        clientH: ascii.canvas.clientHeight,
        columns: ascii.columns,
        rows: ascii.rows,
      },
      sceneRenderer: {
        size: { x: sizeTracker.x, y: sizeTracker.y },
        drawingBuffer: { x: sizeTracker.x, y: sizeTracker.y },
      },
      composite: {
        attrW: composite.renderer.domElement.width,
        attrH: composite.renderer.domElement.height,
        cssInlineW: composite.renderer.domElement.style.width,
        cssInlineH: composite.renderer.domElement.style.height,
        clientW: composite.renderer.domElement.clientWidth,
        clientH: composite.renderer.domElement.clientHeight,
        rendererSize: composite.renderer.getSize({ set(x, y) { this.x = x; this.y = y; }, x: 0, y: 0 }),
      },
      cameraPos: asciiPortfolio.camera.position.toArray(),
    };
  });
  
  const bbox12 = await getAsciiBBox(page, 12);
  const bbox30 = await getAsciiBBox(page, 30);
  
  return {
    label,
    ...info,
    asciiBBox12: bbox12,
    asciiBBox30: bbox30,
  };
}

async function main() {
  const browser = await launchBrowser();
  
  // ============ PHASE A: Dev server ============
  console.log('=== PHASE A: Dev server centering test ===');
  const devContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const devPage = await devContext.newPage();
  await waitForPortfolio(devPage, 'http://localhost:5199');
  
  // Freeze animation at deterministic pose
  devPage.evaluate(() => {
    globalThis.asciiPortfolio.pause();
    globalThis.asciiPortfolio.render(0);
  });
  await sleep(300);
  
  const viewports = [
    [1920, 1080], [2560, 1440], [1280, 800], [1024, 768],
    [800, 600], [1600, 500], [390, 844], [320, 480]
  ];
  
  for (const [w, h] of viewports) {
    await devPage.setViewportSize({ width: w, height: h });
    await sleep(700);
    devPage.evaluate(() => {
      globalThis.asciiPortfolio.pause();
      globalThis.asciiPortfolio.render(0);
    });
    await sleep(200);
    
    const measurement = await measureViewport(devPage, `${w}x${h}`);
    RESULTS.phaseA.push(measurement);
    
    // Save PNG snapshots for key viewports
    if ((w === 1920 && h === 1080) || (w === 1280 && h === 800) || (w === 800 && h === 600)) {
      const pngData = await devPage.evaluate(() => {
        const { ascii } = globalThis.asciiPortfolio;
        return ascii.canvas.toDataURL('image/png');
      });
      const buffer = Buffer.from(pngData.replace(/^data:image\/png;base64,/, ''), 'base64');
      writeFileSync(join(SHOTS_DIR, `probe-ascii-${w}x${h}.png`), buffer);
    }
    
    console.log(`  ${w}x${h}: center=(${measurement.asciiBBox12.fracCenterX.toFixed(4)}, ${measurement.asciiBBox12.fracCenterY.toFixed(4)}) span=(${measurement.asciiBBox12.fracSpanX.toFixed(4)}, ${measurement.asciiBBox12.fracSpanY.toFixed(4)})`);
  }
  
  // ============ PHASE B: Freeze test ============
  console.log('\n=== PHASE B: Animation freeze/stretch test ===');
  
  // Reset to 1920x1080
  await devPage.setViewportSize({ width: 1920, height: 1080 });
  await sleep(500);
  
  // Install rAF counter BEFORE resume
  await devPage.evaluate(() => {
    window.__rafCount = 0;
    const orig = window.requestAnimationFrame;
    window.requestAnimationFrame = cb => orig(t => {
      window.__rafCount++;
      return cb(t);
    });
  });
  
  // Resume animation
  devPage.evaluate(() => globalThis.asciiPortfolio.resume());
  await sleep(500);
  
  // Pre-resize: verify animation is running
  const rafBefore1 = await devPage.evaluate(() => window.__rafCount);
  const hashBefore1 = await hashCanvas(devPage);
  await sleep(500);
  const rafBefore2 = await devPage.evaluate(() => window.__rafCount);
  const hashBefore2 = await hashCanvas(devPage);
  
  console.log(`  Pre-resize rAF count: ${rafBefore1} -> ${rafBefore2} (delta: ${rafBefore2 - rafBefore1})`);
  console.log(`  Pre-resize hash diff: ${Math.abs(hashBefore2 - hashBefore1)} (should be >0 if animating)`);
  
  const preResizeAnimating = (rafBefore2 - rafBefore1) > 0 && hashBefore1 !== hashBefore2;
  console.log(`  Pre-resize animation running: ${preResizeAnimating}`);
  
  // Record state before resize
  const beforeResize = await measureViewport(devPage, 'before-resize');
  
  // Capture console/page errors during resize
  const errors = [];
  devPage.on('pageerror', err => errors.push(err.toString()));
  devPage.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      errors.push(`[${msg.type()}] ${msg.text()}`);
    }
  });
  
  // Resize to 1280x800
  await devPage.setViewportSize({ width: 1280, height: 800 });
  await sleep(200);
  
  // Post-resize measurements
  const postResize1 = await measureViewport(devPage, 'post-resize-1');
  const rafAfter1 = await devPage.evaluate(() => window.__rafCount);
  const hashAfter1 = await hashCanvas(devPage);
  
  await sleep(500);
  
  const postResize2 = await measureViewport(devPage, 'post-resize-2');
  const rafAfter2 = await devPage.evaluate(() => window.__rafCount);
  const hashAfter2 = await hashCanvas(devPage);
  
  console.log(`  Post-resize rAF count: ${rafAfter1} -> ${rafAfter2} (delta: ${rafAfter2 - rafAfter1})`);
  console.log(`  Post-resize hash diff: ${Math.abs(hashAfter2 - hashAfter1)} (should be >0 if animating)`);
  
  const postResizeAnimating = (rafAfter2 - rafAfter1) > 0 && hashAfter1 !== hashAfter2;
  console.log(`  Post-resize animation running: ${postResizeAnimating}`);
  
  // Check canvas size consistency
  const asciiBackW = postResize2.ascii.canvasW;
  const asciiCssW = parseInt(postResize2.ascii.cssW);
  const compositeAttrW = postResize2.composite.attrW;
  const compositeClientW = postResize2.composite.clientW;
  
  console.log(`  ASCII canvas: backing=${asciiBackW}x${postResize2.ascii.canvasH}, CSS=${asciiCssW}px`);
  console.log(`  Composite: attr=${compositeAttrW}x${postResize2.composite.attrH}, client=${compositeClientW}x${postResize2.composite.clientH}`);
  
  RESULTS.phaseB = {
    preResize: {
      viewport: '1920x1080',
      rafCount: rafBefore2,
      hash: hashBefore2,
      animating: preResizeAnimating,
      asciiBBox: beforeResize.asciiBBox12,
      asciiCanvasSize: `${beforeResize.ascii.canvasW}x${beforeResize.ascii.canvasH}`,
      compositeSize: `${beforeResize.composite.attrW}x${beforeResize.composite.attrH}`,
    },
    postResize: {
      viewport: '1280x800',
      rafCount: rafAfter2,
      hash: hashAfter2,
      animating: postResizeAnimating,
      rafDelta: rafAfter2 - rafAfter1,
      hashDelta: Math.abs(hashAfter2 - hashAfter1),
      asciiBBox: postResize2.asciiBBox12,
      asciiCanvasSize: `${asciiBackW}x${postResize2.ascii.canvasH}`,
      compositeSize: `${compositeAttrW}x${postResize2.composite.attrH}`,
      compositeClientSize: `${compositeClientW}x${postResize2.composite.clientH}`,
    },
    errors,
  };
  
  // Second resize sequence: 1280x800 -> 900x1200 -> 1920x1080
  console.log('\n  --- Second resize sequence ---');
  
  const resizeSeq1 = async (toW, toH, label) => {
    await devPage.setViewportSize({ width: toW, height: toH });
    await sleep(500);
    devPage.evaluate(() => {
      globalThis.asciiPortfolio.pause();
      globalThis.asciiPortfolio.render(0);
    });
    await sleep(200);
    return measureViewport(devPage, label);
  };
  
  const seqAfter1 = await resizeSeq1(900, 1200, '900x1200');
  console.log(`  900x1200: center=(${seqAfter1.asciiBBox12.fracCenterX.toFixed(4)}, ${seqAfter1.asciiBBox12.fracCenterY.toFixed(4)})`);
  
  const seqAfter2 = await resizeSeq1(1920, 1080, '1920x1080');
  console.log(`  1920x1080: center=(${seqAfter2.asciiBBox12.fracCenterX.toFixed(4)}, ${seqAfter2.asciiBBox12.fracCenterY.toFixed(4)})`);
  
  // Test with pointer held down
  console.log('\n  --- Resize with pointer held ---');
  await devPage.setViewportSize({ width: 1280, height: 800 });
  await sleep(300);
  
  // Move mouse to corner and hold
  await devPage.mouse.move(100, 100);
  await devPage.mouse.down();
  await sleep(200);
  
  const heldBefore = await measureViewport(devPage, 'held-before-resize');
  
  await devPage.setViewportSize({ width: 800, height: 600 });
  await sleep(500);
  
  const heldAfter = await measureViewport(devPage, 'held-after-resize');
  
  await devPage.mouse.up();
  
  console.log(`  Held resize 1280x800->800x600: center=(${heldAfter.asciiBBox12.fracCenterX.toFixed(4)}, ${heldAfter.asciiBBox12.fracCenterY.toFixed(4)})`);
  
  RESULTS.phaseB.pointerHeld = {
    before: heldBefore,
    after: heldAfter,
  };
  
  // ============ PHASE C: Production build ============
  console.log('\n=== PHASE C: Production build test ===');
  
  // Build the project
  console.log('  Building...');
  try {
    execSync('npm run build', { cwd: 'F:/vibe-projects/wanthedev-github-io/wanthedev.github.io', stdio: 'inherit' });
  } catch (e) {
    console.error('Build failed:', e.message);
  }
  
  // Start preview server
  console.log('  Starting preview server...');
  const preview = spawn('cmd', ['/c', 'npx', 'vite', 'preview', '--port', '5201', '--strictPort'], {
    cwd: 'F:/vibe-projects/wanthedev-github-io/wanthedev.github.io',
    stdio: 'ignore',
    detached: true,
  });
  preview.unref();
  await sleep(2000);
  
  // Test production build
  const prodContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const prodPage = await prodContext.newPage();
  await waitForPortfolio(prodPage, 'http://localhost:5201');
  
  prodPage.evaluate(() => {
    globalThis.asciiPortfolio.pause();
    globalThis.asciiPortfolio.render(0);
  });
  await sleep(300);
  
  const prodViewports = [[1920, 1080], [1280, 800], [800, 600]];
  for (const [w, h] of prodViewports) {
    await prodPage.setViewportSize({ width: w, height: h });
    await sleep(700);
    prodPage.evaluate(() => {
      globalThis.asciiPortfolio.pause();
      globalThis.asciiPortfolio.render(0);
    });
    await sleep(200);
    
    const m = await measureViewport(prodPage, `prod-${w}x${h}`);
    RESULTS.phaseC[`${w}x${h}`] = m;
    console.log(`  Prod ${w}x${h}: center=(${m.asciiBBox12.fracCenterX.toFixed(4)}, ${m.asciiBBox12.fracCenterY.toFixed(4)})`);
  }
  
  // Kill preview server
  preview.kill();
  await sleep(500);
  
  await browser.close();
  
  // Save results
  writeFileSync(join(SHOTS_DIR, 'probe-resize.json'), JSON.stringify(RESULTS, null, 2));
  console.log('\nResults saved to .shots/probe-resize.json');
}

main().catch(err => {
  console.error('Probe failed:', err);
  process.exit(1);
});
