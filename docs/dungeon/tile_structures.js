/**
 * TileStructures - Pure geometric tile definitions
 * 
 * This module defines the base geometric structures for dungeon tiles,
 * separated from weights, roles, and other metadata. Each structure
 * defines the 3D voxel layout and edge connection patterns.
 */

export class TileStructures {
    
    static structures = {
        // Cross intersection - connects in all 4 directions
        corridor_nsew: {
            structure: [
                [[0, 1, 0],
                 [1, 1, 1],
                 [0, 1, 0]]
            ],
            edges: ['101', '101', '101', '101'], // n, e, s, w
            type: 'corridor'
        },

        // Straight corridor - north-south
        corridor_ns: {
            structure: [
                [[0, 0, 0],
                 [1, 1, 1],
                 [0, 0, 0]]
            ],
            edges: ['101', '000', '101', '000'], // n, e, s, w
            type: 'corridor'
        },

        // Straight corridor - east-west
        corridor_ew: {
            structure: [
                [[0, 1, 0],
                 [0, 1, 0],
                 [0, 1, 0]]
            ],
            edges: ['000', '101', '000', '101'], // n, e, s, w
            type: 'corridor'
        },

        // T-junction - connects north, south, east
        corridor_nse: {
            structure: [
                [[0, 0, 0],
                 [1, 1, 1],
                 [0, 1, 0]]
            ],
            edges: ['101', '101', '101', '000'], // n, e, s, w
            type: 'corridor'
        },

        // L-corner - connects north and east
        corner_ne: {
            structure: [
                [[0, 0, 0],
                 [1, 1, 1],
                 [0, 0, 0]]
            ],
            edges: ['101', '101', '000', '000'], // n, e, s, w
            type: 'corridor'
        },

        // Small room (3x3)
        room_3x3: {
            structure: [
                [[1, 1, 1],
                 [1, 1, 1],
                 [1, 1, 1]]
            ],
            edges: ['111', '111', '111', '111'], // n, e, s, w
            type: 'room'
        },

        // Stairway going up
        stair_up: {
            structure: [
                [[0, 1, 0],
                 [1, 1, 1],
                 [0, 1, 0]],
                [[0, 0, 0],
                 [0, 1, 0],
                 [0, 0, 0]]
            ],
            edges: ['101', '101', '101', '101'], // n, e, s, w
            type: 'stair'
        },

        // Stairway going down
        stair_down: {
            structure: [
                [[0, 0, 0],
                 [0, 1, 0],
                 [0, 0, 0]],
                [[0, 1, 0],
                 [1, 1, 1],
                 [0, 1, 0]]
            ],
            edges: ['101', '101', '101', '101'], // n, e, s, w
            type: 'stair'
        },

        // Dead end - connects only north
        dead_end_n: {
            structure: [
                [[0, 0, 0],
                 [0, 1, 1],
                 [0, 0, 0]]
            ],
            edges: ['101', '000', '000', '000'], // n, e, s, w
            type: 'corridor'
        },

        // Multi-level open space (experimental)
        multi_level_open: {
            structure: [
                [[0, 1, 0],
                 [1, 1, 1],
                 [0, 1, 0]],
                [[0, 1, 0],
                 [1, 1, 1],
                 [0, 1, 0]]
            ],
            edges: ['000', '000', '000', '000'], // No connections - open space
            type: 'open_space'
        }
    };

    /**
     * Get all available structures
     */
    static getAll() {
        return { ...this.structures };
    }

    /**
     * Get a specific structure by name
     */
    static get(name) {
        if (!this.structures[name]) {
            throw new Error(`Structure '${name}' not found`);
        }
        return { ...this.structures[name] };
    }

    /**
     * Get all structure names
     */
    static getNames() {
        return Object.keys(this.structures);
    }

    /**
     * Rotate a structure by the given angle (90, 180, 270 degrees)
     */
    static rotate(structure, angle) {
        const rotations = angle / 90;
        if (rotations % 1 !== 0 || rotations < 0 || rotations > 3) {
            throw new Error('Angle must be 0, 90, 180, or 270 degrees');
        }

        let rotatedStructure = { ...structure };
        
        for (let i = 0; i < rotations; i++) {
            rotatedStructure = this._rotateSingle(rotatedStructure);
        }
        
        return rotatedStructure;
    }

    /**
     * Rotate structure by 90 degrees clockwise
     */
    static _rotateSingle(structure) {
        const rotatedLayers = structure.structure.map(layer => {
            const size = layer.length;
            const rotated = Array(size).fill().map(() => Array(size).fill(0));
            
            for (let i = 0; i < size; i++) {
                for (let j = 0; j < size; j++) {
                    rotated[j][size - 1 - i] = layer[i][j];
                }
            }
            
            return rotated;
        });

        // Rotate edge patterns: [n, e, s, w] -> [w, n, e, s]
        const [n, e, s, w] = structure.edges;
        const rotatedEdges = [w, n, e, s];

        return {
            ...structure,
            structure: rotatedLayers,
            edges: rotatedEdges
        };
    }

    /**
     * Validate that a structure has the correct format
     */
    static validate(structure) {
        if (!structure.structure || !Array.isArray(structure.structure)) {
            throw new Error('Structure must have a structure array');
        }

        if (!structure.edges || !Array.isArray(structure.edges) || structure.edges.length !== 4) {
            throw new Error('Structure must have 4 edge patterns');
        }

        if (!structure.type || typeof structure.type !== 'string') {
            throw new Error('Structure must have a type string');
        }

        // Validate edge patterns
        structure.edges.forEach((edge, index) => {
            if (typeof edge !== 'string' || !edge.match(/^[01]{3}$/)) {
                throw new Error(`Edge ${index} must be a 3-digit binary string`);
            }
        });

        // Validate structure layers
        structure.structure.forEach((layer, layerIndex) => {
            if (!Array.isArray(layer)) {
                throw new Error(`Layer ${layerIndex} must be an array`);
            }
            
            layer.forEach((row, rowIndex) => {
                if (!Array.isArray(row)) {
                    throw new Error(`Layer ${layerIndex}, row ${rowIndex} must be an array`);
                }
                
                row.forEach((cell, cellIndex) => {
                    if (typeof cell !== 'number' || (cell !== 0 && cell !== 1)) {
                        throw new Error(`Cell at layer ${layerIndex}, row ${rowIndex}, col ${cellIndex} must be 0 or 1`);
                    }
                });
            });
        });

        return true;
    }

    /**
     * Create a new structure
     */
    static create(name, structure, edges, type) {
        const newStructure = { structure, edges, type };
        this.validate(newStructure);
        
        return newStructure;
    }

    /**
     * List structures by type
     */
    static getByType(type) {
        return Object.entries(this.structures)
            .filter(([name, structure]) => structure.type === type)
            .reduce((acc, [name, structure]) => {
                acc[name] = structure;
                return acc;
            }, {});
    }
}