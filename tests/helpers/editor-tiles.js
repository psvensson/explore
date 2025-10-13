/**
 * Test helpers for group-based tile highlighting.
 * These utilities mirror the contract used by selection_highlight.js:
 * - A parent group (renderer.editorTiles) with children whose root nodes have userData.tileId
 * - Descendant mesh nodes marked with isMesh=true, material.emissive, and userData.tileId
 */
import { jest } from '@jest/globals';

/**
 * Create a minimal editorTiles group compatible with selection_highlight.js.
 * @returns {{children: any[], traverse: Function}}
 */
export function makeEditorTilesGroup() {
  return {
    children: [],
    // findMeshesByTileIdInGroup checks group.traverse existence
    traverse: () => {},
  };
}

/**
 * Create a tree for a single tile:
 * root node carries userData.tileId, and a child mesh that contains emissive material.
 * @param {string} tileId
 * @param {number} originalEmissive
 * @returns {{ root: any, mesh: any }}
 */
export function makeTileNode(tileId, originalEmissive = 0x111111) {
  // Leaf mesh with emissive material
  const mesh = {
    isMesh: true,
    userData: { tileId, originalEmissive },
    material: {
      emissive: {
        getHex: jest.fn(() => originalEmissive),
        setHex: jest.fn(),
      },
      needsUpdate: false,
    },
    children: [],
    traverse: (fn) => fn(mesh),
  };

  // Root for this tile subtree
  const root = {
    userData: { tileId },
    children: [mesh],
    traverse: (fn) => {
      fn(root);
      mesh.traverse(fn);
    },
  };

  return { root, mesh };
}

/**
 * Add a tile subtree to the given editorTiles group.
 * @param {ReturnType<makeEditorTilesGroup>} group
 * @param {string} tileId
 * @param {number} originalEmissive
 * @returns {{ root: any, mesh: any }}
 */
export function addTile(group, tileId, originalEmissive = 0x111111) {
  const node = makeTileNode(tileId, originalEmissive);
  group.children.push(node.root);
  return node;
}
