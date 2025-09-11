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
    // Provide WFC generation hook if dependencies available
    window.generateWFCDungeon = async function({x=3,y=3,z=3}={}) {
      try {
        if (x<1||y<1||z<1) throw new Error('Invalid size');
        // Sizes in tiles -> voxel dims
        const vx = x*3, vy = y*3, vz = z*3;
        const [{ initializeTileset, tilePrototypes } , WFCMod, meshUtil] = await Promise.all([
          import('../dungeon/tileset.js'),
          import('../dungeon/ndwfc.js'),
          import('./wfc_tile_mesh.js')
        ]);
        if (!window.NDWFC3D) {
          // minimal stub for tileset registration; tileset just calls NDWFC3D(proto)
          window.NDWFC3D = function(){};
        }
        initializeTileset();
        const n = tilePrototypes.length;
        const weights = new Array(n).fill(1);
        const rules = [];
        for (let a=0;a<n;a++) for (let b=0;b<n;b++){ rules.push(['x',a,b]); rules.push(['y',a,b]); rules.push(['z',a,b]); }
        const WFC = WFCMod.default || WFCMod.WFC || WFCMod;
        const wf = new WFC({ nd:3, weights, rules });
        wf.expand([0,0,0],[vy,vx,vz]); // note ordering per original WFC code (y,x,z)
        let finished=false; for (let i=0;i<2000;i++){ if (wf.step()){ finished=true; break; } }
        if (!finished) throw new Error('WFC did not finish');
        const wave = wf.readout();
        // Build full voxel grid (vz,vy,vx)
        const grid = Array.from({length:vz},()=>Array.from({length:vy},()=>Array(vx).fill(0)));
        for (const key in wave){
          const [Y,X,Z] = key.split(',').map(Number); // ordering from WFC readout
          const protoIndex = wave[key];
          const vox = tilePrototypes[protoIndex].voxels;
          for (let zz=0; zz<3; zz++) for (let yy=0; yy<3; yy++) for (let xx=0; xx<3; xx++){
            const gz = Z*3 + zz;
            const gy = Y*3 + yy;
            const gx = X*3 + xx;
            if (gz< vz && gy< vy && gx< vx) grid[gz][gy][gx] = vox[zz][yy][xx];
          }
        }
        // Parse into tile placements
        const tiles = meshUtil.parseVoxelGridToTiles(grid);
        // Build group
        const THREE = camera.constructor.prototype && camera.constructor.prototype.isCamera ? camera.constructor : window.THREE || (await import('three'));
        const group = new THREE.Group();
        tiles.forEach(t => {
          const gm = meshUtil.buildTileMesh({THREE, prototypeIndex:t.prototypeIndex, rotationY:t.rotationY, unit:3});
          gm.position.set(t.position[2]*3, t.position[1]*3, t.position[0]*3); // x<-tileX,z<-tileZ,y<-tileY mapping
          group.add(gm);
        });
        updateDungeonMesh(group);
      } catch(e){ console.error('WFC generation failed', e); }
    };
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
  if (!window.__DUNGEON_RENDERER_BOOTSTRAPPED) {
    window.__DUNGEON_RENDERER_BOOTSTRAPPED = true;
    Promise.all([
      import('https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js'),
      import('https://cdn.jsdelivr.net/npm/three@0.155.0/examples/jsm/controls/OrbitControls.js')
    ]).then(([threeModule, controlsModule]) => {
      if (!controlsModule.OrbitControls) throw new Error('Failed to load OrbitControls');
      // Create an extensible copy of the module namespace so we can attach OrbitControls
      const THREE = { ...threeModule, OrbitControls: controlsModule.OrbitControls };
      createRenderer({ THREE });
    }).catch(err => console.error('Three.js load failed', err));
  }
}