// structure-mesh-pipeline.js
// Centralized pipeline for converting structure data to THREE.js meshes

import { VoxelCoordinateConverter } from '../../utils/voxel-coordinates.js';

/**
 * Centralized pipeline for structure-to-mesh conversion
 * Handles the complete flow: structure data → flat voxels → prototype → mesh
 */
export class StructureMeshPipeline {
  
  /**
   * Create a mesh from structure data
   * @param {THREE} THREERef - THREE.js reference
   * @param {Object} structureData - Structure data (can be nested array or flat array)
   * @param {Object} options - Configuration options
   * @param {Object} options.materialFactory - Material factory (optional, created if not provided)
   * @param {number} options.unit - Unit scale (default: 3)
   * @param {string} options.prototypeId - ID for the prototype (default: 'editor_preview')
   * @returns {Promise<THREE.Object3D>} The created mesh
   */
  static async createMeshFromStructure(THREERef, structureData, options = {}) {
    const {
      materialFactory = null,
      unit = 3,
      prototypeId = 'editor_preview'
    } = options;
    
    // Import required modules
    const { buildTileMesh } = await import('../../renderer/wfc_tile_mesh.js');
    const { makeMaterialFactory } = await import('../../renderer/mesh_factories.js');
    
    // Step 1: Convert structure data to flat voxel array
    const flatVoxelData = this._normalizeToFlatArray(structureData);
    
    // Step 2: Convert flat array to WFC prototype format
    const prototype = VoxelCoordinateConverter.flatToPrototype(flatVoxelData, prototypeId);
    
    // Step 3: Create or use material factory
    const factory = materialFactory || makeMaterialFactory(THREERef);
    
    // Step 4: Build mesh using main renderer's tile mesh system
    const mesh = buildTileMesh({
      THREE: THREERef,
      prototypeIndex: 0,
      prototypes: [prototype],
      unit: unit
    });
    
    console.log('[StructureMeshPipeline] Created mesh from structure data');
    return mesh;
  }
  
  /**
   * Create a mesh from a structure object (with metadata)
   * @param {THREE} THREERef - THREE.js reference
   * @param {Object} structure - Structure object with .structure property
   * @param {Object} options - Configuration options
   * @returns {Promise<THREE.Object3D>} The created mesh
   */
  static async createMeshFromStructureObject(THREERef, structure, options = {}) {
    if (!structure || !structure.structure) {
      throw new Error('[StructureMeshPipeline] Invalid structure object');
    }
    
    // Extract the first layer if structure is nested
    const structureData = Array.isArray(structure.structure[0]) 
      ? structure.structure[0] 
      : structure.structure;
    
    return this.createMeshFromStructure(THREERef, structureData, options);
  }
  
  /**
   * Create a mesh from structure ID by looking it up
   * @param {THREE} THREERef - THREE.js reference
   * @param {string} structureId - ID of the structure
   * @param {Object} allStructures - Map/object of all structures
   * @param {Object} options - Configuration options
   * @returns {Promise<THREE.Object3D>} The created mesh
   */
  static async createMeshFromStructureId(THREERef, structureId, allStructures, options = {}) {
    const structure = allStructures[structureId];
    if (!structure) {
      throw new Error(`[StructureMeshPipeline] Structure not found: ${structureId}`);
    }
    
    return this.createMeshFromStructureObject(THREERef, structure, options);
  }
  
  /**
   * Normalize structure data to flat array
   * Handles both nested arrays and already-flat arrays
   * @param {Array} structureData - Structure data in various formats
   * @returns {Array} Flat voxel array (27 elements for 3×3×3)
   * @private
   */
  static _normalizeToFlatArray(structureData) {
    // If already flat (27 elements), return as-is
    if (Array.isArray(structureData) && structureData.length === 27) {
      return structureData;
    }
    
    // If it's a nested structure (layers), flatten it
    if (Array.isArray(structureData) && Array.isArray(structureData[0])) {
      return VoxelCoordinateConverter.structureToFlat(structureData);
    }
    
    // If it's some other format, try to flatten
    if (Array.isArray(structureData)) {
      return VoxelCoordinateConverter.structureToFlat(structureData);
    }
    
    throw new Error('[StructureMeshPipeline] Unable to normalize structure data');
  }
  
  /**
   * Batch create meshes from multiple structures
   * @param {THREE} THREERef - THREE.js reference
   * @param {Array<Object>} structures - Array of structure objects
   * @param {Object} options - Configuration options
   * @returns {Promise<Array<THREE.Object3D>>} Array of created meshes
   */
  static async createMeshesFromStructures(THREERef, structures, options = {}) {
    const meshes = [];
    
    for (const structure of structures) {
      try {
        const mesh = await this.createMeshFromStructureObject(THREERef, structure, options);
        meshes.push(mesh);
      } catch (error) {
        console.error('[StructureMeshPipeline] Failed to create mesh:', error);
        meshes.push(null);
      }
    }
    
    return meshes;
  }
  
  /**
   * Update an existing viewer with new structure data
   * @param {Voxel3DViewer} viewer - The viewer to update
   * @param {Array} structureData - New structure data
   * @param {Object} materialFactory - Material factory to use
   * @param {Object} options - Configuration options
   * @returns {Promise<void>}
   */
  static async updateViewerWithStructure(viewer, structureData, materialFactory, options = {}) {
    const THREERef = viewer.getTHREE();
    const mesh = await this.createMeshFromStructure(THREERef, structureData, {
      ...options,
      materialFactory
    });
    
    // Update mesh in viewer, preserving rotation
    viewer.setMesh(mesh, true);
  }
}

// Node.js compatibility guard
if (typeof window !== 'undefined') {
  console.log('[StructureMeshPipeline] Structure mesh pipeline loaded');
}
