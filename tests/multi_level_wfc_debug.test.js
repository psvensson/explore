// multi_level_wfc_debug.test.js
// Debug why WFC stalls on multi-level maps

import { generateWFCDungeon } from '../docs/renderer/wfc_generate.js';
import { initializeTileset, tilePrototypes } from '../docs/dungeon/tileset.js';

describe('Multi-Level WFC Debug', () => {
  beforeAll(() => {
    initializeTileset();
  });

  test('should identify why WFC stalls on height > 1', async () => {
    console.log('\n=== DEBUGGING MULTI-LEVEL WFC STALL ===');
    
    // Check tileset composition
    const stairs = tilePrototypes.filter(p => p.meta?.role === 'stair');
    const nonStairs = tilePrototypes.filter(p => p.meta?.role !== 'stair');
    
    console.log(`Total tiles: ${tilePrototypes.length}`);
    console.log(`Stair tiles: ${stairs.length}`);
    console.log(`Non-stair tiles: ${nonStairs.length}`);
    
    stairs.forEach(stair => {
      console.log(`Stair ${stair.tileId}: axis=${stair.meta.axis}, dir=${stair.meta.dir}, weight=${stair.meta.weight}`);
      console.log(`  stairRole: ${stair.meta.stairRole || 'UNDEFINED'}`);
      console.log(`  Has vertical constraints: ${!!(stair.meta.requiredAboveEmpty || stair.meta.requiredBelowEmpty)}`);
    });
    
    // Check if stairs have proper layer structures for multi-level
    console.log('\n=== STAIR LAYER ANALYSIS ===');
    stairs.forEach(stair => {
      console.log(`\nStair ${stair.tileId} layers:`);
      if (stair.layers) {
        stair.layers.forEach((layer, i) => {
          const layerName = i === 0 ? 'floor' : i === 1 ? 'middle' : 'ceiling';
          console.log(`  ${layerName}: ${JSON.stringify(layer)}`);
        });
      } else {
        console.log('  No layers property found');
      }
    });
    
    // Try a simple 2x2x2 generation to see where it fails
    console.log('\n=== ATTEMPTING 2x2x2 GENERATION ===');
    
    try {
      const result = await generateWFCDungeon({
        NDWFC3D: undefined,
        tileset: { prototypes: tilePrototypes },
        dims: { x: 2, y: 2, z: 2 },
        rng: () => Math.random(),
        maxSteps: 5000,
        stallTimeoutMs: 5000,
        debug: true
      });
      
      if (result.success) {
        console.log('✅ 2x2x2 generation succeeded');
      } else {
        console.log('❌ 2x2x2 generation failed but no exception');
      }
    } catch (error) {
      console.log(`❌ 2x2x2 generation failed: ${error.message}`);
      
      // This confirms the issue - now let's understand why
      console.log('\n=== ANALYZING WHY WFC STALLS ===');
      
      // Check if we have vertical stacking rules
      let hasVerticalRules = false;
      tilePrototypes.forEach(tile => {
        if (tile.meta?.stairRole || tile.meta?.requiredAboveEmpty) {
          hasVerticalRules = true;
        }
      });
      
      console.log(`Has vertical stacking rules: ${hasVerticalRules}`);
      
      if (!hasVerticalRules) {
        console.log('⚠️  ISSUE IDENTIFIED: No vertical stacking metadata');
        console.log('   Multi-level WFC needs stairRole and vertical constraints');
      }
      
      // Check if stairs can actually connect vertically
      const upperStairs = stairs.filter(s => s.layers[0].some(layer => layer.includes('0')));
      const lowerStairs = stairs.filter(s => s.layers[2].some(layer => layer.includes('0')));
      
      console.log(`Stairs with open floors (potential upper): ${upperStairs.length}`);
      console.log(`Stairs with open ceilings (potential lower): ${lowerStairs.length}`);
      
      if (upperStairs.length === 0 || lowerStairs.length === 0) {
        console.log('⚠️  ISSUE IDENTIFIED: Stairs cannot stack vertically');
        console.log('   Need stairs with open floor/ceiling for vertical connections');
      }
    }
  });
  
  test('should compare against working 2D generation', async () => {
    console.log('\n=== COMPARING 2D vs 3D GENERATION ===');
    
    try {
      // Try 2x2x1 (should work)
      const result2D = await generateWFCDungeon({
        NDWFC3D: undefined,
        tileset: { prototypes: tilePrototypes },
        dims: { x: 3, y: 3, z: 1 },
        rng: () => Math.random(),
        maxSteps: 5000,
        stallTimeoutMs: 5000
      });
      
      if (result2D.success) {
        console.log('✅ 3x3x1 generation succeeded');
      } else {
        console.log('❌ Even 2D generation is failing!');
      }
    } catch (error) {
      console.log(`❌ 3x3x1 generation failed: ${error.message}`);
      console.log('This suggests the problem is not just vertical - basic WFC is broken');
    }
  });
});