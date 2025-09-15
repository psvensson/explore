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
  // Fast path: solid tile made entirely of 1s -> render as a single full cube
  let solidOnes = true;
  outer: for (let z=0; z<3; z++) for (let y=0; y<3; y++) for (let x=0; x<3; x++){
    if (vox[z][y][x] !== 1) { solidOnes = false; break outer; }
  }
  if (solidOnes){
    const BG = THREE.BoxGeometry||function(){};
    const geom = new BG(unit, unit, unit);
    const M = THREE.Mesh||function(){ return { position:{ set(){} } } };
    // reuse mid material for solid cube
    const cache = getMaterialCache(THREE);
    const midMat = (function(){
      const Mtl = THREE.MeshStandardMaterial||THREE.MeshPhongMaterial||function(cfg){this.color=cfg.color;};
      if (!cache.mid){ cache.mid = new Mtl({color:0x555555}); cache.mid.userData={type:'mid'}; }
      return cache.mid;
    })();
    const mesh = new M(geom, midMat);
    if (mesh.position && mesh.position.set) mesh.position.set(unit/2, unit/2, unit/2);
    const G = THREE.Group||function(){ this.children=[]; this.add=o=>this.children.push(o); };
    const grp = new G(); grp.add(mesh); return grp;
  }
  const group = new (THREE.Group||function(){ this.children=[]; this.add=o=>this.children.push(o); })();
  // Geometry cache for different voxel roles to avoid recreating.
  const geometryCache = {};
  function createRampGeometry(axis, dir){
    const BG = THREE.BufferGeometry||function(){};
    const geom = new BG();
    const h = unit/2; // half dimensions for centered geometry
    const verts = [];
    // Build a ramp that occupies exactly half the cube volume (triangular prism).
    // Base dimensions: unit x unit footprint, height: unit. Slope along +axis when dir>0, else along -axis.
    if (axis === 'x'){
      // Start from the +Z ramp (slope along +Z) and swap x<->z
      const v = [
        [-h, 0, -h], [-h, 0, h], [-h, unit, h],
        [ h, 0, -h], [ h, 0, h], [ h, unit, h]
      ];
      for (const p of v){
        let x = p[2], y = p[1], z = p[0];
        if (dir && dir < 0) x = -x; // flip to slope along -X
        verts.push(x, y, z);
      }
    } else {
      // axis 'z': ramp rises along +Z, extruded along X
      const v = [
        [-h, 0, -h], [-h, 0, h], [-h, unit, h],
        [ h, 0, -h], [ h, 0, h], [ h, unit, h]
      ];
      for (const p of v){
        let x = p[0], y = p[1], z = p[2];
        if (dir && dir < 0) z = -z; // flip to slope along -Z
        verts.push(x, y, z);
      }
    }
    const idx = [
      // Left triangular cap (0,1,2)
      0,1,2,
      // Right triangular cap (3,5,4)
      3,5,4,
      // Bottom rectangle (0,3,4,1)
      0,3,4, 0,4,1,
      // Back rectangle at +axis (1,4,5,2)
      1,4,5, 1,5,2,
      // Sloped rectangle (0,3,5,2)
      0,3,5, 0,5,2
    ];
    if (geom.setAttribute){
      const pos = new THREE.Float32BufferAttribute(verts, 3);
      geom.setAttribute('position', pos);
      geom.setIndex(idx);
      if (geom.computeVertexNormals) geom.computeVertexNormals();
    }
    return geom;
  }
  function createVoxelRampGeometry(axis, dir){
    const BG = THREE.BufferGeometry||function(){};
    const geom = new BG();
    const full = unit/3;
    const hv = full/2; // half voxel size
    const verts = [];
    if (axis==='x'){
      const v = [
        [-hv, 0, -hv], [-hv, 0, hv], [-hv, full, hv],
        [ hv, 0, -hv], [ hv, 0, hv], [ hv, full, hv]
      ];
      for (const p of v){
        let x = p[2], y = p[1], z = p[0];
        if (dir && dir < 0) x = -x;
        verts.push(x,y,z);
      }
    } else {
      const v = [
        [-hv, 0, -hv], [-hv, 0, hv], [-hv, full, hv],
        [ hv, 0, -hv], [ hv, 0, hv], [ hv, full, hv]
      ];
      for (const p of v){
        let x = p[0], y = p[1], z = p[2];
        if (dir && dir < 0) z = -z;
        verts.push(x,y,z);
      }
    }
    const idx = [0,1,2, 3,5,4, 0,3,4, 0,4,1, 1,4,5, 1,5,2, 0,3,5, 0,5,2];
    if (geom.setAttribute){
      const pos = new THREE.Float32BufferAttribute(verts,3);
      geom.setAttribute('position', pos);
      geom.setIndex(idx);
      if (geom.computeVertexNormals) geom.computeVertexNormals();
    }
    return geom;
  }
  function createHalfTileHeightRampGeometry(axis, dir){
    const BG = THREE.BufferGeometry||function(){};
    const geom = new BG();
    const full = unit/3; // footprint size for a voxel
    const fv = full/2;
    const height = unit/2; // half tile height
    const verts = [];
    if (axis==='x'){
      const v = [
        [-fv, 0, -fv], [-fv, 0, fv], [-fv, height, fv],
        [ fv, 0, -fv], [ fv, 0, fv], [ fv, height, fv]
      ];
      for (const p of v){
        let x = p[2], y = p[1], z = p[0];
        if (dir && dir < 0) x = -x;
        verts.push(x,y,z);
      }
    } else {
      const v = [
        [-fv, 0, -fv], [-fv, 0, fv], [-fv, height, fv],
        [ fv, 0, -fv], [ fv, 0, fv], [ fv, height, fv]
      ];
      for (const p of v){
        let x = p[0], y = p[1], z = p[2];
        if (dir && dir < 0) z = -z;
        verts.push(x,y,z);
      }
    }
    const idx = [0,1,2, 3,5,4, 0,3,4, 0,4,1, 1,4,5, 1,5,2, 0,3,5, 0,5,2];
    if (geom.setAttribute){
      const pos = new THREE.Float32BufferAttribute(verts,3);
      geom.setAttribute('position', pos);
      geom.setIndex(idx);
      if (geom.computeVertexNormals) geom.computeVertexNormals();
    }
    return geom;
  }
  function getGeometry(kind){
    if (geometryCache[kind]) return geometryCache[kind];
    const BG = THREE.BoxGeometry||function(){};
    let g;
    const full = unit/3;
    switch(kind){
      case 'floor_full': {
        g = new BG(unit, full*0.1, unit); break;
      }
      case 'ceiling_full': {
        g = new BG(unit, full*0.1, unit); break;
      }
      case 'floor': {
        // Very thin slab (1/10 height)
        g = new BG(full, full*0.1, full); break;
      }
      case 'ceiling': {
        g = new BG(full, full*0.1, full); break;
      }
      case 'wall_xMajor': { // spans full tile along X, thin along Z, full height
        g = new BG(unit, unit, full*0.1); break;
      }
      case 'wall_zMajor': { // spans full tile along Z, thin along X, full height
        g = new BG(full*0.1, unit, unit); break;
      }
      case 'wall_pillar': { // ambiguous -> thin both directions, full height
        g = new BG(full*0.3, unit, full*0.3); break;
      }
      case 'mid': { // fallback mid, full height
        g = new BG(full*0.6, unit, full*0.6); break; }
      case 'stair': {
        // Keep near full size for readability
        g = new BG(full, full, full); break;
      }
      default: g = new BG(full, full, full);
    }
    geometryCache[kind]=g; return g;
  }

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

  function classifyStairVariant(vox3){
    // vox3[z][y][x], we inspect middle layer y=1 edges for platform (111)
    const y = 1;
    const rowStr = (z) => vox3[z][y].map(n => n>0? '1':'0').join('');
    const colStr = (x) => [vox3[0][y][x], vox3[1][y][x], vox3[2][y][x]].map(n=> n>0? '1':'0').join('');
    const front = rowStr(0), back = rowStr(2);
    const left = colStr(0), right = colStr(2);
    if (back === '111')  return { kind:'lower', axis:'z', dir:+1 };
    if (front === '111') return { kind:'upper', axis:'z', dir:-1 };
    if (right === '111') return { kind:'lower', axis:'x', dir:+1 };
    if (left === '111')  return { kind:'upper', axis:'x', dir:-1 };
    return null;
  }

  // Build a central ramp (snug to floor, rising to half tile height) and a back-row platform
  // --- New stacked stair rendering (three discrete steps) ---
  const stairVoxels = [];
  for (let z=0; z<3; z++) for (let y=0;y<3;y++) for (let x=0;x<3;x++) if (vox[z][y][x]===2) stairVoxels.push({x,y,z});
  let stairAxis=null, stairDir=+1, isPortal=false, isLower=false, isUpper=false;
  if (stairVoxels.length){
    const protoId = proto.tileId;
    if (protoId===31 || protoId===32){ isPortal=true; isLower=protoId===31; isUpper=protoId===32; }
    // Axis & direction using classify then fallback heuristic
    function inferAxisDir(){
      const center = stairVoxels.find(v=>v.x===1 && v.y===1 && v.z===1) || stairVoxels[0];
      // Check surrounding solid mid voxels to guess direction
      let countXP=0,countXN=0,countZP=0,countZN=0;
      for (let y=0;y<3;y++){
        if (center.x<2 && vox[center.z][y][center.x+1]>0) countXP++; if (center.x>0 && vox[center.z][y][center.x-1]>0) countXN++;
        if (center.z<2 && vox[center.z+1] && vox[center.z+1][y][center.x]>0) countZP++; if (center.z>0 && vox[center.z-1] && vox[center.z-1][y][center.x]>0) countZN++;
      }
      const xSpan = countXP+countXN, zSpan=countZP+countZN;
      let axis = (zSpan>=xSpan)?'z':'x';
      let dir = 1;
      if (axis==='z') dir = (countZP>=countZN)? +1 : -1; else dir = (countXP>=countXN)? +1 : -1;
      return {axis, dir};
    }
    const classified = classifyStairVariant(vox) || inferAxisDir();
    stairAxis = classified.axis; stairDir = classified.dir;
    // Create 3 steps: each 1/3 height, increasing along travel axis
    const full = unit/3; const stepHeight = unit/3; const treadDepth = unit/3; const thin = full*0.1;
    const StepGeom = THREE.BoxGeometry||function(){};
    for (let i=0;i<3;i++){
      const geom = new StepGeom(
        stairAxis==='x'? treadDepth : unit/3, // width along x
        stepHeight,                            // height
        stairAxis==='z'? treadDepth : unit/3   // width along z
      );
      const mesh = new (THREE.Mesh||function(){return { position:{ set(){} }}})(geom, stairMat);
      if (mesh.position && mesh.position.set){
        // position baseline
        let xPos = unit/2, zPos = unit/2;
        // offset along axis from start
        const offset = (i + 0.5) * treadDepth; // center each step segment
        if (stairAxis==='z'){
          const startZ = (stairDir>0)? (unit/2 - 1.5*treadDepth) : (unit/2 + 1.5*treadDepth);
          zPos = startZ + (stairDir>0? offset : -offset);
        } else {
          const startX = (stairDir>0)? (unit/2 - 1.5*treadDepth) : (unit/2 + 1.5*treadDepth);
          xPos = startX + (stairDir>0? offset : -offset);
        }
        const yPos = thin + (i+0.5)*stepHeight; // stack steps upward from floor top
        mesh.position.set(xPos, yPos, zPos);
      }
      group.add(mesh);
    }
  }

  // Detect any floor / ceiling occupancy & holes (portal stair variants)
  let hasFloor=false, hasCeiling=false, hasFloorHole=false, hasCeilingHole=false;
  for (let z=0; z<3; z++) for (let x=0; x<3; x++){
    const fv = vox[z][0][x]; const cv = vox[z][2][x];
    if (fv>0) hasFloor=true; else hasFloorHole=true;
    if (cv>0) hasCeiling=true; else hasCeilingHole=true;
  }
  for (let z=0; z<3; z++) for (let y=0;y<3;y++) for (let x=0;x<3;x++){
    const v = vox[z][y][x];
  if (v>0){
  // Do not skip mid layer when stairs present; we now combine walls with voxel ramps
      let material = (v===2 ? stairMat : midMat);
      let geomKind='mid';
      if (y===0){
        // If floor has any hole, emit per-cell thin slab for occupied cells only
        if (hasFloor && !hasFloorHole){ // normal unified plate
          if (!(x===0 && z===0)) { continue; }
          material = floorMat; geomKind='floor_full';
        } else {
          if (v===0) continue; // skip hole cell
          material = floorMat; geomKind='floor';
        }
      }
      else if (y===2){
        if (hasCeiling && !hasCeilingHole){
          if (!(x===0 && z===0)) { continue; }
          material = ceilingMat; geomKind='ceiling_full';
        } else {
          if (v===0) continue;
          material = ceilingMat; geomKind='ceiling';
        }
      }
      else if (y===1){
        // Treat mid layer (including 'stair' voxels) as wall plates per orientation
        const hasX = (x>0 && vox[z][y][x-1]>0) || (x<2 && vox[z][y][x+1]>0);
        const hasZ = (z>0 && vox[z-1][y][x]>0) || (z<2 && vox[z+1][y][x]>0);
        if (stairVoxels.length && x===1 && z===1){
          // Suppress central mid pillar when stairs present
          continue;
        }
        if (hasX && !hasZ) geomKind='wall_xMajor';
        else if (hasZ && !hasX) geomKind='wall_zMajor';
        else if (hasX && hasZ) geomKind='wall_both';
        else geomKind='wall_both';
      }
      // Decide per-axis emission to avoid duplicates and ensure boundary coverage
      let emitX = false, emitZ = false;
      if (geomKind==='wall_xMajor' || geomKind==='wall_both'){
        const front = (z<=1);
        emitX = ((front && z===0) || (!front && z===2)) && (x===1);
      }
      if (geomKind==='wall_zMajor' || geomKind==='wall_both'){
        const left = (x<=1);
        emitZ = ((left && x===0) || (!left && x===2)) && (z===1);
      }

      // Handle non-wall kinds normally
      if (!(geomKind==='wall_xMajor' || geomKind==='wall_zMajor' || geomKind==='wall_both' || geomKind==='wall_pillar')){
        const geometry = getGeometry(geomKind);
        const mesh = new (THREE.Mesh||function(){return {}})(geometry, material);
        if (mesh.position){
        const full = unit/3;
        const thin = full*0.1;
  // Default centered; for walls we use full tile height so center at tile center in Y
  let px = x*full + full/2;
  let py = unit/2;
  let pz = z*full + full/2;
        if (geomKind==='floor' || geomKind==='floor_full') {
          px = unit/2; pz = unit/2; py = y*full + thin/2; // full footprint
        } else if (geomKind==='ceiling' || geomKind==='ceiling_full') {
          px = unit/2; pz = unit/2; py = y*full + full - thin/2;
        } else if (geomKind==='wall_pillar') {
          // remain centered
        }
        mesh.position.set(px, py, pz);
        }
        group.add(mesh);
        continue;
      }

      // Walls: emit along X boundary
      if (emitX){
        const geometryX = getGeometry('wall_xMajor');
        const meshX = new (THREE.Mesh||function(){return {}})(geometryX, material);
        if (meshX.position){
          const full = unit/3; const thin = full*0.1;
          const pz = (z<=1) ? (0 + thin/2) : (unit - thin/2);
          meshX.position.set(unit/2, unit/2, pz);
        }
        group.add(meshX);
      }
      // Walls: emit along Z boundary
      if (emitZ){
        const geometryZ = getGeometry('wall_zMajor');
        const meshZ = new (THREE.Mesh||function(){return {}})(geometryZ, material);
        if (meshZ.position){
          const full = unit/3; const thin = full*0.1;
          const pxb = (x<=1) ? (0 + thin/2) : (unit - thin/2);
          meshZ.position.set(pxb, unit/2, unit/2);
        }
        group.add(meshZ);
      }
    }
  }
  return group;
}

export default { rotateYOnce, rotateY, detectTile, parseVoxelGridToTiles, buildTileMesh };