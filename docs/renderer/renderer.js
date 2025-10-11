// Renderer module: provides createRenderer for initializing a Three.js scene.
// Dependency injection friendly for tests (pass in mock THREE with OrbitControls).
// In browser (non-test) it will auto-bootstrap by dynamically importing Three.js and OrbitControls.

let lastInstance = null;

import { makeScene, makePerspective, setVec3, configureFPSCamera, addBasicLights } from './scene_setup.js';
import { makeOrbitControls, initOrbitDefaults, makeKeyState, makeFPSState, updateFPS, toggleMode, applyPointerLook, isTestEnv } from './controls_fps.js';
import { rebuildTileIdOverlays } from './overlays.js';
import { updateDungeonMesh, setInstanceRef } from './update_mesh.js';
import { setupMiniViewer } from './mini_viewer.js';
import { setupStairDemo } from './stair_demo.js';
import { generateWFCDungeon } from './wfc_generate.js';

export function createRenderer({ THREE, containerId='threejs-canvas' }={}){
  console.log('[Render] createRenderer called', { containerId, hasThree: !!THREE, hasOrbitControls: !!THREE?.OrbitControls });
  if(!THREE) throw new Error('THREE dependency missing');
  if(!THREE.OrbitControls) throw new Error('THREE.OrbitControls missing');
  const canvas=document.getElementById(containerId); if(!canvas) throw new Error(`#${containerId} not found`);
  const width=canvas.clientWidth||800, height=canvas.clientHeight||600;
  console.log('[Render] canvas dimensions', { width, height, clientWidth: canvas.clientWidth, clientHeight: canvas.clientHeight });
  const scene=makeScene(THREE);
  const orbitCamera=setVec3(makePerspective(THREE,75,width/height,0.1,2000),0,40,110);
  const fpsCamera=configureFPSCamera(setVec3(makePerspective(THREE,75,width/height,0.1,1500),0,15,30));
  scene.add(fpsCamera);
  const renderer=new THREE.WebGLRenderer({canvas: canvas, antialias:true}); 
  console.log('[Render] WebGL renderer created with existing canvas', { renderer: !!renderer, domElement: !!renderer.domElement, canvasId: canvas.id });
  renderer.setSize(width,height); 
  console.log('[Render] renderer size set', { width, height });
  console.log('[Render] using existing canvas', { 
    canvasId: canvas.id, 
    canvasParent: canvas.parentElement?.id,
    canvasInDom: document.contains(canvas),
    canvasVisible: canvas.offsetParent !== null
  });
  
  // Debug logging for DOM attachment and sizing
  if ((typeof window!=='undefined') && (window.__RENDER_DEBUG__||window.__WFC_DEBUG__)){
    const csz = { w: container.clientWidth, h: container.clientHeight };
    const rsz = renderer.getSize ? renderer.getSize(new THREE.Vector2()) : {x:width,y:height};
    console.debug('[Render] container/canvas size', { container: csz, canvas: { w: rsz.x||width, h: rsz.y||height } });
    console.debug('[Render] canvas attached', { 
      canvasParent: renderer.domElement.parentElement?.id || 'unknown',
      canvasInDom: document.contains(renderer.domElement),
      canvasStyle: renderer.domElement.style.cssText,
      containerExists: !!container,
      containerId: container?.id
    });
  }
  addBasicLights(THREE, scene);
  
  // Add a test cube to ensure something is visible
  const testGeometry = new THREE.BoxGeometry(2, 2, 2);
  const testMaterial = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
  const testCube = new THREE.Mesh(testGeometry, testMaterial);
  testCube.position.set(0, 1, 0);
  scene.add(testCube);
  console.log('[Render] Added test cube to scene for visibility');
  
  // Updated for THREE.js r155+ - use outputColorSpace instead of outputEncoding, useLegacyLights instead of physicallyCorrectLights
  if (renderer.outputColorSpace !== undefined) renderer.outputColorSpace = THREE.SRGBColorSpace || THREE.sRGBEncoding; 
  else if (typeof THREE.sRGBEncoding !== 'undefined') renderer.outputEncoding = THREE.sRGBEncoding;
  if (renderer.useLegacyLights !== undefined) renderer.useLegacyLights = false;
  else if (renderer.physicallyCorrectLights !== undefined) renderer.physicallyCorrectLights = true;
  const controls=initOrbitDefaults(makeOrbitControls(THREE, orbitCamera, renderer.domElement));
  const fps = makeFPSState(THREE, fpsCamera); const keyState=makeKeyState();
  wireInput({controls, fps, renderer, keyState, orbitCamera});
  const instance = makeInstance({scene, orbitCamera, fpsCamera, renderer, controls, THREE, fps});
  attachPublicAPIs(instance); // adds generation & utility hooks
  lastInstance=instance; setInstanceRef(instance); // Set lastInstance BEFORE starting loop
  console.log('[Render] Instance created and set as lastInstance', { 
    instance: !!instance,
    sceneChildren: scene.children.length,
    sceneChildTypes: scene.children.map(child => child.type || child.constructor.name),
    cameraPosition: [orbitCamera.position.x, orbitCamera.position.y, orbitCamera.position.z],
    rendererDomElement: !!renderer.domElement,
    rendererVisible: renderer.domElement.offsetParent !== null
  });
  
  // Log the initial scene state to verify it has basic content (lights, etc.)
  console.log('[Render] Three.js scene initialized successfully', {
    sceneObjects: scene.children.map(child => ({
      type: child.type || child.constructor.name,
      visible: child.visible,
      position: child.position ? [child.position.x.toFixed(1), child.position.y.toFixed(1), child.position.z.toFixed(1)] : 'no position'
    })),
    cameraPosition: [orbitCamera.position.x.toFixed(1), orbitCamera.position.y.toFixed(1), orbitCamera.position.z.toFixed(1)],
    cameraLookingAt: controls.target ? [controls.target.x.toFixed(1), controls.target.y.toFixed(1), controls.target.z.toFixed(1)] : 'no target',
    rendererSize: renderer.getSize(new THREE.Vector2()),
    canvasInDOM: document.contains(renderer.domElement),
    canvasSize: [renderer.domElement.width, renderer.domElement.height],
    canvasStyle: `${renderer.domElement.style.width} x ${renderer.domElement.style.height}`
  });
  
  startLoop({renderer, controls, fps, orbitCamera, instance, keyState});
  return instance;
}

