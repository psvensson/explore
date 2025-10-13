/**
 * tile_identity.js
 * Centralized helper to propagate a tileId onto a mesh hierarchy and
 * optionally clone materials so per-tile visual state (e.g., emissive highlight)
 * does not bleed across shared materials.
 */

/**
 * Apply identity information to a mesh and its children.
 * - Sets userData.tileId on all meshes (root + descendants)
 * - Optionally clones materials so that per-tile changes are isolated
 * @param {THREE.Object3D} mesh
 * @param {{ tileId: string|number, cloneMaterials?: boolean }} options
 * @returns {THREE.Object3D} the same mesh for chaining
 */
export function applyTileIdentity(mesh, { tileId, cloneMaterials = true } = {}) {
  if (!mesh) return mesh;

  const tagMesh = (obj) => {
    if (!obj || !obj.isObject3D) return;
    // Tag mesh with tileId if it is a Mesh
    if (obj.isMesh) {
      obj.userData = obj.userData || {};
      obj.userData.tileId = tileId;

      if (cloneMaterials && obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material = obj.material.map((m) => {
            try {
              return m && typeof m.clone === 'function' ? m.clone() : m;
            } catch (_) {
              return m;
            }
          });
        } else {
          try {
            obj.material = obj.material && typeof obj.material.clone === 'function'
              ? obj.material.clone()
              : obj.material;
          } catch (_) {
            // ignore clone errors, keep original
          }
        }
      }
    }
  };

  // Apply to root and all descendants
  tagMesh(mesh);
  if (typeof mesh.traverse === 'function') {
    mesh.traverse((child) => {
      if (child !== mesh) tagMesh(child);
    });
  }

  return mesh;
}
