/**
 * @fileoverview Test to verify coordinate system consistency between tileset data and mesh generation
 * This test ensures the coordinate system regression fix is working correctly.
 */

// Mock environment for Node.js compatibility
global.window = global.window || {};
global.document = {
  createElement: () => ({ style: {}, appendChild: () => {}, remove: () => {} }),
  body: { appendChild: () => {}, removeChild: () => {} },
  querySelector: () => null,
  querySelectorAll: () => []
};

describe('Coordinate System Fix Verification', () => {
  test('should correctly map tileset coordinates to Three.js mesh positions', async () => {
    // Mock Three.js objects for testing
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
        }
      },
      BoxGeometry: class { constructor() {} }
    };

    // Import the mesh generation function
    const { convertStructureToMesh } = await import('../docs/renderer/wfc_tile_mesh.js');

    // Test structure: Simple known pattern to verify coordinate mapping
    // Layer 0 (bottom): single voxel at position [0][0][0] 
    // Layer 1 (middle): single voxel at position [1][1][1]
    // Layer 2 (top): single voxel at position [2][2][2]
    const testStructure = [
      // Layer 0 (Y=0, bottom)
      [
        [1, 0, 0],  // Row 0: voxel at col 0
        [0, 0, 0],  // Row 1: empty
        [0, 0, 0]   // Row 2: empty
      ],
      // Layer 1 (Y=1, middle)  
      [
        [0, 0, 0],  // Row 0: empty
        [0, 1, 0],  // Row 1: voxel at col 1
        [0, 0, 0]   // Row 2: empty
      ],
      // Layer 2 (Y=2, top)
      [
        [0, 0, 0],  // Row 0: empty
        [0, 0, 0],  // Row 1: empty
        [0, 0, 1]   // Row 2: voxel at col 2
      ]
    ];

    // Generate mesh
    const mockMaterial = {};
    const group = convertStructureToMesh(testStructure, mockMaterial, 1.0);

    // Should have 3 cubes total
    expect(group.children).toHaveLength(3);

    // Verify coordinate mapping: structure[layer][row][col] → position(col, layer, row)
    const positions = group.children.map(child => child.position);
    
    // Expected positions based on the test structure:
    const expectedPositions = [
      { x: 0, y: 0, z: 0 }, // structure[0][0][0] → position(0, 0, 0) 
      { x: 1, y: 1, z: 1 }, // structure[1][1][1] → position(1, 1, 1)
      { x: 2, y: 2, z: 2 }  // structure[2][2][2] → position(2, 2, 2)
    ];

    // Verify each expected position exists
    expectedPositions.forEach(expectedPos => {
      const found = positions.find(pos => 
        pos.x === expectedPos.x && 
        pos.y === expectedPos.y && 
        pos.z === expectedPos.z
      );
      expect(found).toBeDefined();
      console.log(`✓ Found expected position: (${expectedPos.x}, ${expectedPos.y}, ${expectedPos.z})`);
    });

    // Verify Y-axis represents layers correctly
    const bottomLayerCubes = positions.filter(pos => pos.y === 0);
    const middleLayerCubes = positions.filter(pos => pos.y === 1);
    const topLayerCubes = positions.filter(pos => pos.y === 2);
    
    expect(bottomLayerCubes).toHaveLength(1); // 1 cube in layer 0
    expect(middleLayerCubes).toHaveLength(1); // 1 cube in layer 1
    expect(topLayerCubes).toHaveLength(1);    // 1 cube in layer 2

    console.log('✓ Coordinate system fix verified: structure[layer][row][col] → position(col, layer, row)');
  });

  test('should handle standard 3×3×3 dungeon corridor correctly', async () => {
    // Mock Three.js for testing
    global.THREE = {
      Group: class { 
        constructor() { this.children = []; }
        add(child) { this.children.push(child); }
      },
      Mesh: class { 
        constructor(geometry, material) { 
          this.position = { x: 0, y: 0, z: 0, set: function(x, y, z) { this.x = x; this.y = y; this.z = z; } };
        }
      },
      BoxGeometry: class {}
    };

    const { convertStructureToMesh } = await import('../docs/renderer/wfc_tile_mesh.js');

    // Standard north-south corridor structure from tileset
    const corridorStructure = [
      // Layer 0 (floor) - all solid
      [[1,1,1], [1,1,1], [1,1,1]],
      // Layer 1 (walls with passage) - walls on sides, open in middle column
      [[1,0,1], [1,0,1], [1,0,1]], 
      // Layer 2 (ceiling) - all solid
      [[1,1,1], [1,1,1], [1,1,1]]
    ];

    const group = convertStructureToMesh(corridorStructure, {}, 1.0);
    const positions = group.children.map(child => child.position);

    // Verify floor layer (Y=0) has 9 cubes
    const floorCubes = positions.filter(pos => pos.y === 0);
    expect(floorCubes).toHaveLength(9);
    console.log(`✓ Floor layer has ${floorCubes.length} cubes (expected 9)`);

    // Verify middle layer (Y=1) has 6 cubes (walls only, passage is clear)
    const wallCubes = positions.filter(pos => pos.y === 1);  
    expect(wallCubes).toHaveLength(6);
    console.log(`✓ Wall layer has ${wallCubes.length} cubes (expected 6, passage clear)`);

    // Verify ceiling layer (Y=2) has 9 cubes
    const ceilingCubes = positions.filter(pos => pos.y === 2);
    expect(ceilingCubes).toHaveLength(9);
    console.log(`✓ Ceiling layer has ${ceilingCubes.length} cubes (expected 9)`);

    // Verify passage is clear in middle layer (X=1 column should be empty at Y=1)
    const passageCubes = positions.filter(pos => pos.x === 1 && pos.y === 1);
    expect(passageCubes).toHaveLength(0);
    console.log('✓ Corridor passage is clear (no cubes at X=1, Y=1)');

    // Verify side walls exist in middle layer  
    const leftWallCubes = positions.filter(pos => pos.x === 0 && pos.y === 1);
    const rightWallCubes = positions.filter(pos => pos.x === 2 && pos.y === 1);
    expect(leftWallCubes).toHaveLength(3);  // 3 cubes along Z-axis
    expect(rightWallCubes).toHaveLength(3); // 3 cubes along Z-axis
    console.log('✓ Side walls exist (left and right walls have 3 cubes each)');

    console.log('✓ Standard corridor structure renders correctly with fixed coordinate system');
  });

  test('should verify rotation functions use correct coordinate system', async () => {
    // Import rotation functions
    const { rotateYOnce, equalVox } = await import('../docs/renderer/wfc_tile_mesh.js');

    // Test structure with asymmetric pattern to detect rotation issues
    const originalVox = [
      // Layer 0 (Y=0)
      [[1, 0, 0], [0, 0, 0], [0, 0, 0]],
      // Layer 1 (Y=1) 
      [[0, 0, 0], [0, 1, 0], [0, 0, 0]],
      // Layer 2 (Y=2)
      [[0, 0, 0], [0, 0, 0], [0, 0, 1]]
    ];

    // Rotate once (+90 degrees around Y)
    const rotatedVox = rotateYOnce(originalVox);

    // Verify rotation worked and maintains layer structure
    expect(rotatedVox.length).toBe(3); // Still 3 layers
    expect(rotatedVox[0].length).toBe(3); // Still 3 rows per layer
    expect(rotatedVox[0][0].length).toBe(3); // Still 3 cols per row

    // Verify layer 0 voxel moved correctly
    // Original: [0][0][0] → After +90°Y rotation should move to [0][0][2]
    expect(rotatedVox[0][0][2]).toBe(1);
    expect(rotatedVox[0][0][0]).toBe(0); // Original position should be empty

    // Verify layer 1 center voxel stays in center (rotation around Y shouldn't affect center)
    expect(rotatedVox[1][1][1]).toBe(1);

    // Test equality function
    const identicalVox = JSON.parse(JSON.stringify(originalVox));
    expect(equalVox(originalVox, identicalVox)).toBe(true);
    expect(equalVox(originalVox, rotatedVox)).toBe(false);

    console.log('✓ Rotation functions use correct coordinate system: vox[layer][row][col]');
  });
});