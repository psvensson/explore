import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock globals for testing
global.NDWFC3D = function() {};

describe('Empty Tile Stacking Analysis', () => {
  let buildTileMesh, createTileFormLayers;
  let mockTilePrototypes;

  beforeEach(async () => {
    // Mock Three.js with detailed mesh tracking
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
    
    // Import the tileset to get the prototypes and creation function
    const tilesetModule = await import('../docs/dungeon/tileset.js');
    tilesetModule._resetTilesetForTests();
    createTileFormLayers = tilesetModule.createTileFormLayers;
    
    // Initialize the tileset with data
    await import('../docs/dungeon/tileset_data.js');
    await tilesetModule.initializeTileset();
    
    mockTilePrototypes = tilesetModule.tilePrototypes;
  });

  it('should create and test completely empty tiles (all voxels = 0)', async () => {
    console.log('=== EMPTY TILE CREATION TEST ===');

    // Create a completely empty tile - all voxels are 0 (air)
    const emptyTileLayers = [
      ["000","000","000"],  // Floor layer - all empty
      ["000","000","000"],  // Middle layer - all empty  
      ["000","000","000"],  // Ceiling layer - all empty
    ];

    console.log('Creating completely empty tile...');
    const emptyTileIndex = createTileFormLayers(emptyTileLayers, 999, { 
      transforms: [], 
      meta: { weight: 1 } 
    });

    console.log(`Empty tile created at index: ${emptyTileIndex}`);
    
    // Verify the tile was created correctly
    const emptyPrototype = mockTilePrototypes[emptyTileIndex];
    console.log('Empty tile voxel data:');
    
    for (let z = 0; z < 3; z++) {
      console.log(`  Layer ${z} (z=${z}):`);
      for (let y = 2; y >= 0; y--) { // Print top to bottom  
        let row = '    ';
        for (let x = 0; x < 3; x++) {
          const voxel = emptyPrototype.voxels[z] && emptyPrototype.voxels[z][y] && emptyPrototype.voxels[z][y][x];
          row += (voxel === 1 ? '█' : (voxel === 0 ? '·' : '?')) + ' ';
        }
        console.log(`${row} (y=${y})`);
      }
    }

    // Generate mesh for empty tile
    console.log('\\n--- Empty Tile Mesh Generation ---');
    const emptyTileMesh = buildTileMesh({ 
      THREE: global.THREE, 
      prototypes: mockTilePrototypes, 
      prototypeIndex: emptyTileIndex, 
      rotationY: 0, 
      unit: 3
    });

    console.log(`Empty tile generated ${emptyTileMesh.children.length} meshes`);
    
    if (emptyTileMesh.children.length === 0) {
      console.log('✅ Correctly generated NO meshes for completely empty tile');
    } else {
      console.log('❌ Empty tile incorrectly generated meshes:');
      emptyTileMesh.children.forEach((mesh, i) => {
        console.log(`  Mesh ${i}: ${mesh._materialType} at (${mesh.position.x}, ${mesh.position.y}, ${mesh.position.z})`);
      });
    }

    // Verify no meshes should be generated for all-empty tile
    expect(emptyTileMesh.children.length).toBe(0);
  });

  it('should test stacked empty tiles for unwanted ceiling/floor generation', async () => {
    console.log('\\n=== STACKED EMPTY TILES TEST ===');

    // Create a completely empty tile if not already created
    const emptyTileLayers = [
      ["000","000","000"],  // Floor layer - all empty
      ["000","000","000"],  // Middle layer - all empty  
      ["000","000","000"],  // Ceiling layer - all empty
    ];

    const emptyTileIndex = createTileFormLayers(emptyTileLayers, 998, { 
      transforms: [], 
      meta: { weight: 1 } 
    });

    console.log('\\nTesting two empty tiles stacked vertically...');
    
    // Generate bottom empty tile (ground level)
    const bottomEmptyTile = buildTileMesh({ 
      THREE: global.THREE, 
      prototypes: mockTilePrototypes, 
      prototypeIndex: emptyTileIndex, 
      rotationY: 0, 
      unit: 3
    });

    // Generate top empty tile (second level)  
    const topEmptyTile = buildTileMesh({ 
      THREE: global.THREE, 
      prototypes: mockTilePrototypes, 
      prototypeIndex: emptyTileIndex, 
      rotationY: 0, 
      unit: 3
    });

    // Position the top tile above the bottom tile
    topEmptyTile.position.set(0, 3, 0); // Move up by one unit

    console.log(`Bottom empty tile: ${bottomEmptyTile.children.length} meshes`);
    console.log(`Top empty tile: ${topEmptyTile.children.length} meshes`);

    // The critical test: in a real WFC scenario, would there be interface meshes?
    console.log('\\n--- Interface Analysis ---');
    console.log('In real WFC generation, the question is:');
    console.log('- Does the mesh generator add ceiling to bottom tile? (it should NOT)');
    console.log('- Does the mesh generator add floor to top tile? (it should NOT)');
    console.log('- Empty air tiles should generate ZERO meshes');

    if (bottomEmptyTile.children.length === 0 && topEmptyTile.children.length === 0) {
      console.log('✅ CORRECT: Both empty tiles generate no meshes');
      console.log('   No unwanted ceiling/floor surfaces between empty spaces');
    } else {
      console.log('❌ PROBLEM: Empty tiles generating unexpected meshes');
      console.log('   This could create unwanted surfaces between empty spaces');
    }

    // Both empty tiles should generate zero meshes
    expect(bottomEmptyTile.children.length).toBe(0);
    expect(topEmptyTile.children.length).toBe(0);
  });

  it('should test mixed scenario: walkable tile below empty tile', async () => {
    console.log('\\n=== MIXED SCENARIO TEST ===');

    // Create empty tile
    const emptyTileLayers = [
      ["000","000","000"],  
      ["000","000","000"],  
      ["000","000","000"],  
    ];
    const emptyTileIndex = createTileFormLayers(emptyTileLayers, 997);

    // Test: walkable room tile (with floor/ceiling) below empty air tile
    console.log('Testing walkable room tile below empty air tile...');

    // Use tile 0 (cross intersection) as walkable room
    const walkableTileIndex = 0;
    
    const bottomWalkableTile = buildTileMesh({ 
      THREE: global.THREE, 
      prototypes: mockTilePrototypes, 
      prototypeIndex: walkableTileIndex, 
      rotationY: 0, 
      unit: 3
    });

    const topEmptyTile = buildTileMesh({ 
      THREE: global.THREE, 
      prototypes: mockTilePrototypes, 
      prototypeIndex: emptyTileIndex, 
      rotationY: 0, 
      unit: 3
    });

    topEmptyTile.position.set(0, 3, 0);

  // Analyze the meshes
  // Canonical coordinates with unit=3: floor at y≈0.15, ceiling at y≈2.85
    const bottomFloors = bottomWalkableTile.children.filter(m => Math.abs(m.position.y - 0.15) < 0.2);
  const bottomCeilings = bottomWalkableTile.children.filter(m => Math.abs(m.position.y - 2.85) < 0.2);

    console.log(`Bottom walkable tile: ${bottomWalkableTile.children.length} total meshes`);
    console.log(`  - Floor meshes: ${bottomFloors.length}`);
    console.log(`  - Ceiling meshes: ${bottomCeilings.length}`);
    console.log(`Top empty tile: ${topEmptyTile.children.length} meshes`);

    console.log('\\n--- Expected Behavior ---');
    if (bottomCeilings.length > 0 && topEmptyTile.children.length === 0) {
      console.log('✅ CORRECT scenario:');
      console.log('   - Bottom tile has ceiling (proper room)');
      console.log('   - Top tile has no floor (empty air)');
      console.log('   - You would see the bottom tile\'s ceiling when looking up');
    } else {
      console.log('❌ Unexpected mesh configuration');
    }

    // Verify expected behavior
    expect(bottomCeilings.length).toBeGreaterThan(0); // Walkable tile should have ceiling
    expect(topEmptyTile.children.length).toBe(0);    // Empty tile should have no meshes
  });

  it('should analyze what happens in opposite scenario: empty below walkable', async () => {
    console.log('\\n=== REVERSE SCENARIO TEST ===');

    // Create empty tile
    const emptyTileLayers = [
      ["000","000","000"],  
      ["000","000","000"],  
      ["000","000","000"],  
    ];
    const emptyTileIndex = createTileFormLayers(emptyTileLayers, 996);

    console.log('Testing empty air tile below walkable room tile...');

    const bottomEmptyTile = buildTileMesh({ 
      THREE: global.THREE, 
      prototypes: mockTilePrototypes, 
      prototypeIndex: emptyTileIndex, 
      rotationY: 0, 
      unit: 3
    });

    // Use tile 0 (cross intersection) as walkable room
    const topWalkableTile = buildTileMesh({ 
      THREE: global.THREE, 
      prototypes: mockTilePrototypes, 
      prototypeIndex: 0, 
      rotationY: 0, 
      unit: 3
    });

    topWalkableTile.position.set(0, 3, 0);

  // Analyze the meshes
  // Canonical coordinates with unit=3: floor at y≈0.15, ceiling at y≈2.85
    const topFloors = topWalkableTile.children.filter(m => Math.abs(m.position.y - 0.15) < 0.2);
  const topCeilings = topWalkableTile.children.filter(m => Math.abs(m.position.y - 2.85) < 0.2);

    console.log(`Bottom empty tile: ${bottomEmptyTile.children.length} meshes`);
    console.log(`Top walkable tile: ${topWalkableTile.children.length} total meshes`);
    console.log(`  - Floor meshes: ${topFloors.length}`);  
    console.log(`  - Ceiling meshes: ${topCeilings.length}`);

    console.log('\\n--- Critical Question ---');
    if (topFloors.length > 0 && bottomEmptyTile.children.length === 0) {
      console.log('✅ GOOD scenario:');
      console.log('   - Top tile has floor (you can walk on it)');
      console.log('   - Bottom tile has no ceiling (empty air)');
      console.log('   - You would see the top tile\'s floor when looking up from below');
    } else if (topFloors.length === 0) {
      console.log('❌ PROBLEM: Top walkable tile has no floor!');
      console.log('   - You would fall through into the empty space below');
      console.log('   - This is the "missing floor" issue you observed');
    }

    // Verify expected behavior
    expect(bottomEmptyTile.children.length).toBe(0);  // Empty tile should have no meshes
    expect(topFloors.length).toBeGreaterThan(0);     // Walkable tile should have floor
  });
});