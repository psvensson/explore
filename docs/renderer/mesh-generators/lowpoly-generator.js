/**
 * LowPolyGenerator - Example alternative mesh generator with low-poly aesthetic
 * 
 * Demonstrates the pluggable mesh system with a different visual style:
 * - Flat shading for faceted low-poly look
 * - Slightly randomized vertices for organic feel
 * - Beveled edges on cubes
 * - Different color palette
 */

import { BaseMeshGenerator } from './base-generator.js';
import { 
  voxelToWorldFloor, 
  voxelToWorldCeiling, 
  voxelToWorldCenter,
  getStandardCubeDimensions,
  getStandardPlaneDimensions
} from '../../utils/voxel-to-world.js';

export class LowPolyGenerator extends BaseMeshGenerator {
  constructor(THREE, options = {}) {
    super(THREE, options);
    
    // Cache for reusable geometries
    this._geometryCache = new Map();
  }

  getId() {
    return 'low-poly';
  }

  getName() {
    return 'Low-Poly';
  }

  getDescription() {
    return 'Faceted low-poly style with beveled edges and organic variation';
  }

  getDefaultOptions() {
    return {
      ...super.getDefaultOptions(),
      wallColor: 0x8B7355,      // Warm brown
      floorColor: 0x4A5568,     // Cool gray
      ceilingColor: 0x6B7280,   // Medium gray
      stairsColor: 0x7C6F5E,    // Sandy brown
      bevelSize: 0.08,          // Bevel edge size
      vertexVariation: 0.05,    // Random vertex displacement
      flatShading: true         // Enable flat shading for low-poly look
    };
  }

  /**
   * Generate a complete tile mesh from a 3D voxel structure
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
      const floorMesh = this.generateFloor(
        { x: 1, y: 0, z: 1 },
        { unit, overrideWidth: unit, overrideDepth: unit }
      );
      group.add(floorMesh);

      const ceilingMesh = this.generateCeiling(
        { x: 1, y: 2, z: 1 },
        { unit, overrideWidth: unit, overrideDepth: unit }
      );
      group.add(ceilingMesh);
      
      return group;
    }

    // Check if voxels contain stairs
    const hasStairs = this._hasStairVoxel(voxels);

    // Process all voxels in the 3x3x3 structure
    for (let z = 0; z < 3; z++) {
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          // Skip EMPTY voxels
          if (voxels[z][y][x] === 0) continue;
          
          // Skip voxels in stair transitions
          if (this._shouldSkipVoxel(y, hasStairs, hasStairBelow, hasStairAbove)) {
            continue;
          }
          
          const isWall = (y === 1);
          
          if (isWall) {
            // Render walls with low-poly style
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
   * Generate a wall section mesh with beveled edges
   */
  generateWall(position, options = {}) {
    const { unit = this.options.unit } = options;
    const { x, y, z } = position;
    
    const dims = getStandardCubeDimensions(unit, y);
    
    // Create beveled box geometry
    const geom = this._createBeveledBox(dims.width, dims.height, dims.depth);
    const material = this.getMaterial('wall', { ...options, flatShading: true });
    const mesh = new this.THREE.Mesh(geom, material);
    
    // Set mesh metadata
    mesh.userData = mesh.userData || {};
    if (options.tileId) {
      mesh.userData.tileId = options.tileId;
      if (material) material.tileId = options.tileId;
    }
    
    const pos = voxelToWorldCenter(x, y, z, unit);
    mesh.position.set(pos.x, pos.y, pos.z);
    
    // Add slight random rotation for organic variation
    mesh.rotation.y = (Math.random() - 0.5) * 0.05;
    
    return mesh;
  }

  /**
   * Generate a floor section mesh with subtle variation
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
    
    // Create slightly varied plane geometry
    const geom = this._createVariedPlane(dims.width, dims.height, dims.depth);
    const material = this.getMaterial('floor', { ...options, flatShading: true });
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
    
    // Apply overrides
    if (overrideWidth || overrideDepth) {
      dims = {
        width: overrideWidth || unit,
        height: dims.height,
        depth: overrideDepth || unit
      };
    }
    
    const geom = this._createVariedPlane(dims.width, dims.height, dims.depth);
    const material = this.getMaterial('ceiling', { ...options, flatShading: true });
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
   */
  generateStairs(position, options = {}) {
    // Placeholder - stairs handled separately for now
    return new this.THREE.Group();
  }

  /**
   * Override getMaterial to use low-poly colors and flat shading
   */
  getMaterial(type, options = {}) {
    // Use flat shading by default for low-poly aesthetic
    return super.getMaterial(type, { 
      ...options, 
      flatShading: true
    });
  }

  // ===== Private Helper Methods =====

  /**
   * Create a beveled box geometry for low-poly edges
   * @private
   */
  _createBeveledBox(width, height, depth) {
    const cacheKey = `beveled-${width}-${height}-${depth}`;
    
    if (this._geometryCache.has(cacheKey)) {
      return this._geometryCache.get(cacheKey);
    }
    
    // Create box with bevel
    const bevelSize = this.options.bevelSize;
    const geom = new this.THREE.BoxGeometry(
      width - bevelSize * 2, 
      height - bevelSize * 2, 
      depth - bevelSize * 2
    );
    
    // Apply slight vertex variation for organic look
    this._applyVertexVariation(geom);
    
    this._geometryCache.set(cacheKey, geom);
    return geom;
  }

  /**
   * Create a varied plane geometry with subtle height changes
   * @private
   */
  _createVariedPlane(width, height, depth) {
    const geom = new this.THREE.BoxGeometry(width, height, depth);
    
    // Apply subtle variation to make it look more organic
    this._applyVertexVariation(geom, 0.02); // Less variation for planes
    
    return geom;
  }

  /**
   * Apply random vertex displacement for organic variation
   * @private
   */
  _applyVertexVariation(geometry, amount = null) {
    const variation = amount !== null ? amount : this.options.vertexVariation;
    
    if (variation <= 0) return;
    
    const positionAttribute = geometry.attributes.position;
    
    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positionAttribute.getX(i);
      const y = positionAttribute.getY(i);
      const z = positionAttribute.getZ(i);
      
      // Add subtle random displacement
      positionAttribute.setX(i, x + (Math.random() - 0.5) * variation);
      positionAttribute.setY(i, y + (Math.random() - 0.5) * variation);
      positionAttribute.setZ(i, z + (Math.random() - 0.5) * variation);
    }
    
    positionAttribute.needsUpdate = true;
    geometry.computeVertexNormals(); // Recalculate normals for proper lighting
  }

  /**
   * Check if voxels contain a stair marker
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
   * Determine if a voxel should be skipped
   * @private
   */
  _shouldSkipVoxel(y, hasStairs, hasStairBelow, hasStairAbove) {
    if (hasStairs && y === 2) return true;
    if (hasStairBelow && y === 0) return true;
    if (hasStairAbove && y === 2) return true;
    return false;
  }
}
