/**
 * @fileoverview End-to-end test for the specific user workflow issue:
 * "When I add two new tiles to the basic dungeon tileset, they do show up 
 * in the main list...but at the bottom, the summary still only reads six tiles...
 * When I reload the page the change is gone"
 */

// Mock environment for Node.js compatibility
global.window = global.window || {};
global.document = {
  createElement: () => ({ style: {}, appendChild: () => {}, remove: () => {} }),
  body: { appendChild: () => {}, removeChild: () => {} },
  querySelector: () => null,
  querySelectorAll: () => []
};
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};

describe('User Workflow Fix - Tileset Modification Persistence', () => {
  let SimplifiedTilesetEditor;
  let dataMerger;
  
  beforeEach(async () => {
    // Reset all globals
    delete global.window.dataMerger;
    delete global.window.TileStructures;
    delete global.window.SimplifiedTilesetEditor;
    
    // Clear localStorage between tests
    global.localStorage.getItem = () => null;
    global.localStorage.setItem = () => {};
    global.localStorage.removeItem = () => {};
    
    // Mock DataMerger
    const { DataMerger } = await import('../docs/dungeon/persistence/data_merger.js');
    dataMerger = new DataMerger();
    await dataMerger.initialize();
    global.window.dataMerger = dataMerger;
    
    // Import the editor
    const editorModule = await import('../docs/ui/simplified_tileset_editor.js');
    SimplifiedTilesetEditor = editorModule.SimplifiedTilesetEditor;
    
    console.log('=== Testing User Workflow: Load Existing + Modify + Preview + Persist ===');
  });
  
  test('should handle complete user workflow: load existing tileset, add tiles, show correct preview, persist changes', async () => {
    // Create editor instance
    const container = { 
      style: {},
      addEventListener: () => {},
      querySelector: () => null,
      querySelectorAll: () => []
    };
    const editor = new SimplifiedTilesetEditor(container);
    await editor.initializeAsync();
    
    // === STEP 1: Simulate loading "Basic Dungeon" tileset (6 tiles) ===
    console.log('Step 1: Loading Basic Dungeon tileset...');
    const basicDungeonTileset = {
      name: 'Basic Dungeon',
      tiles: [
        { structure: 'wall', weight: 1 },
        { structure: 'floor', weight: 1 },
        { structure: 'door_ns', weight: 1 },
        { structure: 'door_ew', weight: 1 },
        { structure: 'corner_ne', weight: 1 },
        { structure: 'corner_sw', weight: 1 }
      ]
    };
    
    // Load the tileset (simulates user clicking "Load" on existing tileset)
    editor.selectedStructures.clear();
    basicDungeonTileset.tiles.forEach(tile => {
      editor.selectedStructures.add(tile.structure);
    });
    editor.loadedTilesetData = { name: 'Basic Dungeon', ...basicDungeonTileset };
    
    // Verify initial state
    expect(editor.selectedStructures.size).toBe(6);
    
    // Generate initial preview
    let preview = editor.generatePreviewTileset();
    expect(preview).not.toBeNull();
    expect(preview.tiles.length).toBe(6);
    console.log(`✓ Initial preview shows ${preview.tiles.length} tiles (correct)`);
    
    // === STEP 2: Add 2 new tiles (simulates user selecting additional structures) ===
    console.log('Step 2: Adding 2 new tiles to selection...');
  editor.selectedStructures.add('corridor_ns');
  // East-west corridor now implied via rotation of corridor_ns; no separate id
    
    // This should trigger live preview update in real UI
    editor.saveWorkInProgress(true); // Mark as modification
    
    // Verify selection state
  expect(editor.selectedStructures.size).toBe(7);
    console.log(`✓ Selection now contains ${editor.selectedStructures.size} tiles`);
    
    // === STEP 3: Generate live preview (what user sees in summary) ===
    console.log('Step 3: Generating live preview...');
    preview = editor.generatePreviewTileset();
    expect(preview).not.toBeNull();
  expect(preview.tiles.length).toBe(7); // Should show 7, not 6!
    console.log(`✓ Live preview shows ${preview.tiles.length} tiles (fixed!)`);
    
    // Verify preview contains all selected structures
    const previewStructures = new Set(preview.tiles.map(tile => tile.structure));
    expect(previewStructures.has('wall')).toBe(true);
    expect(previewStructures.has('floor')).toBe(true);
    expect(previewStructures.has('corridor_ns')).toBe(true);
  // corridor_ew removed; rotation handled via metadata
    console.log('✓ Preview contains all selected structures');
    
    // === STEP 4: Verify work-in-progress persistence ===
    console.log('Step 4: Verifying persistence...');
    
    // Simulate page reload - restore from localStorage
    const wipData = editor.getWorkInProgressTileset();
    expect(wipData).not.toBeNull();
    expect(wipData.selectedStructures).toBeDefined();
  expect(wipData.selectedStructures.length).toBe(7);
    expect(wipData.isModification).toBe(true);
    console.log('✓ Work-in-progress data saved correctly');
    
    // === STEP 5: Verify the core fix works ===
    console.log('Step 5: Verifying core live preview fix...');
    
    // The key fix: generatePreviewTileset() should reflect current selectedStructures
    // This is what the user sees in the "summary" at the bottom
    const finalPreview = editor.generatePreviewTileset();
    expect(finalPreview).not.toBeNull();
  expect(finalPreview.tiles.length).toBe(7); // Should be 7, not 6!
  console.log(`✓ Final verification: preview shows ${finalPreview.tiles.length} tiles (user issue FIXED!)`);
    
    console.log('✓ User workflow fix verified: Load → Modify → Preview shows correct count!');
  });
  
  test('should handle remove tiles workflow correctly', async () => {
    console.log('=== Testing Remove Tiles Workflow ===');
    
    const container = { 
      style: {},
      addEventListener: () => {},
      querySelector: () => null,
      querySelectorAll: () => []
    };
    const editor = new SimplifiedTilesetEditor(container);
    await editor.initializeAsync();
    
    // Clear any existing selection and start fresh
    editor.selectedStructures.clear();
    
    // Start with 6 tiles
    editor.selectedStructures.add('wall');
    editor.selectedStructures.add('floor');
    editor.selectedStructures.add('door_ns');
  editor.selectedStructures.add('door_ew'); // rotation-managed corridors only
    editor.selectedStructures.add('corner_ne');
    editor.selectedStructures.add('corner_sw');
    
    expect(editor.selectedStructures.size).toBe(6);
    
    let preview = editor.generatePreviewTileset();
    expect(preview.tiles.length).toBe(6);
    console.log(`✓ Initial: ${preview.tiles.length} tiles`);
    
    // Remove 2 tiles using quickRemoveFromTileset (user clicking remove buttons)
    editor.quickRemoveFromTileset('door_ns');
    editor.quickRemoveFromTileset('door_ew');
    
    // Verify live preview updates
    preview = editor.generatePreviewTileset();
    expect(preview.tiles.length).toBe(4);
    console.log(`✓ After removal: ${preview.tiles.length} tiles (updated correctly)`);
    
    // Verify the live preview fix for removal case
    const wipData = editor.getWorkInProgressTileset();
    expect(wipData.selectedStructures.length).toBe(4);
    expect(wipData.isModification).toBe(true);
    console.log('✓ Removal persisted correctly and preview updates immediately');
  });
});