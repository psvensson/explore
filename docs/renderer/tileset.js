/**
 * tileset.js
 * Strict 3x3x3 voxel tileset for an NDWFC3D system.
 *
 * FAIL-FAST PHILOSOPHY:
 *  This module intentionally does NOT attempt graceful degradation. If the required
 *  global API is missing it will throw immediately so issues surface early instead
 *  of manifesting as subtle generation bugs later.
 *
 * REQUIRED GLOBAL:
 *  A function `NDWFC3D(proto)` provided by `ndwfc-tools.js` / `ndwfc.js` that
 *  registers a prototype tile. Load those scripts BEFORE this file.
 *
 * TILE FORMAT:
 *  Each tile defined by 3 layers (z=0..2) of 3 strings (y rows) of length 3 (x cols).
 *  Characters: 0 = empty, 1 = solid, 2 = stair/special.
 *
 * TRANSFORMS:
 *  Array of rotation sequences using tokens like ry, rx, rz joined with '+'.
 *  These are passed through verbatim to NDWFC3D which is responsible for applying
 *  the canonical transform semantics.
 */

// Stored prototype indices (parallel to order of definition) – external systems can read these.
export const protoTileIds = [];

// Raw prototype definitions for potential introspection / debugging.
export const tilePrototypes = [];

/**
 * Convert layer triplets (array of 3 layers, each layer an array of 3 strings) into a 3D numeric array.
 * layers[z][y][x] => number.
 */
function layersToVoxels(layers) {
  if (layers.length !== 3) throw new Error('Expected exactly 3 z-layers');
  return layers.map((layer, z) => {
    if (layer.length !== 3) throw new Error(`Layer z=${z} must have 3 rows`);
    return layer.map((row, y) => {
      if (row.length !== 3) throw new Error(`Row length must be 3 (z=${z}, y=${y})`);
      return [...row].map((ch, x) => {
        if (!/[0-2]/.test(ch)) throw new Error(`Invalid voxel char '${ch}' at (${x},${y},${z})`);
        return Number(ch);
      });
    });
  });
}

function commitTilePrototype(proto) {
  // Assume NDWFC3D global function is loaded (no defensive checks per project policy)
  NDWFC3D(proto);
}

/**
 * createTileFormLayers (name kept as requested) – create/register a tile prototype from textual layers.
 * @param {string[][]} layers - 3 layers (z0,z1,z2), each an array of 3 strings of length 3.
 * @param {number} tileId - semantic tile group identifier.
 * @param {Object} options
 * @param {string[]} options.transforms - list of transform sequences ("", "ry", "ry+ry", etc.)
 * @returns {number} prototype index
 */
export function createTileFormLayers(layers, tileId, { transforms = [], meta = {} } = {}) {
  const voxels = layersToVoxels(layers);
  const protoIndex = protoTileIds.length;
  const proto = {
    id: protoIndex,          // internal prototype id
    tileId,                  // logical tile type id (used by higher-level grammar)
    voxels,                  // 3x3x3 numeric array
    size: [3,3,3],
    transforms,              // transform descriptors passed through to NDWFC3D
    meta                     // arbitrary metadata (e.g., stairRole: 'lower' | 'upper')
  };
  protoTileIds.push(protoIndex);
  tilePrototypes.push(proto);
  commitTilePrototype(proto);
  return protoIndex;
}

// Provide the shorter alias used in the user definition examples.
export const addTileFromLayers = createTileFormLayers;

/**
 * Initialize and register all tiles defined in this tileset. Safe to call multiple times; it will
 * skip re-adding if already populated.
 */
