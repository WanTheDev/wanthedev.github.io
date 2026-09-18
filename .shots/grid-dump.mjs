/**
 * grid-dump.mjs — deterministic text-grid dump of the ASCII glyph canvas
 *
 * Opens wanthedev.github.io at several viewports, reads the glyph canvas
 * pixels via getImageData, block-averages into a coarse grid, and writes a
 * human-readable .txt per viewport.
 *
 * Characters by luminance threshold (0–255):
 *   <  6   → ' '   (bg #050608 lum≈5.9)
 *   < 26   → '.'   (<10%)
 *   < 64   → ':'   (<25%)
 *   <115   → '*'   (<45%)
 *   <165   → 'o'   (<65%)
 *   <216   → 'O'   (<85%)
 *   >=216  → '#'
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/WanSou/AppData/Roaming/npm/node_modules/omniroute/node_modules/playwright-core/index.js');
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const PROJECT = resolve('F:/vibe-projects/wanthedev-github-io/wanthedev.github.io');
const SHOTS   = resolve(PROJECT, '.shots');
mkdirSync(SHOTS, { recursive: true });

const VIEWPORTS = [
  { name: '390x844',   w: 390,  h: 844,  cols: 48,  rows: 60  },
  { name: '1280x800',  w: 1280, h: 800,  cols: 96,  rows: 40  },
  { name: '1920x1080', w: 1920, h: 1080, cols: 96,  rows: 40  },
  { name: '1600x500',  w: 1600, h: 500,  cols: 96,  rows: 40  },
  { name: '320x480',   w: 320,  h: 480,  cols: 48,  rows: 60  },
];

const THRESHOLDS = [
  { char: ' ', lim: 0.025  },
  { char: '.', lim: 0.10  },
  { char: ':', lim: 0.25  },
  { char: '*', lim: 0.45  },
  { char: 'o', lim: 0.65  },
  { char: 'O', lim: 0.85  },
  { char: '#', lim: 1.00  },
];

function lum(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function cellChar(avgLum) {
  for (const t of THRESHOLDS) {
    if (avgLum <= t.lim * 255) return t.char;
  }
  return '#';
}

async function dumpPort(page, vp) {
  const { name, w, h } = vp;
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(2500);

  // Force resize so canvas matches viewport.
  await page.evaluate(() => {
    const api = globalThis.asciiPortfolio;
    if (api?.ascii) {
      api.ascii.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
    }
  });
  await page.waitForTimeout(800);

  const result = await page.evaluate(() => {
    const c = globalThis.asciiPortfolio.ascii.canvas;
    if (!c) throw new Error('no ascii canvas');
    const ctx = c.getContext('2d');
    const img = ctx.getImageData(0, 0, c.width, c.height);
    return {
      pw: c.width,
      ph: c.height,
      data: Array.from(img.data),
    };
  });

  const pw = result.pw;
  const ph = result.ph;
  const pixelData = result.data;
  const gridCols = vp.cols;
  const gridRows = vp.rows;
  const cellW = pw / gridCols;
  const cellH = ph / gridRows;

  // Block-average luminance per cell.
  const grid = [];
  for (let gy = 0; gy < gridRows; gy++) {
    const row = [];
    for (let gx = 0; gx < gridCols; gx++) {
      const x0 = Math.floor(gx * cellW);
      const x1 = Math.ceil((gx + 1) * cellW);
      const y0 = Math.floor(gy * cellH);
      const y1 = Math.ceil((gy + 1) * cellH);
      let sum = 0, count = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const px = Math.min(Math.max(x, 0), pw - 1);
          const py = Math.min(Math.max(y, 0), ph - 1);
          const i = (py * pw + px) * 4;
          sum += lum(pixelData[i], pixelData[i + 1], pixelData[i + 2]);
          count++;
        }
      }
      row.push(cellChar(sum / count));
    }
    grid.push(row);
  }

  // Occupied extent (first/last col/row with char above ' ').
  let minCol = gridCols, maxCol = -1, minRow = gridRows, maxRow = -1;
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      if (grid[r][c] !== ' ') {
        if (c < minCol) minCol = c;
        if (c > maxCol) maxCol = c;
        if (r < minRow) minRow = r;
        if (r > maxRow) maxRow = r;
      }
    }
  }
  if (maxCol < 0) { minCol = 0; maxCol = 0; minRow = 0; maxRow = 0; }

  const lines = [];
  lines.push(`# ${name}  canvas=${pw}x${ph}  grid=${gridCols}x${gridRows}`);
  lines.push(`# occupied: col ${minCol}..${maxCol} of ${gridCols - 1}  row ${minRow}..${maxRow} of ${gridRows - 1}`);
  lines.push(`# col fraction: ${(minCol / (gridCols - 1)).toFixed(4)} .. ${(maxCol / (gridCols - 1)).toFixed(4)}   row fraction: ${(minRow / (gridRows - 1)).toFixed(4)} .. ${(maxRow / (gridRows - 1)).toFixed(4)}`);
  lines.push('');
  for (const row of grid) {
    lines.push(row.join(''));
  }
  const text = lines.join('\n') + '\n';

  const outPath = resolve(SHOTS, `grid-${name}.txt`);
  writeFileSync(outPath, text, 'utf8');
  console.log(`WROTE ${outPath}`);
  console.log(text);
  console.log(`--- summary: ${name} canvas=${pw}x${ph}  occupied col ${minCol}..${maxCol} of ${gridCols - 1}  = ${(minCol/(gridCols-1)).toFixed(4)}..${(maxCol/(gridCols-1)).toFixed(4)}  row ${minRow}..${maxRow} of ${gridRows - 1}  = ${(minRow/(gridRows-1)).toFixed(4)}..${(maxRow/(gridRows-1)).toFixed(4)}`);
  return { name, minCol, maxCol, minRow, maxRow, gridCols, gridRows };
}

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-web-security','--no-sandbox'],
    headless: true,
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:5199/', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);

  const results = [];
  for (const vp of VIEWPORTS) {
    try {
      const r = await dumpPort(page, vp);
      results.push(r);
    } catch (e) {
      console.error(`FAILED ${vp.name}:`, e.message);
    }
  }

  await browser.close();

  console.log('\n\n=== OCCUPIED EXTENT SUMMARY ===');
  for (const r of results) {
    const { name, minCol, maxCol, minRow, maxRow, gridCols, gridRows } = r;
    const colFrac = (c) => `${(c / (gridCols - 1)).toFixed(4)}`;
    const rowFrac = (r2) => `${(r2 / (gridRows - 1)).toFixed(4)}`;
    console.log(`${name}: cols ${minCol}..${maxCol} (${colFrac(minCol)}..${colFrac(maxCol)})  rows ${minRow}..${maxRow} (${rowFrac(minRow)}..${rowFrac(maxRow)})`);
  }
  console.log('DONE');
})();
