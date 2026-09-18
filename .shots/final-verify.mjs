/**
 * final-verify.mjs — Knot framing verification across 12 viewports.
 *
 * Uses largest-connected-component on the downsampled glyph grid to isolate
 * the torus knot from the particle starfield. Takes ~12 samples per viewport
 * spaced ~500 ms apart and reports bbox centre/span, pixel counts, camera
 * distance, and ink fraction.
 *
 * Output: .shots/final-verify.json + one PNG per viewport.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/WanSou/AppData/Roaming/npm/node_modules/omniroute/node_modules/playwright-core/index.js');
import { writeFileSync, mkdirSync } from 'fs';

mkdirSync('.shots', { recursive: true });

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://localhost:5199';
const OUT = '.shots/final-verify.json';

const VIEWPORTS = [
  [1920, 1080], [1366, 768], [2560, 1440], [1280, 800],
  [1600, 500],  [1024, 768], [800, 600],   [390, 844],
  [360, 740],   [414, 896],  [320, 480],   [400, 3000],
];

const REALISTIC_LABELS = new Set([
  '1920x1080','1366x768','2560x1440','1280x800','1024x768','800x600',
  '390x844','360x740','414x896',
]);

async function measure(page, sampleIndex) {
  return await page.evaluate((sampleIndex) => {
    const { ascii } = globalThis.asciiPortfolio;
    const srcCtx = ascii.canvas.getContext('2d');
    const srcW = ascii.canvas.width;
    const srcH = ascii.canvas.height;
    const cols = ascii.columns;
    const rows = ascii.rows;

    // Downsample to glyph grid via offscreen canvas
    const oc = document.createElement('canvas');
    oc.width = cols; oc.height = rows;
    const octx = oc.getContext('2d');
    octx.drawImage(srcCtx.canvas, 0, 0, cols, rows);
    const imgData = octx.getImageData(0, 0, cols, rows);
    const d = imgData.data;

    const THRESH = 30;
    const mask = new Uint8Array(cols * rows);
    for (let i = 0; i < cols * rows; i++) {
      const pi = i * 4;
      const lum = d[pi]*0.2126 + d[pi+1]*0.7152 + d[pi+2]*0.0722;
      mask[i] = lum > THRESH ? 1 : 0;
    }

    // BFS 4-connected components
    const visited = new Uint8Array(cols * rows);
    const components = [];
    function bfs(sx, sy) {
      const q = [[sx, sy]];
      visited[sy*cols+sx] = 1;
      let minX=sx, minY=sy, maxX=sx, maxY=sy, count=0;
      while (q.length) {
        const [x, y] = q.pop();
        count++;
        if (x<minX) minX=x; if (x>maxX) maxX=x;
        if (y<minY) minY=y; if (y>maxY) maxY=y;
        for (const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          const nx=x+dx, ny=y+dy;
          if (nx>=0 && nx<cols && ny>=0 && ny<rows) {
            const idx=ny*cols+nx;
            if (mask[idx] && !visited[idx]) { visited[idx]=1; q.push([nx,ny]); }
          }
        }
      }
      return { minX, minY, maxX, maxY, count };
    }
    for (let y=0; y<rows; y++)
      for (let x=0; x<cols; x++)
        if (mask[y*cols+x] && !visited[y*cols+x])
          components.push(bfs(x,y));
    components.sort((a,b) => b.count - a.count);

    const largest = components[0] || { minX:0, minY:0, maxX:0, maxY:0, count:0 };
    const second = components[1] || { count:0 };

    const cx = largest.count > 0 ? ((largest.minX + largest.maxX)/2 + 0.5) / cols : 0.5;
    const cy = largest.count > 0 ? ((largest.minY + largest.maxY)/2 + 0.5) / rows : 0.5;
    const sx = largest.count > 0 ? (largest.maxX - largest.minX + 1) / cols : 0;
    const sy = largest.count > 0 ? (largest.maxY - largest.minY + 1) / rows : 0;

    // Ink fraction on full source canvas
    const sdata = srcCtx.getImageData(0, 0, srcW, srcH).data;
    let totalLit = 0, totalPx = srcW * srcH;
    for (let i = 0; i < totalPx; i++) {
      const pi = i * 4;
      const lum = sdata[pi]*0.2126 + sdata[pi+1]*0.7152 + sdata[pi+2]*0.0722;
      if (lum > THRESH) totalLit++;
    }

    const cam = globalThis.asciiPortfolio.camera;
    const camLen = Math.sqrt(cam.position.x**2 + cam.position.y**2 + cam.position.z**2);

    return {
      cols, rows, srcW, srcH,
      knotPixels: largest.count,
      secondPixels: second.count,
      cx, cy, sx, sy,
      bboxGrid: { minX: largest.minX, minY: largest.minY, maxX: largest.maxX, maxY: largest.maxY },
      top5Components: components.slice(0,5).map(c=>c.count),
      allLitPixels: totalLit,
      inkFraction: totalLit / totalPx,
      camLen,
      camFar: cam.far,
      camAspect: cam.aspect,
      sampleIndex,
    };
  }, sampleIndex);
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-web-security','--no-sandbox'],
    headless: true,
  });
  const page = await (await browser.newContext()).newPage();

  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForFunction(() => typeof globalThis.asciiPortfolio !== 'undefined', { timeout: 10000 });
  await sleep(1000);

  const allResults = [];
  const NUM_SAMPLES = 12;
  const SAMPLE_INTERVAL_MS = 500;

  for (const [vw, vh] of VIEWPORTS) {
    const label = `${vw}x${vh}`;
    console.log(`\n=== ${label} ===`);
    await page.setViewportSize({ width: vw, height: vh });
    await sleep(800);

    const samples = [];
    for (let s = 0; s < NUM_SAMPLES; s++) {
      await sleep(SAMPLE_INTERVAL_MS);
      const m = await measure(page, s);
      samples.push(m);
      console.log(`  s${s}: knot=${m.knotPixels}, 2nd=${m.secondPixels}, cx=${m.cx.toFixed(4)}, cy=${m.cy.toFixed(4)}, sx=${m.sx.toFixed(4)}, sy=${m.sy.toFixed(4)}, cam=${m.camLen.toFixed(2)}`);
    }

    // Aggregate
    let aggCx=0, aggCy=0, minSx=Infinity, maxSx=-Infinity, minSy=Infinity, maxSy=-Infinity;
    let minCam=Infinity, maxCam=-Infinity, minFar=Infinity, maxFar=-Infinity;
    let minInk=Infinity, maxInk=-Infinity, minKnot=Infinity, maxKnot=-Infinity;
    let min2nd=Infinity, max2nd=-Infinity;

    for (const sm of samples) {
      aggCx += sm.cx; aggCy += sm.cy;
      if (sm.sx < minSx) minSx = sm.sx; if (sm.sx > maxSx) maxSx = sm.sx;
      if (sm.sy < minSy) minSy = sm.sy; if (sm.sy > maxSy) maxSy = sm.sy;
      if (sm.camLen < minCam) minCam = sm.camLen; if (sm.camLen > maxCam) maxCam = sm.camLen;
      if (sm.camFar < minFar) minFar = sm.camFar; if (sm.camFar > maxFar) maxFar = sm.camFar;
      if (sm.inkFraction < minInk) minInk = sm.inkFraction; if (sm.inkFraction > maxInk) maxInk = sm.inkFraction;
      if (sm.knotPixels < minKnot) minKnot = sm.knotPixels; if (sm.knotPixels > maxKnot) maxKnot = sm.knotPixels;
      if (sm.secondPixels < min2nd) min2nd = sm.secondPixels; if (sm.secondPixels > max2nd) max2nd = sm.secondPixels;
    }

    // Screenshot
    const snapPath = `.shots/final-${label}.png`;
    await page.screenshot({ path: snapPath, type: 'png' });

    allResults.push({
      viewport: label, width: vw, height: vh,
      aggregated: {
        knotBBoxCenter: { cx: aggCx/NUM_SAMPLES, cy: aggCy/NUM_SAMPLES },
        knotBBoxSpan: { sx: maxSx, sy: maxSy },
        knotBBoxSpanMin: { sx: minSx, sy: minSy },
        knotPixelsMin: minKnot, knotPixelsMax: maxKnot,
        secondLargestPixelsMin: min2nd, secondLargestPixelsMax: max2nd,
        cameraDistanceMin: minCam, cameraDistanceMax: maxCam,
        cameraFarMin: minFar, cameraFarMax: maxFar,
        inkPixelFractionMin: minInk, inkPixelFractionMax: maxInk,
      },
      samples,
      screenshot: snapPath,
    });
  }

  // ─── Compute answers ──────────────────────────────────────────────────────
  const allCx = allResults.map(r => r.aggregated.knotBBoxCenter.cx);
  const allCy = allResults.map(r => r.aggregated.knotBBoxCenter.cy);
  const cxSpread = Math.max(...allCx) - Math.min(...allCx);
  const cySpread = Math.max(...allCy) - Math.min(...allCy);

  const realisticResults = allResults.filter(r => REALISTIC_LABELS.has(r.viewport));
  const rCx = realisticResults.map(r => r.aggregated.knotBBoxCenter.cx);
  const rCy = realisticResults.map(r => r.aggregated.knotBBoxCenter.cy);
  const realisticCxSpread = rCx.length ? Math.max(...rCx) - Math.min(...rCx) : 0;
  const realisticCySpread = rCy.length ? Math.max(...rCy) - Math.min(...rCy) : 0;

  const q1Violations = allResults.filter(r => r.aggregated.knotBBoxSpan.sx > 0.97 || r.aggregated.knotBBoxSpan.sy > 0.97);
  const q1RealisticViolations = realisticResults.filter(r => r.aggregated.knotBBoxSpan.sx > 0.97 || r.aggregated.knotBBoxSpan.sy > 0.97);
  const mainstreamLabels = ['1920x1080','1366x768','1280x800','1024x768','800x600','390x844','414x896'];
  const q3Violations = allResults.filter(r => mainstreamLabels.includes(r.viewport) && (r.aggregated.knotBBoxSpan.sx > 0.97 || r.aggregated.knotBBoxSpan.sy > 0.97));

  const minKnotOverAll = Math.min(...allResults.map(r => r.aggregated.knotPixelsMin));
  const minKnotViewport = allResults.find(r => r.aggregated.knotPixelsMin === minKnotOverAll)?.viewport;

  const minSxEntry = allResults.reduce((a,b) => a.aggregated.knotBBoxSpan.sx < b.aggregated.knotBBoxSpan.sx ? a : b);
  const maxSxEntry = allResults.reduce((a,b) => a.aggregated.knotBBoxSpan.sx > b.aggregated.knotBBoxSpan.sx ? a : b);
  const minSyEntry = allResults.reduce((a,b) => a.aggregated.knotBBoxSpan.sy < b.aggregated.knotBBoxSpan.sy ? a : b);
  const maxSyEntry = allResults.reduce((a,b) => a.aggregated.knotBBoxSpan.sy > b.aggregated.knotBBoxSpan.sy ? a : b);

  const report = {
    generatedAt: new Date().toISOString(),
    viewports: allResults.map(r => ({
      viewport: r.viewport, width: r.width, height: r.height,
      aggregated: r.aggregated, screenshot: r.screenshot,
    })),
    summary: {
      cxSpreadAll12: cxSpread,
      cySpreadAll12: cySpread,
      cxSpreadRealistic8: realisticCxSpread,
      cySpreadRealistic8: realisticCySpread,
      minSx: minSxEntry.aggregated.knotBBoxSpan.sx, minSxViewport: minSxEntry.viewport,
      maxSx: maxSxEntry.aggregated.knotBBoxSpan.sx, maxSxViewport: maxSxEntry.viewport,
      minSy: minSyEntry.aggregated.knotBBoxSpan.sy, minSyViewport: minSyEntry.viewport,
      maxSy: maxSyEntry.aggregated.knotBBoxSpan.sy, maxSyViewport: maxSyEntry.viewport,
    },
    questions: {
      Q1: {
        description: 'Is knotBBoxSpan.sx <= 0.97 and .sy <= 0.97 at EVERY viewport?',
        violations: q1Violations.map(r => ({ viewport: r.viewport, sx: r.aggregated.knotBBoxSpan.sx, sy: r.aggregated.knotBBoxSpan.sy })),
        realisticViolations: q1RealisticViolations.map(r => ({ viewport: r.viewport, sx: r.aggregated.knotBBoxSpan.sx, sy: r.aggregated.knotBBoxSpan.sy })),
        verdict: q1Violations.length === 0 ? 'PASS' : `FAIL (${q1Violations.length} violation(s))`,
      },
      Q2: {
        description: 'cx/cy spread across all 12 and across 8 realistic viewports.',
        all12: { cxSpread, cySpread, cxPct: (cxSpread*100).toFixed(2)+'%', cyPct: (cySpread*100).toFixed(2)+'%' },
        realistic8: { cxSpread: realisticCxSpread, cySpread: realisticCySpread, cxPct: (realisticCxSpread*100).toFixed(2)+'%', cyPct: (realisticCySpread*100).toFixed(2)+'%' },
        under2pct: cxSpread < 0.02 && cySpread < 0.02,
      },
      Q3: {
        description: 'Does Q1 fail among mainstream shapes?',
        violations: q3Violations.map(r => ({ viewport: r.viewport, sx: r.aggregated.knotBBoxSpan.sx, sy: r.aggregated.knotBBoxSpan.sy })),
        verdict: q3Violations.length === 0 ? 'PASS' : `FAIL (${q3Violations.length} violation(s))`,
      },
      Q4: {
        description: 'Every viewport has knotPixels > 0?',
        allHaveKnot: allResults.every(r => r.aggregated.knotPixelsMin > 0),
        smallestKnotPixels: minKnotOverAll,
        smallestKnotViewport: minKnotViewport,
        verdict: allResults.every(r => r.aggregated.knotPixelsMin > 0) ? 'PASS' : 'FAIL',
      },
    },
    errors,
  };

  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(`\nReport: ${OUT}`);
  console.log(`Q1: ${report.questions.Q1.verdict}`);
  console.log(`Q2: cx=${(cxSpread*100).toFixed(2)}% cy=${(cySpread*100).toFixed(2)}% (all 12); realistic8: cx=${(realisticCxSpread*100).toFixed(2)}% cy=${(realisticCySpread*100).toFixed(2)}%`);
  console.log(`Q3: ${report.questions.Q3.verdict}`);
  console.log(`Q4: ${report.questions.Q4.verdict}, min knotPixels=${minKnotOverAll} at ${minKnotViewport}`);

  await browser.close();
}

main().catch(err => { console.error(err); process.exit(1); });
