/**
 * Default Content (Structures + Single Tileset)
 *
 * SINGLE authoritative definition site for:
 *  - Built-in tile structures (voxel patterns + edge patterns)
 *  - The single default tileset ("basic_dungeon")
 *
 * STRICT RULE: Never use raw literals 0 / 1 / 2 for voxel semantics here.
 * Always reference VOXEL.EMPTY / VOXEL.SOLID / VOXEL.STAIR from voxel_constants.js.
 * This enforces a single semantic source of truth.
 * 
 * There is onhly need to define one rotation of each structure here., so just north-soutrh of a corrdiro will be fine.
 * Metadata later define which rotational variant will be available.
 * 
 * DO NOT EDIT TRILE STRUCTURES TO MAKE TESTS SUCCESSFUL!!!
 */
import { VOXEL } from '../../utils/voxel_constants.js';

export const DEFAULT_TILE_STRUCTURES = Object.freeze({
    // Cross intersection - connects in all 4 directions
    corridor_nsew: Object.freeze({
        // Explicit 3-layer representation: [floor, mid, ceiling]
        structure: Object.freeze([
            // FLOOR (solid slab)
            Object.freeze([
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]),
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]),
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID])
            ]),
            // MID (open plus intersection: corner wall pillars only, center & arms empty/traversable)
            Object.freeze([
                Object.freeze([VOXEL.SOLID, VOXEL.EMPTY, VOXEL.SOLID]),
                Object.freeze([VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY]),
                Object.freeze([VOXEL.SOLID, VOXEL.EMPTY, VOXEL.SOLID])
            ]),
            // CEILING (solid slab)
            Object.freeze([
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]),
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]),
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID])
            ])
        ]),
        edges: Object.freeze(['101', '101', '101', '101']), // n, e, s, w
        type: 'corridor'
    }),

    // Straight corridor - north-south )can be rotated by ndwfc for e-w)
    corridor_ns: Object.freeze({
        structure: Object.freeze([
            // FLOOR (solid slab)
            Object.freeze([
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]),
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]),
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID])
            ]),
            // MID (expected canonical orientation: walls north/south rows)
            Object.freeze([
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]),
                Object.freeze([VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY]),
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID])
            ]),
            // CEILING (solid slab)
            Object.freeze([
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]),
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]),
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID])
            ])
        ]),
        edges: Object.freeze(['101', '000', '101', '000']), // n, e, s, w
    type: 'corridor'
    }),


    // T-junction - connects north, south, east
    corridor_nse: Object.freeze({
        structure: Object.freeze([
            // FLOOR
            Object.freeze([
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]),
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]),
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID])
            ]),
            // MID (T shape)
            Object.freeze([
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]),
                Object.freeze([VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY]),
                Object.freeze([VOXEL.SOLID, VOXEL.EMPTY, VOXEL.SOLID])
            ]),
            // CEILING
            Object.freeze([
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]),
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]),
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID])
            ])
        ]),
        edges: Object.freeze(['101', '101', '101', '000']), // n, e, s, w
    type: 'corridor'
    }),

    // L-corner - connects north and east
    corner_ne: Object.freeze({
        structure: Object.freeze([
            // FLOOR
            Object.freeze([
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]),
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]),
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID])
            ]),
            // MID (corner bend)
            Object.freeze([
                Object.freeze([VOXEL.SOLID, VOXEL.EMPTY, VOXEL.EMPTY]),
                Object.freeze([VOXEL.SOLID, VOXEL.EMPTY, VOXEL.SOLID]),
                Object.freeze([VOXEL.SOLID, VOXEL.EMPTY, VOXEL.SOLID])
            ]),
            // CEILING
            Object.freeze([
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]),
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]),
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID])
            ])
        ]),
        edges: Object.freeze(['101', '101', '000', '000']), // n, e, s, w
    type: 'corridor'
    }),

    // Small room (3x3)
    open_space_3x3: Object.freeze({
        structure: Object.freeze([
            // FLOOR
            Object.freeze([
                Object.freeze([VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY]),
                Object.freeze([VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY]),
                Object.freeze([VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY])
            ]),
            // MID (solid mass)
            Object.freeze([
                Object.freeze([VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY]),
                Object.freeze([VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY]),
                Object.freeze([VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY])
            ]),
            // CEILING
            Object.freeze([
                Object.freeze([VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY]),
                Object.freeze([VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY]),
                Object.freeze([VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY])
            ])
        ]),
        edges: Object.freeze(['111', '111', '111', '111']), // n, e, s, w
    type: 'room'
    }),


    // Stairway going up
    stair_up: Object.freeze({
        structure: Object.freeze([
            // FLOOR
            Object.freeze([
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]),
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]),
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID])
            ]),
            // MID (match canonical stair voxel layout with stair marker)
            Object.freeze([
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]),
                Object.freeze([VOXEL.EMPTY, VOXEL.STAIR, VOXEL.EMPTY]),
                Object.freeze([VOXEL.SOLID, VOXEL.EMPTY, VOXEL.SOLID])
            ]),
            // CEILING (open above center shaft for vertical traversal)
            Object.freeze([
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]),
                Object.freeze([VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY]),
                Object.freeze([VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY])
            ])
        ]),
        edges: Object.freeze(['101', '101', '101', '101']), // n, e, s, w
    type: 'stair'
    }),

    // Stairway going down
    stair_down: Object.freeze({
        structure: Object.freeze([
            // FLOOR (open below center shaft)
            Object.freeze([
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]),
                Object.freeze([VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY]),
                Object.freeze([VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY])
            ]),
            // MID (stair voxel in center row, solid backing behind)
            Object.freeze([
                Object.freeze([VOXEL.SOLID, VOXEL.EMPTY, VOXEL.SOLID]),
                Object.freeze([VOXEL.EMPTY, VOXEL.STAIR, VOXEL.EMPTY]),
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID])
            ]),
            // CEILING (solid slab above stair exit)
            Object.freeze([
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]),
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]),
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID])
            ])
        ]),
        edges: Object.freeze(['101', '101', '101', '101']), // n, e, s, w
    type: 'stair'
    }),

    // Dead end - connects only north
    dead_end_n: Object.freeze({
        structure: Object.freeze([
            // FLOOR
            Object.freeze([
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]),
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]),
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID])
            ]),
            // MID
            Object.freeze([
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]),
                Object.freeze([VOXEL.SOLID, VOXEL.EMPTY, VOXEL.SOLID]),
                Object.freeze([VOXEL.SOLID, VOXEL.EMPTY, VOXEL.SOLID])
            ]),
            // CEILING
            Object.freeze([
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]),
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]),
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID])
            ])
        ]),
        edges: Object.freeze(['101', '000', '000', '000']), // n, e, s, w
    type: 'corridor'
    }),

    // Multi-level open space (experimental)
    multi_level_open_down: Object.freeze({
        structure: Object.freeze([
            // FLOOR (open)
            Object.freeze([
               Object.freeze([VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY]),
                Object.freeze([VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY]),
                Object.freeze([VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY])
            ]),
            // MID (same pattern)
            Object.freeze([
                Object.freeze([VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY]),
                Object.freeze([VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY]),
                Object.freeze([VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY])
            ]),
            // CEILING 
            Object.freeze([
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]),
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]),
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID])
            ])
        ]),
        edges: Object.freeze(['000', '000', '000', '000']), // No connections - open space
    type: 'open_space'
    }),

       // Multi-level open space (experimental)
    multi_level_open_up: Object.freeze({
        structure: Object.freeze([
            // FLOOR 
            Object.freeze([
               Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]),
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]),
                Object.freeze([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID])
            ]),
            // MID (same pattern)
            Object.freeze([
                Object.freeze([VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY]),
                Object.freeze([VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY]),
                Object.freeze([VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY])
            ]),
            // CEILING (upon up)
            Object.freeze([
                Object.freeze([VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY]),
                Object.freeze([VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY]),
                Object.freeze([VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY])
            ])
        ]),
        edges: Object.freeze(['000', '000', '000', '000']), // No connections - open space
    type: 'open_space'
    }),
});

