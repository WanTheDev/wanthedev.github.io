/**
 * Turns pointer/touch input into the `pointer` state the camera rig consumes:
 * `{ x, y, held }`, with x/y in -1..1 screen space.
 *
 * There is no per-frame `update()` because nothing here is spring- or
 * velocity-based — the camera rig does its own easing from the raw x/y/held
 * values it receives each frame. A mouse click counts as a hold just like a
 * finger, so the zoom-in behaviour fires on taps too.
 *
 * `pointermove` covers mouse, pen and touch; touch drags never fire
 * `pointerleave`, so `pointerup`/`pointercancel` release as well.
 */
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function createInteraction() {
  const pointer = { x: 0, y: 0, held: false };

  function move(event) {
    pointer.x = clamp((event.clientX / window.innerWidth - 0.5) * 2, -1, 1);
    pointer.y = clamp((event.clientY / window.innerHeight - 0.5) * 2, -1, 1);
  }

  function press() {
    pointer.held = true;
  }

  function release() {
    pointer.held = false;
  }

  const listeners = [
    ["pointermove", move],
    ["pointerdown", press],
    ["pointerup", release],
    ["pointercancel", release],
    ["pointerleave", release],
  ];
  for (const [type, handler] of listeners)
    window.addEventListener(type, handler, { passive: true });

  function dispose() {
    for (const [type, handler] of listeners)
      window.removeEventListener(type, handler);
  }

  return { pointer, dispose };
}
