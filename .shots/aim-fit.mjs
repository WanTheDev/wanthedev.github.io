/**
 * Bounded mathematical calculation: which aim point keeps the knot best centred?
 *
 * Reads the live scene constants from source (not hardcoded), then computes
 * screen-space bbox centres for all 240 phases of a full knot rotation,
 * comparing three candidate aim points across six viewports.
 *
 * Output: .shots/aim-fit.json (full numbers) and stdout table + verdicts.
 */
import * as THREE from "three";

// ── Live constants (read from src/scene.js and src/config.js) ────────────────
const CAM_FOV = 46;                 // PerspectiveCamera(46, …)
const CAM_NEAR = 0.1;
const CAM_FAR_BASE = 40;
const GROUP_ROT = new THREE.Vector3(-0.18, 0.35, 0.08);
const ROTATION_SPEED = 0.21;        // config.rotationSpeed
const CAMERA_Z_FLOOR = 10.5;        // config.cameraZ
const FRAMING_MARGIN = 1.08;        // * 1.08 in scene.js
const HALO_SCALE = 1.06;
const HALO_PULSE_AMP = 0.02;        // sin(time*0.8)*0.02  (not needed for aim)

const KNOT_GEO = new THREE.TorusKnotGeometry(1.9, 0.4, 90, 4, 2, 3);
const HALO_GEO = new THREE.TorusKnotGeometry(1.7, 0.5, 96, 10, 2, 3);

// ── Helpers ──────────────────────────────────────────────────────────────────
function sinHalfFovFromTan(t) {
  return t / Math.sqrt(1 + t * t);
}

function frameDistance(aspect) {
  const tanHalfFov = Math.tan((CAM_FOV * Math.PI) / 360);
  const sinHalfFov = sinHalfFovFromTan(tanHalfFov);
  const t = tanHalfFov * Math.max(aspect, 1e-3);
  const sinH = sinHalfFovFromTan(t);
  const sine = Math.min(sinHalfFov, sinH);
  // Will be called after we know framingRadius.
  return { tanHalfFov, sinHalfFov, sine, frameDistFn: () => Math.max(CAMERA_Z_FLOOR, framingRadius / sine) };
}

// Compute localTarget exactly as scene.js does (mean of knot+halo vertices).
function computeLocalTarget() {
  const knotPos = KNOT_GEO.attributes.position;
  const haloPos = HALO_GEO.attributes.position;
  let sumX = 0, sumY = 0, sumZ = 0, count = 0;
  for (let i = 0; i < knotPos.count; i++) {
    sumX += knotPos.getX(i);
    sumY += knotPos.getY(i);
    sumZ += knotPos.getZ(i);
    count++;
  }
  for (let i = 0; i < haloPos.count; i++) {
    sumX += HALO_SCALE * haloPos.getX(i);
    sumY += HALO_SCALE * haloPos.getY(i);
    sumZ += HALO_SCALE * haloPos.getZ(i);
    count++;
  }
  return new THREE.Vector3(sumX / count, sumY / count, sumZ / count);
}

// Compute framingRadius exactly as scene.js does.
function computeFramingRadius(localTarget) {
  let maxVertex = 0;
  const measure = (attrs, scale) => {
    for (let i = 0; i < attrs.count; i++) {
      const x = scale * attrs.getX(i);
      const y = scale * attrs.getY(i);
      const z = scale * attrs.getZ(i);
      maxVertex = Math.max(maxVertex, Math.hypot(x, y, z));
    }
  };
  measure(KNOT_GEO.attributes.position, 1);
  measure(HALO_GEO.attributes.position, HALO_SCALE);
  return (maxVertex + localTarget.length()) * FRAMING_MARGIN;
}

// Project a 3-D point to normalised device coordinates (NDC, [-1,1]²),
// then map to frame fractions [0,1].
function projectToFrame(cam, pt) {
  const v = pt.clone().project(cam);
  // NDC -> frame fraction: (v + 1) / 2
  return { x: (v.x + 1) / 2, y: (1 + v.y) / 2 }; // y flipped so +y is up
}

// ── Main computation ─────────────────────────────────────────────────────────
const localTarget = computeLocalTarget();
console.log("localTarget (knot+halo vertex mean):", localTarget.toArray().map(v => v.toFixed(8)));
console.log("localTarget length:", localTarget.length().toFixed(8));

