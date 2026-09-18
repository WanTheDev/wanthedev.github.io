import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  FogExp2,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PointLight,
  Points,
  PointsMaterial,
  Scene,
  SRGBColorSpace,
  TorusKnotGeometry,
  Vector3,
  WebGLRenderer,
} from "three";
import { createInteraction } from "./interaction.js";
import { createSceneFx } from "./postfx.js";

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

export function createScene(
  canvas,
  sceneOptions,
  postOptions,
  interactOptions,
) {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setClearColor(sceneOptions.background, 1);

  const scene = new Scene();
  scene.background = new Color(sceneOptions.background);
  scene.fog = new FogExp2(sceneOptions.background, 0.075);
  // Captured so `resize` can rescale the haze with the framing pull-back.
  const fogDensity = scene.fog.density;

  const camera = new PerspectiveCamera(46, 1, 0.1, 40);

  const group = new Group();
  group.rotation.set(-0.18, 0.35, 0.08);
  scene.add(group);

  const geometry = new TorusKnotGeometry(1.9, 0.4, 90, 4, 2, 3);
  const material = new MeshStandardMaterial({
    color: sceneOptions.objectColor,
    roughness: 0.38,
    metalness: 0.12,
    flatShading: true,
  });
  const knot = new Mesh(geometry, material);
  group.add(knot);

  // A matching shell that never writes depth: it reads as a glow around the knot
  // and is what the bloom pass picks up.
  const haloGeometry = new TorusKnotGeometry(1.7, 0.5, 96, 10, 2, 3);
  const haloMaterial = new MeshBasicMaterial({
    color: 0x8fc0e8,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const halo = new Mesh(haloGeometry, haloMaterial);
  halo.scale.setScalar(1.06);
  halo.rotation.copy(knot.rotation);
  group.add(halo);

  // Derive the object's centre in group-local space: the mean of the knot and
  // halo vertices, with the halo's constant 1.06 scale folded in.
  // `setFromObject` would include the group's rotation, so read the raw
  // attributes instead. This is the point the camera aims at, and aiming at it
  // is what keeps the knot centred at every window shape.
  // `sceneOptions.cameraTarget` overrides it, in the same local space.
  const localTarget = new Vector3();
  {
    let sumX = 0, sumY = 0, sumZ = 0, count = 0;
    const knotPos = geometry.attributes.position;
    for (let i = 0; i < knotPos.count; i++) {
      sumX += knotPos.getX(i);
      sumY += knotPos.getY(i);
      sumZ += knotPos.getZ(i);
      count++;
    }
    const haloPos = haloGeometry.attributes.position;
    for (let i = 0; i < haloPos.count; i++) {
      sumX += 1.06 * haloPos.getX(i);
      sumY += 1.06 * haloPos.getY(i);
      sumZ += 1.06 * haloPos.getZ(i);
      count++;
    }
    localTarget.set(sumX / count, sumY / count, sumZ / count);
  }

  const target = new Vector3();
  if (sceneOptions.cameraTarget) {
    const override = sceneOptions.cameraTarget;
    if (override.isVector3) target.copy(override);
    else target.set(override.x, override.y, override.z);
  } else {
    target.copy(localTarget);
  }
  // Radius of the smallest sphere centred on `target` that holds the knot at ANY
  // rotation. The knot spins about its own origin, so each vertex sweeps a
  // circle of radius |v|; the greatest distance from `target` to that sweep is
  // therefore max|v| + |target|. (Measuring the distance from `target` to the
  // vertices at rest would understate it and crop the silhouette once rotating.)
  let framingRadius = 0;
  {
    let maxVertex = 0;
    const measure = (attributes, scale) => {
      for (let i = 0; i < attributes.count; i++) {
        const x = scale * attributes.getX(i);
        const y = scale * attributes.getY(i);
        const z = scale * attributes.getZ(i);
        maxVertex = Math.max(maxVertex, Math.hypot(x, y, z));
      }
    };
    measure(geometry.attributes.position, 1);
    measure(haloGeometry.attributes.position, 1.06);
    // 1.08 keeps a small margin around the silhouette; without it a portrait
    // window would push the knot right up against the left and right edges.
    framingRadius = (maxVertex + target.length()) * 1.08;
  }
  // `cameraZ` is the distance floor, so any window wider than 16:9 keeps exactly
  // the framing that was hand-tuned there.
  const tanHalfFov = Math.tan((camera.fov * Math.PI) / 360);
  // sin of the VERTICAL half-angle, which is what a sphere's fit distance needs.
  const sinHalfFov = tanHalfFov / Math.sqrt(1 + tanHalfFov * tanHalfFov);
  let framingDistance = sceneOptions.cameraZ;

  function frameDistance(aspect) {
    // A sphere of radius R fits inside a cone of half-angle θ only when the eye
    // is at least R / sin(θ) away — the tangent form R / tan(θ) is the distance
    // to the sphere's FRONT, which crops the silhouette. Vertical half-angle is
    // `sinHalfFov`; the horizontal one is steeper, and `sin(hHalf)` is computed
    // from `tan(vHalf) · aspect` so the wider of the two constraints wins.
    const t = tanHalfFov * Math.max(aspect, 1e-3);
    const sinHorizontal = t / Math.sqrt(1 + t * t);
    const sine = Math.min(sinHalfFov, sinHorizontal);
    return Math.max(sceneOptions.cameraZ, framingRadius / sine);
  }

  const random = seededRandom(8374);
  const positions = new Float32Array(sceneOptions.particleCount * 3);
  for (let index = 0; index < positions.length; index += 3) {
    const radius = 3.2 + random() * 10;
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    positions[index] = radius * Math.sin(phi) * Math.cos(theta);
    positions[index + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[index + 2] = radius * Math.cos(phi);
  }

  const particleGeometry = new BufferGeometry();
  particleGeometry.setAttribute("position", new BufferAttribute(positions, 3));
  const particleMaterial = new PointsMaterial({
    color: sceneOptions.particleColor,
    size: 0.035,
    sizeAttenuation: true,
  });
  const particles = new Points(particleGeometry, particleMaterial);
  scene.add(particles);

  const keyLight = new DirectionalLight(0xffffff, 3.2);
  keyLight.position.set(-3, 4, 5);
  const rimLight = new PointLight(0x91b8d0, 18, 14);
  rimLight.position.set(4, -2, 2);
  const lights = [
    new HemisphereLight(0xb8d7ef, 0x08090b, 1.45),
    keyLight,
    rimLight,
  ];
  for (const light of lights) {
    light.baseIntensity = light.intensity;
    scene.add(light);
  }

  const fx = createSceneFx(renderer, scene, camera, postOptions);
  const { pointer, dispose: disposePointer } = createInteraction();

  // Smoothed camera state: `angleX/Y` follow the pointer, `distance` is the
  // pointer-pull zoom factor.
  const rig = { angleX: 0, angleY: 0, distance: 1 };

  function resize(width, height, fraction = 1, viewportAspect = width / height) {
    // Clamp to avoid NaN / degenerate draw calls from zero or negative sizes.
    width = Math.max(1, Math.floor(width));
    height = Math.max(1, Math.floor(height));
    // The renderer draws into the composer's buffers at this size, which is a
    // fraction of the glyph grid, so a bigger canvas costs no extra fill.
    renderer.setPixelRatio(Math.max(0.25, fraction));
    renderer.setSize(width, height, false);
    // The render target is one pixel per glyph, but glyph cells are taller
    // than they are wide. Project for the displayed viewport, not the grid's
    // column/row ratio, or the final ASCII image stretches the scene.
    camera.aspect = viewportAspect;
    // Apply framing offset (from config.framingOffset) as a screen-space nudge.
    // `setViewOffset` overwrites camera.aspect with fullWidth/fullHeight, so
    // its full frame must use the displayed aspect too (not the glyph grid).
    // The offset is the same fraction of the frame at every aspect ratio.
    // Measured convention:
    // POSITIVE x moves the object right, POSITIVE y moves it down — the value is
    // negated below precisely because a frustum shifted +x shows the object
    // further left.
    const off = sceneOptions.framingOffset;
    if (off && (off.x || off.y)) {
      camera.setViewOffset(viewportAspect, 1, -off.x * viewportAspect, -off.y, viewportAspect, 1);
    } else {
      camera.clearViewOffset();
    }
    framingDistance = frameDistance(camera.aspect);
    // A pulled-back camera has to still reach the knot, and must not drown it in
    // the exponential fog: without this a portrait window pushes the knot past
    // the far plane and fogs it to black. The far plane grows with the pull-back
    // and the fog scales with it, so the knot keeps the haze level it has at the
    // reference aspect.
    camera.far = Math.max(40, framingDistance + framingRadius * 2);
    scene.fog.density = fogDensity * (sceneOptions.cameraZ / framingDistance);
    camera.updateProjectionMatrix();
    fx.setSize(width, height);
  }

  // Reused every frame by `update` (which runs at display rate, so it must not
  // allocate) to hold the look-at target in world space.
  const worldTarget = new Vector3();

  function update(time, delta = 0) {
    const settings = interactOptions;
    const enabled = settings.enabled;

    for (const light of lights)
      light.intensity = light.baseIntensity * sceneOptions.lightScale;

    knot.rotation.x = time * sceneOptions.rotationSpeed * 0.7;
    knot.rotation.y = time * sceneOptions.rotationSpeed;
    group.rotation.z = Math.sin(time * 0.12) * 0.12;
    particles.rotation.y = time * sceneOptions.rotationSpeed * -0.08;
    particles.rotation.x = Math.sin(time * 0.04) * 0.08;
    // `spring` is a per-second rate, so the easing does not change with frame rate.
    const step = Math.max(delta, 1 / 240);
    const ease = 1 - Math.exp(-settings.spring * step);

    const x = enabled ? pointer.x * (settings.invert ? -1 : 1) : 0;
    const y = enabled ? pointer.y : 0;
    const held = enabled && pointer.held;
    const strength = settings.strength;

    rig.angleX = MathUtils.lerp(rig.angleX, x * strength, ease);
    rig.angleY = MathUtils.lerp(
      rig.angleY,
      -y * strength * settings.tilt,
      ease,
    );
    rig.distance = MathUtils.lerp(
      rig.distance,
      held ? 1 - settings.zoom : 1,
      ease,
    );

    const spin = MathUtils.clamp(rig.angleX, -1.4, 1.4);
    const lift = MathUtils.clamp(rig.angleY, -1.2, 1.2);
    const distance = framingDistance * rig.distance;
    // Orbit around the TARGET, not the world origin, so the object stays put in
    // frame as the pointer swings the camera. Reused across frames: `update`
    // runs every display frame, so it must not allocate.
    group.localToWorld(worldTarget);
    camera.position.set(
      worldTarget.x + Math.sin(spin) * Math.cos(lift) * distance,
      worldTarget.y + Math.sin(lift) * distance,
      worldTarget.z + Math.cos(spin) * Math.cos(lift) * distance,
    );
    camera.lookAt(worldTarget);

    halo.rotation.copy(knot.rotation);
    halo.scale.setScalar(1.06 + Math.sin(time * 0.8) * 0.02);

    fx.update();
  }

  function render() {
    fx.render();
  }

  function dispose() {
    disposePointer();
    fx.dispose();
    geometry.dispose();
    material.dispose();
    haloGeometry.dispose();
    haloMaterial.dispose();
    particleGeometry.dispose();
    particleMaterial.dispose();
    renderer.dispose();
  }

  return {
    renderer,
    scene,
    camera,
    fx,
    pointer,
    update,
    render,
    resize,
    dispose,
  };
}
