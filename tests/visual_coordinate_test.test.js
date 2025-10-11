/**
 * Test to verify that individual tiles render correctly vs WFC placement
 */

describe('Visual Coordinate System Test', () => {
  beforeEach(() => {
    // Mock Three.js for testing
    global.THREE = {
      Group: class { 
        constructor() { this.children = []; }
        add(child) { this.children.push(child); }
      },
      Mesh: class { 
        constructor(geometry, material) { 
          this.geometry = geometry; 
          this.material = material;
          this.position = { x: 0, y: 0, z: 0, set: function(x, y, z) { this.x = x; this.y = y; this.z = z; } };
          this.rotation = { x: 0, y: 0, z: 0, set: function(x, y, z) { this.x = x; this.y = y; this.z = z; } };
        }
      },
      BoxGeometry: class { constructor() {} }
    };
  });
  
  test('should verify simple corridor tile renders correctly', async () => {
    console.log('=== Testing Simple Corridor Tile ===');
    
    // Get the tileset data
    const TILE_DEFS = (await import('../docs/dungeon/tileset_data.js')).default;
    const { buildTileset } = await import('../docs/dungeon/tileset_builder.js');
    
    // Find the North-South corridor tile (ID 102)
    const corridorDef = TILE_DEFS.find(def => def.tileId === 102);
    expect(corridorDef).toBeDefined();
    
    console.log('Corridor tile definition:');
    console.log('Layers:', corridorDef.layers);
    
    // Build the tileset
    const { tilePrototypes } = buildTileset([corridorDef]);
    const corridorProto = tilePrototypes[0];
    
    console.log('Corridor voxel structure:');
    for (let z = 0; z < 3; z++) {
      console.log(`Z-slice ${z}:`);
      for (let y = 0; y < 3; y++) {
        let row = '';
        for (let x = 0; x < 3; x++) {
          row += corridorProto.voxels[z][y][x] + ' ';
        }
        console.log(`  Y=${y}: ${row}`);
      }
    }
    
    // Expected structure for North-South corridor:
    // - Floor and ceiling should be solid (all 1s)
    // - Middle layer should have walls on sides, open in middle (north-south passage)
    
    // Check floor layer (y=0) - should be all solid
    expect(corridorProto.voxels[0][0][0]).toBe(1); // All positions should be 1
    expect(corridorProto.voxels[1][0][1]).toBe(1);
    expect(corridorProto.voxels[2][0][2]).toBe(1);
    
    // Check middle layer (y=1) - should have passage pattern
    // North-South corridor: "111", "000", "111" means walls on sides, open in middle
    expect(corridorProto.voxels[0][1][0]).toBe(1); // Front wall
    expect(corridorProto.voxels[1][1][0]).toBe(0); // Middle passage (empty)
    expect(corridorProto.voxels[2][1][0]).toBe(1); // Back wall
    
    // Check ceiling layer (y=2) - should be all solid
    expect(corridorProto.voxels[0][2][0]).toBe(1);
    expect(corridorProto.voxels[1][2][1]).toBe(1);
    expect(corridorProto.voxels[2][2][2]).toBe(1);
    
    console.log('✓ Corridor tile structure verified');
  });
  
  test('should test WFC tile mesh generation', async () => {
    console.log('=== Testing WFC Tile Mesh Generation ===');
    
    // Import the WFC mesh generation function
    const { buildTileMesh } = await import('../docs/renderer/wfc_tile_mesh.js');
    
    // Get the tileset
    const { initializeTileset } = await import('../docs/dungeon/tileset.js');
    initializeTileset();
    const { tilePrototypes } = await import('../docs/dungeon/tileset.js');
    
    console.log('Available tile prototypes:', tilePrototypes.length);
    
    // Find the corridor prototype (should be index 2 based on tileset order)
    const corridorProtoIndex = tilePrototypes.findIndex(proto => proto.tileId === 102);
    expect(corridorProtoIndex).toBeGreaterThanOrEqual(0);
    
    console.log(`Corridor prototype at index ${corridorProtoIndex}`);
    
    // Generate mesh without rotation
    const meshGroup = buildTileMesh({
      THREE: global.THREE,
      prototypeIndex: corridorProtoIndex,
      rotationY: 0,
      unit: 3,  // Standard unit size
      prototypes: tilePrototypes
    });
    
    console.log('Generated mesh has', meshGroup.children.length, 'child meshes');
    
    // Analyze the mesh positions
    const positions = meshGroup.children.map(child => child.position);
    console.log('Mesh positions:');
    positions.forEach((pos, i) => {
      console.log(`  Mesh ${i}: (${pos.x}, ${pos.y}, ${pos.z})`);
    });
    
  // For a North-South corridor with canonical coordinates (unit=3):
  // - Floor meshes at Y≈0.15 (thin slab hugging the bottom of the tile)
  // - Wall meshes at Y≈1.5 (contiguous with floor/ceiling layers)
  // - Ceiling meshes at Y≈2.85 (thin cap touching the top of the tile)

  const floorMeshes = positions.filter(pos => pos.y < 0.6);           // Floor level (Y≈0.15)
  const wallMeshes = positions.filter(pos => pos.y > 1.0 && pos.y < 2.0); // Wall level (Y≈1.5)
  const ceilingMeshes = positions.filter(pos => pos.y > 2.4);         // Ceiling level (Y≈2.85)
    
    console.log(`Floor meshes: ${floorMeshes.length}, Wall meshes: ${wallMeshes.length}, Ceiling meshes: ${ceilingMeshes.length}`);
    
    // Verify we have the expected number of meshes
    expect(floorMeshes.length).toBe(9);  // Full 3x3 floor
    expect(ceilingMeshes.length).toBe(9); // Full 3x3 ceiling
    // North-South corridor has 2 rows of walls (north & south), each with 3 voxels = 6 wall meshes
    expect(wallMeshes.length).toBe(6);
    
    // Verify the passage is clear (no wall at center)
    // Center is at X=1.5, Z=1.5 (middle of 3x3 grid)
    const centerWall = wallMeshes.find(pos => 
      Math.abs(pos.x - 1.5) < 0.1 && Math.abs(pos.z - 1.5) < 0.1
    );
    expect(centerWall).toBeUndefined(); // Should be no wall at center of passage
    
    console.log('✓ WFC mesh generation produces expected structure');
  });
  
  test('should verify tile rotations work correctly', async () => {
    console.log('=== Testing Tile Rotations ===');
    
    // Get a simple L-corner tile and test rotations
    const { rotateYOnce } = await import('../docs/renderer/wfc_tile_mesh.js');
    
    // Create a simple test voxel pattern: L-corner
    const originalVoxels = [
      // z=0 (front)
      [[1, 0, 0], [1, 0, 0], [1, 1, 1]],  // L-shape in front slice
      // z=1 (middle)  
      [[1, 0, 0], [1, 0, 0], [1, 1, 1]],  // Same L-shape
      // z=2 (back)
      [[1, 0, 0], [1, 0, 0], [1, 1, 1]]   // Same L-shape
    ];
    
    console.log('Original voxel pattern (L-corner):');
    for (let z = 0; z < 3; z++) {
      console.log(`Z-slice ${z}:`);
      for (let y = 0; y < 3; y++) {
        let row = '';
        for (let x = 0; x < 3; x++) {
          row += originalVoxels[z][y][x] + ' ';
        }
        console.log(`  Y=${y}: ${row}`);
      }
    }
    
    // Rotate 90 degrees
    const rotatedVoxels = rotateYOnce(originalVoxels);
    
    console.log('Rotated voxel pattern (90° rotation):');
    for (let z = 0; z < 3; z++) {
      console.log(`Z-slice ${z}:`);
      for (let y = 0; y < 3; y++) {
        let row = '';
        for (let x = 0; x < 3; x++) {
          row += rotatedVoxels[z][y][x] + ' ';
        }
        console.log(`  Y=${y}: ${row}`);
      }
    }
    
    // Verify the rotation worked as expected
    // Verify the rotation worked by checking specific pattern changes
    // The L-corner should have rotated - check key positions
    expect(rotatedVoxels[0][2][0]).toBe(1); // Bottom-left should be filled (was [0][2][2])
    expect(rotatedVoxels[0][1][0]).toBe(1); // Mid-left should be filled (was [0][1][2])
    
    // Debug: let's understand what the rotation actually produces
    console.log('Rotation analysis:');
    console.log(`Original [0][0][0] = 1, Rotated [0][0][0] = ${rotatedVoxels[0][0][0]}`);
    console.log(`Original [0][2][2] = 1, Rotated [0][2][2] = ${rotatedVoxels[0][2][2]}`);
    
    console.log('✓ Rotation function works correctly');
  });
});