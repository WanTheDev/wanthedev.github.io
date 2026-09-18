import "./style.css";
import { AsciiRenderer } from "./ascii-renderer.js";
import { config } from "./config.js";
import { createBloomComposite } from "./postfx.js";
import { createScene } from "./scene.js";

// The only canvas in the DOM becomes the WebGL bloom composite output.
const outputCanvas = document.querySelector("#ascii-background");
// Offscreen WebGL canvas: the scene render target the ASCII layer samples.
const sceneCanvas = document.createElement("canvas");
// Offscreen 2D canvas: the glyph layer, and the bloom composite's source texture.
const asciiCanvas = document.createElement("canvas");

const ascii = new AsciiRenderer(asciiCanvas, config.ascii);
const world = createScene(sceneCanvas, config.scene, config.post, config.interact);
const bloom = createBloomComposite(outputCanvas, asciiCanvas, config.post);
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let animationFrame = 0;
let lastFrameTime = -Infinity;
let lastDrawTime = -Infinity;
let manuallyPaused = false;

// Coalesce resize events into one pass per animation frame. A drag can fire
// hundreds of 'resize' events, and each real resize disposes and reallocates
// ~15 GPU render targets across two composers, so without coalescing a drag
// is far more expensive than it should be.
function scheduleResize() {
  if (scheduleResize.pending) return;
  scheduleResize.pending = true;
  requestAnimationFrame(() => {
    scheduleResize.pending = false;
    resize();
    render();
  });
}
scheduleResize.pending = false;

// Last size actually applied, so a redundant call (visibilitychange, the DPR
// poll, a resize event that did not move anything) does not clear the glyph
// canvas and dispose ~15 GPU render targets for nothing.
let appliedWidth = -1;
let appliedHeight = -1;
let appliedDpr = -1;

function resize() {
  // Guard: a 0x0 or extreme window must not drive a NaN draw call.
  const w = Math.max(1, window.innerWidth);
  const h = Math.max(1, window.innerHeight);
  const dpr = Math.min(window.devicePixelRatio || 1, config.performance.maxDevicePixelRatio);
  if (w === appliedWidth && h === appliedHeight && dpr === appliedDpr) return;
  applySize(w, h, dpr);
}

// The resize work itself, split out so a non-size change that still moves the
// glyph grid (a `cellSize` edit via `set`) can force it without pretending the
// window moved.
function applySize(w, h, dpr) {
  appliedWidth = w;
  appliedHeight = h;
  appliedDpr = dpr;
  ascii.resize(w, h, dpr);
  // The ASCII layer averages each glyph cell down to one colour, so rendering
  // the scene at its cell grid is all the detail this page can show.
  world.resize(ascii.columns, ascii.rows, config.post.quality.fraction);
  bloom.setSize(w, h, dpr);
}

function draw(time) {
  world.render();
  ascii.render(sceneCanvas);
  bloom.render();
  lastDrawTime = time;
}

function render(time = performance.now()) {
  const delta = lastFrameTime === -Infinity ? 0 : Math.min(0.1, (time - lastFrameTime) / 1000);
  world.update(reducedMotion.matches ? 0 : time / 1000, delta);
  lastFrameTime = time;
  draw(time);
}

function tick(time) {
  if (manuallyPaused || document.hidden || reducedMotion.matches) return;

  // The camera eases on every display frame so pointer motion stays smooth;
  // only the WebGL draw and the glyph pass are limited to `ascii.fps`.
  const delta = lastFrameTime === -Infinity ? 0 : Math.min(0.1, (time - lastFrameTime) / 1000);
  world.update(time / 1000, delta);
  lastFrameTime = time;

  if (time - lastDrawTime >= 1000 / ascii.options.fps) draw(time);

  animationFrame = requestAnimationFrame(tick);
}

function start() {
  cancelAnimationFrame(animationFrame);
  if (manuallyPaused || document.hidden) return;

  if (reducedMotion.matches) {
    render(0);
    return;
  }

  lastFrameTime = -Infinity;
  lastDrawTime = -Infinity;
  animationFrame = requestAnimationFrame(tick);
}

function stop() {
  cancelAnimationFrame(animationFrame);
}

async function setAsciiOptions(options) {
  await ascii.setOptions(options);
  // Force the pass: the glyph options may have changed `cellSize`, which moves
  // the columns/rows (and so the scene render size) without the window moving.
  applySize(
    Math.max(1, window.innerWidth),
    Math.max(1, window.innerHeight),
    Math.min(window.devicePixelRatio || 1, config.performance.maxDevicePixelRatio),
  );
  render();
  start();
}

function handleVisibilityChange() {
  if (document.hidden) stop();
  else {
    // A resize that arrived while hidden may have been coalesced away; re-sync
    // the backing stores when the tab becomes visible again.
    scheduleResize();
    start();
  }
}

function handleMotionChange() {
  start();
}

window.addEventListener("resize", scheduleResize);
// Track devicePixelRatio changes (browser zoom, dragging to a different-DPI
// monitor, OS scale change). The only path that re-sizes backing stores is a
// window 'resize' event, which a DPR-only change does not fire.
if (window.matchMedia) {
  const dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
  // Older Safari only has addListener; fall back gracefully.
  const dprHandler = () => {
    // Re-arm for the new DPR so subsequent changes are also caught.
    const nextQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    if (nextQuery.addEventListener) nextQuery.addEventListener("change", dprHandler);
    else if (nextQuery.addListener) nextQuery.addListener(dprHandler);
    if (dprQuery.removeEventListener) dprQuery.removeEventListener("change", dprHandler);
    else if (dprQuery.removeListener) dprQuery.removeListener(dprHandler);
    scheduleResize();
  };
  if (dprQuery.addEventListener) dprQuery.addEventListener("change", dprHandler);
  else if (dprQuery.addListener) dprQuery.addListener(dprHandler);
}
// Fallback: some environments (CDP overrides, certain browser tests) do not fire
// matchMedia change events on DPR transitions. Poll a few times a second to
// catch them; `scheduleResize` is idempotent, so an unchanged DPR costs nothing.
let lastDpr = window.devicePixelRatio;
setInterval(() => {
  const dpr = window.devicePixelRatio;
  if (dpr !== lastDpr) {
    lastDpr = dpr;
    scheduleResize();
  }
}, 200);
document.addEventListener("visibilitychange", handleVisibilityChange);
reducedMotion.addEventListener("change", handleMotionChange);
window.addEventListener("beforeunload", () => {
  world.dispose();
  bloom.dispose();
}, { once: true });

await ascii.ready;
resize();
start();


// Deliberately small runtime API for console experiments and future controls.
globalThis.asciiPortfolio = {
  config,
  ascii,
  scene: world.scene,
  camera: world.camera,
  renderer: world.renderer,
  fx: world.fx,
  bloom: bloom.bloom,
  // The composite's renderer and composer, so a console experiment can read the
  // composited frame back (the bloom pass itself cannot render or read pixels).
  composite: bloom,
  pointer: world.pointer,
  set: setAsciiOptions,
  setGlyphs(values, mode = "text") {
    return setAsciiOptions({ glyphs: { mode, values } });
  },
  render,
  pause() {
    manuallyPaused = true;
    stop();
  },
  resume() {
    manuallyPaused = false;
    start();
  },
};
