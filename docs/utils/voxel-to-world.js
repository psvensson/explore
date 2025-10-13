// voxel-to-world.js
// Canonical voxel-to-world coordinate conversion
// 
// This module provides the SINGLE SOURCE OF TRUTH for converting voxel grid indices
// to Three.js world coordinates. All mesh builders should use these functions to ensure
// consistent positioning and dimensions across the entire application.
//
// COORDINATE SYSTEM:
// - Voxel indices: [x, y, z] where each ranges from 0-2 for a 3×3×3 tile
// - World coords: THREE.js positions centered on origin
//   - x: -unit, 0, +unit (left to right)
//   - y: computed via contiguous layer layout (see getLayerMetrics)
//   - z: -unit, 0, +unit (front to back)

const FLOOR_THICKNESS_RATIO = 0.1;
const CEILING_THICKNESS_RATIO = 0.1;

// Layout mode: 'canonical' (default) or 'equalThirds'.
// - canonical: thin floor/ceiling based on FLOOR_THICKNESS_RATIO / CEILING_THICKNESS_RATIO
// - equalThirds: three equal-height layers within a single tile height (uniform boxes per layer)
let __LAYER_LAYOUT_MODE__ = 'canonical';

export function setLayerLayoutMode(mode) {
  const allowed = ['canonical', 'equalThirds'];
  if (!allowed.includes(mode)) {
    console.warn(`[voxel-to-world] Unsupported layer layout mode '${mode}', keeping '${__LAYER_LAYOUT_MODE__}'`);
    return;
  }
  __LAYER_LAYOUT_MODE__ = mode;
  // Mirror to window for convenient inspection in browser devtools
  if (typeof window !== 'undefined') {
    window.__LAYER_LAYOUT_MODE__ = mode;
  }
}

export function getLayerLayoutMode() {
  return __LAYER_LAYOUT_MODE__;
}

function computeLayerLayout(unit) {
  // Mode: equalThirds -> three equal-height layers that sum to one tile height (unit)
  // This makes floor/middle/ceiling uniform box heights within a tile.
  if (__LAYER_LAYOUT_MODE__ === 'equalThirds') {
    const one = unit / 3;
    const bases = [0, one, 2 * one];
    const thicknesses = [one, one, one];
    return { bases, thicknesses };
  }

  // Default canonical mode (thin floor/ceiling)
  const minThickness = Math.max(unit * 0.02, 1e-6);
  let floorThickness = Math.max(unit * FLOOR_THICKNESS_RATIO, minThickness);
  let ceilingThickness = Math.max(unit * CEILING_THICKNESS_RATIO, minThickness);
  let middleThickness = unit - floorThickness - ceilingThickness;

  if (middleThickness <= minThickness) {
    // Ensure the middle layer always has positive height. If ratios are too large
    // (for very small `unit` values), proportionally reduce the floor/ceiling thickness.
    const deficit = minThickness - middleThickness;
    middleThickness = minThickness;
    const reduction = deficit / 2;
    floorThickness = Math.max(floorThickness - reduction, minThickness);
    ceilingThickness = Math.max(ceilingThickness - reduction, minThickness);
  }

  const bases = [0, floorThickness, floorThickness + middleThickness];
  const thicknesses = [floorThickness, middleThickness, ceilingThickness];

  return { bases, thicknesses };
}

export function getLayerMetrics(layerIndex, unit = 3) {
  const idx = Math.max(0, Math.min(2, layerIndex));
  const { bases, thicknesses } = computeLayerLayout(unit);
  const base = bases[idx];
  const thickness = thicknesses[idx];
  return {
    base,
    thickness,
    center: base + thickness / 2,
    top: base + thickness
  };
}

/**
 * Convert voxel indices to world coordinates
 * @param {number} x - Voxel x index (0-2, column)
 * @param {number} y - Voxel y index (0-2, layer/height)
 * @param {number} z - Voxel z index (0-2, row/depth)
 * @param {number} unit - Scale unit (default: 3)
 * @returns {Object} World coordinates {x, y, z}
 */
