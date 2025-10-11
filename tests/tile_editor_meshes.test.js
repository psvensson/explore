/**
 * Test that different tile structures produce different meshes in editor mode
 */

import { jest } from '@jest/globals';

class MockGroup {
  constructor() {
    this.children = [];
    this.isGroup = true;
  }
  add(obj) {
    this.children.push(obj);
  }
  clone(deep = true) {
    const cloned = new MockGroup();
    if (deep) {
      this.children.forEach(child => {
        if (child && typeof child.clone === 'function') {
          cloned.add(child.clone(true));
        } else if (child && typeof child === 'object') {
          cloned.add({ ...child });
        } else {
          cloned.add(child);
        }
      });
    } else {
      cloned.children = [...this.children];
    }
    return cloned;
  }
}

class MockMesh {
  constructor(geometry, material) {
    this.geometry = geometry;
    this.material = material;
    const setter = function(x, y, z) { this.x = x; this.y = y; this.z = z; };
    this.position = { x: 0, y: 0, z: 0, set: setter };
    this.isMesh = true;
  }
  clone() {
    const cloned = new MockMesh(this.geometry, this.material);
    cloned.position = { ...this.position, set: this.position.set };
    return cloned;
  }
}

// Mock THREE.js
const mockTHREE = {
  Group: MockGroup,
  Mesh: MockMesh,
  BoxGeometry: class {
    constructor(w, h, d) {
      this.width = w;
      this.height = h;
      this.depth = d;
      this.isBoxGeometry = true;
    }
  },
  MeshStandardMaterial: class {
    constructor(params) {
      this.color = params.color;
      this.userData = params.userData || {};
      this.isMeshStandardMaterial = true;
    }
  }
};

function countMeshesByType(mesh) {
  const counts = { total: mesh.children.length };
  mesh.children.forEach(child => {
    const type = child?.material?.userData?.type;
    if (!type) return;
    counts[type] = (counts[type] || 0) + 1;
  });
  return counts;
}

