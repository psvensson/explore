/**
 * tileset.js
 * Defines a 3x3x3 voxel tileset for use with an NDWFC3D (3D Wave Function Collapse) system.
 *
 * Each tile is described by 3 layers (lowest Z first) of 3 strings (rows) containing digit characters.
 * Character legend (proposed – adjust to match ndwfc-tools.js spec):
 *  0 = empty / air
 *  1 = solid wall / floor
 *  2 = stair voxel (special)
 *
 * Transforms follow the NDWFC3D convention (strings composed of '+' separated primitive ops):
 *  rx, ry, rz  (90° rotations about X,Y,Z respectively)
 *  The sequence "ry+ry" means apply 180° about Y, etc.
 *
 * This file assumes a global (or imported) API provided by ndwfc-tools.js / ndwfc.js exposing
 * an object NDWFC3D with a method registerPrototype(proto) OR addTile / addFromVoxels.
 * Since the exact API surface is unknown at author time, we implement a light abstraction
 * that tries common method names. You should adapt the adapter inside commitTilePrototype()
 * to the actual ndwfc-tools.js API once integrated.
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

/**
 * Internal helper to actually register a prototype with NDWFC3D using a best-effort adapter.
 */
function commitTilePrototype(proto) {
  // Attempt different possible API shapes – adjust as needed once real API is known.
  const api = (typeof NDWFC3D !== 'undefined') ? NDWFC3D : null;
  if (!api) {
    // Defer: tile will still be listed in tilePrototypes; user can later loop and register.
    return;
  }
  if (typeof api.addTile === 'function') {
    api.addTile(proto); return;
  }
  if (typeof api.registerPrototype === 'function') {
    api.registerPrototype(proto); return;
  }
  if (typeof api.addFromVoxels === 'function') {
    api.addFromVoxels(proto.voxels, { id: proto.id, tileId: proto.tileId, transforms: proto.transforms });
    return;
  }
  // If none matched, log once.
  if (!commitTilePrototype.warned) {
    console.warn('NDWFC3D API shape not recognized – prototypes stored but not registered.');
    commitTilePrototype.warned = true;
  }
}

/**
 * createTileFormLayers (name kept as requested) – create/register a tile prototype from textual layers.
 * @param {string[][]} layers - 3 layers (z0,z1,z2), each an array of 3 strings of length 3.
 * @param {number} tileId - semantic tile group identifier.
 * @param {Object} options
 * @param {string[]} options.transforms - list of transform sequences ("", "ry", "ry+ry", etc.)
 * @returns {number} prototype index
 */
export function createTileFormLayers(layers, tileId, { transforms = [] } = {}) {
  const voxels = layersToVoxels(layers);
  const protoIndex = protoTileIds.length;
  const proto = {
    id: protoIndex,          // internal prototype id
    tileId,                  // logical tile type id (used by higher-level grammar)
    voxels,                  // 3x3x3 numeric array
    size: [3,3,3],
    transforms               // transform descriptors passed through to NDWFC3D
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
  if (tilePrototypes.length > 0) return; // already initialized

  // Empty space (no transforms)
  addTileFromLayers([
    ["000","000","000"],
    ["000","000","000"],
    ["000","000","000"]
  ], 0, { transforms: [] });

  // Empty with floor (tileId=1, no transforms)
  const emptyWithFloorProtoIdx = protoTileIds.length;
  addTileFromLayers([
    ["111","111","111"],
    ["000","000","000"],
    ["000","000","000"]
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
    ["111","111","111"],
    ["111","000","111"],
    ["111","000","111"]
  ], 0, { transforms: ["ry","ry+ry","ry+ry+ry"] });

  // Corner (Y rotations only)
  addTileFromLayers([
    ["111","111","111"],
    ["111","100","100"],
    ["111","100","100"]
  ], 0, { transforms: ["ry","ry+ry","ry+ry+ry"] });

  // Inverted corner (Y rotations only)
  addTileFromLayers([
    ["111","111","111"],
    ["111","100","000"],
    ["100","000","000"]
  ], 0, { transforms: ["ry","ry+ry","ry+ry+ry"] });

  // Stair tile (Y rotations only, stair-up)
  addTileFromLayers([
    ["111","111","111"], // z=0
    ["000","020","111"], // z=1
    ["000","000","000"]  // z=2
  ], 2, { transforms: ["ry","ry+ry","ry+ry+ry"] });

  // Stair tile mirrored (stair-up mirrored along X)
  addTileFromLayers([
    ["111","111","111"], // z=0
    ["111","020","000"], // z=1
    ["000","000","000"]  // z=2
  ], 2, { transforms: ["ry","ry+ry","ry+ry+ry"] });

  // Stair-down variant
  addTileFromLayers([
    ["000","000","000"], // z=0
    ["000","020","111"], // z=1
    ["111","111","111"]  // z=2
  ], 2, { transforms: ["ry","ry+ry","ry+ry+ry"] });

  // Stair-down mirrored
  addTileFromLayers([
    ["000","000","000"], // z=0
    ["111","020","000"], // z=1
    ["111","111","111"]  // z=2
  ], 2, { transforms: ["ry","ry+ry","ry+ry+ry"] });

  // Dead-end corridor (Y rotations only)
  addTileFromLayers([
    ["111","111","111"],
    ["111","000","111"],
    ["111","111","111"]
  ], 0, { transforms: ["ry","ry+ry","ry+ry+ry"] });

  // T-junction (Y rotations only)
  addTileFromLayers([
    ["111","111","111"],
    ["111","000","111"],
    ["111","100","111"]
  ], 0, { transforms: ["ry","ry+ry","ry+ry+ry"] });

  // Cross-junction (no transforms needed, symmetric)
  addTileFromLayers([
    ["111","111","111"],
    ["101","000","101"],
    ["111","111","111"]
  ], 0, { transforms: [] });

  return { emptyWithFloorProtoIdx, solidProtoIdx };
}

// Auto-initialize if running in browser so the tileset is ready.
if (typeof window !== 'undefined') {
  initializeTileset();
}

export default {
  initializeTileset,
  createTileFormLayers,
  addTileFromLayers,
  protoTileIds,
  tilePrototypes
};
