import * as THREE from 'three';
import './style.css';

// Replace these files in public/images to use the final artwork.
const projects = [
  { title: 'hermes', type: 'promotional film', image: '/images/01.svg', colors: ['#ee7623', '#f7e1a0', '#7186c3'] },
  { title: 'extra', type: 'illustration', image: '/images/02.svg', colors: ['#ec88aa', '#f7d243', '#ba1438'] },
  { title: 'typography', type: 'graphic design', image: '/images/03.svg', colors: ['#111111', '#f2f0eb', '#7f8fd0'] },
  { title: 'miscellaneous', type: 'personal work', image: '/images/04.svg', colors: ['#f8c7df', '#ef3660', '#111111'] },
  { title: 'M - Lettre Infinie', type: 'visual identity', image: '/images/05.svg', colors: ['#ea5a32', '#f7e5c1', '#2b287e'] },
  { title: 'Ponpon Mania', type: 'illustration', image: '/images/06.svg', colors: ['#43b88c', '#f7db3e', '#142d40'] },
  { title: 'Pop Art Car', type: 'campaign', image: '/images/07.svg', colors: ['#73cde3', '#f05a38', '#111111'] },
  { title: 'House of Frog', type: 'editorial', image: '/images/08.svg', colors: ['#dcecc9', '#e95d37', '#202a2a'] },
];

const canvas = document.querySelector('.webgl');
const titleEl = document.querySelector('[data-title]');
const typeEl = document.querySelector('[data-type]');
const currentEl = document.querySelector('[data-current]');
const statusEl = document.querySelector('.gallery__status');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setClearColor(0xf7f5f2, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 20);
camera.position.set(0, 0, 3);

const vertexShader = `
  uniform float uTime;
  uniform float uVelocityAbs;
  uniform float uIndex;
  uniform float uBump;
  varying vec2 vUv;

  float parabola(float x) {
    return 4.0 * x * (1.0 - x);
  }

  void main() {
    vUv = uv;
    vec4 clipPosition = modelViewMatrix * vec4(position, 1.0);
    vec3 ndcPosition = clipPosition.xyz / clipPosition.w;
    vec3 newPos = position;
    float screenX = clamp(ndcPosition.x * 0.5 + 0.5, 0.0, 1.0);

    // The reference gallery bends one continuous screen-space strip toward the viewer.
    newPos.z += parabola(screenX) * 0.4 * uBump;
    newPos.z += max(abs(uVelocityAbs) * -0.7, -0.1) * uBump;
    newPos.z -= sin(uv.y * 10.0 + uIndex) * 0.01 * uBump;
    newPos.y -= cos(uv.x * 10.0 + uIndex + 100.0) * 0.0035 * uBump;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D uTexture;
  uniform float uShade;
  varying vec2 vUv;
  void main() {
    vec4 color = texture2D(uTexture, vUv);
    float paper = sin(vUv.y * 380.0) * 0.004 + sin(vUv.x * 280.0) * 0.003;
    gl_FragColor = vec4(color.rgb * (uShade + paper), color.a);
  }
`;

const meshes = projects.map((project, index) => {
  const texture = new THREE.CanvasTexture(makeFallback(project, index));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTexture: { value: texture },
      uTime: { value: 0 },
      uVelocityAbs: { value: 0 },
      uIndex: { value: index },
      uBump: { value: 1 },
      uShade: { value: 1 },
    },
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
  });
  hydrateTexture(project.image, material, project, index);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 40, 40), material);
  mesh.userData.index = index;
  scene.add(mesh);
  return mesh;
});

const state = { target: 0, current: 0, velocity: 0, velocityAbs: 0, active: -1, idle: true };
const pointer = { down: false, lastX: 0, travel: 0, moved: false };
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function wrappedDistance(index, current) {
  let distance = index - current;
  const half = projects.length / 2;
  while (distance > half) distance -= projects.length;
  while (distance < -half) distance += projects.length;
  return distance;
}

