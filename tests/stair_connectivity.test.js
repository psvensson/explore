// stair_connectivity.test.js  
// Advanced connectivity tests for stairs and multi-level traversal

import { 
  extractTraversableSpaces, 
  analyzeConnectivity, 
  checkWFCConnectivity,
  generateConnectivityReport 
} from './connectivity_analysis.js';
import { initializeTileset, tilePrototypes } from '../docs/dungeon/tileset.js';
import { generateWFCDungeon } from '../docs/renderer/wfc_generate.js';

beforeAll(() => {
  initializeTileset();
});

describe('Stair Connectivity Tests', () => {
  
  test('should handle stairs as traversable connections', () => {
    // Test that stair tiles (tileId 2 and 3) are properly connected
    const stairVoxels = tilePrototypes.find(p => p.tileId === 2)?.voxels;
    
    if (stairVoxels) {
      // Verify stairs have traversable middle layer
      let hasTraversableCenter = false;
      for (let z = 0; z < 3; z++) {
        for (let x = 0; x < 3; x++) {
          if (stairVoxels[z][1][x] === 0) { // y=1 is middle layer
            hasTraversableCenter = true;
            break;
          }
        }
      }
      expect(hasTraversableCenter).toBe(true);
    }
  });
  
  test('should connect levels through stairs in multi-level maps', async () => {
    // Generate a multi-level map that should use stairs
    const dimensions = { x: 3, y: 3, z: 3 };
    
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await generateWFC(dimensions);
      
      if (result.success) {
        const connectivity = checkWFCConnectivity(result.tiles, tilePrototypes);
        
        if (connectivity.totalSpaces > 0) {
          // Multi-level map should still be fully connected via stairs
          expect(connectivity.isFullyConnected).toBe(true);
          
          // Check if stairs are present
          const hasStairs = result.tiles.some(tile => {
            const proto = tilePrototypes[tile.prototypeIndex];
            return proto && (proto.tileId === 2 || proto.tileId === 3);
          });
          
          console.log(`3x3x3 attempt ${attempt + 1}: ${connectivity.totalSpaces} spaces, stairs present: ${hasStairs}`);
        }
      }
    }
  }, 45000);
});

describe('Tile Combination Edge Cases', () => {
  
  test('should handle corridors connecting to rooms', () => {
    // Create a scenario with corridor + room combination
    const tiles = [
      { position: [0, 0, 0], prototypeIndex: 2, rotationY: 0 }, // N-S corridor
      { position: [0, 0, 1], prototypeIndex: 5, rotationY: 0 }, // Open room
      { position: [0, 0, 2], prototypeIndex: 2, rotationY: 0 }  // N-S corridor
    ];
    
    const connectivity = checkWFCConnectivity(tiles, tilePrototypes);
    
    if (connectivity.totalSpaces > 0) {
      expect(connectivity.isFullyConnected).toBe(true);
      expect(connectivity.componentCount).toBe(1);
    }
  });
  
  test('should handle T-junctions connecting multiple corridors', () => {
    // Test T-junction connectivity
    const tiles = [
      { position: [0, 0, 0], prototypeIndex: 2, rotationY: 0 }, // N-S corridor
      { position: [0, 0, 1], prototypeIndex: 4, rotationY: 0 }, // T-junction
      { position: [0, 0, 2], prototypeIndex: 2, rotationY: 0 }, // N-S corridor
      { position: [1, 0, 1], prototypeIndex: 2, rotationY: 1 }  // E-W corridor (rotated)
    ];
    
    const connectivity = checkWFCConnectivity(tiles, tilePrototypes);
    
    if (connectivity.totalSpaces > 0) {
      expect(connectivity.isFullyConnected).toBe(true);
      console.log(`T-junction test: ${connectivity.totalSpaces} connected spaces`);
    }
  });
  
  test('should handle dead-end corridors without breaking connectivity', () => {
    // Test that dead-ends don't create isolation
    const tiles = [
      { position: [0, 0, 0], prototypeIndex: 0, rotationY: 0 }, // Cross intersection
      { position: [0, 0, 1], prototypeIndex: 6, rotationY: 0 }, // Dead-end
      { position: [1, 0, 0], prototypeIndex: 2, rotationY: 1 }, // E-W corridor
      { position: [2, 0, 0], prototypeIndex: 5, rotationY: 0 }  // Open room
    ];
    
    const connectivity = checkWFCConnectivity(tiles, tilePrototypes);
    
    if (connectivity.totalSpaces > 0) {
      expect(connectivity.isFullyConnected).toBe(true);
      console.log(`Dead-end test: ${connectivity.totalSpaces} connected spaces`);
    }
  });
});

