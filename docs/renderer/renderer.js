// Renderer module: provides createRenderer for initializing a Three.js scene.
// Dependency injection friendly for tests (pass in mock THREE).
// In browser (non-test) it will auto-bootstrap by dynamically importing Three.js.

let lastInstance = null;

export function createRenderer({ THREE, containerId = 'threejs-canvas' } = {}) {
  if (!THREE) throw new Error('THREE dependency missing');
  const container = document.getElementById(containerId);
  if (!container) throw new Error(`Container element #${containerId} not found`);

  const width = container.clientWidth || 800;
  const height = container.clientHeight || 600;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.set(0, 20, 50);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  // Optional OrbitControls if available
  let controls = null;
  if (THREE.OrbitControls) {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 10;
    controls.maxDistance = 200;
  }

  // Basic light + grid
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(10, 20, 10);
  scene.add(light);
  if (THREE.GridHelper) {
    const grid = new THREE.GridHelper(100, 50);
    scene.add(grid);
  }

  function animate() {
    if (lastInstance !== instance) return; // stop old loops after re-init
    requestAnimationFrame(animate);
    if (controls && controls.update) controls.update();
    renderer.render(scene, camera);
  }

  function resize() {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', resize);

  const instance = { scene, camera, renderer, controls, resize };
  lastInstance = instance;
  animate();
  return instance;
}

// Update (replace) dungeon mesh in scene.
export function updateDungeonMesh(mesh) {
  if (!lastInstance) return;
  const { scene } = lastInstance;
  // Keep lights & helpers (first few items)
  const preserve = new Set();
  scene.children.forEach((child, idx) => { if (idx < 3) preserve.add(child); });
  // Remove others
  for (let i = scene.children.length - 1; i >= 0; i--) {
    if (!preserve.has(scene.children[i])) scene.remove(scene.children[i]);
  }
  if (mesh) scene.add(mesh);
}

// Browser auto-bootstrap (skip during Jest tests)
if (typeof window !== 'undefined' && !(typeof process !== 'undefined' && process.env && process.env.JEST_WORKER_ID)) {
  // Only bootstrap once
  if (!window.__DUNGEON_RENDERER_BOOTSTRAPPED) {
    window.__DUNGEON_RENDERER_BOOTSTRAPPED = true;
    Promise.all([
      import('https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js'),
      import('https://cdn.jsdelivr.net/npm/three@0.155.0/examples/jsm/controls/OrbitControls.js')
        .catch(() => ({}))
    ]).then(([THREE, controlsModule]) => {
      if (controlsModule.OrbitControls) {
        THREE.OrbitControls = controlsModule.OrbitControls; // attach for createRenderer to detect
      }
      createRenderer({ THREE });
    }).catch(err => console.error('Three.js load failed', err));
  }
}