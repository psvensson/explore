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
  const orbitCamera = new THREE.PerspectiveCamera(75, width / height, 0.1, 2000);
  orbitCamera.position.set(0, 40, 110);
  // FPS camera (initially inactive)
  const fpsCamera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1500);
  fpsCamera.position.set(0, 15, 30);
  if (fpsCamera.rotation && typeof fpsCamera.rotation === 'object') {
    fpsCamera.rotation.order = 'YXZ';
  }
  if (!fpsCamera.userData) fpsCamera.userData = {};
  fpsCamera.userData.keep = true; // ensure not removed when swapping meshes
  // Attach a headlamp light (if available)
  if (THREE.PointLight) {
    const lamp = new THREE.PointLight(0xffffff, 1.2, 90, 2);
    if (lamp.position && lamp.position.set) lamp.position.set(0, 0, -2); // slightly behind camera
    lamp.userData = { keep: true };
    if (fpsCamera.add) fpsCamera.add(lamp);
  } else if (THREE.SpotLight) {
    const spot = new THREE.SpotLight(0xffffff, 1.1, 120, Math.PI/4, 0.3, 2);
    if (spot.position && spot.position.set) spot.position.set(0,0,0);
    if (spot.target && spot.target.position && spot.target.position.set) spot.target.position.set(0,0,-5);
    if (fpsCamera.add){ fpsCamera.add(spot); if (spot.target) fpsCamera.add(spot.target); }
  }
  scene.add(fpsCamera);
  let activeCamera = orbitCamera;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  // Always create OrbitControls
  const controls = new THREE.OrbitControls(orbitCamera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = true;
  controls.screenSpacePanning = true;
  controls.enableRotate = true;
  controls.minDistance = 5;
  controls.maxDistance = 300;

  // Lighting setup (improved visibility): directional + optional hemi + ambient
  if (THREE.DirectionalLight) {
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(25, 40, 20);
    dir.castShadow = !!dir.castShadow;
    dir.userData = { keep: true };
    scene.add(dir);
  }
  if (THREE.HemisphereLight) {
    const hemi = new THREE.HemisphereLight(0x99bbff, 0x223344, 0.6);
    hemi.userData = { keep: true };
    scene.add(hemi);
  }
  if (THREE.AmbientLight) {
    const amb = new THREE.AmbientLight(0xffffff, 0.35);
    amb.userData = { keep: true };
    scene.add(amb);
  }
  if (THREE.GridHelper) {
    const grid = new THREE.GridHelper(150, 60, 0x336699, 0x224455);
    grid.userData = { keep: true };
    scene.add(grid);
  }
  // Tone mapping / color space (safe guards for mocks in tests)
  if (typeof THREE.sRGBEncoding !== 'undefined') {
    renderer.outputEncoding = THREE.sRGBEncoding;
  }
  if (renderer.physicallyCorrectLights !== undefined) renderer.physicallyCorrectLights = true;

  let lastTime = performance && performance.now ? performance.now() : Date.now();
  function animate() {
    if (lastInstance !== instance) return; // stop old loops after re-init
    requestAnimationFrame(animate);
    const now = performance && performance.now ? performance.now() : Date.now();
    const dt = Math.min(0.1, (now - lastTime) / 1000); // clamp delta
    lastTime = now;
    if (mode === 'fps') updateFPS(dt);
    controls.update();
    renderer.render(scene, activeCamera);
  }

  function resize() {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    orbitCamera.aspect = w / h;
    orbitCamera.updateProjectionMatrix();
    fpsCamera.aspect = w / h;
    fpsCamera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', resize);

  let mode = 'orbit';
  const keyState = Object.create(null);
  let yaw = 0, pitch = 0; // radians for fps camera
  const moveSpeed = 25; // units per second
  const lookSpeed = 0.0025;
  function updateFPS(dt){
    // Movement vector in camera local space
    const forward = new THREE.Vector3(0,0,-1).applyEuler(fpsCamera.rotation);
    const right = new THREE.Vector3(1,0,0).applyEuler(fpsCamera.rotation);
    forward.y = 0; right.y = 0; forward.normalize(); right.normalize();
    const up = new THREE.Vector3(0,1,0);
    let vel = new THREE.Vector3();
    if (keyState['KeyW']) vel.add(forward);
    if (keyState['KeyS']) vel.sub(forward);
    if (keyState['KeyD']) vel.add(right);
    if (keyState['KeyA']) vel.sub(right);
    if (keyState['Space']) vel.add(up);
    if (keyState['ShiftLeft'] || keyState['ShiftRight']) vel.sub(up);
    if (vel.lengthSq()>0) vel.normalize().multiplyScalar(moveSpeed * dt);
    fpsCamera.position.add(vel);
  }
  function enableFPS(){
    mode='fps'; activeCamera = fpsCamera; controls.enabled=false; lockPointer(); }
  function enableOrbit(){ mode='orbit'; activeCamera = orbitCamera; controls.enabled=true; unlockPointer(); }
  function toggleCamera(){ mode==='orbit'?enableFPS():enableOrbit(); }
  function lockPointer(){ if (isTest) return; const el=renderer.domElement; if (el.requestPointerLock) el.requestPointerLock(); }
  function unlockPointer(){ if (isTest) return; if (document.exitPointerLock) document.exitPointerLock(); }
  function onMouseMove(e){ if (mode!=='fps') return; if (!document.pointerLockElement && !isTest) return; yaw -= e.movementX * lookSpeed; pitch -= e.movementY * lookSpeed; const maxPitch = Math.PI/2 - 0.01; pitch = Math.max(-maxPitch, Math.min(maxPitch, pitch)); fpsCamera.rotation.set(pitch, yaw, 0); }
  const isTest = typeof process !== 'undefined' && process.env && process.env.JEST_WORKER_ID;
  if (!isTest){
    window.addEventListener('keydown', e=>{ keyState[e.code]=true; if (e.code==='KeyF') toggleCamera(); });
    window.addEventListener('keyup', e=>{ keyState[e.code]=false; });
    window.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('click', ()=>{ if (mode==='fps') lockPointer(); });
    document.addEventListener('pointerlockchange', ()=>{ if (mode==='fps' && !document.pointerLockElement){ /* lost lock -> drop to orbit? */ } });
  }
  const instance = { scene, camera: activeCamera, orbitCamera, fpsCamera, renderer, controls, resize, enableFPS, enableOrbit, toggleCamera, get mode(){ return mode; }, THREE };
  // Helper APIs
  instance.resetView = function resetView() {
    orbitCamera.position.set(0, 40, 110);
    controls.target.set(0, 0, 0);
    controls.update();
  };
  instance.setZoomDistance = function setZoomDistance(dist) {
    const target = controls.target.clone();
    const dir = orbitCamera.position.clone().sub(target).normalize();
    const clamped = Math.min(Math.max(dist, controls.minDistance || 5), controls.maxDistance || 300);
    orbitCamera.position.copy(dir.multiplyScalar(clamped).add(target));
    controls.update();
  };
  instance.pan = function pan(dx, dy) {
    const distance = orbitCamera.position.distanceTo(controls.target);
    const panSpeed = distance * 0.0015; // scale with distance
    const x = -dx * panSpeed;
    const y = dy * panSpeed;
    const te = orbitCamera.matrix.elements;
    // camera basis vectors
    const vx = { x: te[0], y: te[1], z: te[2] };
    const vy = { x: te[4], y: te[5], z: te[6] };
    // Convert to THREE.Vector3 using camera right & up
    const right = new THREE.Vector3(vx.x, vx.y, vx.z).multiplyScalar(x);
    const up = new THREE.Vector3(vy.x, vy.y, vy.z).multiplyScalar(y);
    controls.target.add(right).add(up);
    orbitCamera.position.add(right).add(up);
    controls.update();
  };
  // expose globally for UI hooks
  if (typeof window !== 'undefined') {
  window.dungeonRenderer = instance;
    // Provide WFC generation hook if dependencies available
  function gridToAscii(grid){
      // grid[z][y][x] with values: 0 empty, 1 solid, 2 stair (portal parts)
      if (!Array.isArray(grid) || grid.length===0) return '';
      const Z=grid.length, Y=grid[0].length, X=grid[0][0].length;
      const lines=[];
      lines.push('Legend: #=solid  .=empty  v=portal-lower  ^=portal-upper  O=hole');
      for (let y=0;y<Y;y++){
        lines.push(`-- Layer y=${y} --`);
        for (let z=0; z<Z; z++){
          let row='';
          for (let x=0; x<X; x++){
            const v = grid[z][y][x];
            if (v===0) { row += '.'; continue; }
            if (v===2){
              // Distinguish upper vs lower via presence of supporting solid below/above if available
              const below = (y>0) ? grid[z][y-1][x] : 1;
              const above = (y<Y-1) ? grid[z][y+1][x] : 1;
              if (below!==0 && above===0) row += '^';
              else if (below===0 && above!==0) row += 'v';
              else row += '^';
              continue;
            }
            // v==1 solid; detect isolated hole representation occurs when neighbor stair hole not filled
            row += '#';
          }
          lines.push(row);
        }
        lines.push('');
      }
      return lines.join('\n');
    }
  window.generateWFCDungeon = async function({x=3,y=3,z=3}={}) {
      try {
        if (x<1||y<1||z<1) throw new Error('Invalid size');
        // Sizes in tiles -> voxel dims
        const vx = x*3, vy = y*3, vz = z*3;
        const [{ initializeTileset, tilePrototypes }, meshUtil] = await Promise.all([
          import('../dungeon/tileset.js'),
          import('./wfc_tile_mesh.js')
        ]);
        const WFCMod = await import('../dungeon/ndwfc.js');
        if (!window.NDWFC3D) {
          // minimal stub for tileset registration; tileset just calls NDWFC3D(proto)
          window.NDWFC3D = function(){};
        }
        initializeTileset();
        const n = tilePrototypes.length;
        const weights = new Array(n).fill(1);
        // Build metadata for vertical compatibility
        function protoMeta(p){
          const vox = p.voxels;
          const floor=[]; const ceiling=[]; const mid=[];
          let isStair=false;
          for (let z=0;z<3;z++){
            floor.push(vox[z][0].slice());
            mid.push(vox[z][1].slice());
            ceiling.push(vox[z][2].slice());
            if (vox[z][0].some(v=>v===2) || vox[z][1].some(v=>v===2) || vox[z][2].some(v=>v===2)) isStair=true;
          }
          return { floor, mid, ceiling, isStair };
        }
        const metas = tilePrototypes.map(protoMeta);
        function canStack(upper, lower){
          const upperProto = tilePrototypes[upper];
          const lowerProto = tilePrototypes[lower];
          // Lower stair (31) must be directly below upper stair (32) or any non-stair solid ceiling tile can sit over non-stair floor.
          if (lowerProto.tileId===31) {
            return upperProto.tileId===32; // enforce explicit pairing
          }
          if (upperProto.tileId===32) {
            // Only allow upper stair above a lower stair
            return lowerProto.tileId===31;
          }
          // Non-stair tiles: simple (always) vertical compatibility (floor/ceiling now ignored for headroom model)
          return true;
        }
        // Axis token mapping in underlying WFC: dim0->'y', dim1->'x', dim2->'z'
        // We want: horizontal X adjacency -> dim0 token 'y'; vertical Y adjacency -> dim1 token 'x'; horizontal Z adjacency -> dim2 token 'z'.
        const rules = [];
        for (let a=0;a<n;a++) for (let b=0;b<n;b++){
          // Allow all lateral neighbors along model X (dim0) and Z (dim2) for now
          rules.push(['y',a,b]); // dim0 (X) adjacency
          rules.push(['z',a,b]); // dim2 (Z) adjacency
          // Constrain vertical stacking (dim1) via canStack
          if (canStack(b,a)) rules.push(['x',a,b]); // dim1 (Y) adjacency: b above a
        }
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
        // Also render ASCII of layers
        try {
          const ascii = gridToAscii(grid);
          const pre = document.getElementById('ascii-map');
          if (pre) pre.textContent = ascii;
        } catch(_) {}
        // Parse into tile placements
        const tiles = meshUtil.parseVoxelGridToTiles(grid);
        // Build group
  const THREERef = window.THREE || (await import('https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js'));
  const group = new THREERef.Group();
        tiles.forEach(t => {
          const gm = meshUtil.buildTileMesh({THREE: THREERef, prototypeIndex:t.prototypeIndex, rotationY:t.rotationY, unit:3});
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
  const { scene, fpsCamera, THREE: THREERef } = lastInstance;
  for (let i = scene.children.length - 1; i >= 0; i--) {
    const child = scene.children[i];
    if (!(child && child.userData && child.userData.keep)) scene.remove(child);
  }
  if (mesh){
    // Compute bounding box to reposition FPS camera near dungeon
    if (scene && scene.add) scene.add(mesh);
    try {
      if (THREERef && THREERef.Box3 && THREERef.Vector3) {
        const box = new THREERef.Box3().setFromObject(mesh);
        if (box.isEmpty && box.isEmpty()) { /* ignore */ } else {
          const size = new THREERef.Vector3();
            box.getSize(size);
            const center = new THREERef.Vector3(); box.getCenter(center);
            // Place fps camera just above center and offset back on Z
            fpsCamera.position.set(center.x + size.x * 0.1, center.y + Math.max(5, size.y * 0.3), center.z + size.z * 0.8 + 10);
        }
      }
    } catch(e){ /* non-fatal */ }
  }
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