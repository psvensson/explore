/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals';
import { MapEditor } from '../docs/ui/map_editor.js';

describe('MapEditor Selection Behavior', () => {
  let mockRenderer;
  let editor;
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    mockRenderer = {
      getMeshesByTileId: jest.fn(),
      renderEditorTile: jest.fn(),
      removeEditorTile: jest.fn(),
      clearEditorTiles: jest.fn(),
      setEditorMode: jest.fn(),
      scene: { getObjectByName: jest.fn(() => ({ traverse: jest.fn() })) },
      camera: {},
    };
    editor = new MapEditor(container, mockRenderer, {});
    editor.overlay = { render: jest.fn(), show: jest.fn(), screenToGrid: jest.fn() };
  });

  test('clearHighlight resets selectedTileId and emissive color', () => {
    const mockMesh = {
      name: 'TileMesh',
      material: { emissive: { getHex: jest.fn(() => 0x111111), setHex: jest.fn() }, needsUpdate: false },
      userData: { originalEmissive: 0x111111 },
    };
    mockRenderer.getMeshesByTileId.mockReturnValue([mockMesh]);
    editor.selectedTileId = 'tile_1';
    editor.clearHighlight();
    expect(mockRenderer.getMeshesByTileId).toHaveBeenCalledWith('tile_1');
    expect(mockMesh.material.emissive.setHex).toHaveBeenCalledWith(0x111111);
    expect(editor.selectedTileId).toBeNull();
  });

  test('highlightTile clears previous highlight and applies new one', () => {
    const oldMesh = {
      name: 'OldTile',
      material: { emissive: { getHex: jest.fn(() => 0x222222), setHex: jest.fn() }, needsUpdate: false },
      userData: { originalEmissive: 0x222222 },
    };
    const newMesh = {
      name: 'NewTile',
      material: { emissive: { getHex: jest.fn(() => 0x333333), setHex: jest.fn() }, needsUpdate: false },
      userData: {},
    };
    mockRenderer.getMeshesByTileId
      .mockReturnValueOnce([oldMesh]) // for clearHighlight
      .mockReturnValueOnce([newMesh]); // for highlightTile

    editor.selectedTileId = 'old_tile';
    editor.highlightTile({ id: 'new_tile', structureId: 'struct_1', position: { x: 0, y: 0, z: 0 } });

    expect(mockRenderer.getMeshesByTileId).toHaveBeenCalledWith('old_tile');
    expect(oldMesh.material.emissive.setHex).toHaveBeenCalledWith(0x222222);
    expect(newMesh.material.emissive.setHex).toHaveBeenCalledWith(0x00ff00);
    expect(editor.selectedTileId).toBe('new_tile');
  });

  test('UI interaction flow: selecting tiles via mouse click highlights only one at a time', () => {
    const mockMeshes = {
      tile_1: [{ name: 'Tile1', material: { emissive: { getHex: jest.fn(() => 0x111111), setHex: jest.fn() }, needsUpdate: false }, userData: { originalEmissive: 0x111111 } }],
      tile_2: [{ name: 'Tile2', material: { emissive: { getHex: jest.fn(() => 0x222222), setHex: jest.fn() }, needsUpdate: false }, userData: { originalEmissive: 0x222222 } }],
      tile_3: [{ name: 'Tile3', material: { emissive: { getHex: jest.fn(() => 0x333333), setHex: jest.fn() }, needsUpdate: false }, userData: { originalEmissive: 0x333333 } }],
    };

    mockRenderer.getMeshesByTileId.mockImplementation((id) => mockMeshes[id] || []);

    // Simulate palette selection
    editor.selectStructure('floor_tile');

    // Mock controls to avoid null references
    editor.controls = { tileCount: { textContent: '' } };
    editor.state.getAllTiles = jest.fn(() => []);

    // Simulate hover and click sequence
    editor.hoveredGrid = { x: 0, y: 0, z: 0 };
    editor.state.placeTile = jest.fn((x, y, z, id, rot) => ({ id: 'tile_1', structureId: id, position: { x, y, z } }));
    editor.renderer.renderEditorTile = jest.fn();
    editor.handleMouseClick({ clientX: 10, clientY: 10, shiftKey: false, button: 0 });

    editor.hoveredGrid = { x: 1, y: 0, z: 0 };
    editor.state.getTile = jest.fn(() => ({ id: 'tile_2', structureId: 'floor_tile', position: { x: 1, y: 0, z: 0 } }));
    editor.handleMouseClick({ clientX: 20, clientY: 10, shiftKey: false, button: 0 });

    editor.hoveredGrid = { x: 2, y: 0, z: 0 };
    editor.state.getTile = jest.fn(() => ({ id: 'tile_3', structureId: 'floor_tile', position: { x: 2, y: 0, z: 0 } }));
    editor.handleMouseClick({ clientX: 30, clientY: 10, shiftKey: false, button: 0 });

    // Verify highlight logic through real click flow
    expect(mockMeshes.tile_1[0].material.emissive.setHex).toHaveBeenCalledWith(0x111111);
    expect(mockMeshes.tile_2[0].material.emissive.setHex).toHaveBeenCalledWith(0x222222);
    expect(mockMeshes.tile_3[0].material.emissive.setHex).toHaveBeenCalledWith(0x00ff00);
    expect(editor.selectedTileId).toBe('tile_3');
  });

  test('only one tile remains highlighted when multiple tiles exist', () => {
    const tileMeshes = [
      {
        name: 'TileA',
        material: { emissive: { getHex: jest.fn(() => 0x111111), setHex: jest.fn() }, needsUpdate: false },
        userData: { originalEmissive: 0x111111 },
      },
      {
        name: 'TileB',
        material: { emissive: { getHex: jest.fn(() => 0x222222), setHex: jest.fn() }, needsUpdate: false },
        userData: { originalEmissive: 0x222222 },
      },
      {
        name: 'TileC',
        material: { emissive: { getHex: jest.fn(() => 0x333333), setHex: jest.fn() }, needsUpdate: false },
        userData: { originalEmissive: 0x333333 },
      },
    ];

    // Simulate renderer returning meshes for each tile
    mockRenderer.getMeshesByTileId
      .mockImplementation((tileId) => tileMeshes.filter((m) => m.name.toLowerCase().includes(tileId)));

    // Select first tile
    editor.highlightTile({ id: 'tilea', structureId: 's1', position: { x: 0, y: 0, z: 0 } });
    expect(tileMeshes[0].material.emissive.setHex).toHaveBeenCalledWith(0x00ff00);

    // Select second tile, should clear first
    editor.highlightTile({ id: 'tileb', structureId: 's2', position: { x: 1, y: 0, z: 0 } });
    expect(tileMeshes[0].material.emissive.setHex).toHaveBeenCalledWith(0x111111);
    expect(tileMeshes[1].material.emissive.setHex).toHaveBeenCalledWith(0x00ff00);

    // Select third tile, should clear second
    editor.highlightTile({ id: 'tilec', structureId: 's3', position: { x: 2, y: 0, z: 0 } });
    expect(tileMeshes[1].material.emissive.setHex).toHaveBeenCalledWith(0x222222);
    expect(tileMeshes[2].material.emissive.setHex).toHaveBeenCalledWith(0x00ff00);

    // Ensure only last tile remains highlighted
    expect(editor.selectedTileId).toBe('tilec');
  });
});
