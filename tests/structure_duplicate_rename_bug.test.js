/**
 * Test for the duplicate and rename bug fix - DataMerger level tests
 */

describe('Structure Duplication and Renaming Bug Fix', () => {
  beforeEach(() => {
    // Clear localStorage and reset state
    localStorage.clear();
    delete window.dataMerger;
  });

  test('DataMerger should handle rename operations for copied structures gracefully', async () => {
    // Import the necessary modules
    const { DataMerger } = await import('../docs/dungeon/persistence/data_merger.js');
    const { isBuiltInStructure } = await import('../docs/dungeon/defaults/default_tile_structures.js');
    
    // Set up DataMerger
    const dataMerger = new DataMerger();
    await dataMerger.initialize();
    
    // Get a built-in structure
    const allStructures = dataMerger.getAllStructures();
    const builtInStructureId = Object.keys(allStructures)[0]; 
    expect(builtInStructureId).toBeDefined();
    expect(isBuiltInStructure(builtInStructureId)).toBe(true);
    
    // Simulate copying a built-in structure (like the duplicate function does)
    const copyName = `${builtInStructureId}_copy`;
    const originalStructure = allStructures[builtInStructureId];
    const copiedStructure = {
      structure: JSON.parse(JSON.stringify(originalStructure.structure)),
      edges: [...originalStructure.edges],
      type: originalStructure.type
    };
    
    // Save the copy as a user structure
    const saveResult = await dataMerger.saveUserStructure(copyName, copiedStructure);
    expect(saveResult.success).toBe(true);
    
    // Verify the copy exists
    const structuresAfterCopy = dataMerger.getAllStructures();
    expect(structuresAfterCopy[copyName]).toBeDefined();
    
    // Now simulate renaming (this was the failing case)
    const newName = 'renamed_test_structure';
    
    // First, try to delete the old structure (this should work even if it doesn't exist in user data)
    const deleteResult = await dataMerger.deleteUserStructure(copyName);
    expect(deleteResult.success).toBe(true);
    
    // Then save with new name
    const renameResult = await dataMerger.saveUserStructure(newName, copiedStructure);
    expect(renameResult.success).toBe(true);
    
    // Verify rename worked
    const structuresAfterRename = dataMerger.getAllStructures();
    expect(structuresAfterRename[newName]).toBeDefined();
    expect(structuresAfterRename[copyName]).toBeUndefined();
  });

  test('DataMerger should handle attempting to delete non-existent user structures gracefully', async () => {
    // Import the necessary modules
    const { DataMerger } = await import('../docs/dungeon/persistence/data_merger.js');
    
    // Set up DataMerger
    const dataMerger = new DataMerger();
    await dataMerger.initialize();
    
    // Try to delete a structure that doesn't exist in user data
    const deleteResult = await dataMerger.deleteUserStructure('non_existent_structure');
    
    // Should return success=false with specific error message
    expect(deleteResult.success).toBe(false);
    expect(deleteResult.error).toBe('Structure not found in user data');
  });

  test('DataMerger should prevent deletion of built-in structures', async () => {
    // Import the necessary modules
    const { DataMerger } = await import('../docs/dungeon/persistence/data_merger.js');
    const { isBuiltInStructure } = await import('../docs/dungeon/defaults/default_tile_structures.js');
    
    // Set up DataMerger
    const dataMerger = new DataMerger();
    await dataMerger.initialize();
    
    // Get a built-in structure
    const allStructures = dataMerger.getAllStructures();
    const builtInStructureId = Object.keys(allStructures)[0]; 
    expect(isBuiltInStructure(builtInStructureId)).toBe(true);
    
    // Try to delete it
    const deleteResult = await dataMerger.deleteUserStructure(builtInStructureId);
    
    // Should be prevented
    expect(deleteResult.success).toBe(false);
    expect(deleteResult.error).toBe('Cannot delete built-in structures');
  });
});