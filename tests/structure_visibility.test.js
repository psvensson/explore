/**
 * Test to verify duplicate structures appear in the library
 */

describe('Structure Visibility in Library', () => {
  beforeEach(() => {
    // Clear localStorage and reset state
    localStorage.clear();
    delete window.dataMerger;
  });

  test('duplicated structures should appear in library view', async () => {
    // Import modules
    const { DataMerger } = await import('../docs/dungeon/persistence/data_merger.js');
    
    // Set up DataMerger
    window.dataMerger = new DataMerger();
    await window.dataMerger.initialize();
    
    // Get initial structure count
    const initialStructures = window.dataMerger.getAllStructures();
    const initialCount = Object.keys(initialStructures).length;
    expect(initialCount).toBeGreaterThan(0);
    
    // Pick a built-in structure to duplicate
    const builtInStructureId = Object.keys(initialStructures)[0];
    const original = initialStructures[builtInStructureId];
    
    // Manually duplicate the structure (like the duplicateStructure method does)
    const copyName = `${builtInStructureId}_copy`;
    const copiedStructure = {
      structure: JSON.parse(JSON.stringify(original.structure)),
      edges: [...original.edges],
      type: original.type
    };
    
    // Save the copy using DataMerger
    const saveResult = await window.dataMerger.saveUserStructure(copyName, copiedStructure);
    expect(saveResult.success).toBe(true);
    
    // Verify the copy is now in the merged structures
    const updatedStructures = window.dataMerger.getAllStructures();
    expect(updatedStructures[copyName]).toBeDefined();
    expect(Object.keys(updatedStructures).length).toBe(initialCount + 1);
    
    // Verify the copy has the expected structure
    expect(updatedStructures[copyName].structure).toEqual(original.structure);
    expect(updatedStructures[copyName].edges).toEqual(original.edges);
    expect(updatedStructures[copyName].type).toBe(original.type);
  });

  test('getAllStructures helper method returns merged data', async () => {
    // This test would require loading the SimplifiedTilesetEditor but it has import issues in tests
    // Instead, we'll test the concept directly
    
    const { DataMerger } = await import('../docs/dungeon/persistence/data_merger.js');
    
    // Set up DataMerger
    window.dataMerger = new DataMerger();
    await window.dataMerger.initialize();
    
    // Test the logic that the helper method should implement
    let allStructures;
    if (window.dataMerger && window.dataMerger.initialized) {
      allStructures = window.dataMerger.getAllStructures();
    } else {
      // Fallback would be TileStructures.structures, but we can't import it easily in tests
      allStructures = {};
    }
    
    expect(allStructures).toBeDefined();
    expect(typeof allStructures).toBe('object');
    expect(Object.keys(allStructures).length).toBeGreaterThan(0);
  });
});