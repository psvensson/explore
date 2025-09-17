// scene_setup.js
export const makeScene = (THREE) => new THREE.Scene();
export const makePerspective = (THREE, fov, aspect, near, far) => new THREE.PerspectiveCamera(fov, aspect, near, far);
export const setVec3 = (obj, x, y, z) => { obj.position && obj.position.set(x,y,z); return obj; };
export function configureFPSCamera(cam){ if (cam.rotation) cam.rotation.order='YXZ'; cam.userData = cam.userData||{}; cam.userData.keep=true; return cam; }
export function addBasicLights(THREE, scene){
  if (THREE.DirectionalLight){ const d=new THREE.DirectionalLight(0xffffff,1.1); setVec3(d,25,40,20); d.userData={keep:true}; scene.add(d); }
  if (THREE.HemisphereLight){ const h=new THREE.HemisphereLight(0x99bbff,0x223344,0.6); h.userData={keep:true}; scene.add(h); }
  if (THREE.AmbientLight){ const a=new THREE.AmbientLight(0xffffff,0.35); a.userData={keep:true}; scene.add(a); }
  if (THREE.GridHelper){ const g=new THREE.GridHelper(150,60,0x336699,0x224455); g.userData={keep:true,type:'grid'}; scene.add(g); if((typeof window!=='undefined')&&(window.__RENDER_DEBUG__||window.__WFC_DEBUG__)) console.debug('[Render] added GridHelper'); }
}
