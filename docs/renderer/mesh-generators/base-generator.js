/**
 * BaseMeshGenerator - Abstract base class for mesh generation strategies
 * 
 * Defines the contract for all mesh generators that convert voxel structures
 * into Three.js meshes. Different generators can implement different visual
 * styles (cubic voxels, low-poly, smooth organic, etc.)
 * 
 * @abstract
 */
export class BaseMeshGenerator {
  /**
   * @param {Object} THREE - Three.js library reference
   * @param {Object} options - Generator-specific options
   */
  constructor(THREE, options = {}) {
    if (new.target === BaseMeshGenerator) {
      throw new Error('BaseMeshGenerator is abstract and cannot be instantiated directly');
    }
    
    this.THREE = THREE;
    this.options = { ...this.getDefaultOptions(), ...options };
  }

  /**
   * Get default options for this generator
   * @returns {Object} Default options
   */
  getDefaultOptions() {
    return {
      unit: 1,
      wallColor: 0x808080,
      floorColor: 0x606060,
      ceilingColor: 0x707070,
      stairsColor: 0x707070
    };
  }

  /**
   * Generate a complete tile mesh from a 3D voxel structure
   * 
   * @abstract
   * @param {Array} voxels - 3D array [x][y][z] of voxel types
   * @param {Object} options - Generation options (position, rotation, etc.)
   * @returns {THREE.Mesh|THREE.Group} Complete tile mesh
   */
  generateTileMesh(voxels, options = {}) {
    throw new Error('generateTileMesh() must be implemented by subclass');
  }

  /**
   * Generate a wall section mesh
   * 
   * @abstract
   * @param {Object} position - {x, y, z} position in world space
   * @param {Object} options - Wall-specific options (orientation, height, etc.)
   * @returns {THREE.Mesh} Wall mesh
   */
  generateWall(position, options = {}) {
    throw new Error('generateWall() must be implemented by subclass');
  }

  /**
   * Generate a floor section mesh
   * 
   * @abstract
   * @param {Object} position - {x, y, z} position in world space
   * @param {Object} options - Floor-specific options (size, pattern, etc.)
   * @returns {THREE.Mesh} Floor mesh
   */
  generateFloor(position, options = {}) {
    throw new Error('generateFloor() must be implemented by subclass');
  }

  /**
   * Generate a ceiling section mesh
   * 
   * @abstract
   * @param {Object} position - {x, y, z} position in world space
   * @param {Object} options - Ceiling-specific options (size, pattern, etc.)
   * @returns {THREE.Mesh} Ceiling mesh
   */
  generateCeiling(position, options = {}) {
    throw new Error('generateCeiling() must be implemented by subclass');
  }

  /**
   * Generate a stairs section mesh
   * 
   * @abstract
   * @param {Object} position - {x, y, z} position in world space
   * @param {Object} options - Stairs-specific options (direction, steps, etc.)
   * @returns {THREE.Mesh|THREE.Group} Stairs mesh
   */
  generateStairs(position, options = {}) {
    throw new Error('generateStairs() must be implemented by subclass');
  }

  /**
   * Get or create a material for a specific element type
   * 
   * @param {string} type - Material type ('wall', 'floor', 'ceiling', 'stairs')
   * @param {Object} options - Material-specific options
   * @returns {THREE.Material} Material instance
   */
  getMaterial(type, options = {}) {
    // Default implementation - can be overridden
    const colors = {
      wall: this.options.wallColor,
      floor: this.options.floorColor,
      ceiling: this.options.ceilingColor,
      stairs: this.options.stairsColor
    };

    const color = options.color || colors[type] || 0x808080;
    
    return new this.THREE.MeshLambertMaterial({
      color: color,
      flatShading: options.flatShading !== undefined ? options.flatShading : false
    });
  }

  /**
   * Get the unique identifier for this generator
   * @abstract
   * @returns {string} Generator ID
   */
  getId() {
    throw new Error('getId() must be implemented by subclass');
  }

  /**
   * Get the display name for this generator
   * @abstract
   * @returns {string} Generator name
   */
  getName() {
    throw new Error('getName() must be implemented by subclass');
  }

  /**
   * Get a description of this generator's visual style
   * @returns {string} Description
   */
  getDescription() {
    return 'A mesh generator';
  }

  /**
   * Helper method to create a basic box geometry
   * @protected
   * @param {number} width - Width of box
   * @param {number} height - Height of box
   * @param {number} depth - Depth of box
   * @returns {THREE.BoxGeometry} Box geometry
   */
  _createBoxGeometry(width, height, depth) {
    return new this.THREE.BoxGeometry(width, height, depth);
  }

  /**
   * Helper method to position a mesh in world space
   * @protected
   * @param {THREE.Mesh} mesh - Mesh to position
   * @param {Object} position - {x, y, z} position
   */
  _positionMesh(mesh, position) {
    mesh.position.set(position.x, position.y, position.z);
  }
}
