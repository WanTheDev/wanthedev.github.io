/**
 * The experimentation surface for the site.
 *
 * Glyph order is darkest to brightest unless `invert` is enabled. JavaScript's
 * Array.from is used internally, so multi-byte Unicode glyphs are safe.
 *
 * Every value is read live: edit `config` in the browser console (it is exposed
 * as `asciiPortfolio.config`) and the change shows up on the next frame.
 */
export const glyphPresets = {
  classic: " .,:;irsWA253NTHE#9DEV",
  compact: " .-+=#@",
  wanTheDev: "wanthedevWANTHEDEV",
  moonPhases: [" ", "🌑", "🌒", "🌓", "🌔", "🌕"],
};

export const config = {
  ascii: {
    glyphs: {
      // `text`: a string/array. `image`: ordered image URLs or sprite-frame objects.
      mode: "text",
      values: glyphPresets.wanTheDev,
    },
    cellSize: 9,
    lineHeight: 1.15,
    fontFamily:
      'ui-monospace, "Cascadia Mono", "SFMono-Regular", Consolas, monospace',
    colors: {
      background: "#000000",
      low: "#313741",
      high: "#dce7f2",
      // `palette`: glyphs interpolate `low` -> `high`. `source`: glyphs take the
      // sampled scene colour, so the post-processing hues (ramp, aberration,
      // bloom) actually reach the screen.
      mode: "source",
    },
    contrast: 1.15,
    // Samples at or below this source luminance are empty, even if the first
    // glyph is a visible character. Raise it if the scene/grade lifts the void.
    voidLuminance: 0.0034,
    invert: false,
    fps: 30,
    spriteScale: 0.9,
  },

  scene: {
    background: 0x050608,
    // Exponential scene fog. The effective density follows the camera's
    // framing distance so portrait windows keep the same haze as landscape.
    // These values are read live from asciiPortfolio.config.scene.fog.
    fog: { enabled: false, color: 0x050608, density: 0.075 },
    objectColor: 0xdde7f0,
    particleColor: 0x69727f,
    particleCount: 100,
    // Camera distance floor: 16:9 and any wider window use exactly this. On
    // narrower windows the distance is derived from the object's bounding sphere
    // so the knot is never cropped (see `src/scene.js`).
    cameraZ: 0,
    // Group-LOCAL point the camera aims at — the frame centre. `null` (the
    // correct default) derives it from the knot + halo vertex mean, which keeps
    // the knot centred at every window shape. A THREE.Vector3 or `{ x, y, z }`
    // overrides it; note the space is the knot's own local space, NOT world
    // space, so the value does not have to be re-tuned when `cameraZ` changes.
    cameraTarget: null,
    // Deliberately keep out of the framing maths: `cameraZ` is the floor and the
    // object is centred by construction, so nothing needs nudging. Kept as a
    // knob for off-centre compositions only — a FRACTION of the frame
    // (0.1 = a tenth of width/height), applied in screen space so it is identical
    // at every window size.
    framingOffset: { x: 0, y: 0 },
    rotationSpeed: 0.21,
    // Multiplies every light intensity. The additive halo mesh around the knot
    // is what this mostly drives; bloom no longer reads the scene at all, it
    // runs on the finished ASCII canvas (see `post.bloom`).
    lightScale: 0.65,
  },
  post: {
    // The scene renders through the colour grade (ramp + aberration + invert);
    // the glyph pass turns that into ASCII; then bloom runs on the finished
    // ASCII canvas, so the glow sits on the glyphs themselves rather than on
    // the scene behind them. threshold is in plain sRGB luminance of the glyph
    // colours (near-white on near-black) and no longer pairs with lightScale.
    bloom: { enabled: true, strength: 0.4, radius: 0.5, threshold: 0.3 },
    // Colour fringing: red and blue shift radially by this fraction of the
    // half-frame, so the corners separate about twice as much as the centre.
    aberration: 0.01,
    // Gradient ramp: maps the frame through `stops`, darkest to brightest.
    ramp: {
      method: "luma", // luma | radial | horizontal | vertical
      stops: ["#050608", "#2a3446", "#9fbdd8", "#f2f7ff"],
      mix: 1, // 0 = untouched frame, 1 = pure ramp
      contrast: 1,
      brightness: 0,
    },
    invert: false, // negative image (the glyph ramp has its own `ascii.invert`)
    // The scene renders at `fraction` times the glyph grid, and the ASCII layer
    // averages each cell down to one colour. 1 oversamples a cell by the aspect
    // of its cell box; lower is cheaper and slightly softer, higher is sharper.
    quality: { fraction: 1.5 },
  },

  // Camera handling for pointer and touch: the camera swings on a sphere around
  // the object. Pointer position sets the target angle, `spring` sets how fast
  // it gets there. Holding the button or finger down pulls the camera closer
  // (`zoom`) and doubles the swing (`holdStrength`) for as long as it is held.
  interact: {
    enabled: true,
    strength: 0.25, // max camera swing, in radians
    tilt: 1, // vertical swing, as a fraction of strength
    zoom: 0.12, // camera moves this fraction closer while the pointer is held
    holdStrength: 2, // rotation strength multiplier while held - doubles the drag
    spring: 3, // swing response speed in 1/s; higher = snappier
    invert: false, // mirror the horizontal swing
  },

  performance: {
    maxDevicePixelRatio: 1.5,
  },
};
