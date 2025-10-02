/**
 * Default Tile Structures - Immutable built-in structures
 * 
 * This module contains the core set of built-in tile structures that come
 * with the dungeon generator. These are immutable and serve as the foundation
 * for all dungeon generation. User-created structures are stored separately.
 */

export const DEFAULT_TILE_STRUCTURES = Object.freeze({
    // Cross intersection - connects in all 4 directions
    corridor_nsew: Object.freeze({
        structure: Object.freeze([
            Object.freeze([
                Object.freeze([0, 1, 0]),
                Object.freeze([1, 1, 1]),
                Object.freeze([0, 1, 0])
            ])
        ]),
        edges: Object.freeze(['101', '101', '101', '101']), // n, e, s, w
        type: 'corridor'
    }),

    // Straight corridor - north-south
    corridor_ns: Object.freeze({
        structure: Object.freeze([
            Object.freeze([
                Object.freeze([0, 0, 0]),
                Object.freeze([1, 1, 1]),
                Object.freeze([0, 0, 0])
            ])
        ]),
        edges: Object.freeze(['101', '000', '101', '000']), // n, e, s, w
        type: 'corridor'
    }),

    // Straight corridor - east-west
    corridor_ew: Object.freeze({
        structure: Object.freeze([
            Object.freeze([
                Object.freeze([0, 1, 0]),
                Object.freeze([0, 1, 0]),
                Object.freeze([0, 1, 0])
            ])
        ]),
        edges: Object.freeze(['000', '101', '000', '101']), // n, e, s, w
        type: 'corridor'
    }),

    // T-junction - connects north, south, east
    corridor_nse: Object.freeze({
        structure: Object.freeze([
            Object.freeze([
                Object.freeze([0, 0, 0]),
                Object.freeze([1, 1, 1]),
                Object.freeze([0, 1, 0])
            ])
        ]),
        edges: Object.freeze(['101', '101', '101', '000']), // n, e, s, w
        type: 'corridor'
    }),

    // L-corner - connects north and east
    corner_ne: Object.freeze({
        structure: Object.freeze([
            Object.freeze([
                Object.freeze([0, 0, 0]),
                Object.freeze([1, 1, 1]),
                Object.freeze([0, 0, 0])
            ])
        ]),
        edges: Object.freeze(['101', '101', '000', '000']), // n, e, s, w
        type: 'corridor'
    }),

    // Small room (3x3)
    room_3x3: Object.freeze({
        structure: Object.freeze([
            Object.freeze([
                Object.freeze([1, 1, 1]),
                Object.freeze([1, 1, 1]),
                Object.freeze([1, 1, 1])
            ])
        ]),
        edges: Object.freeze(['111', '111', '111', '111']), // n, e, s, w
        type: 'room'
    }),

    // Stairway going up
    stair_up: Object.freeze({
        structure: Object.freeze([
            Object.freeze([
                Object.freeze([0, 1, 0]),
                Object.freeze([1, 1, 1]),
                Object.freeze([0, 1, 0])
            ]),
            Object.freeze([
                Object.freeze([0, 0, 0]),
                Object.freeze([0, 1, 0]),
                Object.freeze([0, 0, 0])
            ])
        ]),
        edges: Object.freeze(['101', '101', '101', '101']), // n, e, s, w
        type: 'stair'
    }),

    // Stairway going down
    stair_down: Object.freeze({
        structure: Object.freeze([
            Object.freeze([
                Object.freeze([0, 0, 0]),
                Object.freeze([0, 1, 0]),
                Object.freeze([0, 0, 0])
            ]),
            Object.freeze([
                Object.freeze([0, 1, 0]),
                Object.freeze([1, 1, 1]),
                Object.freeze([0, 1, 0])
            ])
        ]),
        edges: Object.freeze(['101', '101', '101', '101']), // n, e, s, w
        type: 'stair'
    }),

    // Dead end - connects only north
    dead_end_n: Object.freeze({
        structure: Object.freeze([
            Object.freeze([
                Object.freeze([0, 0, 0]),
                Object.freeze([0, 1, 1]),
                Object.freeze([0, 0, 0])
            ])
        ]),
        edges: Object.freeze(['101', '000', '000', '000']), // n, e, s, w
        type: 'corridor'
    }),

    // Multi-level open space (experimental)
    multi_level_open: Object.freeze({
        structure: Object.freeze([
            Object.freeze([
                Object.freeze([0, 1, 0]),
                Object.freeze([1, 1, 1]),
                Object.freeze([0, 1, 0])
            ]),
            Object.freeze([
                Object.freeze([0, 1, 0]),
                Object.freeze([1, 1, 1]),
                Object.freeze([0, 1, 0])
            ])
        ]),
        edges: Object.freeze(['000', '000', '000', '000']), // No connections - open space
        type: 'open_space'
    })
});

/**
 * List of structure IDs that are built-in and cannot be modified or deleted
 */
export const BUILT_IN_STRUCTURE_IDS = Object.freeze([
    'corridor_nsew',
    'corridor_ns', 
    'corridor_ew',
    'corridor_nse',
    'corner_ne',
    'room_3x3',
    'stair_up',
    'stair_down',
    'dead_end_n',
    'multi_level_open'
]);

/**
 * Check if a structure ID is a built-in structure
 */
export function isBuiltInStructure(structureId) {
    return BUILT_IN_STRUCTURE_IDS.includes(structureId);
}

/**
 * Get all structure names by type
 */
export function getDefaultStructuresByType(type) {
    return Object.entries(DEFAULT_TILE_STRUCTURES)
        .filter(([name, structure]) => structure.type === type)
        .reduce((acc, [name, structure]) => {
            acc[name] = structure;
            return acc;
        }, {});
}

/**
 * Data format version for migration purposes
 */
export const DEFAULT_STRUCTURES_VERSION = '1.0';