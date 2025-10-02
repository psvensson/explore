import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock globals for testing
global.NDWFC3D = function() {};

const THREE = {
    Mesh: class {
        constructor(geometry, material) {
            this.geometry = geometry;
            this.material = material;
            this.position = { 
                x: 0, y: 0, z: 0,
                set: function(x, y, z) { this.x = x; this.y = y; this.z = z; }
            };
            this.rotation = { x: 0, y: 0, z: 0, setFromEuler: function(euler) { this.x = euler.x; this.y = euler.y; this.z = euler.z; } };
            // Track material reference for identity comparison
            this._materialId = material ? material._materialId : null;
        }
    },
    BoxGeometry: class { 
        constructor(width, height, depth) {
            this.width = width;
            this.height = height;
            this.depth = depth;
        }
    },
    Euler: class {}
};

// Mock materials with a unique ID
const materials = {
    floor: { _materialId: 'floor' },
    ceiling: { _materialId: 'ceiling' },
    wall: { _materialId: 'wall' }
};

describe('Ceiling Visual Consistency Analysis', () => {
  let buildTileMesh, meshFactories;
  let mockTilePrototypes;

  beforeEach(async () => {
    // Mock Three.js with more detailed tracking
    global.THREE = THREE;

    // Import the functions we need to test
    const meshModule = await import('../docs/renderer/wfc_tile_mesh.js');
    buildTileMesh = meshModule.buildTileMesh;
    
    meshFactories = await import('../docs/renderer/mesh_factories.js');

    // Import the tileset to get the prototypes
    const tilesetModule = await import('../docs/dungeon/tileset.js');
    tilesetModule._resetTilesetForTests();
    
    // Initialize the tileset with data
    await import('../docs/dungeon/tileset_data.js');
    await tilesetModule.initializeTileset();
    
    mockTilePrototypes = tilesetModule.tilePrototypes;
  });

  it('should verify material caching works correctly', async () => {
    console.log('=== MATERIAL CACHING ANALYSIS ===');

    // Clear any existing cache
    const cache = meshFactories.getMaterialCache(global.THREE);
    Object.keys(cache).forEach(key => delete cache[key]);

    console.log('Testing material factory caching...');

    // Create two material factories and verify they use the same cache
    const factory1 = meshFactories.makeMaterialFactory(global.THREE);
    const factory2 = meshFactories.makeMaterialFactory(global.THREE);

    const ceiling1 = factory1('ceiling', 0x888888, 'ceiling');
    const ceiling2 = factory2('ceiling', 0x888888, 'ceiling');

    console.log('Material 1 ID:', ceiling1._materialId);
    console.log('Material 2 ID:', ceiling2._materialId);
    console.log('Are materials identical?', ceiling1 === ceiling2);

    expect(ceiling1).toBe(ceiling2); // Should be the exact same object due to caching
  });

  it('should analyze ceiling mesh geometry consistency', async () => {
    console.log('\\n=== CEILING GEOMETRY CONSISTENCY ===');

    // Test multiple tiles to see if they generate consistent ceiling geometries
    const testTileIndices = [0, 2, 4, 8]; // solid, corridor_NS, corridor_EW, cross
    const ceilingGeometryAnalysis = [];

    for (const tileIndex of testTileIndices) {
      if (tileIndex >= mockTilePrototypes.length) continue;

      console.log(`\\nAnalyzing tile ${tileIndex}:`);

      const tileMesh = buildTileMesh({ 
        THREE: global.THREE, 
        prototypes: mockTilePrototypes, 
        prototypeIndex: tileIndex, 
        rotationY: 0, 
        unit: 3
      });

      // Find ceiling meshes
      // For unit=3: ceiling at y=2*3+3-0.3=8.7
      const ceilingMeshes = tileMesh.children.filter(mesh => 
        mesh.position && Math.abs(mesh.position.y - 8.7) < 0.1
      );

      console.log(`  Found ${ceilingMeshes.length} ceiling meshes`);

      // Analyze geometry properties
      const geometryProps = ceilingMeshes.map(mesh => ({
        width: mesh.geometry.width,
        height: mesh.geometry.height,
        depth: mesh.geometry.depth,
        materialId: mesh.material._materialId,
        position: `(${mesh.position.x}, ${mesh.position.y}, ${mesh.position.z})`
      }));

      // Check for consistency within this tile
      const uniqueGeometries = new Set(geometryProps.map(g => `${g.width}x${g.height}x${g.depth}`));
      const uniqueMaterials = new Set(geometryProps.map(g => g.materialId));

      console.log(`  Unique geometries: ${Array.from(uniqueGeometries).join(', ')}`);
      console.log(`  Unique materials: ${uniqueMaterials.size}`);

      if (uniqueMaterials.size > 1) {
        console.log('  ⚠️  Multiple material instances detected for ceiling!');
        geometryProps.forEach((prop, i) => {
          console.log(`    Mesh ${i}: material ${prop.materialId} at ${prop.position}`);
        });
      }

      ceilingGeometryAnalysis.push({
        tileIndex,
        ceilingCount: ceilingMeshes.length,
        uniqueGeometries: Array.from(uniqueGeometries),
        uniqueMaterials: uniqueMaterials.size,
        geometryProps
      });
    }

    // Cross-tile analysis
    console.log('\\n=== CROSS-TILE MATERIAL CONSISTENCY ===');
    const allMaterialIds = ceilingGeometryAnalysis.flatMap(t => 
      t.geometryProps.map(p => p.materialId)
    );
    const globalUniqueMaterials = new Set(allMaterialIds);

    console.log(`Total ceiling meshes across all tiles: ${allMaterialIds.length}`);
    console.log(`Unique material instances: ${globalUniqueMaterials.size}`);

    if (globalUniqueMaterials.size === 1) {
      console.log('✅ All ceiling meshes use the same material instance (proper caching)');
    } else {
      console.log('❌ Multiple material instances found - caching may be broken');
      console.log('Material IDs:', Array.from(globalUniqueMaterials));
    }

    // All ceiling meshes should use the same cached material instance
    expect(globalUniqueMaterials.size).toBe(1);
  });

  it('should test real-world WFC generation scenario', async () => {
    console.log('\\n=== SIMULATED WFC GENERATION SCENARIO ===');

    // Simulate how WFC actually generates the dungeon
    // Multiple tiles with different rotations like a real WFC output
    const simulatedWFCTiles = [
      { prototypeIndex: 0, rotationY: 0, position: [0, 0, 0] }, // solid
      { prototypeIndex: 2, rotationY: 0, position: [1, 0, 0] }, // corridor NS  
      { prototypeIndex: 2, rotationY: 1, position: [2, 0, 0] }, // corridor rotated 90°
      { prototypeIndex: 4, rotationY: 0, position: [0, 0, 1] }, // corridor EW
      { prototypeIndex: 8, rotationY: 2, position: [1, 0, 1] }, // cross rotated 180°
    ];

    console.log('Generating meshes for simulated WFC tiles...');

    const allCeilingMeshes = [];
    let totalMeshes = 0;

    simulatedWFCTiles.forEach((tile, i) => {
      console.log(`\\nTile ${i}: prototype ${tile.prototypeIndex}, rotation ${tile.rotationY * 90}°`);

      const tileMesh = buildTileMesh({ 
        THREE: global.THREE, 
        prototypes: mockTilePrototypes, 
        prototypeIndex: tile.prototypeIndex, 
        rotationY: tile.rotationY, 
        unit: 3
      });

      // For unit=3: ceiling at y=2*3+3-0.3=8.7
      const ceilingMeshes = tileMesh.children.filter(mesh => 
        mesh.position && Math.abs(mesh.position.y - 8.7) < 0.1
      );

      console.log(`  Generated ${tileMesh.children.length} total meshes, ${ceilingMeshes.length} ceiling`);
      
      totalMeshes += tileMesh.children.length;
      allCeilingMeshes.push(...ceilingMeshes.map(mesh => ({
        tileIndex: i,
        prototypeIndex: tile.prototypeIndex,
        rotation: tile.rotationY,
        materialId: mesh.material._materialId,
        position: `(${mesh.position.x}, ${mesh.position.y}, ${mesh.position.z})`
      })));
    });

    console.log(`\\nTotal analysis: ${totalMeshes} meshes, ${allCeilingMeshes.length} ceiling meshes`);

    // Check material consistency across entire "dungeon"
    const dungeonMaterialIds = new Set(allCeilingMeshes.map(m => m.materialId));
    console.log(`Unique ceiling materials in entire dungeon: ${dungeonMaterialIds.size}`);

    if (dungeonMaterialIds.size === 1) {
      console.log('✅ Entire dungeon uses consistent ceiling materials');
      console.log('   Color variations must be due to lighting/shading differences');
    } else {
      console.log('❌ Multiple ceiling materials detected in dungeon');
      console.log('   This explains the color variations in the screenshot');
      
      // Group by material ID to see the pattern
      const materialGroups = {};
      allCeilingMeshes.forEach(mesh => {
        if (!materialGroups[mesh.materialId]) {
          materialGroups[mesh.materialId] = [];
        }
        materialGroups[mesh.materialId].push(mesh);
      });

      Object.entries(materialGroups).forEach(([materialId, meshes]) => {
        console.log(`   Material ${materialId}: ${meshes.length} meshes`);
        console.log(`     Tiles: ${meshes.map(m => `${m.tileIndex}(${m.prototypeIndex},${m.rotation*90}°)`).join(', ')}`);
      });
    }

    // Test expectation: all ceiling meshes should use same material
    expect(dungeonMaterialIds.size).toBe(1);
  });
});