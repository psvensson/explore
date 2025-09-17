// controls_fps.js
export const makeOrbitControls = (THREE, camera, dom) => new THREE.OrbitControls(camera, dom);
export const makeKeyState = () => Object.create(null);
export const isTestEnv = () => typeof process !== 'undefined' && process.env && process.env.JEST_WORKER_ID;
export function initOrbitDefaults(ctrl){ ctrl.enableDamping=true; ctrl.dampingFactor=0.05; ctrl.enablePan=true; ctrl.screenSpacePanning=true; ctrl.enableRotate=true; ctrl.minDistance=5; ctrl.maxDistance=300; return ctrl; }
export function makeFPSState(THREE, cam){ return { mode:'orbit', yaw:0, pitch:0, moveSpeed:25, lookSpeed:0.0025, cam, THREE }; }
export function updateFPS(dt, st, keyState){ if (st.mode!=='fps') return; const T=st.THREE; const f=new T.Vector3(0,0,-1).applyEuler(st.cam.rotation); const r=new T.Vector3(1,0,0).applyEuler(st.cam.rotation); f.y=0;r.y=0;f.normalize();r.normalize(); const u=new T.Vector3(0,1,0); const vel=new T.Vector3(); if(keyState.KeyW)vel.add(f); if(keyState.KeyS)vel.sub(f); if(keyState.KeyD)vel.add(r); if(keyState.KeyA)vel.sub(r); if(keyState.Space)vel.add(u); if(keyState.ShiftLeft||keyState.ShiftRight)vel.sub(u); if(vel.lengthSq()>0) st.cam.position.add(vel.normalize().multiplyScalar(st.moveSpeed*dt)); }
export function toggleMode(st, orbitCam, ctrl){ st.mode = st.mode==='orbit'?'fps':'orbit'; ctrl.enabled = st.mode==='orbit'; if (st.mode==='fps') st.cam = st.cam; }
export function applyPointerLook(st,e){ if(st.mode!=='fps') return; st.yaw -= e.movementX*st.lookSpeed; st.pitch -= e.movementY*st.lookSpeed; const m=Math.PI/2-0.01; st.pitch=Math.max(-m,Math.min(m,st.pitch)); st.cam.rotation.set(st.pitch, st.yaw, 0); }
