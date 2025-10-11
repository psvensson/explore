// edge_pattern_wfc_rules.js
// Proper edge pattern based WFC rule generation to replace openness heuristics

import { DIM_TOKENS } from './constants.js';

/**
 * Extract edge patterns from a tile's middle layer
 * @param {Array} layers - Tile layers [floor, middle, ceiling]
 * @returns {Object} Edge patterns {north, south, east, west}
 */
function extractEdges(layers) {
  const middle = layers[1];
  return {
    north: middle[0],
    south: middle[2], 
    east: middle[0][2] + middle[1][2] + middle[2][2],
    west: middle[0][0] + middle[1][0] + middle[2][0]
  };
}

/**
 * Check if two edge patterns are compatible for WFC adjacency
 * Adjacent edges should match - walls to walls, open to open
 * @param {string} edge1 - First edge pattern
 * @param {string} edge2 - Second edge pattern  
 * @returns {boolean} True if edges can be adjacent
 */
function edgesCompatible(edge1, edge2) {
  if (edge1.length !== edge2.length) return false;
  for (let i = 0; i < edge1.length; i++) {
    const char1 = edge1[i];
    const char2 = edge2[i];
    const isPassable1 = (char1 === '0' || char1 === '2');
    const isPassable2 = (char2 === '0' || char2 === '2');
    // Adjacent edges should MATCH - walls to walls, open to open
    if (isPassable1 !== isPassable2) return false;
  }
  return true;
}

/**
 * Build WFC rules based on edge pattern compatibility
 * @param {Array} tilePrototypes - Array of tile prototypes with voxels
 * @param {Object} options - Configuration options
 * @returns {Object} {rules, weights, diagnostics}
 */
export function buildEdgePatternRules(tilePrototypes, { isolateStairs = true } = {}) {
  const n = tilePrototypes.length;
  const rules = [];
  const weights = tilePrototypes.map(p => (p && p.meta && typeof p.meta.weight === 'number') ? p.meta.weight : 1);
  
  const diagnostics = {
    totalPairs: 0,
    xRules: 0,
    zRules: 0,
    yRules: 0,
    horizontalPruned: 0,
    edgeIncompatible: 0
  };

  // Extract edge patterns for all tiles
  const tileEdges = tilePrototypes.map((proto, index) => {
    if (!proto) {
      console.warn(`Tile prototype ${index} is null/undefined`);
      return null;
    }
    
    if (!proto.voxels) {
      console.warn(`Tile prototype ${index} (tileId: ${proto.tileId}) has no voxels`);
      return null;
    }
    
  // Handle both flat array and 3D array formats
    let voxels3D;
    if (Array.isArray(proto.voxels) && typeof proto.voxels[0] === 'number') {
      // Flat array format - convert to 3D
      if (proto.voxels.length !== 27) {
        console.warn(`Tile prototype ${index} (tileId: ${proto.tileId}) has flat voxels array with wrong length: ${proto.voxels.length}`);
        return null;
      }
      voxels3D = [];
      for (let z = 0; z < 3; z++) {
        voxels3D[z] = [];
        for (let y = 0; y < 3; y++) {
          voxels3D[z][y] = [];
          for (let x = 0; x < 3; x++) {
            voxels3D[z][y][x] = proto.voxels[z * 9 + y * 3 + x];
          }
        }
      }
    } else if (Array.isArray(proto.voxels) && proto.voxels.length === 3) {
      // Already 3D format
      voxels3D = proto.voxels;
    } else {
      console.warn(`Tile prototype ${index} (tileId: ${proto.tileId}) has unrecognized voxels format`);
      return null;
    }
    
    // Convert voxels to layers format for edge extraction
    const layers = [[], [], []]; // [floor, middle, ceiling]
    for (let y = 0; y < 3; y++) {
      for (let z = 0; z < 3; z++) {
        let row = '';
        for (let x = 0; x < 3; x++) {
          if (!voxels3D[z] || !voxels3D[z][y] || voxels3D[z][y][x] === undefined) {
            console.warn(`Tile prototype ${index} (tileId: ${proto.tileId}) missing voxel at [${z}][${y}][${x}]`);
            return null;
          }
          row += voxels3D[z][y][x].toString();
        }
        layers[y].push(row);
      }
    }
    
    return extractEdges(layers);
  });

  // Helper functions for tile metadata
  const isStair = p => !!(p && p.meta && p.meta.role === 'stair');
  
  // Build adjacency rules for each pair of tiles
  for (let a = 0; a < n; a++) {
    for (let b = 0; b < n; b++) {
      diagnostics.totalPairs++;
      
      const protoA = tilePrototypes[a];
      const protoB = tilePrototypes[b];
      const edgesA = tileEdges[a];
      const edgesB = tileEdges[b];
      
      if (!edgesA || !edgesB) continue;
      
      const aStair = isStair(protoA);
      const bStair = isStair(protoB);
      const horizontalBlocked = isolateStairs && aStair && bStair;
      
      if (horizontalBlocked) {
        diagnostics.horizontalPruned++;
        continue;
      }
      
      // X-axis rules (east-west connectivity)
      // A is west of B: A's east edge connects to B's west edge
      if (edgesCompatible(edgesA.east, edgesB.west)) {
        rules.push([DIM_TOKENS.X, a, b]);
        diagnostics.xRules++;
      } else {
        diagnostics.edgeIncompatible++;
      }
      
      // Z-axis rules (north-south connectivity)  
      // A is north of B: A's south edge connects to B's north edge
      if (edgesCompatible(edgesA.south, edgesB.north)) {
        rules.push([DIM_TOKENS.Z, a, b]);
        diagnostics.zRules++;
      } else {
        diagnostics.edgeIncompatible++;
      }
      
      // Y-axis rules (vertical stacking) - simple for now
      // Any tile can be stacked on any other tile
      if (canStack(protoB, protoA)) {
        rules.push([DIM_TOKENS.Y, a, b]);
        diagnostics.yRules++;
      }
    }
  }

  return { rules, weights, diagnostics };
}

/**
 * Simple vertical stacking rules - can be enhanced later
 * @param {Object} upper - Upper tile prototype
 * @param {Object} lower - Lower tile prototype  
 * @returns {boolean} True if upper can be placed on lower
 */
function canStack(upper, lower) {
  // For now, allow all vertical combinations except stair-on-stair
  const upperStair = !!(upper && upper.meta && upper.meta.role === 'stair');
  const lowerStair = !!(lower && lower.meta && lower.meta.role === 'stair');
  
  // Prevent stair on stair for simplicity
  if (upperStair && lowerStair) return false;
  
  return true;
}

/**
 * Deduplicate rules to reduce rule set size
 * @param {Array} rules - Array of [dimension, tileA, tileB] rules
 * @returns {Array} Deduplicated rules
 */
function deduplicateRules(rules) {
  const seen = new Set();
  return rules.filter(rule => {
    const key = `${rule[0]}-${rule[1]}-${rule[2]}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}