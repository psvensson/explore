/**
 * selection_highlight.js
 * Reusable helpers for highlighting and clearing highlight on tile meshes by tileId.
 * Works on a parent group (e.g., renderer.editorTiles) by traversing to find child meshes
 * with userData.tileId === target.
 */

/**
 * Find all sub-meshes within group that belong to a specific tileId.
 * Includes root children and their descendants.
 * @param {THREE.Object3D} group
 * @param {string|number} tileId
 * @returns {THREE.Mesh[]} matching meshes
 */
export function findMeshesByTileIdInGroup(group, tileId) {
  const matches = [];
  if (!group || !group.traverse) return matches;
  group.children.forEach((child) => {
    if (!child) return;
    // Only descend into children that belong to this tileId at the root level
    if (child.userData && child.userData.tileId === tileId) {
      child.traverse((sub) => {
        if (sub.isMesh && sub.userData && sub.userData.tileId === tileId) {
          matches.push(sub);
        }
      });
    }
  });
  return matches;
}

/**
 * Apply emissive highlight to meshes; preserves original emissive color in userData.originalEmissive.
 * @param {THREE.Mesh[]} meshes
 * @param {{ color?: number }} options
 */
export function highlightMeshes(meshes, { color = 0x00ff00 } = {}) {
  for (const m of meshes) {
    if (m && m.material && m.material.emissive) {
      if (m.userData.originalEmissive === undefined) {
        try {
          m.userData.originalEmissive = m.material.emissive.getHex();
        } catch (_) {
          // ignore
        }
      }
      try {
        m.material.emissive.setHex(color);
        m.material.needsUpdate = true;
      } catch (_) {}
    }
  }
}

/**
 * Clear emissive highlight on meshes by restoring userData.originalEmissive if present.
 * @param {THREE.Mesh[]} meshes
 */
export function clearMeshes(meshes) {
  for (const m of meshes) {
    if (m && m.material && m.material.emissive && m.userData && m.userData.originalEmissive !== undefined) {
      try {
        m.material.emissive.setHex(m.userData.originalEmissive);
        m.material.needsUpdate = true;
      } catch (_) {}
    }
  }
}

/**
 * Highlight all meshes for a tileId within a group.
 * @param {THREE.Object3D} group
 * @param {string|number} tileId
 * @param {{ color?: number }} options
 * @returns {number} count of meshes highlighted
 */
export function highlightInGroup(group, tileId, options = {}) {
  const meshes = findMeshesByTileIdInGroup(group, tileId);
  highlightMeshes(meshes, options);
  return meshes.length;
}

/**
 * Clear highlight for all meshes of a tileId within a group.
 * @param {THREE.Object3D} group
 * @param {string|number} tileId
 * @returns {number} count of meshes cleared
 */
export function clearInGroup(group, tileId) {
  const meshes = findMeshesByTileIdInGroup(group, tileId);
  clearMeshes(meshes);
  return meshes.length;
}