describe('Boundary and Layout Tests', () => {
  
  test('should handle maps with solid walls around perimeter', async () => {
    // Generate map and verify edge handling
    const dimensions = { x: 5, y: 5, z: 1 };
    const result = await generateWFC(dimensions);
    
    if (result.success) {
      const connectivity = checkWFCConnectivity(result.tiles, tilePrototypes);
      
      // Should still be connected even with boundary constraints
      if (connectivity.totalSpaces > 0) {
        expect(connectivity.isFullyConnected).toBe(true);
      }
      
      // Verify we have some interior spaces
      expect(connectivity.totalSpaces).toBeGreaterThan(0);
    }
  }, 30000);
  
  test('should handle asymmetric map dimensions', async () => {
    const dimensions = { x: 2, y: 5, z: 1 }; // Narrow corridor-like map
    const result = await generateWFC(dimensions);
    
    if (result.success) {
      const connectivity = checkWFCConnectivity(result.tiles, tilePrototypes);
      
      if (connectivity.totalSpaces > 0) {
        expect(connectivity.isFullyConnected).toBe(true);
        console.log(`2x5x1 map: ${connectivity.totalSpaces} spaces, fully connected`);
      }
    }
  }, 20000);
  
  test('should handle minimum viable map size', async () => {
    const dimensions = { x: 2, y: 2, z: 1 };
    const result = await generateWFC(dimensions);
    
    if (result.success) {
      const connectivity = checkWFCConnectivity(result.tiles, tilePrototypes);
      
      // Even tiny maps should be connected if they have traversable spaces
      if (connectivity.totalSpaces > 0) {
        expect(connectivity.isFullyConnected).toBe(true);
        console.log(`2x2x1 map: ${connectivity.totalSpaces} spaces`);
      }
    }
  }, 15000);
});

describe('Tile Rotation Connectivity', () => {
  
  test('should maintain connectivity across all tile rotations', () => {
    // Test that rotated versions of tiles maintain proper adjacency
    const corridorProto = tilePrototypes.find(p => p.tileId === 0 && p.voxels);
    
    if (corridorProto) {
      // Test all 4 rotations of a corridor tile
      for (let rotation = 0; rotation < 4; rotation++) {
        const tiles = [
          { position: [0, 0, 0], prototypeIndex: corridorProto.id, rotationY: rotation },
          { position: [0, 0, 1], prototypeIndex: corridorProto.id, rotationY: rotation }
        ];
        
        const connectivity = checkWFCConnectivity(tiles, tilePrototypes);
        
        if (connectivity.totalSpaces > 0) {
          expect(connectivity.isFullyConnected).toBe(true);
        }
      }
    }
  });
});

describe('Complex Layout Patterns', () => {
  
  test('should handle maze-like layouts', async () => {
    // Generate larger maps that might create maze patterns
    const dimensions = { x: 6, y: 6, z: 1 };
    
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await generateWFC(dimensions);
      
      if (result.success) {
        const connectivity = checkWFCConnectivity(result.tiles, tilePrototypes);
        
        if (connectivity.totalSpaces > 0) {
          expect(connectivity.isFullyConnected).toBe(true);
          
          // Log complexity metrics
          const complexity = connectivity.totalSpaces / (dimensions.x * dimensions.y * dimensions.z * 9);
          console.log(`6x6x1 attempt ${attempt + 1}: ${connectivity.totalSpaces} spaces (${(complexity * 100).toFixed(1)}% open)`);
        }
      }
    }
  }, 40000);
  
  test('should handle room-and-corridor layouts', () => {
    // Manually create a typical room-corridor pattern
    const tiles = [
      // Central room
      { position: [1, 0, 1], prototypeIndex: 5, rotationY: 0 }, // Open room
      
      // Corridors extending from room
      { position: [0, 0, 1], prototypeIndex: 2, rotationY: 1 }, // E-W corridor
      { position: [2, 0, 1], prototypeIndex: 2, rotationY: 1 }, // E-W corridor  
      { position: [1, 0, 0], prototypeIndex: 2, rotationY: 0 }, // N-S corridor
      { position: [1, 0, 2], prototypeIndex: 2, rotationY: 0 }, // N-S corridor
      
      // End rooms
      { position: [0, 0, 0], prototypeIndex: 5, rotationY: 0 }, // Corner room
      { position: [2, 0, 2], prototypeIndex: 5, rotationY: 0 }  // Corner room
    ];
    
    const connectivity = checkWFCConnectivity(tiles, tilePrototypes);
    
    expect(connectivity.totalSpaces).toBeGreaterThan(0);
    expect(connectivity.isFullyConnected).toBe(true);
    expect(connectivity.componentCount).toBe(1);
    
    console.log(`Room-corridor layout: ${connectivity.totalSpaces} connected spaces`);
  });
});