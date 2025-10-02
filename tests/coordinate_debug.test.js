/**
 * Debug test to understand the actual coordinate system issues
 */

describe('Coordinate System Debug', () => {
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
        }
      },
      BoxGeometry: class { constructor() {} }
    };
  });
  
  test('should understand actual voxel data structure from tileset builder', async () => {
    console.log('=== Analyzing Actual Tileset Data Structure ===');
    
    // Import the tileset builder to understand the actual format
    const { buildTileset } = await import('../docs/dungeon/tileset_builder.js');
    
    // Test with a simple tile definition
    const testDef = {
      tileId: 999,
      layers: [
        ["100", "000", "000"],  // Floor layer: only front-left corner
        ["000", "010", "000"],  // Middle layer: only center
        ["001", "000", "000"]   // Ceiling layer: only back-right corner
      ],
      transforms: [],
      meta: { weight: 1 }
    };
    
    const { tilePrototypes } = buildTileset([testDef]);
    const voxels = tilePrototypes[0].voxels;
    
    console.log('Test tile voxel structure:');
    console.log('voxels dimensions:', voxels.length, 'x', voxels[0].length, 'x', voxels[0][0].length);
    
    // Print the voxel data in a readable format
    for (let z = 0; z < 3; z++) {
      console.log(`Z-slice ${z}:`);
      for (let y = 0; y < 3; y++) {
        let row = '';
        for (let x = 0; x < 3; x++) {
          row += voxels[z][y][x] + ' ';
        }
        console.log(`  Y=${y}: ${row}`);
      }
    }
    
    // Test expectations based on input layers
    // Layer 0 (y=0): ["100","000","000"] - row 0 has '1' at x=0
    expect(voxels[0][0][0]).toBe(1); // z=0, y=0, x=0: front-left at floor level
    expect(voxels[0][0][1]).toBe(0);
    expect(voxels[0][0][2]).toBe(0);
    
    // Layer 1 (y=1): ["000","010","000"] - row 1 has '1' at x=1
    expect(voxels[1][1][1]).toBe(1); // z=1, y=1, x=1: center at middle level
    
    // Layer 2 (y=2): ["001","000","000"] - row 0 has '1' at x=2
    // This is z=0 (first row), y=2 (ceiling), x=2 (right side)
    expect(voxels[0][2][2]).toBe(1); // z=0, y=2, x=2: front-right at ceiling level
    
    console.log('✓ Voxel structure confirmed: vox[z][y][x] where z=depth (row), y=height (layer), x=width (col)');
  });
  
  test('should test mesh positioning with known voxel structure', async () => {
    console.log('=== Testing Mesh Positioning ===');
    
    // Import the mesh function
    const { convertStructureToMesh } = await import('../docs/renderer/wfc_tile_mesh.js');
    
    // Create a test structure that matches vox[z][y][x] format
    const testVoxels = [
      // z=0 (front slice)
      [
        [1, 0, 0], // y=0: front-left corner at floor
        [0, 0, 0], // y=1: empty middle level
        [0, 0, 0]  // y=2: empty ceiling level
      ],
      // z=1 (middle slice) 
      [
        [0, 0, 0], // y=0: empty floor
        [0, 1, 0], // y=1: center cube at middle level
        [0, 0, 0]  // y=2: empty ceiling
      ],
      // z=2 (back slice)
      [
        [0, 0, 0], // y=0: empty floor
        [0, 0, 0], // y=1: empty middle
        [0, 0, 1]  // y=2: back-right corner at ceiling
      ]
    ];
    
    const group = convertStructureToMesh(testVoxels, {}, 1.0);
    const positions = group.children.map(child => child.position);
    
    console.log('Generated mesh positions:');
    positions.forEach((pos, i) => {
      console.log(`  Mesh ${i}: (${pos.x}, ${pos.y}, ${pos.z})`);
    });
    
    // Expected positions based on voxel structure vox[z][y][x]:
    // vox[0][0][0] = 1 -> should be at position (0, 0, 0) 
    // vox[1][1][1] = 1 -> should be at position (1, 1, 1)
    // vox[2][2][2] = 1 -> should be at position (2, 2, 2)
    
    expect(positions).toHaveLength(3);
    
    // Check if we can find each expected position
    const expectedPositions = [
      { x: 0, y: 0, z: 0 }, // front-left floor
      { x: 1, y: 1, z: 1 }, // center middle
      { x: 2, y: 2, z: 2 }  // back-right ceiling
    ];
    
    expectedPositions.forEach((expected, i) => {
      const found = positions.find(pos => 
        pos.x === expected.x && pos.y === expected.y && pos.z === expected.z
      );
      if (found) {
        console.log(`✓ Found expected position (${expected.x}, ${expected.y}, ${expected.z})`);
      } else {
        console.log(`❌ Missing expected position (${expected.x}, ${expected.y}, ${expected.z})`);
        console.log('Available positions:', positions);
      }
      expect(found).toBeDefined();
    });
  });
  
  test('should verify Three.js coordinate conventions', () => {
    console.log('=== Three.js Coordinate Conventions ===');
    console.log('Three.js uses right-handed coordinate system:');
    console.log('  +X = right');
    console.log('  +Y = up');
    console.log('  +Z = toward viewer (out of screen)');
    console.log('');
    console.log('Tileset voxel structure: vox[z][y][x]');
    console.log('  z = depth coordinate (0=front, 2=back)');
    console.log('  y = height coordinate (0=floor, 2=ceiling)'); 
    console.log('  x = width coordinate (0=left, 2=right)');
    console.log('');
    console.log('Mapping should be: vox[z][y][x] -> position.set(x, y, z)');
  });
});