describe('Tile Editor Mesh Generation', () => {
  let StructureMeshPipeline;
  let TileStructures;

  beforeEach(async () => {
    // Reset modules
    jest.resetModules();
    
    // Import after mock setup
    const pipelineModule = await import('../docs/ui/utils/structure-mesh-pipeline.js');
    StructureMeshPipeline = pipelineModule.StructureMeshPipeline;
    StructureMeshPipeline.clearMeshCache();
    
    const structuresModule = await import('../docs/dungeon/tile_structures.js');
    TileStructures = structuresModule.TileStructures;
  });

  test('different structures produce different voxel patterns', async () => {
    // Get two different structure types
  const corridorNS = TileStructures.structures.corridor_ns;
  const rotated = TileStructures.rotate(corridorNS, 90);
  // Rotated variant should change edges orientation
  expect(JSON.stringify(corridorNS.edges)).not.toBe(JSON.stringify(rotated.edges));
  });

  test('different structures produce meshes with different child counts', async () => {
    // Test with different structures
    const corridorNS = TileStructures.structures.corridor_ns;
    const crossIntersection = TileStructures.structures.corridor_nsew;
    
    // Create meshes for both
    const meshNS = await StructureMeshPipeline.createMeshFromStructure(
      mockTHREE, 
      corridorNS.structure,
      { unit: 3 }
    );
    
    const meshCross = await StructureMeshPipeline.createMeshFromStructure(
      mockTHREE,
      crossIntersection.structure,
      { unit: 3 }
    );
    
    console.log('corridor_ns mesh children:', meshNS.children.length);
    console.log('corridor_nsew mesh children:', meshCross.children.length);

    const countsNS = countMeshesByType(meshNS);
    const countsCross = countMeshesByType(meshCross);

    expect(countsNS.total).toBe(24); // 9 floor + 6 wall + 9 ceiling
    expect(countsNS.floor).toBe(9);
    expect(countsNS.wall).toBe(6);
    expect(countsNS.ceiling).toBe(9);

    expect(countsCross.total).toBe(22); // 9 floor + 4 wall + 9 ceiling
    expect(countsCross.floor).toBe(9);
    expect(countsCross.wall).toBe(4);
    expect(countsCross.ceiling).toBe(9);

    expect(countsNS.wall).not.toBe(countsCross.wall);
  });

  test('mesh children have correct positions based on structure', async () => {
    // Test corridor_ns which has walls at z=1, x=[0,1,2]
    const corridorNS = TileStructures.structures.corridor_ns;
    
    const mesh = await StructureMeshPipeline.createMeshFromStructure(
      mockTHREE,
      corridorNS.structure,
      { unit: 3 }
    );
    
    console.log('corridor_ns mesh:', mesh);
    console.log('Number of children:', mesh.children.length);
    
    // Log all child positions
    mesh.children.forEach((child, i) => {
      if (child.isMesh) {
        console.log(`Child ${i} position:`, child.position);
      }
    });
    
    const counts = countMeshesByType(mesh);
    expect(counts.floor).toBe(9);
    expect(counts.wall).toBe(6);
    expect(counts.ceiling).toBe(9);
    
    // Check that positions are correct (canonical system maps voxel indices [0,1,2] to [-unit, 0, +unit])
    // corridor_ns has 6 wall cubes and a 3x3 floor/ceiling grid
    const wallMeshes = mesh.children.filter(child => child.material?.userData?.type === 'wall');
    const xPositions = wallMeshes.map(m => m.position.x).sort((a, b) => a - b);
    const uniqueX = [...new Set(xPositions)];
    expect(uniqueX).toEqual([-3, 0, 3]);  // Should use all three X positions
  });

  test('createMeshFromStructureObject extracts structure correctly', async () => {
    // Test the full flow with structure object format
    const structureObject = {
      structure: TileStructures.structures.corridor_ns.structure,
      edges: TileStructures.structures.corridor_ns.edges,
      type: TileStructures.structures.corridor_ns.type
    };
    
    const mesh = await StructureMeshPipeline.createMeshFromStructureObject(
      mockTHREE,
      structureObject,
      { unit: 3 }
    );
    
    // Should produce same result as direct structure
    const counts = countMeshesByType(mesh);
    expect(counts.total).toBe(24);
  });

  test('sequential calls with different structures produce different results', async () => {
    // This specifically tests for mutation bugs
  const corridorNS = { structure: TileStructures.structures.corridor_ns.structure };
    const crossIntersection = { structure: TileStructures.structures.corridor_nsew.structure };
    
    // Create meshes sequentially
  const mesh1 = await StructureMeshPipeline.createMeshFromStructureObject(mockTHREE, corridorNS, { unit: 3 });
  const mesh3 = await StructureMeshPipeline.createMeshFromStructureObject(mockTHREE, crossIntersection, { unit: 3 });
    
  console.log('Sequential mesh child counts:', mesh1.children.length, mesh3.children.length);
    
  // Mesh counts should reflect per-structure wall counts
  const counts1 = countMeshesByType(mesh1);
  const counts3 = countMeshesByType(mesh3);
  expect(counts1.total).toBe(24);
  expect(counts3.total).toBe(22);
    
    // Verify positions are also different
    const positions1 = mesh1.children.map(c => `${c.position.x},${c.position.z}`).sort();
    const positions3 = mesh3.children.map(c => `${c.position.x},${c.position.z}`).sort();
    
  console.log('Mesh 1 positions:', positions1);
  console.log('Mesh 3 positions:', positions3);
    
  expect(positions1).not.toEqual(positions3);
  });

  test('repeated calls return distinct mesh instances for the same structure', async () => {
    const corridorStructure = TileStructures.structures.corridor_ns;
    const meshA = await StructureMeshPipeline.createMeshFromStructureObject(mockTHREE, corridorStructure, {
      unit: 3,
      structureId: 'corridor_ns'
    });
    const meshB = await StructureMeshPipeline.createMeshFromStructureObject(mockTHREE, corridorStructure, {
      unit: 3,
      structureId: 'corridor_ns'
    });

    expect(meshA).not.toBe(meshB);
    expect(meshA.children.length).toBe(meshB.children.length);
  });

  test('structures sharing a type render unique meshes', async () => {
    const nsStructure = TileStructures.structures.corridor_ns;
    const corner = TileStructures.structures.corner_ne;

    const meshNS = await StructureMeshPipeline.createMeshFromStructureObject(mockTHREE, nsStructure, {
      unit: 3,
      structureId: 'corridor_ns'
    });
    const meshCorner = await StructureMeshPipeline.createMeshFromStructureObject(mockTHREE, corner, {
      unit: 3,
      structureId: 'corner_ne'
    });

    const coordsNS = meshNS.children.map(c => `${c.position.x},${c.position.y},${c.position.z}`).sort();
    const coordsCorner = meshCorner.children.map(c => `${c.position.x},${c.position.y},${c.position.z}`).sort();

    expect(coordsNS).not.toEqual(coordsCorner);
  });

  test('cache invalidation clears previous entries', async () => {
    const nsStructure = TileStructures.structures.corridor_ns;
    const first = await StructureMeshPipeline.createMeshFromStructureObject(mockTHREE, nsStructure, {
      unit: 3,
      structureId: 'corridor_ns'
    });
    StructureMeshPipeline.invalidateCacheForStructure('corridor_ns');
    const second = await StructureMeshPipeline.createMeshFromStructureObject(mockTHREE, nsStructure, {
      unit: 3,
      structureId: 'corridor_ns'
    });

    expect(second).not.toBe(first);
    expect(second.children.length).toBe(first.children.length);
  });
});
