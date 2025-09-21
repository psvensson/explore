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
  const container=document.getElementById(containerId); if(!container) throw new Error(`#${containerId} not found`);
  const width=container.clientWidth||800, height=container.clientHeight||600;
  console.log('[Render] container dimensions', { width, height, clientWidth: container.clientWidth, clientHeight: container.clientHeight });
  const scene=makeScene(THREE);
  const orbitCamera=setVec3(makePerspective(THREE,75,width/height,0.1,2000),0,40,110);
  const fpsCamera=configureFPSCamera(setVec3(makePerspective(THREE,75,width/height,0.1,1500),0,15,30));
  scene.add(fpsCamera);
  const renderer=new THREE.WebGLRenderer({antialias:true}); 
  console.log('[Render] WebGL renderer created', { renderer: !!renderer, domElement: !!renderer.domElement });
  renderer.setSize(width,height); 
  console.log('[Render] renderer size set', { width, height });
  container.appendChild(renderer.domElement);
  console.log('[Render] canvas appended to container', { 
    containerId: container.id, 
    canvasParent: renderer.domElement.parentElement?.id,
    canvasInDom: document.contains(renderer.domElement)
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
  if (typeof THREE.sRGBEncoding!=='undefined') renderer.outputEncoding=THREE.sRGBEncoding; if(renderer.physicallyCorrectLights!==undefined) renderer.physicallyCorrectLights=true;
  const controls=initOrbitDefaults(makeOrbitControls(THREE, orbitCamera, renderer.domElement));
  const fps = makeFPSState(THREE, fpsCamera); const keyState=makeKeyState();
  wireInput({controls, fps, renderer, keyState, orbitCamera});
  const instance = makeInstance({scene, orbitCamera, fpsCamera, renderer, controls, THREE, fps});
  attachPublicAPIs(instance); // adds generation & utility hooks
  lastInstance=instance; setInstanceRef(instance); // Set lastInstance BEFORE starting loop
  console.log('[Render] Instance created and set as lastInstance', { instance: !!instance });
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
    // Log occasionally to show render loop is working
    if (frameCount % 120 === 0) {
      console.log('[Render] Render loop active', { frameCount, sceneChildren: instance.scene.children.length });
    }
  }
  frame();
}

function wireInput({controls, fps, renderer, keyState, orbitCamera}){
  const isTest=isTestEnv();
  function resize(){ const c=renderer.domElement.parentElement; const w=c.clientWidth||window.innerWidth; const h=c.clientHeight||window.innerHeight; orbitCamera.aspect=w/h; orbitCamera.updateProjectionMatrix(); fps.cam.aspect=w/h; fps.cam.updateProjectionMatrix(); renderer.setSize(w,h); }
  window.addEventListener('resize', resize);
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
function makeInstance({scene, orbitCamera, fpsCamera, renderer, controls, THREE, fps}){ return { scene, camera:orbitCamera, orbitCamera, fpsCamera, renderer, controls, get mode(){return fps.mode;}, THREE, _keyState:{}, fps }; }

function attachPublicAPIs(instance){
  const { orbitCamera, controls } = instance;
  instance.resetView = ()=>{ orbitCamera.position.set(0,40,110); controls.target.set(0,0,0); controls.update(); };
  instance.setZoomDistance = (dist)=>{ const tgt=controls.target.clone(); const dir=orbitCamera.position.clone().sub(tgt).normalize(); const clamp=Math.min(Math.max(dist, controls.minDistance||5), controls.maxDistance||300); orbitCamera.position.copy(dir.multiplyScalar(clamp).add(tgt)); controls.update(); };
  instance.pan = (dx,dy)=>{ const dist=orbitCamera.position.distanceTo(controls.target); const s=dist*0.0015; const x=-dx*s, y=dy*s; const te=orbitCamera.matrix.elements; const right=new instance.THREE.Vector3(te[0],te[1],te[2]).multiplyScalar(x); const up=new instance.THREE.Vector3(te[4],te[5],te[6]).multiplyScalar(y); controls.target.add(right).add(up); orbitCamera.position.add(right).add(up); controls.update(); };
  instance.rebuildTileIdOverlays = ()=> rebuildTileIdOverlays(instance);
  if (typeof window!=='undefined'){ window.dungeonRenderer=instance; exposeGeneration(instance); }
}

function exposeGeneration(instance){
  let currentAbort = null;
  window.cancelWFCDungeon = ()=>{ if (currentAbort) { try{ currentAbort.abort(); }catch(_){} } };
  window.generateWFCDungeon = async ({x=3,y=3,z=3, yieldEvery=500, maxSteps=30000, stallTimeoutMs=10000, maxYields=50, centerSeed=true}={})=>{
    try {
      const [tilesetMod, meshUtil] = await Promise.all([
        import('../dungeon/tileset.js'), import('./wfc_tile_mesh.js')
      ]);
      tilesetMod.initializeTileset();
      const protos = tilesetMod.tilePrototypes;
      const rng=(()=>{ let s=Date.now()%1e9; return ()=> (s=(s*1664525+1013904223)%4294967296)/4294967296; })();
  // Important: dims are in tile units, not voxel units. Avoid multiplying by 3 here.
  // Add browser-friendly safeguards to prevent endless runs.
  if (currentAbort) { try{ currentAbort.abort(); }catch(_){} }
  currentAbort = new AbortController();
  const { grid, grid3D, tiles } = await generateWFCDungeon({
    NDWFC3D: window.NDWFC3D||function(){},
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
function buildMeshGroup(tiles, protos, meshUtil, THREE){ const g=new THREE.Group(); const map=new Map(); tiles.forEach(t=> map.set(`${t.position[0]},${t.position[1]},${t.position[2]}`, t)); const isStair=t=>{ const p=protos[t.prototypeIndex]; return p.meta&&p.meta.role==='stair'; }; const getN=(t,dz,dy,dx)=> map.get(`${t.position[0]+dz},${t.position[1]+dy},${t.position[2]+dx}`); tiles.forEach(t=>{ const below=getN(t,0,-1,0), above=getN(t,0,1,0); const gm=meshUtil.buildTileMesh({THREE, prototypeIndex:t.prototypeIndex, rotationY:t.rotationY, unit:3, hasStairBelow:!!(below&&isStair(below)), hasStairAbove:!!(above&&isStair(above))}); gm.position.set(t.position[2]*3, t.position[1]*3, t.position[0]*3); g.add(gm); }); return g; }

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