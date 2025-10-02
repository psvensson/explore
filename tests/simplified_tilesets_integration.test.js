/**
 * Test integration of simplified tilesets with WFC generation
 */

import { describe, test, expect, beforeEach } from '@jest/globals';

// Mock NDWFC3D global before imports
global.NDWFC3D = function MockNDWFC3D() {
  return {
    step: () => ({ status: 'success' }),
    expand: () => ({ status: 'success' }),
    getGrid: () => new Array(27).fill(0).map((_, i) => i % 2),
    getTiles: () => [
      { position: [0, 0, 0], prototypeIndex: 0, rotationY: 0 },
      { position: [1, 0, 0], prototypeIndex: 1, rotationY: 90 }
    ]
  };
};

describe('Simplified Tileset WFC Integration', () => {
  beforeEach(() => {
    // Set up clean test environment
  });

  test('should load simplified tilesets', async () => {
    const { SIMPLIFIED_TILESETS, listTilesets } = await import('../docs/dungeon/simplified_tilesets.js');
    
    expect(SIMPLIFIED_TILESETS).toBeDefined();
    
    const tilesets = listTilesets();
    expect(tilesets).toBeInstanceOf(Array);
    expect(tilesets.length).toBeGreaterThan(0);
    
    // Check basic_dungeon tileset exists
    const basicDungeon = tilesets.find(t => t.id === 'basic_dungeon');
    expect(basicDungeon).toBeDefined();
    expect(basicDungeon.name).toBe('Basic Dungeon');
  });

  test('should convert simplified tileset to WFC format', async () => {
    const { getTilesetById, convertTilesetForWFC } = await import('../docs/dungeon/simplified_tilesets.js');
    
    const tileset = getTilesetById('basic_dungeon');
    expect(tileset).toBeDefined();
    
    const wfcTileset = convertTilesetForWFC(tileset);
    expect(wfcTileset).toBeDefined();
    expect(wfcTileset.prototypes).toBeInstanceOf(Array);
    expect(wfcTileset.prototypes.length).toBeGreaterThan(0);
    
    // Check prototype structure - updated for correct WFC format
    const proto = wfcTileset.prototypes[0];
    expect(proto).toHaveProperty('tileId');
    expect(proto).toHaveProperty('voxels');
    expect(proto).toHaveProperty('meta');
    expect(proto.meta).toHaveProperty('weight');
    expect(proto.meta).toHaveProperty('rotation');
    expect(proto.meta).toHaveProperty('sourceStructure');
  });

  test('should validate tilesets correctly', async () => {
    const { validateTileset, getTilesetById } = await import('../docs/dungeon/simplified_tilesets.js');
    
    const tileset = getTilesetById('basic_dungeon');
    const validation = validateTileset(tileset);
    
    expect(validation.success).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  test('should handle invalid tileset gracefully', async () => {
    const { validateTileset } = await import('../docs/dungeon/simplified_tilesets.js');
    
    const invalidTileset = {
      // Missing required fields
      tiles: []
    };
    
    const validation = validateTileset(invalidTileset);
    expect(validation.success).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  test('should work with existing tile structures', async () => {
    const { TileStructures } = await import('../docs/dungeon/tile_structures.js');
    const { getTilesetById, convertTilesetForWFC } = await import('../docs/dungeon/simplified_tilesets.js');
    
    // Check that tile structures are available
    expect(TileStructures.structures).toBeDefined();
    
    const tileset = getTilesetById('basic_dungeon');
    const wfcTileset = convertTilesetForWFC(tileset);
    
    // Verify that all referenced structures exist
    for (const tile of tileset.tiles) {
      expect(TileStructures.structures[tile.structure]).toBeDefined();
    }
    
    // Verify prototypes use actual structure data - updated for correct WFC format
    for (const proto of wfcTileset.prototypes) {
      expect(proto.tileId).toBeDefined();
      expect(proto.voxels).toBeDefined();
      expect(proto.meta.sourceStructure).toBeDefined();
      expect(proto.meta.weight).toBeGreaterThan(0);
    }
  });

  test('should create custom tileset', async () => {
    const { createCustomTileset } = await import('../docs/dungeon/simplified_tilesets.js');
    
    const customTileset = createCustomTileset('Test Tileset', [
      {
        structure: 'corridor_ns',
        weight: 2,
        rotations: [0, 90]
      }
    ]);
    
    expect(customTileset.id).toBe('test_tileset');
    expect(customTileset.name).toBe('Test Tileset');
    expect(customTileset.tiles).toHaveLength(1);
    expect(customTileset.tiles[0].structure).toBe('corridor_ns');
    expect(customTileset.tiles[0].weight).toBe(2);
    expect(customTileset.tiles[0].rotations).toEqual([0, 90]);
  });

  test('should expose functions to window in browser environment', async () => {
    // Simulate browser environment
    const originalWindow = global.window;
    global.window = {};
    
    // Re-import to trigger window setup
    await import('../docs/dungeon/simplified_tilesets.js');
    
    expect(global.window.SIMPLIFIED_TILESETS).toBeDefined();
    expect(global.window.createTileset).toBeDefined();
    expect(global.window.getTilesetById).toBeDefined();
    expect(global.window.listTilesets).toBeDefined();
    expect(global.window.validateTileset).toBeDefined();
    expect(global.window.convertTilesetForWFC).toBeDefined();
    expect(global.window.createCustomTileset).toBeDefined();
    
    // Restore original window
    global.window = originalWindow;
  });
});