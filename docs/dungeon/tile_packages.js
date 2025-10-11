/**
 * TilePackages - Complete tileset configurations
 * 
 * This module defines named combinations of tile structures with
 * metadata packages to create complete tilesets for different
 * dungeon generation scenarios.
 */

export class TilePackages {
    
    static packages = {
        
        // Standard dungeon configuration (matches current tileset)
        standard_dungeon: [
            // Cross intersection (index 0)
            {
                structure_name: 'corridor_nsew',
                weight_package: 'balanced',
                role_package: 'standard',
                rotation: 0,
                properties: 'default'
            },
            
            // Straight corridor (single base definition; east-west achieved via rotation metadata)
            {
                structure_name: 'corridor_ns',
                weight_package: 'balanced',
                role_package: 'standard',
                rotation: 0,
                properties: 'default'
            },
            
            // T-junctions (all 4 rotations)
            {
                structure_name: 'corridor_nse',
                weight_package: 'balanced',
                role_package: 'standard',
                rotation: 0,
                properties: 'default'
            },
            {
                structure_name: 'corridor_nse',
                weight_package: 'balanced',
                role_package: 'standard',
                rotation: 90,
                properties: 'default'
            },
            {
                structure_name: 'corridor_nse',
                weight_package: 'balanced',
                role_package: 'standard',
                rotation: 180,
                properties: 'default'
            },
            {
                structure_name: 'corridor_nse',
                weight_package: 'balanced',
                role_package: 'standard',
                rotation: 270,
                properties: 'default'
            },
            
            // L-corners (all 4 rotations)
            {
                structure_name: 'corner_ne',
                weight_package: 'balanced',
                role_package: 'standard',
                rotation: 0,
                properties: 'default'
            },
            {
                structure_name: 'corner_ne',
                weight_package: 'balanced',
                role_package: 'standard',
                rotation: 90,
                properties: 'default'
            },
            {
                structure_name: 'corner_ne',
                weight_package: 'balanced',
                role_package: 'standard',
                rotation: 180,
                properties: 'default'
            },
            {
                structure_name: 'corner_ne',
                weight_package: 'balanced',
                role_package: 'standard',
                rotation: 270,
                properties: 'default'
            },
            
            // Room
            {
                structure_name: 'open_space_3x3',
                weight_package: 'balanced',
                role_package: 'standard',
                rotation: 0,
                properties: 'default'
            },
            
            // Stairs
            {
                structure_name: 'stair_up',
                weight_package: 'balanced',
                role_package: 'standard',
                rotation: 0,
                properties: 'default'
            },
            {
                structure_name: 'stair_down',
                weight_package: 'balanced',
                role_package: 'standard',
                rotation: 0,
                properties: 'default'
            }
        ],

        // High connectivity configuration
        high_connectivity: [
            // More corridors and stairs for better 3D connectivity
            {
                structure_name: 'corridor_nsew',
                weight_package: 'high_connectivity',
                role_package: 'standard',
                rotation: 0,
                properties: 'default'
            },
            {
                structure_name: 'corridor_ns',
                weight_package: 'high_connectivity',
                role_package: 'standard',
                rotation: 0,
                properties: 'default'
            },
            
            // Multiple T-junctions
            {
                structure_name: 'corridor_nse',
                weight_package: 'high_connectivity',
                role_package: 'standard',
                rotation: 0,
                properties: 'default'
            },
            {
                structure_name: 'corridor_nse',
                weight_package: 'high_connectivity',
                role_package: 'standard',
                rotation: 90,
                properties: 'default'
            },
            {
                structure_name: 'corridor_nse',
                weight_package: 'high_connectivity',
                role_package: 'standard',
                rotation: 180,
                properties: 'default'
            },
            {
                structure_name: 'corridor_nse',
                weight_package: 'high_connectivity',
                role_package: 'standard',
                rotation: 270,
                properties: 'default'
            },
            
            // L-corners
            {
                structure_name: 'corner_ne',
                weight_package: 'high_connectivity',
                role_package: 'standard',
                rotation: 0,
                properties: 'default'
            },
            {
                structure_name: 'corner_ne',
                weight_package: 'high_connectivity',
                role_package: 'standard',
                rotation: 90,
                properties: 'default'
            },
            {
                structure_name: 'corner_ne',
                weight_package: 'high_connectivity',
                role_package: 'standard',
                rotation: 180,
                properties: 'default'
            },
            {
                structure_name: 'corner_ne',
                weight_package: 'high_connectivity',
                role_package: 'standard',
                rotation: 270,
                properties: 'default'
            },
            
            // High-weight stairs for vertical connectivity
            {
                structure_name: 'stair_up',
                weight_package: 'high_connectivity',
                role_package: 'standard',
                rotation: 0,
                properties: 'default'
            },
            {
                structure_name: 'stair_down',
                weight_package: 'high_connectivity',
                role_package: 'standard',
                rotation: 0,
                properties: 'default'
            }
        ],

        // Minimal clumping configuration
        minimal_clumping: [
            {
                structure_name: 'corridor_nsew',
                weight_package: 'anti_clumping',
                role_package: 'standard',
                rotation: 0,
                properties: 'default'
            },
            {
                structure_name: 'corridor_ns',
                weight_package: 'anti_clumping',
                role_package: 'standard',
                rotation: 0,
                properties: 'default'
            },
            
            // Reduced T-junctions to prevent clumping
            {
                structure_name: 'corridor_nse',
                weight_package: 'anti_clumping',
                role_package: 'standard',
                rotation: 0,
                properties: 'default'
            },
            {
                structure_name: 'corridor_nse',
                weight_package: 'anti_clumping',
                role_package: 'standard',
                rotation: 90,
                properties: 'default'
            },
            {
                structure_name: 'corridor_nse',
                weight_package: 'anti_clumping',
                role_package: 'standard',
                rotation: 180,
                properties: 'default'
            },
            {
                structure_name: 'corridor_nse',
                weight_package: 'anti_clumping',
                role_package: 'standard',
                rotation: 270,
                properties: 'default'
            },
            
            // More dead ends to break up corridors
            {
                structure_name: 'dead_end_n',
                weight_package: 'anti_clumping',
                role_package: 'standard',
                rotation: 0,
                properties: 'default'
            },
            {
                structure_name: 'dead_end_n',
                weight_package: 'anti_clumping',
                role_package: 'standard',
                rotation: 90,
                properties: 'default'
            },
            {
                structure_name: 'dead_end_n',
                weight_package: 'anti_clumping',
                role_package: 'standard',
                rotation: 180,
                properties: 'default'
            },
            {
                structure_name: 'dead_end_n',
                weight_package: 'anti_clumping',
                role_package: 'standard',
                rotation: 270,
                properties: 'default'
            },
            
            // Standard stairs
            {
                structure_name: 'stair_up',
                weight_package: 'anti_clumping',
                role_package: 'standard',
                rotation: 0,
                properties: 'default'
            },
            {
                structure_name: 'stair_down',
                weight_package: 'anti_clumping',
                role_package: 'standard',
                rotation: 0,
                properties: 'default'
            }
        ],

        // Multi-level dungeon with open spaces (experimental)
        multi_level_dungeon: [
            // Standard tiles
            {
                structure_name: 'corridor_nsew',
                weight_package: 'multi_level_experimental',
                role_package: 'standard',
                rotation: 0,
                properties: 'default'
            },
            {
                structure_name: 'corridor_ns',
                weight_package: 'multi_level_experimental',
                role_package: 'standard',
                rotation: 0,
                properties: 'default'
            },
            {
                structure_name: 'corridor_ew',
                weight_package: 'multi_level_experimental',
                role_package: 'standard',
                rotation: 0,
                properties: 'default'
            },
            
            // Junctions
            {
                structure_name: 'corridor_nse',
                weight_package: 'multi_level_experimental',
                role_package: 'standard',
                rotation: 0,
                properties: 'default'
            },
            {
                structure_name: 'corridor_nse',
                weight_package: 'multi_level_experimental',
                role_package: 'standard',
                rotation: 90,
                properties: 'default'
            },
            {
                structure_name: 'corridor_nse',
                weight_package: 'multi_level_experimental',
                role_package: 'standard',
                rotation: 180,
                properties: 'default'
            },
            {
                structure_name: 'corridor_nse',
                weight_package: 'multi_level_experimental',
                role_package: 'standard',
                rotation: 270,
                properties: 'default'
            },
            
            // Corners
            {
                structure_name: 'corner_ne',
                weight_package: 'multi_level_experimental',
                role_package: 'standard',
                rotation: 0,
                properties: 'default'
            },
            {
                structure_name: 'corner_ne',
                weight_package: 'multi_level_experimental',
                role_package: 'standard',
                rotation: 90,
                properties: 'default'
            },
            {
                structure_name: 'corner_ne',
                weight_package: 'multi_level_experimental',
                role_package: 'standard',
                rotation: 180,
                properties: 'default'
            },
            {
                structure_name: 'corner_ne',
                weight_package: 'multi_level_experimental',
                role_package: 'standard',
                rotation: 270,
                properties: 'default'
            },
            
            // Enhanced stairs
            {
                structure_name: 'stair_up',
                weight_package: 'multi_level_experimental',
                role_package: 'standard',
                rotation: 0,
                properties: 'default'
            },
            {
                structure_name: 'stair_down',
                weight_package: 'multi_level_experimental',
                role_package: 'standard',
                rotation: 0,
                properties: 'default'
            },
            
            // Multi-level open spaces (Note: These need compatible edge patterns to work)
            {
                structure_name: 'multi_level_open',
                weight_package: 'multi_level_experimental',
                role_package: 'standard',
                rotation: 0,
                properties: 'high_contrast'
            }
        ],

        // Room-heavy configuration
        room_heavy: [
            // Standard corridors
            {
                structure_name: 'corridor_nsew',
                weight_package: 'room_heavy',
                role_package: 'standard',
                rotation: 0,
                properties: 'default'
            },
            {
                structure_name: 'corridor_ns',
                weight_package: 'room_heavy',
                role_package: 'standard',
                rotation: 0,
                properties: 'default'
            },
            {
                structure_name: 'corridor_ew',
                weight_package: 'room_heavy',
                role_package: 'standard',
                rotation: 0,
                properties: 'default'
            },
            
            // Heavy focus on rooms
            {
                structure_name: 'open_space_3x3',
                weight_package: 'room_heavy',
                role_package: 'standard',
                rotation: 0,
                properties: 'default'
            },
            
            // T-junctions to connect rooms
            {
                structure_name: 'corridor_nse',
                weight_package: 'room_heavy',
                role_package: 'standard',
                rotation: 0,
                properties: 'default'
            },
            {
                structure_name: 'corridor_nse',
                weight_package: 'room_heavy',
                role_package: 'standard',
                rotation: 90,
                properties: 'default'
            },
            {
                structure_name: 'corridor_nse',
                weight_package: 'room_heavy',
                role_package: 'standard',
                rotation: 180,
                properties: 'default'
            },
            {
                structure_name: 'corridor_nse',
                weight_package: 'room_heavy',
                role_package: 'standard',
                rotation: 270,
                properties: 'default'
            },
            
            // Minimal stairs
            {
                structure_name: 'stair_up',
                weight_package: 'room_heavy',
                role_package: 'standard',
                rotation: 0,
                properties: 'default'
            },
            {
                structure_name: 'stair_down',
                weight_package: 'room_heavy',
                role_package: 'standard',
                rotation: 0,
                properties: 'default'
            }
        ]
    };