const framingRadius = computeFramingRadius(localTarget);
console.log("framingRadius:", framingRadius.toFixed(8));
console.log("knot vertex count:", KNOT_GEO.attributes.position.count);
console.log("halo vertex count:", HALO_GEO.attributes.position.count);

// Candidate aim points in group-local space.
const candidates = {
  A_origin: new THREE.Vector3(0, 0, 0),
  B_knotHaloMean: localTarget.clone(),
  C_knotOnlyMean: (() => {
    const p = KNOT_GEO.attributes.position;
    let sx = 0, sy = 0, sz = 0;
    for (let i = 0; i < p.count; i++) { sx += p.getX(i); sy += p.getY(i); sz += p.getZ(i); }
    return new THREE.Vector3(sx / p.count, sy / p.count, sz / p.count);
  })(),
};

// Build a reusable group with the same base rotation.
const group = new THREE.Group();
group.rotation.copy(GROUP_ROT);

// The knot and halo meshes (we only need their geometries, but set up rotation
// tracking to match scene.js).
const knot = new THREE.Mesh(KNOT_GEO);
const halo = new THREE.Mesh(HALO_GEO);
halo.scale.setScalar(HALO_SCALE);
group.add(knot);
group.add(halo);

// Phase count and step.
const N = 240;
const totalPeriod = (2 * Math.PI) / ROTATION_SPEED;
const dt = totalPeriod / N;

// Viewports to test.
const viewports = [
  [1920, 1080],
  [1280, 800],
  [1024, 768],
  [800, 600],
  [390, 844],
  [320, 480],
];

// For each candidate, for each viewport, collect per-phase bbox centre.
const results = {};

for (const [cname, aim] of Object.entries(candidates)) {
  results[cname] = { aimLocal: aim.toArray().map(v => +v.toFixed(8)), viewports: {} };

  for (const [W, H] of viewports) {
    const aspect = W / H;
    const fd = frameDistance(aspect);
    const d = fd.frameDistFn();
    const camFar = Math.max(CAM_FAR_BASE, d + framingRadius * 2);

    // Camera position for spin=lift=0 (no pointer input): wt + (0,0,d)
    const worldAim = aim.clone().applyMatrix4(group.matrixWorld);
    const camPos = new THREE.Vector3(
      worldAim.x,
      worldAim.y,
      worldAim.z + d,
    );

    const cam = new THREE.PerspectiveCamera(CAM_FOV, aspect, CAM_NEAR, camFar);
    cam.position.copy(camPos);
    cam.lookAt(worldAim);
    cam.updateProjectionMatrix();

    // Sample knot vertices (no halo for the primary analysis; halo variant below).
    const kpos = KNOT_GEO.attributes.position;
    const hpos = HALO_GEO.attributes.position;

    // Collect per-phase bbox centres.
    const phases = [];
    for (let i = 0; i < N; i++) {
      const t = i * dt;
      // Apply knot rotations exactly as scene.js update() does.
      knot.rotation.x = t * ROTATION_SPEED * 0.7;
      knot.rotation.y = t * ROTATION_SPEED;
      group.rotation.z = Math.sin(t * 0.12) * 0.12;
      group.updateMatrixWorld(true);

      // Transform all knot vertices to world space.
      const worldVerts = [];
      for (let j = 0; j < kpos.count; j++) {
        const v = new THREE.Vector3(kpos.getX(j), kpos.getY(j), kpos.getZ(j));
        v.applyMatrix4(group.matrixWorld);
        worldVerts.push(v);
      }

      // Project each vertex.
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const v of worldVerts) {
        const f = projectToFrame(cam, v);
        minX = Math.min(minX, f.x);
        maxX = Math.max(maxX, f.x);
        minY = Math.min(minY, f.y);
        maxY = Math.max(maxY, f.y);
      }
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      phases.push({ t: +t.toFixed(6), cx, cy, minX, maxX, minY, maxY });
    }

    // Aggregate.
    const meanCx = phases.reduce((s, p) => s + p.cx, 0) / N;
    const meanCy = phases.reduce((s, p) => s + p.cy, 0) / N;
    let maxOffX = 0, maxOffY = 0;
    let minCx = Infinity, maxCx = -Infinity, minCy = Infinity, maxCy = -Infinity;
    for (const p of phases) {
      maxOffX = Math.max(maxOffX, Math.abs(p.cx - 0.5));
      maxOffY = Math.max(maxOffY, Math.abs(p.cy - 0.5));
      minCx = Math.min(minCx, p.cx);
      maxCx = Math.max(maxCx, p.cx);
      minCy = Math.min(minCy, p.cy);
      maxCy = Math.max(maxCy, p.cy);
    }

    results[cname].viewports[`${W}x${H}`] = {
      aspect, d: +d.toFixed(8), camFar: +camFar.toFixed(8),
      meanCx: +meanCx.toFixed(8), meanCy: +meanCy.toFixed(8),
      maxOffX: +maxOffX.toFixed(8), maxOffY: +maxOffY.toFixed(8),
      minCx: +minCx.toFixed(8), maxCx: +maxCx.toFixed(8),
      minCy: +minCy.toFixed(8), maxCy: +maxCy.toFixed(8),
      phases: phases.map(p => ({ t: p.t, cx: +p.cx.toFixed(8), cy: +p.cy.toFixed(8) })),
    };
  }
}

