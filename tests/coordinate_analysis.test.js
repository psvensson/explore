import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock globals for testing
global.NDWFC3D = function() {};

describe('Coordinate Assignment Analysis', () => {
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
        } 
      },
      BoxGeometry: class { constructor(w, h, d) { this.width = w; this.height = h; this.depth = d; } },
      PlaneGeometry: class { constructor(w, h) { this.width = w; this.height = h; } },
      MeshBasicMaterial: class { constructor(params) { this.color = params?.color || 0xffffff; } }
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

  it('should analyze coordinate mapping in mesh generation', () => {
    console.log('=== COORDINATE MAPPING ANALYSIS ===');

    // Get the corridor tile (index 2 = NS corridor)
    const corridorProto = mockTilePrototypes[2];
    console.log('Corridor prototype voxels:');
    
    // Print the voxel structure for analysis
    for (let z = 0; z < 3; z++) {
      console.log(`  Z-slice ${z}:`);
      for (let y = 0; y < 3; y++) {
        const row = [];
        for (let x = 0; x < 3; x++) {
          row.push(corridorProto.voxels[z][y][x]);
        }
        console.log(`    Y=${y}: ${row.join(' ')}`);
      }
    }

    // Generate the mesh
    const tileMesh = buildTileMesh({ 
      THREE: global.THREE, 
      prototypes: mockTilePrototypes, 
      prototypeIndex: 2, 
      rotationY: 0, 
      unit: 3 
    });
    console.log('\\nGenerated mesh analysis:');
    console.log(`Total child meshes: ${tileMesh.children.length}`);
    
    // Analyze each mesh position relative to the voxel grid
    tileMesh.children.forEach((mesh, i) => {
      const pos = mesh.position;
      
      // Convert position back to voxel coordinates
      const voxelX = Math.round((pos.x - 0.5) / 1) * 3;
      const voxelY = Math.round((pos.y - 0.5) / 1) * 3;  
      const voxelZ = Math.round((pos.z - 0.5) / 1) * 3;
      
      // Determine the grid position in the 3x3x3 voxel
      const gridX = Math.round(pos.x - 0.5);
      const gridY = Math.round(pos.y - 0.5);
      const gridZ = Math.round(pos.z - 0.5);
      
      console.log(`Mesh ${i}: pos(${pos.x}, ${pos.y}, ${pos.z}) -> grid(${gridX}, ${gridY}, ${gridZ})`);
      
      // Check what should be at this voxel position
      if (gridX >= 0 && gridX < 3 && gridY >= 0 && gridY < 3 && gridZ >= 0 && gridZ < 3) {
        const expectedVoxel = corridorProto.voxels[gridZ][gridY][gridX];
        console.log(`    Expected voxel[${gridZ}][${gridY}][${gridX}] = ${expectedVoxel}`);
      }
    });
    
    // Analyze the coordinate axis mapping
    console.log('\\n=== AXIS MAPPING ANALYSIS ===');
    console.log('Expected mapping: vox[z][y][x] -> pos(x, y, z)');
    
    // Check specific positions for coordinate verification
    const expectedPositions = [
      { vox: [0,0,0], pos: [0.5, 0.05, 0.5] }, // Floor corner
      { vox: [1,1,1], pos: [1.5, 1.5, 1.5] },  // Center (should be empty)
      { vox: [2,2,2], pos: [2.5, 2.95, 2.5] }  // Ceiling corner
    ];
    
    expectedPositions.forEach(({ vox, pos }) => {
      const [z, y, x] = vox;
      const [expectedX, expectedY, expectedZ] = pos;
      const voxelValue = corridorProto.voxels[z][y][x];
      
      const actualMesh = tileMesh.children.find(mesh => 
        Math.abs(mesh.position.x - expectedX) < 0.1 && 
        Math.abs(mesh.position.y - expectedY) < 0.1 && 
        Math.abs(mesh.position.z - expectedZ) < 0.1
      );
      
      console.log(`Voxel[${z}][${y}][${x}] = ${voxelValue} -> expected pos(${expectedX}, ${expectedY}, ${expectedZ})`);
      console.log(`  Found mesh: ${actualMesh ? 'YES' : 'NO'}`);
      if (voxelValue === 0 && actualMesh) {
        console.log(`  WARNING: Found mesh at position where voxel is 0!`);
      }
      if (voxelValue === 1 && !actualMesh) {
        console.log(`  WARNING: No mesh found where voxel is 1!`);
      }
    });
  });

  it('should identify the coordinate system issue', () => {
    console.log('\\n=== IDENTIFYING THE TILT ISSUE ===');
    
    // The user mentioned the meshes look "tilted the wrong way"
    // This suggests a coordinate axis confusion
    
    const corridorProto = mockTilePrototypes[2];
    const tileMesh = buildTileMesh({ 
      THREE: global.THREE, 
      prototypes: mockTilePrototypes, 
      prototypeIndex: 2, 
      rotationY: 0, 
      unit: 3 
    });
    
    // Analyze suspicious mesh positions
    const suspiciousMeshes = tileMesh.children.filter(mesh => {
      // Look for meshes that have unusual coordinate combinations
      const pos = mesh.position;
      
      // Normal positions should be at grid centers: 0.5, 1.5, 2.5
      const normalX = [0.5, 1.5, 2.5].some(val => Math.abs(pos.x - val) < 0.1);
      const normalZ = [0.5, 1.5, 2.5].some(val => Math.abs(pos.z - val) < 0.1);
      
      // Normal Y positions should be at layer centers: 0.05, 1.5, 2.95
      const normalY = [0.05, 1.5, 2.95].some(val => Math.abs(pos.y - val) < 0.1);
      
      return !normalX || !normalY || !normalZ;
    });
    
    console.log(`Found ${suspiciousMeshes.length} suspicious mesh positions:`);
    suspiciousMeshes.forEach((mesh, i) => {
      console.log(`  Suspicious mesh ${i}: (${mesh.position.x}, ${mesh.position.y}, ${mesh.position.z})`);
    });
    
    if (suspiciousMeshes.length > 0) {
      console.log('\\n🔍 ANALYSIS: These positions suggest coordinate axis confusion');
      console.log('The "tilt" might be caused by incorrect axis assignments in mesh positioning');
    } else {
      console.log('\\n✓ All mesh positions follow expected coordinate patterns');
      console.log('The tilt issue might be elsewhere - camera setup, scene orientation, etc.');
    }
  });
});