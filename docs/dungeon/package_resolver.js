/**
 * PackageResolver - Combines tile structures with metadata to create WFC-compatible tilesets
 * 
 * This module resolves tile package configurations into the format expected
 * by the WFC system, combining geometric structures with weights and roles.
 */

import { TileStructures } from './tile_structures.js';
import { TileMetadata } from './tile_metadata.js';
import { TilePackages } from './tile_packages.js';

export class PackageResolver {
    
    constructor() {
        this.cache = new Map();
        this.debugMode = false;
    }

    /**
     * Enable or disable debug mode for verbose logging
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }

    /**
     * Resolve a tile package to WFC-compatible format
     */
    resolve(packageName, options = {}) {
        const cacheKey = `${packageName}_${JSON.stringify(options)}`;
        
        if (this.cache.has(cacheKey) && !options.noCache) {
            return this.cache.get(cacheKey);
        }

        try {
            const packageConfig = TilePackages.get(packageName);
            const resolved = this._resolvePackageConfig(packageConfig, options);
            
            this.cache.set(cacheKey, resolved);
            return resolved;
        } catch (error) {
            throw new Error(`Failed to resolve package '${packageName}': ${error.message}`);
        }
    }

    /**
     * Resolve a package configuration to tiles
     */
    _resolvePackageConfig(packageConfig, options = {}) {
        const resolved = [];
        
        for (let i = 0; i < packageConfig.length; i++) {
            const config = packageConfig[i];
            
            try {
                const resolvedTile = this._resolveTileConfig(config, i, options);
                resolved.push(resolvedTile);
            } catch (error) {
                if (this.debugMode) {
                    console.warn(`Skipping tile ${i}: ${error.message}`);
                }
                if (!options.skipErrors) {
                    throw error;
                }
            }
        }
        
        return resolved;
    }

    /**
     * Resolve a single tile configuration
     */
    _resolveTileConfig(config, index, options = {}) {
        // Get base structure
        const baseStructure = TileStructures.get(config.structure_name);
        
        // Apply rotation if specified
        const structure = config.rotation > 0 
            ? TileStructures.rotate(baseStructure, config.rotation)
            : baseStructure;
        
        // Get weight and role
        const weight = this._resolveWeight(config, structure.type);
        const role = this._resolveRole(config, structure.type);
        
        // Get properties if specified
        const properties = config.properties 
            ? TileMetadata.getPropertyPackage(config.properties)
            : TileMetadata.getPropertyPackage('default');

        // Create WFC-compatible tile
        const resolvedTile = {
            id: index,
            structure: structure.structure,
            edges: structure.edges,
            weight: weight,
            role: role,
            type: structure.type,
            properties: properties,
            source: {
                structure_name: config.structure_name,
                weight_package: config.weight_package,
                role_package: config.role_package,
                rotation: config.rotation
            }
        };

        // Apply any options-based modifications
        if (options.weightMultiplier) {
            resolvedTile.weight *= options.weightMultiplier;
        }

        if (options.filterTypes && !options.filterTypes.includes(structure.type)) {
            throw new Error(`Tile type '${structure.type}' filtered out`);
        }

        return resolvedTile;
    }

    /**
     * Resolve weight for a tile configuration
     */
    _resolveWeight(config, structureType) {
        try {
            return TileMetadata.getWeight(config.weight_package, structureType);
        } catch (error) {
            // Fallback to default weights
            if (this.debugMode) {
                console.warn(`Weight resolution failed: ${error.message}, using default`);
            }
            return TileMetadata.getWeight('balanced', structureType);
        }
    }

    /**
     * Resolve role for a tile configuration
     */
    _resolveRole(config, structureType) {
        try {
            // Handle stair types specially
            if (structureType === 'stair') {
                const structureName = config.structure_name;
                if (structureName === 'stair_up') {
                    return TileMetadata.getRole(config.role_package, 'stair_up');
                } else if (structureName === 'stair_down') {
                    return TileMetadata.getRole(config.role_package, 'stair_down');
                } else {
                    // Generic stair role
                    return TileMetadata.getRole(config.role_package, 'stair');
                }
            }
            
            return TileMetadata.getRole(config.role_package, structureType);
        } catch (error) {
            // Fallback to default roles
            if (this.debugMode) {
                console.warn(`Role resolution failed: ${error.message}, using default`);
            }
            
            // Try specific stair roles first for stairs
            if (structureType === 'stair') {
                try {
                    const structureName = config.structure_name;
                    if (structureName === 'stair_up') {
                        return TileMetadata.getRole('standard', 'stair_up');
                    } else if (structureName === 'stair_down') {
                        return TileMetadata.getRole('standard', 'stair_down');
                    }
                } catch {
                    // Fall through to generic
                }
            }
            
            return TileMetadata.getRole('standard', structureType);
        }
    }

