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
// renderer/tileset.js
// Re-export canonical dungeon tileset (definitions removed to prevent duplication).
export { initializeTileset, tilePrototypes, protoTileIds, _resetTilesetForTests } from '../dungeon/tileset.js';
export default { initializeTileset, tilePrototypes, protoTileIds };

