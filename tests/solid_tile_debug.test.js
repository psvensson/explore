import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock globals for testing
global.NDWFC3D = function() {};

describe('Solid Tile Debug Analysis', () => {
  let buildTileMesh;
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
    
    // Import the tileset to get the prototypes
    const tilesetModule = await import('../docs/dungeon/tileset.js');
    tilesetModule._resetTilesetForTests();
    
    // Initialize the tileset with data
    await import('../docs/dungeon/tileset_data.js');
    await tilesetModule.initializeTileset();
    
    mockTilePrototypes = tilesetModule.tilePrototypes;
  });

  it('should debug solid tile (index 1) mesh generation', async () => {
    console.log('=== SOLID TILE DEBUG ANALYSIS ===');

    const solidTileIndex = 1; // The problematic tile
    const prototype = mockTilePrototypes[solidTileIndex];

    console.log(`\\nPrototype ${solidTileIndex} data:`);
    console.log('  TileId:', prototype?.tileId);
    console.log('  Size:', prototype?.size);
    console.log('  Transforms:', prototype?.transforms);
    console.log('  Meta:', prototype?.meta);

    if (prototype?.voxels) {
      console.log('\\n  Voxel data:');
      for (let z = 0; z < 3; z++) {
        console.log(`    Layer ${z} (z=${z}):`);
        for (let y = 2; y >= 0; y--) { // Print top to bottom  
          let row = '      ';
          for (let x = 0; x < 3; x++) {
            const voxel = prototype.voxels[z] && prototype.voxels[z][y] && prototype.voxels[z][y][x];
            row += (voxel === 1 ? '█' : (voxel === 0 ? '·' : '?')) + ' ';
          }
          console.log(`${row} (y=${y})`);
        }
      }
    }

    console.log('\\n--- Mesh Generation Test ---');
    
    const tileMesh = buildTileMesh({ 
      THREE: global.THREE, 
      prototypes: mockTilePrototypes, 
      prototypeIndex: solidTileIndex, 
      rotationY: 0, 
      unit: 3
    });

    console.log(`Generated ${tileMesh.children.length} meshes:`);

    // Analyze each mesh in detail
    tileMesh.children.forEach((mesh, i) => {
      console.log(`  Mesh ${i}:`);
      console.log(`    Position: (${mesh.position.x.toFixed(2)}, ${mesh.position.y.toFixed(2)}, ${mesh.position.z.toFixed(2)})`);
      console.log(`    Material: ${mesh._materialType || 'unknown'}`);
      console.log(`    Geometry: ${mesh.geometry.width}x${mesh.geometry.height}x${mesh.geometry.depth}`);
      
      // Classify by position
      const y = mesh.position.y;
      let classification = 'unknown';
      if (Math.abs(y - 0.05) < 0.1) classification = 'FLOOR';
      else if (Math.abs(y - 2.95) < 0.1) classification = 'CEILING';
      else if (Math.abs(y - 1.5) < 0.6) classification = 'WALL';
      
      console.log(`    Classification: ${classification}`);
    });

    // Check if the issue is positioning tolerance
    console.log('\\n--- Position Analysis ---');
    const allPositions = tileMesh.children.map(m => m.position.y).sort((a,b) => a-b);
    console.log('All Y positions:', allPositions.map(y => y.toFixed(3)));
    
    const floorMeshes = tileMesh.children.filter(m => Math.abs(m.position.y - 0.05) < 0.15); // Wider tolerance
    const ceilingMeshes = tileMesh.children.filter(m => Math.abs(m.position.y - 2.95) < 0.15); // Wider tolerance
    
    console.log(`Floor meshes (wider tolerance): ${floorMeshes.length}`);
    console.log(`Ceiling meshes (wider tolerance): ${ceilingMeshes.length}`);

    if (floorMeshes.length === 0 && ceilingMeshes.length === 0) {
      console.log('\\n❌ CONFIRMED: Solid tile has no floor/ceiling meshes');
      console.log('   This explains why ceiling-from-below shows through in WFC dungeons');
      console.log('   Solid tiles should not be used in areas where players can walk');
    } else {
      console.log('\\n✅ Solid tile has floor/ceiling meshes, issue is elsewhere');
    }

    // Check if this might be expected behavior for solid tiles
    console.log('\\n--- Expected Behavior Analysis ---');
    console.log('For a solid rock/wall tile:');
    console.log('  - Should it have floor surfaces? Probably NO (you walk ON TOP of it)');
    console.log('  - Should it have ceiling surfaces? Probably NO (it\'s solid inside)');
    console.log('  - The issue is WFC is placing solid tiles where walkable tiles should be');
  });

  it('should find a proper walkable tile for comparison', async () => {
    console.log('\\n=== WALKABLE TILE COMPARISON ===');

    // Test tiles 0, 2, 4, 8 to find one with floors
    const testIndices = [0, 2, 4, 8];
    
    for (const index of testIndices) {
      if (index >= mockTilePrototypes.length) continue;

      console.log(`\\n--- Testing tile ${index} ---`);
      
      const prototype = mockTilePrototypes[index];
      console.log(`TileId: ${prototype?.tileId}`);
      
      // Show voxel structure quickly  
      if (prototype?.voxels) {
        const hasFloorVoxels = prototype.voxels.some(zLayer => 
          zLayer[0] && zLayer[0].some(voxel => voxel === 1)
        );
        const hasCeilingVoxels = prototype.voxels.some(zLayer => 
          zLayer[2] && zLayer[2].some(voxel => voxel === 1)
        );
        const hasEmptyMiddle = prototype.voxels.some(zLayer => 
          zLayer[1] && zLayer[1].some(voxel => voxel === 0)
        );
        
        console.log(`  Has floor voxels (y=0): ${hasFloorVoxels}`);
        console.log(`  Has ceiling voxels (y=2): ${hasCeilingVoxels}`);
        console.log(`  Has empty space (y=1): ${hasEmptyMiddle}`);
      }
      
      const tileMesh = buildTileMesh({ 
        THREE: global.THREE, 
        prototypes: mockTilePrototypes, 
        prototypeIndex: index, 
        rotationY: 0, 
        unit: 3
      });

      const floorMeshes = tileMesh.children.filter(m => Math.abs(m.position.y - 0.05) < 0.15);
      const ceilingMeshes = tileMesh.children.filter(m => Math.abs(m.position.y - 2.95) < 0.15);
      
      console.log(`  Generated floor meshes: ${floorMeshes.length}`);
      console.log(`  Generated ceiling meshes: ${ceilingMeshes.length}`);
      
      if (floorMeshes.length > 0 && ceilingMeshes.length > 0) {
        console.log(`  ✅ Tile ${index} is a proper walkable room tile`);
      } else {
        console.log(`  ❌ Tile ${index} missing floor/ceiling`);
      }
    }
  });
});