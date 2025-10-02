/**
 * Default Tilesets - Immutable built-in tileset configurations
 * 
 * This module contains the core set of built-in tilesets that come
 * with the dungeon generator. These are immutable and serve as the foundation
 * for dungeon generation. User-created tilesets are stored separately.
 */

export const DEFAULT_TILESETS = Object.freeze({
    'basic_dungeon': Object.freeze({
        id: 'basic_dungeon',
        name: 'Basic Dungeon',
        description: 'Simple rooms and corridors for basic dungeon generation',
        created: '2025-01-01T00:00:00.000Z', // Static creation date for defaults
        tiles: Object.freeze([
            // Rooms - lower weight for fewer rooms
            Object.freeze({
                structure: 'room_3x3',
                weight: 2,
                rotations: Object.freeze([0, 90, 180, 270]),
                constraints: Object.freeze({})
            }),
            
            // Straight corridors - higher weight for connectivity
            Object.freeze({
                structure: 'corridor_ns',
                weight: 5,
                rotations: Object.freeze([0, 90]), // N-S and E-W orientations
                constraints: Object.freeze({})
            }),
            
            // Cross intersections - moderate weight
            Object.freeze({
                structure: 'corridor_nsew', 
                weight: 3,
                rotations: Object.freeze([0]), // No rotation needed for symmetric cross
                constraints: Object.freeze({})
            }),
            
            // Corner turns - moderate weight for variety
            Object.freeze({
                structure: 'corner_ne',
                weight: 3,
                rotations: Object.freeze([0, 90, 180, 270]), // All corner orientations
                constraints: Object.freeze({})
            }),
            
            // T-junctions - lower weight 
            Object.freeze({
                structure: 'corridor_nse',
                weight: 2,
                rotations: Object.freeze([0, 90, 180, 270]),
                constraints: Object.freeze({})
            }),
            
            // Dead ends - low weight for terminals
            Object.freeze({
                structure: 'dead_end_n',
                weight: 1,
                rotations: Object.freeze([0, 90, 180, 270]),
                constraints: Object.freeze({})
            })
        ])
    }),

    'rooms_only': Object.freeze({
        id: 'rooms_only',
        name: 'Rooms Only',
        description: 'Only room tiles for testing room generation',
        created: '2025-01-01T00:00:00.000Z',
        tiles: Object.freeze([
            Object.freeze({
                structure: 'room_3x3',
                weight: 5,
                rotations: Object.freeze([0, 90, 180, 270]),
                constraints: Object.freeze({})
            }),
            Object.freeze({
                structure: 'corridor_nsew', // Cross for connections
                weight: 2,
                rotations: Object.freeze([0]),
                constraints: Object.freeze({})
            })
        ])
    }),

    'corridors_only': Object.freeze({
        id: 'corridors_only', 
        name: 'Corridors Only',
        description: 'Only corridor tiles for testing corridor generation',
        created: '2025-01-01T00:00:00.000Z',
        tiles: Object.freeze([
            Object.freeze({
                structure: 'corridor_ns',
                weight: 4,
                rotations: Object.freeze([0, 90]),
                constraints: Object.freeze({})
            }),
            Object.freeze({
                structure: 'corner_ne',
                weight: 3,
                rotations: Object.freeze([0, 90, 180, 270]),
                constraints: Object.freeze({})
            }),
            Object.freeze({
                structure: 'corridor_nsew',
                weight: 2,
                rotations: Object.freeze([0]),
                constraints: Object.freeze({})
            }),
            Object.freeze({
                structure: 'dead_end_n',
                weight: 1,
                rotations: Object.freeze([0, 90, 180, 270]),
                constraints: Object.freeze({})
            })
        ])
    }),

    'minimal_test': Object.freeze({
        id: 'minimal_test',
        name: 'Minimal Test',
        description: 'Minimal tileset for testing WFC generation',
        created: '2025-01-01T00:00:00.000Z',
        tiles: Object.freeze([
            Object.freeze({
                structure: 'corridor_ns',
                weight: 3,
                rotations: Object.freeze([0, 90]),
                constraints: Object.freeze({})
            }),
            Object.freeze({
                structure: 'corridor_nsew',
                weight: 1,
                rotations: Object.freeze([0]),
                constraints: Object.freeze({})
            })
        ])
    })
});

/**
 * List of tileset IDs that are built-in and cannot be modified or deleted
 */
export const BUILT_IN_TILESET_IDS = Object.freeze([
    'basic_dungeon',
    'rooms_only',
    'corridors_only',
    'minimal_test'
]);

/**
 * Check if a tileset ID is a built-in tileset
 */
export function isBuiltInTileset(tilesetId) {
    return BUILT_IN_TILESET_IDS.includes(tilesetId);
}

/**
 * Get all built-in tileset IDs and names for listing
 */
export function listDefaultTilesets() {
    return Object.values(DEFAULT_TILESETS).map(tileset => ({
        id: tileset.id,
        name: tileset.name,
        description: tileset.description,
        tileCount: tileset.tiles.length
    }));
}

/**
 * Data format version for migration purposes
 */
export const DEFAULT_TILESETS_VERSION = '1.0';