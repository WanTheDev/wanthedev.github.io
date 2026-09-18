/**
 * Verification for the centring + resize coalescing fix.
 * Outputs .shots/impl-verify.json + screenshots.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/WanSou/AppData/Roaming/npm/node_modules/omniroute/node_modules/playwright-core/index.js');
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const SHOTS_DIR = 'F:/vibe-projects/wanthedev-github-io/wanthedev.github.io/.shots';
mkdirSync(SHOTS_DIR, { recursive: true });

const URL = 'http://localhost:5199';

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

async function waitForPortfolio(page, waitMs = 2000) {
  await page.waitForFunction(() => typeof globalThis.asciiPortfolio !== 'undefined', {}, { timeout: 10000 });
  await sleep(waitMs);
}

// Compute metrics from ASCII canvas pixel data
async function getAsciiMetrics(page, thresholds = [60]) {
  return await page.evaluate((threshs) => {
    const { ascii } = globalThis.asciiPortfolio;
    const ctx = ascii.canvas.getContext('2d');
    const w = ascii.canvas.width;
    const h = ascii.canvas.height;
    const data = ctx.getImageData(0, 0, w, h).data;

    const results = {};
    for (const L of threshs) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      let litCount = 0;
      let sumLum = 0, sumXLum = 0, sumYLum = 0;
      // For central-mass restriction: collect all lit pixel x/y
      const xs = [], ys = [];
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const lum = (data[i] * 0.2126 + data[i+1] * 0.7152 + data[i+2] * 0.0722);
          if (lum > L) {
            litCount++;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            sumLum += lum;
            sumXLum += x * lum;
            sumYLum += y * lum;
            xs.push(x); ys.push(y);
          }
        }
      }
      const name = `L${L}`;
      // Central mass: 1st..99th percentile
      xs.sort((a,b) => a-b); ys.sort((a,b) => a-b);
      const p1x = xs[Math.floor(xs.length * 0.01)] ?? minX;
      const p99x = xs[Math.floor(xs.length * 0.99)] ?? maxX;
      const p1y = ys[Math.floor(ys.length * 0.01)] ?? minY;
      const p99y = ys[Math.floor(ys.length * 0.99)] ?? maxY;
      results[name] = {
        litCount,
        bbox: { minX, minY, maxX, maxY },
        fracCenter: {
          cx: litCount > 0 ? (minX + maxX) / 2 / w : 0.5,
          cy: litCount > 0 ? (minY + maxY) / 2 / h : 0.5,
        },
        span: {
          sx: litCount > 0 ? (maxX - minX) / w : 0,
          sy: litCount > 0 ? (maxY - minY) / h : 0,
        },
        energyCentroid: {
          cx: sumLum > 0 ? sumXLum / sumLum / w : 0.5,
          cy: sumLum > 0 ? sumYLum / sumLum / h : 0.5,
        },
        centralMassBbox: {
          minX: p1x, minY: p1y, maxX: p99x, maxY: p99y,
          fracCenter: {
            cx: (p1x + p99x) / 2 / w,
            cy: (p1y + p99y) / 2 / h,
          },
          span: {
            sx: (p99x - p1x) / w,
            sy: (p99y - p1y) / h,
          },
        },
      };
    }
    return { canvas: { width: w, height: h }, metrics: results };
  }, thresholds);
}

async function main() {
  const browser = await launchBrowser();
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  const consoleMsgs = [];
  page.on('console', msg => consoleMsgs.push(`${msg.type()}: ${msg.text()}`));

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await waitForPortfolio(page, 800);

  const viewports = [
    [1920, 1080], [2560, 1440], [1280, 800], [1024, 768], [800, 600],
    [1600, 500], [1366, 768], [390, 844], [320, 480], [3000, 400], [400, 3000],
  ];

  const t1Results = [];
  let cxSpread = 0, cySpread = 0;
  let cxMin = Infinity, cxMax = -Infinity, cyMin = Infinity, cyMax = -Infinity;
  let allClipped = false;

  for (const [vw, vh] of viewports) {
    await page.setViewportSize({ width: vw, height: vh });
    await sleep(600);
    // Pause and render a static frame for measurement
    await page.evaluate(() => {
      globalThis.asciiPortfolio.pause();
      globalThis.asciiPortfolio.render(0);
    });
    const m = await getAsciiMetrics(page, [60]);
    const L60 = m.metrics.L60;
    const cm = L60.centralMassBbox;
    const ec = L60.energyCentroid;
    const entry = {
      label: `${vw}x${vh}`,
      win: [vw, vh, 1],
      canvas: m.canvas,
      metrics: L60,
      centralMass: cm,
      cameraAspect: await page.evaluate(() => globalThis.asciiPortfolio.camera.aspect),
      framingDistance: await page.evaluate(() => {
        // framingDistance is module-scoped in scene.js, not exposed; use camera.position.z as proxy
        const p = globalThis.asciiPortfolio.camera.position;
        return Math.sqrt(p.x*p.x + p.y*p.y + p.z*p.z);
      }),
    };
    t1Results.push(entry);
    const cx = ec.cx;
    const cy = ec.cy;
    // Exclude heavily clipped viewports from spread metric
    if ((L60.span.sx ?? 1) < 0.3) {} else {
      if (cx < cxMin) cxMin = cx;
      if (cx > cxMax) cxMax = cx;
      if (cy < cyMin) cyMin = cy;
      if (cy > cyMax) cyMax = cy;
    }
    // Check clipping: bbox should stay within [0,1] with some margin
    if (cm.minX < 5 || cm.maxX > m.canvas.width - 5 || cm.minY < 5 || cm.maxY > m.canvas.height - 5) {
      allClipped = true;
    }
  }
  cxSpread = cxMax - cxMin;
  cySpread = cyMax - cyMin;

  // Regression check: 1920x1080 compared to pre-fix
  const pre1920 = { energyCentroid: { cx: 0.4435, cy: 0.4550 }, span: { sx: 0.841, sy: 0.996 } };
  const post1920 = t1Results.find(r => r.label === '1920x1080');
  const postEnergy = post1920.metrics.energyCentroid;
  const postSpan = post1920.metrics.span;
  const postCentral = post1920.centralMass.fracCenter;

  // Resize storm test
  await page.setViewportSize({ width: 1920, height: 1080 });
  await sleep(300);

  const stormCounts = await page.evaluate(async () => {
    const portfolio = globalThis.asciiPortfolio;
    let asciiResizes = 0;
    let compositeSizes = 0;
    const origAsciiResize = portfolio.ascii.resize.bind(portfolio.ascii);
    portfolio.ascii.resize = function(...args) {
      asciiResizes++;
      return origAsciiResize(...args);
    };
    const origCompositeSetSize = portfolio.composite.setSize.bind(portfolio.composite);
    portfolio.composite.setSize = function(...args) {
      compositeSizes++;
      return origCompositeSetSize(...args);
    };

    // 120 resize calls in a tight loop
    for (let i = 0; i < 120; i++) {
      const w = i % 2 === 0 ? 1920 : 900;
      const h = i % 2 === 0 ? 1080 : 600;
      window.dispatchEvent(new Event('resize'));
    }
    // Settle
    await new Promise(r => setTimeout(r, 1000));
    return { asciiResizes, compositeSizes };
  });

  // Check animation is still running
  const animCheck1 = await page.evaluate(() => {
    const { ascii } = globalThis.asciiPortfolio;
    const ctx = ascii.canvas.getContext('2d');
    return ctx.getImageData(0, 0, 1, 1).data[0];
  });
  await sleep(400);
  const animCheck2 = await page.evaluate(() => {
    const { ascii } = globalThis.asciiPortfolio;
    const ctx = ascii.canvas.getContext('2d');
    return ctx.getImageData(0, 0, 1, 1).data[0];
  });
  const isAnimating = animCheck1 !== animCheck2;

  // Check canvas sizes after storm
  const sizeCheck = await page.evaluate(() => {
    const canvas = document.querySelector('#ascii-background');
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    return {
      attrW: canvas.width, attrH: canvas.height,
      cssW: rect.width, cssH: rect.height,
      expectedW: Math.round(rect.width * dpr),
      expectedH: Math.round(rect.height * dpr),
      windowW: window.innerWidth,
      windowH: window.innerHeight,
      asciiColumns: globalThis.asciiPortfolio.ascii.columns,
      asciiRows: globalThis.asciiPortfolio.ascii.rows,
    };
  });

  // DPR change test
  const cdp = await context.newCDPSession(page);
  const dprTests = [];
  for (const dpr of [2, 0.75]) {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 800, deviceScaleFactor: dpr, mobile: false
    });
    await sleep(500);
    const dprResult = await page.evaluate(() => {
      const canvas = document.querySelector('#ascii-background');
      return {
        cssW: canvas.getBoundingClientRect().width,
        cssH: canvas.getBoundingClientRect().height,
        attrW: canvas.width,
        attrH: canvas.height,
        windowW: window.innerWidth,
        windowH: window.innerHeight,
        dpr: window.devicePixelRatio,
      };
    });
    dprTests.push({ dprInput: dpr, ...dprResult });
  }
  // Reset to normal
  await cdp.send('Emulation.clearDeviceMetricsOverride');
  await sleep(300);

  // Degenerate sizes
  const degenerateTests = [];
  for (const [w, h] of [[200, 120], [100, 100], [3000, 400], [400, 3000]]) {
    await page.setViewportSize({ width: w, height: h });
    await sleep(300);
    const degResult = await page.evaluate(() => {
      const canvas = document.querySelector('#ascii-background');
      return {
        canvasAttrW: canvas.width,
        canvasAttrH: canvas.height,
        cameraAspect: globalThis.asciiPortfolio.camera.aspect,
        asciiCols: globalThis.asciiPortfolio.ascii.columns,
        asciiRows: globalThis.asciiPortfolio.ascii.rows,
      };
    });
    degenerateTests.push({ viewport: `${w}x${h}`, ...degResult });
  }
  // Restore
  await page.setViewportSize({ width: 1920, height: 1080 });
  await sleep(300);

  // Screenshot checks
  await page.setViewportSize({ width: 1920, height: 1080 });
  await sleep(500);
  await page.screenshot({ path: join(SHOTS_DIR, 'impl-1920x1080.png'), fullPage: true });
  await page.setViewportSize({ width: 800, height: 600 });
  await sleep(500);
  await page.screenshot({ path: join(SHOTS_DIR, 'impl-800x600.png'), fullPage: true });

  // ASCII canvas dataURL
  const asciiDataUrl = await page.evaluate(() => {
    const canvas = globalThis.asciiPortfolio.ascii.canvas;
    return canvas.toDataURL();
  });
  const img = Buffer.from(asciiDataUrl.replace('data:image/png;base64,', ''), 'base64');
  writeFileSync(join(SHOTS_DIR, 'impl-ascii-canvas.png'), img);

  await browser.close();

  const report = {
    t1_centre_spread: {
      cx_min: cxMin, cx_max: cxMax, cx_spread: cxSpread,
      cy_min: cyMin, cy_max: cyMax, cy_spread: cySpread,
      target_spread_pct: `< 2%`,
      actual_cx_spread_pct: (cxSpread * 100).toFixed(2) + '%',
      actual_cy_spread_pct: (cySpread * 100).toFixed(2) + '%',
    },
    t1_viewports: t1Results.map(r => ({
      label: r.label,
      canvas: r.canvas,
      centralMassCenter: r.centralMass.fracCenter,
      centralMassSpan: r.centralMass.span,
      energyCentroid: r.metrics.energyCentroid,
      span: r.metrics.span,
    })),
    t2_regression_1080p: {
      pre_fix: pre1920,
      post_fix_energy_centroid: postEnergy,
      post_fix_central_mass_center: postCentral,
      post_fix_span: postSpan,
      centred_at_1080p: {
        cx: postCentral.cx.toFixed(4),
        cy: postCentral.cy.toFixed(4),
        within_tolerance: Math.abs(postCentral.cx - 0.5) < 0.02 && Math.abs(postCentral.cy - 0.5) < 0.02,
      },
    },
    t3_resize_storm: {
      storm_calls: 120,
      ascii_resize_calls: stormCounts.asciiResizes,
      composite_setSize_calls: stormCounts.compositeSizes,
      is_animating: isAnimating,
      size_after_storm: sizeCheck,
    },
    t4_dpr_change: dprTests,
    t5_degenerate: degenerateTests,
    errors,
    consoleMessages: consoleMsgs.slice(-50), // last 50
  };

  writeFileSync(join(SHOTS_DIR, 'impl-verify.json'), JSON.stringify(report, null, 2));
  console.log('Verification complete. Results in .shots/impl-verify.json');
  console.log(`Centre spread: cx=${cxSpread.toFixed(4)} (${(cxSpread*100).toFixed(2)}%), cy=${cySpread.toFixed(4)} (${(cySpread*100).toFixed(2)}%)`);
  console.log(`Storm: ${stormCounts.asciiResizeCalls ?? stormCounts.asciiResizes} ascii resizes, ${stormCounts.compositeSizes} composite sizes`);
  console.log(`Animating: ${isAnimating}`);
  console.log(`Errors: ${errors.length}`);
  if (errors.length > 0) console.error('ERRORS:', errors);
}

main().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
