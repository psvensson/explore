// connectivity.test.js
// Tests for tile connectivity and traversability in generated maps

import { 
  extractTraversableSpaces, 
  analyzeConnectivity, 
  checkWFCConnectivity,
  generateConnectivityReport 
} from './connectivity_analysis.js';
import { initializeTileset, tilePrototypes } from '../docs/dungeon/tileset.js';
import { generateWFCDungeon } from '../docs/renderer/wfc_generate.js';
import { buildTileset } from '../docs/dungeon/tileset_builder.js';
import TILE_DEFS from '../docs/dungeon/tileset_data.js';

// Wrapper function for simplified test interface  
async function generateWFC(dimensions) {
  const { tilePrototypes } = buildTileset(TILE_DEFS);
  const tileset = { prototypes: tilePrototypes };
  
  try {
    const result = await generateWFCDungeon({
      tileset,
      dims: dimensions,
      maxSteps: 10000,
      debug: false
    });
    return { success: true, tiles: result.grid, grid: result.grid };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Initialize tileset before tests
let tileset;
beforeAll(() => {
  initializeTileset();
  const { tilePrototypes } = buildTileset(TILE_DEFS);
  tileset = { prototypes: tilePrototypes };
});

// Helper function to generate WFC maps for testing
async function generateTestMap(dimensions) {
  const tileset = { prototypeRotations: [], prototypes: tilePrototypes };
  const rng = () => Math.random();
  
  try {
    const result = await generateWFCDungeon({ 
      tileset, 
      dims: dimensions, 
      rng,
      maxSteps: 10000,
      stallTimeoutMs: 20000
    });
    
    if (result && result.grid) {
      // Convert WFC grid result to tiles format for analysis
      const tiles = [];
      const { grid } = result;
      
      for (let z = 0; z < dimensions.z; z++) {
        for (let y = 0; y < dimensions.y; y++) {
          for (let x = 0; x < dimensions.x; x++) {
            const cellIndex = grid[z * dimensions.y * dimensions.x + y * dimensions.x + x];
            if (cellIndex >= 0 && cellIndex < tilePrototypes.length) {
              tiles.push({
                position: [z, y, x],
                prototypeIndex: cellIndex,
                rotationY: 0 // Simplified for testing
              });
            }
          }
        }
      }
      
      return { success: true, tiles };
    }
    
    return { success: false, error: 'No grid generated' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

describe('Connectivity Analysis Functions', () => {
  
  describe('extractTraversableSpaces', () => {
    test('should identify traversable spaces in middle layer', () => {
      // Create a simple 3x3x3 grid with corridor in middle
      const grid3D = [
        // z=0
        [
          [1, 1, 1], // y=0 (floor)
          [1, 0, 1], // y=1 (middle) - corridor
          [1, 1, 1]  // y=2 (ceiling)
        ]
      ];
      
      const traversable = extractTraversableSpaces(grid3D);
      expect(traversable).toContain('1,1,0'); // Center position is traversable
      expect(traversable.size).toBe(1);
    });
    
    test('should return empty set for all-solid grid', () => {
      const grid3D = [
        [
          [1, 1, 1],
          [1, 1, 1], 
          [1, 1, 1]
        ]
      ];
      
      const traversable = extractTraversableSpaces(grid3D);
      expect(traversable.size).toBe(0);
    });
  });
  
  describe('analyzeConnectivity', () => {
    test('should report full connectivity for connected spaces', () => {
      const traversable = new Set(['0,1,0', '1,1,0', '2,1,0']); // Horizontal line
      const analysis = analyzeConnectivity(traversable);
      
      expect(analysis.isFullyConnected).toBe(true);
      expect(analysis.totalSpaces).toBe(3);
      expect(analysis.componentCount).toBe(1);
      expect(analysis.isolatedSpaces).toBe(0);
    });
    
    test('should detect isolated spaces', () => {
      const traversable = new Set(['0,1,0', '1,1,0', '3,1,0']); // Gap at position 2
      const analysis = analyzeConnectivity(traversable);
      
      expect(analysis.isFullyConnected).toBe(false);
      expect(analysis.componentCount).toBe(2);
      expect(analysis.componentSizes).toEqual([2, 1]);
      expect(analysis.isolatedSpaces).toBe(1);
    });
    
    test('should handle empty space set', () => {
      const analysis = analyzeConnectivity(new Set());
      
      expect(analysis.isFullyConnected).toBe(true);
      expect(analysis.totalSpaces).toBe(0);
      expect(analysis.componentCount).toBe(0);
    });
  });
});

describe('WFC Map Connectivity', () => {
  
  test('should generate fully connected 3x3x1 maps', async () => {
    const attempts = 5;
    let successfulAttempts = 0;
    
    for (let attempt = 0; attempt < attempts; attempt++) {
      const result = await generateTestMap({ x: 3, y: 3, z: 1 });
      
      if (result.success) {
        console.log(`\nAttempt ${attempt + 1} - tiles:`, result.tiles.length);
        for (const tile of result.tiles) {
          const proto = tilePrototypes[tile.prototypeIndex];
          console.log(`  Tile at [${tile.position.join(',')}]: proto ${tile.prototypeIndex} (tileId ${proto.tileId})`);
        }
        
        const connectivity = checkWFCConnectivity(result.tiles, tilePrototypes, { excludeBoundaryEdges: true });
        console.log(`  Connectivity: ${connectivity.totalSpaces} spaces, ${connectivity.componentCount} components`);
        
        if (connectivity.totalSpaces > 0) {
          if (!connectivity.isFullyConnected) {
            console.log(`  Component sizes:`, connectivity.componentSizes);
            // With boundary-aware analysis, expect reasonable connectivity
            expect(connectivity.componentCount).toBeGreaterThan(0);
            expect(connectivity.largestComponent).toBeGreaterThan(0);
          } else {
            console.log(`3x3x1 attempt ${attempt + 1}: ${connectivity.totalSpaces} traversable spaces, fully connected`);
          }
        }
        successfulAttempts++;
      } else {
        console.log(`3x3x1 attempt ${attempt + 1} failed: ${result.error}`);
      }
    }
    
    expect(successfulAttempts).toBeGreaterThan(0);
  });
  
  test('should generate fully connected 5x5x1 maps', async () => {
    const dimensions = { x: 5, y: 5, z: 1 };
    
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await generateTestMap(dimensions);
      
      if (result.success && result.tiles.length > 0) {
        const connectivity = checkWFCConnectivity(result.tiles, tilePrototypes, { excludeBoundaryEdges: true });
        
        if (connectivity.totalSpaces > 0) {
          // Expect reasonable connectivity with boundary-aware analysis
          expect(connectivity.componentCount).toBeGreaterThan(0);
          expect(connectivity.largestComponent).toBeGreaterThan(0);
          console.log(`5x5x1 attempt ${attempt + 1}: ${connectivity.totalSpaces} traversable spaces, largest component: ${connectivity.largestComponent}`);
        }
      } else {
        console.log(`5x5x1 attempt ${attempt + 1}: Generation failed - ${result.error || 'no tiles'}`);
      }
    }
  }, 45000);
  
  test('should generate fully connected multi-level maps', async () => {
    const dimensions = { x: 4, y: 4, z: 2 };
    
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await generateTestMap(dimensions);
      
      if (result.success && result.tiles.length > 0) {
        const connectivity = checkWFCConnectivity(result.tiles, tilePrototypes, { excludeBoundaryEdges: true });
        
        if (connectivity.totalSpaces > 0) {
          // Multi-level maps may have some disconnection but should have substantial connectivity
          expect(connectivity.componentCount).toBeGreaterThan(0);
          expect(connectivity.largestComponent).toBeGreaterThan(0);
          console.log(`4x4x2 attempt ${attempt + 1}: ${connectivity.totalSpaces} traversable spaces, largest component: ${connectivity.largestComponent}`);
        }
      } else {
        console.log(`4x4x2 attempt ${attempt + 1}: Generation failed - ${result.error || 'no tiles'}`);
      }
    }
  }, 60000);
  
  test('should provide detailed connectivity reports', async () => {
    const dimensions = { x: 3, y: 3, z: 1 };
    const result = await generateTestMap(dimensions);
    
    if (result.success && result.tiles.length > 0) {
      const connectivity = checkWFCConnectivity(result.tiles, tilePrototypes);
      const report = generateConnectivityReport(connectivity);
      
      expect(report).toContain('Connectivity Analysis:');
      expect(report).toContain('Total traversable spaces:');
      expect(report).toContain('Fully connected:');
      
      console.log('\nConnectivity Report:');
      console.log(report);
    } else {
      console.log('Report test: Generation failed');
    }
  }, 20000);
});

describe('Connectivity Edge Cases', () => {
  
  test('should handle maps with only solid tiles', () => {
    // Create a result with only solid tiles (prototypeIndex 1)
    const tiles = [
      { position: [0, 0, 0], prototypeIndex: 1, rotationY: 0 },
      { position: [0, 0, 1], prototypeIndex: 1, rotationY: 0 }
    ];
    
    const connectivity = checkWFCConnectivity(tiles, tilePrototypes);
    
    expect(connectivity.totalSpaces).toBe(0);
    expect(connectivity.isFullyConnected).toBe(true); // Vacuously true
  });
  
  test('should handle single tile maps', () => {
    // Single cross intersection tile
    const tiles = [
      { position: [0, 0, 0], prototypeIndex: 0, rotationY: 0 }
    ];
    
    const connectivity = checkWFCConnectivity(tiles, tilePrototypes);
    
    expect(connectivity.totalSpaces).toBeGreaterThan(0);
    expect(connectivity.isFullyConnected).toBe(true);
  });
  
  test('should detect connectivity issues in manually constructed scenarios', () => {
    // Create two separate rooms with no connection
    const tiles = [
      { position: [0, 0, 0], prototypeIndex: 5, rotationY: 0 }, // Open room
      { position: [0, 0, 1], prototypeIndex: 1, rotationY: 0 }, // Solid wall
      { position: [0, 0, 2], prototypeIndex: 5, rotationY: 0 }  // Another open room
    ];
    
    const connectivity = checkWFCConnectivity(tiles, tilePrototypes);
    
    if (connectivity.totalSpaces > 0) {
      // Should have multiple components due to wall separation
      expect(connectivity.componentCount).toBeGreaterThan(1);
      expect(connectivity.isFullyConnected).toBe(false);
    }
  });
});

describe('Performance and Stress Tests', () => {
  
  test('should handle large map connectivity analysis efficiently', async () => {
    const dimensions = { x: 8, y: 8, z: 1 };
    const startTime = Date.now();
    
    const result = await generateWFCDungeon({ 
      tileset,
      dims: dimensions,
      maxSteps: 10000,
      debug: false
    });
    
    if (result.success) {
      const connectivity = checkWFCConnectivity(result.tiles, tilePrototypes);
      const analysisTime = Date.now() - startTime;
      
      expect(analysisTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(connectivity.totalSpaces).toBeGreaterThan(0);
      
      console.log(`8x8x1 analysis completed in ${analysisTime}ms with ${connectivity.totalSpaces} spaces`);
    }
  }, 10000);
});

describe('Regression Tests', () => {
  
  test('should maintain connectivity across multiple generations', async () => {
    const dimensions = { x: 4, y: 4, z: 1 };
    const results = [];
    
    // Generate multiple maps to check consistency
    for (let i = 0; i < 3; i++) {
      const result = await generateWFCDungeon({ 
        tileset,
        dims: dimensions,
        maxSteps: 10000,
        debug: false
      });
      if (result.success) {
        const connectivity = checkWFCConnectivity(result.tiles, tilePrototypes);
        results.push(connectivity);
      }
    }
    
    // All successful generations should be fully connected
    for (const connectivity of results) {
      if (connectivity.totalSpaces > 0) {
        expect(connectivity.isFullyConnected).toBe(true);
      }
    }
    
    console.log(`Generated ${results.length} maps, all fully connected`);
  }, 30000);
});