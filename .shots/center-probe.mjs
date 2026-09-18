/**
 * Center-probe: measure the visual center of the ASCII torus knot across
 * viewports, time samples, and geometry analysis.
 * 
 * Output: .shots/center-probe.json + screenshots
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/WanSou/AppData/Roaming/npm/node_modules/omniroute/node_modules/playwright-core/index.js');
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const SHOTS_DIR = 'F:/vibe-projects/wanthedev-github-io/wanthedev.github.io/.shots';
mkdirSync(SHOTS_DIR, { recursive: true });

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

async function waitForPortfolio(page, url, waitMs = 2000) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => typeof globalThis.asciiPortfolio !== 'undefined', {}, { timeout: 10000 });
  await sleep(waitMs);
}

// Get ascii canvas pixel data and compute metrics
async function getAsciiMetrics(page, thresholds = [25, 60, 120]) {
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
      let sumLum = 0, sumLumSq = 0;
      let sumXLum = 0, sumYLum = 0;      // linear energy centroid
      let sumXLumSq = 0, sumYLumSq = 0;   // squared energy centroid
      
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2];
          const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          if (lum > L) {
            litCount++;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            
            sumLum += lum;
            sumLumSq += lum * lum;
            sumXLum += x * lum;
            sumYLum += y * lum;
            sumXLumSq += x * lum * lum;
            sumYLumSq += y * lum * lum;
          }
        }
      }
      
      const name = `L${L}`;
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
        energySqCentroid: {
          cx: sumLumSq > 0 ? sumXLumSq / sumLumSq / w : 0.5,
          cy: sumLumSq > 0 ? sumYLumSq / sumLumSq / h : 0.5,
        },
      };
    }
    
    return {
      canvas: { width: w, height: h },
      metrics: results,
    };
  }, thresholds);
}

// Get projected geometry data (task 2)
async function getProjectedGeometry(page) {
  return await page.evaluate(() => {
    const { scene, camera } = globalThis.asciiPortfolio;
    
    const projMat = camera.projectionMatrix.elements;
    const viewMat = camera.matrixWorldInverse.elements;
    
    // Find knot mesh (flatShading=true) and halo mesh
    let knotMesh = null, haloMesh = null;
    let knotCount = 0, haloCount = 0;
    
    scene.traverse((obj) => {
      if (obj.isMesh && obj.geometry.type === 'TorusKnotGeometry') {
        if (obj.material.flatShading === true) {
          knotMesh = obj;
          knotCount++;
        } else {
          haloMesh = obj;
          haloCount++;
        }
      }
    });
    
    function transformVertices(mesh) {
      const pos = mesh.geometry.attributes.position.array;
      const count = pos.length / 3;
      const mw = mesh.matrixWorld.elements;
      
      const clipped = [];
      const visible = [];
      
      for (let i = 0; i < count; i++) {
        // Transform by world matrix
        const x = pos[i*3], y = pos[i*3+1], z = pos[i*3+2];
        const wx = mw[0]*x + mw[4]*y + mw[8]*z + mw[12];
        const wy = mw[1]*x + mw[5]*y + mw[9]*z + mw[13];
        const wz = mw[2]*x + mw[6]*y + mw[10]*z + mw[14];
        
        // Transform by view matrix
        const vx = viewMat[0]*wx + viewMat[4]*wy + viewMat[8]*wz + viewMat[12];
        const vy = viewMat[1]*wx + viewMat[5]*wy + viewMat[9]*wz + viewMat[13];
        const vz = viewMat[2]*wx + viewMat[6]*wy + viewMat[10]*wz + viewMat[14];
        const vw = viewMat[3]*wx + viewMat[7]*wy + viewMat[11]*wz + viewMat[15];
        
        // Transform by projection matrix
        const cx = projMat[0]*vx + projMat[4]*vy + projMat[8]*vz + projMat[12]*vw;
        const cy = projMat[1]*vx + projMat[5]*vy + projMat[9]*vz + projMat[13]*vw;
        const cw = projMat[3]*vx + projMat[7]*vy + projMat[11]*vz + projMat[15]*vw;
        
        if (cw > 0) {
          const fx = cx / cw;
          const fy = cy / cw;
          visible.push({ fx, fy, w: cw });
        }
        clipped.push({ fx: cx / cw, fy: cy / cw, w: cw, clipFail: cw <= 0 });
      }
      
      return { clipped, visible };
    }
    
    function computeMetrics(vertices) {
      if (vertices.length === 0) return { bboxCenter: {fx:0.5,fy:0.5}, vertexMean: {fx:0.5,fy:0.5}, bbox: {fxMin:0,fxMax:1,fyMin:0,fyMax:1}, clipped: false };
      
      let fxMin = Infinity, fxMax = -Infinity, fyMin = Infinity, fyMax = -Infinity;
      let sumFx = 0, sumFy = 0;
      
      for (const v of vertices) {
        if (v.fx < fxMin) fxMin = v.fx;
        if (v.fx > fxMax) fxMax = v.fx;
        if (v.fy < fyMin) fyMin = v.fy;
        if (v.fy > fyMax) fyMax = v.fy;
        sumFx += v.fx;
        sumFy += v.fy;
      }
      
      const n = vertices.length;
      return {
        bbox: { fxMin, fxMax, fyMin, fyMax },
        bboxCenter: { fx: (fxMin + fxMax) / 2, fy: (fyMin + fyMax) / 2 },
        vertexMean: { fx: sumFx / n, fy: sumFy / n },
        clipped: fxMin < 0 || fxMax > 1 || fyMin < 0 || fyMax > 1,
      };
    }
    
    const knotResult = knotMesh ? computeMetrics(transformVertices(knotMesh).visible) : null;
    const haloResult = haloMesh ? computeMetrics(transformVertices(haloMesh).visible) : null;
    
    // Union bbox
    let unionBbox = null;
    if (knotResult && haloResult) {
      unionBbox = {
        fxMin: Math.min(knotResult.bbox.fxMin, haloResult.bbox.fxMin),
        fxMax: Math.max(knotResult.bbox.fxMax, haloResult.bbox.fxMax),
        fyMin: Math.min(knotResult.bbox.fyMin, haloResult.bbox.fyMin),
        fyMax: Math.max(knotResult.bbox.fyMax, haloResult.bbox.fyMax),
        center: {
          fx: (Math.min(knotResult.bbox.fxMin, haloResult.bbox.fxMin) + Math.max(knotResult.bbox.fxMax, haloResult.bbox.fxMax)) / 2,
          fy: (Math.min(knotResult.bbox.fyMin, haloResult.bbox.fyMin) + Math.max(knotResult.bbox.fyMax, haloResult.bbox.fyMax)) / 2,
        }
      };
    }
    
    return {
      knot: knotResult,
      halo: haloResult,
      union: unionBbox,
      camera: {
        fov: camera.fov,
        aspect: camera.aspect,
        position: camera.position.toArray(),
        target: null, // can't read directly but we know it
      }
    };
  });
}

// Get local geometry metrics (task 4)
async function getLocalGeometry(page) {
  return await page.evaluate(() => {
    const { scene } = globalThis.asciiPortfolio;
    
    let knotMesh = null, haloMesh = null;
    
    scene.traverse((obj) => {
      if (obj.isMesh && obj.geometry.type === 'TorusKnotGeometry') {
        if (obj.material.flatShading === true) knotMesh = obj;
        else haloMesh = obj;
      }
    });
    
    function analyzeMesh(mesh, name) {
      const pos = mesh.geometry.attributes.position.array;
      const count = pos.length / 3;
      
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;
      let sumX = 0, sumY = 0, sumZ = 0;
      
      for (let i = 0; i < count; i++) {
        const x = pos[i*3], y = pos[i*3+1], z = pos[i*3+2];
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
        sumX += x; sumY += y; sumZ += z;
      }
      
      return {
        name,
        count,
        bbox: {
          min: [minX, minY, minZ],
          max: [maxX, maxY, maxZ],
          center: [(minX+maxX)/2, (minY+maxY)/2, (minZ+maxZ)/2],
        },
        vertexMean: [sumX/count, sumY/count, sumZ/count],
        boundsFromOrigin: Math.sqrt(
          Math.pow((sumX/count), 2) + Math.pow((sumY/count), 2) + Math.pow((sumZ/count), 2)
        ),
      };
    }
    
    const knot = knotMesh ? analyzeMesh(knotMesh, 'knot') : null;
    const halo = haloMesh ? analyzeMesh(haloMesh, 'halo') : null;
    
    // Get world-transformed union bbox
    let unionMin = [Infinity, Infinity, Infinity];
    let unionMax = [-Infinity, -Infinity, -Infinity];
    
    for (const mesh of [knotMesh, haloMesh].filter(Boolean)) {
      mesh.updateMatrixWorld();
      const pos = mesh.geometry.attributes.position.array;
      const count = pos.length / 3;
      const mw = mesh.matrixWorld.elements;
      
      for (let i = 0; i < count; i++) {
        const x = pos[i*3], y = pos[i*3+1], z = pos[i*3+2];
        const wx = mw[0]*x + mw[4]*y + mw[8]*z + mw[12];
        const wy = mw[1]*x + mw[5]*y + mw[9]*z + mw[13];
        const wz = mw[2]*x + mw[6]*y + mw[10]*z + mw[14];
        
        if (wx < unionMin[0]) unionMin[0] = wx; if (wx > unionMax[0]) unionMax[0] = wx;
        if (wy < unionMin[1]) unionMin[1] = wy; if (wy > unionMax[1]) unionMax[1] = wy;
        if (wz < unionMin[2]) unionMin[2] = wz; if (wz > unionMax[2]) unionMax[2] = wz;
      }
    }
    
    return {
      knot,
      halo,
      unionWorldBbox: {
        min: unionMin,
        max: unionMax,
        center: [(unionMin[0]+unionMax[0])/2, (unionMin[1]+unionMax[1])/2, (unionMin[2]+unionMax[2])/2],
      }
    };
  });
}

async function main() {
  const browser = await launchBrowser();
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  console.log('Loading page...');
  await waitForPortfolio(page, 'http://localhost:5199');
  
  const RESULTS = {
    task1: [],
    task2: [],
    task3: [],
    task4: {},
    verdicts: {},
  };
  
  // ========== TASK 1: Viewport centering ==========
  console.log('\n=== TASK 1: Viewport centering ===');
  const viewports = [
    [1920, 1080], [2560, 1440], [1280, 800], [1024, 768],
    [800, 600], [1600, 500], [1366, 768], [390, 844], [320, 480]
  ];
  
  for (const [w, h] of viewports) {
    await page.setViewportSize({ width: w, height: h });
    await sleep(700);
    
    page.evaluate(() => {
      globalThis.asciiPortfolio.pause();
      globalThis.asciiPortfolio.render(0);
    });
    await sleep(300);
    
    const metrics = await getAsciiMetrics(page, [25, 60, 120]);
    const info = await page.evaluate(() => ({
      win: [window.innerWidth, window.innerHeight, window.devicePixelRatio],
      ascii: { columns: globalThis.asciiPortfolio.ascii.columns, rows: globalThis.asciiPortfolio.ascii.rows }
    }));
    
    const entry = {
      label: `${w}x${h}`,
      win: info.win,
      ascii: info.ascii,
      canvas: metrics.canvas,
      thresholds: {},
    };
    
    for (const [key, m] of Object.entries(metrics.metrics)) {
      entry.thresholds[key] = {
        litCount: m.litCount,
        bbox: m.bbox,
        fracCenter: m.fracCenter,
        span: m.span,
        energyCentroid: m.energyCentroid,
        energySqCentroid: m.energySqCentroid,
      };
    }
    
    RESULTS.task1.push(entry);
    
    console.log(`  ${w}x${h}: energy_cx=${entry.thresholds.L60.energyCentroid.cx.toFixed(4)}, cy=${entry.thresholds.L60.energyCentroid.cy.toFixed(4)}`);
    
    // Save screenshots for key viewports
    if ((w === 1920 && h === 1080) || (w === 800 && h === 600)) {
      const pngData = await page.evaluate(() => globalThis.asciiPortfolio.ascii.canvas.toDataURL('image/png'));
      const buffer = Buffer.from(pngData.replace(/^data:image\/png;base64,/, ''), 'base64');
      writeFileSync(join(SHOTS_DIR, `center-${w}x${h}.png`), buffer);
    }
  }
  
  // Compute spread for task 1
  const cxVals = RESULTS.task1.map(e => e.thresholds.L60.energyCentroid.cx);
  const cyVals = RESULTS.task1.map(e => e.thresholds.L60.energyCentroid.cy);
  RESULTS.verdicts.t1_spread = {
    cx: { min: Math.min(...cxVals), max: Math.max(...cxVals), spread: Math.max(...cxVals) - Math.min(...cxVals) },
    cy: { min: Math.min(...cyVals), max: Math.max(...cyVals), spread: Math.max(...cyVals) - Math.min(...cyVals) },
  };
  console.log(`  T1 spread: cx=${RESULTS.verdicts.t1_spread.cx.spread.toFixed(4)}, cy=${RESULTS.verdicts.t1_spread.cy.spread.toFixed(4)}`);
  
  // ========== TASK 2: Projected geometry ==========
  console.log('\n=== TASK 2: Projected geometry (1920x1080) ===');
  page.evaluate(() => {
    globalThis.asciiPortfolio.pause();
    globalThis.asciiPortfolio.render(0);
  });
  await sleep(300);
  
  const projData = await getProjectedGeometry(page);
  RESULTS.task2.push({
    viewport: '1920x1080',
    knot: projData.knot,
    halo: projData.halo,
    union: projData.union,
    camera: projData.camera,
  });
  
  console.log(`  Knot bbox center: fx=${projData.knot.bboxCenter.fx.toFixed(4)}, fy=${projData.knot.bboxCenter.fy.toFixed(4)}`);
  console.log(`  Knot vertex mean: fx=${projData.knot.vertexMean.fx.toFixed(4)}, fy=${projData.knot.vertexMean.fy.toFixed(4)}`);
  console.log(`  Clipped: ${projData.knot.clipped}`);
  
  // Also check portrait viewports for clipping
  for (const [w, h] of [[390, 844], [320, 480]]) {
    await page.setViewportSize({ width: w, height: h });
    await sleep(700);
    page.evaluate(() => {
      globalThis.asciiPortfolio.pause();
      globalThis.asciiPortfolio.render(0);
    });
    await sleep(300);
    
    const proj = await getProjectedGeometry(page);
    RESULTS.task2.push({
      viewport: `${w}x${h}`,
      knot: proj.knot,
      halo: proj.halo,
      union: proj.union,
      camera: proj.camera,
    });
    console.log(`  ${w}x${h}: clipped=${proj.knot.clipped}, center=(${proj.knot.bboxCenter.fx.toFixed(4)},${proj.knot.bboxCenter.fy.toFixed(4)})`);
  }
  
  // Compare with rendered centroid
  const t1Entry = RESULTS.task1.find(e => e.label === '1920x1080');
  if (t1Entry && projData.knot) {
    const renderedCx = t1Entry.thresholds.L60.energyCentroid.cx;
    const renderedCy = t1Entry.thresholds.L60.energyCentroid.cy;
    const projectedCx = projData.knot.bboxCenter.fx;
    const projectedCy = projData.knot.bboxCenter.fy;
    RESULTS.task2.comparison = {
      renderedCentroid: { cx: renderedCx, cy: renderedCy },
      projectedBboxCenter: { fx: projectedCx, fy: projectedCy },
      diff: {
        cx: Math.abs(renderedCx - projectedCx),
        cy: Math.abs(renderedCy - projectedCy),
      }
    };
    console.log(`  Rendered vs projected offset: dx=${(RESULTS.task2.comparison.diff.cx*100).toFixed(2)}%, dy=${(RESULTS.task2.comparison.diff.cy*100).toFixed(2)}%`);
  }
  
  // ========== TASK 3: Drift over time ==========
  console.log('\n=== TASK 3: Drift over time ===');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await sleep(700);
  
  const timeSamples = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20];
  
  for (const t of timeSamples) {
    page.evaluate((time) => {
      globalThis.asciiPortfolio.pause();
      globalThis.asciiPortfolio.render(time);
    }, t);
    await sleep(200);
    
    const metrics = await getAsciiMetrics(page, [60]);
    const proj = await getProjectedGeometry(page);
    
    RESULTS.task3.push({
      time: t,
      renderedCentroid: metrics.metrics.L60.energyCentroid,
      projectedBboxCenter: proj.knot.bboxCenter,
      projectedVertexMean: proj.knot.vertexMean,
    });
    
    console.log(`  t=${t}s: rendered=(${metrics.metrics.L60.energyCentroid.cx.toFixed(4)},${metrics.metrics.L60.energyCentroid.cy.toFixed(4)}) projected=(${proj.knot.bboxCenter.fx.toFixed(4)},${proj.knot.bboxCenter.fy.toFixed(4)})`);
  }
  
  // Compute drift range
  const driftCx = RESULTS.task3.map(e => e.renderedCentroid.cx);
  const driftCy = RESULTS.task3.map(e => e.renderedCentroid.cy);
  const projDriftCx = RESULTS.task3.map(e => e.projectedVertexMean.fx);
  const projDriftCy = RESULTS.task3.map(e => e.projectedVertexMean.fy);
  RESULTS.verdicts.t3_drift = {
    rendered: {
      cx: { range: Math.max(...driftCx) - Math.min(...driftCx), min: Math.min(...driftCx), max: Math.max(...driftCx) },
      cy: { range: Math.max(...driftCy) - Math.min(...driftCy), min: Math.min(...driftCy), max: Math.max(...driftCy) },
    },
    projected: {
      cx: { range: Math.max(...projDriftCx) - Math.min(...projDriftCx), min: Math.min(...projDriftCx), max: Math.max(...projDriftCx) },
      cy: { range: Math.max(...projDriftCy) - Math.min(...projDriftCy), min: Math.min(...projDriftCy), max: Math.max(...projDriftCy) },
    }
  };
  console.log(`  Drift range: rendered_cx=${(RESULTS.verdicts.t3_drift.rendered.cx.range*100).toFixed(2)}%, proj_cx=${(RESULTS.verdicts.t3_drift.projected.cx.range*100).toFixed(2)}%`);
  
  // ========== TASK 4: Geometry asymmetry ==========
  console.log('\n=== TASK 4: Geometry asymmetry ===');
  const geoData = await getLocalGeometry(page);
  RESULTS.task4 = geoData;
  
  console.log(`  Knot bbox center: (${geoData.knot.bbox.center[0].toFixed(4)}, ${geoData.knot.bbox.center[1].toFixed(4)}, ${geoData.knot.bbox.center[2].toFixed(4)})`);
  console.log(`  Knot vertex mean: (${geoData.knot.vertexMean[0].toFixed(4)}, ${geoData.knot.vertexMean[1].toFixed(4)}, ${geoData.knot.vertexMean[2].toFixed(4)})`);
  console.log(`  Bounds from origin: ${geoData.knot.boundsFromOrigin.toFixed(4)}`);
  
  if (geoData.halo) {
    console.log(`  Halo bbox center: (${geoData.halo.bbox.center[0].toFixed(4)}, ${geoData.halo.bbox.center[1].toFixed(4)}, ${geoData.halo.bbox.center[2].toFixed(4)})`);
    console.log(`  Halo vertex mean: (${geoData.halo.vertexMean[0].toFixed(4)}, ${geoData.halo.vertexMean[1].toFixed(4)}, ${geoData.halo.vertexMean[2].toFixed(4)})`);
  }
  
  console.log(`  Union world bbox center: (${geoData.unionWorldBbox.center[0].toFixed(4)}, ${geoData.unionWorldBbox.center[1].toFixed(4)}, ${geoData.unionWorldBbox.center[2].toFixed(4)})`);
  
  // ========== TASK 5: Verdicts ==========
  console.log('\n=== TASK 5: Verdicts ===');
  
  // 5a: Offset at 1920x1080
  const t1_1920 = RESULTS.task1.find(e => e.label === '1920x1080');
  const t2_1920 = RESULTS.task2.find(e => e.viewport === '1920x1080');
  
  const offsetCx = (t1_1920.thresholds.L60.energyCentroid.cx - 0.5) * 100;
  const offsetCy = (t1_1920.thresholds.L60.energyCentroid.cy - 0.5) * 100;
  RESULTS.verdicts.a_offset = {
    rendered: { cx_percent: offsetCx, cy_percent: offsetCy },
    projected_bbox_center: {
      fx: t2_1920.knot.bboxCenter.fx,
      fy: t2_1920.knot.bboxCenter.fy,
    },
    projected_vertex_mean: {
      fx: t2_1920.knot.vertexMean.fx,
      fy: t2_1920.knot.vertexMean.fy,
    },
  };
  console.log(`  (a) Offset at 1920x1080: cx=${offsetCx.toFixed(2)}% W, cy=${offsetCy.toFixed(2)}% H`);
  
  // 5b: Constancy across viewports
  RESULTS.verdicts.b_constancy = {
    cx_spread_pct: (RESULTS.verdicts.t1_spread.cx.spread * 100).toFixed(2),
    cy_spread_pct: (RESULTS.verdicts.t1_spread.cy.spread * 100).toFixed(2),
  };
  console.log(`  (b) Center constancy: cx spread=${RESULTS.verdicts.b_constancy.cx_spread_pct}% W, cy spread=${RESULTS.verdicts.b_constancy.cy_spread_pct}% H`);
  
  // 5c: Drift constancy
  RESULTS.verdicts.c_drift = {
    rendered_cx_range_pct: (RESULTS.verdicts.t3_drift.rendered.cx.range * 100).toFixed(2),
    rendered_cy_range_pct: (RESULTS.verdicts.t3_drift.rendered.cy.range * 100).toFixed(2),
    projected_cx_range_pct: (RESULTS.verdicts.t3_drift.projected.cx.range * 100).toFixed(2),
    projected_cy_range_pct: (RESULTS.verdicts.t3_drift.projected.cy.range * 100).toFixed(2),
  };
  console.log(`  (c) Drift: rendered cx=${RESULTS.verdicts.c_drift.rendered_cx_range_pct}% W, projected cx=${RESULTS.verdicts.c_drift.projected_cx_range_pct}% W`);
  
  // 5d: Clipping
  const clipping = RESULTS.task2.map(e => ({ viewport: e.viewport, clipped: e.knot.clipped }));
  RESULTS.verdicts.d_clipping = clipping;
  console.log(`  (d) Clipping: ${clipping.map(c => `${c.viewport}=${c.clipped}`).join(', ')}`);
  
  // 5e: Camera correction
  // Camera is at (0,0,10.5) looking at T=(0.75,-0.75,0), fov=46
  const fov = projData.camera.fov * Math.PI / 180;
  const camDist = 10.5;
  const halfFov = fov / 2;
  const tanHalfFov = Math.tan(halfFov);
  
  // At the target plane (z=0 in camera space), 1 unit = frameHeight / (2 * dist * tan(fov/2)) pixels
  // Actually, let's compute in world units per pixel at the target distance
  // The camera looks along -Z, target is at distance camDist along camera's -Z axis
  // But target T is not at (0,0,-camDist) from camera... camera is at (0,0,10.5) looking at (0.75,-0.75,0)
  // Direction vector: (0.75, -0.75, -10.5), length = sqrt(0.75^2 + 0.75^2 + 10.5^2)
  const dirLen = Math.sqrt(0.75*0.75 + 0.75*0.75 + 10.5*10.5);
  const targetDist = dirLen;
  
  // At distance targetDist, the visible height = 2 * targetDist * tan(fov/2)
  const visibleHeight = 2 * targetDist * tanHalfFov;
  const visibleWidth_1920 = visibleHeight * (1920 / 1080);
  
  // World units per pixel
  const wpu_x = visibleWidth_1920 / 1920;
  const wpu_y = visibleHeight / 1080;
  
  // Current offset in world units
  const offsetWorldX = offsetCx / 100 * visibleWidth_1920 / 2; // positive = right of center
  const offsetWorldY = -offsetCy / 100 * visibleHeight / 2;   // positive = below center (inverted)
  
  // Correction needed: move target BY the offset (to bring object TO center)
  // If object is to the RIGHT of center (positive cx offset), we need to move target RIGHT
  const correctionX = offsetCx / 100 * visibleWidth_1920 / 2;
  const correctionY = offsetCy / 100 * visibleHeight / 2; // sign: if cy > 0.5, object is BELOW center, need to move target DOWN (negative Y)
  
  const currentTarget = { x: 0.75, y: -0.75, z: 0 };
  const correctedTarget = {
    x: currentTarget.x + correctionX,
    y: currentTarget.y - correctionY,  // screen Y is inverted
    z: currentTarget.z,
  };
  
  RESULTS.verdicts.e_correction = {
    fov_degrees: projData.camera.fov,
    camera_position: projData.camera.position,
    target_distance: targetDist.toFixed(4),
    visible_height_at_target: visibleHeight.toFixed(4),
    visible_width_at_target: visibleWidth_1920.toFixed(4),
    world_units_per_pixel: { x: wpu_x.toFixed(6), y: wpu_y.toFixed(6) },
    current_offset_world_units: { x: offsetWorldX.toFixed(4), y: offsetWorldY.toFixed(4) },
    correction: { dx: correctionX.toFixed(4), dy: correctionY.toFixed(4) },
    current_target: currentTarget,
    corrected_target: correctedTarget,
  };
  
  console.log(`  (e) Correction: dx=${correctionX.toFixed(4)}, dy=${correctionY.toFixed(4)} world units`);
  console.log(`      Corrected target: (${correctedTarget.x.toFixed(4)}, ${correctedTarget.y.toFixed(4)}, ${correctedTarget.z.toFixed(4)})`);
  
  // Save results
  writeFileSync(join(SHOTS_DIR, 'center-probe.json'), JSON.stringify(RESULTS, null, 2));
  console.log('\nResults saved to .shots/center-probe.json');
  
  await browser.close();
}

main().catch(err => {
  console.error('Probe failed:', err);
  process.exit(1);
});