    /**
     * Validate resolved tileset for WFC compatibility
     */
    validate(resolvedTiles) {
        const errors = [];
        
        // Check that all tiles have required properties
        for (let i = 0; i < resolvedTiles.length; i++) {
            const tile = resolvedTiles[i];
            
            if (!tile.structure || !Array.isArray(tile.structure)) {
                errors.push(`Tile ${i}: Missing or invalid structure`);
            }
            
            if (!tile.edges || !Array.isArray(tile.edges) || tile.edges.length !== 4) {
                errors.push(`Tile ${i}: Missing or invalid edges`);
            }
            
            if (typeof tile.weight !== 'number' || tile.weight < 0) {
                errors.push(`Tile ${i}: Invalid weight`);
            }
            
            if (!tile.role || typeof tile.role !== 'string') {
                errors.push(`Tile ${i}: Missing or invalid role`);
            }
        }
        
        // Check edge pattern compatibility
        const edgePatterns = new Set();
        for (const tile of resolvedTiles) {
            if (tile.edges) {
                tile.edges.forEach(edge => edgePatterns.add(edge));
            }
        }
        
        // Warn about isolated patterns
        const isolatedPatterns = [];
        for (const pattern of edgePatterns) {
            if (pattern === '000') continue; // Empty edges are OK
            
            // Check if any other tiles can connect to this pattern
            let hasConnection = false;
            for (const otherPattern of edgePatterns) {
                if (otherPattern !== pattern && this._patternsCanConnect(pattern, otherPattern)) {
                    hasConnection = true;
                    break;
                }
            }
            
            if (!hasConnection) {
                isolatedPatterns.push(pattern);
            }
        }
        
        if (isolatedPatterns.length > 0) {
            errors.push(`Isolated edge patterns (may not connect): ${isolatedPatterns.join(', ')}`);
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors,
            warnings: isolatedPatterns.length > 0 ? [`${isolatedPatterns.length} isolated patterns`] : []
        };
    }

    /**
     * Check if two edge patterns can connect
     */
    _patternsCanConnect(pattern1, pattern2) {
        // Simple heuristic: patterns can connect if they're not identical
        // and at least one is not '000'
        return pattern1 !== pattern2 && (pattern1 !== '000' || pattern2 !== '000');
    }

    /**
     * Get statistics about a resolved tileset
     */
    getStats(resolvedTiles) {
        const stats = {
            totalTiles: resolvedTiles.length,
            typeCount: {},
            roleCount: {},
            edgePatterns: new Set(),
            weightDistribution: {},
            averageWeight: 0
        };
        
        let totalWeight = 0;
        
        for (const tile of resolvedTiles) {
            // Count types
            stats.typeCount[tile.type] = (stats.typeCount[tile.type] || 0) + 1;
            
            // Count roles
            stats.roleCount[tile.role] = (stats.roleCount[tile.role] || 0) + 1;
            
            // Collect edge patterns
            if (tile.edges) {
                tile.edges.forEach(edge => stats.edgePatterns.add(edge));
            }
            
            // Weight distribution
            const weightRange = this._getWeightRange(tile.weight);
            stats.weightDistribution[weightRange] = (stats.weightDistribution[weightRange] || 0) + 1;
            
            totalWeight += tile.weight;
        }
        
        stats.averageWeight = totalWeight / resolvedTiles.length;
        stats.edgePatterns = Array.from(stats.edgePatterns);
        
        return stats;
    }

    /**
     * Get weight range for statistics
     */
    _getWeightRange(weight) {
        if (weight === 0) return '0';
        if (weight < 0.5) return '0-0.5';
        if (weight < 1.0) return '0.5-1.0';
        if (weight < 2.0) return '1.0-2.0';
        return '2.0+';
    }

    /**
     * Clear resolution cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Create a custom tileset by mixing packages
     */
    createMixedTileset(name, packageMixes) {
        const allConfigs = [];
        
        for (const mix of packageMixes) {
            const packageConfig = TilePackages.get(mix.package);
            let selectedConfigs = packageConfig;
            
            // Apply filters if specified
            if (mix.filter) {
                selectedConfigs = packageConfig.filter(config => {
                    for (const [key, value] of Object.entries(mix.filter)) {
                        if (config[key] !== value) return false;
                    }
                    return true;
                });
            }
            
            // Apply weight multiplier if specified
            if (mix.weightMultiplier && mix.weightMultiplier !== 1.0) {
                selectedConfigs = selectedConfigs.map(config => ({
                    ...config,
                    weight_package: this._createScaledWeightPackage(
                        config.weight_package, 
                        mix.weightMultiplier
                    )
                }));
            }
            
            allConfigs.push(...selectedConfigs);
        }
        
        return this._resolvePackageConfig(allConfigs);
    }

    /**
     * Create a scaled weight package
     */
    _createScaledWeightPackage(basePackageName, multiplier) {
        const scaledName = `${basePackageName}_scaled_${multiplier}`;
        
        // Check if already exists
        try {
            return TileMetadata.getWeightPackage(scaledName);
        } catch {
            // Create new scaled package
            const baseWeights = TileMetadata.getWeightPackage(basePackageName);
            const scaledWeights = TileMetadata.scaleWeights(basePackageName, multiplier);
            
            TileMetadata.createWeightPackage(scaledName, scaledWeights);
            return scaledName;
        }
    }

    /**
     * Compare two resolved tilesets
     */
    compare(tileset1, tileset2) {
        const stats1 = this.getStats(tileset1);
        const stats2 = this.getStats(tileset2);
        
        return {
            tileset1: stats1,
            tileset2: stats2,
            differences: {
                tileCountDiff: stats2.totalTiles - stats1.totalTiles,
                avgWeightDiff: stats2.averageWeight - stats1.averageWeight,
                typeCountDiff: this._compareCounts(stats1.typeCount, stats2.typeCount),
                roleCountDiff: this._compareCounts(stats1.roleCount, stats2.roleCount)
            }
        };
    }

    /**
     * Compare count objects
     */
    _compareCounts(counts1, counts2) {
        const allKeys = new Set([...Object.keys(counts1), ...Object.keys(counts2)]);
        const diff = {};
        
        for (const key of allKeys) {
            const count1 = counts1[key] || 0;
            const count2 = counts2[key] || 0;
            if (count1 !== count2) {
                diff[key] = count2 - count1;
            }
        }
        
        return diff;
    }
}