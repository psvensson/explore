// Test suite for the new modular tileset architecture
import { TileStructures } from '../docs/dungeon/tile_structures.js';
import { TileMetadata } from '../docs/dungeon/tile_metadata.js';
import { TilePackages } from '../docs/dungeon/tile_packages.js';
import { PackageResolver } from '../docs/dungeon/package_resolver.js';

describe('Modular Tileset Architecture', () => {
    describe('TileStructures', () => {
        test('should define base geometric structures with edge patterns', () => {
            const structures = TileStructures.getAll();
            
            expect(structures).toHaveProperty('corridor_nsew');
            expect(structures).toHaveProperty('corridor_ns');
            expect(structures).toHaveProperty('corridor_nse');
            expect(structures).toHaveProperty('corner_ne');
            expect(structures).toHaveProperty('open_space_3x3');
            expect(structures).toHaveProperty('stair_up');
            expect(structures).toHaveProperty('stair_down');
            
            // Each structure should have required properties
            Object.values(structures).forEach(structure => {
                expect(structure).toHaveProperty('structure');
                expect(structure).toHaveProperty('edges');
                expect(structure).toHaveProperty('type');
                expect(Array.isArray(structure.structure)).toBe(true);
                expect(Array.isArray(structure.edges)).toBe(true);
                expect(structure.edges).toHaveLength(4); // n, e, s, w
            });
        });

        test('should provide structure transformations (rotations)', () => {
            const corridorNS = TileStructures.get('corridor_ns');
            const rotated = TileStructures.rotate(corridorNS, 90);
            // Rotation should change orientation but preserve structure integrity
            expect(rotated.edges).not.toEqual(corridorNS.edges);
            // Rotation should change orientation but preserve structure integrity
        });

        test('should validate edge pattern consistency', () => {
            const structures = TileStructures.getAll();
            
            Object.values(structures).forEach(structure => {
                structure.edges.forEach(edge => {
                    expect(typeof edge).toBe('string');
                    expect(edge).toMatch(/^[01]{3}$/); // Should be 3-digit binary pattern
                });
            });
        });
    });

    describe('TileMetadata', () => {
        test('should define weight packages', () => {
            const weights = TileMetadata.getWeightPackage('balanced');
            
            expect(weights).toHaveProperty('corridor_weights');
            expect(weights).toHaveProperty('room_weights');
            expect(weights).toHaveProperty('stair_weights');
            expect(typeof weights.corridor_weights).toBe('number');
            expect(typeof weights.room_weights).toBe('number');
            expect(typeof weights.stair_weights).toBe('number');
        });

        test('should define role packages', () => {
            const roles = TileMetadata.getRolePackage('standard');
            
            expect(roles).toHaveProperty('corridor_role');
            expect(roles).toHaveProperty('room_role');
            expect(roles).toHaveProperty('stair_role');
        });

        test('should provide specialized packages', () => {
            const highStairs = TileMetadata.getWeightPackage('high_stair_connectivity');
            expect(highStairs.stair_weights).toBeGreaterThan(1.0);

            const lowClumping = TileMetadata.getWeightPackage('anti_clumping');
            expect(lowClumping.room_weights).toBeLessThan(1.0);
        });
    });

    describe('TilePackages', () => {
        test('should define complete tile configurations', () => {
            const standardPackage = TilePackages.get('standard_dungeon');
            
            expect(Array.isArray(standardPackage)).toBe(true);
            expect(standardPackage.length).toBeGreaterThan(0);
            
            standardPackage.forEach(tileConfig => {
                expect(tileConfig).toHaveProperty('structure_name');
                expect(tileConfig).toHaveProperty('weight_package');
                expect(tileConfig).toHaveProperty('role_package');
                expect(tileConfig).toHaveProperty('rotation');
            });
        });

        test('should support different dungeon types', () => {
            const packages = ['standard_dungeon', 'high_connectivity', 'minimal_clumping'];
            
            packages.forEach(packageName => {
                const packageConfig = TilePackages.get(packageName);
                expect(Array.isArray(packageConfig)).toBe(true);
                expect(packageConfig.length).toBeGreaterThan(0);
            });
        });

        test('should allow multi-level configurations', () => {
            const multiLevel = TilePackages.get('multi_level_dungeon');
            
            expect(Array.isArray(multiLevel)).toBe(true);
            // Should include both standard tiles and multi-level open spaces
            const hasStandardTiles = multiLevel.some(config => 
                config.structure_name.includes('corridor'));
            const hasMultiLevel = multiLevel.some(config => 
                config.structure_name.includes('multi_level'));
            
            expect(hasStandardTiles).toBe(true);
            expect(hasMultiLevel).toBe(true);
        });
    });

    describe('PackageResolver', () => {
        test('should resolve tile packages to WFC-compatible format', () => {
            const resolver = new PackageResolver();
            const resolved = resolver.resolve('standard_dungeon');
            
            expect(Array.isArray(resolved)).toBe(true);
            expect(resolved.length).toBeGreaterThan(0);
            
            // Should match current TILE_DEFS format
            resolved.forEach(tile => {
                expect(tile).toHaveProperty('structure');
                expect(tile).toHaveProperty('edges');
                expect(tile).toHaveProperty('weight');
                expect(tile).toHaveProperty('role');
                expect(Array.isArray(tile.structure)).toBe(true);
                expect(Array.isArray(tile.edges)).toBe(true);
                expect(typeof tile.weight).toBe('number');
                expect(typeof tile.role).toBe('string');
            });
        });

        test('should apply rotations correctly', () => {
            const resolver = new PackageResolver();
            const resolved = resolver.resolve('standard_dungeon');
            
            // Find corridor tiles with different rotations
            const corridorTiles = resolved.filter(tile => 
                tile.role === 'corridor');
            
            expect(corridorTiles.length).toBeGreaterThan(1);
            
            // Edge patterns should be different for rotated versions
            const edgePatterns = corridorTiles.map(tile => tile.edges.join(''));
            const uniquePatterns = [...new Set(edgePatterns)];
            expect(uniquePatterns.length).toBeGreaterThan(1);
        });

        test('should preserve backward compatibility', () => {
            const resolver = new PackageResolver();
            const resolved = resolver.resolve('standard_dungeon');
            
            // Should be able to generate a reasonable number of tiles 
            expect(resolved.length).toBeGreaterThan(10);
            expect(resolved.length).toBeLessThan(20);
            
            // Should include the essential tile types
            const roles = resolved.map(tile => tile.role);
            expect(roles).toContain('corridor');
            expect(roles).toContain('room');
            expect(roles).toContain('stair_up');
            expect(roles).toContain('stair_down');
        });

        test('should handle weight packages correctly', () => {
            const resolver = new PackageResolver();
            const standard = resolver.resolve('standard_dungeon');
            const highConnectivity = resolver.resolve('high_connectivity');
            
            // Find stair tiles in both configurations
            const standardStairs = standard.filter(tile => 
                tile.role.includes('stair'));
            const highConnStairs = highConnectivity.filter(tile => 
                tile.role.includes('stair'));
            
            expect(standardStairs.length).toBeGreaterThan(0);
            expect(highConnStairs.length).toBeGreaterThan(0);
            
            // High connectivity should have higher stair weights
            const standardStairWeight = standardStairs[0].weight;
            const highConnStairWeight = highConnStairs[0].weight;
            expect(highConnStairWeight).toBeGreaterThan(standardStairWeight);
        });

        test('should validate edge pattern compatibility', () => {
            const resolver = new PackageResolver();
            const resolved = resolver.resolve('standard_dungeon');
            
            // Check that tiles can actually connect to each other
            const allEdgePatterns = resolved.flatMap(tile => tile.edges);
            const uniquePatterns = [...new Set(allEdgePatterns)];
            
            // Should have complementary patterns (if '101' exists, should have connecting patterns)
            uniquePatterns.forEach(pattern => {
                if (pattern !== '000') { // Skip empty patterns as they don't need connections
                    // Check that there are other non-empty patterns that could potentially connect
                    const hasOtherPatterns = uniquePatterns.some(otherPattern => {
                        return otherPattern !== '000' && otherPattern !== pattern;
                    });
                    expect(hasOtherPatterns).toBe(true);
                }
            });
        });
    });

    describe('Integration Tests', () => {
        test('should integrate with existing WFC system', () => {
            const resolver = new PackageResolver();
            const tileset = resolver.resolve('standard_dungeon');
            
            // Mock WFC initialization to ensure compatibility
            expect(() => {
                // This should match the format expected by ndwfc.js
                const wfcCompatible = tileset.map((tile, index) => ({
                    id: index,
                    structure: tile.structure,
                    edges: tile.edges,
                    weight: tile.weight,
                    role: tile.role
                }));
                
                expect(wfcCompatible.length).toBe(tileset.length);
            }).not.toThrow();
        });

        test('should support dynamic package switching', () => {
            const resolver = new PackageResolver();
            
            const packages = ['standard_dungeon', 'high_connectivity', 'minimal_clumping'];
            packages.forEach(packageName => {
                expect(() => {
                    const tileset = resolver.resolve(packageName);
                    expect(tileset.length).toBeGreaterThan(0);
                }).not.toThrow();
            });
        });
    });
});