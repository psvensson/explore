// wfc_tile_mesh.js
// Utilities to interpret a voxel-level WFC output grid in 3x3x3 chunks,
// detect which registered tiles (with Y-rotations) they correspond to,
// and build simple Three.js meshes for visualization.

import { tilePrototypes } from '../dungeon/tileset.js';
import { makeGeometryFactory, makeMaterialFactory, isAllSolid, buildStairs, getMaterialCache } from './mesh_factories.js';
// New (non-breaking) optional modules
import { dbg } from '../utils/debug_log.js';
import { buildFloor, buildCeiling, buildSolidCube } from './mesh_geometry_builders.js';
import { 
  voxelToWorldCenter, 
  getStandardCubeDimensions 
} from '../utils/voxel-to-world.js';
// Pluggable mesh generator system
import { getActiveMeshGenerator } from './mesh-generators/index.js';

// --- Rotation Helpers (Y axis only, matching tileset usage) ---
export function rotateYOnce(vox){
  // vox[z][y][x]; +90 deg about Y maps (x,z) -> (z, 2-x) keeping y
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
function placeNonWall(ctx){
  const {THREE, unit, group, geomKind, material, x, y, z, overrideWidth, overrideDepth}=ctx;
  
  // Use canonical coordinate system from voxel-to-world.js
  if(geomKind === 'floor'){
    const mesh = buildFloor({ THREE, unit, x, y, z, material });
    // Apply overrides if specified (for optimized empty room rendering)
    if (overrideWidth || overrideDepth) {
      const w = overrideWidth || unit;
      const d = overrideDepth || unit;
      const h = unit * 0.1;
      mesh.geometry = new THREE.BoxGeometry(w, h, d);
    }
    group.add(mesh);
  }
  else if(geomKind === 'ceiling'){
    const mesh = buildCeiling({ THREE, unit, x, y, z, material });
    // Apply overrides if specified (for optimized empty room rendering)
    if (overrideWidth || overrideDepth) {
      const w = overrideWidth || unit;
      const d = overrideDepth || unit;
      const h = unit * 0.1;
      mesh.geometry = new THREE.BoxGeometry(w, h, d);
    }
    group.add(mesh);
  }
  else {
    // Other geometry types (legacy support)
    const {getGeometry} = ctx;
    const geometry = getGeometry(geomKind);
    const mesh = new (THREE.Mesh||function(){return {position:{set(){}}}})(geometry, material);
    if(mesh.position) {
      const pos = voxelToWorldCenter(x, y, z, unit);
      mesh.position.set(pos.x, pos.y, pos.z);
    }
    group.add(mesh);
  }
}
function emitWalls(ctx){ 
  const {THREE, unit, emitX, emitZ, material, x, y, z, group}=ctx;
  
  // Use canonical coordinate system: render wall as single full standard cube
  // The emitX/emitZ flags indicate wall orientation but we only need one cube per voxel
  if(emitX || emitZ) {
    const wallMesh = buildSolidCube({ THREE, unit, x, y, z, material });
    group.add(wallMesh);
  }
}
function processVoxels(ctx){
  const {vox,unit,hasStairs,hasStairBelow,hasStairAbove,materials,group, isEmptyRoom, THREE, getGeometry}=ctx;

  // OPTIMIZATION: For empty rooms, just add a single floor and ceiling plane and we're done.
  if (isEmptyRoom) {
    // Create a single 3x1x3 floor plane at center voxel (1, 0, 1)
    placeNonWall({
      THREE, unit,
      geomKind: 'floor',
      material: materials.floor,
      x: 1, y: 0, z: 1, // Center of the 3x3 tile
      overrideWidth: unit,
      overrideDepth: unit,
      group
    });

    // Create a single 3x1x3 ceiling plane at center voxel (1, 2, 1)
    placeNonWall({
      THREE, unit,
      geomKind: 'ceiling',
      material: materials.ceiling,
      x: 1, y: 2, z: 1, // Center of the 3x3 tile
      overrideWidth: unit,
      overrideDepth: unit,
      group
    });
    return;
  }

  for (let z = 0; z < 3; z++) {
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        // Skip EMPTY voxels - they represent traversable air/space
        if (vox[z][y][x] === 0) continue;
        
        if (skipVoxel({ y, hasStairs, hasStairBelow, hasStairAbove })) continue;
        
  const isWall = y === 1;
  if (isWall) {
          // Render ALL solid wall voxels as individual cubes (no collapsing/optimization)
          // This ensures solid voxels = geometry, empty voxels = traversable space
          dbg('TileMesh:solidWallVoxel', { x, y, z });
          const wallMesh = buildSolidCube({ THREE, unit, x, y, z, material: materials.wall });
          group.add(wallMesh);
        } else {
          const geomKind = (y === 0) ? 'floor' : 'ceiling';
          const material = (y === 0) ? materials.floor : materials.ceiling;
          placeNonWall({ THREE, unit, geomKind, material, x, y, z, group });
        }
      }
    }
  }
}
export function buildTileMesh({THREE, prototypeIndex, rotationY=0, unit=1, hasStairBelow=false, hasStairAbove=false, prototypes=null, useLegacyRenderer=false}={}){
  if(!THREE) throw new Error('THREE dependency missing'); 
  
  // Use passed prototypes or fall back to global tilePrototypes for backward compatibility
  const protoArray = prototypes || tilePrototypes;
  const proto=protoArray[prototypeIndex]; 
  if(!proto) {
    console.error('[WFC_MESH] Invalid prototype index:', prototypeIndex, 'tilePrototypes:', tilePrototypes);
    throw new Error('Invalid prototype index');
  } 
  const vox=rotateY(proto.voxels, rotationY); 
  const cache=getMaterialCache(THREE); 
  
  // An "empty room" is a tile with no solid voxels, but is not intended to be empty space.
  // It should have a floor and ceiling. We identify it by its prototype metadata.
  const isEmptyRoom = proto.meta && proto.meta.role === 'room' && proto.voxels.flat(2).every(v => v === 0);

  // NEW: Try using pluggable mesh generator if available (unless legacy mode forced)
  // Guard: only use in browser and not under Jest; guard process access in browsers
  if (!useLegacyRenderer && typeof window !== 'undefined' && !(typeof process !== 'undefined' && process.env && process.env.JEST_WORKER_ID)) {
    try {
      const generator = getActiveMeshGenerator();
      if (generator) {
        // Use mesh generator for tile rendering
        return generator.generateTileMesh(vox, {
          unit,
          hasStairBelow,
          hasStairAbove,
          isEmptyRoom
        });
      }
    } catch (err) {
      // Fall back to legacy renderer if generator not initialized or fails
      if (window.__DEBUG_MESH_GENERATORS__) {
        console.warn('[WFC_MESH] Mesh generator not available, using legacy renderer:', err.message);
      }
    }
  }

  // LEGACY: Original rendering code (preserved for backward compatibility and stairs)
  if(isAllSolid(vox)) return solidGroup(THREE,unit,cache);
  const group=new (THREE.Group||function(){this.children=[];this.add=o=>this.children.push(o);})(); 
  const getGeometry=makeGeometryFactory(THREE,unit); 
  const mat=makeMaterialFactory(THREE); 
  const materials={ floor:mat('floor',0x333333,'floor'), mid:mat('mid',0x555555,'mid'), ceiling:mat('ceiling',0x888888,'ceiling'), stair:mat('stair',0x777777,'stair'), wall:mat('wall',0x606060,'wall') };
  const dirInfo=stairDir(proto, vox); 
  buildStairs({THREE,group,dirInfo,unit,stairMat:materials.stair}); 
  processVoxels({THREE,vox,unit,hasStairs:!!dirInfo,hasStairBelow,hasStairAbove,materials,group,getGeometry, isEmptyRoom}); 
  return group; 
}

