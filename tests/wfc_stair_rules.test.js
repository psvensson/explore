// wfc_stair_rules.test.js
// Test to examine how many WFC rules are generated for stair tiles

import TILE_DEFS from '../docs/dungeon/tileset_data.js';

// Mock WFC rule generation logic (simplified)
function generateWFCRules(tiles) {
  const rules = [];
  
  // For each tile...
  tiles.forEach((tile, i) => {
    // Generate all rotations if transforms exist
    const rotations = [tile];
    if (tile.transforms) {
      tile.transforms.forEach(transform => {
        // For simplicity, just count the transforms
        rotations.push({...tile, rotated: transform});
      });
    }
    
    rotations.forEach((rotatedTile, r) => {
      // For each direction...
      ['north', 'south', 'east', 'west'].forEach(direction => {
        // Count possible neighbors
        let possibleNeighbors = 0;
        
        tiles.forEach((neighborTile, j) => {
          // Generate neighbor rotations
          const neighborRotations = [neighborTile];
          if (neighborTile.transforms) {
            neighborTile.transforms.forEach(transform => {
              neighborRotations.push({...neighborTile, rotated: transform});
            });
          }
          
          neighborRotations.forEach((rotatedNeighbor, nr) => {
            // Simplified edge compatibility check
            if (edgesCompatible(rotatedTile, rotatedNeighbor, direction)) {
              possibleNeighbors++;
            }
          });
        });
        
        rules.push({
          tile: `${tile.tileId}_r${r}`,
          direction,
          possibleNeighbors,
          isStair: tile.meta?.role === 'stair'
        });
      });
    });
  });
  
  return rules;
}

// Simplified edge compatibility
function edgesCompatible(tile1, tile2, direction) {
  // This is a very simplified version - actual WFC is more complex
  const edges1 = extractEdges(tile1.layers);
  const edges2 = extractEdges(tile2.layers);
  
  const oppositeDir = {north: 'south', south: 'north', east: 'west', west: 'east'};
  const edge1 = edges1[direction];
  const edge2 = edges2[oppositeDir[direction]];
  
  if (!edge1 || !edge2 || edge1.length !== edge2.length) return false;
  
  for (let i = 0; i < edge1.length; i++) {
    const char1 = edge1[i];
    const char2 = edge2[i];
    const isPassable1 = (char1 === '0' || char1 === '2');
    const isPassable2 = (char2 === '0' || char2 === '2');
    if (isPassable1 !== isPassable2) return false;
  }
  return true;
}

function extractEdges(layers) {
  const middle = layers[1];
  return {
    north: middle[0],
    south: middle[2], 
    east: middle[0][2] + middle[1][2] + middle[2][2],
    west: middle[0][0] + middle[1][0] + middle[2][0]
  };
}

describe('WFC Stair Rule Generation', () => {
  test('should count rules generated for each tile type', () => {
    const rules = generateWFCRules(TILE_DEFS);
    
    // Group rules by tile
    const rulesByTile = {};
    rules.forEach(rule => {
      const baseTileId = rule.tile.split('_')[0];
      if (!rulesByTile[baseTileId]) {
        rulesByTile[baseTileId] = {
          totalRules: 0,
          totalNeighbors: 0,
          avgNeighbors: 0,
          isStair: rule.isStair,
          byDirection: {}
        };
      }
      
      rulesByTile[baseTileId].totalRules++;
      rulesByTile[baseTileId].totalNeighbors += rule.possibleNeighbors;
      
      if (!rulesByTile[baseTileId].byDirection[rule.direction]) {
        rulesByTile[baseTileId].byDirection[rule.direction] = 0;
      }
      rulesByTile[baseTileId].byDirection[rule.direction] += rule.possibleNeighbors;
    });
    
    // Calculate averages
    Object.keys(rulesByTile).forEach(tileId => {
      const tile = rulesByTile[tileId];
      tile.avgNeighbors = tile.totalNeighbors / tile.totalRules;
    });
    
    console.log('\n=== WFC RULE GENERATION ANALYSIS ===');
    
    // Show stair tiles vs non-stair tiles
    const stairTiles = Object.entries(rulesByTile).filter(([id, data]) => data.isStair);
    const nonStairTiles = Object.entries(rulesByTile).filter(([id, data]) => !data.isStair);
    
    console.log('\nSTAIR TILES:');
    stairTiles.forEach(([tileId, data]) => {
      console.log(`  Tile ${tileId}: Avg ${data.avgNeighbors.toFixed(1)} neighbors per rule`);
      console.log(`    N:${data.byDirection.north || 0} S:${data.byDirection.south || 0} E:${data.byDirection.east || 0} W:${data.byDirection.west || 0}`);
    });
    
    console.log('\nCORRIDOR/ROOM TILES (first 5):');
    nonStairTiles.slice(0, 5).forEach(([tileId, data]) => {
      console.log(`  Tile ${tileId}: Avg ${data.avgNeighbors.toFixed(1)} neighbors per rule`);
      console.log(`    N:${data.byDirection.north || 0} S:${data.byDirection.south || 0} E:${data.byDirection.east || 0} W:${data.byDirection.west || 0}`);
    });
    
    // Check if stairs are severely limited
    const avgStairNeighbors = stairTiles.reduce((sum, [id, data]) => sum + data.avgNeighbors, 0) / stairTiles.length;
    const avgCorridorNeighbors = nonStairTiles.slice(0, 5).reduce((sum, [id, data]) => sum + data.avgNeighbors, 0) / 5;
    
    console.log(`\nAverage neighbors: Stairs=${avgStairNeighbors.toFixed(1)}, Corridors=${avgCorridorNeighbors.toFixed(1)}`);
    
    if (avgStairNeighbors < avgCorridorNeighbors * 0.5) {
      console.log('⚠️  STAIRS HAVE SIGNIFICANTLY FEWER CONNECTIONS');
    }
  });
  
  test('should analyze stair edge diversity', () => {
    console.log('\n=== STAIR EDGE DIVERSITY ANALYSIS ===');
    
    const stairTiles = TILE_DEFS.filter(t => t.meta?.role === 'stair');
    const nonStairTiles = TILE_DEFS.filter(t => t.meta?.role !== 'stair').slice(0, 8);
    
    // Collect all unique edge patterns
    const stairEdges = new Set();
    const corridorEdges = new Set();
    
    stairTiles.forEach(tile => {
      const edges = extractEdges(tile.layers);
      stairEdges.add(edges.north);
      stairEdges.add(edges.south);
      stairEdges.add(edges.east);
      stairEdges.add(edges.west);
    });
    
    nonStairTiles.forEach(tile => {
      const edges = extractEdges(tile.layers);
      corridorEdges.add(edges.north);
      corridorEdges.add(edges.south);
      corridorEdges.add(edges.east);
      corridorEdges.add(edges.west);
    });
    
    console.log('Stair edge patterns:', Array.from(stairEdges).sort());
    console.log('Corridor edge patterns:', Array.from(corridorEdges).sort());
    
    // Find overlaps
    const overlapping = Array.from(stairEdges).filter(edge => corridorEdges.has(edge));
    const stairOnly = Array.from(stairEdges).filter(edge => !corridorEdges.has(edge));
    
    console.log('Overlapping patterns (good for WFC):', overlapping.sort());
    console.log('Stair-only patterns (problematic for WFC):', stairOnly.sort());
    
    if (stairOnly.length > 0) {
      console.log('❌ STAIRS HAVE UNIQUE PATTERNS NOT FOUND IN CORRIDORS');
      console.log('This limits WFC placement options');
    }
  });
});