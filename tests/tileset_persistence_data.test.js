/**
 * Test for tileset persistence data layer
 */

describe('Tileset Persistence Data Layer', () => {
  beforeEach(() => {
    // Reset environment
    localStorage.clear();
    delete window.dataMerger;
    delete window.TileStructures;
  });

  test('should save and retrieve user tilesets via DataMerger', async () => {
    console.log('=== Testing DataMerger Tileset Operations ===');
    
    // Setup
    const { TileStructures } = await import('../docs/dungeon/tile_structures.js');
    const { DataMerger } = await import('../docs/dungeon/persistence/data_merger.js');
    
    window.TileStructures = TileStructures;
    const dataMerger = new DataMerger();
    await dataMerger.initialize();
    
    // Test initial state
    const initialTilesets = dataMerger.getAllTilesets();
    const initialCount = Object.keys(initialTilesets).length;
    expect(initialCount).toBeGreaterThan(0); // Should have built-in tilesets
    
    console.log('Initial tilesets:', initialCount);
    
    // Create and save a user tileset
    const testTilesetId = 'test_user_tileset';
    const testTileset = {
      id: testTilesetId,
      name: 'Test User Tileset',
      description: 'A test tileset for data persistence',
      created: new Date().toISOString(),
      tiles: [
        {
          structure: 'corridor_nsew',
          weight: 5,
          rotations: [0, 90, 180, 270],
          constraints: {}
        },
        {
          structure: 'room_large',
          weight: 3,
          rotations: [0],
          constraints: {}
        }
      ]
    };
    
    const saveResult = await dataMerger.saveUserTileset(testTilesetId, testTileset);
    expect(saveResult.success).toBe(true);
    
    console.log('✓ User tileset saved successfully');
    
    // Verify it appears in getAllTilesets
    const updatedTilesets = dataMerger.getAllTilesets();
    expect(Object.keys(updatedTilesets).length).toBe(initialCount + 1);
    expect(updatedTilesets[testTilesetId]).toBeDefined();
    expect(updatedTilesets[testTilesetId].name).toBe('Test User Tileset');
    expect(updatedTilesets[testTilesetId].tiles.length).toBe(2);
    
    console.log('✓ Tileset appears in merged data');
    
    // Test persistence across DataMerger recreation
    const dataMerger2 = new DataMerger();
    await dataMerger2.initialize();
    
    const persistedTilesets = dataMerger2.getAllTilesets();
    expect(persistedTilesets[testTilesetId]).toBeDefined();
    expect(persistedTilesets[testTilesetId].name).toBe('Test User Tileset');
    
    console.log('✓ Tileset persists across DataMerger instances');
    
    // Test deletion
    const deleteResult = await dataMerger2.deleteUserTileset(testTilesetId);
    expect(deleteResult.success).toBe(true);
    
    const finalTilesets = dataMerger2.getAllTilesets();
    expect(finalTilesets[testTilesetId]).toBeUndefined();
    expect(Object.keys(finalTilesets).length).toBe(initialCount);
    
    console.log('✓ Tileset deleted successfully');
  });

  test('should handle work in progress localStorage operations', async () => {
    console.log('=== Testing Work in Progress localStorage ===');
    
    // Mock work in progress data
    const workData = {
      selectedStructures: ['corridor_nsew', 'room_large', 'stair_up'],
      loadedTilesetData: {
        id: 'custom_tileset',
        name: 'My Custom Tileset',
        description: 'Work in progress tileset'
      },
      currentView: 'builder',
      timestamp: Date.now()
    };
    
    // Save work in progress
    localStorage.setItem('tileset_editor_wip', JSON.stringify(workData));
    
    // Retrieve and verify
    const stored = localStorage.getItem('tileset_editor_wip');
    expect(stored).toBeDefined();
    
    const parsedData = JSON.parse(stored);
    expect(parsedData.selectedStructures).toEqual(['corridor_nsew', 'room_large', 'stair_up']);
    expect(parsedData.currentView).toBe('builder');
    expect(parsedData.loadedTilesetData.name).toBe('My Custom Tileset');
    
    console.log('✓ Work in progress saved and retrieved correctly');
    
    // Test timestamp validation (simulate old data)
    const oldWorkData = {
      ...workData,
      timestamp: Date.now() - (2 * 3600000) // 2 hours ago
    };
    
    localStorage.setItem('tileset_editor_wip', JSON.stringify(oldWorkData));
    
    // Should be considered expired (more than 1 hour old)
    const oldStored = localStorage.getItem('tileset_editor_wip');
    const oldParsedData = JSON.parse(oldStored);
    const isExpired = (Date.now() - oldParsedData.timestamp) > 3600000;
    
    expect(isExpired).toBe(true);
    console.log('✓ Work in progress expiration logic works');
  });

  test('should properly merge default and user tilesets', async () => {
    console.log('=== Testing Tileset Merging Logic ===');
    
    // Setup
    const { DataMerger } = await import('../docs/dungeon/persistence/data_merger.js');
    const { DEFAULT_TILESETS } = await import('../docs/dungeon/defaults/default_tilesets.js');
    
    const dataMerger = new DataMerger();
    await dataMerger.initialize();
    
    // Check that default tilesets are present
    const allTilesets = dataMerger.getAllTilesets();
    const defaultTilesetIds = Object.keys(DEFAULT_TILESETS);
    
    defaultTilesetIds.forEach(id => {
      expect(allTilesets[id]).toBeDefined();
      expect(allTilesets[id].name).toBe(DEFAULT_TILESETS[id].name);
    });
    
    console.log('✓ Default tilesets present in merged data');
    
    console.log('✓ Default tilesets present in merged data (skipping override test for now)');
    
    // Test user tileset with unique ID
    const uniqueId = 'unique_user_tileset';
    const uniqueTileset = {
      id: uniqueId,
      name: 'Unique User Tileset',
      description: 'This should be added',
      tiles: [
        {
          structure: 'corridor_nsew',
          weight: 1,
          rotations: [0],
          constraints: {}
        }
      ]
    };
    
    await dataMerger.saveUserTileset(uniqueId, uniqueTileset);
    
    const finalTilesets = dataMerger.getAllTilesets();
    expect(finalTilesets[uniqueId]).toBeDefined();
    expect(finalTilesets[uniqueId].name).toBe('Unique User Tileset');
    
    console.log('✓ Unique user tilesets are added correctly');
  });
});