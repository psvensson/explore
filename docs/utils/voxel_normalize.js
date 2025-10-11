// voxel_normalize.js
// Normalization helpers: convert various structure formats to canonical voxels[z][y][x]
// without changing existing behaviors. This is a NON-BREAKING introduction layer.

import { VOXEL, LAYERS } from './voxel_constants.js';
import { VoxelCoordinateConverter } from './voxel-coordinates.js';

/**
 * Determine if data already looks like canonical voxels[z][y][x].
 */
function isThreeLayerNumeric(struct){
  return Array.isArray(struct) &&
    struct.length === 3 &&
    struct.every(layer => Array.isArray(layer) && layer.length === 3 &&
      layer.every(row => Array.isArray(row) || typeof row === 'string'));
}

/**
 * Determine if this is a 2D pattern (TileStructures style): [[row],[row],[row]] numeric.
 */
function is2DPattern(struct){
  return Array.isArray(struct) && struct.length === 3 &&
    struct.every(row => Array.isArray(row) && row.length === 3 && row.every(v => typeof v === 'number'));
}

// Historical wrapped 2D format: [ [ [row],[row],[row] ] ] (extra wrapper array of length 1)
function isWrapped2DPattern(struct){
  return Array.isArray(struct) && struct.length === 1 && is2DPattern(struct[0]);
}

/**
 * Determine if this is a 3-layer string representation: [layer0, layer1, layer2], each layer: ["010","111","000"].
 */
function isThreeLayerString(struct){
  return Array.isArray(struct) && struct.length === 3 &&
    struct.every(layer => Array.isArray(layer) && layer.length === 3 &&
      layer.every(row => typeof row === 'string' && row.length === 3));
}

/**
 * Deep clone using JSON (sufficient for small numeric/string arrays here).
 */
/**
 * Convert 3-layer string form -> canonical numeric voxels[z][y][x].
 */
function threeLayerStringToVoxels(layers){
  const numericLayers = layers.map(layer =>
    layer.map(row => typeof row === 'string' ? row.split('') : row)
  );
  const flat = VoxelCoordinateConverter.structureToFlat(numericLayers);
  return VoxelCoordinateConverter.flatToVoxel3D(flat);
}

/**
 * Convert a 2D pattern (interpreted as the MID layer floorplan) into canonical voxels.
 * We supply solid floor & ceiling (consistent with existing generation assumptions).
 * 0 = empty, 1 = solid, 2 = stair (passed through as-is if encountered).
 */
function twoDPatternToVoxels(pattern){
  const vox = [];
  for (let z=0; z<3; z++){
    vox[z] = [];
    for (let y=0; y<3; y++){
      vox[z][y] = [];
      for (let x=0; x<3; x++){
        if (y === LAYERS.FLOOR || y === LAYERS.CEILING){
          // Preserve existing assumption: floor & ceiling are solid mass
          vox[z][y][x] = VOXEL.SOLID;
        } else {
          vox[z][y][x] = pattern[z][x];
        }
      }
    }
  }
  return vox;
}

/**
 * Public normalization entry point. Returns canonical voxels[z][y][x].
 * Non-destructive: never mutates input.
 */
function convertLayeredToCanonical(struct){
  const flat = VoxelCoordinateConverter.structureToFlat(struct);
  return VoxelCoordinateConverter.flatToVoxel3D(flat);
}

export function normalizeToCanonical(struct){
  if (!struct) throw new Error('[normalizeToCanonical] Missing structure');
  if (isThreeLayerString(struct)) return threeLayerStringToVoxels(struct);
  if (isThreeLayerNumeric(struct)) return convertLayeredToCanonical(struct);
  if (is2DPattern(struct)) return twoDPatternToVoxels(struct);
  if (isWrapped2DPattern(struct)) return twoDPatternToVoxels(struct[0]);
  // Fallback: attempt shallow numeric flatten (if user passed single array of length 27)
  if (Array.isArray(struct) && struct.length === 27){
    console.log('[normalizeToCanonical] Processing flat 27-element array');
    console.log('[normalizeToCanonical] Non-zero elements:', struct.filter(v => v !== 0).length);
    const vox=[]; let i=0;
    for (let z=0; z<3; z++){
      vox[z]=[];
      for (let y=0; y<3; y++){
        vox[z][y]=[];
        for (let x=0; x<3; x++) vox[z][y][x] = struct[i++] || 0;
      }
    }
    console.log('[normalizeToCanonical] Converted to z-major, checking vox[1][1] (mid-layer mid-row):', vox[1][1]);
    return vox;
  }
  console.warn('[normalizeToCanonical] Unrecognized structure format, returning empty solid cube');
  return Array.from({length:3},(_,z)=>Array.from({length:3},(_,y)=>Array.from({length:3},(_,x)=>VOXEL.EMPTY)));
}
