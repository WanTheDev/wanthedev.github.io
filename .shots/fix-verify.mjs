import playwrightCore from 'file:///C:/Users/WanSou/AppData/Roaming/npm/node_modules/omniroute/node_modules/playwright-core/index.js';
import { writeFileSync } from 'fs';
const { chromium } = playwrightCore;

const VIEWPORTS = [
  [1920, 1080], [2560, 1440], [1366, 768], [1280, 800],
  [1600, 500], [1024, 768], [800, 600],
  [390, 844], [360, 740], [320, 480], [414, 896],
  [400, 3000]
];

const OUT_JSON = '.shots/fix-verify.json';
const OUT_DIR = '.shots';

async function main() {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-web-security','--no-sandbox']
  });

  const results = [];

  for (const [W, H] of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: W, height: H });
    await page.goto('http://localhost:5199', { waitUntil: 'networkidle', timeout: 30000 });
    // Wait for asciiPortfolio to be available
    await page.waitForFunction(() => globalThis.asciiPortfolio !== undefined, { timeout: 30000 });
    // Wait for animation to settle
    await page.waitForTimeout(1000);

    // Read ascii canvas pixels and camera state in one evaluate
    const data = await page.evaluate(() => {
      const api = globalThis.asciiPortfolio;
      if (!api) throw new Error('asciiPortfolio not found');

      const ctx = api.ascii.canvas.getContext('2d');
      const cw = api.ascii.canvas.width;
      const ch = api.ascii.canvas.height;
      const img = ctx.getImageData(0, 0, cw, ch);
      const pixels = img.data;

      // Build energy map: luminance per pixel, threshold > 8
      const THRESH = 8;
      let inkCount = 0;
      let lx = 0, ly = 0, lxx = 0, lyy = 0, lxy = 0;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          const i = (y * cw + x) * 4;
          const r = pixels[i], g = pixels[i+1], b = pixels[i+2];
          const lum = 0.299*r + 0.587*g + 0.114*b;
          if (lum > THRESH) {
            inkCount++;
            lx += x; ly += y;
            lxx += x*x; lyy += y*y; lxy += x*y;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      const totalPixels = cw * ch;
      const centroidX = inkCount > 0 ? lx / inkCount : -1;
      const centroidY = inkCount > 0 ? ly / inkCount : -1;

      const marginX = Math.floor(cw * 0.02);
      const marginY = Math.floor(ch * 0.02);
      const bboxMinX = Math.max(minX, marginX);
      const bboxMinY = Math.max(minY, marginY);
      const bboxMaxX = Math.min(maxX, cw - 1 - marginX);
      const bboxMaxY = Math.min(maxY, ch - 1 - marginY);
      const usedMargin = (minX < marginX || maxY > ch - 1 - marginY);

      const cam = api.camera;
      const dirArr = [0, 0, -1]; // Placeholder for camera direction

      return {
        canvasW: cw,
        canvasH: ch,
        inkCount,
        totalPixels,
        inkPixelFraction: inkCount / totalPixels,
        inkBbox: {
          x0: minX / cw, y0: minY / ch,
          x1: (maxX + 1) / cw, y1: (maxY + 1) / ch,
          x0m: bboxMinX / cw, y0m: bboxMinY / ch,
          x1m: (bboxMaxX + 1) / cw, y1m: (bboxMaxY + 1) / ch,
          marginApplied: usedMargin
        },
        inkCentroid: {
          cx: centroidX / cw,
          cy: centroidY / ch
        },
        inkFillX: (maxX - minX + 1) / cw,
        inkFillY: (maxY - minY + 1) / ch,
        camera: {
          far: cam.far,
          aspect: cam.aspect,
          fov: cam.fov,
          position: [cam.position.x, cam.position.y, cam.position.z],
          worldDir: dirArr
        }
      };
    });

    // Screenshot
    const pngPath = `${OUT_DIR}/fix-verify-${W}x${H}.png`;
    await page.screenshot({ path: pngPath, fullPage: false });
    await page.close();

    results.push({ viewport: `${W}x${H}`, ...data });
    console.log(`[${W}x${H}] inkPF=${data.inkPixelFraction.toFixed(6)} cx=${data.inkCentroid.cx.toFixed(4)} cy=${data.inkCentroid.cy.toFixed(4)} fillX=${data.inkFillX.toFixed(4)} fillY=${data.inkFillY.toFixed(4)} bbox=${JSON.stringify(data.inkBbox)}`);
  }

  // Aggregate stats
  const cxs = results.map(r => r.inkCentroid.cx);
  const cys = results.map(r => r.inkCentroid.cy);
  const fillsX = results.map(r => r.inkFillX);
  const fillsY = results.map(r => r.inkFillY);

  const minCx = Math.min(...cxs), maxCx = Math.max(...cxs);
  const minCy = Math.min(...cys), maxCy = Math.max(...cys);
  const minFxE = Math.min(...fillsX), maxFxE = Math.max(...fillsX);
  const minFyE = Math.min(...fillsY), maxFyE = Math.max(...fillsY);

  const minCxVp = results.find(r => r.inkCentroid.cx === minCx);
  const maxCxVp = results.find(r => r.inkCentroid.cx === maxCx);
  const minCyVp = results.find(r => r.inkCentroid.cy === minCy);
  const maxCyVp = results.find(r => r.inkCentroid.cy === maxCy);
  const minFxVp = results.find(r => r.inkFillX === minFxE);
  const maxFxVp = results.find(r => r.inkFillX === maxFxE);
  const minFyVp = results.find(r => r.inkFillY === minFyE);
  const maxFyVp = results.find(r => r.inkFillY === maxFyE);

  const spreadCx = maxCx - minCx;
  const spreadCy = maxCy - minCy;

  // Q1: any bbox out of frame (using raw, unmargin'd bbox)
  const outOfFrame = results.filter(r => {
    const b = r.inkBbox;
    return b.x0 < 0 || b.x1 > 1 || b.y0 < 0 || b.y1 > 1;
  });

  // Q2: portrait/odd viewports visibility
  const portraitVps = ['390x844', '360x740', '320x480', '414x896', '400x3000'];
  const portraitResults = results.filter(r => portraitVps.includes(r.viewport));

  // Q3: centroid within 0.46..0.54
  const centroidFailures = results.filter(r => r.inkCentroid.cx < 0.46 || r.inkCentroid.cx > 0.54);

  // Q4: fillX in [0.35, 0.98]
  const fillXFailures = results.filter(r => r.inkFillX < 0.35 || r.inkFillX > 0.98);

  const report = {
    results,
    summary: {
      spreadCx: +spreadCx.toFixed(6),
      spreadCy: +spreadCy.toFixed(6),
      minCx: +minCx.toFixed(6), maxCx: +maxCx.toFixed(6),
      minCxViewport: minCxVp.viewport,
      maxCxViewport: maxCxVp.viewport,
      minCy: +minCy.toFixed(6), maxCy: +maxCy.toFixed(6),
      minCyViewport: minCyVp.viewport,
      maxCyViewport: maxCyVp.viewport,
      minFillX: +minFxE.toFixed(6), maxFillX: +maxFxE.toFixed(6),
      minFillXViewport: minFxVp.viewport,
      maxFillXViewport: maxFxVp.viewport,
      minFillY: +minFyE.toFixed(6), maxFillY: +maxFyE.toFixed(6),
      minFillYViewport: minFyVp.viewport,
      maxFillYViewport: maxFyVp.viewport
    },
    questions: {
      Q1_outOfFrame: outOfFrame.map(r => ({ viewport: r.viewport, bbox: r.inkBbox })),
      Q2_portraitVisibility: portraitResults.map(r => ({
        viewport: r.viewport,
        inkPixelFraction: r.inkPixelFraction,
        visible: r.inkPixelFraction > 0.001
      })),
      Q3_centroidInFrame: {
        min: +minCx.toFixed(6), max: +maxCx.toFixed(6),
        minViewport: minCxVp.viewport, maxViewport: maxCxVp.viewport,
        pass: minCx >= 0.46 && maxCx <= 0.54
      },
      Q4_fillXRange: {
        min: +minFxE.toFixed(6), max: +maxFxE.toFixed(6),
        minViewport: minFxVp.viewport, maxViewport: maxFxVp.viewport,
        pass: minFxE >= 0.35 && maxFxE <= 0.98
      }
    }
  };

  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify(report.summary, null, 2));
  console.log('\n=== QUESTIONS ===');
  console.log(JSON.stringify(report.questions, null, 2));

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
