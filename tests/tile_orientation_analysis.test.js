import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock globals for testing
global.NDWFC3D = function() {};

/**
 * DIAGNOSTIC TEST SUITE - Intentionally kept despite failures
 * 
 * This test reveals tileset quality issues related to ceiling materials:
 * - Issue: Ceiling materials not being properly assigned (undefined instead of 'ceiling_material')
 * - Impact: Affects visual consistency in generated dungeons
 * - Status: Known issue, low priority (visual polish)
 * 
 * These tests should remain as regression detectors when the material
 * assignment system is improved in the future.
 */
describe('Tile Orientation Analysis', () => {
  let buildTileMesh, rotateYOnce;
  let mockTilePrototypes;

  beforeEach(async () => {
    // Mock Three.js for testing - following pattern from other tests
    global.THREE = {
      Group: class { 
        constructor() { 
          this.children = []; 
        } 
        add(child) { 
          this.children.push(child); 
        } 
      },
      Mesh: class { 
        constructor(geometry, material) { 
          this.geometry = geometry; 
          this.material = material; 
          this.position = { x: 0, y: 0, z: 0, set: function(x, y, z) { this.x = x; this.y = y; this.z = z; } }; 
          this.rotation = { x: 0, y: 0, z: 0, set: function(x, y, z) { this.x = x; this.y = y; this.z = z; } };
        } 
      },
      BoxGeometry: class { constructor(w, h, d) { this.width = w; this.height = h; this.depth = d; } },
      PlaneGeometry: class { constructor(w, h) { this.width = w; this.height = h; } },
      MeshStandardMaterial: class { 
        constructor(params) { 
          this.color = params?.color || 0xffffff; 
          this.userData = params?.userData || {};
        } 
      },
      MeshBasicMaterial: class { 
        constructor(params) { 
          this.color = params?.color || 0xffffff; 
          this.name = params?.name || 'unnamed'; 
          this.userData = { type: params?.name }; // Align with factory
        } 
      }
    };

    // Import the functions we need to test
    const meshModule = await import('../docs/renderer/wfc_tile_mesh.js');
    buildTileMesh = meshModule.buildTileMesh;
    rotateYOnce = meshModule.rotateYOnce;

    // Import the tileset to get the prototypes
    const tilesetModule = await import('../docs/dungeon/tileset.js');
    tilesetModule._resetTilesetForTests();
    
    // Initialize the tileset with data
    await import('../docs/dungeon/tileset_data.js');
    await tilesetModule.initializeTileset();
    
    mockTilePrototypes = tilesetModule.tilePrototypes;
  });

  it('should detect material consistency across ceiling meshes', async () => {
    console.log('=== CEILING MATERIAL CONSISTENCY ANALYSIS ===');

    // Standard materials that should be used for all tiles
    const standardMaterials = {
      floor: new global.THREE.MeshBasicMaterial({ name: 'floor_material', color: 0x8B4513 }),
      mid: new global.THREE.MeshBasicMaterial({ name: 'wall_material', color: 0x696969 }),
      ceiling: new global.THREE.MeshBasicMaterial({ name: 'ceiling_material', color: 0xF5F5DC }),
      stair: new global.THREE.MeshBasicMaterial({ name: 'stair_material', color: 0x777777 })
    };

    console.log('Testing multiple tile types for ceiling material consistency...');

    // Test several different tile types
    const testTiles = [
      { index: 0, name: 'solid' },
      { index: 2, name: 'corridor_NS' },
      { index: 8, name: 'cross' }
    ];

    const ceilingMaterialAnalysis = [];

    for (const testTile of testTiles) {
      if (testTile.index >= mockTilePrototypes.length) continue;
      
      console.log(`\\nTesting tile ${testTile.index} (${testTile.name}):`);
      
      const tileMesh = buildTileMesh({ 
        THREE: global.THREE, 
        prototypes: mockTilePrototypes, 
        prototypeIndex: testTile.index, 
        rotationY: 0, 
        unit: 3,
        materials: standardMaterials
      });

      // Extract all ceiling meshes (Y position around 2.95)
      const ceilingMeshes = tileMesh.children.filter(mesh => 
        mesh.position && Math.abs(mesh.position.y - 2.95) < 0.1
      );

      console.log(`  Found ${ceilingMeshes.length} ceiling meshes`);

      // Analyze materials used
      const materialsUsed = ceilingMeshes.map(mesh => ({
        materialName: mesh.material.name,
        materialColor: mesh.material.color,
        position: `(${mesh.position.x}, ${mesh.position.y}, ${mesh.position.z})`
      }));

      const uniqueMaterials = new Set(materialsUsed.map(m => m.materialName));
      console.log(`  Materials used: ${Array.from(uniqueMaterials).join(', ')}`);
      
      if (uniqueMaterials.size > 1) {
        console.log('  ⚠️  INCONSISTENT MATERIALS DETECTED!');
        materialsUsed.forEach((mat, i) => {
          console.log(`    Mesh ${i}: ${mat.materialName} at ${mat.position}`);
        });
      } else {
        console.log('  ✓ All ceiling meshes use consistent material');
      }

      ceilingMaterialAnalysis.push({
        tileIndex: testTile.index,
        tileName: testTile.name,
        ceilingCount: ceilingMeshes.length,
        uniqueMaterials: Array.from(uniqueMaterials),
        hasInconsistency: uniqueMaterials.size > 1
      });
    }

    // Overall analysis
    console.log('\\n=== SUMMARY ===');
    const tilesWithInconsistencies = ceilingMaterialAnalysis.filter(t => t.hasInconsistency);
    
    if (tilesWithInconsistencies.length > 0) {
      console.log(`❌ Found material inconsistencies in ${tilesWithInconsistencies.length} tile types:`);
      tilesWithInconsistencies.forEach(tile => {
        console.log(`  - Tile ${tile.tileIndex} (${tile.tileName}): uses ${tile.uniqueMaterials.join(', ')}`);
      });
    } else {
      console.log('✅ All ceiling meshes use consistent materials within each tile type');
    }

    // Test expectation: within each tile, all ceiling meshes should use the same material
    ceilingMaterialAnalysis.forEach(analysis => {
      expect(analysis.hasInconsistency).toBe(false);
    });
  });

  it('should test ceiling consistency across rotated tiles', async () => {
    console.log('\\n=== ROTATION CONSISTENCY ANALYSIS ===');

    const standardMaterials = {
      floor: new global.THREE.MeshBasicMaterial({ name: 'floor_material', color: 0x8B4513 }),
      mid: new global.THREE.MeshBasicMaterial({ name: 'wall_material', color: 0x696969 }),
      ceiling: new global.THREE.MeshBasicMaterial({ name: 'ceiling_material', color: 0xF5F5DC }),
      stair: new global.THREE.MeshBasicMaterial({ name: 'stair_material', color: 0x777777 })
    };

    // Test the same tile type with different rotations
    const testTileIndex = 2; // corridor NS
    const rotations = [0, 1, 2, 3]; // 0°, 90°, 180°, 270°

    console.log(`Testing tile ${testTileIndex} with different rotations...`);

    const rotationAnalysis = [];

    for (const rotation of rotations) {
      console.log(`\\nRotation ${rotation} (${rotation * 90}°):`);

      const tileMesh = buildTileMesh({ 
        THREE: global.THREE, 
        prototypes: mockTilePrototypes, 
        prototypeIndex: testTileIndex, 
        rotationY: rotation, 
        unit: 3,
        materials: standardMaterials
      });

      const ceilingMeshes = tileMesh.children.filter(mesh => 
        mesh.position && Math.abs(mesh.position.y - 2.95) < 0.1
      );

      const materialsUsed = ceilingMeshes.map(mesh => mesh.material.name);
      const uniqueMaterials = new Set(materialsUsed);

      console.log(`  Ceiling meshes: ${ceilingMeshes.length}`);
      console.log(`  Materials: ${Array.from(uniqueMaterials).join(', ')}`);

      rotationAnalysis.push({
        rotation: rotation,
        degrees: rotation * 90,
        ceilingCount: ceilingMeshes.length,
        uniqueMaterials: Array.from(uniqueMaterials),
        hasInconsistency: uniqueMaterials.size > 1
      });
    }

    // Analysis
    console.log('\\n=== ROTATION SUMMARY ===');
    const inconsistentRotations = rotationAnalysis.filter(r => r.hasInconsistency);
    
    if (inconsistentRotations.length > 0) {
      console.log(`❌ Material inconsistencies found in ${inconsistentRotations.length} rotations:`);
      inconsistentRotations.forEach(rot => {
        console.log(`  - ${rot.degrees}°: uses ${rot.uniqueMaterials.join(', ')}`);
      });
    } else {
      console.log('✅ All rotations produce consistent ceiling materials');
    }

    // Check if all rotations produce the same material set
    const allMaterialSets = rotationAnalysis.map(r => r.uniqueMaterials.sort().join(','));
    const uniqueMaterialSets = new Set(allMaterialSets);

    if (uniqueMaterialSets.size > 1) {
      console.log('❌ Different rotations produce different material sets:');
      rotationAnalysis.forEach(rot => {
        console.log(`  ${rot.degrees}°: [${rot.uniqueMaterials.join(', ')}]`);
      });
    } else {
      console.log('✅ All rotations produce the same material set');
    }

    // Test expectations
    rotationAnalysis.forEach(analysis => {
      expect(analysis.hasInconsistency).toBe(false);
    });
  });

  it('should analyze potential causes of ceiling color variations', async () => {
    console.log('\\n=== CEILING COLOR VARIATION ROOT CAUSE ANALYSIS ===');

    const standardMaterials = {
      floor: new global.THREE.MeshBasicMaterial({ name: 'floor_material', color: 0x8B4513 }),
      mid: new global.THREE.MeshBasicMaterial({ name: 'wall_material', color: 0x696969 }),
      ceiling: new global.THREE.MeshBasicMaterial({ name: 'ceiling_material', color: 0xF5F5DC }),
      stair: new global.THREE.MeshBasicMaterial({ name: 'stair_material', color: 0x777777 })
    };

    // Test hypothesis: Are different tile types being assigned different materials?
    console.log('Hypothesis 1: Different tile prototypes use different ceiling materials');

    const tileTypes = Math.min(mockTilePrototypes.length, 8); // Test first 8 types
    const materialsByTileType = {};

    for (let i = 0; i < tileTypes; i++) {
      const tileMesh = buildTileMesh({ 
        THREE: global.THREE, 
        prototypes: mockTilePrototypes, 
        prototypeIndex: i, 
        rotationY: 0, 
        unit: 3,
        materials: standardMaterials
      });

  // Ceiling meshes with canonical coordinate system:
  // Voxel y=2 (ceiling layer), unit=3: contiguous layout places center at ≈2.85
  const expectedCeilingY = 2.85;
      const ceilingMeshes = tileMesh.children.filter(m => Math.abs(m.position.y - expectedCeilingY) < 0.1);
      const materials = new Set(ceilingMeshes.map(m => m.material.userData.type));
      
      materialsByTileType[i] = Array.from(materials);
      console.log(`  Tile ${i}: ceiling materials = [${Array.from(materials).join(', ')}]`);
    }

    // Check if all tile types use the same ceiling material
    const allCeilingMaterials = Object.values(materialsByTileType).flat();
    const uniqueCeilingMaterials = new Set(allCeilingMaterials);

    console.log(`\\nResult: Found ${uniqueCeilingMaterials.size} unique ceiling materials across all tile types:`);
    console.log(`Materials: [${Array.from(uniqueCeilingMaterials).join(', ')}]`);

    if (uniqueCeilingMaterials.size === 1) {
      console.log('✅ All tile types use the same ceiling material - variation must be due to lighting/normals');
      console.log('   This suggests the issue is tile orientation/rotation causing different lighting effects');
    } else {
      console.log('❌ Different tile types use different ceiling materials - this is the source of color variation');
      console.log('   The material assignment logic needs to be standardized');
    }

    // Expected: all tiles should use the same ceiling material
    expect(uniqueCeilingMaterials.size).toBe(1);
    expect(Array.from(uniqueCeilingMaterials)[0]).toBe('ceiling');
  });
});