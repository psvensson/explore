# Selection Highlight Contract

This document describes the group-based contract for selecting and highlighting tiles in the editor and how tests should interact with it.

Overview
- The editor renderer maintains a parent group (renderer.editorTiles) that contains one root node per tile.
- Each tile’s root carries userData.tileId matching the logical tile id in the editor state.
- Descendant meshes (THREE.Mesh) also carry userData.tileId and have material.emissive available for highlight color changes.
- selection_highlight.js works against this contract to find, highlight, and clear highlights by tileId.

Structure
- renderer.editorTiles: THREE.Group-like object with children array and traverse function.
- Tile subtree:
  - Root: userData.tileId = <tile-id>, children: [sub meshes]
  - Mesh nodes: isMesh = true, userData.tileId = <tile-id>, material.emissive with getHex()/setHex() methods, material.needsUpdate toggled when changing emissive.

API
- findMeshesByTileIdInGroup(group, tileId): Returns descendant meshes for a tileId if the root child carries that tileId.
- highlightMeshes(meshes, { color = 0x00ff00 }): Saves original emissive color into userData.originalEmissive and applies highlight color.
- clearMeshes(meshes): Restores emissive color from userData.originalEmissive if available.
- highlightInGroup(group, tileId, options): Convenience: find + highlight.
- clearInGroup(group, tileId): Convenience: find + clear.

MapEditor Integration
- MapEditor.highlightTile(tile): Uses highlightInGroup(renderer.editorTiles, tile.id, { color: 0x00ff00 }) and tracks selectedTileId.
- MapEditor.clearHighlight(): Uses clearInGroup(renderer.editorTiles, selectedTileId) and clears selection state.

Testing Helpers
- tests/helpers/editor-tiles.js provides:
  - makeEditorTilesGroup(): Minimal group with children and traverse stub.
  - makeTileNode(tileId, originalEmissive): Creates a tile subtree (root + child mesh) with emissive stubs.
  - addTile(group, tileId, originalEmissive): Convenience to append a tile subtree to the group.

Jest Setup
- tests/setup/jest.setup.js polyfills jsdom gaps:
  - document.elementFromPoint
  - requestAnimationFrame/cancelAnimationFrame
  - matchMedia
  - Canvas getContext
  - URL.createObjectURL/revokeObjectURL

Notes
- StructureMeshPipeline now uses a _traverse fallback so tests with plain JS objects (no real THREE traversal) still work.
- For production, THREE.Group/THREE.Mesh already provide traverse; tests use lightweight stubs.

Examples
- See tests/map_editor_selection.test.js for how the helpers simulate adding tiles and verify highlight transitions via emissive.setHex calls.
