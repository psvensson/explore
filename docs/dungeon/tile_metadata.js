/**
 * TileMetadata - Weight and role packages for dungeon generation
 * 
 * This module defines reusable metadata packages that can be combined
 * with tile structures to create different dungeon generation behaviors.
 */

export class TileMetadata {
    
    // Weight packages define the likelihood of different tile types appearing
    static weightPackages = {
        
        // Balanced generation - equal representation
        balanced: {
            corridor_weights: 1.0,
            room_weights: 1.0,
            stair_weights: 0.5,
            dead_end_weights: 0.3,
            open_space_weights: 0.1
        },

        // High connectivity - more stairs and corridors
        high_connectivity: {
            corridor_weights: 1.2,
            room_weights: 0.8,
            stair_weights: 2.0,
            dead_end_weights: 0.2,
            open_space_weights: 0.1
        },

        // High stair connectivity - specifically for better vertical movement
        high_stair_connectivity: {
            corridor_weights: 1.0,
            room_weights: 0.8,
            stair_weights: 3.0,
            dead_end_weights: 0.3,
            open_space_weights: 0.1
        },

        // Anti-clumping - favor corridors over rooms
        anti_clumping: {
            corridor_weights: 1.5,
            room_weights: 0.5,
            stair_weights: 1.0,
            dead_end_weights: 0.4,
            open_space_weights: 0.1
        },

        // Room-heavy - more large spaces
        room_heavy: {
            corridor_weights: 0.8,
            room_weights: 2.0,
            stair_weights: 0.5,
            dead_end_weights: 0.2,
            open_space_weights: 0.3
        },

        // Minimal - simple layout
        minimal: {
            corridor_weights: 1.0,
            room_weights: 0.3,
            stair_weights: 0.1,
            dead_end_weights: 0.5,
            open_space_weights: 0.0
        },

        // Multi-level experimental
        multi_level_experimental: {
            corridor_weights: 0.8,
            room_weights: 0.6,
            stair_weights: 1.5,
            dead_end_weights: 0.3,
            open_space_weights: 0.8
        }
    };

    // Role packages define the functional purpose of tiles
    static rolePackages = {
        
        // Standard dungeon roles
        standard: {
            corridor_role: 'corridor',
            room_role: 'room',
            stair_role: 'stair',
            stair_up_role: 'stair_up',
            stair_down_role: 'stair_down',
            dead_end_role: 'corridor',
            open_space_role: 'open_space'
        },

        // Navigation-focused roles
        navigation: {
            corridor_role: 'pathway',
            room_role: 'landmark',
            stair_up_role: 'ascent',
            stair_down_role: 'descent',
            dead_end_role: 'terminus',
            open_space_role: 'void'
        },

        // Tactical roles for gameplay
        tactical: {
            corridor_role: 'chokepoint',
            room_role: 'arena',
            stair_up_role: 'elevation',
            stair_down_role: 'depression',
            dead_end_role: 'ambush',
            open_space_role: 'vista'
        }
    };

    // Special property packages
    static propertyPackages = {
        
        // Default properties
        default: {
            lighting: 'normal',
            accessibility: 'standard',
            danger_level: 'low'
        },

        // High-contrast properties
        high_contrast: {
            lighting: 'dramatic',
            accessibility: 'challenging',
            danger_level: 'high'
        },

        // Accessibility-friendly
        accessible: {
            lighting: 'bright',
            accessibility: 'easy',
            danger_level: 'minimal'
        }
    };

    /**
     * Get a weight package by name
     */
    static getWeightPackage(name) {
        if (!this.weightPackages[name]) {
            throw new Error(`Weight package '${name}' not found`);
        }
        return { ...this.weightPackages[name] };
    }

    /**
     * Get a role package by name
     */
    static getRolePackage(name) {
        if (!this.rolePackages[name]) {
            throw new Error(`Role package '${name}' not found`);
        }
        return { ...this.rolePackages[name] };
    }

    /**
     * Get a property package by name
     */
    static getPropertyPackage(name) {
        if (!this.propertyPackages[name]) {
            throw new Error(`Property package '${name}' not found`);
        }
        return { ...this.propertyPackages[name] };
    }