// ── Halo variant (candidate B only, since it's the recommended one) ──────────
// Recompute with halo vertices included in the bbox.
const haloResults = {};
for (const [W, H] of viewports) {
  const aspect = W / H;
  const fd = frameDistance(aspect);
  const d = fd.frameDistFn();
  const camFar = Math.max(CAM_FAR_BASE, d + framingRadius * 2);
  const cam = new THREE.PerspectiveCamera(CAM_FOV, aspect, CAM_NEAR, camFar);

  const aim = candidates.B_knotHaloMean;
  const worldAim = aim.clone().applyMatrix4(group.matrixWorld);
  cam.position.set(worldAim.x, worldAim.y, worldAim.z + d);
  cam.lookAt(worldAim);
  cam.updateProjectionMatrix();

  const kpos = KNOT_GEO.attributes.position;
  const hpos = HALO_GEO.attributes.position;
  const phases = [];
  for (let i = 0; i < N; i++) {
    const t = i * dt;
    knot.rotation.x = t * ROTATION_SPEED * 0.7;
    knot.rotation.y = t * ROTATION_SPEED;
    group.rotation.z = Math.sin(t * 0.12) * 0.12;
    group.updateMatrixWorld(true);

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    // Knot vertices.
    for (let j = 0; j < kpos.count; j++) {
      const v = new THREE.Vector3(kpos.getX(j), kpos.getY(j), kpos.getZ(j));
      v.applyMatrix4(group.matrixWorld);
      const f = projectToFrame(cam, v);
      minX = Math.min(minX, f.x); maxX = Math.max(maxX, f.x);
      minY = Math.min(minY, f.y); maxY = Math.max(maxY, f.y);
    }
    // Halo vertices (scaled).
    for (let j = 0; j < hpos.count; j++) {
      const v = new THREE.Vector3(HALO_SCALE * hpos.getX(j), HALO_SCALE * hpos.getY(j), HALO_SCALE * hpos.getZ(j));
      v.applyMatrix4(group.matrixWorld);
      const f = projectToFrame(cam, v);
      minX = Math.min(minX, f.x); maxX = Math.max(maxX, f.x);
      minY = Math.min(minY, f.y); maxY = Math.max(maxY, f.y);
    }
    phases.push({ t: +t.toFixed(6), cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 });
  }
  const meanCx = phases.reduce((s, p) => s + p.cx, 0) / N;
  const meanCy = phases.reduce((s, p) => s + p.cy, 0) / N;
  let maxOffX = 0, maxOffY = 0;
  let minCx = Infinity, maxCx = -Infinity, minCy = Infinity, maxCy = -Infinity;
  for (const p of phases) {
    maxOffX = Math.max(maxOffX, Math.abs(p.cx - 0.5));
    maxOffY = Math.max(maxOffY, Math.abs(p.cy - 0.5));
    minCx = Math.min(minCx, p.cx); maxCx = Math.max(maxCx, p.cx);
    minCy = Math.min(minCy, p.cy); maxCy = Math.max(maxCy, p.cy);
  }
  haloResults[`${W}x${H}`] = {
    aspect, d: +d.toFixed(8), camFar: +camFar.toFixed(8),
    meanCx: +meanCx.toFixed(8), meanCy: +meanCy.toFixed(8),
    maxOffX: +maxOffX.toFixed(8), maxOffY: +maxOffY.toFixed(8),
    minCx: +minCx.toFixed(8), maxCx: +maxCx.toFixed(8),
    minCy: +minCy.toFixed(8), maxCy: +maxCy.toFixed(8),
  };
}
results["B_knotHaloMean_halo"] = {
  aimLocal: candidates.B_knotHaloMean.toArray().map(v => +v.toFixed(8)),
  viewports: haloResults,
  note: "bbox includes halo vertices (scaled 1.06)"
};

