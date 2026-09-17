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
- Adjust the font, colour ramp, contrast, inversion, and FPS in `config.ascii`.
- Edit [`src/scene.js`](src/scene.js) to replace the default Three.js scene. The ASCII layer only samples its output canvas, so meshes, shaders, composer output, bloom, or other post-processing can replace it without changing the page content.

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
await asciiPortfolio.setGlyphs(" WanTheDv");
await asciiPortfolio.setGlyphs([" ", "🌑", "🌓", "🌕"]);
```

`asciiPortfolio.scene`, `camera`, and `renderer` expose the current Three.js foundation for further experiments.