    /**
     * Get all available weight package names
     */
    static getWeightPackageNames() {
        return Object.keys(this.weightPackages);
    }

    /**
     * Get all available role package names
     */
    static getRolePackageNames() {
        return Object.keys(this.rolePackages);
    }

    /**
     * Get all available property package names
     */
    static getPropertyPackageNames() {
        return Object.keys(this.propertyPackages);
    }

    /**
     * Create a custom weight package
     */
    static createWeightPackage(name, weights) {
        const requiredWeights = [
            'corridor_weights', 'room_weights', 'stair_weights', 
            'dead_end_weights', 'open_space_weights'
        ];
        
        for (const weight of requiredWeights) {
            if (typeof weights[weight] !== 'number' || weights[weight] < 0) {
                throw new Error(`Weight package must include positive number for ${weight}`);
            }
        }
        
        this.weightPackages[name] = { ...weights };
        return this.getWeightPackage(name);
    }

    /**
     * Create a custom role package
     */
    static createRolePackage(name, roles) {
        const requiredRoles = [
            'corridor_role', 'room_role', 'stair_up_role',
            'stair_down_role', 'dead_end_role', 'open_space_role'
        ];
        
        for (const role of requiredRoles) {
            if (typeof roles[role] !== 'string') {
                throw new Error(`Role package must include string for ${role}`);
            }
        }
        
        this.rolePackages[name] = { ...roles };
        return this.getRolePackage(name);
    }

    /**
     * Get weight for a specific tile type from a package
     */
    static getWeight(packageName, tileType) {
        const weightPackage = this.getWeightPackage(packageName);
        const weightKey = `${tileType}_weights`;
        
        if (!(weightKey in weightPackage)) {
            throw new Error(`No weight defined for tile type '${tileType}' in package '${packageName}'`);
        }
        
        return weightPackage[weightKey];
    }

    /**
     * Get role for a specific tile type from a package
     */
    static getRole(packageName, tileType) {
        const rolePackage = this.getRolePackage(packageName);
        const roleKey = `${tileType}_role`;
        
        if (!(roleKey in rolePackage)) {
            throw new Error(`No role defined for tile type '${tileType}' in package '${packageName}'`);
        }
        
        return rolePackage[roleKey];
    }

    /**
     * Merge multiple weight packages (later packages override earlier ones)
     */
    static mergeWeightPackages(...packageNames) {
        const merged = {};
        
        for (const packageName of packageNames) {
            const weightPackage = this.getWeightPackage(packageName);
            Object.assign(merged, weightPackage);
        }
        
        return merged;
    }

    /**
     * Scale weights in a package by a multiplier
     */
    static scaleWeights(packageName, multiplier) {
        const weightPackage = this.getWeightPackage(packageName);
        const scaled = {};
        
        for (const [key, value] of Object.entries(weightPackage)) {
            scaled[key] = value * multiplier;
        }
        
        return scaled;
    }

    /**
     * Validate that a weight package has all required weights
     */
    static validateWeightPackage(weights) {
        const required = [
            'corridor_weights', 'room_weights', 'stair_weights',
            'dead_end_weights', 'open_space_weights'
        ];
        
        for (const weightType of required) {
            if (!(weightType in weights)) {
                throw new Error(`Missing required weight: ${weightType}`);
            }
            
            if (typeof weights[weightType] !== 'number' || weights[weightType] < 0) {
                throw new Error(`Weight ${weightType} must be a non-negative number`);
            }
        }
        
        return true;
    }

    /**
     * Validate that a role package has all required roles
     */
    static validateRolePackage(roles) {
        const required = [
            'corridor_role', 'room_role', 'stair_up_role',
            'stair_down_role', 'dead_end_role', 'open_space_role'
        ];
        
        for (const roleType of required) {
            if (!(roleType in roles)) {
                throw new Error(`Missing required role: ${roleType}`);
            }
            
            if (typeof roles[roleType] !== 'string') {
                throw new Error(`Role ${roleType} must be a string`);
            }
        }
        
        return true;
    }
}