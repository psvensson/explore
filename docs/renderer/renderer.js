// Renderer module: provides createRenderer for initializing a Three.js scene.
// Dependency injection friendly for tests (pass in mock THREE with OrbitControls).
// In browser (non-test) it will auto-bootstrap by dynamically importing Three.js and OrbitControls.

let lastInstance = null;

export function createRenderer({ THREE, containerId = 'threejs-canvas' } = {}) {
  if (!THREE) throw new Error('THREE dependency missing');
  if (!THREE.OrbitControls) throw new Error('THREE.OrbitControls missing');
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

  // Always create OrbitControls
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = true;
  controls.screenSpacePanning = true;
  controls.enableRotate = true;
  controls.minDistance = 5;
  controls.maxDistance = 300;

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
    controls.update();
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
  // Helper APIs
  instance.resetView = function resetView() {
    camera.position.set(0, 20, 50);
    controls.target.set(0, 0, 0);
    controls.update();
  };
  instance.setZoomDistance = function setZoomDistance(dist) {
    const target = controls.target.clone();
    const dir = camera.position.clone().sub(target).normalize();
    const clamped = Math.min(Math.max(dist, controls.minDistance || 5), controls.maxDistance || 300);
    camera.position.copy(dir.multiplyScalar(clamped).add(target));
    controls.update();
  };
  instance.pan = function pan(dx, dy) {
    const distance = camera.position.distanceTo(controls.target);
    const panSpeed = distance * 0.0015; // scale with distance
    const x = -dx * panSpeed;
    const y = dy * panSpeed;
    const te = camera.matrix.elements;
    // camera basis vectors
    const vx = { x: te[0], y: te[1], z: te[2] };
    const vy = { x: te[4], y: te[5], z: te[6] };
    // Convert to THREE.Vector3 using camera right & up
    const right = new THREE.Vector3(vx.x, vx.y, vx.z).multiplyScalar(x);
    const up = new THREE.Vector3(vy.x, vy.y, vy.z).multiplyScalar(y);
    controls.target.add(right).add(up);
    camera.position.add(right).add(up);
    controls.update();
  };
  // expose globally for UI hooks
  if (typeof window !== 'undefined') {
    window.dungeonRenderer = instance;
  }

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
    ]).then(([THREE, controlsModule]) => {
      if (!controlsModule.OrbitControls) throw new Error('Failed to load OrbitControls');
      THREE.OrbitControls = controlsModule.OrbitControls; // attach for createRenderer to detect
      createRenderer({ THREE });
    }).catch(err => console.error('Three.js load failed', err));
  }
}