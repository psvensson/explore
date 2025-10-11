// mesh_geometry_builders.js
// Extracted primitive geometry builders (non-breaking introduction).

import { 
  voxelToWorldFloor, 
  voxelToWorldCeiling, 
  voxelToWorldCenter,
  getStandardCubeDimensions,
  getStandardPlaneDimensions
} from '../utils/voxel-to-world.js';

export function buildFloor({ THREE, unit, x, y, z, material }) {
  const dims = getStandardPlaneDimensions(unit, y);
  const geom = new THREE.BoxGeometry(dims.width, dims.height, dims.depth);
  const mesh = new THREE.Mesh(geom, material);
  mesh.userData = mesh.userData || {};

  // Ensure tileId is always assigned
  const tileId =
    (material && (material.tileId || (material.tile && material.tile.id))) ||
    globalThis.currentTileId ||
    (material && material.name) ||
    `tile_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  mesh.userData.tileId = tileId;

  // Also propagate tileId to material for consistency
  if (material) {
    material.tileId = tileId;
  }

  const pos = voxelToWorldFloor(x, y, z, unit);
  mesh.position.set(pos.x, pos.y, pos.z);
  return mesh;
}

export function buildCeiling({ THREE, unit, x, y, z, material }) {
  const dims = getStandardPlaneDimensions(unit, y);
  const geom = new THREE.BoxGeometry(dims.width, dims.height, dims.depth);
  const mesh = new THREE.Mesh(geom, material);
  mesh.userData = mesh.userData || {};

  const tileId =
    (material && (material.tileId || (material.tile && material.tile.id))) ||
    globalThis.currentTileId ||
    (material && material.name) ||
    `tile_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  mesh.userData.tileId = tileId;
  if (material) {
    material.tileId = tileId;
  }

  const pos = voxelToWorldCeiling(x, y, z, unit);
  mesh.position.set(pos.x, pos.y, pos.z);
  return mesh;
}

export function buildSolidCube({ THREE, unit, x, y, z, material }) {
  const dims = getStandardCubeDimensions(unit, y);
  const geom = new THREE.BoxGeometry(dims.width, dims.height, dims.depth);
  const mesh = new THREE.Mesh(geom, material);
  mesh.userData = mesh.userData || {};

  const tileId =
    (material && (material.tileId || (material.tile && material.tile.id))) ||
    globalThis.currentTileId ||
    (material && material.name) ||
    `tile_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  mesh.userData.tileId = tileId;
  if (material) {
    material.tileId = tileId;
  }

  const pos = voxelToWorldCenter(x, y, z, unit);
  mesh.position.set(pos.x, pos.y, pos.z);
  return mesh;
}
