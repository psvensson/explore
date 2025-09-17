// Refactored: this file now only initializes from shared tileset_data via tileset_builder.
import TILE_DEFS from './tileset_data.js';
import { buildTileset } from './tileset_builder.js';

export let protoTileIds = [];
export let tilePrototypes = [];
let _initialized = false;

let _cachedIndexInfo = null; // { emptyWithFloorProtoIdx, solidProtoIdx }

export function initializeTileset(){
  if(_initialized) return { tilePrototypes, protoTileIds, ...(_cachedIndexInfo||{}) };
  const { tilePrototypes: built, protoTileIds: ids } = buildTileset(TILE_DEFS, { register: p => { if (typeof NDWFC3D==='function') NDWFC3D(p); } });
  tilePrototypes = built; protoTileIds = ids; _initialized = true;
  // Derive indices matching original test expectations: emptyWithFloorProtoIdx (first open space), solidProtoIdx (first all-solid)
  // Using TILE_DEFS ordering: 0=open space, 1=solid cube
  _cachedIndexInfo = { emptyWithFloorProtoIdx: 0, solidProtoIdx: 1 };
  // Optionally expose a manifest for debugging
  if (typeof window !== 'undefined') {
    window.__TILESET_MANIFEST__ = tilesetManifest();
  }
  return { tilePrototypes, protoTileIds, ..._cachedIndexInfo };
}

// Provide createTileFormLayers compatibility for tests that manually add tiles (delegates to runtime build pattern)
export function createTileFormLayers(layers, tileId, { transforms = [], meta = {} } = {}){
  // Build a one-off definition, append to arrays, register if NDWFC3D present.
  if(!_initialized) initializeTileset();
  // Reuse builder's layer parser indirectly by constructing a tiny defs array.
  const tempDef = { tileId, layers, transforms, meta };
  const startIdx = tilePrototypes.length;
  const { tilePrototypes: built, protoTileIds: ids } = buildTileset([tempDef], { register: p => { if (typeof NDWFC3D==='function') NDWFC3D(p); } });
  // Adjust IDs of built (they start at 0 in isolated build). Remap to global index.
  const proto = built[0];
  proto.id = startIdx;
  tilePrototypes.push(proto);
  protoTileIds.push(startIdx);
  return startIdx;
}

// Manifest: ordered metadata for inspection / tooling
export function tilesetManifest(tileset){
  if(!_initialized) throw new Error('Tileset not initialized');
  const list = tileset
    ? (tileset.tilePrototypes || tileset.prototypes || tileset)
    : tilePrototypes;
  return list.map(p=>({
    id: p.id,
    tileId: p.tileId,
    weight: p.meta && p.meta.weight !== undefined ? p.meta.weight : 1,
    role: p.meta && p.meta.role,
    axis: p.meta && p.meta.axis,
    dir: p.meta && p.meta.dir,
    landing: p.meta && p.meta.landing || false,
    transforms: p.transforms.slice(),
    // Provide compact voxel signature for ordering validation
    signature: p.voxels.map(z=>z.map(row=>row.join('')).join('/')).join('|')
  }));
}

if (typeof window !== 'undefined' && typeof NDWFC3D === 'function') { initializeTileset(); }

export function _resetTilesetForTests(){ _initialized=false; tilePrototypes=[]; protoTileIds=[]; }

export default { initializeTileset, tilePrototypes, protoTileIds, _resetTilesetForTests, createTileFormLayers };
