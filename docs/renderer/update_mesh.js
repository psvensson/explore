// update_mesh.js
let lastInstanceRef = null;
export const setInstanceRef = (inst)=> (lastInstanceRef = inst);
export function updateDungeonMesh(mesh){
  if(!lastInstanceRef) return; const { scene, fpsCamera, THREE } = lastInstanceRef;
  const dbg = (typeof window!=='undefined') && (window.__RENDER_DEBUG__ || window.__WFC_DEBUG__);
  clearScene(scene); if (mesh) addMesh(scene, mesh);
  if (dbg) {
    try {
      const keepCount = scene.children.filter(c=>c&&c.userData&&c.userData.keep).length;
      console.debug('[Render] scene children after add', { total: scene.children.length, keep: keepCount });
    } catch(_){ }
  }
  tryRepositionCameras(THREE, mesh, lastInstanceRef, dbg, scene);
}
const clearScene = (scene)=>{ for(let i=scene.children.length-1;i>=0;i--){ const c=scene.children[i]; if(!(c&&c.userData&&c.userData.keep)) scene.remove(c); } };
const addMesh = (scene, mesh)=> scene.add && scene.add(mesh);
function tryRepositionCameras(THREE, mesh, inst, dbg, scene){
  try {
    if(!(mesh && THREE && THREE.Box3 && THREE.Vector3)) return;
    const box = new THREE.Box3().setFromObject(mesh);
    // Some THREE builds expose isEmpty as a method; handle both
    const empty = (typeof box.isEmpty === 'function') ? box.isEmpty() : false;
    if (empty) return;
    const size = new THREE.Vector3(); box.getSize(size);
    const center = new THREE.Vector3(); box.getCenter(center);
    const radius = Math.max(size.x, size.y, size.z) * 0.6 + 5;
    if (dbg) console.debug('[Render] mesh bounds', { center: center.toArray? center.toArray():center, size: size.toArray? size.toArray():size, radius });
    if (dbg && scene) {
      try {
        if (THREE.Box3Helper) { const helper = new THREE.Box3Helper(box, 0xffaa00); helper.userData={}; scene.add(helper); }
        if (THREE.AxesHelper) { const axes = new THREE.AxesHelper(Math.max(size.x,size.y,size.z)); axes.position.copy(center); axes.userData={}; scene.add(axes); }
      } catch(_){}
    }
    // FPS camera: hover above and offset back
    if (inst.fpsCamera && inst.fpsCamera.position){
      inst.fpsCamera.position.set(center.x + size.x*0.1, center.y + Math.max(5, size.y*0.5), center.z + size.z*0.9 + 10);
      if (dbg) console.debug('[Render] fpsCamera pos', inst.fpsCamera.position.toArray? inst.fpsCamera.position.toArray():inst.fpsCamera.position);
    }
    // Orbit camera: back up to fit bounding box and retarget controls
    if (inst.orbitCamera && inst.controls){
      const cam = inst.orbitCamera;
      const dir = new THREE.Vector3(0, 0.3, 1).normalize();
      cam.position.copy(center.clone().add(dir.multiplyScalar(radius*2)));
      if (inst.controls.target) inst.controls.target.copy(center);
      if (inst.controls.update) inst.controls.update();
      if (dbg) console.debug('[Render] orbitCamera pos/target', {
        pos: cam.position.toArray? cam.position.toArray():cam.position,
        target: inst.controls.target && inst.controls.target.toArray? inst.controls.target.toArray(): inst.controls.target
      });
    }
  } catch(_){}
}
