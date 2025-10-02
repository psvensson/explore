// tileset_data.js
// Canonical ordered tile definitions for traversable dungeon generation
// 
// This file provides backward compatibility with the original tileset format
// while also enabling the new modular tileset architecture.
// 
// IMPORTANT: Keep ordering EXACT to preserve prototype indices relied on by tests.

import { PackageResolver } from './package_resolver.js';

// Legacy tile definitions (preserved for backward compatibility)
const LEGACY_TILE_DEFS = [
  // 0: Cross intersection (connects all 4 directions)
  // Middle layer pattern:
  // 1 0 1
  // 0 0 0  
  // 1 0 1
  { tileId: 100, layers: [
      ["111","111","111"],  // Floor layer
      [
        "101",  // 1 0 1
        "000",  // 0 0 0
        "101"   // 1 0 1
      ],
      ["111","111","111"],  // Ceiling layer
    ], transforms: [], meta:{ weight: 8 } },

  // 1: Solid wall/rock (use sparingly for connectivity)
  // Middle layer pattern:
  // 1 1 1
  // 1 1 1
  // 1 1 1
  { tileId: 101, layers: [
      ["111","111","111"],
      [
        "111",  // 1 1 1
        "111",  // 1 1 1
        "111"   // 1 1 1
      ],
      ["111","111","111"],
    ], transforms: [], meta:{ weight: 12 } },

  // 2: North-South corridor (vertical passage)
  // Middle layer pattern:
  // 1 1 1
  // 0 0 0
  // 1 1 1
  { tileId: 102, layers: [
      ["111","111","111"],
      [
        "111",  // 1 1 1
        "000",  // 0 0 0
        "111"   // 1 1 1
      ],
      ["111","111","111"],
    ], transforms: ["ry"], meta:{ weight: 8 } },

  // 3: L-corner (connects two adjacent directions)
  // Middle layer pattern:
  // 1 0 1
  // 0 0 0
  // 1 0 1 (changed from 011 to 101 for WFC compatibility)
  { tileId: 103, layers: [
      ["111","111","111"],
      [
        "111",  // 1 0 1
        "100",  // 0 0 0
        "101"   // 1 0 1 (changed from 011 to match existing north edges)
      ],
      ["111","111","111"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ weight: 8 } },

  // 4: T-junction (connects 3 directions)
  // Middle layer pattern:
  // 1 0 1
  // 0 0 0
  // 1 1 1
  { tileId: 104, layers: [
      ["111","111","111"],
      [
        "101",  // 1 0 1
        "000",  // 0 0 0
        "111"   // 1 1 1
      ],
      ["111","111","111"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ weight: 6 } },

     {tileId: 105, layers: [
      ["111","111","111"],
      [
        "100",  // 1 0 1
        "000",  // 0 0 0
        "000"   // 0 0 0
      ],
      ["111","111","111"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ weight: 8 } },

  {tileId: 106, layers: [
      ["111","111","111"],
      [
        "111",  // 1 0 1
        "100",  // 0 0 0
        "100"   // 0 0 0
      ],
      ["111","111","111"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ weight: 8 } },


  { tileId: 107, layers: [
      ["111","111","111"],
      [
        "111",  // 1 0 1
        "000",  // 0 0 0
        "000"   // 0 0 0
      ],
      ["111","111","111"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ weight: 8 } },

  // 8: Corridor opening to room
  // Middle layer pattern:
  // 1 0 1
  // 0 0 0
  // 0 0 0
  { tileId: 108, layers: [
      ["111","111","111"],
      [
        "101",  // 1 0 1
        "000",  // 0 0 0
        "000"   // 0 0 0
      ],
      ["111","111","111"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ weight: 8 } },

  // 9: Room corner
  // Middle layer pattern:
  // 1 1 1
  // 1 0 1 (changed from 100 to 101 for WFC compatibility)
  // 1 0 1 (changed from 100 to 101 for WFC compatibility)
  { tileId: 109, layers: [
      ["111","111","111"],
      [
        "111",  // 1 1 1
        "101",  // 1 0 1 (changed from 100 to match existing patterns)
        "101"   // 1 0 1 (changed from 100 to match existing patterns)
      ],
      ["111","111","111"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ weight: 8 } },

  // 10: Open room
  // Middle layer pattern:
  // 0 0 0
  // 0 0 0
  // 0 0 0
  { tileId: 110, layers: [
      ["111","111","111"],
      [
        "000",  // 0 0 0
        "000",  // 0 0 0
        "000"   // 0 0 0
      ],
      ["111","111","111"],
    ], transforms: [], meta:{ weight: 8 } },


{ tileId: 111, layers: [
      ["111","111","111"],
      [
        "000",  
        "000",  
        "000"   
      ],
      ["000","000","000"],
    ], transforms: [], meta:{ weight: 8 } },

    { tileId: 112, layers: [
      ["111","111","111"],
      [
        "111",  
        "000",  
        "000"   
      ],
      ["000","000","000"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ weight: 8 } },

{ tileId: 113, layers: [
      ["000","000","000"],
      [
        "000",  
        "000",  
        "000"   
      ],
      ["111","111","111"],
    ], transforms: [], meta:{ weight: 8 } },
    
 { tileId: 114, layers: [
      ["000","000","000"],
      [
        "111",  
        "000",  
        "000"   
      ],
      ["111","111","111"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ weight: 8 } },


  // 11: +Z stair (lower/going up) 
  // Floor layer: solid base
  // Middle layer: stair steps with passable path
  // Ceiling layer: open above for vertical movement to upper stair
  { tileId: 201, layers: [
      [
        "111",  // 1 1 1
        "111",  // 1 1 1  
        "111"   // 1 1 1
      ],
      [
        "111",  // 1 1 1
        "020",  // 0 2 0
        "101"   // 1 0 1 (changed from 000 to match corridor patterns)
      ],
      [
        "111",  // 1 1 1
        "000",  // 0 0 0
        "000"   // 0 0 0
      ],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ 
      role:'stair', 
      stairRole: 'lower',
      axis:'z', 
      dir: 1, 
      weight: 2.0,  // Increased from 0.1 to ensure vertical connectivity
      requiredAboveEmpty: [[1,1,1], [2,1,1]]  // Center positions must be empty above
    } },

  // 12: -Z stair (upper/going down)
  // Floor layer: open below for vertical movement from lower stair
  // Middle layer: stair steps with passable path (front must be open for landing)
  // Ceiling layer: solid top
  { tileId: 202, layers: [
      [
        "111",  // 1 1 1
        "000",  // 0 0 0
        "000"   // 0 0 0
      ],
      [
        "101",  // 1 0 1 - front row open for landing (was "111")
        "020",  // 0 2 0
        "111"   // 1 1 1 - back row solid (was "101")
      ],
      [
        "111",  // 1 1 1
        "111",  // 1 1 1
        "111"   // 1 1 1
      ],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ 
      role:'stair', 
      stairRole: 'upper',
      axis:'z', 
      dir: -1, 
      weight: 2.0,  // Increased from 0.1 to ensure vertical connectivity
      requiredBelowEmpty: [[1,1,1], [0,1,1]]  // Center positions must be empty below
    } }
];

// Modular tileset integration
class TilesetData {
  constructor() {
    this.resolver = new PackageResolver();
    this.currentPackage = 'standard_dungeon';
    this.useModular = false;
  }

  /**
   * Enable modular tileset system
   */
  enableModular(enabled = true) {
    this.useModular = enabled;
    return this;
  }

  /**
   * Set the current tileset package
   */
  setPackage(packageName) {
    this.currentPackage = packageName;
    return this;
  }

  /**
   * Get tiles using current configuration
   */
  getTiles() {
    if (this.useModular) {
      return this.getModularTiles();
    } else {
      return this.getLegacyTiles();
    }
  }

  /**
   * Get legacy tile format
   */
  getLegacyTiles() {
    return [...LEGACY_TILE_DEFS];
  }

  /**
   * Get modular tiles resolved to legacy format
   */
  getModularTiles() {
    const resolved = this.resolver.resolve(this.currentPackage);
    return this.convertToLegacyFormat(resolved);
  }

  /**
   * Convert modular tiles to legacy format for backward compatibility
   */
  convertToLegacyFormat(modularTiles) {
    return modularTiles.map((tile, index) => {
      // Convert 3D structure to legacy layer format
      const layers = this.structureToLayers(tile.structure);
      
      // Map role to legacy format
      const meta = {
        weight: tile.weight,
        role: tile.role
      };

      // Add stair-specific metadata if applicable
      if (tile.type === 'stair') {
        meta.stairRole = tile.role === 'stair_up' ? 'lower' : 'upper';
        meta.axis = 'z';
        meta.dir = tile.role === 'stair_up' ? 1 : -1;
        
        if (tile.role === 'stair_up') {
          meta.requiredAboveEmpty = [[1,1,1], [2,1,1]];
        } else {
          meta.requiredBelowEmpty = [[1,1,1], [0,1,1]];
        }
      }

      return {
        tileId: 100 + index, // Start from 100 to match legacy format
        layers: layers,
        transforms: this.getTransforms(tile.source ? tile.source.rotation : 0),
        meta: meta
      };
    });
  }

  /**
   * Convert modular structure to legacy layers format
   */
  structureToLayers(structure) {
    if (structure.length === 1) {
      // Single layer - add floor and ceiling
      const middleLayer = structure[0];
      return [
        // Floor layer (solid)
        middleLayer.map(row => row.map(() => "1").join("")),
        // Middle layer (actual structure)
        middleLayer.map(row => row.map(cell => cell.toString()).join("")),
        // Ceiling layer (solid)
        middleLayer.map(row => row.map(() => "1").join(""))
      ];
    } else if (structure.length === 2) {
      // Two layers (stairs)
      const [layer1, layer2] = structure;
      return [
        // Floor/lower layer
        layer1.map(row => row.map(cell => cell.toString()).join("")),
        // Middle layer
        layer2.map(row => row.map(cell => cell === 1 ? "0" : cell.toString()).join("")),
        // Ceiling layer
        layer2.map(row => row.map(cell => cell.toString()).join(""))
      ];
    } else {
      // Multiple layers - take first three
      return structure.slice(0, 3).map(layer =>
        layer.map(row => row.map(cell => cell.toString()).join(""))
      );
    }
  }

  /**
   * Get transforms based on rotation
   */
  getTransforms(rotation) {
    switch (rotation) {
      case 0: return [];
      case 90: return ["ry"];
      case 180: return ["ry", "ry"];
      case 270: return ["ry", "ry", "ry"];
      default: return [];
    }
  }

  /**
   * Get available packages
   */
  getAvailablePackages() {
    return this.resolver.resolve ? 
      ['standard_dungeon', 'high_connectivity', 'minimal_clumping', 'multi_level_dungeon', 'room_heavy'] :
      ['legacy'];
  }

  /**
   * Get tileset statistics
   */
  getStats() {
    if (this.useModular) {
      const resolved = this.resolver.resolve(this.currentPackage);
      return this.resolver.getStats(resolved);
    } else {
      return {
        totalTiles: LEGACY_TILE_DEFS.length,
        source: 'legacy'
      };
    }
  }

  /**
   * Validate current tileset
   */
  validate() {
    if (this.useModular) {
      const resolved = this.resolver.resolve(this.currentPackage);
      return this.resolver.validate(resolved);
    } else {
      return { isValid: true, errors: [], warnings: [] };
    }
  }
}

// Create singleton instance
const tilesetData = new TilesetData();

// Legacy exports for backward compatibility
const TILE_DEFS = tilesetData.getLegacyTiles();

// Modern exports
export { TilesetData, tilesetData };
export default TILE_DEFS;