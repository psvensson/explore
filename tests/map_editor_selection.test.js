/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals';
import { MapEditor } from '../docs/ui/map_editor.js';
import { makeEditorTilesGroup, makeTileNode, addTile } from './helpers/editor-tiles.js';


describe('MapEditor Selection Behavior', () => {
  let mockRenderer;
  let editor;
  let container;

  beforeEach(() => {
    container = document.createElement('div');

    // Provide elementFromPoint for jsdom (not implemented by default)
    document.elementFromPoint = jest.fn(() => null);

    // Minimal renderer mock with editorTiles group expected by selection_highlight API
    const editorTiles = makeEditorTilesGroup();
    mockRenderer = {
      editorTiles,
      renderEditorTile: jest.fn(),
      removeEditorTile: jest.fn(),
      clearEditorTiles: jest.fn(() => {
        editorTiles.children.length = 0;
      }),
      setEditorMode: jest.fn(),
      scene: { getObjectByName: jest.fn(() => ({ traverse: jest.fn() })) },
      camera: {},
      // getMeshesByTileId is no longer used by MapEditor; left here for backward compatibility
      getMeshesByTileId: jest.fn(),
    };

    editor = new MapEditor(container, mockRenderer, {});
    // Stub overlay
    editor.overlay = { render: jest.fn(), show: jest.fn(), screenToGrid: jest.fn() };
  });

  test('clearHighlight resets selectedTileId and emissive color', () => {
    // Arrange group with a highlighted tile
    const { root, mesh } = makeTileNode('tile_1', 0x111111);
    mockRenderer.editorTiles.children.push(root);

    editor.selectedTileId = 'tile_1';

    // Act
    editor.clearHighlight();

    // Assert
    expect(mesh.material.emissive.setHex).toHaveBeenCalledWith(0x111111);
    expect(editor.selectedTileId).toBeNull();
  });

  test('highlightTile clears previous highlight and applies new one', () => {
    // Arrange: two tiles exist in the editorTiles group
    const oldTile = makeTileNode('old_tile', 0x222222);
    const newTile = makeTileNode('new_tile', 0x333333);
    mockRenderer.editorTiles.children.push(oldTile.root, newTile.root);

    // Simulate previously selected tile
    editor.selectedTileId = 'old_tile';

    // Act: highlight new tile
    editor.highlightTile({ id: 'new_tile', structureId: 'struct_1', position: { x: 0, y: 0, z: 0 } });

    // Assert: previous cleared, new highlighted
    expect(oldTile.mesh.material.emissive.setHex).toHaveBeenCalledWith(0x222222);
    expect(newTile.mesh.material.emissive.setHex).toHaveBeenCalledWith(0x00ff00);
    expect(editor.selectedTileId).toBe('new_tile');
  });

  test('UI interaction flow: selecting tiles via mouse click highlights only one at a time', () => {
    // Prepare palette selection
    editor.selectStructure('floor_tile');

    // Mock controls to avoid null references
    editor.controls = { tileCount: { textContent: '' } };
    editor.state.getAllTiles = jest.fn(() => []);

    // When editor places a tile, renderer should add it to editorTiles group
    const tileRefs = {};
    mockRenderer.renderEditorTile.mockImplementation((tile) => {
      const colorMap = { tile_1: 0x111111, tile_2: 0x222222, tile_3: 0x333333 };
      const { root, mesh } = makeTileNode(tile.id, colorMap[tile.id] ?? 0x111111);
      mockRenderer.editorTiles.children.push(root);
      tileRefs[tile.id] = { root, mesh };
    });

    // 1) Place first tile by clicking empty grid -> adds tile_1 and highlights it
    editor.hoveredGrid = { x: 0, y: 0, z: 0 };
    editor.state.tryPlaceTile = jest.fn((x, y, z, id, rot) => ({ ok: true, tile: { id: 'tile_1', structureId: id, position: { x, y, z } } }));
    editor.handleMouseClick({ clientX: 10, clientY: 10, shiftKey: false, button: 0 });

    // 2) Simulate existing second tile and click on it (selection path)
    // Ensure tile_2 exists in the group (already rendered previously in a real app)
    const t2 = makeTileNode('tile_2', 0x222222);
    mockRenderer.editorTiles.children.push(t2.root);
    tileRefs['tile_2'] = t2;

    editor.hoveredGrid = { x: 1, y: 0, z: 0 };
    editor.state.getTile = jest.fn(() => ({ id: 'tile_2', structureId: 'floor_tile', position: { x: 1, y: 0, z: 0 } }));
    editor.handleMouseClick({ clientX: 20, clientY: 10, shiftKey: false, button: 0 });

    // 3) Simulate existing third tile and click on it (selection path)
    const t3 = makeTileNode('tile_3', 0x333333);
    mockRenderer.editorTiles.children.push(t3.root);
    tileRefs['tile_3'] = t3;

    editor.hoveredGrid = { x: 2, y: 0, z: 0 };
    editor.state.getTile = jest.fn(() => ({ id: 'tile_3', structureId: 'floor_tile', position: { x: 2, y: 0, z: 0 } }));
    editor.handleMouseClick({ clientX: 30, clientY: 10, shiftKey: false, button: 0 });

    // Verify highlight logic through real click flow (previous cleared, last highlighted)
    expect(tileRefs['tile_1'].mesh.material.emissive.setHex).toHaveBeenCalledWith(0x111111);
    expect(tileRefs['tile_2'].mesh.material.emissive.setHex).toHaveBeenCalledWith(0x222222);
    expect(tileRefs['tile_3'].mesh.material.emissive.setHex).toHaveBeenCalledWith(0x00ff00);
    expect(editor.selectedTileId).toBe('tile_3');
  });

  test('only one tile remains highlighted when multiple tiles exist', () => {
    // Arrange: three tiles present
    const tA = makeTileNode('tilea', 0x111111);
    const tB = makeTileNode('tileb', 0x222222);
    const tC = makeTileNode('tilec', 0x333333);
    mockRenderer.editorTiles.children.push(tA.root, tB.root, tC.root);

    // Select first tile
    editor.highlightTile({ id: 'tilea', structureId: 's1', position: { x: 0, y: 0, z: 0 } });
    expect(tA.mesh.material.emissive.setHex).toHaveBeenCalledWith(0x00ff00);

    // Select second tile, should clear first
    editor.highlightTile({ id: 'tileb', structureId: 's2', position: { x: 1, y: 0, z: 0 } });
    expect(tA.mesh.material.emissive.setHex).toHaveBeenCalledWith(0x111111);
    expect(tB.mesh.material.emissive.setHex).toHaveBeenCalledWith(0x00ff00);

    // Select third tile, should clear second
    editor.highlightTile({ id: 'tilec', structureId: 's3', position: { x: 2, y: 0, z: 0 } });
    expect(tB.mesh.material.emissive.setHex).toHaveBeenCalledWith(0x222222);
    expect(tC.mesh.material.emissive.setHex).toHaveBeenCalledWith(0x00ff00);

    // Ensure only last tile remains highlighted
    expect(editor.selectedTileId).toBe('tilec');
  });
});
