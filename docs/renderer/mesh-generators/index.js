/**
 * Mesh Generators Bootstrap
 * 
 * Initializes the mesh generator registry and registers default generators.
 * This module should be imported early in the application lifecycle.
 */

import { getGeneratorRegistry } from './generator-registry.js';
import { VoxelCubeGenerator } from './voxel-cube-generator.js';
import { LowPolyGenerator } from './lowpoly-generator.js';

/**
 * Initialize mesh generators with Three.js reference
 * @param {Object} THREE - Three.js library reference
 */
export function initializeMeshGenerators(THREE) {
  console.log('[MeshGenerators] initializeMeshGenerators() called');
  
  if (!THREE) {
    throw new Error('THREE reference required to initialize mesh generators');
  }

  const registry = getGeneratorRegistry();
  console.log('[MeshGenerators] Registry acquired:', !!registry);

  // Register default VoxelCubeGenerator
  const voxelCubeGenerator = new VoxelCubeGenerator(THREE);
  registry.register(voxelCubeGenerator);
  console.log('[MeshGenerators] VoxelCubeGenerator registered');

  // Register LowPolyGenerator as alternative style
  const lowPolyGenerator = new LowPolyGenerator(THREE);
  registry.register(lowPolyGenerator);
  console.log('[MeshGenerators] LowPolyGenerator registered');

  // Set voxel-cube as active (will be auto-set as first registered)
  registry.setActiveGenerator('voxel-cube');
  console.log('[MeshGenerators] Active generator set to voxel-cube');

  const registeredIds = registry.getGeneratorIds();
  console.log('[MeshGenerators] Registered generator IDs:', registeredIds);
  console.log('[MeshGenerators] Generator names:', 
    registeredIds.map(id => registry.getGenerator(id).getName()).join(', ')
  );

  return registry;
}

/**
 * Get the active mesh generator
 * @returns {BaseMeshGenerator|null} Active generator instance
 */
export function getActiveMeshGenerator() {
  const registry = getGeneratorRegistry();
  return registry.getActiveGenerator();
}

/**
 * Register a new mesh generator
 * @param {BaseMeshGenerator} generator - Generator instance to register
 */
export function registerMeshGenerator(generator) {
  const registry = getGeneratorRegistry();
  registry.register(generator);
}

/**
 * Switch to a different mesh generator
 * @param {string} generatorId - ID of generator to activate
 */
export function setActiveMeshGenerator(generatorId) {
  const registry = getGeneratorRegistry();
  registry.setActiveGenerator(generatorId);
}

// Export registry access for advanced use cases
export { getGeneratorRegistry };
