/**
 * End-to-end test for the duplicate structure bug fix
 */

describe('End-to-End Structure Duplication Workflow', () => {
  beforeEach(() => {
    // Reset environment
    document.body.innerHTML = '';
    localStorage.clear();
    
    // Clear all globals
    delete window.dataMerger;
    delete window.TileStructures;
    delete window.__APP_BOOTSTRAPPED;
    delete window.__PERSISTENCE_READY__;
  });

  test('complete duplicate and rename workflow should work', async () => {
    console.log('=== Starting End-to-End Test ===');
    
    // Step 1: Simulate bootstrap initialization
    console.log('Step 1: Initialize bootstrap...');
    const { TileStructures } = await import('../docs/dungeon/tile_structures.js');
    const { DataMerger } = await import('../docs/dungeon/persistence/data_merger.js');
    
    // Make TileStructures global (like bootstrap does)
    window.TileStructures = TileStructures;
    
    // Initialize DataMerger
    window.dataMerger = new DataMerger();
    await window.dataMerger.initialize();
    
    console.log('Bootstrap complete. Initial structures:', Object.keys(TileStructures.structures).length);
    
    // Step 2: Get initial state
    const initialStructures = { ...TileStructures.structures };
    const initialCount = Object.keys(initialStructures).length;
    const builtInId = Object.keys(initialStructures)[0]; // e.g., 'corridor_nsew'
    
    console.log('Step 2: Initial state -', builtInId, 'will be duplicated');
    
    // Step 3: Simulate the duplicate structure action
    console.log('Step 3: Duplicating structure...');
    const original = initialStructures[builtInId];
    const copyName = `${builtInId}_copy`;
    
    const copiedStructure = {
      structure: JSON.parse(JSON.stringify(original.structure)),
      edges: [...original.edges],
      type: original.type
    };
    
    // Save via DataMerger (like the fixed duplicateStructure method)
    const saveResult = await window.dataMerger.saveUserStructure(copyName, copiedStructure);
    expect(saveResult.success).toBe(true);
    
    // Step 4: Verify structure appears in all access methods
    console.log('Step 4: Verifying structure visibility...');
    
    // Via DataMerger
    const viaDataMerger = window.dataMerger.getAllStructures();
    expect(viaDataMerger[copyName]).toBeDefined();
    console.log('✓ Found via DataMerger');
    
    // Via global TileStructures (what the UI might use)
    expect(TileStructures.structures[copyName]).toBeDefined();
    expect(window.TileStructures.structures[copyName]).toBeDefined();
    console.log('✓ Found via TileStructures.structures');
    
    // Via the helper method (what the fixed UI uses)
    function getAllStructures() {
      if (window.dataMerger && window.dataMerger.initialized) {
        return window.dataMerger.getAllStructures();
      } else {
        return TileStructures.structures;
      }
    }
    
    const viaHelper = getAllStructures();
    expect(viaHelper[copyName]).toBeDefined();
    console.log('✓ Found via getAllStructures helper');
    
    // Step 5: Test rename workflow
    console.log('Step 5: Testing rename...');
    const newName = 'my_custom_structure';
    
    // Simulate rename: delete old, save new (like the fixed saveStructure method)
    const deleteResult = await window.dataMerger.deleteUserStructure(copyName);
    expect(deleteResult.success).toBe(true);
    
    const renameResult = await window.dataMerger.saveUserStructure(newName, copiedStructure);
    expect(renameResult.success).toBe(true);
    
    // Step 6: Verify rename worked in all access methods
    console.log('Step 6: Verifying rename...');
    
    const afterRename = getAllStructures();
    expect(afterRename[copyName]).toBeUndefined(); // Old name should be gone
    expect(afterRename[newName]).toBeDefined(); // New name should exist
    expect(TileStructures.structures[newName]).toBeDefined(); // Should be in global too
    
    console.log('✓ Rename successful');
    
    // Step 7: Verify persistence across "page reload"
    console.log('Step 7: Testing persistence...');
    
    // Simulate page reload by creating new DataMerger
    const newDataMerger = new DataMerger();
    await newDataMerger.initialize();
    
    const afterReload = newDataMerger.getAllStructures();
    expect(afterReload[newName]).toBeDefined();
    console.log('✓ Structure persists across reload');
    
    console.log('=== End-to-End Test Complete ===');
    
    // Final verification
    const finalCount = Object.keys(afterReload).length;
    expect(finalCount).toBe(initialCount + 1); // Should have one more structure
  });
});