function startLoop({renderer, controls, fps, orbitCamera, instance, keyState}){
  let last = performance && performance.now ? performance.now(): Date.now();
  let frameCount = 0;
  console.log('[Render] Starting render loop', { instance: !!instance, lastInstance: !!lastInstance });
  function frame(){ 
    frameCount++;
    if(lastInstance!==instance) {
      console.log('[Render] Render loop exiting - instance mismatch', { frameCount, currentInstance: !!instance, lastInstance: !!lastInstance });
      return;
    }
    requestAnimationFrame(frame); 
    const now=performance&&performance.now?performance.now():Date.now(); 
    const dt=Math.min(0.1,(now-last)/1000); 
    last=now; 
    updateFPS(dt, fps, keyState); 
    controls.update(); 
    renderer.render(instance.scene, fps.mode==='fps'?fps.cam:orbitCamera);
    
    // Log the first few frames to confirm rendering is working
    if (frameCount <= 3) {
      console.log(`[Render] Frame ${frameCount} rendered successfully`, {
        sceneChildren: instance.scene.children.length,
        rendererCalls: renderer.info.render.calls,
        canvasVisible: renderer.domElement.offsetParent !== null,
        cameraMode: fps.mode
      });
    }
  }
  frame();
}

function wireInput({controls, fps, renderer, keyState, orbitCamera}){
  const isTest=isTestEnv();
  function resize(){ const c=renderer.domElement.parentElement; const w=c.clientWidth||window.innerWidth; const h=c.clientHeight||window.innerHeight; orbitCamera.aspect=w/h; orbitCamera.updateProjectionMatrix(); fps.cam.aspect=w/h; fps.cam.updateProjectionMatrix(); renderer.setSize(w,h); }
  window.addEventListener('resize', resize);

  // Ensure camera aspect ratio matches renderer viewport
  const rect = renderer.domElement.getBoundingClientRect();
  const aspect = rect.width / rect.height;
  if (Math.abs(orbitCamera.aspect - aspect) > 0.01) {
    console.warn('[Renderer] Camera aspect mismatch detected, correcting...', {
      currentAspect: orbitCamera.aspect,
      expectedAspect: aspect,
      rect
    });
    orbitCamera.aspect = aspect;
    orbitCamera.updateProjectionMatrix();
    renderer.setSize(rect.width, rect.height, false);
  }

  console.log('[Renderer] Camera aspect check:', {
    aspect: orbitCamera.aspect,
    expected: aspect,
    fov: orbitCamera.fov,
    near: orbitCamera.near,
    far: orbitCamera.far
  });
  if (isTest) return;
  window.addEventListener('keydown', e=>{ 
    keyState[e.code]=true; 
    // Debug log for movement keys
    if(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','Space','ShiftLeft','ShiftRight'].includes(e.code) && fps.mode === 'fps') {
      console.log(`[Controls] Key pressed: ${e.code} (FPS mode)`);
    }
    if(e.code==='KeyF'){ 
      toggleMode(fps, orbitCamera, controls); 
      if(fps.mode==='fps') lockPointer(renderer); 
      else unlockPointer(); 
    } 
  });
  window.addEventListener('keyup', e=>{ keyState[e.code]=false; });
  window.addEventListener('mousemove', e=> applyPointerLook(fps,e));
  renderer.domElement.addEventListener('click', ()=>{ if(fps.mode==='fps') lockPointer(renderer); });
}

