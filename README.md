# WanTheDev portfolio

A minimal one-page portfolio built with Vite, vanilla JavaScript, CSS, Three.js, and a custom Canvas 2D ASCII renderer.

## Run it

```bash
npm install
npm run dev
```

Create and locally preview the production build:

```bash
npm run build
npm run preview
```

Pushes to `main` are built and deployed to GitHub Pages by the included workflow.

## Experiment

All normal tuning lives in [`src/config.js`](src/config.js). Glyphs must be ordered from darkest to brightest; enable `invert` to reverse the mapping.

- Change `glyphs.values` to any string, such as `" WanTheDv"`, or an array of Unicode glyphs such as the included moon-phase preset.
- Increase `cellSize` for fewer, larger glyphs and better performance; decrease it for more detail.
- Adjust the contrast, inversion, and FPS in `config.ascii`.
- `ascii.voidLuminance` leaves near-black source pixels empty even when the
  character set starts with a visible glyph. The ASCII canvas itself defaults
  to black, so an empty cell is black rather than a dark blue character.
- `ascii.colors.mode` picks how glyphs are coloured: `"palette"` interpolates `low` -> `high` (the original greyscale look), while `"source"` gives each glyph the colour the scene rendered there. Use `"source"` to actually see the post-processing hues.
- Edit [`src/scene.js`](src/scene.js) to replace the default Three.js scene. The ASCII layer only samples its output canvas, so meshes, shaders, or a different composer chain can replace it without changing the page content.

## Post-processing and interactivity

`config.post` drives a colour-grade chain and a bloom pass (see
[`src/postfx.js`](src/postfx.js)): the scene renders through the grade (ramp +
aberration + invert), the glyph pass turns that into ASCII, and bloom is a
second composite that runs on the finished ASCII canvas — that is why the glow
sits on the glyphs themselves rather than on the scene behind them, and why
`bloom.threshold` is in plain sRGB luminance of the glyph colours (near-white
on near-black).

- `bloom.strength` / `radius` / `threshold` — glow on the ASCII glyphs. Lower
  `threshold` to bloom more of the image.
- `aberration` — radial red/blue colour fringing. `0` disables the extra
  texture samples.
- `ramp.stops` — the gradient ramp, written darkest to brightest as 2 to 5 hex
  colours; `ramp.method` is `luma`, `radial`, `horizontal` or `vertical`, and
  `ramp.mix` blends it over the frame.
- `invert` — negative image, applied before the glyphs are chosen.
- `quality.fraction` — the scene renders at this multiple of the glyph grid.
  `1` gives a cell slightly more texels than it needs; raise it for crisper
  source colours, lower it for speed.

`config.interact` drives the camera rig: moving the pointer (or dragging on
touch) swings the camera on a sphere around the object, and holding the button
or finger down pulls the camera closer (`zoom`) and doubles the swing
(`holdStrength`) for as long as it is held. Set `interact.enabled` to `false`
to freeze the camera.

Tweaking is live: `config` is the same object the renderer reads, so editing
it in the console takes effect on the next frame.

```js
asciiPortfolio.config.post.bloom.strength = 2;
asciiPortfolio.config.post.ramp.stops = ["#100020", "#602040", "#ffb060", "#fff8e0"];
asciiPortfolio.bloom; // the UnrealBloomPass, for anything the config does not expose
```

For image glyphs, place ordered transparent images in `public/glyphs/` and configure:

```js
glyphs: {
  mode: "image",
  values: [
    "/glyphs/dark.png",
    "/glyphs/mid.png",
    "/glyphs/bright.png",
  ],
},
```

A sprite sheet uses the same ordered list with crop rectangles:

```js
values: [
  { src: "/glyphs/moons.png", x: 0, y: 0, width: 32, height: 32 },
  { src: "/glyphs/moons.png", x: 32, y: 0, width: 32, height: 32 },
]
```

Settings can also be changed without recreating the renderer from the browser console or future UI code:

```js
await asciiPortfolio.set({ cellSize: 12, contrast: 1.7, fps: 20 });
await asciiPortfolio.set({ voidLuminance: 0.01 });
await asciiPortfolio.setGlyphs(" WanTheDv");
await asciiPortfolio.setGlyphs([" ", "🌑", "🌓", "🌕"]);
```

## Camera framing

- `cameraTarget` — group-LOCAL point the camera aims at. `null` (the default)
  derives it from the knot+halo vertex mean, which is what keeps the knot centred
  at every window shape. Pass a `THREE.Vector3` or a plain `{ x, y, z }` to
  override.
- `cameraZ` — camera distance floor; 16:9 and any wider window use exactly this.
  On narrower windows the distance is derived from the object's bounding sphere
  so the knot is never cropped, and the far plane and fog scale with the
  pull-back so it stays visible and keeps its haze level. There is no
  hand-tuned fill constant to re-derive when the geometry changes.
- `framingOffset` — off-centre compositions only (`{ x: 0.1, y: 0 }` shifts the
  object right by a tenth of the width). Screen-space, so identical at every
  window size. Left at zero: the framing above is already centred.
- `scene.fog` — live `enabled`, `color` (hex), and `density` controls for the
  exponential fog. Density is adjusted with camera distance to preserve the
  same haze when narrow windows pull the camera back. For example,
  `asciiPortfolio.config.scene.fog.density = 0.12` updates while the page runs.

Resizes are coalesced to one pass per animation frame (a drag storm costs a
single GPU re-allocation instead of hundreds), and `devicePixelRatio` changes
(browser zoom, dragging to a different-DPI monitor) are tracked automatically
via `matchMedia` — no manual refresh needed.

Browser zoom scales the ASCII cell size in CSS pixels so the same physical
window keeps approximately the same glyph grid. Resizing the actual window
still adds or removes rows and columns. The displayed canvas holds its last
rendered size while a resize is pending, preventing a stretched intermediate
frame.

`asciiPortfolio.scene`, `camera`, `renderer`, `fx`, `bloom`, `composite`,
`ascii`, and `pointer` expose the current foundation for further experiments.
