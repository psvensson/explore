/**
 * Test bootstrap integration and persistence system
 */

describe('Bootstrap and Persistence', () => {
  beforeEach(() => {
    // Clear any existing global state
    delete window.__APP_BOOTSTRAPPED;
    delete window.__APP_BOOTSTRAP_FAILED;
    delete window.__PERSISTENCE_READY__;
    delete window.__PERSISTENCE_FAILED__;
    delete window.dataMerger;
    
    // Clear localStorage
    localStorage.clear();
  });

  test('DataMerger can be imported and initialized', async () => {
    // Test that DataMerger imports without errors
    const { DataMerger } = await import('../docs/dungeon/persistence/data_merger.js');
    expect(DataMerger).toBeDefined();
    
    // Test that it can be instantiated and initialized
    const dataMerger = new DataMerger();
    await dataMerger.initialize();
    
    // Test that it has expected methods
    expect(typeof dataMerger.getAllStructures).toBe('function');
    expect(typeof dataMerger.saveUserStructure).toBe('function');
    expect(typeof dataMerger.deleteUserStructure).toBe('function');
    
    // Test that it can return structures
    const structures = dataMerger.getAllStructures();
    expect(structures).toBeDefined();
    expect(Array.isArray(Object.entries(structures))).toBe(true);
  });

  test('StorageManager handles localStorage operations', async () => {
    const { StorageManager } = await import('../docs/dungeon/persistence/storage_manager.js');
    expect(StorageManager).toBeDefined();
    
    const storageManager = new StorageManager();
    
    // Test saving and loading user structures (using correct structure format)
    const testStructure = {
      structure: [[[1]]],
      edges: ['100', '000', '100', '000'], // n, e, s, w
      type: 'test'
    };
    
    await storageManager.saveUserStructures({ 'test-id': testStructure });
    const loadResult = await storageManager.loadUserStructures();
    
    expect(loadResult).toBeDefined();
    expect(loadResult.success).toBe(true);
    expect(loadResult.data).toBeDefined();
    expect(loadResult.data['test-id']).toBeDefined();
    expect(loadResult.data['test-id'].type).toBe('test');
  });

  test('Default structures are available', async () => {
    const { DEFAULT_TILE_STRUCTURES, isBuiltInStructure } = await import('../docs/dungeon/defaults/default_tile_structures.js');
    
    expect(DEFAULT_TILE_STRUCTURES).toBeDefined();
    expect(typeof DEFAULT_TILE_STRUCTURES).toBe('object');
    
    // Test that we have some built-in structures
    const structureIds = Object.keys(DEFAULT_TILE_STRUCTURES);
    expect(structureIds.length).toBeGreaterThan(0);
    
    // Test isBuiltInStructure function
    expect(typeof isBuiltInStructure).toBe('function');
    if (structureIds.length > 0) {
      expect(isBuiltInStructure(structureIds[0])).toBe(true);
      expect(isBuiltInStructure('non-existent-id')).toBe(false);
    }
  });

  test('Persistence system integrates with existing TileStructures', async () => {
    // Test that DataMerger returns compatible data
    const { DataMerger } = await import('../docs/dungeon/persistence/data_merger.js');
    const dataMerger = new DataMerger();
    await dataMerger.initialize();
    
    const mergedStructures = dataMerger.getAllStructures();
    
    // Verify structure format is compatible with tileset format
    Object.entries(mergedStructures).forEach(([id, structure]) => {
      expect(structure).toBeDefined();
      expect(typeof structure.type).toBe('string');  // structures have type, not name
      expect(Array.isArray(structure.structure)).toBe(true);
      expect(Array.isArray(structure.edges)).toBe(true);
    });
  });
});