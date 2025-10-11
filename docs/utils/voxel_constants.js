// voxel_constants.js
// SINGLE SOURCE OF TRUTH for voxel semantics and tile roles.
// IMPORTANT (confirmed):
//   0 = EMPTY  (walkable / air)
//   1 = SOLID  (wall / floor / ceiling mass)
//   2 = STAIR  (special traversable element)
// Never redefine or invert these meanings elsewhere. All rendering,
// editing, export and WFC integration MUST reference VOXEL.* values.
// All code must treat these semantics as authoritative; any data migration
// should occur before reaching voxel interpretation.

export const VOXEL = Object.freeze({
  EMPTY: 0,
  SOLID: 1,
  STAIR: 2
});

// Layer indices in the canonical 3x3x3 representation
export const LAYERS = Object.freeze({
  FLOOR: 0,
  MID: 1,
  CEILING: 2
});

// High-level intended tile roles (extensible)
export const TILE_ROLE = Object.freeze({
  ROOM: 'room',
  CORRIDOR: 'corridor',
  STAIR: 'stair',
  JUNCTION: 'junction',
  DEAD_END: 'dead_end'
});

// Material semantic kinds (used for userData tagging / theming later)
export const MATERIAL_KIND = Object.freeze({
  FLOOR: 'floor',
  WALL: 'wall',
  CEILING: 'ceiling',
  STAIR: 'stair',
  DEBUG: 'debug'
});

// Utility guards
export function isVoxelValue(v){
  return v === VOXEL.EMPTY || v === VOXEL.SOLID || v === VOXEL.STAIR;
}

// Human readable meaning helper (used by tests / UI tooltips)
export function getVoxelMeaning(v){
  switch(v){
    case VOXEL.EMPTY: return 'empty';
    case VOXEL.SOLID: return 'solid';
    case VOXEL.STAIR: return 'stair';
    default: return 'unknown';
  }
}