const lockPointer = (renderer)=>{ const el=renderer.domElement; if (el.requestPointerLock) el.requestPointerLock(); };
const unlockPointer = ()=>{ if (document.exitPointerLock) document.exitPointerLock(); };
function makeInstance({scene, orbitCamera, fpsCamera, renderer, controls, THREE, fps}){ 
  // Add editor-specific groups to scene
  const editorTiles = new THREE.Group();
  editorTiles.name = 'EditorTiles';
  editorTiles.visible = false;
  scene.add(editorTiles);
  
  return { 
    scene, 
    camera:orbitCamera, 
    orbitCamera, 
    fpsCamera, 
    renderer, 
    canvas: renderer.domElement, // Expose canvas for map editor
    controls, 
    get mode(){return fps.mode;}, 
    THREE, 
    _keyState:{}, 
    fps,
    editorTiles,
    editorMode: false,
    gridHelper: null,
    tileGroup: null
  }; 
}

function attachPublicAPIs(instance){
  const { orbitCamera, controls } = instance;
  instance.resetView = ()=>{ orbitCamera.position.set(0,40,110); controls.target.set(0,0,0); controls.update(); };
  instance.setZoomDistance = (dist)=>{ const tgt=controls.target.clone(); const dir=orbitCamera.position.clone().sub(tgt).normalize(); const clamp=Math.min(Math.max(dist, controls.minDistance||5), controls.maxDistance||300); orbitCamera.position.copy(dir.multiplyScalar(clamp).add(tgt)); controls.update(); };
  instance.pan = (dx,dy)=>{ const dist=orbitCamera.position.distanceTo(controls.target); const s=dist*0.0015; const x=-dx*s, y=dy*s; const te=orbitCamera.matrix.elements; const right=new instance.THREE.Vector3(te[0],te[1],te[2]).multiplyScalar(x); const up=new instance.THREE.Vector3(te[4],te[5],te[6]).multiplyScalar(y); controls.target.add(right).add(up); orbitCamera.position.add(right).add(up); controls.update(); };
  instance.rebuildTileIdOverlays = ()=> rebuildTileIdOverlays(instance);
  
  // Editor mode APIs
  instance.setEditorMode = (enabled) => {
    instance.editorMode = enabled;
    
    if (enabled) {
      // Hide WFC-generated dungeon
      if (instance.tileGroup) instance.tileGroup.visible = false;
      
      // Show editor tiles
      instance.editorTiles.visible = true;
      
      // Add grid helper if not exists
      if (!instance.gridHelper) {
        instance.gridHelper = new instance.THREE.GridHelper(90, 30, 0x444444, 0x222222);
        instance.gridHelper.position.y = 0;
        instance.scene.add(instance.gridHelper);
      }
      instance.gridHelper.visible = true;

      // Restore original angled camera placement for side perspective editing
      instance.orbitCamera.position.set(0, 40, 110);
      instance.orbitCamera.lookAt(0, 0, 0);
      instance.controls.target.set(0, 0, 0);
      instance.controls.update();
      console.log('[Renderer] Editor mode camera restored to angled view:', {
        position: instance.orbitCamera.position,
        target: instance.controls.target
      });
      
    } else {
      // Restore normal mode
      if (instance.tileGroup) instance.tileGroup.visible = true;
      instance.editorTiles.visible = false;
      if (instance.gridHelper) instance.gridHelper.visible = false;
    }
  };
  
  instance.renderEditorTile = async (tile) => {
    const { StructureMeshPipeline } = await import('../ui/utils/structure-mesh-pipeline.js');
    const { DEFAULT_TILE_STRUCTURES } = await import('../dungeon/defaults/default_tile_structures.js');
    
    const mesh = await StructureMeshPipeline.createMeshFromStructureId(
      instance.THREE,
      tile.structureId,
      DEFAULT_TILE_STRUCTURES
    );
    
    // Apply rotation (Y-axis)
    mesh.rotation.y = instance.THREE.MathUtils.degToRad(tile.rotation);
    
    // Place using grid indices; bypass clamp in editor mode
    if (instance.editorMode) {
      mesh.position.set(tile.position.x * 3, tile.position.y * 3, tile.position.z * 3);
    } else {
      // Keep clamp in non-editor contexts
      const clampedX = Math.max(-10, Math.min(10, tile.position.x));
      const clampedY = Math.max(0, Math.min(5, tile.position.y));
      const clampedZ = Math.max(-10, Math.min(10, tile.position.z));
      mesh.position.set(clampedX * 3, clampedY * 3, clampedZ * 3);
    }

    // Diagnostic logging for position and camera distance
    const camPos = instance.camera.position;
    const distance = mesh.position.distanceTo(camPos);
    console.log('[Renderer] Tile mesh positioned:', {
      structureId: tile.structureId,
      position: mesh.position,
      cameraPosition: camPos,
      distanceFromCamera: distance.toFixed(2)
    });
    
    mesh.userData.tileId = tile.id;

    // Propagate tileId to all child meshes for selection/highlight
    mesh.traverse((child) => {
      if (child.isMesh) {
        child.userData.tileId = tile.id;
        // Clone material to ensure unique emissive state per tile
        if (child.material) {
          const oldUUID = child.material.uuid;
          child.material = child.material.clone();
          console.log('[Renderer] Cloned material for mesh:', child.name || '(unnamed)', {
            tileId: tile.id,
            oldUUID,
            newUUID: child.material.uuid
          });
        }
      }
    });

    instance.editorTiles.add(mesh);

    // Ensure editorTiles group is visible and part of the scene
    if (!instance.scene.children.includes(instance.editorTiles)) {
      instance.scene.add(instance.editorTiles);
      console.warn('[Renderer] editorTiles group was missing from scene — re-added.');
    }
    instance.editorTiles.visible = true;

    // Force a render update to ensure visibility
    if (instance.renderer && instance.camera) {
      instance.renderer.render(instance.scene, instance.camera);
      console.log('[Renderer] Editor tile rendered and scene updated:', {
        editorTilesVisible: instance.editorTiles.visible,
        totalEditorTiles: instance.editorTiles.children.length
      });
    }

    return mesh;
  };
  
  instance.clearEditorTiles = () => {
    while (instance.editorTiles.children.length > 0) {
      instance.editorTiles.remove(instance.editorTiles.children[0]);
    }
  };
  
    instance.removeEditorTile = (tileId) => {
      const mesh = instance.editorTiles.children.find(
        child => child.userData.tileId === tileId
      );
      if (mesh) instance.editorTiles.remove(mesh);
    };

    // Helper: get all meshes belonging to a specific tileId (tighter filtering)
    instance.getMeshesByTileId = (tileId) => {
      const matches = [];
      instance.editorTiles.children.forEach(child => {
        if (child.userData.tileId === tileId) {
          // Include the root mesh and its submeshes
          child.traverse(sub => {
            if (sub.isMesh && sub.userData.tileId === tileId) {
              matches.push(sub);
            }
          });
        }
      });
      return matches;
    };
  
  if (typeof window!=='undefined'){ window.dungeonRenderer=instance; exposeGeneration(instance); }
}

