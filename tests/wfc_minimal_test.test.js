// wfc_minimal_test.test.js
// Test WFC with minimal tileset to identify the core issue

import { generateWFCDungeon } from '../docs/renderer/wfc_generate.js';
import { initializeTileset, tilePrototypes } from '../docs/dungeon/tileset.js';

describe('WFC Minimal Test', () => {
  beforeAll(() => {
    initializeTileset();
  });

  test('should analyze rule generation problems', async () => {
    console.log('\n=== WFC MINIMAL ANALYSIS ===');
    
    // Get just corridor tiles (no stairs) to see if basic generation works
    const corridorTiles = tilePrototypes.filter(p => p.meta?.role !== 'stair');
    console.log(`Total tiles: ${tilePrototypes.length}`);
    console.log(`Corridor tiles: ${corridorTiles.length}`);
    
    // Try generation with just corridors
    try {
      console.log('\n=== TESTING CORRIDOR-ONLY GENERATION ===');
      const result = await generateWFCDungeon({
        NDWFC3D: undefined,
        tileset: { prototypes: corridorTiles },
        dims: { x: 2, y: 2, z: 1 },
        rng: () => Math.random(),
        maxSteps: 3000,
        stallTimeoutMs: 3000,
        debug: true
      });
      
      if (result.success) {
        console.log('✅ Corridor-only generation succeeded');
        console.log('This means stairs are causing the WFC failure');
      }
    } catch (error) {
      console.log(`❌ Corridor-only generation failed: ${error.message}`);
      console.log('This means the base tileset has fundamental issues');
    }
    
    // Check for obviously problematic tiles
    console.log('\n=== CHECKING FOR PROBLEMATIC TILES ===');
    
    tilePrototypes.forEach(tile => {
      if (tile.meta?.weight === 0) {
        console.log(`⚠️  Tile ${tile.tileId} has weight 0 - will never be placed`);
      }
      if (tile.meta?.weight > 20) {
        console.log(`⚠️  Tile ${tile.tileId} has very high weight ${tile.meta.weight} - may dominate`);
      }
    });
    
    // Check if we have a reasonable distribution of tile types
    const weights = tilePrototypes.map(t => t.meta?.weight || 1);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const avgWeight = totalWeight / weights.length;
    
    console.log(`Weight distribution: min=${Math.min(...weights)}, max=${Math.max(...weights)}, avg=${avgWeight.toFixed(2)}`);
    
    // Check if any tiles are isolated (can't connect to anything)
    console.log('\n=== CHECKING FOR ISOLATED TILES ===');
    
    // This is a simplified check - real WFC rule generation is more complex
    let potentiallyIsolated = 0;
    
    tilePrototypes.forEach(tile => {
      if (tile.meta?.role === 'stair' && tile.meta?.weight < 0.5) {
        console.log(`⚠️  Stair tile ${tile.tileId} has very low weight ${tile.meta.weight} - may never be placed`);
        potentiallyIsolated++;
      }
    });
    
    if (potentiallyIsolated > 0) {
      console.log(`Found ${potentiallyIsolated} potentially isolated tiles`);
    }
  });
});