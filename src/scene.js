import {
  ACESFilmicToneMapping,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  FogExp2,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PointLight,
  Points,
  PointsMaterial,
  Scene,
  SRGBColorSpace,
  TorusKnotGeometry,
  WebGLRenderer,
} from "three";

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

export function createScene(canvas, options) {
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
  renderer.setClearColor(options.background, 1);

  const scene = new Scene();
  scene.background = new Color(options.background);
  scene.fog = new FogExp2(options.background, 0.075);

  const camera = new PerspectiveCamera(46, 1, 0.1, 40);
  camera.position.set(0, 0, options.cameraZ);

  const group = new Group();
  group.rotation.set(-0.18, 0.35, 0.08);
  scene.add(group);

  const geometry = new TorusKnotGeometry(1.7, 0.42, 128, 14, 2, 3);
  const material = new MeshStandardMaterial({
    color: options.objectColor,
    roughness: 0.38,
    metalness: 0.12,
    flatShading: true,
  });
  const knot = new Mesh(geometry, material);
  group.add(knot);

  const random = seededRandom(8374);
  const positions = new Float32Array(options.particleCount * 3);
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
    color: options.particleColor,
    size: 0.035,
    sizeAttenuation: true,
  });
  const particles = new Points(particleGeometry, particleMaterial);
  scene.add(particles);

  scene.add(new HemisphereLight(0xb8d7ef, 0x08090b, 1.45));
  const keyLight = new DirectionalLight(0xffffff, 3.2);
  keyLight.position.set(-3, 4, 5);
  scene.add(keyLight);
  const rimLight = new PointLight(0x91b8d0, 18, 14);
  rimLight.position.set(4, -2, 2);
  scene.add(rimLight);

  function resize(width, height) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function update(time) {
    knot.rotation.x = time * options.rotationSpeed * 0.7;
    knot.rotation.y = time * options.rotationSpeed;
    group.rotation.z = Math.sin(time * 0.12) * 0.12;
    particles.rotation.y = time * options.rotationSpeed * -0.08;
    particles.rotation.x = Math.sin(time * 0.04) * 0.08;
  }

  function render() {
    renderer.render(scene, camera);
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
    particleGeometry.dispose();
    particleMaterial.dispose();
    renderer.dispose();
  }

  return { renderer, scene, camera, update, render, resize, dispose };
}