/**
 * List of structure IDs that are built-in and cannot be modified or deleted
 */
// Built-in structures are simply all keys of DEFAULT_TILE_STRUCTURES.
// Single source of truth: modify DEFAULT_TILE_STRUCTURES only.
export function listBuiltInStructureIds() {
    return Object.keys(DEFAULT_TILE_STRUCTURES);
}
export function isBuiltInStructure(structureId) {
    return Object.prototype.hasOwnProperty.call(DEFAULT_TILE_STRUCTURES, structureId);
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

// ---------------------------------------------------------------------------
// Single Default Tileset (replaces previous multiple DEFAULT_TILESETS source)
// ---------------------------------------------------------------------------

export const DEFAULT_TILESETS = Object.freeze({
    basic_dungeon: Object.freeze({
        id: 'basic_dungeon',
        name: 'Basic Dungeon',
        description: 'Simple rooms and corridors for basic dungeon generation',
        created: '2025-01-01T00:00:00.000Z',
        tiles: Object.freeze([
            Object.freeze({ structure: 'open_space_3x3',      weight: 2, rotations: Object.freeze([0,90,180,270]), constraints: Object.freeze({}) }),
            Object.freeze({ structure: 'corridor_ns',    weight: 5, rotations: Object.freeze([0,90]),          constraints: Object.freeze({}) }),
            Object.freeze({ structure: 'corridor_nsew',  weight: 3, rotations: Object.freeze([0]),             constraints: Object.freeze({}) }),
            Object.freeze({ structure: 'corner_ne',      weight: 3, rotations: Object.freeze([0,90,180,270]),  constraints: Object.freeze({}) }),
            Object.freeze({ structure: 'corridor_nse',   weight: 2, rotations: Object.freeze([0,90,180,270]),  constraints: Object.freeze({}) }),
            Object.freeze({ structure: 'dead_end_n',     weight: 1, rotations: Object.freeze([0,90,180,270]),  constraints: Object.freeze({}) })
        ])
    })
});

export const BUILT_IN_TILESET_IDS = Object.freeze(['basic_dungeon']);
export function isBuiltInTileset(id){ return BUILT_IN_TILESET_IDS.includes(id); }
export function listDefaultTilesets(){
    const t = DEFAULT_TILESETS.basic_dungeon; return [{ id: t.id, name: t.name, description: t.description, tileCount: t.tiles.length }];
}
export const DEFAULT_TILESETS_VERSION = '2.0';