export function initializeTileset() {
  if (tilePrototypes.length > 0) return; // idempotent guard

  // Empty space (no transforms)
  addTileFromLayers([
    ["000","000","000"],
    ["000","000","000"],
    ["000","000","000"]
  ], 0, { transforms: [] });

  // Empty with floor (tileId=1, no transforms)
  const emptyWithFloorProtoIdx = protoTileIds.length;
  addTileFromLayers([
    [ "111",
      "111",
      "111"],
    [ "000",
      "000",
      "000"],
    [ "111",
      "111",
      "111"]
  ], 1, { transforms: [] });

  // Solid cube (tileId=1, no transforms)
  const solidProtoIdx = protoTileIds.length;
  addTileFromLayers([
    ["111","111","111"],
    ["111","111","111"],
    ["111","111","111"]
  ], 1, { transforms: [] });

  // Straight corridor (Y rotations only)
  addTileFromLayers([
    [ "111",
      "111",
      "111"],
    [ "111",
      "000",
      "111"],
    [ "111",
      "111",
      "111"]
  ], 0, { transforms: ["ry","ry+ry","ry+ry+ry"] });

  // Corner (Y rotations only)
  addTileFromLayers([
    [ "111",
      "111",
      "111"],
    [ "111",
      "100",
      "100"],
    [ "111",
      "111",
      "111"]
  ], 0, { transforms: ["ry","ry+ry","ry+ry+ry"] });

  // Inverted corner (Y rotations only)
  addTileFromLayers([
    [ "111",
      "111",
      "111"],
    [ "111",
      "100",
      "000"],
    [ "111",
      "111",
      "111"]
  ], 0, { transforms: ["ry","ry+ry","ry+ry+ry"] });

  // Directional stair tiles (no rotations; explicit variants for +/- along each axis)
  addTileFromLayers([
    ["111","111","111"],
    ["111","020","010"],
    ["111","000","000"]
  ],31,{ transforms:[], meta:{ role:'stair', axis:'z', dir:1 }});
  addTileFromLayers([
    ["111","000","000"],
    ["111","020","010"],
    ["111","111","111"]
  ],32,{ transforms:[], meta:{ role:'stair', axis:'z', dir:-1 }});
  addTileFromLayers([
    ["111","101","111"],
    ["111","020","000"],
    ["111","000","000"]
  ],33,{ transforms:[], meta:{ role:'stair', axis:'x', dir:1 }});
  addTileFromLayers([
    ["111","000","000"],
    ["111","020","000"],
    ["111","101","111"]
  ],34,{ transforms:[], meta:{ role:'stair', axis:'x', dir:-1 }});


  // Dead-end corridor (Y rotations only)
  addTileFromLayers([
    [ "111",
      "111",
      "111"],
    [ "000",
      "000",
      "111"],
    [ "111",
      "111",
      "111"]
  ], 0, { transforms: ["ry","ry+ry","ry+ry+ry"] });

  // T-junction (Y rotations only)
  addTileFromLayers([
    [ "111",
      "111",
      "111"],
    [ "111",
      "000",
      "101"],
    [ "111",
      "111",
      "111"]
  ], 0, { transforms: ["ry","ry+ry","ry+ry+ry"] });

  // Cross-junction (no transforms needed, symmetric)
  addTileFromLayers([
    [ "111",
      "111",
      "111"],
    [ "101",
      "000",
      "101"],
    [ "111",
      "111",
      "111"]
  ], 0, { transforms: [] });

  // Open landing tile (tileId 50) for stair forward clear volume: solid floor (y=0), empty mid (y=1), open top (y=2)
  addTileFromLayers([
    ["111","000","000"],
    ["111","000","000"],
    ["111","000","000"],
  ],50,{ transforms:["ry","ry+ry","ry+ry+ry"] });

  return { emptyWithFloorProtoIdx, solidProtoIdx };
}

// Auto-initialize only if running in browser AND NDWFC3D already present.
// This preserves fail-fast during actual usage while allowing tests to
// import the module, then define NDWFC3D, then call initializeTileset manually.
if (typeof window !== 'undefined' && typeof NDWFC3D === 'function') {
  initializeTileset();
}

export default {
  initializeTileset,
  createTileFormLayers,
  addTileFromLayers,
  protoTileIds,
  tilePrototypes
};

// Test-only utility (not for production use). Allows Jest tests to clear state between cases.
export function _resetTilesetForTests() {
  tilePrototypes.length = 0;
  protoTileIds.length = 0;
}
