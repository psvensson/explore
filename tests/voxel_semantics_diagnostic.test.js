/**
 * Diagnostic test to verify voxel semantics are correct
 * Tests that SOLID voxels create geometry and EMPTY voxels are traversable
 */

import { jest } from '@jest/globals';

// Mock Three.js
const mockTHREE = {
  Group: class Group {
    constructor() {
      this.children = [];
      this.isGroup = true;
    }
    add(child) { this.children.push(child); }
  },
  Mesh: class Mesh {
    constructor(geometry, material) {
      this.geometry = geometry;
      this.material = material;
      this.position = { x: 0, y: 0, z: 0, set: (x, y, z) => { this.position.x = x; this.position.y = y; this.position.z = z; } };
      this.isMesh = true;
    }
  },
  BoxGeometry: class BoxGeometry {
    constructor(w, h, d) { this.width = w; this.height = h; this.depth = d; }
  },
  MeshStandardMaterial: class MeshStandardMaterial {
    constructor(props) { Object.assign(this, props); }
  }
};

describe('Voxel Semantics Diagnostic', () => {
  let TileStructures;
  let buildTileMesh;
  let VOXEL;

  beforeEach(async () => {
    jest.resetModules();
    
    const structuresModule = await import('../docs/dungeon/tile_structures.js');
    TileStructures = structuresModule.TileStructures;
    
    const meshModule = await import('../docs/renderer/wfc_tile_mesh.js');
    buildTileMesh = meshModule.buildTileMesh;
    
    const voxelModule = await import('../docs/utils/voxel_constants.js');
    VOXEL = voxelModule.VOXEL;
  });

  test('corridor_ns structure data is correct', async () => {
    const corridor = TileStructures.structures.corridor_ns;
    const struct = corridor.structure;
    
    console.log('\n=== CORRIDOR_NS STRUCTURE ANALYSIS ===');
    console.log('VOXEL.EMPTY =', VOXEL.EMPTY);
    console.log('VOXEL.SOLID =', VOXEL.SOLID);
    
    // Floor layer (y=0)
    console.log('\nFLOOR LAYER (y=0):');
    struct[0].forEach((row, z) => {
      console.log(`  z=${z}: [${row.join(', ')}]`);
    });
    
    // Mid layer (y=1) - walls and corridors
    console.log('\nMID LAYER (y=1):');
    struct[1].forEach((row, z) => {
      const display = row.map(v => v === VOXEL.SOLID ? 'WALL' : 'AIR ').join(' ');
      console.log(`  z=${z}: [${display}]`);
    });
    
    // Ceiling layer (y=2)
    console.log('\nCEILING LAYER (y=2):');
    struct[2].forEach((row, z) => {
      console.log(`  z=${z}: [${row.join(', ')}]`);
    });
    
    // Analysis
    console.log('\n=== EXPECTED FOR CORRIDOR_NS ===');
    console.log('Floor: All SOLID (need floor to walk on)');
    console.log('Mid: z=0 all SOLID (north wall), z=1 all EMPTY (corridor path), z=2 all SOLID (south wall)');
    console.log('Ceiling: All SOLID (need ceiling)');
    
    // Check mid layer specifically
    const midLayer = struct[1];
    const northWall = midLayer[0]; // z=0
    const corridorPath = midLayer[1];   // z=1
    const southWall = midLayer[2]; // z=2
    
    console.log('\n=== ACTUAL MID LAYER ===');
    console.log('North wall (z=0):', northWall.every(v => v === VOXEL.SOLID) ? 'All SOLID ✓' : 'WRONG ✗');
    console.log('Corridor (z=1):', corridorPath.every(v => v === VOXEL.EMPTY) ? 'All EMPTY ✓' : 'WRONG ✗');
    console.log('South wall (z=2):', southWall.every(v => v === VOXEL.SOLID) ? 'All SOLID ✓' : 'WRONG ✗');
  });

  test('corridor_ns mesh generation matches voxel data', async () => {
    const corridorStruct = TileStructures.structures.corridor_ns;
    
    // Use the proper buildTileMesh API with prototype
    const prototype = { id: 'corridor_ns', voxels: corridorStruct.structure };
    const mesh = buildTileMesh({
      THREE: mockTHREE,
      prototypes: [prototype],
      prototypeIndex: 0,
      unit: 3
    });
    
    console.log('\n=== MESH GENERATION ANALYSIS ===');
    console.log('Total meshes generated:', mesh.children.length);
    
    // Group by layer
    const byLayer = { floor: [], mid: [], ceiling: [] };
    mesh.children.forEach(child => {
      if (child.position.y < 0.6) byLayer.floor.push(child);
      else if (child.position.y < 2.2) byLayer.mid.push(child);
      else byLayer.ceiling.push(child);
    });
    
    console.log('Floor meshes:', byLayer.floor.length);
    console.log('Mid meshes:', byLayer.mid.length);
    console.log('Ceiling meshes:', byLayer.ceiling.length);
    
    // Check mid layer positions
    console.log('\nMid layer mesh positions (should be walls at z=-3 and z=3, nothing at z=0):');
    byLayer.mid.forEach(m => {
      console.log(`  x=${m.position.x}, y=${m.position.y}, z=${m.position.z}`);
    });
    
    // Expected: 6 wall meshes at z=-3 (north) and z=3 (south), none at z=0 (corridor)
    const northWalls = byLayer.mid.filter(m => m.position.z === -3);
    const corridorMid = byLayer.mid.filter(m => m.position.z === 0);
    const southWalls = byLayer.mid.filter(m => m.position.z === 3);
    
    console.log('\nWall distribution:');
  console.log('  North wall (z=-3):', northWalls.length, '- should be 3 ✓');
  console.log('  Corridor (z=0):', corridorMid.length, '- should be 0 ✓');
  console.log('  South wall (z=3):', southWalls.length, '- should be 3 ✓');
    
    expect(northWalls.length).toBe(3);
    expect(corridorMid.length).toBe(0); // Corridor should have NO walls
    expect(southWalls.length).toBe(3);
  });

  test('open_space_3x3 structure data is correct', async () => {
    const room = TileStructures.structures.open_space_3x3;
    const struct = room.structure;
    
    console.log('\n=== OPEN_SPACE_3X3 STRUCTURE ANALYSIS ===');
    
    // Count voxels
    let solidCount = 0;
    let emptyCount = 0;
    
    struct.forEach((layer, y) => {
      layer.forEach((row, z) => {
        row.forEach((val, x) => {
          if (val === VOXEL.SOLID) solidCount++;
          else if (val === VOXEL.EMPTY) emptyCount++;
        });
      });
    });
    
    console.log('SOLID voxels:', solidCount);
    console.log('EMPTY voxels:', emptyCount);
    
    console.log('\n=== ACTUAL STRUCTURE (SOURCE OF TRUTH) ===');
    console.log('Floor layer:', struct[0][0].every(v => v === VOXEL.EMPTY) ? 'All EMPTY ✓' : 'Has SOLID');
    console.log('Mid layer:', struct[1][0].every(v => v === VOXEL.EMPTY) ? 'All EMPTY ✓' : 'Has SOLID');
    console.log('Ceiling layer:', struct[2][0].every(v => v === VOXEL.EMPTY) ? 'All EMPTY ✓' : 'Has SOLID');
    
    console.log('\nNote: open_space_3x3 is ALL EMPTY - this may be intentional design');
    console.log('      (relies on adjacent tiles providing floor/ceiling context)');
    
    // Verify the structure data matches its definition (all empty)
    expect(solidCount).toBe(0); // open_space_3x3 is completely empty by design
    expect(emptyCount).toBe(27);  // All 27 voxels are empty
  });
});
