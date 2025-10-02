import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock globals for testing
global.NDWFC3D = function() {};

/**
 * DIAGNOSTIC TEST SUITE - Intentionally kept despite failures
 * 
 * This test reveals tileset quality issues related to floor generation:
 * - Issue: Empty room tiles (type 3) not generating floor meshes
 * - Impact: Vertical room stacking shows missing floors/ceilings
 * - Status: Known issue, medium priority (affects dungeon generation quality)
 * 
 * These tests should remain as regression detectors. The floor generation
 * logic in buildTileMesh() may need enhancement to handle empty rooms correctly.
 */
describe('Floor Missing Analysis', () => {
  let buildTileMesh;
  let mockTilePrototypes;

  beforeEach(async () => {
    // Mock Three.js with position tracking
    global.THREE = {
      Group: class { 
        constructor() { 
          this.children = []; 
          this.position = { x: 0, y: 0, z: 0, set: function(x, y, z) { this.x = x; this.y = y; this.z = z; } }; 
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
          this.rotation = { x: 0, y: 0, z: 0, setFromEuler: function(euler) { this.x = euler.x; this.y = euler.y; this.z = euler.z; } };
          this._materialType = material?.userData?.type || 'unknown';
        } 
      },
      BoxGeometry: class { 
        constructor(w, h, d) { 
          this.width = w; 
          this.height = h; 
          this.depth = d; 
        } 
      },
      MeshStandardMaterial: class { 
        constructor(params) { 
          this.color = params?.color || 0xffffff; 
          this.map = params?.map || null;
          this.userData = params?.userData || {};
        } 
      },
      CanvasTexture: class {
        constructor(canvas) {
          this.canvas = canvas;
        }
      }
    };

    // Import the functions we need to test
    const meshModule = await import('../docs/renderer/wfc_tile_mesh.js');
    buildTileMesh = meshModule.buildTileMesh;
    
    // Import the tileset to get the prototypes
    const tilesetModule = await import('../docs/dungeon/tileset.js');
    tilesetModule._resetTilesetForTests();
    
    // Initialize the tileset with data
    await import('../docs/dungeon/tileset_data.js');
    await tilesetModule.initializeTileset();
    
    mockTilePrototypes = tilesetModule.tilePrototypes;
  });

  it('should analyze floor mesh generation for empty room tiles', async () => {
    console.log('=== FLOOR MESH ANALYSIS ===');

    // Find tiles that should have floors (non-solid tiles)
    // Tile indices based on tileset_data.js:
    // 0: cross_intersection, 1: solid (skip), 2: corridor_NS, etc.
    const testTiles = [
      { index: 0, name: 'cross_intersection' },
      // Skip index 1 - it's a solid block with one cube mesh, not individual floor/ceiling 
      { index: 2, name: 'corridor_NS' },
      { index: 3, name: 'L_corner' },
      { index: 4, name: 'T_junction' }
    ];

    const floorAnalysis = [];

    for (const tile of testTiles) {
      if (tile.index >= mockTilePrototypes.length) continue;

      console.log(`\\n--- Analyzing tile ${tile.index} (${tile.name}) ---`);
      
      const tileMesh = buildTileMesh({ 
        THREE: global.THREE, 
        prototypes: mockTilePrototypes, 
        prototypeIndex: tile.index, 
        rotationY: 0, 
        unit: 3
      });

      // Categorize all meshes by vertical position and material type
      const meshCategories = {
        floor: [],     // y ≈ 0.05 (bottom)
        ceiling: [],   // y ≈ 2.95 (top) 
        walls: [],     // y ≈ 1.5 (middle)
        other: []      // anything else
      };

      tileMesh.children.forEach(mesh => {
        const y = mesh.position.y;
        const materialType = mesh._materialType;
        
        if (Math.abs(y - 0.05) < 0.1) {
          meshCategories.floor.push({ y, materialType, geometry: mesh.geometry });
        } else if (Math.abs(y - 2.95) < 0.1) {
          meshCategories.ceiling.push({ y, materialType, geometry: mesh.geometry });
        } else if (Math.abs(y - 1.5) < 0.6) {
          meshCategories.walls.push({ y, materialType, geometry: mesh.geometry });
        } else {
          meshCategories.other.push({ y, materialType, geometry: mesh.geometry });
        }
      });

      console.log(`  Total meshes: ${tileMesh.children.length}`);
      console.log(`  Floor meshes: ${meshCategories.floor.length}`);
      console.log(`  Ceiling meshes: ${meshCategories.ceiling.length}`);  
      console.log(`  Wall meshes: ${meshCategories.walls.length}`);
      console.log(`  Other meshes: ${meshCategories.other.length}`);

      // Check for missing floors specifically
      if (meshCategories.floor.length === 0) {
        console.log(`  ⚠️  NO FLOOR MESHES DETECTED for tile ${tile.index}!`);
      } else {
        console.log(`  ✅ Floor meshes present for tile ${tile.index}`);
        
        // Analyze floor coverage
        const floorGeometries = meshCategories.floor.map(f => `${f.geometry.width}x${f.geometry.depth}`);
        const uniqueFloorSizes = [...new Set(floorGeometries)];
        console.log(`     Floor geometries: ${uniqueFloorSizes.join(', ')}`);
        console.log(`     Floor material types: ${[...new Set(meshCategories.floor.map(f => f.materialType))].join(', ')}`);
      }

      floorAnalysis.push({
        tileIndex: tile.index,
        tileName: tile.name,
        hasFloor: meshCategories.floor.length > 0,
        floorCount: meshCategories.floor.length,
        ceilingCount: meshCategories.ceiling.length,
        wallCount: meshCategories.walls.length,
        categories: meshCategories
      });
    }

    // Summary analysis
    console.log('\\n=== FLOOR COVERAGE SUMMARY ===');
    const tilesWithoutFloors = floorAnalysis.filter(t => !t.hasFloor);
    
    if (tilesWithoutFloors.length > 0) {
      console.log(`❌ ${tilesWithoutFloors.length} tiles are missing floors:`);
      tilesWithoutFloors.forEach(t => {
        console.log(`   - Tile ${t.tileIndex} (${t.tileName}): ${t.ceilingCount} ceiling, ${t.wallCount} walls, 0 floors`);
      });
    } else {
      console.log('✅ All tested tiles have floor meshes');
    }

    // This should fail if any tiles are missing floors
    expect(tilesWithoutFloors.length).toBe(0);
  });

  it('should test stacked empty room scenario', async () => {
    console.log('\\n=== STACKED TILE SCENARIO ===');

    // Use cross intersection tile (index 0) which should have open space and floors/ceilings
    const emptyRoomIndex = 0;
    
    console.log(`Testing stacked scenario with tile ${emptyRoomIndex}...`);

    // Generate bottom tile (floor level)
    const bottomTile = buildTileMesh({ 
      THREE: global.THREE, 
      prototypes: mockTilePrototypes, 
      prototypeIndex: emptyRoomIndex, 
      rotationY: 0, 
      unit: 3
    });

    // Generate top tile (second level) - position it up by unit height
    const topTile = buildTileMesh({ 
      THREE: global.THREE, 
      prototypes: mockTilePrototypes, 
      prototypeIndex: emptyRoomIndex, 
      rotationY: 0, 
      unit: 3
    });
    
    // Simulate positioning the top tile above the bottom tile
    topTile.position.set(0, 3, 0); // Move up by one unit

    // Analyze what would be visible from below
    console.log('\\nBottom tile (ground level):');
    const bottomFloors = bottomTile.children.filter(m => Math.abs(m.position.y - 0.05) < 0.1);
    const bottomCeilings = bottomTile.children.filter(m => Math.abs(m.position.y - 2.95) < 0.1);
    
    console.log(`  Floor meshes: ${bottomFloors.length}`);
    console.log(`  Ceiling meshes: ${bottomCeilings.length}`);
    
    console.log('\\nTop tile (second level):');
    const topFloors = topTile.children.filter(m => Math.abs(m.position.y - 0.05) < 0.1);
    const topCeilings = topTile.children.filter(m => Math.abs(m.position.y - 2.95) < 0.1);
    
    console.log(`  Floor meshes: ${topFloors.length}`);  
    console.log(`  Ceiling meshes: ${topCeilings.length}`);

    console.log('\\n--- Stacking Analysis ---');
    
    if (topFloors.length === 0) {
      console.log('❌ TOP TILE HAS NO FLOOR!');
      console.log('   This means bottom tile ceiling will show through');
      console.log('   This explains the "different ceiling colors" - it\'s ceiling-from-below');
    } else {
      console.log('✅ Top tile has floor, should block view of bottom ceiling');
    }

    if (bottomCeilings.length === 0) {
      console.log('❌ Bottom tile has no ceiling!');
    } else {
      console.log('✅ Bottom tile has ceiling');
    }

    // Create a comprehensive report
    console.log('\\n--- Visual Analysis ---');
    console.log('When looking at the top tile from above:');
    if (topFloors.length === 0) {
      console.log('  - You would see the bottom tile\'s ceiling showing through');
      console.log('  - This creates "color variations" between proper ceiling and showing-through ceiling');  
    } else {
      console.log('  - You would see the top tile\'s proper floor');
    }

    // Both tiles should have floors in a proper empty room
    expect(bottomFloors.length).toBeGreaterThan(0);
    expect(topFloors.length).toBeGreaterThan(0);
  });

  it('should examine tile voxel data to understand floor generation logic', async () => {
    console.log('\\n=== VOXEL DATA ANALYSIS ===');
    
    // Let's look at the raw voxel data to understand when floors should be generated
    for (let i = 0; i < Math.min(5, mockTilePrototypes.length); i++) {
      const prototype = mockTilePrototypes[i];
      console.log(`\\nTile ${i} voxel data:`);
      
      if (prototype && prototype.vox) {
        // Print the 3x3x3 voxel data  
        for (let z = 0; z < 3; z++) {
          console.log(`  Layer ${z} (z=${z}):`);
          for (let y = 2; y >= 0; y--) { // Print top to bottom for readability
            let row = '    ';
            for (let x = 0; x < 3; x++) {
              const voxel = prototype.vox[z] && prototype.vox[z][y] && prototype.vox[z][y][x];
              row += (voxel === 1 ? '█' : (voxel === 0 ? '·' : '?')) + ' ';
            }
            console.log(`${row} (y=${y})`);
          }
        }
        
        // Check if bottom layer (y=0) has any solid voxels - that's where floor should be
        let hasBottomSolids = false;
        for (let z = 0; z < 3; z++) {
          for (let x = 0; x < 3; x++) {
            if (prototype.vox[z] && prototype.vox[z][0] && prototype.vox[z][0][x] === 1) {
              hasBottomSolids = true;
            }
          }
        }
        
        console.log(`  Bottom layer (y=0) has solids: ${hasBottomSolids ? 'YES' : 'NO'}`);
        console.log(`  → Should generate floor: ${hasBottomSolids ? 'YES' : 'NO'}`);
      }
    }
  });
});