function exposeGeneration(instance){
  let currentAbort = null;
  window.cancelWFCDungeon = ()=>{ if (currentAbort) { try{ currentAbort.abort(); }catch(_){} } };
  window.generateWFCDungeon = async ({x=3,y=3,z=3, tileset='basic_dungeon', yieldEvery=500, maxSteps=30000, stallTimeoutMs=10000, maxYields=50, centerSeed=true}={})=>{
    try {
      const [tilesetMod, simplifiedTilesetMod, meshUtil] = await Promise.all([
        import('../dungeon/tileset.js'), 
        import('../dungeon/simplified_tilesets.js'),
        import('./wfc_tile_mesh.js')
      ]);
      
      let protos;
      
      // Try to use simplified tileset first
      try {
        const selectedTileset = simplifiedTilesetMod.getTilesetById(tileset);
        if (selectedTileset) {
          const wfcTileset = simplifiedTilesetMod.convertTilesetForWFC(selectedTileset);
          protos = wfcTileset.prototypes;
          console.log(`[WFC] Using simplified tileset: ${selectedTileset.name} (${protos.length} prototypes)`);
          console.log(`[WFC] Prototypes:`, protos.map((p, i) => `${i}:${p.tileId}`));
        } else {
          throw new Error(`Simplified tileset '${tileset}' not found`);
        }
      } catch (simplifiedError) {
  console.warn(`[WFC] Failed to load simplified tileset '${tileset}':`, simplifiedError.message);
  // Single path: ensure tileset initialized and retry simplified conversion
  tilesetMod.initializeTileset();
  protos = tilesetMod.tilePrototypes; // Single unified prototype set
      }
      const rng=(()=>{ let s=Date.now()%1e9; return ()=> (s=(s*1664525+1013904223)%4294967296)/4294967296; })();
  // Important: dims are in tile units, not voxel units. Avoid multiplying by 3 here.
  // Add browser-friendly safeguards to prevent endless runs.
  if (currentAbort) { try{ currentAbort.abort(); }catch(_){} }
  currentAbort = new AbortController();
  const { grid, grid3D, tiles } = await generateWFCDungeon({
    ...(window.NDWFC3D ? { NDWFC3D: window.NDWFC3D } : {}),
    tileset:{ prototypes:protos },
    dims:{ x, y, z },
    rng,
    yieldEvery,
    maxSteps,
    stallTimeoutMs,
    maxYields,
    signal: currentAbort.signal,
    debug: (typeof window.__WFC_DEBUG__==='boolean') ? window.__WFC_DEBUG__ : undefined,
    centerSeed
  });
  console.log(`[WFC] Generation complete, tiles:`, tiles.length, 'tiles with prototypeIndex:', tiles.map(t => t.prototypeIndex));
  buildAscii(grid3D); buildBrowser(tiles, protos, meshUtil); instance.lastTiles = tiles.map(t=>({...t,tileId:protos[t.prototypeIndex].tileId}));
      const THREERef = instance.THREE || window.THREE; setupMiniViewer(tiles, meshUtil, THREERef); const group = buildMeshGroup(tiles, protos, meshUtil, THREERef);
      if (window.__RENDER_DEBUG__||window.__WFC_DEBUG__) console.debug('[Render] tiles->group', { tiles: tiles.length, groupChildren: group.children? group.children.length: 'n/a' });
      updateDungeonMesh(group);
      if(window.__SHOW_TILE_IDS) instance.rebuildTileIdOverlays();
    } catch(e){ console.error('WFC generation failed', e); }
  };
  window.generateStairDemo = ()=> setupStairDemo(document);
}

