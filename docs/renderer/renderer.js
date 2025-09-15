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
  // Debug overlay rebuild (defined after generateWFCDungeon assigns lastTiles)
  instance.rebuildTileIdOverlays = function rebuildTileIdOverlays(){
    if (!window.__SHOW_TILE_IDS){
      // remove existing overlay group if present
      if (instance._tileIdOverlayGroup){
        try { scene.remove(instance._tileIdOverlayGroup); } catch(_){}
        instance._tileIdOverlayGroup = null;
      }
      return;
    }
    const THREERef = instance.THREE;
    if (!(THREERef && THREERef.Sprite && THREERef.SpriteMaterial && THREERef.CanvasTexture)) return;
    // remove previous
    if (instance._tileIdOverlayGroup) { try { scene.remove(instance._tileIdOverlayGroup); } catch(_){} }
    const g = new THREERef.Group(); g.userData.keep = true; g.name='TileIdOverlayGroup';
    const tiles = instance.lastTiles || [];
    const cache = new Map();
    function makeTexture(id){
      if (cache.has(id)) return cache.get(id);
      const size=64; const c=document.createElement('canvas'); c.width=c.height=size; const ctx=c.getContext('2d');
      ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.fillRect(0,0,size,size);
      ctx.strokeStyle='rgba(255,255,255,0.4)'; ctx.strokeRect(1,1,size-2,size-2);
      ctx.fillStyle='#ffe27a'; ctx.font='28px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(String(id), size/2, size/2);
      const tex = new THREERef.CanvasTexture(c); tex.needsUpdate=true; cache.set(id, tex); return tex;
    }
    for (const t of tiles){
      const tex = makeTexture(t.tileId);
      const mat = new THREERef.SpriteMaterial({ map: tex, transparent:true, depthTest:false, depthWrite:false });
      const sprite = new THREERef.Sprite(mat);
      // World position (x,z,y mapping) -> x: tileX*3 + 1.5
      const wx = t.position[2]*3 + 1.5;
      const wy = t.position[1]*3 + 3.2; // float slightly above tile top
      const wz = t.position[0]*3 + 1.5;
      sprite.position.set(wx, wy, wz);
      const scale = 2.2; sprite.scale.set(scale, scale, 1);
      g.add(sprite);
    }
    scene.add(g); instance._tileIdOverlayGroup = g;
  };
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
          const up = tilePrototypes[upper];
          const low = tilePrototypes[lower];
          const lowerRole = low.meta && low.meta.stairRole;
          const upperRole = up.meta && up.meta.stairRole;
          const isLower = lowerRole === 'lower';
          const isUpper = upperRole === 'upper';
          if (isLower) return isUpper;       // lower stair must have upper stair directly above
          if (isUpper) return (lowerRole === 'lower'); // upper stair must sit on a lower stair
          return true; // non-stair combinations unrestricted for now
        }
        // Axis token mapping in underlying WFC: dim0->'y', dim1->'x', dim2->'z'
        // We want: horizontal X adjacency -> dim0 token 'y'; vertical Y adjacency -> dim1 token 'x'; horizontal Z adjacency -> dim2 token 'z'.
        const rules = [];
        for (let a=0;a<n;a++){
          for (let b=0;b<n;b++){
            // Lateral adjacency always allowed regardless of stair status (Strategy A focuses only vertical lock)
            rules.push(['y',a,b]);
            rules.push(['z',a,b]);
            if (canStack(b,a)) rules.push(['x',a,b]);
          }
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
  // Store tiles with tileId for debug overlay
  instance.lastTiles = tiles.map(t => ({ ...t, tileId: tilePrototypes[t.prototypeIndex].tileId }));

        // Build per-tile ascii mini blocks (3x3x3) for selection browsing
        try {
          const browser = document.getElementById('tile-block-browser');
          if (browser){
            browser.innerHTML='';
            // Each tile placement has position (z,y,x) in tiles
            for (const t of tiles){
              const pIndex = t.prototypeIndex;
              const proto = tilePrototypes[pIndex];
              const vox = meshUtil.rotateY(proto.voxels, t.rotationY);
              let block = '';
              for (let yy=0; yy<3; yy++){
                block += `y=${yy}\n`;
                for (let zz=0; zz<3; zz++){
                  let row='';
                  for (let xx=0; xx<3; xx++){
                    const v = vox[zz][yy][xx];
                    row += (v===0?'.':(v===2?'^':'#'));
                  }
                  block += row + '\n';
                }
                block += '\n';
              }
              const div = document.createElement('div');
              div.className='tile-block';
              div.dataset.selected='false';
              div.dataset.prototype = pIndex;
              div.dataset.rotation = t.rotationY;
              div.dataset.tx = t.position[2]; // original mapping x<-tileX,z<-tileZ,y<-tileY
              div.dataset.ty = t.position[1];
              div.dataset.tz = t.position[0];
              const pre = document.createElement('pre'); pre.textContent = block.trim();
              const coord = document.createElement('div'); coord.className='coord'; coord.textContent=`${t.position[2]},${t.position[1]},${t.position[0]}`;
              div.appendChild(coord); div.appendChild(pre);
              browser.appendChild(div);
            }
          }
        } catch(e){ console.warn('tile block browser build failed', e); }

    // Acquire THREE reference (prefer already-loaded global to avoid duplicate network fetch)
    const THREERef = window.THREE || (await import('https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js'));
    // Mini viewer selection handling (needs THREERef defined first)
    setupMiniViewer(tiles, meshUtil, THREERef);
    // Build group
  const group = new THREERef.Group();
        tiles.forEach(t => {
          const gm = meshUtil.buildTileMesh({THREE: THREERef, prototypeIndex:t.prototypeIndex, rotationY:t.rotationY, unit:3});
          gm.position.set(t.position[2]*3, t.position[1]*3, t.position[0]*3); // x<-tileX,z<-tileZ,y<-tileY mapping
          group.add(gm);
        });
  updateDungeonMesh(group);
  // Build overlays if requested
  if (window.__SHOW_TILE_IDS && instance.rebuildTileIdOverlays){ instance.rebuildTileIdOverlays(); }
      } catch(e){ console.error('WFC generation failed', e); }
    };
  // Minimal stair demo: constructs a 1x2x1 tile column with lower+upper stair only (no WFC randomness)
  window.generateStairDemo = async function(){
    try {
      const [{ initializeTileset, tilePrototypes }, meshUtil] = await Promise.all([
        import('../dungeon/tileset.js'),
        import('./wfc_tile_mesh.js')
      ]);
      if (!window.NDWFC3D) window.NDWFC3D = function(){};
      initializeTileset();
      // Identify lower & upper stair prototypes via meta.stairRole
      let lowerIdx = tilePrototypes.findIndex(p=> p.meta && p.meta.stairRole==='lower');
      let upperIdx = tilePrototypes.findIndex(p=> p.meta && p.meta.stairRole==='upper');
      if (lowerIdx<0 || upperIdx<0){
        // Fallback heuristic: detect by tileId patterns of '2' or by legacy IDs 31/32 ordering
        // Legacy case: tileIds 31 (lower) and 32 (upper)
        const legacyLower = tilePrototypes.findIndex(p=> p.tileId===31);
        const legacyUpper = tilePrototypes.findIndex(p=> p.tileId===32);
        if (legacyLower>=0 && legacyUpper>=0){ lowerIdx=legacyLower; upperIdx=legacyUpper; }
      }
      if (lowerIdx<0 || upperIdx<0) throw new Error('Stair prototypes not found');
      const tiles = [
        { prototypeIndex: lowerIdx, rotationY:0, position:[0,0,0] }, // (z,y,x) order in existing pipeline
        { prototypeIndex: upperIdx, rotationY:0, position:[0,1,0] }
      ];
      instance.lastTiles = tiles.map(t=> ({ ...t, tileId: tilePrototypes[t.prototypeIndex].tileId }));
      // Build ASCII view (compose manual voxel grid 3x6x3)
      const gridZ=3, gridY=6, gridX=3; const grid = Array.from({length:gridZ},()=>Array.from({length:gridY},()=>Array(gridX).fill(0)));
      function paint(protoIndex, ty){
        const vox = tilePrototypes[protoIndex].voxels;
        for (let zz=0; zz<3; zz++) for (let yy=0; yy<3; yy++) for (let xx=0; xx<3; xx++){
          grid[zz][ty*3+yy][xx] = vox[zz][yy][xx];
        }
      }
      paint(lowerIdx,0); paint(upperIdx,1);
      try {
        const ascii = (function(grid){
          const Z=grid.length, Y=grid[0].length, X=grid[0][0].length; const lines=['Legend: #=solid .=empty v=portal-lower ^=portal-upper'];
          for (let y=0;y<Y;y++){
            lines.push(`-- Layer y=${y} --`);
            for (let z=0; z<Z; z++){
              let row='';
              for (let x=0;x<X;x++){
                const v = grid[z][y][x];
                if (v===0){ row+='.'; continue; }
                if (v===2){
                  const below = (y>0)? grid[z][y-1][x]:1; const above=(y<Y-1)?grid[z][y+1][x]:1;
                  if (below===0 && above!==0) row+='v'; else if (below!==0 && above===0) row+='^'; else row+='^';
                  continue;
                }
                row+='#';
              }
              lines.push(row);
            }
            lines.push('');
          }
          return lines.join('\n');
        })(grid);
        const pre = document.getElementById('ascii-map'); if (pre) pre.textContent = ascii;
      } catch(_){ }
      const THREERef = window.THREE || (await import('https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js'));
      const group = new THREERef.Group();
      tiles.forEach(t=>{
        const gm = meshUtil.buildTileMesh({THREE:THREERef, prototypeIndex:t.prototypeIndex, rotationY:t.rotationY, unit:3});
        gm.position.set(t.position[2]*3, t.position[1]*3, t.position[0]*3);
        group.add(gm);
      });
      updateDungeonMesh(group);
      if (window.__SHOW_TILE_IDS && instance.rebuildTileIdOverlays){ instance.rebuildTileIdOverlays(); }
    } catch(e){ console.error('Stair demo generation failed', e); }
  };
  }
  function setupMiniViewer(tiles, meshUtil, THREERef){
    const miniContainer = document.getElementById('mini-viewer');
    const browser = document.getElementById('tile-block-browser');
    if (!miniContainer || !browser) return;
    // Initialize mini renderer lazily
    if (!miniContainer._mini){
      const renderer = new THREERef.WebGLRenderer({antialias:true});
      renderer.setSize(miniContainer.clientWidth, miniContainer.clientHeight);
      miniContainer.appendChild(renderer.domElement);
      const scene = new THREERef.Scene();
      const camera = new THREERef.PerspectiveCamera(60, miniContainer.clientWidth/miniContainer.clientHeight, 0.1, 500);
      // Initial camera spherical parameters
      const spherical = { radius:40, theta:Math.PI*0.25, phi:Math.PI*0.35 }; // phi from +Y downwards
      function syncCamera(){
        const r = spherical.radius;
        const sinPhi = Math.sin(spherical.phi);
        const x = r * sinPhi * Math.cos(spherical.theta);
        const z = r * sinPhi * Math.sin(spherical.theta);
        const y = r * Math.cos(spherical.phi);
        camera.position.set(x,y,z); camera.lookAt(0,0,0);
      }
      syncCamera();
      const amb = new THREERef.AmbientLight(0xffffff,0.6); scene.add(amb);
      const dir = new THREERef.DirectionalLight(0xffffff,0.8); dir.position.set(30,50,20); scene.add(dir);
      const grid = new THREERef.GridHelper(120, 24, 0x335577, 0x223344); scene.add(grid);
      miniContainer._mini = { renderer, scene, camera, selection:[], spherical, active:false };
      function animateMini(){ requestAnimationFrame(animateMini); renderer.render(scene,camera); }
      animateMini();
      window.addEventListener('resize', ()=>{
        const w = miniContainer.clientWidth, h = miniContainer.clientHeight;
        renderer.setSize(w,h); camera.aspect=w/h; camera.updateProjectionMatrix();
      });
      const clearBtn = document.getElementById('clear-selected-tiles');
      if (clearBtn){ clearBtn.onclick = ()=>{ miniContainer._mini.selection=[]; rebuildMiniScene(); [...browser.querySelectorAll('.tile-block')].forEach(b=>b.dataset.selected='false'); }; }
      // Interaction handlers (activate on click)
      let dragging=false; let lastX=0, lastY=0;
      function setActive(a){
        miniContainer._mini.active = a; if (a){ miniContainer.classList.add('active'); miniContainer.focus(); } else { miniContainer.classList.remove('active'); }
      }
      miniContainer.addEventListener('click', (e)=>{ setActive(true); });
      miniContainer.addEventListener('mousedown', (e)=>{ if (!miniContainer._mini.active) return; dragging=true; lastX=e.clientX; lastY=e.clientY; });
      window.addEventListener('mouseup', ()=> dragging=false);
      window.addEventListener('mousemove', (e)=>{
        if (!dragging || !miniContainer._mini.active) return;
        const dx = e.clientX-lastX; const dy=e.clientY-lastY; lastX=e.clientX; lastY=e.clientY;
        const sp = miniContainer._mini.spherical;
        sp.theta -= dx * 0.005;
        sp.phi -= dy * 0.005; sp.phi = Math.max(0.15, Math.min(Math.PI-0.15, sp.phi));
        syncCamera();
      });
      miniContainer.addEventListener('wheel', (e)=>{ if (!miniContainer._mini.active) return; const sp=miniContainer._mini.spherical; sp.radius *= (1 + Math.sign(e.deltaY)*0.08); sp.radius = Math.max(5, Math.min(400, sp.radius)); syncCamera(); });
      window.addEventListener('keydown', (e)=>{ if (e.key==='Escape' && miniContainer._mini.active){ setActive(false); } });
    }
    function rebuildMiniScene(){
      const { scene } = miniContainer._mini; // remove previous non-lights/grid
      for (let i=scene.children.length-1;i>=0;i--){ const c=scene.children[i]; if (!c.isLight && !(c.geometry&&c.geometry.type==='GridHelper')) scene.remove(c); }
      // Build grouped mesh for each selected tile relative to first selection as origin
      const sel = miniContainer._mini.selection;
      if (!sel.length) return;
      const origin = sel[0];
      sel.forEach(s => {
        const gm = meshUtil.buildTileMesh({THREE:THREERef, prototypeIndex:s.prototypeIndex, rotationY:s.rotationY, unit:3});
        const ox = (s.tx - origin.tx) * 3;
        const oy = (s.ty - origin.ty) * 3;
        const oz = (s.tz - origin.tz) * 3;
        gm.position.set(ox, oy, oz);
        scene.add(gm);
      });
      // Zoom-to-fit: compute bounding box of selection and adjust spherical radius
      try {
        if (THREERef.Box3 && THREERef.Vector3){
          const box = new THREERef.Box3(); box.setFromObject(scene);
          const size = new THREERef.Vector3(); box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z) || 1;
          const sp = miniContainer._mini.spherical; // aim so object roughly fills height
          sp.radius = maxDim * 1.6; // cushion factor
          // Recenter camera lookAt already at origin; no need to shift unless future offset
          // Slightly elevate phi if object tall
          if (size.y > size.x*0.8) sp.phi = Math.PI*0.35;
        }
      } catch(_){ /* non-fatal */ }
    }
    browser.onclick = function(e){
      const block = e.target.closest('.tile-block');
      if (!block) return;
      const selected = block.dataset.selected==='true';
      block.dataset.selected = selected? 'false':'true';
      const { selection } = miniContainer._mini;
      if (!selected){
        selection.push({
          prototypeIndex: Number(block.dataset.prototype), rotationY:Number(block.dataset.rotation), tx:Number(block.dataset.tx), ty:Number(block.dataset.ty), tz:Number(block.dataset.tz)
        });
      } else {
        const idx = selection.findIndex(s=> s.tx==block.dataset.tx && s.ty==block.dataset.ty && s.tz==block.dataset.tz);
        if (idx>-1) selection.splice(idx,1);
      }
      rebuildMiniScene();
    };
    rebuildMiniScene();
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