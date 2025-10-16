/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals';
import { MapEditor } from '../docs/ui/map_editor.js';
import { MapEditorState } from '../docs/dungeon/map_editor_state.js';
import { makeEditorTilesGroup, makeTileNode } from './helpers/editor-tiles.js';

describe('MapEditorState volumetric overlap policy', () => {
  test('blocks volumetric overlap across vertical layers', () => {
    const state = new MapEditorState();

    // Place a corridor at y=0
    const a = state.tryPlaceTile(0, 0, 0, 'corridor_ns', 0);
    expect(a.ok).toBe(true);

    // Attempt to place another corridor at the same x,z but y=1 should overlap
    const b = state.tryPlaceTile(0, 1, 0, 'corridor_ns', 0);
    expect(b.ok).toBe(false);
    // Reason could be 'overlap' (volumetric collision) or 'out_of_bounds' if top layer exceeds bounds
    expect(['overlap', 'out_of_bounds']).toContain(b.reason);

    // Non-solid open space should not overlap
    const c = state.tryPlaceTile(1, 1, 0, 'open_space_3x3', 0);
    expect(c.ok).toBe(true);
  });
});

describe('MapEditor UI integration: volumetric blocking across layers', () => {
  let mockRenderer;
  let editor;
  let container;

  beforeEach(() => {
    container = document.createElement('div');

    // Avoid UI element detection interfering with click placement logic
    document.elementFromPoint = jest.fn(() => null);

    // Minimal renderer mock with editorTiles group expected by selection_highlight API
    const editorTiles = makeEditorTilesGroup();
    mockRenderer = {
      editorTiles,
      renderEditorTile: jest.fn((tile) => {
        // Simulate adding a node to the group so highlight code works
        const color = 0x111111;
        const { root } = makeTileNode(tile.id, color);
        editorTiles.children.push(root);
      }),
      removeEditorTile: jest.fn(),
      clearEditorTiles: jest.fn(() => {
        editorTiles.children.length = 0;
      }),
      setEditorMode: jest.fn(),
      scene: { getObjectByName: jest.fn(() => ({ traverse: jest.fn() })), add: jest.fn() },
      camera: {},
      renderer: { domElement: document.createElement('canvas') },
      getMeshesByTileId: jest.fn(),
    };

    // Construct editor but do not call initialize(); we directly drive methods
    editor = new MapEditor(container, mockRenderer, {});
    // Stub overlay to avoid raycasting; we will set hoveredGrid manually and just trigger render
    editor.overlay = { render: jest.fn(), show: jest.fn(), screenToGrid: jest.fn(), hoveredCell: null, placementAllowed: true };
    // Minimal canvas element so handleMouseMove can compute rects
    editor.canvas = document.createElement('canvas');
    // Provide minimal controls used by updateTileCount and UI text
    editor.controls = { tileCount: { textContent: '' }, cursorPosition: { textContent: '' }, layerDisplay: { textContent: '' }, rotationDisplay: { textContent: '' } };

    // Choose a tile for placement
    editor.selectStructure('corridor_ns');
  });

  test('hover feedback marks blocked when vertical overlap would occur', () => {
    // Place at (0,0,0) on layer 0
    editor.placeOrReplaceTile(null, 0, 0, 0);
    expect(mockRenderer.renderEditorTile).toHaveBeenCalledTimes(1);

    // Move to layer 1 and hover same x,z -> volumetric overlap expected
    editor.currentLayer = 1;
    editor.hoveredGrid = { x: 0, y: 1, z: 0 };
    editor.overlay.screenToGrid.mockReturnValue({ x: 0, y: 1, z: 0 });
    editor.handleMouseMove({ clientX: 0, clientY: 0, preventDefault() {}, stopPropagation() {} });
    expect(editor.overlay.placementAllowed).toBe(false);
  });

  test('placing across layers where voxels would overlap is blocked and does not render twice', () => {
    // First placement at (0,0,0) layer 0
    editor.placeOrReplaceTile(null, 0, 0, 0);
    expect(mockRenderer.renderEditorTile).toHaveBeenCalledTimes(1);

    // Second attempt at same x,z on layer 1 should be prevented by volumetric policy
    editor.placeOrReplaceTile(null, 0, 1, 0);
    expect(mockRenderer.renderEditorTile).toHaveBeenCalledTimes(1);
  });
});
