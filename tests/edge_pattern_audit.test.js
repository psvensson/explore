// edge_pattern_audit.test.js
// Comprehensive audit of all tile edge patterns to find WFC blocking issues

import TILE_DEFS from '../docs/dungeon/tileset_data.js';

describe('Edge Pattern Audit', () => {
  test('should identify all edge pattern compatibility issues', () => {
    console.log('\n=== COMPREHENSIVE EDGE PATTERN AUDIT ===');
    
    function extractEdges(layers) {
      const middle = layers[1];
      return {
        north: middle[0],
        south: middle[2], 
        east: middle[0][2] + middle[1][2] + middle[2][2],
        west: middle[0][0] + middle[1][0] + middle[2][0]
      };
    }
    
    // Extract all tiles (excluding stairs for now)
    const tiles = TILE_DEFS.filter(t => t.meta?.role !== 'stair');
    
    console.log(`Analyzing ${tiles.length} non-stair tiles:`);
    
    // Collect all unique edge patterns
    const edgePatterns = new Set();
    const tileEdges = {};
    
    tiles.forEach(tile => {
      const edges = extractEdges(tile.layers);
      tileEdges[tile.tileId] = edges;
      
      edgePatterns.add(edges.north);
      edgePatterns.add(edges.south);
      edgePatterns.add(edges.east);
      edgePatterns.add(edges.west);
      
      console.log(`Tile ${tile.tileId}: N="${edges.north}" S="${edges.south}" E="${edges.east}" W="${edges.west}"`);
    });
    
    console.log(`\nFound ${edgePatterns.size} unique edge patterns:`, Array.from(edgePatterns).sort());
    
    // Check compatibility matrix
    console.log('\n=== EDGE COMPATIBILITY ANALYSIS ===');
    
    function edgesCompatible(edge1, edge2) {
      if (edge1.length !== edge2.length) return false;
      for (let i = 0; i < edge1.length; i++) {
        const char1 = edge1[i];
        const char2 = edge2[i];
        const isPassable1 = (char1 === '0' || char1 === '2');
        const isPassable2 = (char2 === '0' || char2 === '2');
        // CORRECTED: Adjacent edges should MATCH - walls to walls, open to open
        if (isPassable1 !== isPassable2) return false;
      }
      return true;
    }
    
    const edgeArray = Array.from(edgePatterns);
    const compatibilityMatrix = {};
    
    edgeArray.forEach(edge1 => {
      compatibilityMatrix[edge1] = edgeArray.filter(edge2 => edgesCompatible(edge1, edge2));
    });
    
    // Find problematic patterns
    const problematicPatterns = [];
    edgeArray.forEach(pattern => {
      const compatibleCount = compatibilityMatrix[pattern].length;
      console.log(`Pattern "${pattern}" compatible with ${compatibleCount} patterns: [${compatibilityMatrix[pattern].join(', ')}]`);
      
      if (compatibleCount <= 1) { // Only compatible with itself
        problematicPatterns.push(pattern);
      }
    });
    
    if (problematicPatterns.length > 0) {
      console.log(`\n✓ FOUND ${problematicPatterns.length} SELF-ONLY PATTERNS:`, problematicPatterns);
      console.log('These patterns only connect to themselves, which is fine for WFC - creates constrained but valid layouts');
    }
    
    // Check for tiles that can't connect in specific directions
    console.log('\n=== DIRECTIONAL CONNECTION ANALYSIS ===');
    
    tiles.forEach(tile => {
      const edges = tileEdges[tile.tileId];
      const connections = {
        north: 0, south: 0, east: 0, west: 0
      };
      
      // Count possible connections for each direction
      tiles.forEach(otherTile => {
        // Allow self-connections - tiles can connect to themselves!
        const otherEdges = tileEdges[otherTile.tileId];
        
        if (edgesCompatible(edges.north, otherEdges.south)) connections.north++;
        if (edgesCompatible(edges.south, otherEdges.north)) connections.south++;
        if (edgesCompatible(edges.east, otherEdges.west)) connections.east++;
        if (edgesCompatible(edges.west, otherEdges.east)) connections.west++;
      });
      
      const hasIsolatedDirection = Object.values(connections).some(count => count === 0);
      
      if (hasIsolatedDirection) {
        console.log(`❌ Tile ${tile.tileId} has isolated directions: N:${connections.north} S:${connections.south} E:${connections.east} W:${connections.west}`);
      } else {
        console.log(`✅ Tile ${tile.tileId} connections: N:${connections.north} S:${connections.south} E:${connections.east} W:${connections.west}`);
      }
    });
    
    // Count isolated tiles (ones with 0 connections in any direction)
    const isolatedTiles = tiles.filter(tile => {
      const edges = tileEdges[tile.tileId];
      const connections = { north: 0, south: 0, east: 0, west: 0 };
      
      tiles.forEach(otherTile => {
        const otherEdges = tileEdges[otherTile.tileId];
        if (edgesCompatible(edges.north, otherEdges.south)) connections.north++;
        if (edgesCompatible(edges.south, otherEdges.north)) connections.south++;
        if (edgesCompatible(edges.east, otherEdges.west)) connections.east++;
        if (edgesCompatible(edges.west, otherEdges.east)) connections.west++;
      });
      
      return Object.values(connections).some(count => count === 0);
    });
    
    // Only isolated tiles (not self-only patterns) block WFC generation
    expect(isolatedTiles.length).toBe(0);
  });
});