import {
  CanvasTexture,
  LinearFilter,
  NoToneMapping,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { TexturePass } from "three/addons/postprocessing/TexturePass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { CopyShader } from "three/addons/shaders/CopyShader.js";

const STOPS = 5;

/**
 * Scene-side colour grade: chromatic aberration, gradient ramp, and invert.
 *
 * This runs AFTER the scene renders into the offscreen composer target, so the
 * ASCII sampler sees the graded frame. It does NOT include bloom — bloom runs
 * separately on the finished ASCII canvas via createBloomComposite, so the
 * glow applies to the glyphs themselves rather than bleeding onto the scene
 * geometry underneath them.
 *
 * Grain and vignette were removed because they operate on the raw scene
 * texture and produce visible shimmer when the ASCII layer resamples at a
 * lower resolution every frame.
 */
const GradeShader = {
  name: "GradeShader",
  uniforms: {
    tDiffuse: { value: null },
    aberration: { value: 0.012 },
    invert: { value: 0 },
    rampMix: { value: 0.55 },
    rampContrast: { value: 1 },
    rampBrightness: { value: 0 },
    rampMethod: { value: 0 },
    rampStops: { value: Array.from({ length: STOPS }, () => new Vector3()) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    #define STOPS 5

    uniform sampler2D tDiffuse;
    uniform float aberration;
    uniform float invert;
    uniform float rampMix;
    uniform float rampContrast;
    uniform float rampBrightness;
    uniform int rampMethod;
    uniform vec3 rampStops[STOPS];
    varying vec2 vUv;

    float luma(vec3 color) {
      return dot(color, vec3(0.2126, 0.7152, 0.0722));
    }

    vec3 sampleRamp(float t) {
      float scaled = clamp((t - 0.5) * rampContrast + 0.5 + rampBrightness, 0.0, 1.0)
        * float(STOPS - 1);
      int index = int(min(float(STOPS - 2), floor(scaled)));
      vec3 low = rampStops[0];
      vec3 high = rampStops[1];
      // Unrolled indexing: WebGL1 cannot index a uniform array with a variable.
      for (int i = 0; i < STOPS - 1; i++) {
        if (i == index) {
          low = rampStops[i];
          high = rampStops[i + 1];
        }
      }
      return mix(low, high, clamp(scaled - float(index), 0.0, 1.0));
    }

    void main() {
      vec2 fromCenter = vUv - 0.5;
      vec2 offset = fromCenter * aberration;
      vec3 color = vec3(
        texture2D(tDiffuse, vUv + offset).r,
        texture2D(tDiffuse, vUv).g,
        texture2D(tDiffuse, vUv - offset).b
      );

      float t = luma(color);
      if (rampMethod == 1) t = clamp(length(fromCenter) * 1.5, 0.0, 1.0);
      else if (rampMethod == 2) t = vUv.x;
      else if (rampMethod == 3) t = vUv.y;

      color = mix(color, color * 0.35 + sampleRamp(t), rampMix);

      gl_FragColor = vec4(mix(color, 1.0 - color, invert), 1.0);
    }
  `,
};

const RAMP_METHODS = { luma: 0, radial: 1, horizontal: 2, vertical: 3 };

// Ramp stops become linear on the CPU, matching how Three reads sRGB hex
// colours, so the shader stays in one colour space throughout.
function toLinear(hex) {
  const value = hex.replace("#", "");
  const normalized = value.length === 3
    ? [...value].map((character) => character.repeat(2)).join("")
    : value;
  if (!/^[\da-f]{6}$/i.test(normalized)) {
    throw new Error(`Ramp stops must use #RGB or #RRGGBB. Received: ${hex}`);
  }
  return [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
}

/**
 * Scene-side colour grade: RenderPass → GradeShader → OutputPass.
 *
 * The composer writes into an offscreen target; the ASCII renderer samples
 * this canvas directly, so the grade applies before glyph conversion.
 */
export function createSceneFx(renderer, scene, camera, options) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
  composer.addPass(new OutputPass());

  let width = 1;
  let height = 1;

  function setSize(w, h) {
    width = Math.max(1, w);
    height = Math.max(1, h);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(width, height);
  }

  function update() {
    const { ramp } = options;
    const uniforms = grade.uniforms;
    uniforms.aberration.value = options.aberration;
    uniforms.invert.value = options.invert ? 1 : 0;
    uniforms.rampMix.value = ramp.mix;
    uniforms.rampContrast.value = ramp.contrast;
    uniforms.rampBrightness.value = ramp.brightness;
    uniforms.rampMethod.value = RAMP_METHODS[ramp.method] ?? 0;
    ramp.stops.slice(0, STOPS).forEach((stop, index) => {
      uniforms.rampStops.value[index].fromArray(toLinear(stop));
    });
  }

  function render() {
    composer.render();
  }

  function dispose() {
    composer.dispose();
    grade.dispose();
  }

  return { composer, grade, setSize, update, render, dispose };
}

/**
 * Bloom composite: ASCII 2D canvas → TexturePass → UnrealBloomPass → CopyShader.
 *
 * The ASCII canvas is already display-referred sRGB, so NoToneMapping keeps
 * it byte-identical apart from the added bloom. OutputPass would ACES-tone-map
 * and re-encode sRGB, darkening the passthrough, so CopyShader is used instead.
 */
export function createBloomComposite(canvas, sourceCanvas, options) {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.toneMapping = NoToneMapping; // ASCII canvas is already display-referred sRGB
  renderer.setClearColor(0x000000, 1);

  const texture = new CanvasTexture(sourceCanvas);
  // No mipmaps: this texture is regenerated every frame at full window size, so
  // building a mip chain for it would cost more than the composite itself.
  texture.generateMipmaps = false;
  texture.minFilter = LinearFilter;
  // colorSpace is deliberately left at its default. Tagging the canvas as sRGB
  // would make the renderer decode it to linear and re-encode on output, which
  // darkens the glyphs; here the ASCII pixels must pass through untouched.

  const composer = new EffectComposer(renderer);
  composer.addPass(new TexturePass(texture));
  const bloom = new UnrealBloomPass(new Vector2(1, 1), 1, 0.5, 0.5);
  composer.addPass(bloom);
  composer.addPass(new ShaderPass(CopyShader));

  let width = 1;
  let height = 1;
  let pixelRatio = 1;
  let sourceWidth = sourceCanvas.width;
  let sourceHeight = sourceCanvas.height;

  function setSize(w, h, pr) {
    width = Math.max(1, w);
    height = Math.max(1, h);
    pixelRatio = pr || 1;
    // CanvasTexture.needsUpdate uploads pixels but does not reallocate the
    // immutable WebGL texture storage when the canvas changes dimensions.
    // Release that allocation so Three creates one matching the new canvas.
    if (sourceCanvas.width !== sourceWidth || sourceCanvas.height !== sourceHeight) {
      texture.dispose();
      sourceWidth = sourceCanvas.width;
      sourceHeight = sourceCanvas.height;
    }
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    composer.setPixelRatio(pixelRatio);
    composer.setSize(width, height);
    // A fluid CSS box would stretch the previous frame during a resize drag
    // until the next animation frame reallocates and redraws the buffers.
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }

  function render() {
    bloom.enabled = Boolean(options.bloom.enabled);
    bloom.strength = options.bloom.strength;
    bloom.radius = options.bloom.radius;
    bloom.threshold = options.bloom.threshold;
    texture.needsUpdate = true;
    composer.render();
  }

  function dispose() {
    composer.dispose();
    bloom.dispose();
    texture.dispose();
    renderer.dispose();
  }

  return { renderer, composer, bloom, texture, setSize, render, dispose };
}
