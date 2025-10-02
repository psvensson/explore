// voxel-coordinates.js
// Centralized voxel coordinate conversion utilities

/**
 * Utility class for converting between different voxel data formats
 * Handles conversions between flat arrays, 3D arrays, and prototype formats
 */
export class VoxelCoordinateConverter {
  
  /**
   * Convert flat voxel array to 3D voxel structure [z][y][x] format
   * This is the format expected by buildTileMesh in the main renderer
   * 
   * @param {Array<number>} flatData - Flat array of voxel values (27 elements for 3x3x3)
   * @param {Object} dimensions - Voxel grid dimensions (default: 3x3x3)
   * @returns {Array<Array<Array<number>>>} 3D array in [z][y][x] format
   */
  static flatToVoxel3D(flatData, dimensions = { x: 3, y: 3, z: 3 }) {
    const voxels = [];
    
    for (let z = 0; z < dimensions.z; z++) {
      voxels[z] = [];
      for (let y = 0; y < dimensions.y; y++) {
        voxels[z][y] = [];
        for (let x = 0; x < dimensions.x; x++) {
          // Flat index: y (layer) * 9 + z (row) * 3 + x (col)
          const flatIndex = y * (dimensions.x * dimensions.z) + z * dimensions.x + x;
          voxels[z][y][x] = flatData[flatIndex] || 0;
        }
      }
    }
    
    return voxels;
  }
  
  /**
   * Convert flat voxel array to WFC prototype format
   * Creates a prototype object suitable for buildTileMesh function
   * 
   * @param {Array<number>} flatData - Flat array of voxel values
   * @param {string} tileId - Optional tile identifier
   * @returns {Object} Prototype object with id and voxels in [z][y][x] format
   */
  static flatToPrototype(flatData, tileId = 'editor_preview') {
    const voxels = this.flatToVoxel3D(flatData);
    
    return {
      id: tileId,
      voxels: voxels
    };
  }
  
  /**
   * Convert structure data (nested arrays) to flat array
   * Handles the format used by tile structures: [[layer0], [layer1], [layer2]]
   * 
   * @param {Array<Array<number>>} structure - Structure data with layers
   * @returns {Array<number>} Flat array of voxel values
   */
  static structureToFlat(structure) {
    const flatData = [];
    
    if (!Array.isArray(structure)) {
      console.warn('[VoxelCoordinates] Invalid structure data, expected array');
      return new Array(27).fill(0);
    }
    
    // Flatten each layer into the flat array
    for (let layer = 0; layer < structure.length; layer++) {
      if (Array.isArray(structure[layer])) {
        flatData.push(...structure[layer]);
      }
    }
    
    // Ensure we have 27 elements (3x3x3)
    while (flatData.length < 27) {
      flatData.push(0);
    }
    
    return flatData.slice(0, 27); // Ensure exactly 27 elements
  }
  
  /**
   * Convert 3D voxel array [z][y][x] back to flat array
   * Inverse of flatToVoxel3D
   * 
   * @param {Array<Array<Array<number>>>} voxels3D - 3D voxel array
   * @returns {Array<number>} Flat array of voxel values
   */
  static voxel3DToFlat(voxels3D) {
    const flatData = [];
    const dimensions = {
      z: voxels3D.length,
      y: voxels3D[0]?.length || 0,
      x: voxels3D[0]?.[0]?.length || 0
    };
    
    for (let y = 0; y < dimensions.y; y++) {
      for (let z = 0; z < dimensions.z; z++) {
        for (let x = 0; x < dimensions.x; x++) {
          flatData.push(voxels3D[z][y][x] || 0);
        }
      }
    }
    
    return flatData;
  }
  
  /**
   * Get voxel value at specific coordinates from flat array
   * 
   * @param {Array<number>} flatData - Flat voxel array
   * @param {number} x - X coordinate (0-2)
   * @param {number} y - Y coordinate (0-2)
   * @param {number} z - Z coordinate (0-2)
   * @returns {number} Voxel value at coordinates
   */
  static getVoxelAt(flatData, x, y, z) {
    const flatIndex = y * 9 + z * 3 + x;
    return flatData[flatIndex] || 0;
  }
  
  /**
   * Set voxel value at specific coordinates in flat array
   * 
   * @param {Array<number>} flatData - Flat voxel array (modified in place)
   * @param {number} x - X coordinate (0-2)
   * @param {number} y - Y coordinate (0-2)
   * @param {number} z - Z coordinate (0-2)
   * @param {number} value - Voxel value to set
   */
  static setVoxelAt(flatData, x, y, z, value) {
    const flatIndex = y * 9 + z * 3 + x;
    if (flatIndex >= 0 && flatIndex < 27) {
      flatData[flatIndex] = value;
    }
  }
  
  /**
   * Create an empty flat voxel array
   * 
   * @param {number} fillValue - Value to fill array with (default: 0)
   * @returns {Array<number>} Empty 27-element array
   */
  static createEmpty(fillValue = 0) {
    return new Array(27).fill(fillValue);
  }
  
  /**
   * Validate voxel data format
   * 
   * @param {Array<number>} flatData - Flat voxel array to validate
   * @returns {boolean} True if valid, false otherwise
   */
  static validate(flatData) {
    if (!Array.isArray(flatData)) {
      console.warn('[VoxelCoordinates] Invalid voxel data: not an array');
      return false;
    }
    
    if (flatData.length !== 27) {
      console.warn('[VoxelCoordinates] Invalid voxel data: expected 27 elements, got', flatData.length);
      return false;
    }
    
    const allNumbers = flatData.every(v => typeof v === 'number');
    if (!allNumbers) {
      console.warn('[VoxelCoordinates] Invalid voxel data: contains non-numeric values');
      return false;
    }
    
    return true;
  }
  
  /**
   * Debug helper: print voxel structure as ASCII art
   * 
   * @param {Array<number>} flatData - Flat voxel array
   */
  static debugPrint(flatData) {
    console.log('[VoxelCoordinates] Voxel structure:');
    for (let y = 0; y < 3; y++) {
      console.log(`Layer Y=${y}:`);
      for (let z = 0; z < 3; z++) {
        let row = '  ';
        for (let x = 0; x < 3; x++) {
          const value = this.getVoxelAt(flatData, x, y, z);
          row += value ? '█' : '·';
          row += ' ';
        }
        console.log(row);
      }
    }
  }
}

// Node.js compatibility guard
if (typeof window !== 'undefined') {
  window.VoxelCoordinateConverter = VoxelCoordinateConverter;
  console.log('[VoxelCoordinates] Voxel coordinate utilities loaded');
}
