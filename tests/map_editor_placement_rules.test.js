/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals';
import { MapEditor } from '../docs/ui/map_editor.js';
import { MapEditorState } from '../docs/dungeon/map_editor_state.js';
import { makeEditorTilesGroup, makeTileNode } from './helpers/editor-tiles.js';

describe('MapEditorState placement policy', () => {
  test('tryPlaceTile prevents duplicates in the same cell', () => {
    const state = new MapEditorState();

    // First placement should succeed
    const first = state.tryPlaceTile(0, 0, 0, 'floor_tile', 0);
    expect(first.ok).toBe(true);
    expect(state.isOccupied(0, 0, 0)).toBe(true);
    expect(state.getAllTiles().length).toBe(1);

    // Second placement at same cell is blocked
    const second = state.tryPlaceTile(0, 0, 0, 'floor_tile', 0);
    expect(second.ok).toBe(false);
    expect(second.reason).toBe('occupied');
    expect(state.getAllTiles().length).toBe(1);

    // Undo should clear the cell
    expect(state.undo()).toBe(true);
    expect(state.isOccupied(0, 0, 0)).toBe(false);

    // Redo should re-place the tile in the same cell
    expect(state.redo()).toBe(true);
    expect(state.isOccupied(0, 0, 0)).toBe(true);
    expect(state.getAllTiles().length).toBe(1);
  });
});

describe('MapEditor UI integration: placement blocking and snapping', () => {
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
      scene: { getObjectByName: jest.fn(() => ({ traverse: jest.fn() })) },
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
    // Provide minimal controls used by updateTileCount
    editor.controls = { tileCount: { textContent: '' }, cursorPosition: { textContent: '' }, layerDisplay: { textContent: '' }, rotationDisplay: { textContent: '' } };

    // Choose a tile for placement
    editor.selectStructure('floor_tile');
  });

  test('placing a tile twice in the same cell renders only once', () => {
    // First placement at (0,0,0)
    editor.placeOrReplaceTile(null, 0, 0, 0);
    expect(mockRenderer.renderEditorTile).toHaveBeenCalledTimes(1);

    // Second placement attempt in the same occupied cell -> blocked
    editor.placeOrReplaceTile(null, 0, 0, 0);
    expect(mockRenderer.renderEditorTile).toHaveBeenCalledTimes(1); // still only once
  });

  test('hover feedback toggles allowed/blocked state based on occupancy', () => {
    // Empty cell -> allowed
    editor.hoveredGrid = { x: 1, y: 0, z: 0 };
    editor.currentLayer = 0;
    // Mock screen-to-grid to hit the intended cell
    editor.overlay.screenToGrid.mockReturnValue({ x: 1, y: 0, z: 0 });
    editor.handleMouseMove({ clientX: 0, clientY: 0, preventDefault() {}, stopPropagation() {} });
    expect(editor.overlay.placementAllowed).toBe(true);

    // Place tile in that cell
    editor.placeOrReplaceTile(null, 1, 0, 0);
    expect(mockRenderer.renderEditorTile).toHaveBeenCalledTimes(1);

    // Move hover back to same cell -> blocked
    editor.hoveredGrid = { x: 1, y: 0, z: 0 };
    // Keep mapping to the same cell after placement
    editor.overlay.screenToGrid.mockReturnValue({ x: 1, y: 0, z: 0 });
    editor.handleMouseMove({ clientX: 0, clientY: 0, preventDefault() {}, stopPropagation() {} });
    expect(editor.overlay.placementAllowed).toBe(false);
  });
});
