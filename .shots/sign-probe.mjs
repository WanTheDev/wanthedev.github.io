/**
 * Sign-probe: empirically determine the sign relationship of framingOffset
 * on the ASCII torus-knot portfolio.
 *
 * Method (A) — geometry-exact: projects every mesh vertex through the live
 * camera and reports the bbox centre in frame fractions.
 * Method (B) — pixel-crosscheck: luminance-weighted centroid on the glyph canvas.
 *
 * Output: .shots/sign-probe.json
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

const URL = 'http://localhost:5199';

// --- main ------------------------------------------------------------------

async function main() {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => typeof globalThis.asciiPortfolio !== 'undefined', {}, { timeout: 10000 });
  // Wait for app to settle at its default framingOffset
  await sleep(2500);

  // Run at both viewports
  const viewports = [{ label: '1920x1080', w: 1920, h: 1080 }, { label: '390x844', w: 390, h: 844 }];

  const offsets = [
    { label: 'offset_0_0',       x: 0,  y: 0  },
    { label: 'offset_px002',     x: 0.02,y: 0  },
    { label: 'offset_mx002',     x: -0.02,y: 0 },
    { label: 'offset_y002',      x: 0,  y: 0.02 },
    { label: 'offset_my002',     x: 0,  y: -0.02 },
  ];

  const RESULTS = {};

  for (const vp of viewports) {
    RESULTS[vp.label] = { methodA: {}, methodB: {} };
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await sleep(800); // let resize settle

    // ---- Method A: geometry-exact ----------------------------------------
    const geo = await page.evaluate(async ({ w, h, offsets }) => {
      // Helpers in page context
      function findKnotMesh(scene) {
        let mesh = null;
        scene.traverse((obj) => {
          if (!mesh && obj.isMesh && obj.geometry.type === 'TorusKnotGeometry' && obj.material.flatShading === true) {
            mesh = obj;
          }
        });
        return mesh;
      }
      function projectToFrame(wx, wy, wz, camera) {
        const vm = camera.matrixWorldInverse.elements;
        const pm = camera.projectionMatrix.elements;
        const vx = vm[0]*wx + vm[4]*wy + vm[8]*wz + vm[12];
        const vy = vm[1]*wx + vm[5]*wy + vm[9]*wz + vm[13];
        const vz = vm[2]*wx + vm[6]*wy + vm[10]*wz + vm[14];
        const vww = vm[3]*wx + vm[7]*wy + vm[11]*wz + vm[15];
        const cx = (pm[0]*vx + pm[4]*vy + pm[8]*vz + pm[12]*vww) / (pm[3]*vx + pm[7]*vy + pm[11]*vz + pm[15]*vww);
        const cy = (pm[1]*vx + pm[5]*vy + pm[9]*vz + pm[13]*vww) / (pm[3]*vx + pm[7]*vy + pm[11]*vz + pm[15]*vww);
        return { cx: (cx + 1) / 2, cy: (1 - cy) / 2 };
      }

      const { scene, camera } = globalThis.asciiPortfolio;
      const knot = findKnotMesh(scene);
      if (!knot) throw new Error('knot mesh not found');
      knot.updateMatrixWorld(true);
      camera.updateMatrixWorld(true);

      // Pre-fetch vertex positions from geometry
      const posArr = knot.geometry.attributes.position.array;
      const vertCount = posArr.length / 3;

      const phaseCount = 36;
      const results = {};

      for (const off of offsets) {
        // Apply framing offset via camera.setViewOffset
        camera.setViewOffset(w, h, -off.x * w, -off.y * h, w, h);
        camera.updateMatrixWorld(true);

        const phaseCentres = [];
        for (let p = 0; p < phaseCount; p++) {
          const phase = (p / phaseCount) * 2 * Math.PI;
          knot.rotation.set(phase * 0.7, phase, 0);
          knot.updateMatrixWorld(true);
          camera.updateMatrixWorld(true);

          const m = knot.matrixWorld.elements;
          let minCx = Infinity, maxCx = -Infinity, minCy = Infinity, maxCy = -Infinity;
          for (let i = 0; i < vertCount; i++) {
            const vx = posArr[i*3], vy = posArr[i*3+1], vz = posArr[i*3+2];
            const wx = m[0]*vx + m[4]*vy + m[8]*vz + m[12];
            const wy = m[1]*vx + m[5]*vy + m[9]*vz + m[13];
            const wz = m[2]*vx + m[6]*vy + m[10]*vz + m[14];
            const f = projectToFrame(wx, wy, wz, camera);
            if (f.cx < minCx) minCx = f.cx;
            if (f.cx > maxCx) maxCx = f.cx;
            if (f.cy < minCy) minCy = f.cy;
            if (f.cy > maxCy) maxCy = f.cy;
          }
          phaseCentres.push({ cx: (minCx + maxCx) / 2, cy: (minCy + maxCy) / 2 });
        }

        const meanCx = phaseCentres.reduce((s, pp) => s + pp.cx, 0) / phaseCount;
        const meanCy = phaseCentres.reduce((s, pp) => s + pp.cy, 0) / phaseCount;
        results[off.label] = { meanCx, meanCy, samples: phaseCentres.length };
      }

      return results;
    }, { w: vp.w, h: vp.h, offsets });

    RESULTS[vp.label].methodA = geo;

    // ---- Method B: pixel-crosscheck (only 3 offsets at 1920x1080) -------
    if (vp.label === '1920x1080') {
      const pixelOffsets = [
        { label: 'offset_0_0',    x: 0,  y: 0  },
        { label: 'offset_px002',  x: 0.02,y: 0  },
        { label: 'offset_y002',   x: 0,  y: 0.02 },
      ];
      const pix = await page.evaluate(({ w, h, offsets }) => {
        // Helper in page context
        function pixelCentroid(ctx, w, h, threshold) {
          const data = ctx.getImageData(0, 0, w, h).data;
          let sumLum = 0, sumXLum = 0, sumYLum = 0, count = 0;
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const i = (y * w + x) * 4;
              const lum = 0.2126 * data[i] + 0.7152 * data[i+1] + 0.0722 * data[i+2];
              if (lum > threshold) {
                sumLum += lum;
                sumXLum += x * lum;
                sumYLum += y * lum;
                count++;
              }
            }
          }
          return {
            cx: sumLum > 0 ? sumXLum / sumLum / w : 0.5,
            cy: sumLum > 0 ? sumYLum / sumLum / h : 0.5,
            count,
            total: w * h,
            frac: count / (w * h),
          };
        }

        const { scene, camera, ascii } = globalThis.asciiPortfolio;
        const ctx = ascii.canvas.getContext('2d');
        const results = {};
        for (const off of offsets) {
          camera.setViewOffset(w, h, -off.x * w, -off.y * h, w, h);
          // Force one render
          globalThis.asciiPortfolio.renderer.render(globalThis.asciiPortfolio.scene, camera);
          const c = pixelCentroid(ctx, w, h, 60);
          results[off.label] = c;
        }
        return results;
      }, { w: vp.w, h: vp.h, offsets: pixelOffsets });
      RESULTS[vp.label].methodB = pix;
    }
  }

  // ---- Compute deltas relative to baseline ------------------------------
  for (const vp of viewports) {
    const baseA = RESULTS[vp.label].methodA['offset_0_0'];
    if (!baseA) continue;
    const deltasA = {};
    for (const [label, val] of Object.entries(RESULTS[vp.label].methodA)) {
      if (label === 'offset_0_0') continue;
      deltasA[label] = {
        dCx: val.meanCx - baseA.meanCx,
        dCy: val.meanCy - baseA.meanCy,
        absCx: val.meanCx,
        absCy: val.meanCy,
      };
    }
    RESULTS[vp.label].deltasA = deltasA;

    if (RESULTS[vp.label].methodB) {
      const baseB = RESULTS[vp.label].methodB['offset_0_0'];
      const deltasB = {};
      for (const [label, val] of Object.entries(RESULTS[vp.label].methodB)) {
        if (label === 'offset_0_0') continue;
        deltasB[label] = {
          dCx: val.cx - baseB.cx,
          dCy: val.cy - baseB.cy,
          absCx: val.cx,
          absCy: val.cy,
          fracLit: val.frac,
          litCount: val.count,
        };
      }
      RESULTS[vp.label].deltasB = deltasB;
    }
  }

  // ---- Derive Q1–Q5 answers --------------------------------------------
  RESULTS.answers = {};

  // Q1: positive x -> knot moves LEFT or RIGHT?
  // deltaCx positive means knot moves right in frame (larger cx = further right)
  const q1_xpos = RESULTS['1920x1080'].deltasA['offset_px002'];
  RESULTS.answers.Q1 = {
    question: 'If framingOffset.x is POSITIVE, does the knot move LEFT or RIGHT?',
    measured_dCx_at_offset_002: q1_xpos.dCx,
    direction: q1_xpos.dCx > 0 ? 'RIGHT' : 'LEFT',
    delta: `dCx = ${q1_xpos.dCx.toFixed(6)}  (positive x → knot moves ${q1_xpos.dCx > 0 ? 'right' : 'left'})`,
  };

  // Q2: positive y -> knot moves UP or DOWN? (cy measured from TOP, larger = lower on screen)
  const q2_ypos = RESULTS['1920x1080'].deltasA['offset_y002'];
  RESULTS.answers.Q2 = {
    question: 'If framingOffset.y is POSITIVE, does the knot move UP or DOWN on screen?',
    measured_dCy_at_offset_002: q2_ypos.dCy,
    direction: q2_ypos.dCy > 0 ? 'DOWN' : 'UP',
    note: 'cy measured from TOP; larger cy = lower on screen',
    delta: `dCy = ${q2_ypos.dCy.toFixed(6)}  (positive y → knot moves ${q2_ypos.dCy > 0 ? 'down' : 'up'})`,
  };

  // Q3: to move knot LEFT by 1.5% and DOWN by 1.5%
  // LEFT means smaller cx → need negative dCx → need negative x offset
  // DOWN means larger cy → need positive dCy → need positive y offset
  // From the measured delta at ±0.02, interpolate linearly:
  const dx_per_unit = q1_xpos.dCx / 0.02;  // dCx per unit x
  const dy_per_unit = q2_ypos.dCy / 0.02;  // dCy per unit y
  const needed_x = -0.015 / dx_per_unit;   // -1.5% in frame fractions
  const needed_y = +0.015 / dy_per_unit;   // +1.5% in frame fractions
  RESULTS.answers.Q3 = {
    question: 'To move knot LEFT 1.5% and DOWN 1.5%, what {x,y}? ',
    dx_per_unit,
    dy_per_unit,
    suggested_offset: { x: needed_x, y: needed_y },
    reasoning: `dx_per_unit=${dx_per_unit.toFixed(6)} dCx/unit, dy_per_unit=${dy_per_unit.toFixed(6)} dCy/unit. To get dCx=-0.015: x=${needed_x.toFixed(6)}. To get dCy=+0.015: y=${needed_y.toFixed(6)}.`,
  };

  // Q4: Do A and B agree in sign at 1920x1080?
  const q4_a = RESULTS['1920x1080'].deltasA;
  const q4_b = RESULTS['1920x1080'].deltasB;
  const signAgree = {
    x_pos: (q4_a['offset_px002'].dCx > 0) === (q4_b['offset_px002'].dCx > 0),
    y_pos: (q4_a['offset_y002'].dCy > 0) === (q4_b['offset_y002'].dCy > 0),
  };
  RESULTS.answers.Q4 = {
    question: 'Did (A) and (B) agree in sign at 1920x1080?',
    A_dCx_px002: q4_a['offset_px002'].dCx,
    B_dCx_px002: q4_b['offset_px002'].dCx,
    A_dCy_y002: q4_a['offset_y002'].dCy,
    B_dCy_y002: q4_b['offset_y002'].dCy,
    signs_agree_x: signAgree.x_pos,
    signs_agree_y: signAgree.y_pos,
    overall: signAgree.x_pos && signAgree.y_pos ? 'YES' : 'NO',
  };

  // Q5: Does the needed correction differ between viewports?
  const base_1920 = RESULTS['1920x1080'].methodA['offset_0_0'];
  const base_390 = RESULTS['390x844'].methodA['offset_0_0'];
  RESULTS.answers.Q5 = {
    question: 'Does the needed correction differ between 1920x1080 and 390x844?',
    baseline_1920: base_1920,
    baseline_390: base_390,
    bias_1920: { cx: base_1920.meanCx - 0.5, cy: base_1920.meanCy - 0.5 },
    bias_390: { cx: base_390.meanCx - 0.5, cy: base_390.meanCy - 0.5 },
    same_bias: Math.abs((base_1920.meanCx - 0.5) - (base_390.meanCx - 0.5)) < 0.001 &&
               Math.abs((base_1920.meanCy - 0.5) - (base_390.meanCy - 0.5)) < 0.001,
  };

  writeFileSync(join(SHOTS_DIR, 'sign-probe.json'), JSON.stringify(RESULTS, null, 2));
  console.log('Results saved to .shots/sign-probe.json');
  console.log('\n=== Q1 ===');
  console.log(RESULTS.answers.Q1.delta);
  console.log('\n=== Q2 ===');
  console.log(RESULTS.answers.Q2.delta);
  console.log('\n=== Q3 ===');
  console.log(JSON.stringify(RESULTS.answers.Q3.suggested_offset, null, 2));
  console.log('\n=== Q4 ===');
  console.log(JSON.stringify(RESULTS.answers.Q4, null, 2));
  console.log('\n=== Q5 ===');
  console.log(JSON.stringify(RESULTS.answers.Q5, null, 2));

  await browser.close();
}

main().catch(err => {
  console.error('Probe failed:', err);
  process.exit(1);
});
