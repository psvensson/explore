/**
 * VoxelCubeGenerator - Default mesh generator that preserves current cubic voxel behavior
 * 
 * Generates meshes using standard 1x1x1 cubes with contiguous layer positioning,
 * matching the existing wfc_tile_mesh.js behavior exactly.
 */

import { BaseMeshGenerator } from './base-generator.js';
import { 
  voxelToWorldFloor, 
  voxelToWorldCeiling, 
  voxelToWorldCenter,
  getStandardCubeDimensions,
  getStandardPlaneDimensions
} from '../../utils/voxel-to-world.js';

export class VoxelCubeGenerator extends BaseMeshGenerator {
  constructor(THREE, options = {}) {
    super(THREE, options);
  }

  getId() {
    return 'voxel-cube';
  }

  getName() {
    return 'Cubic Voxels';
  }

  getDescription() {
    return 'Standard cubic voxel style with solid blocks';
  }

  /**
   * Generate a complete tile mesh from a 3D voxel structure
   * This replicates the buildTileMesh() behavior from wfc_tile_mesh.js
   */
  generateTileMesh(voxels, options = {}) {
    const { 
      unit = this.options.unit,
      hasStairBelow = false,
      hasStairAbove = false,
      isEmptyRoom = false
    } = options;

    const group = new this.THREE.Group();
    
    // OPTIMIZATION: For empty rooms, just add floor and ceiling planes
    if (isEmptyRoom) {
      // Create single 3x1x3 floor plane at center voxel (1, 0, 1)
      const floorMesh = this.generateFloor(
        { x: 1, y: 0, z: 1 },
        { unit, overrideWidth: unit, overrideDepth: unit }
      );
      group.add(floorMesh);

      // Create single 3x1x3 ceiling plane at center voxel (1, 2, 1)
      const ceilingMesh = this.generateCeiling(
        { x: 1, y: 2, z: 1 },
        { unit, overrideWidth: unit, overrideDepth: unit }
      );
      group.add(ceilingMesh);
      
      return group;
    }

    // Check if voxels contain stairs (voxel value === 2)
    const hasStairs = this._hasStairVoxel(voxels);

    // Process all voxels in the 3x3x3 structure
    for (let z = 0; z < 3; z++) {
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          // Skip EMPTY voxels - they represent traversable air/space
          if (voxels[z][y][x] === 0) continue;
          
          // Skip voxels in stair transitions
          if (this._shouldSkipVoxel(y, hasStairs, hasStairBelow, hasStairAbove)) {
            continue;
          }
          
          const isWall = (y === 1);
          
          if (isWall) {
            // Render ALL solid wall voxels as individual cubes
            const wallMesh = this.generateWall(
              { x, y, z },
              { unit }
            );
            group.add(wallMesh);
          } else if (y === 0) {
            // Floor
            const floorMesh = this.generateFloor(
              { x, y, z },
              { unit }
            );
            group.add(floorMesh);
          } else {
            // Ceiling (y === 2)
            const ceilingMesh = this.generateCeiling(
              { x, y, z },
              { unit }
            );
            group.add(ceilingMesh);
          }
        }
      }
    }

    return group;
  }

  /**
   * Generate a wall section mesh
   */
  generateWall(position, options = {}) {
    const { unit = this.options.unit } = options;
    const { x, y, z } = position;
    
    const dims = getStandardCubeDimensions(unit, y);
    const geom = new this.THREE.BoxGeometry(dims.width, dims.height, dims.depth);
    const material = this.getMaterial('wall', options);
    const mesh = new this.THREE.Mesh(geom, material);
    
    // Set mesh metadata
    mesh.userData = mesh.userData || {};
    if (options.tileId) {
      mesh.userData.tileId = options.tileId;
      if (material) material.tileId = options.tileId;
    }
    
    const pos = voxelToWorldCenter(x, y, z, unit);
    mesh.position.set(pos.x, pos.y, pos.z);
    
    return mesh;
  }

  /**
   * Generate a floor section mesh
   */
  generateFloor(position, options = {}) {
    const { 
      unit = this.options.unit,
      overrideWidth,
      overrideDepth
    } = options;
    const { x, y, z } = position;
    
    let dims = getStandardPlaneDimensions(unit, y);
    
    // Apply overrides for optimized empty room rendering
    if (overrideWidth || overrideDepth) {
      dims = {
        width: overrideWidth || unit,
        height: dims.height,
        depth: overrideDepth || unit
      };
    }
    
    const geom = new this.THREE.BoxGeometry(dims.width, dims.height, dims.depth);
    const material = this.getMaterial('floor', options);
    const mesh = new this.THREE.Mesh(geom, material);
    
    // Set mesh metadata
    mesh.userData = mesh.userData || {};
    if (options.tileId) {
      mesh.userData.tileId = options.tileId;
      if (material) material.tileId = options.tileId;
    }
    
    const pos = voxelToWorldFloor(x, y, z, unit);
    mesh.position.set(pos.x, pos.y, pos.z);
    
    return mesh;
  }

  /**
   * Generate a ceiling section mesh
   */
  generateCeiling(position, options = {}) {
    const { 
      unit = this.options.unit,
      overrideWidth,
      overrideDepth
    } = options;
    const { x, y, z } = position;
    
    let dims = getStandardPlaneDimensions(unit, y);
    
    // Apply overrides for optimized empty room rendering
    if (overrideWidth || overrideDepth) {
      dims = {
        width: overrideWidth || unit,
        height: dims.height,
        depth: overrideDepth || unit
      };
    }
    
    const geom = new this.THREE.BoxGeometry(dims.width, dims.height, dims.depth);
    const material = this.getMaterial('ceiling', options);
    const mesh = new this.THREE.Mesh(geom, material);
    
    // Set mesh metadata
    mesh.userData = mesh.userData || {};
    if (options.tileId) {
      mesh.userData.tileId = options.tileId;
      if (material) material.tileId = options.tileId;
    }
    
    const pos = voxelToWorldCeiling(x, y, z, unit);
    mesh.position.set(pos.x, pos.y, pos.z);
    
    return mesh;
  }

  /**
   * Generate a stairs section mesh
   * Note: Stairs are complex and handled by separate buildStairs() utility in mesh_factories.js
   * This is left as a placeholder for future refactoring
   */
  generateStairs(position, options = {}) {
    // For now, return an empty group - stairs are built by buildStairs() in mesh_factories.js
    // This will be refactored in a future phase
    return new this.THREE.Group();
  }

  /**
   * Override getMaterial to provide voxel-specific materials
   */
  getMaterial(type, options = {}) {
    // Use explicit color if provided
    if (options.color !== undefined) {
      return super.getMaterial(type, options);
    }

    // Use generator default colors for voxel style
    const colors = {
      wall: 0x606060,
      floor: 0x333333,
      ceiling: 0x888888,
      stairs: 0x777777
    };

    return super.getMaterial(type, { 
      ...options, 
      color: colors[type] || this.options[`${type}Color`]
    });
  }

  // ===== Private Helper Methods =====

  /**
   * Check if voxels contain a stair marker (value === 2)
   * @private
   */
  _hasStairVoxel(voxels) {
    for (let z = 0; z < 3; z++) {
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          if (voxels[z][y][x] === 2) return true;
        }
      }
    }
    return false;
  }

  /**
   * Determine if a voxel should be skipped during rendering
   * @private
   */
  _shouldSkipVoxel(y, hasStairs, hasStairBelow, hasStairAbove) {
    if (hasStairs && y === 2) return true;
    if (hasStairBelow && y === 0) return true;
    if (hasStairAbove && y === 2) return true;
    return false;
  }
}
