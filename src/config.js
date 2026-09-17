/**
 * The experimentation surface for the site.
 *
 * Glyph order is darkest to brightest unless `invert` is enabled. JavaScript's
 * Array.from is used internally, so multi-byte Unicode glyphs are safe.
 */
export const glyphPresets = {
  classic: " .,:;irsXA253hMHGS#9B&@",
  compact: " .-+=#@",
  wanTheDev: " WanTheDv",
  moonPhases: [" ", "🌑", "🌒", "🌓", "🌔", "🌕"],
};

export const config = {
  ascii: {
    glyphs: {
      // `text`: a string/array. `image`: ordered image URLs or sprite-frame objects.
      mode: "text",
      values: glyphPresets.classic,
    },
    cellSize: 9,
    lineHeight: 1.15,
    fontFamily: 'ui-monospace, "Cascadia Mono", "SFMono-Regular", Consolas, monospace',
    fontWeight: 600,
    colors: {
      background: "#050608",
      low: "#313741",
      high: "#dce7f2",
    },
    contrast: 1.35,
    invert: false,
    fps: 30,
    spriteScale: 0.9,
  },

  scene: {
    background: 0x050608,
    objectColor: 0xdde7f0,
    particleColor: 0x69727f,
    particleCount: 650,
    cameraZ: 6.5,
    rotationSpeed: 0.08,
  },

  performance: {
    maxDevicePixelRatio: 1.5,
  },
};
