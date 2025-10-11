// structure-mesh-pipeline.js
// Centralized pipeline for converting structure data to THREE.js meshes

import { normalizeToCanonical } from '../../utils/voxel_normalize.js';
import { dbg } from '../../utils/debug_log.js';

/**
 * Centralized pipeline for structure-to-mesh conversion
 * Handles the complete flow: structure data → flat voxels → prototype → mesh
 */
export class StructureMeshPipeline {
  static _meshCache = new Map();
  static _structureCacheIndex = new Map(); // structureId -> Set(cacheKeys)
  static _cacheKeyToIds = new Map(); // cacheKey -> Set(structureIds)
  static _debugCacheCollisions = false;
  static enableCacheDebugging(flag = true) {
    this._debugCacheCollisions = !!flag;
  }
  static clearMeshCache() {
    this._meshCache.clear();
    this._structureCacheIndex.clear();
    this._cacheKeyToIds.clear();
  }
  static invalidateCacheForStructure(structureId) {
    if (!structureId || !this._structureCacheIndex.has(structureId)) return;
    const keys = this._structureCacheIndex.get(structureId);
    for (const key of keys) {
      this._meshCache.delete(key);
      const idSet = this._cacheKeyToIds.get(key);
      if (idSet) {
        idSet.delete(structureId);
        if (idSet.size === 0) {
          this._cacheKeyToIds.delete(key);
        }
      }
    }
    this._structureCacheIndex.delete(structureId);
  }
  static _registerCacheKey(structureId, cacheKey) {
    if (!structureId || !cacheKey) return;
    let idKeys = this._structureCacheIndex.get(structureId);
    if (!idKeys) {
      idKeys = new Set();
      this._structureCacheIndex.set(structureId, idKeys);
    }
    idKeys.add(cacheKey);

    let idSet = this._cacheKeyToIds.get(cacheKey);
    if (!idSet) {
      idSet = new Set();
      this._cacheKeyToIds.set(cacheKey, idSet);
    }
    if (this._debugCacheCollisions && !idSet.has(structureId) && idSet.size > 0) {
      console.warn('[StructureMeshPipeline] Cache key collision detected', {
        cacheKey,
        existing: Array.from(idSet),
        incoming: structureId
      });
    }
    idSet.add(structureId);
  }
  static _computeSignature(voxels) {
    return voxels
      .map(layer => layer.map(row => row.join('')).join('|'))
      .join('||');
  }
  static _buildCacheKey({ signature, prototypeId, unit }) {
    return [signature, prototypeId, unit].join('::');
  }
  static _cloneMesh(mesh) {
    if (!mesh) return mesh;
    if (typeof mesh.clone === 'function') {
      return mesh.clone(true);
    }
    // Fallback deep clone for mock objects in tests
    const clone = { ...mesh };
    if (Array.isArray(mesh.children)) {
      clone.children = mesh.children.map(child => this._cloneMesh(child));
    }
    return clone;
  }
  
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
      prototypeId = 'editor_preview',
      disableCache = false,
      structureId = null
    } = options;

    const { buildTileMesh } = await import('../../renderer/wfc_tile_mesh.js');
    const { makeMaterialFactory } = await import('../../renderer/mesh_factories.js');

    // 1. Normalize any incoming shape to canonical vox[z][y][x]
    const canonical = normalizeToCanonical(structureData);

    const cacheSignature = this._computeSignature(canonical);
    const cacheKey = this._buildCacheKey({
      signature: cacheSignature,
      prototypeId,
      unit
    });

    if (!disableCache && this._meshCache.has(cacheKey)) {
      this._registerCacheKey(structureId, cacheKey);
      return this._cloneMesh(this._meshCache.get(cacheKey));
    }

    // 2. Use canonical voxel data directly - no preprocessing or collapsing
    // IMPORTANT: Solid voxels = geometry, Empty voxels = traversable space
    // Each SOLID voxel should generate its own mesh cube for accurate representation
    let working = canonical;
    
    // Note: Previous "smart" collapsing logic removed - it was inverting the representation
    // by collapsing solid walls into simplified patterns. Now we render every solid voxel.

    // 3. Wrap into prototype expected by buildTileMesh
    const prototype = { id: prototypeId, voxels: working };
    const factory = materialFactory || makeMaterialFactory(THREERef);
    const mesh = buildTileMesh({
      THREE: THREERef,
      prototypeIndex: 0,
      prototypes: [prototype],
      unit
    });

    // Ensure all materials and meshes carry the structureId for downstream tileId propagation
    mesh.traverse((child) => {
      if (child.isMesh) {
        // Assign to userData
        child.userData = child.userData || {};
        child.userData.tileId = structureId;

        // Assign to material(s)
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => (mat.tileId = structureId));
          } else {
            child.material.tileId = structureId;
          }
        }
      }
    });

    if (!disableCache) {
      this._meshCache.set(cacheKey, this._cloneMesh(mesh));
      this._registerCacheKey(structureId, cacheKey);
    }

    // 4. Return mesh as-is - no post-processing or manipulation
    // Each solid voxel generates its own cube for accurate voxel-to-geometry representation
    dbg('StructureMeshPipeline:createMesh');
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
    // Pass full structure (now always explicit 3-layer format) directly
    const optsWithId = { ...options };
    if (structure.id && !optsWithId.structureId) {
      optsWithId.structureId = structure.id;
    }
    return this.createMeshFromStructure(THREERef, structure.structure, optsWithId);
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
    
    return this.createMeshFromStructureObject(THREERef, structure, {
      ...options,
      structureId: options?.structureId || structureId
    });
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
      unit: 3,
      disableCache: true,
      ...options,
      materialFactory
    });
    
    // Update mesh in viewer, preserving rotation
    viewer.setMesh(mesh, true);
  }
}

// Node.js compatibility guard
if (typeof window !== 'undefined') { dbg('StructureMeshPipeline:loaded'); }
