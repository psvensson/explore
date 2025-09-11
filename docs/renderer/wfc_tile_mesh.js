// wfc_tile_mesh.js
// Utilities to interpret a voxel-level WFC output grid in 3x3x3 chunks,
// detect which registered tiles (with Y-rotations) they correspond to,
// and build simple Three.js meshes for visualization.

import { tilePrototypes } from '../dungeon/tileset.js';

// Internal material cache keyed by the THREE namespace object to avoid mutating
// the (non-extensible) ES module namespace. Using WeakMap prevents leaks.
const __WFC_MATERIAL_CACHE = new WeakMap();
function getMaterialCache(THREE){
  let c = __WFC_MATERIAL_CACHE.get(THREE);
  if (!c){ c = {}; __WFC_MATERIAL_CACHE.set(THREE, c); }
  return c;
}

// --- Rotation Helpers (Y axis only, matching tileset usage) ---
export function rotateYOnce(vox){
  // Treat vox[z][y][x]; +90 deg about Y maps (x,z) -> (z, 2-x) keeping y
  const Z = 3, Y = 3, X = 3;
  const out = Array.from({length:Z},()=>Array.from({length:Y},()=>Array(X).fill(0)));
  for (let z=0; z<Z; z++) for (let y=0; y<Y; y++) for (let x=0; x<X; x++){
    const nz = x;      // new z axis becomes old x
    const nx = (X-1)-z;// new x axis inverted old z
    out[nz][y][nx] = vox[z][y][x];
  }
  return out;
}

export function rotateY(vox, times){
  let r = vox;
  for (let i=0;i<(times%4+4)%4;i++) r = rotateYOnce(r);
  return r;
}

export function equalVox(a,b){
  for (let z=0; z<3; z++) for (let y=0;y<3;y++) for (let x=0;x<3;x++) if (a[z][y][x] !== b[z][y][x]) return false;
  return true;
}

// Precompute rotated variants for faster detection.
let prototypeRotations = tilePrototypes.map(proto => {
  const base = proto.voxels;
  const rots = [];
  let cur = base;
  for (let i=0;i<4;i++){
    if (!rots.some(r => equalVox(r.voxels, cur))){
      rots.push({rotation:i, voxels:cur});
    }
    cur = rotateYOnce(cur);
  }
  return rots; // unique rotations
});

export function detectTile(voxels){
  // Rebuild rotations if tilePrototypes changed length (e.g., after test reset)
  if (prototypeRotations.length !== tilePrototypes.length){
    prototypeRotations = tilePrototypes.map(proto => {
      const base = proto.voxels;
      const rots=[]; let cur=base;
      for (let i=0;i<4;i++){
        if (!rots.some(r => equalVox(r.voxels, cur))) rots.push({rotation:i, voxels:cur});
        cur = rotateYOnce(cur);
      }
      return rots;
    });
  }
  for (let protoIndex=0; protoIndex<prototypeRotations.length; protoIndex++){
    const rots = prototypeRotations[protoIndex];
    for (const r of rots){
      if (equalVox(voxels, r.voxels)){
        return { prototypeIndex: protoIndex, rotationY: r.rotation };
      }
    }
  }
  throw new Error('Unknown tile voxels (no match)');
}

// Parse full voxel grid (array[z][y][x]) sized (Z,Y,X) where each dimension is multiple of 3.
export function parseVoxelGridToTiles(grid){
  const Z = grid.length;
  if (Z===0) return [];
  const Y = grid[0].length;
  const X = grid[0][0].length;
  if (Z%3||Y%3||X%3) throw new Error('Grid dimensions must be multiples of 3');
  const tiles = [];
  for (let z=0; z<Z; z+=3){
    for (let y=0; y<Y; y+=3){
      for (let x=0; x<X; x+=3){
        const block = [];
        for (let bz=0;bz<3;bz++){
          const layer=[];
          for (let by=0;by<3;by++){
            const rowArr=[];
            for (let bx=0;bx<3;bx++) rowArr.push(grid[z+bz][y+by][x+bx]);
            layer.push(rowArr);
          }
          block.push(layer);
        }
        // block is [z][y][x]
        const {prototypeIndex, rotationY} = detectTile(block);
        tiles.push({prototypeIndex, rotationY, position:[z/3, y/3, x/3]});
      }
    }
  }
  return tiles;
}

// Build Three.js mesh (Group) for a given detected tile (using underlying prototype voxels before rotation).
export function buildTileMesh({THREE, prototypeIndex, rotationY=0, unit=1}){
  if (!THREE) throw new Error('THREE dependency missing');
  const proto = tilePrototypes[prototypeIndex];
  if (!proto) throw new Error('Invalid prototype index');
  const vox = rotateY(proto.voxels, rotationY);
  const group = new (THREE.Group||function(){ this.children=[]; this.add=o=>this.children.push(o); })();
  const geometry = new (THREE.BoxGeometry||function(){}) (unit/3, unit/3, unit/3);

  // Material cache (per THREE instance)
  const cache = getMaterialCache(THREE);
  function noiseTexture(color){
    if (!THREE.CanvasTexture || !globalThis.document) return null;
    const size=32; const c=document.createElement('canvas'); c.width=c.height=size; const ctx=c.getContext('2d');
    const r=(color>>16)&255,g=(color>>8)&255,b=color&255; const img=ctx.createImageData(size,size);
    for (let i=0;i<img.data.length;i+=4){ const n=(Math.random()*30-15)|0; img.data[i]=r+n; img.data[i+1]=g+n; img.data[i+2]=b+n; img.data[i+3]=255; }
    ctx.putImageData(img,0,0); const tex=new THREE.CanvasTexture(c); return tex;
  }
  function mat(key,color,label){
    if (cache[key]) return cache[key];
    const M = THREE.MeshStandardMaterial||THREE.MeshPhongMaterial||function(cfg){this.color=cfg.color;};
    const tex = noiseTexture(color);
    const m = new M({ color, map:tex||undefined });
    m.userData = { type: label };
    cache[key]=m; return m;
  }
  const floorMat   = mat('floor',   0x333333,'floor');
  const midMat     = mat('mid',     0x555555,'mid');
  const ceilingMat = mat('ceiling', 0x888888,'ceiling');
  const stairMat   = mat('stair',   0x777777,'stair');

  for (let z=0; z<3; z++) for (let y=0;y<3;y++) for (let x=0;x<3;x++){
    const v = vox[z][y][x];
    if (v>0){
      let material = midMat;
      if (v===2) material = stairMat; else if (y===0) material = floorMat; else if (y===2) material = ceilingMat;
      const mesh = new (THREE.Mesh||function(){return {}})(geometry, material);
      if (mesh.position) mesh.position.set(x*unit/3 + unit/6, y*unit/3 + unit/6, z*unit/3 + unit/6);
      group.add(mesh);
    }
  }
  return group;
}

export default { rotateYOnce, rotateY, detectTile, parseVoxelGridToTiles, buildTileMesh };