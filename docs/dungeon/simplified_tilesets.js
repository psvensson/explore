/**
 * Simplified Tilesets - Structure + Weight combinations  
 * Following no-build ES module pattern with existing tile structures
 */

// Import existing tile structures
import { TileStructures } from './tile_structures.js';

/**
 * Create and validate a      // Create floor and ceiling layers - ALL tiles (except stairs) have solid 3x3 floors and ceilings
      const floorLayer = ['111', '111', '111'];   // Always solid floor
      const ceilingLayer = ['111', '111', '111']; // Always solid ceilingration
 * @param {object} config - Tileset configuration object
 * @returns {object} Validated tileset
 */
export const createTileset = (config) => {
  // Validate required fields - fail fast design
  if (!config.id || !config.name || !config.tiles) {
    throw new Error('Tileset must have id, name, and tiles array');
  }

  // Validate all referenced structures exist
  const availableStructures = Object.keys(TileStructures.structures);
  const missingStructures = config.tiles
    .map(tile => tile.structure)
    .filter(structId => !availableStructures.includes(structId));
    
  if (missingStructures.length > 0) {
    throw new Error(`Missing tile structures: ${missingStructures.join(', ')}`);
  }

  return {
    id: config.id,
    name: config.name,
    description: config.description || '',
    created: new Date().toISOString(),
    tiles: config.tiles.map(tile => ({
      structure: tile.structure,
      weight: Math.max(1, tile.weight || 1), // Ensure positive weight
      rotations: tile.rotations || [0, 90, 180, 270],
      constraints: tile.constraints || {}
    }))
  };
};

/**
 * Simplified default tilesets using existing structures
 */
export const SIMPLIFIED_TILESETS = {
  'basic_dungeon': createTileset({
    id: 'basic_dungeon',
    name: 'Basic Dungeon',
    description: 'Simple rooms and corridors for basic dungeon generation',
    tiles: [
      // Rooms - lower weight for fewer rooms
      {
        structure: 'room_3x3',
        weight: 2,
        rotations: [0, 90, 180, 270]
      },
      
      // Straight corridors - higher weight for connectivity
      {
        structure: 'corridor_ns',
        weight: 5,
        rotations: [0, 90] // N-S and E-W orientations
      },
      
      // Cross intersections - moderate weight
      {
        structure: 'corridor_nsew', 
        weight: 3,
        rotations: [0] // No rotation needed for symmetric cross
      },
      
      // Corner turns - moderate weight for variety
      {
        structure: 'corner_ne',
        weight: 3,
        rotations: [0, 90, 180, 270] // All corner orientations
      },
      
      // T-junctions - lower weight 
      {
        structure: 'corridor_nse',
        weight: 2,
        rotations: [0, 90, 180, 270]
      },
      
      // Dead ends - low weight for terminals
      {
        structure: 'dead_end_n',
        weight: 1,
        rotations: [0, 90, 180, 270]
      }
    ]
  }),

  'rooms_only': createTileset({
    id: 'rooms_only',
    name: 'Rooms Only',
    description: 'Only room tiles for testing room generation',
    tiles: [
      {
        structure: 'room_3x3',
        weight: 5,
        rotations: [0, 90, 180, 270]
      },
      {
        structure: 'corridor_nsew', // Cross for connections
        weight: 2, 
        rotations: [0]
      }
    ]
  }),

  'corridors_only': createTileset({
    id: 'corridors_only', 
    name: 'Corridors Only',
    description: 'Only corridor tiles for testing corridor generation',
    tiles: [
      {
        structure: 'corridor_ns',
        weight: 4,
        rotations: [0, 90]
      },
      {
        structure: 'corner_ne',
        weight: 3,
        rotations: [0, 90, 180, 270]
      },
      {
        structure: 'corridor_nsew',
        weight: 2,
        rotations: [0]
      },
      {
        structure: 'dead_end_n',
        weight: 1,
        rotations: [0, 90, 180, 270]
      }
    ]
  }),

  'minimal_test': createTileset({
    id: 'minimal_test',
    name: 'Minimal Test',
    description: 'Minimal tileset for testing WFC generation',
    tiles: [
      {
        structure: 'corridor_ns',
        weight: 3,
        rotations: [0, 90]
      },
      {
        structure: 'corridor_nsew',
        weight: 1,
        rotations: [0]
      }
    ]
  })
};

/**
 * Utility functions for working with simplified tilesets
 */

/**
 * Get tileset by ID
 * @param {string} id - Tileset ID
 * @returns {object|null} Tileset or null if not found
 */
export const getTilesetById = (id) => {
  return SIMPLIFIED_TILESETS[id] || null;
};

/**
 * List all available tileset IDs and names
 * @returns {object[]} Array of {id, name, description} objects
 */
export const listTilesets = () => {
  return Object.values(SIMPLIFIED_TILESETS).map(tileset => ({
    id: tileset.id,
    name: tileset.name,
    description: tileset.description,
    tileCount: tileset.tiles.length
  }));
};

/**
 * Validate a tileset for WFC compatibility
 * @param {object} tileset - Tileset to validate
 * @returns {object} Validation result with success boolean and errors array
 */
