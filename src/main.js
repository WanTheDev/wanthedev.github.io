import "./style.css";
import { AsciiRenderer } from "./ascii-renderer.js";
import { config } from "./config.js";
import { createScene } from "./scene.js";

const outputCanvas = document.querySelector("#ascii-background");
const sourceCanvas = document.createElement("canvas");
const ascii = new AsciiRenderer(outputCanvas, config.ascii);
const world = createScene(sourceCanvas, config.scene);
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let animationFrame = 0;
let lastFrameTime = -Infinity;
let manuallyPaused = false;

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, config.performance.maxDevicePixelRatio);
  ascii.resize(window.innerWidth, window.innerHeight, dpr);
  world.resize(ascii.columns, ascii.rows);
}

function render(time = performance.now()) {
  world.update(reducedMotion.matches ? 0 : time / 1000);
  world.render();
  ascii.render(sourceCanvas);
  lastFrameTime = time;
}

function tick(time) {
  if (manuallyPaused || document.hidden || reducedMotion.matches) return;

  const interval = 1000 / ascii.options.fps;
  if (time - lastFrameTime >= interval) render(time);
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
  animationFrame = requestAnimationFrame(tick);
}

function stop() {
  cancelAnimationFrame(animationFrame);
}

async function setAsciiOptions(options) {
  await ascii.setOptions(options);
  resize();
  render();
  start();
}

function handleVisibilityChange() {
  if (document.hidden) stop();
  else start();
}

function handleMotionChange() {
  start();
}

window.addEventListener("resize", () => {
  resize();
  render();
});
document.addEventListener("visibilitychange", handleVisibilityChange);
reducedMotion.addEventListener("change", handleMotionChange);
window.addEventListener("beforeunload", () => world.dispose(), { once: true });

await ascii.ready;
resize();
start();

// Deliberately small runtime API for console experiments and future controls.
globalThis.asciiPortfolio = {
  config,
  scene: world.scene,
  camera: world.camera,
  renderer: world.renderer,
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