function makeFallback(project, index) {
  const image = document.createElement('canvas');
  image.width = 900;
  image.height = 1200;
  const context = image.getContext('2d');
  const [base, accent, ink] = project.colors;
  context.fillStyle = base;
  context.fillRect(0, 0, image.width, image.height);
  context.strokeStyle = accent;
  context.lineWidth = 34;
  context.strokeRect(48, 48, 804, 1104);
  context.fillStyle = accent;
  context.beginPath();
  context.arc(450, 520, 220, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = ink;
  context.font = '900 74px Arial, sans-serif';
  context.textAlign = 'center';
  context.fillText(String(index + 1).padStart(2, '0'), 450, 600);
  context.font = '900 48px Arial, sans-serif';
  context.fillText(project.title.toUpperCase(), 450, 1040);
  return image;
}

async function hydrateTexture(path, material, project, index) {
  try {
    const response = await fetch(path, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Image request failed: ${response.status}`);
    const blob = await response.blob();
    const image = new Image();
    image.decoding = 'async';
    image.src = URL.createObjectURL(blob);
    await image.decode();
    const bitmap = document.createElement('canvas');
    bitmap.width = 900;
    bitmap.height = 1200;
    const context = bitmap.getContext('2d');
    context.fillStyle = project.colors[0];
    context.fillRect(0, 0, bitmap.width, bitmap.height);
    const ratio = Math.max(bitmap.width / image.naturalWidth, bitmap.height / image.naturalHeight);
    const width = image.naturalWidth * ratio;
    const height = image.naturalHeight * ratio;
    context.drawImage(image, (bitmap.width - width) / 2, (bitmap.height - height) / 2, width, height);
    URL.revokeObjectURL(image.src);
    const texture = new THREE.CanvasTexture(bitmap);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    material.uniforms.uTexture.value = texture;
    material.uniforms.uTexture.value.needsUpdate = true;
  } catch (error) {
    console.warn(`Using fallback for ${path}`, error);
  }
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function setActive(index) {
  const active = (index + projects.length) % projects.length;
  if (active === state.active) return;
  state.active = active;
  currentEl.textContent = String(active + 1).padStart(2, '0');
  titleEl.textContent = projects[active].title;
  typeEl.textContent = projects[active].type;
  titleEl.animate(
    [{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'translateY(0)' }],
    { duration: reducedMotion ? 0 : 260, easing: 'cubic-bezier(.2,.7,.2,1)' },
  );
}

function animate(time = 0) {
  state.velocity = state.target - state.current;
  state.velocityAbs += (Math.abs(state.velocity) - state.velocityAbs) * 0.12;

  if (reducedMotion) {
    state.current = state.target;
  } else if (!pointer.down && Math.abs(state.velocity) < 0.01) {
    state.target = Math.round(state.current);
    state.velocity = state.target - state.current;
    state.velocityAbs += (Math.abs(state.velocity) - state.velocityAbs) * 0.12;
    state.current += state.velocity * 0.1;
  } else {
    state.current += state.velocity * 0.09;
  }

  const scaleBoost = 1 + Math.min(state.velocityAbs / 10, 0.185);

  meshes.forEach((mesh, index) => {
    const distance = wrappedDistance(index, state.current);
    mesh.position.set(distance, 0.05, 0);
    mesh.rotation.set(0, 0, 0);
    mesh.scale.set(0.7875 * scaleBoost, 1.05 * scaleBoost, 1);
    mesh.material.uniforms.uTime.value = time * 0.001;
    mesh.material.uniforms.uVelocityAbs.value = state.velocityAbs;
    mesh.renderOrder = Math.round(100 - Math.abs(distance) * 10);
  });

  const progress = ((state.current % 1) + 1) % 1;
  const nearSnap = progress < 0.05 || progress > 0.95;
  if (state.idle && Math.abs(state.velocity) > 0.05 && !nearSnap) {
    state.idle = false;
    statusEl.classList.add('is-hidden');
  } else if (!state.idle && Math.abs(state.velocity) <= 0.05 && nearSnap) {
    state.idle = true;
    setActive(Math.round(state.current));
    statusEl.classList.remove('is-hidden');
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function moveBy(delta) { state.target += delta; }

window.addEventListener('wheel', (event) => {
  event.preventDefault();
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  moveBy(delta / 600);
}, { passive: false });

canvas.addEventListener('pointerdown', (event) => {
  pointer.down = true;
  pointer.lastX = event.clientX;
  pointer.travel = 0;
  pointer.moved = false;
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('pointermove', (event) => {
  if (!pointer.down) return;
  const dx = event.clientX - pointer.lastX;
  pointer.lastX = event.clientX;
  pointer.travel += Math.abs(dx);
  pointer.moved = pointer.travel > 4;
  state.target -= dx / 140;
});

canvas.addEventListener('pointerup', (event) => {
  if (!pointer.down) return;
  pointer.down = false;
  canvas.releasePointerCapture(event.pointerId);
});

canvas.addEventListener('pointercancel', () => { pointer.down = false; });

canvas.addEventListener('click', (event) => {
  if (pointer.moved) return;
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -((event.clientY / window.innerHeight) * 2 - 1),
  ), camera);
  const hit = raycaster.intersectObjects(meshes)[0];
  if (!hit) return;
  state.target += wrappedDistance(hit.object.userData.index, state.current);
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight') moveBy(1);
  if (event.key === 'ArrowLeft') moveBy(-1);
});

document.querySelectorAll('[data-jump]').forEach((button) => {
  button.addEventListener('click', () => {
    state.target += wrappedDistance(Number(button.dataset.jump), state.current);
  });
});

window.addEventListener('resize', resize);
resize();
setActive(0);
animate();
