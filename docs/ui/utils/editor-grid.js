// editor-grid.js
// Canonical grid stride and helpers for the Map Editor.
// Single source of truth so overlay, state, and renderer agree on mapping.

import { TILE_SIZE } from '../../renderer/constants.js';

 // One tile is a 3x3x3 voxel block with unit = TILE_SIZE.
 // Horizontal stride per tile cell (X/Z) spans full 3 voxels:
 export const CELL_STRIDE_XZ = TILE_SIZE * 3;

// Vertical stride per layer (Y) uses one tile-height stack:
export const LAYER_STRIDE_Y = TILE_SIZE * 3;

// Convert grid (tile indices) to world coordinates
export function gridIndexToWorld(ix, iy, iz) {
  return {
    x: ix * CELL_STRIDE_XZ,
    y: iy * LAYER_STRIDE_Y,
    z: iz * CELL_STRIDE_XZ
  };
}

// Convert world coordinates to grid (tile indices)
export function worldToGridIndex(wx, wy, wz) {
  return {
    x: Math.round(wx / CELL_STRIDE_XZ),
    y: Math.round(wy / LAYER_STRIDE_Y),
    z: Math.round(wz / CELL_STRIDE_XZ)
  };
}