    /**
     * Get a tile package by name
     */
    static get(name) {
        if (!this.packages[name]) {
            throw new Error(`Tile package '${name}' not found`);
        }
        return [...this.packages[name]]; // Return a copy
    }

    /**
     * Get all available package names
     */
    static getNames() {
        return Object.keys(this.packages);
    }

    /**
     * Get all packages
     */
    static getAll() {
        const result = {};
        for (const [name, packageConfig] of Object.entries(this.packages)) {
            result[name] = [...packageConfig];
        }
        return result;
    }

    /**
     * Create a custom package
     */
    static create(name, tileConfigs) {
        // Validate tile configurations
        for (const config of tileConfigs) {
            this.validateTileConfig(config);
        }
        
        this.packages[name] = [...tileConfigs];
        return this.get(name);
    }

    /**
     * Validate a tile configuration
     */
    static validateTileConfig(config) {
        const required = ['structure_name', 'weight_package', 'role_package', 'rotation'];
        
        for (const field of required) {
            if (!(field in config)) {
                throw new Error(`Tile config missing required field: ${field}`);
            }
        }

        if (typeof config.structure_name !== 'string') {
            throw new Error('structure_name must be a string');
        }

        if (typeof config.weight_package !== 'string') {
            throw new Error('weight_package must be a string');
        }

        if (typeof config.role_package !== 'string') {
            throw new Error('role_package must be a string');
        }

        if (typeof config.rotation !== 'number' || 
            config.rotation % 90 !== 0 || 
            config.rotation < 0 || 
            config.rotation >= 360) {
            throw new Error('rotation must be 0, 90, 180, or 270');
        }

        return true;
    }

