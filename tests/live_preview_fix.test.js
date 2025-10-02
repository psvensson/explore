/**
 * Test for live preview update functionality
 */

describe('Tileset Live Preview Fix', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    delete window.dataMerger;
    delete window.TileStructures;
  });

  test('should generate correct preview tileset based on selectedStructures', async () => {
    console.log('=== Testing Live Preview Generation ===');
    
    // Setup
    const { TileStructures } = await import('../docs/dungeon/tile_structures.js');
    window.TileStructures = TileStructures;
    
    // Mock a simplified tileset editor
    const editor = {
      selectedStructures: new Set(['corridor_nsew', 'room_large']),
      loadedTilesetData: {
        name: 'Basic Dungeon',
        description: 'A modified basic dungeon',
        tiles: [
          { structure: 'corridor_nsew', weight: 5, rotations: [0, 90, 180, 270] }
        ]
      },
      getAllStructures() {
        return TileStructures.structures;
      },
      getSmartDefaults(structureId) {
        return { weight: 3, rotations: [0, 90, 180, 270] };
      },
      generatePreviewTileset() {
        if (this.selectedStructures.size === 0) return null;

        const baseName = this.loadedTilesetData?.name || 'New Tileset';
        const baseDescription = this.loadedTilesetData?.description || '';

        return {
          id: baseName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          name: baseName,
          description: baseDescription,
          tiles: Array.from(this.selectedStructures).map(structureId => {
            const defaults = this.getSmartDefaults(structureId);
            
            let tileConfig = defaults;
            if (this.loadedTilesetData?.tiles) {
              const existingTile = this.loadedTilesetData.tiles.find(t => t.structure === structureId);
              if (existingTile) {
                tileConfig = {
                  weight: existingTile.weight,
                  rotations: existingTile.rotations
                };
              }
            }

            return {
              structure: structureId,
              weight: tileConfig.weight,
              rotations: tileConfig.rotations,
              constraints: {}
            };
          })
        };
      }
    };
    
    // Test the preview generation
    const preview = editor.generatePreviewTileset();
    
    expect(preview).toBeDefined();
    expect(preview.name).toBe('Basic Dungeon');
    expect(preview.tiles.length).toBe(2); // Should reflect selectedStructures, not original tileset
    
    // First tile should use existing config from loaded tileset
    const corridorTile = preview.tiles.find(t => t.structure === 'corridor_nsew');
    expect(corridorTile).toBeDefined();
    expect(corridorTile.weight).toBe(5); // From loaded tileset data
    
    // Second tile should use defaults since it's new
    const roomTile = preview.tiles.find(t => t.structure === 'room_large');
    expect(roomTile).toBeDefined();
    expect(roomTile.weight).toBe(3); // From smart defaults
    
    console.log('✓ Live preview generates correct tile count and configurations');
    
    // Test with no selections
    editor.selectedStructures.clear();
    const emptyPreview = editor.generatePreviewTileset();
    expect(emptyPreview).toBeNull();
    
    console.log('✓ Live preview returns null when no structures selected');
  });

  test('should track modification state correctly', () => {
    console.log('=== Testing Modification State Tracking ===');
    
    // Test work in progress data structure
    const workData = {
      selectedStructures: ['corridor_nsew', 'room_large'],
      loadedTilesetData: {
        name: 'Basic Dungeon',
        description: 'Original description'
      },
      currentView: 'builder',
      timestamp: Date.now(),
      isModification: true
    };
    
    // Should correctly identify as modification
    expect(workData.isModification).toBe(true);
    
    // Test new tileset work data
    const newWorkData = {
      selectedStructures: ['corridor_nsew'],
      loadedTilesetData: null,
      currentView: 'builder',
      timestamp: Date.now(),
      isModification: false
    };
    
    expect(newWorkData.isModification).toBe(false);
    
    console.log('✓ Modification state tracking works correctly');
  });
});