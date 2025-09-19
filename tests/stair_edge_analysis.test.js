// stair_edge_analysis.test.js
// Test to analyze edge patterns of stair tiles vs other tiles for WFC compatibility

import TILE_DEFS from '../docs/dungeon/tileset_data.js';

// Extract edges from a tile's middle layer for pattern matching
function extractEdges(layers) {
  const middle = layers[1]; // Middle layer determines connectivity
  if (typeof middle[0] === 'string') {
    // Handle 3x3 grid format
    return {
      north: middle[0],
      south: middle[2], 
      east: middle[0][2] + middle[1][2] + middle[2][2],
      west: middle[0][0] + middle[1][0] + middle[2][0]
    };
  }
  // Handle old string array format
  return {
    north: middle[0],
    south: middle[2],
    east: middle[0][2] + middle[1][2] + middle[2][2],
    west: middle[0][0] + middle[1][0] + middle[2][0]
  };
}

// Check if two edges are compatible (can connect)
function edgesCompatible(edge1, edge2) {
  if (edge1.length !== edge2.length) return false;
  
  // Edges are compatible if they have matching openings/walls
  for (let i = 0; i < edge1.length; i++) {
    const char1 = edge1[i];
    const char2 = edge2[i];
    
    // Both must be passable (0 or 2) or both must be walls (1)
    const isPassable1 = (char1 === '0' || char1 === '2');
    const isPassable2 = (char2 === '0' || char2 === '2');
    
    if (isPassable1 !== isPassable2) {
      return false;
    }
  }
  return true;
}

describe('Stair Edge Pattern Analysis', () => {
  let stairTiles = [];
  let nonStairTiles = [];
  
  beforeAll(() => {
    // Separate stair tiles from other tiles
    TILE_DEFS.forEach(tile => {
      if (tile.meta?.role === 'stair') {
        stairTiles.push(tile);
      } else {
        nonStairTiles.push(tile);
      }
    });
  });

  test('should identify all stair tiles', () => {
    console.log('Found stair tiles:', stairTiles.map(t => `${t.tileId} (${t.meta?.axis} ${t.meta?.dir})`));
    expect(stairTiles.length).toBeGreaterThan(0);
  });

  test('should analyze stair edge patterns', () => {
    console.log('\n=== STAIR EDGE PATTERNS ===');
    
    stairTiles.forEach(tile => {
      const edges = extractEdges(tile.layers);
      console.log(`\nStair ${tile.tileId} (${tile.meta?.axis} ${tile.meta?.dir}):`);
      console.log(`  North: ${edges.north}`);
      console.log(`  South: ${edges.south}`);
      console.log(`  East:  ${edges.east}`);
      console.log(`  West:  ${edges.west}`);
      
      // Print the middle layer for visual reference
      console.log('  Middle layer:');
      if (typeof tile.layers[1][0] === 'string') {
        tile.layers[1].forEach((row, i) => {
          console.log(`    ${row} // ${i === 0 ? 'N' : i === 1 ? 'M' : 'S'}`);
        });
      }
    });
  });

  test('should find non-stair tiles that stairs could connect to', () => {
    console.log('\n=== CORRIDOR/ROOM EDGE PATTERNS ===');
    
    const corridorEdges = new Set();
    
    nonStairTiles.slice(0, 8).forEach(tile => { // Check first 8 non-stair tiles
      const edges = extractEdges(tile.layers);
      console.log(`\nTile ${tile.tileId}:`);
      console.log(`  North: ${edges.north}`);
      console.log(`  South: ${edges.south}`);
      console.log(`  East:  ${edges.east}`);
      console.log(`  West:  ${edges.west}`);
      
      // Collect unique edge patterns
      corridorEdges.add(edges.north);
      corridorEdges.add(edges.south);
      corridorEdges.add(edges.east);
      corridorEdges.add(edges.west);
    });
    
    console.log('\nUnique corridor edge patterns:', Array.from(corridorEdges));
  });

  test('should check stair compatibility with corridors', () => {
    console.log('\n=== STAIR-CORRIDOR COMPATIBILITY ===');
    
    const compatibilityMatrix = [];
    
    stairTiles.forEach(stair => {
      const stairEdges = extractEdges(stair.layers);
      const compatibility = {
        stairId: stair.tileId,
        compatibleWith: []
      };
      
      nonStairTiles.slice(0, 8).forEach(corridor => {
        const corridorEdges = extractEdges(corridor.layers);
        
        // Check all directional combinations
        const connections = {
          'stair-north-to-corridor-south': edgesCompatible(stairEdges.north, corridorEdges.south),
          'stair-south-to-corridor-north': edgesCompatible(stairEdges.south, corridorEdges.north),
          'stair-east-to-corridor-west': edgesCompatible(stairEdges.east, corridorEdges.west),
          'stair-west-to-corridor-east': edgesCompatible(stairEdges.west, corridorEdges.east)
        };
        
        const hasConnection = Object.values(connections).some(c => c);
        
        if (hasConnection) {
          compatibility.compatibleWith.push({
            tileId: corridor.tileId,
            connections: Object.entries(connections).filter(([k,v]) => v).map(([k,v]) => k)
          });
        }
      });
      
      compatibilityMatrix.push(compatibility);
      
      console.log(`\nStair ${stair.tileId} compatibility:`);
      if (compatibility.compatibleWith.length === 0) {
        console.log('  ❌ NO COMPATIBLE CONNECTIONS FOUND');
      } else {
        compatibility.compatibleWith.forEach(compat => {
          console.log(`  ✅ Connects to tile ${compat.tileId}: ${compat.connections.join(', ')}`);
        });
      }
    });
    
    // Fail test if any stair has no connections
    const problematicStairs = compatibilityMatrix.filter(c => c.compatibleWith.length === 0);
    if (problematicStairs.length > 0) {
      console.log('\n❌ STAIRS WITH NO CONNECTIONS:', problematicStairs.map(s => s.stairId));
    }
    
    expect(problematicStairs.length).toBe(0);
  });
});