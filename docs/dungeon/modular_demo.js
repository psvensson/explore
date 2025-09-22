// Demo of the new modular tileset architecture
import { TileStructures } from './tile_structures.js';
import { TileMetadata } from './tile_metadata.js';
import { TilePackages } from './tile_packages.js';
import { PackageResolver } from './package_resolver.js';
import { TilesetData } from './tileset_data.js';

// Demo: Show modular system capabilities
console.log('=== MODULAR TILESET ARCHITECTURE DEMO ===\n');

// 1. Show available tile structures
console.log('1. Available Tile Structures:');
const structures = TileStructures.getNames();
console.log(`   ${structures.join(', ')}\n`);

// 2. Show available metadata packages
console.log('2. Available Weight Packages:');
const weightPackages = TileMetadata.getWeightPackageNames();
console.log(`   ${weightPackages.join(', ')}\n`);

console.log('3. Available Role Packages:');
const rolePackages = TileMetadata.getRolePackageNames();
console.log(`   ${rolePackages.join(', ')}\n`);

// 3. Show available complete tile packages
console.log('4. Available Complete Tile Packages:');
const packages = TilePackages.getNames();
console.log(`   ${packages.join(', ')}\n`);

// 4. Demonstrate package resolution
console.log('5. Package Resolution Demonstration:');
const resolver = new PackageResolver();

packages.forEach(packageName => {
    try {
        const resolved = resolver.resolve(packageName);
        const stats = resolver.getStats(resolved);
        console.log(`   ${packageName}:`);
        console.log(`     - Tiles: ${stats.totalTiles}`);
        console.log(`     - Types: ${Object.keys(stats.typeCount).join(', ')}`);
        console.log(`     - Average weight: ${stats.averageWeight.toFixed(2)}`);
        console.log(`     - Edge patterns: ${stats.edgePatterns.length} unique`);
    } catch (error) {
        console.log(`   ${packageName}: Error - ${error.message}`);
    }
});

console.log('\n6. Backward Compatibility:');
const tilesetData = new TilesetData();

// Legacy mode
console.log('   Legacy mode:');
const legacyTiles = tilesetData.getLegacyTiles();
console.log(`     - Tile count: ${legacyTiles.length}`);

// Modular mode
tilesetData.enableModular(true);
console.log('   Modular mode:');
tilesetData.getAvailablePackages().forEach(pkg => {
    tilesetData.setPackage(pkg);
    const stats = tilesetData.getStats();
    if (stats.totalTiles) {
        console.log(`     - ${pkg}: ${stats.totalTiles} tiles`);
    }
});

console.log('\n7. Package Comparison:');
const standard = resolver.resolve('standard_dungeon');
const highConn = resolver.resolve('high_connectivity');
const comparison = resolver.compare(standard, highConn);

console.log(`   Standard vs High Connectivity:`);
console.log(`     - Tile count difference: ${comparison.differences.tileCountDiff}`);
console.log(`     - Average weight difference: ${comparison.differences.avgWeightDiff.toFixed(2)}`);

console.log('\n8. Custom Package Creation Example:');
// Create a custom minimal package
const customTiles = [
    {
        structure_name: 'corridor_nsew',
        weight_package: 'balanced',
        role_package: 'standard',
        rotation: 0,
        properties: 'default'
    },
    {
        structure_name: 'corridor_ns',
        weight_package: 'balanced',
        role_package: 'standard',
        rotation: 0,
        properties: 'default'
    },
    {
        structure_name: 'corridor_ew',
        weight_package: 'balanced',
        role_package: 'standard',
        rotation: 0,
        properties: 'default'
    }
];

TilePackages.create('custom_minimal', customTiles);
const customResolved = resolver.resolve('custom_minimal');
console.log(`   Custom minimal package: ${customResolved.length} tiles`);

console.log('\n=== DEMO COMPLETE ===');

export { resolver, tilesetData };