    /**
     * Merge multiple packages
     */
    static merge(name, ...packageNames) {
        const merged = [];
        
        for (const packageName of packageNames) {
            const packageConfig = this.get(packageName);
            merged.push(...packageConfig);
        }
        
        this.packages[name] = merged;
        return this.get(name);
    }

    /**
     * Get package statistics
     */
    static getStats(name) {
        const packageConfig = this.get(name);
        
        const structureCount = {};
        const weightPackageCount = {};
        const rolePackageCount = {};
        const rotationCount = {};
        
        for (const config of packageConfig) {
            // Count structures
            structureCount[config.structure_name] = 
                (structureCount[config.structure_name] || 0) + 1;
            
            // Count weight packages
            weightPackageCount[config.weight_package] = 
                (weightPackageCount[config.weight_package] || 0) + 1;
            
            // Count role packages
            rolePackageCount[config.role_package] = 
                (rolePackageCount[config.role_package] || 0) + 1;
            
            // Count rotations
            rotationCount[config.rotation] = 
                (rotationCount[config.rotation] || 0) + 1;
        }
        
        return {
            totalTiles: packageConfig.length,
            structureCount,
            weightPackageCount,
            rolePackageCount,
            rotationCount
        };
    }

    /**
     * Filter package by criteria
     */
    static filter(name, criteria) {
        const packageConfig = this.get(name);
        
        return packageConfig.filter(config => {
            for (const [key, value] of Object.entries(criteria)) {
                if (config[key] !== value) {
                    return false;
                }
            }
            return true;
        });
    }
}