// ── Z-wobble isolation: rerun candidate B with group.rotation.z forced to 0 ──
const noZwobble = {};
for (const [W, H] of viewports) {
  const aspect = W / H;
  const fd = frameDistance(aspect);
  const d = fd.frameDistFn();
  const camFar = Math.max(CAM_FAR_BASE, d + framingRadius * 2);
  const cam = new THREE.PerspectiveCamera(CAM_FOV, aspect, CAM_NEAR, camFar);
  const aim = candidates.B_knotHaloMean;
  const worldAim = aim.clone().applyMatrix4(group.matrixWorld);
  cam.position.set(worldAim.x, worldAim.y, worldAim.z + d);
  cam.lookAt(worldAim);
  cam.updateProjectionMatrix();

  const kpos = KNOT_GEO.attributes.position;
  const hpos = HALO_GEO.attributes.position;
  const phases = [];
  for (let i = 0; i < N; i++) {
    const t = i * dt;
    knot.rotation.x = t * ROTATION_SPEED * 0.7;
    knot.rotation.y = t * ROTATION_SPEED;
    group.rotation.z = 0;  // zeroed
    group.updateMatrixWorld(true);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const attrs of [kpos, hpos]) {
      const sc = attrs === hpos ? HALO_SCALE : 1;
      for (let j = 0; j < attrs.count; j++) {
        const v = new THREE.Vector3(sc * attrs.getX(j), sc * attrs.getY(j), sc * attrs.getZ(j));
        v.applyMatrix4(group.matrixWorld);
        const f = projectToFrame(cam, v);
        minX = Math.min(minX, f.x); maxX = Math.max(maxX, f.x);
        minY = Math.min(minY, f.y); maxY = Math.max(maxY, f.y);
      }
    }
    phases.push({ t: +t.toFixed(6), cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 });
  }
  const meanCx = phases.reduce((s, p) => s + p.cx, 0) / N;
  const meanCy = phases.reduce((s, p) => s + p.cy, 0) / N;
  let maxOffX = 0, maxOffY = 0;
  let minCx = Infinity, maxCx = -Infinity, minCy = Infinity, maxCy = -Infinity;
  for (const p of phases) {
    maxOffX = Math.max(maxOffX, Math.abs(p.cx - 0.5));
    maxOffY = Math.max(maxOffY, Math.abs(p.cy - 0.5));
    minCx = Math.min(minCx, p.cx); maxCx = Math.max(maxCx, p.cx);
    minCy = Math.min(minCy, p.cy); maxCy = Math.max(maxCy, p.cy);
  }
  noZwobble[`${W}x${H}`] = {
    aspect, d: +d.toFixed(8), camFar: +camFar.toFixed(8),
    meanCx: +meanCx.toFixed(8), meanCy: +meanCy.toFixed(8),
    maxOffX: +maxOffX.toFixed(8), maxOffY: +maxOffY.toFixed(8),
    minCx: +minCx.toFixed(8), maxCx: +maxCx.toFixed(8),
    minCy: +minCy.toFixed(8), maxCy: +maxCy.toFixed(8),
  };
}
results["B_knotHaloMean_noZwobble"] = {
  aimLocal: candidates.B_knotHaloMean.toArray().map(v => +v.toFixed(8)),
  viewports: noZwobble,
  note: "group.rotation.z forced to 0"
};

// ── Verdict helpers ───────────────────────────────────────────────────────────
const vpKeys = viewports.map(([w, h]) => `${w}x${h}`);

