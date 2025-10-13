import { TILE_SIZE } from './constants.js';

// mini_viewer.js
export function setupMiniViewer(tiles, meshUtil, THREE){
  const container = document.getElementById('mini-viewer');
  const browser = document.getElementById('tile-block-browser');
  if(!container || !browser) return;
  initMini(container, THREE);
  buildSelectionHandlers(container, browser, tiles, meshUtil, THREE);
}

function initMini(container, THREE){
  if(container._mini) return;
  const renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, container.clientWidth/container.clientHeight, 0.1, 500);
  const spherical = { radius:40, theta:Math.PI*0.25, phi:Math.PI*0.35 };
  addMiniLights(scene, THREE);
  syncCamera(camera, spherical);
  container._mini = { renderer, scene, camera, selection:[], spherical, active:false };
  startMiniLoop(renderer, scene, camera);
  wireMiniResize(container, renderer, camera);
  wireMiniInput(container, spherical, camera);
  wireClearSelection(container, THREE);
}

function addMiniLights(scene, THREE){
  scene.add(new THREE.AmbientLight(0xffffff,0.6));
  const dir = new THREE.DirectionalLight(0xffffff,0.8); dir.position.set(30,50,20); scene.add(dir);
  scene.add(new THREE.GridHelper(120,24,0x335577,0x223344));
}

function syncCamera(camera, spherical){
  const r=spherical.radius, sp=Math.sin(spherical.phi);
  const x=r*sp*Math.cos(spherical.theta);
  const z=r*sp*Math.sin(spherical.theta);
  const y=r*Math.cos(spherical.phi);
  camera.position.set(x,y,z); camera.lookAt(0,0,0);
}

function startMiniLoop(renderer, scene, camera){
  (function loop(){ requestAnimationFrame(loop); renderer.render(scene,camera); })();
}

function wireMiniResize(container, renderer, camera){
  window.addEventListener('resize', ()=>{
    const w=container.clientWidth, h=container.clientHeight;
    renderer.setSize(w,h); camera.aspect=w/h; camera.updateProjectionMatrix();
  });
}

function wireClearSelection(container, THREE){
  const btn=document.getElementById('clear-selected-tiles');
  if(!btn) return;
  btn.onclick=()=>{
    container._mini.selection=[];
    rebuildMiniScene(container, THREE);
    document.querySelectorAll('.tile-block').forEach(b=> b.dataset.selected='false');
  };
}

function wireMiniInput(container, spherical, camera){
  container.addEventListener('click',()=> setActive(container,true));
  let dragging=false,lastX=0,lastY=0;
  container.addEventListener('mousedown',e=>{ if(!container._mini.active) return; dragging=true; lastX=e.clientX; lastY=e.clientY; });
  window.addEventListener('mouseup',()=> dragging=false);
  window.addEventListener('mousemove',e=>{
    if(!dragging||!container._mini.active) return;
    const dx=e.clientX-lastX, dy=e.clientY-lastY; lastX=e.clientX; lastY=e.clientY;
    spherical.theta -= dx*0.005; spherical.phi -= dy*0.005;
    spherical.phi=Math.max(0.15,Math.min(Math.PI-0.15,spherical.phi));
    syncCamera(camera, spherical);
  });
  container.addEventListener('wheel',e=>{
    if(!container._mini.active) return;
    spherical.radius*=(1+Math.sign(e.deltaY)*0.08);
    spherical.radius=Math.max(5,Math.min(400,spherical.radius));
    syncCamera(camera, spherical);
  });
  window.addEventListener('keydown',e=>{ if(e.key==='Escape'&&container._mini.active) setActive(container,false); });
}

const setActive=(c,a)=>{ c._mini.active=a; a?c.classList.add('active'):c.classList.remove('active'); if(a) c.focus(); };

function buildSelectionHandlers(container,browser,tiles,meshUtil,THREE){
  browser.onclick=e=>{
    const block=e.target.closest('.tile-block');
    if(!block) return;
    const selected=block.dataset.selected==='true';
    block.dataset.selected= selected?'false':'true';
    const list=container._mini.selection;
    if(!selected){ list.push(tileSelectionData(block)); }
    else removeSelection(list, block);
    rebuildMiniScene(container, THREE, meshUtil);
  };
  rebuildMiniScene(container, THREE, meshUtil);
}

function tileSelectionData(block){
  return {
    prototypeIndex:Number(block.dataset.prototype),
    rotationY:Number(block.dataset.rotation),
    tx:Number(block.dataset.tx),
    ty:Number(block.dataset.ty),
    tz:Number(block.dataset.tz)
  };
}

function removeSelection(list, block){
  const idx=list.findIndex(s=> s.tx==block.dataset.tx && s.ty==block.dataset.ty && s.tz==block.dataset.tz);
  if(idx>-1) list.splice(idx,1);
}

function rebuildMiniScene(container, THREE, meshUtil){
  const { scene }=container._mini;
  pruneMiniScene(scene);
  const sel=container._mini.selection;
  if(!sel.length) return;
  const origin=sel[0];
  sel.forEach(s=> addSelectedTile(scene, origin, s, meshUtil, THREE));
  autoFrameMini(container, scene, THREE);
}

function pruneMiniScene(scene){
  for(let i=scene.children.length-1;i>=0;i--){
    const c=scene.children[i];
    if(!c.isLight && !(c.geometry&&c.geometry.type==='GridHelper')) scene.remove(c);
  }
}

function addSelectedTile(scene, origin, s, meshUtil, THREE){
  const gm=meshUtil.buildTileMesh({THREE,prototypeIndex:s.prototypeIndex,rotationY:s.rotationY,unit:TILE_SIZE});
  const ox=(s.tx-origin.tx)*TILE_SIZE, oy=(s.ty-origin.ty)*TILE_SIZE, oz=(s.tz-origin.tz)*TILE_SIZE;
  gm.position.set(ox,oy,oz); scene.add(gm);
}

function autoFrameMini(container, scene, THREE){
  try{
    if(!(THREE.Box3&&THREE.Vector3)) return;
    const box=new THREE.Box3().setFromObject(scene);
    const size=new THREE.Vector3(); box.getSize(size);
    const maxDim=Math.max(size.x,size.y,size.z)||1;
    const sp=container._mini.spherical; sp.radius=maxDim*1.6;
    if(size.y>size.x*0.8) sp.phi=Math.PI*0.35;
  }catch(_){ }
}