export const validateTileset = (tileset) => {
  const errors = [];
  
  if (!tileset.id) errors.push('Missing tileset ID');
  if (!tileset.name) errors.push('Missing tileset name');
  if (!Array.isArray(tileset.tiles) || tileset.tiles.length === 0) {
    errors.push('Tileset must have at least one tile');
  }
  
  // Check each tile
  tileset.tiles?.forEach((tile, index) => {
    if (!tile.structure) {
      errors.push(`Tile ${index}: Missing structure reference`);
    } else if (!TileStructures.structures[tile.structure]) {
      errors.push(`Tile ${index}: Unknown structure '${tile.structure}'`);
    }
    
    if (!tile.weight || tile.weight < 1) {
      errors.push(`Tile ${index}: Weight must be >= 1`);
    }
    
    if (!Array.isArray(tile.rotations)) {
      errors.push(`Tile ${index}: Rotations must be an array`);
    }
  });
  
  return {
    success: errors.length === 0,
    errors
  };
};

/**
 * Convert tileset to WFC-compatible format
 * @param {object} tileset - Simplified tileset
 * @returns {object} WFC-compatible tileset data
 */
export const convertTilesetForWFC = (tileset) => {
  const validation = validateTileset(tileset);
  if (!validation.success) {
    throw new Error(`Invalid tileset: ${validation.errors.join(', ')}`);
  }

  // Generate WFC prototypes from tileset configuration
  const prototypes = [];
  let tileIdCounter = 100; // Start with same ID scheme as legacy tilesets
  
  tileset.tiles.forEach(tile => {
    const structure = TileStructures.structures[tile.structure];
    if (!structure) return;
    
    // Convert TileStructures 2D format to WFC-compatible 3D layers format
    const expand2DTo3DVoxels = (structure2D) => {
      // TileStructures uses single-layer format like [[[0,1,0],[1,1,1],[0,1,0]]]
      // WFC expects 3 layers of string arrays: [["111","111","111"], ["101","000","101"], ["111","111","111"]]
      
      const layer2D = structure2D[0]; // Get the 2D structure pattern
      
      // Convert number arrays to string format, but INVERT the pattern!
      // TileStructures defines obstructions (1=wall), but WFC expects walkable space patterns
      const convertToStringRows = (layer) => {
        return layer.map(row => row.map(cell => (1 - cell).toString()).join(''));
      };
      
      const middleLayer = convertToStringRows(layer2D); // Inverted structure pattern as strings
      
      // Create floor and ceiling layers - ALL tiles (except stairs) have solid 3x3 floors and ceilings
      const floorLayer = ['111', '111', '111'];   // Always solid floor
      const ceilingLayer = ['111', '111', '111']; // Always solid ceiling
      
      return [floorLayer, middleLayer, ceilingLayer];
    };
    
    // Create prototype for each allowed rotation
    tile.rotations.forEach(rotation => {
      prototypes.push({
        tileId: tileIdCounter++,
        voxels: expand2DTo3DVoxels(structure.structure),
        meta: {
          weight: tile.weight,
          sourceStructure: tile.structure,
          type: structure.type,
          role: structure.type, // Use type as role for rule compatibility
          rotation: rotation,
          constraints: tile.constraints
        }
      });
    });
  });

  return {
    id: tileset.id,
    name: tileset.name,
    description: tileset.description,
    prototypes,
    totalPrototypes: prototypes.length,
    totalWeight: prototypes.reduce((sum, p) => sum + (p.meta?.weight || 1), 0)
  };
};

/**
 * Create a custom tileset from user configuration
 * @param {string} name - Tileset name
 * @param {object[]} tileConfigs - Array of {structure, weight, rotations} objects
 * @returns {object} Created tileset
 */
export const createCustomTileset = (name, tileConfigs) => {
  const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  
  return createTileset({
    id,
    name,
    description: `Custom tileset: ${name}`,
    tiles: tileConfigs
  });
};

/**
 * Register a new tileset in the system
 * @param {object} tileset - Tileset to register
 */
export const registerTileset = (tileset) => {
  if (!tileset.id) {
    throw new Error('Tileset must have an ID');
  }
  
  SIMPLIFIED_TILESETS[tileset.id] = tileset;
  
  // Update window object if available
  if (typeof window !== 'undefined') {
    window.SIMPLIFIED_TILESETS = SIMPLIFIED_TILESETS;
  }
  
  console.log(`[SimplifiedTilesets] Registered new tileset: ${tileset.name} (${tileset.id})`);
};

/**
 * Get all available tilesets including dynamically registered ones
 * @returns {object} All tilesets
 */
export const getAllTilesets = () => {
  return { ...SIMPLIFIED_TILESETS };
};

// Node.js compatibility - expose to global window if available
if (typeof window !== 'undefined') {
  window.SIMPLIFIED_TILESETS = SIMPLIFIED_TILESETS;
  window.createTileset = createTileset;
  window.getTilesetById = getTilesetById;
  window.listTilesets = listTilesets;
  window.validateTileset = validateTileset;
  window.convertTilesetForWFC = convertTilesetForWFC;
  window.createCustomTileset = createCustomTileset;
  window.registerTileset = registerTileset;
  window.getAllTilesets = getAllTilesets;
  
  console.log('[SimplifiedTilesets] Loaded', Object.keys(SIMPLIFIED_TILESETS).length, 'simplified tilesets');
}