function buildAscii(grid){ import('./ascii.js').then(m=>{ const pre=document.getElementById('ascii-map'); if(pre) pre.textContent=m.gridToAscii(grid); }).catch(()=>{}); }
function buildBrowser(tiles, protos, meshUtil){ import('./ascii.js').then(m=>{ const el=document.getElementById('tile-block-browser'); if(!el){ if(window.__RENDER_DEBUG__||window.__WFC_DEBUG__) console.debug('[Render] tile-block-browser element missing'); return; } el.innerHTML=''; tiles.forEach(t=>{ const vox=meshUtil.rotateY(protos[t.prototypeIndex].voxels, t.rotationY); const div=document.createElement('div'); div.className='tile-block'; div.dataset.selected='false'; div.dataset.prototype=t.prototypeIndex; div.dataset.rotation=t.rotationY; div.dataset.tx=t.position[2]; div.dataset.ty=t.position[1]; div.dataset.tz=t.position[0]; const pre=document.createElement('pre'); pre.textContent=m.voxBlockToAscii(vox).trim(); const coord=document.createElement('div'); coord.className='coord'; coord.textContent=`${t.position[2]},${t.position[1]},${t.position[0]}`; div.appendChild(coord); div.appendChild(pre); el.appendChild(div); }); if(window.__RENDER_DEBUG__||window.__WFC_DEBUG__) console.debug('[Render] browser tiles drawn', { tiles: tiles.length, elChildren: el.children.length }); }).catch(()=>{}); }
function buildMeshGroup(tiles, protos, meshUtil, THREE){ const g=new THREE.Group(); const map=new Map(); tiles.forEach(t=> map.set(`${t.position[0]},${t.position[1]},${t.position[2]}`, t)); const isStair=t=>{ const p=protos[t.prototypeIndex]; return p.meta&&p.meta.role==='stair'; }; const getN=(t,dz,dy,dx)=> map.get(`${t.position[0]+dz},${t.position[1]+dy},${t.position[2]+dx}`); tiles.forEach(t=>{ const below=getN(t,0,-1,0), above=getN(t,0,1,0); const gm=meshUtil.buildTileMesh({THREE, prototypeIndex:t.prototypeIndex, rotationY:t.rotationY, unit:3, hasStairBelow:!!(below&&isStair(below)), hasStairAbove:!!(above&&isStair(above)), prototypes:protos}); gm.position.set(t.position[2]*3, t.position[1]*3, t.position[0]*3); g.add(gm); }); return g; }

