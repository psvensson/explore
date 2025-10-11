/**
 * Diagnostic test to verify voxel-to-mesh semantics
 * This test checks if SOLID voxels generate geometry and EMPTY voxels don't.
 */

import { jest } from '@jest/globals';

// Mock Three.js
const mockTHREE = {
  Group: class {
    constructor() {
      this.children = [];
      this.isGroup = true;
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
      this.isMesh = true;
    }
  },
  BoxGeometry: class {
    constructor(w, h, d) {
      this.width = w;
      this.height = h;
      this.depth = d;
      this.isBoxGeometry = true;
    }
  },
  MeshStandardMaterial: class {
    constructor(opts) {
      this.color = opts?.color || 0xffffff;
      this.isMeshStandardMaterial = true;
    }
  }
};

describe('Voxel-to-Mesh Semantics Diagnostic', () => {
  let StructureMeshPipeline;
  let VOXEL;

  beforeEach(async () => {
    jest.resetModules();
    
    const constantsModule = await import('../docs/utils/voxel_constants.js');
    VOXEL = constantsModule.VOXEL;
    
    const pipelineModule = await import('../docs/ui/utils/structure-mesh-pipeline.js');
    StructureMeshPipeline = pipelineModule.StructureMeshPipeline;
  });

  test('EMPTY voxels should NOT generate geometry', async () => {
    console.log('\n====== TEST: EMPTY VOXELS ======');
    
    // Create a structure with ALL empty voxels (complete void)
    const allEmptyStructure = [
      [ // Floor layer - all empty
        [VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY],
        [VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY],
        [VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY]
      ],
      [ // Mid layer - all empty
        [VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY],
        [VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY],
        [VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY]
      ],
      [ // Ceiling layer - all empty
        [VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY],
        [VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY],
        [VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY]
      ]
    ];

    const mesh = await StructureMeshPipeline.createMeshFromStructure(
      mockTHREE,
      allEmptyStructure,
      { unit: 3 }
    );

    console.log('All-empty structure mesh children:', mesh.children.length);
    console.log('Expected: 0 (no geometry for empty voxels)');
    
    expect(mesh.children.length).toBe(0);
  });

  test('SOLID voxels SHOULD generate geometry', async () => {
    console.log('\n====== TEST: SOLID VOXELS ======');
    
    // Create a structure with ALL solid voxels (complete solid block)
    const allSolidStructure = [
      [ // Floor layer - all solid
        [VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID],
        [VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID],
        [VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]
      ],
      [ // Mid layer - all solid
        [VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID],
        [VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID],
        [VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]
      ],
      [ // Ceiling layer - all solid
        [VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID],
        [VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID],
        [VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]
      ]
    ];

    const mesh = await StructureMeshPipeline.createMeshFromStructure(
      mockTHREE,
      allSolidStructure,
      { unit: 3 }
    );

    console.log('All-solid structure mesh children:', mesh.children.length);
    console.log('Note: buildTileMesh optimizes completely solid blocks as a single 3×3×3 cube');
    console.log('This is correct behavior - fully solid = 1 optimized mesh, not 27 individual cubes');
    
    // When ALL voxels are solid, buildTileMesh creates an optimized single 3×3×3 cube
    // This is correct - a completely solid block should be efficient
    expect(mesh.children.length).toBe(1);
  });

  test('corridor_ns middle layer: walls=SOLID (render), corridor=EMPTY (no render)', async () => {
    console.log('\n====== TEST: CORRIDOR_NS MIDDLE LAYER ======');
    
    const TileStructures = (await import('../docs/dungeon/tile_structures.js')).TileStructures;
    const corridor_ns = TileStructures.structures.corridor_ns;
    
    console.log('corridor_ns middle layer (y=1):');
    const midLayer = corridor_ns.structure[1];
    midLayer.forEach((row, z) => {
      console.log(`  z=${z}: [${row.map(v => v === VOXEL.EMPTY ? 'E' : v === VOXEL.SOLID ? 'S' : '?').join(', ')}]`);
    });
    
    console.log('\nExpected pattern:');
    console.log('  z=0 (north): [S, S, S] - solid wall, should render as 3 cubes');
    console.log('  z=1 (middle): [E, E, E] - empty corridor, should NOT render');
    console.log('  z=2 (south): [S, S, S] - solid wall, should render as 3 cubes');
    
    // Verify the structure is correct
    expect(midLayer[0]).toEqual([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]); // North wall
    expect(midLayer[1]).toEqual([VOXEL.EMPTY, VOXEL.EMPTY, VOXEL.EMPTY]); // Corridor
    expect(midLayer[2]).toEqual([VOXEL.SOLID, VOXEL.SOLID, VOXEL.SOLID]); // South wall
    
    // Now generate the mesh
    const mesh = await StructureMeshPipeline.createMeshFromStructure(
      mockTHREE,
      corridor_ns.structure,
      { unit: 3 }
    );
    
    console.log('\nGenerated mesh has', mesh.children.length, 'children');
    
    // Count meshes at middle layer (y=1)
  const midLayerMeshes = mesh.children.filter(child => Math.abs(child.position.y - 1.5) < 0.2);
  console.log('Middle layer (y=1.5) meshes:', midLayerMeshes.length);
    console.log('Expected: 6 (3 north wall + 3 south wall, NO corridor meshes)');
    
    // Verify z positions of middle layer meshes
    const zPositions = midLayerMeshes.map(m => m.position.z).sort();
    console.log('Middle layer Z positions:', zPositions);
    console.log('Expected: [-3, -3, -3, 3, 3, 3] (walls at z=-3 and z=3, nothing at z=0)');
    
    expect(midLayerMeshes.length).toBe(6);
    
    // Verify NO meshes at z=0 (corridor path) in middle layer
    const corridorMeshes = midLayerMeshes.filter(m => m.position.z === 0);
  console.log('\nMeshes at corridor path (z=0, y=1.5):', corridorMeshes.length);
    console.log('Expected: 0 (empty corridor should have NO geometry)');
    expect(corridorMeshes.length).toBe(0);
  });
});
