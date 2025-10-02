/**
 * Integration test to verify the fix works in a browser-like environment
 */

describe('Browser Integration - Structure Duplication Fix', () => {
  beforeEach(() => {
    // Reset DOM and globals
    document.body.innerHTML = '';
    localStorage.clear();
    delete window.dataMerger;
    delete window.TileStructures;
  });

  test('should initialize persistence system correctly', async () => {
    // Simulate the bootstrap process
    const { TileStructures } = await import('../docs/dungeon/tile_structures.js');
    const { DataMerger } = await import('../docs/dungeon/persistence/data_merger.js');
    
    // Expose TileStructures globally (as bootstrap should do)
    window.TileStructures = TileStructures;
    
    // Initialize DataMerger
    window.dataMerger = new DataMerger();
    await window.dataMerger.initialize();
    
    // Verify bootstrap worked
    expect(window.dataMerger).toBeDefined();
    expect(window.dataMerger.initialized).toBe(true);
    expect(window.TileStructures).toBeDefined();
    
    // Verify TileStructures.structures was updated by DataMerger
    const originalCount = Object.keys(TileStructures.structures).length;
    expect(originalCount).toBeGreaterThan(0);
    
    // Test the duplication flow
    const builtInId = Object.keys(TileStructures.structures)[0];
    const original = TileStructures.structures[builtInId];
    
    // Duplicate via DataMerger
    const copyName = `${builtInId}_copy`;
    const copiedStructure = {
      structure: JSON.parse(JSON.stringify(original.structure)),
      edges: [...original.edges],
      type: original.type
    };
    
    const saveResult = await window.dataMerger.saveUserStructure(copyName, copiedStructure);
    expect(saveResult.success).toBe(true);
    
    // Verify TileStructures.structures was updated globally
    expect(TileStructures.structures[copyName]).toBeDefined();
    expect(window.TileStructures.structures[copyName]).toBeDefined();
    
    // Verify the structure is accessible via both methods
    const viaDataMerger = window.dataMerger.getAllStructures()[copyName];
    const viaTileStructures = TileStructures.structures[copyName];
    
    expect(viaDataMerger).toBeDefined();  
    expect(viaTileStructures).toBeDefined();
    expect(viaDataMerger.structure).toEqual(viaTileStructures.structure);
  });

  test('should handle structure lookup consistently', async () => {
    // Setup the system
    const { TileStructures } = await import('../docs/dungeon/tile_structures.js');
    const { DataMerger } = await import('../docs/dungeon/persistence/data_merger.js');
    
    window.TileStructures = TileStructures;
    window.dataMerger = new DataMerger();
    await window.dataMerger.initialize();
    
    // Test the getAllStructures helper logic
    function getAllStructures() {
      if (window.dataMerger && window.dataMerger.initialized) {
        return window.dataMerger.getAllStructures();
      } else {
        return TileStructures.structures;
      }
    }
    
    // Should return the same structures via both paths
    const viaHelper = getAllStructures();
    const viaDataMerger = window.dataMerger.getAllStructures();
    const viaTileStructures = TileStructures.structures;
    
    expect(Object.keys(viaHelper).length).toBe(Object.keys(viaDataMerger).length);
    expect(Object.keys(viaTileStructures).length).toBe(Object.keys(viaDataMerger).length);
    
    // Add a user structure
    const testId = 'test_structure';
    const testStructure = {
      structure: [[[1]]],
      edges: ['100', '000', '100', '000'],
      type: 'test'
    };
    
    await window.dataMerger.saveUserStructure(testId, testStructure);
    
    // All access methods should now include the new structure
    const updatedViaHelper = getAllStructures();
    const updatedViaDataMerger = window.dataMerger.getAllStructures();
    const updatedViaTileStructures = TileStructures.structures;
    
    expect(updatedViaHelper[testId]).toBeDefined();
    expect(updatedViaDataMerger[testId]).toBeDefined();  
    expect(updatedViaTileStructures[testId]).toBeDefined();
  });
});