export function voxelToWorld(x, y, z, unit = 3) {
  const metrics = getLayerMetrics(y, unit);
  return {
    x: (x - 1) * unit,  // Maps [0,1,2] → [-unit, 0, +unit]
    y: metrics.base,
    z: (z - 1) * unit   // Maps [0,1,2] → [-unit, 0, +unit]
  };
}

/**
 * Get world position for center of a voxel cube
 * Accounts for the fact that THREE.js geometry centers are at (0,0,0) within the geometry
 * @param {number} x - Voxel x index (0-2)
 * @param {number} y - Voxel y index (0-2)
 * @param {number} z - Voxel z index (0-2)
 * @param {number} unit - Scale unit (default: 3)
 * @returns {Object} World coordinates {x, y, z} for cube center
 */
export function voxelToWorldCenter(x, y, z, unit = 3) {
  const base = voxelToWorld(x, y, z, unit);
  const metrics = getLayerMetrics(y, unit);
  return {
    x: base.x,
    y: metrics.center,
    z: base.z
  };
}

/**
 * Get world position for floor plane at voxel position
 * Floor planes are thin (height = unit * 0.1) and sit at y=0 of the voxel
 * @param {number} x - Voxel x index (0-2)
 * @param {number} y - Voxel y index (0-2)
 * @param {number} z - Voxel z index (0-2)
 * @param {number} unit - Scale unit (default: 3)
 * @returns {Object} World coordinates {x, y, z} for floor center
 */
export function voxelToWorldFloor(x, y, z, unit = 3) {
  const base = voxelToWorld(x, y, z, unit);
  const metrics = getLayerMetrics(y, unit);
  return {
    x: base.x,
    y: metrics.center,
    z: base.z
  };
}

/**
 * Get world position for ceiling plane at voxel position
 * Ceiling planes are thin (height = unit * 0.1) and sit at top of voxel
 * @param {number} x - Voxel x index (0-2)
 * @param {number} y - Voxel y index (0-2)
 * @param {number} z - Voxel z index (0-2)
 * @param {number} unit - Scale unit (default: 3)
 * @returns {Object} World coordinates {x, y, z} for ceiling center
 */
export function voxelToWorldCeiling(x, y, z, unit = 3) {
  const base = voxelToWorld(x, y, z, unit);
  const metrics = getLayerMetrics(y, unit);
  return {
    x: base.x,
    y: metrics.center,
    z: base.z
  };
}

/**
 * Get standard cube dimensions
 * All cubes (walls, solid blocks) should use these dimensions
 * @param {number} unit - Scale unit (default: 3)
 * @returns {Object} Dimensions {width, height, depth}
 */
export function getStandardCubeDimensions(unit = 3, layerIndex = 1) {
  const metrics = getLayerMetrics(layerIndex, unit);
  return {
    width: unit,
    height: metrics.thickness,
    depth: unit
  };
}

/**
 * Get standard floor/ceiling plane dimensions
 * @param {number} unit - Scale unit (default: 3)
 * @returns {Object} Dimensions {width, height, depth}
 */
export function getStandardPlaneDimensions(unit = 3, layerIndex = 0) {
  const metrics = getLayerMetrics(layerIndex, unit);
  return {
    width: unit,
    height: metrics.thickness,
    depth: unit
  };
}

/**
 * Convert world coordinates back to voxel indices (inverse operation)
 * @param {number} wx - World x coordinate
 * @param {number} wy - World y coordinate
 * @param {number} wz - World z coordinate
 * @param {number} unit - Scale unit (default: 3)
 * @returns {Object} Voxel indices {x, y, z}
 */
export function worldToVoxel(wx, wy, wz, unit = 3) {
  const { bases, thicknesses } = computeLayerLayout(unit);
  const thresholds = [
    bases[0] + thicknesses[0],
    bases[1] + thicknesses[1]
  ];
  let yIndex = 2;
  if (wy < thresholds[0]) {
    yIndex = 0;
  } else if (wy < thresholds[1]) {
    yIndex = 1;
  }

  return {
    x: Math.round(wx / unit + 1),  // Maps [-unit, 0, +unit] → [0, 1, 2]
    y: yIndex,
    z: Math.round(wz / unit + 1)   // Maps [-unit, 0, +unit] → [0, 1, 2]
  };
}
