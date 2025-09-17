// overlays.js
export function rebuildTileIdOverlays(instance){
  const { scene } = instance;
  if (!window.__SHOW_TILE_IDS){ removeGroup(instance, scene); return; }
  const THREE = instance.THREE; if (!(THREE && THREE.Sprite && THREE.SpriteMaterial && THREE.CanvasTexture)) return;
  removeGroup(instance, scene);
  const g = new THREE.Group(); g.userData.keep=true; g.name='TileIdOverlayGroup';
  const tiles = instance.lastTiles || []; const cache=new Map();
  const texFor = (id)=>{ if(cache.has(id)) return cache.get(id); const c=makeCanvas(id); const t=new THREE.CanvasTexture(c); cache.set(id,t); return t; };
  tiles.forEach(t=>{ const tex=texFor(t.tileId); const mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false,depthWrite:false}); const s=new THREE.Sprite(mat); s.position.set(t.position[2]*3+1.5, t.position[1]*3+3.2, t.position[0]*3+1.5); s.scale.set(2.2,2.2,1); g.add(s); });
  scene.add(g); instance._tileIdOverlayGroup=g;
}
function removeGroup(instance, scene){ if(instance._tileIdOverlayGroup){ try{ scene.remove(instance._tileIdOverlayGroup);}catch(_){} instance._tileIdOverlayGroup=null; } }
function makeCanvas(id){ const size=64; const c=document.createElement('canvas'); c.width=c.height=size; const ctx=c.getContext('2d'); ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.fillRect(0,0,size,size); ctx.strokeStyle='rgba(255,255,255,0.4)'; ctx.strokeRect(1,1,size-2,size-2); ctx.fillStyle='#ffe27a'; ctx.font='28px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(String(id), size/2, size/2); return c; }
