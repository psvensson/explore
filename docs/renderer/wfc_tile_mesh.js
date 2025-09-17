// wfc_tile_mesh.js
// Utilities to interpret a voxel-level WFC output grid in 3x3x3 chunks,
// detect which registered tiles (with Y-rotations) they correspond to,
// and build simple Three.js meshes for visualization.

import { tilePrototypes } from '../dungeon/tileset.js';
import { makeGeometryFactory, makeMaterialFactory, isAllSolid, buildStairs, getMaterialCache } from './mesh_factories.js';

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

// Helper functions for simplified stair detection
function hasStairVoxel(vox) {
  // Check if any voxel has value 2 (stair marker)
  for (let z = 0; z < 3; z++) {
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        if (vox[z][y][x] === 2) return true;
      }
    }
  }
  return false;
}

function detectStairDirection(vox) {
  // Find the center stair voxel and determine travel direction
  // by checking for solid backing along one axis
  const stairVoxels = [];
  for (let z = 0; z < 3; z++) {
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        if (vox[z][y][x] === 2) stairVoxels.push({x, y, z});
      }
    }
  }
  
  if (stairVoxels.length === 0) return null;
  
  // Use center stair voxel or first one found
  const center = stairVoxels.find(v => v.x === 1 && v.y === 1 && v.z === 1) || stairVoxels[0];
  
  // Count solid voxels along each axis to determine travel direction
  let countXP = 0, countXN = 0, countZP = 0, countZN = 0;
  for (let y = 0; y < 3; y++) {
    if (center.x < 2 && vox[center.z][y][center.x + 1] > 0) countXP++;
    if (center.x > 0 && vox[center.z][y][center.x - 1] > 0) countXN++;
    if (center.z < 2 && vox[center.z + 1] && vox[center.z + 1][y][center.x] > 0) countZP++;
    if (center.z > 0 && vox[center.z - 1] && vox[center.z - 1][y][center.x] > 0) countZN++;
  }
  
  const xSpan = countXP + countXN;
  const zSpan = countZP + countZN;
  
  let axis = (zSpan >= xSpan) ? 'z' : 'x';
  let dir = 1;
  if (axis === 'z') {
    dir = (countZP >= countZN) ? +1 : -1;
  } else {
    dir = (countXP >= countXN) ? +1 : -1;
  }
  
  return { axis, dir };
}