function summarise(candidateName) {
  const data = results[candidateName];
  if (!data) return null;
  const rows = [];
  let worstSum = 0;
  for (const vk of vpKeys) {
    const r = data.viewports[vk];
    const off = Math.max(r.maxOffX, r.maxOffY);
    worstSum += off;
    rows.push({ vp: vk, meanCx: r.meanCx, meanCy: r.meanCy, maxOffX: r.maxOffX, maxOffY: r.maxOffY, worstOff: +off.toFixed(8), d: r.d, camFar: r.camFar });
  }
  return { name: candidateName, aim: data.aimLocal, rows, worstSum: +worstSum.toFixed(8) };
}

const summaries = {};
for (const name of Object.keys(results)) {
  if (name.includes("halo") || name.includes("noZwobble")) continue;
  summaries[name] = summarise(name);
}

// Print table.
console.log("\n=== AIM-POINT ANALYSIS ===\n");
console.log(`Knot geo: TorusKnotGeometry(1.9, 0.4, 90, 4, 2, 3)  vertices=${KNOT_GEO.attributes.position.count}`);
console.log(`Halo geo: TorusKnotGeometry(1.7, 0.5, 96, 10, 2, 3)  vertices=${HALO_GEO.attributes.position.count}  scale=${HALO_SCALE}`);
console.log(`Group base rotation: ${GROUP_ROT.toArray().map(v=>v.toFixed(4))}`);
console.log(`localTarget (knot+halo mean): (${localTarget.toArray().map(v=>v.toFixed(6)).join(", ")})`);
console.log(`knot-only mean: (${candidates.C_knotOnlyMean.toArray().map(v=>v.toFixed(6)).join(", ")})`);
console.log(`framingRadius: ${framingRadius.toFixed(6)}`);
console.log(`cameraZ floor: ${CAMERA_Z_FLOOR}`);
console.log(`rotationSpeed: ${ROTATION_SPEED}`);
console.log(`N phases: ${N}, period: ${totalPeriod.toFixed(6)}`);

console.log("\n--- Per-candidate summary (knot-only bbox) ---");
for (const [name, s] of Object.entries(summaries)) {
  console.log(`\n${name}  aim=${JSON.stringify(s.aim)}`);
  console.log("  VP      meanCx  meanCy  maxOffX maxOffY  worstOff    d     far");
  for (const r of s.rows) {
    console.log(`  ${r.vp.padEnd(8)} ${r.meanCx.toFixed(6)}  ${r.meanCy.toFixed(6)}  ${r.maxOffX.toFixed(6)}  ${r.maxOffY.toFixed(6)}  ${r.worstOff.toFixed(6)}  ${r.d.toFixed(4)}  ${r.camFar.toFixed(4)}`);
  }
  console.log(`  >>> worstSum (sum of max offsets across all VPs): ${s.worstSum}`);
}

// Q3: z-wobble vs knot rotation
console.log("\n--- Q3: z-wobble isolation ---");
const bw = summaries["B_knotHaloMean"];
const nz = results["B_knotHaloMean_noZwobble"];
for (const vk of vpKeys) {
  const rB = bw.rows.find(r => r.vp === vk);
  const rN = nz.viewports[vk];
  console.log(`  ${vk}: with-z  maxOff(${rB.maxOffX.toFixed(6)},${rB.maxOffY.toFixed(6)})  no-z  maxOff(${rN.maxOffX.toFixed(6)},${rN.maxOffY.toFixed(6)})  diff(Δx=${(rB.maxOffX-rN.maxOffX).toFixed(6)}, Δy=${(rB.maxOffY-rN.maxOffY).toFixed(6)})`);
}

// Q4: worst-case as % of frame
console.log("\n--- Q4: worst-case offset as % of frame ---");
for (const [name, s] of Object.entries(summaries)) {
  console.log(`\n${name}:`);
  for (const r of s.rows) {
    const [w, h] = r.vp.split("x").map(Number);
    console.log(`  ${r.vp}:  maxOffX=${(r.maxOffX*100).toFixed(3)}% width, maxOffY=${(r.maxOffY*100).toFixed(3)}% height`);
  }
}