// Add utility function for coordinate system conversion (for testing and external use)
export function convertStructureToMesh(structure, material, tileSize = 1) {
  if (!structure || !Array.isArray(structure)) {
    console.warn('[TileMesh] Invalid structure provided');
    if (typeof THREE !== 'undefined') {
      return new THREE.Group();
    }
    return { children: [], add: function() {} }; // Mock for testing
  }

  const Group = (typeof THREE !== 'undefined') ? THREE.Group : class { constructor() { this.children = []; } add(child) { this.children.push(child); } };
  const Mesh = (typeof THREE !== 'undefined') ? THREE.Mesh : class { constructor(geometry, material) { this.geometry = geometry; this.material = material; this.position = { x: 0, y: 0, z: 0, set: function(x, y, z) { this.x = x; this.y = y; this.z = z; } }; } };
  const BoxGeometry = (typeof THREE !== 'undefined') ? THREE.BoxGeometry : class { constructor() {} };

  const group = new Group();
  const cubeGeometry = new BoxGeometry(tileSize, tileSize, tileSize);

  // COORDINATE SYSTEM CONVERSION:
  // Tileset format: structure[layer][row][col] where layer=Y, row=Z, col=X
  // Three.js expects: position.set(x, y, z)
  // Correct mapping: structure[y][z][x] → position.set(x, y, z)
  
  for (let layer = 0; layer < structure.length; layer++) {          // Y-axis (height/up)
    if (!Array.isArray(structure[layer])) continue;
    
    for (let row = 0; row < structure[layer].length; row++) {       // Z-axis (depth/forward)
      if (!Array.isArray(structure[layer][row])) continue;
      
      for (let col = 0; col < structure[layer][row].length; col++) { // X-axis (width/right)
        if (structure[layer][row][col] === 1) {
          const cube = new Mesh(cubeGeometry, material);
          
          // Position mapping: [layer][row][col] → (col, layer, row) → (x, y, z)
          cube.position.set(
            col * tileSize,    // X = col (width coordinate)
            layer * tileSize,  // Y = layer (height coordinate) 
            row * tileSize     // Z = row (depth coordinate)
          );
          
          group.add(cube);
        }
      }
    }
  }

  return group;
}

// Export functions for testing and external use
export default { rotateYOnce, rotateY, detectTile, parseVoxelGridToTiles, buildTileMesh, convertStructureToMesh };