// Build Three.js mesh (Group) for a given detected tile (using underlying prototype voxels before rotation).
// ---- Helper bridges to shared factories ----
function solidGroup(THREE, unit, cache){
  const BG=THREE.BoxGeometry||function(){}; const geom=new BG(unit,unit,unit);
  const M=THREE.Mesh||function(){return {position:{set(){}}}};
  const Mtl=THREE.MeshStandardMaterial||THREE.MeshPhongMaterial||function(c){this.color=c.color;};
  if(!cache.mid){ cache.mid=new Mtl({color:0x555555}); cache.mid.userData={type:'mid'}; }
  const mesh=new M(geom, cache.mid); if(mesh.position) mesh.position.set(unit/2,unit/2,unit/2);
  const G=THREE.Group||function(){this.children=[];this.add=o=>this.children.push(o);}; const g=new G(); g.add(mesh); return g;
}
const stairDir=(proto,vox)=>{ if(!hasStairVoxel(vox)) return null; if(proto.meta&&proto.meta.role==='stair'&&proto.meta.axis&&proto.meta.dir) return {axis:proto.meta.axis,dir:proto.meta.dir}; return detectStairDirection(vox); };
const classifyMid=(vox,x,y,z,hasStairs)=>{ if(y!==1) return null; if(hasStairs && x===1 && z===1) return 'skip'; const hx=(x>0&&vox[z][y][x-1]>0)||(x<2&&vox[z][y][x+1]>0); const hz=(z>0&&vox[z-1][y][x]>0)||(z<2&&vox[z+1][y][x]>0); if(hx&&!hz) return 'wall_xMajor'; if(hz&&!hx) return 'wall_zMajor'; return 'wall_both'; };
function skipVoxel({y,hasStairs,hasStairBelow,hasStairAbove}){ if(hasStairs && y===2) return true; if(hasStairBelow && y===0) return true; if(hasStairAbove && y===2) return true; return false; }
function placeNonWall({THREE,group,geomKind,material,x,y,z,unit}){ const geometry=this.getGeometry(geomKind); const mesh=new (THREE.Mesh||function(){return {position:{set(){}}}})(geometry,material); if(mesh.position){ const f=unit/3,t=f*0.1; let px=x*f+f/2,py=unit/2,pz=z*f+f/2; if(geomKind==='floor'){ py=y*f+t/2; } else if(geomKind==='ceiling'){ py=y*f+f-t/2; } mesh.position.set(px,py,pz);} group.add(mesh); }
function emitWalls({THREE,group,emitX,emitZ,unit,material,z,x}){ const f=unit/3,t=f*0.1; if(emitX){ const g=this.getGeometry('wall_xMajor'); const m=new (THREE.Mesh||function(){return {position:{set(){}}}})(g,material); if(m.position){ const pz=(z<=1)?(0+t/2):(unit-t/2); m.position.set(unit/2,unit/2,pz);} group.add(m);} if(emitZ){ const g=this.getGeometry('wall_zMajor'); const m=new (THREE.Mesh||function(){return {position:{set(){}}}})(g,material); if(m.position){ const px=(x<=1)?(0+t/2):(unit-t/2); m.position.set(px,unit/2,unit/2);} group.add(m);} }
function processVoxels(ctx){
  const {vox,unit,hasStairs,hasStairBelow,hasStairAbove,materials,group}=ctx;
  for(let z=0;z<3;z++) for(let y=0;y<3;y++) for(let x=0;x<3;x++){
    const v=vox[z][y][x]; if(v<=0) continue; if(skipVoxel({y,hasStairs,hasStairBelow,hasStairAbove})) continue;
    let geomKind='mid'; let material=(v===2?materials.stair:materials.mid);
    if(y===0){ material=materials.floor; geomKind='floor'; }
    else if(y===2){ material=materials.ceiling; geomKind='ceiling'; }
    else {
      const midClass=classifyMid(vox,x,y,z,hasStairs); if(midClass==='skip') continue; geomKind=midClass;
      if(hasStairs && geomKind.startsWith('wall')) continue;
    }
    let emitX=false, emitZ=false;
    if(geomKind==='wall_xMajor'||geomKind==='wall_both'){
      const front=(z<=1); emitX=((front&&z===0)||(!front&&z===2))&&(x===1);
    }
    if(geomKind==='wall_zMajor'||geomKind==='wall_both'){
      const left=(x<=1); emitZ=((left&&x===0)||(!left&&x===2))&&(z===1);
    }
    if(!geomKind.startsWith('wall')){
      placeNonWall.call(ctx,{THREE:ctx.THREE,group,geomKind,material,x,y,z,unit});
      continue;
    }
    emitWalls.call(ctx,{THREE:ctx.THREE,group,emitX,emitZ,unit,material,z,x});
  }
}

export function buildTileMesh({THREE, prototypeIndex, rotationY=0, unit=1, hasStairBelow=false, hasStairAbove=false}={}){
  if(!THREE) throw new Error('THREE dependency missing'); const proto=tilePrototypes[prototypeIndex]; if(!proto) throw new Error('Invalid prototype index'); const vox=rotateY(proto.voxels, rotationY); const cache=getMaterialCache(THREE); if(isAllSolid(vox)) return solidGroup(THREE,unit,cache);
  const group=new (THREE.Group||function(){this.children=[];this.add=o=>this.children.push(o);})(); const getGeometry=makeGeometryFactory(THREE,unit); const mat=makeMaterialFactory(THREE); const materials={ floor:mat('floor',0x333333,'floor'), mid:mat('mid',0x555555,'mid'), ceiling:mat('ceiling',0x888888,'ceiling'), stair:mat('stair',0x777777,'stair') };
  const dirInfo=stairDir(proto, vox); buildStairs({THREE,group,dirInfo,unit,stairMat:materials.stair}); processVoxels({THREE,vox,unit,hasStairs:!!dirInfo,hasStairBelow,hasStairAbove,materials,group,getGeometry}); return group; }

export default { rotateYOnce, rotateY, detectTile, parseVoxelGridToTiles, buildTileMesh };