// Q1 & Q2 verdicts
console.log("\n=== VERDICTS ===");
const sorted = Object.entries(summaries).sort((a, b) => a[1].worstSum - b[1].worstSum);
console.log(`Q1. Smallest worst-case offset sum: ${sorted[0][0]}  worstSum=${sorted[0][1].worstSum}`);
for (const [n, s] of sorted) {
  console.log(`     ${n}: ${s.worstSum}  (aim=${JSON.stringify(s.aim)})`);
}
console.log("\nQ2. Systematic offset (meanCx, meanCy) per candidate:");
for (const [n, s] of Object.entries(summaries)) {
  let sumCx = 0, sumCy = 0, cnt = 0;
  for (const r of s.rows) { sumCx += r.meanCx; sumCy += r.meanCy; cnt++; }
  const mx = sumCx / cnt, my = sumCy / cnt;
  console.log(`  ${n}: meanCx=${mx.toFixed(6)} (offset ${Math.abs(mx-0.5).toFixed(6)}), meanCy=${my.toFixed(6)} (offset ${Math.abs(my-0.5).toFixed(6)})`);
}
// Actually compute per-candidate overall means across phases and VPs.
for (const [n, s] of Object.entries(summaries)) {
  let sumCx = 0, sumCy = 0, cnt = 0;
  for (const r of s.rows) { sumCx += r.meanCx; sumCy += r.meanCy; cnt++; }
  const mx = sumCx / cnt, my = sumCy / cnt;
  console.log(`  ${n}: overall_meanCx=${mx.toFixed(6)} (offset ${Math.abs(mx-0.5).toFixed(6)}), overall_meanCy=${my.toFixed(6)} (offset ${Math.abs(my-0.5).toFixed(6)})`);
}

// Write JSON.
const out = {
  constants: {
    CAM_FOV, CAM_NEAR, CAM_FAR_BASE, GROUP_ROT: GROUP_ROT.toArray().map(v => +v.toFixed(6)),
    ROTATION_SPEED, CAMERA_Z_FLOOR, FRAMING_MARGIN, HALO_SCALE,
    knotVertexCount: KNOT_GEO.attributes.position.count,
    haloVertexCount: HALO_GEO.attributes.position.count,
  },
  computed: {
    localTarget: localTarget.toArray().map(v => +v.toFixed(8)),
    framingRadius: +framingRadius.toFixed(8),
    knotOnlyMean: candidates.C_knotOnlyMean.toArray().map(v => +v.toFixed(8)),
  },
  candidates: Object.fromEntries(
    Object.entries(candidates).map(([k, v]) => [k, v.toArray().map(x => +x.toFixed(8))])
  ),
  results,
  verdicts: {
    q1: {
      ranking: sorted.map(([n, s]) => ({ name: n, worstSum: s.worstSum })),
      winner: sorted[0][0],
      winnerWorstSum: sorted[0][1].worstSum,
    },
    q2: Object.fromEntries(
      Object.entries(summaries).map(([n, s]) => {
        let sumCx = 0, sumCy = 0;
        for (const r of s.rows) { sumCx += r.meanCx; sumCy += r.meanCy; }
        const mx = sumCx / s.rows.length, my = sumCy / s.rows.length;
        return [n, { meanCx: +mx.toFixed(8), meanCy: +my.toFixed(8), offX: +(Math.abs(mx-0.5)).toFixed(8), offY: +(Math.abs(my-0.5)).toFixed(8) }];
      })
    ),
    q3: Object.fromEntries(
      vpKeys.map(vk => {
        const rB = bw.rows.find(r => r.vp === vk);
        const rN = nz.viewpoints?.[vk] ?? nz.viewports[vk];
        return [vk, {
          withZ: { maxOffX: rB.maxOffX, maxOffY: rB.maxOffY },
          noZ: { maxOffX: rN.maxOffX, maxOffY: rN.maxOffY },
          delta: { dx: +(rB.maxOffX - rN.maxOffX).toFixed(8), dy: +(rB.maxOffY - rN.maxOffY).toFixed(8) },
        }];
      })
    ),
    q4: Object.fromEntries(
      Object.entries(summaries).map(([n, s]) => [n, s.rows.map(r => {
        const [w, h] = r.vp.split("x").map(Number);
        return { vp: r.vp, pctW: +(r.maxOffX * 100).toFixed(4), pctH: +(r.maxOffY * 100).toFixed(4) };
      })])
    ),
  },
};

import { writeFileSync } from "fs";
writeFileSync(".shots/aim-fit.json", JSON.stringify(out, null, 2));
console.log("\nSaved .shots/aim-fit.json");