// Browser auto-bootstrap (skip during Jest tests)
if (typeof window !== 'undefined' && !(typeof process !== 'undefined' && process.env && process.env.JEST_WORKER_ID)) {
  console.log('[Render] Bootstrap check - window exists, not in Jest');
  if (!window.__DUNGEON_RENDERER_BOOTSTRAPPED) {
    console.log('[Render] Starting bootstrap - loading Three.js modules');
    window.__DUNGEON_RENDERER_BOOTSTRAPPED = true;
    Promise.all([
      import('https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js'),
      import('https://cdn.jsdelivr.net/npm/three@0.155.0/examples/jsm/controls/OrbitControls.js')
    ]).then(([threeModule, controlsModule]) => {
      if (!controlsModule.OrbitControls) throw new Error('Failed to load OrbitControls');
      // Create an extensible copy of the module namespace so we can attach OrbitControls
      const THREE = { ...threeModule, OrbitControls: controlsModule.OrbitControls };
      console.log('[Render] Three.js loaded successfully, creating main renderer');
      const rendererInstance = createRenderer({ THREE });
      console.log('[Render] Main renderer instance created and returned', { instance: !!rendererInstance });
    }).catch(err => {
      console.error('Three.js load failed', err);
      // Show visible error in the canvas area
      const container = document.getElementById('threejs-canvas');
      if (container) {
        container.innerHTML = `<div style="background:#ff3333;color:white;padding:20px;text-align:center;border-radius:8px;">
          <h3>3D Viewer Failed to Load</h3>
          <p>Error: ${err.message}</p>
          <p>Check browser console for details.</p>
        </div>`;
      }
    });
  }
}
