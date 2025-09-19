// test_3d_generation.test.js
// Test the original 3x3x3 generation that was failing

import { generateWFCDungeon } from '../docs/renderer/wfc_generate.js';
import { buildTileset } from '../docs/dungeon/tileset_builder.js';
import TILE_DEFS from '../docs/dungeon/tileset_data.js';

describe('3D WFC Generation', () => {
  test('should generate 3x3x3 map without errors', async () => {
    console.log('\n=== TESTING 3D GENERATION ===');
    
    // Build tileset
    const { tilePrototypes } = buildTileset(TILE_DEFS);
    
    const tileset = {
      prototypes: tilePrototypes
    };
    
    // Test the original failing case: 3x3x3
    const dims = { x: 3, y: 3, z: 3 };
    
    console.log('Attempting 3x3x3 generation...');
    
    try {
      const result = await generateWFCDungeon({
        tileset,
        dims,
        maxSteps: 10000,
        debug: true
      });
      
      console.log('✅ 3x3x3 generation succeeded!');
      console.log('Generated cells:', Object.keys(result.grid || {}).length);
      
      // Also test some 2D cases
      console.log('\nTesting 2D generation...');
      const result2D = await generateWFCDungeon({
        tileset,
        dims: { x: 5, y: 5, z: 1 },
        maxSteps: 10000,
        debug: true
      });
      
      console.log('✅ 5x5x1 generation succeeded!');
      console.log('Generated cells:', Object.keys(result2D.grid || {}).length);
      
    } catch (error) {
      console.error('❌ Generation failed:', error.message);
      throw error;
    }
  });
});