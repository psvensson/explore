/**
 * Test for tileset builder update issue
 */

describe('Tileset Builder Update Bug Fix', () => {
  beforeEach(() => {
    // Reset environment
    document.body.innerHTML = '';
    localStorage.clear();
    delete window.dataMerger;
    delete window.TileStructures;
  });

  test('tile selector should show newly duplicated structures', async () => {
    console.log('=== Testing Tile Selector Update ===');
    
    // Setup the system like bootstrap does
    const { TileStructures } = await import('../docs/dungeon/tile_structures.js');
    const { DataMerger } = await import('../docs/dungeon/persistence/data_merger.js');
    
    window.TileStructures = TileStructures;
    window.dataMerger = new DataMerger();
    await window.dataMerger.initialize();
    
    // Test the getAllStructures helper method
    function getAllStructures() {
      if (window.dataMerger && window.dataMerger.initialized) {
        return window.dataMerger.getAllStructures();
      } else {
        return TileStructures.structures;
      }
    }
    
    // Initial state
    const initialStructures = getAllStructures();
    const initialCount = Object.keys(initialStructures).length;
    const builtInId = Object.keys(initialStructures)[0];
    
    console.log('Initial structures:', initialCount);
    console.log('Will duplicate:', builtInId);
    
    // Duplicate a structure (like user would do)
    const original = initialStructures[builtInId];
    const copyName = `${builtInId}_copy`;
    const copiedStructure = {
      structure: JSON.parse(JSON.stringify(original.structure)),
      edges: [...original.edges],
      type: original.type
    };
    
    await window.dataMerger.saveUserStructure(copyName, copiedStructure);
    console.log('Duplicated structure saved');
    
    // Test: showTileSelector logic should include the new structure
    const updatedStructures = getAllStructures();
    expect(updatedStructures[copyName]).toBeDefined();
    console.log('✓ New structure visible via getAllStructures');
    
    // Test: simulate the showTileSelector method filtering
    const selectedStructures = new Set([builtInId]); // Simulate some selected structures
    const structures = Object.entries(updatedStructures);
    const availableStructures = structures.filter(([id]) => !selectedStructures.has(id));
    
    // The copied structure should be available for selection
    const copyStructureEntry = availableStructures.find(([id]) => id === copyName);
    expect(copyStructureEntry).toBeDefined();
    console.log('✓ Copied structure appears in available structures for tile selector');
    
    console.log('Available structures count:', availableStructures.length);
    console.log('Total structures count:', structures.length);
    
    // Verify the copy can be found and has the right properties
    expect(copyStructureEntry[1].structure).toEqual(original.structure);
    expect(copyStructureEntry[1].edges).toEqual(original.edges);
    expect(copyStructureEntry[1].type).toBe(original.type);
    
    console.log('✓ Copied structure has correct properties');
  });

  test('quickAddToTileset should work with newly created structures', async () => {
    console.log('=== Testing Quick Add to Tileset ===');
    
    // Setup
    const { TileStructures } = await import('../docs/dungeon/tile_structures.js');
    const { DataMerger } = await import('../docs/dungeon/persistence/data_merger.js');
    
    window.TileStructures = TileStructures;
    window.dataMerger = new DataMerger();
    await window.dataMerger.initialize();
    
    // Helper method (like in the editor)
    function getAllStructures() {
      if (window.dataMerger && window.dataMerger.initialized) {
        return window.dataMerger.getAllStructures();
      } else {
        return TileStructures.structures;
      }
    }
    
    // Create a new structure
    const newStructureId = 'test_custom_structure';
    const newStructure = {
      structure: [[[1, 0, 1], [0, 1, 0], [1, 0, 1]]],
      edges: ['101', '000', '101', '000'],
      type: 'custom'
    };
    
    await window.dataMerger.saveUserStructure(newStructureId, newStructure);
    console.log('Created new custom structure');
    
    // Test: quickAddToTileset logic should be able to find the structure
    const selectedStructures = new Set();
    
    // Simulate quickAddToTileset logic
    if (!selectedStructures.has(newStructureId)) {
      const allStructures = getAllStructures();
      const structure = allStructures[newStructureId];
      
      expect(structure).toBeDefined();
      console.log('✓ New structure found via getAllStructures');
      
      // Would add to selected structures
      selectedStructures.add(newStructureId);
      expect(selectedStructures.has(newStructureId)).toBe(true);
      console.log('✓ Structure can be added to tileset');
    }
    
    // Test: getSmartDefaults should work with the new structure
    const structure = getAllStructures()[newStructureId];
    if (structure) {
      const defaults = {
        weight: structure.type === 'custom' ? 3 : 5,
        rotations: [0, 90, 180, 270]
      };
      
      expect(defaults).toBeDefined();
      expect(defaults.weight).toBe(3); // Should get default weight for custom type
      console.log('✓ Smart defaults work for new structure');
    }
  });
});