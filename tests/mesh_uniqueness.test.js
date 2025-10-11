/**
 * mesh_uniqueness.test.js
 * Ensures distinct structure inputs produce distinct mesh signatures using the new pipeline.
 */

import { normalizeToCanonical } from '../docs/utils/voxel_normalize.js';
import { meshSignature } from '../docs/renderer/mesh_signature.js';

// Lightweight THREE mock for signature extraction (position + material tagging)
class MockMaterial { constructor(params={}){ this.userData = { kind: params.kind || params.type || 'unk' }; } }
class MockMesh { constructor(geom, material){ this.material = material; this.position={x:0,y:0,z:0,set:(x,y,z)=>{this.x=x;this.y=y;this.z=z;}}; } }
class MockGroup { constructor(){ this.children=[]; } add(o){ this.children.push(o); } }
class MockBoxGeometry { constructor(){} }

const MockTHREE = {
  Mesh: MockMesh,
  Group: MockGroup,
  BoxGeometry: MockBoxGeometry,
  MeshStandardMaterial: MockMaterial
};

// Import after mocks (dynamic import pattern not required here since we pass THREE explicitly).
import { StructureMeshPipeline } from '../docs/ui/utils/structure-mesh-pipeline.js';

// Helper to build a mesh from a 2D pattern quickly
async function buildFromPattern(pattern, opts={}) {
  return StructureMeshPipeline.createMeshFromStructure(MockTHREE, pattern, {
    unit: 3,
    ...opts
  });
}

describe('Mesh Uniqueness (Unified Pipeline)', () => {
  test('corridor variants vs room produce different signatures', async () => {
    const corridorNS = [ // walkable middle row
      [0,0,0],
      [1,1,1],
      [0,0,0]
    ];
    const corridorEW = [ // walkable middle column
      [0,1,0],
      [0,1,0],
      [0,1,0]
    ];
    const roomHollow = [ // ring with hollow center
      [1,1,1],
      [1,0,1],
      [1,1,1]
    ];

    const meshA = await buildFromPattern(corridorNS);
    const meshB = await buildFromPattern(corridorEW);
    const meshC = await buildFromPattern(roomHollow);

    const sigA = meshSignature(meshA);
    const sigB = meshSignature(meshB);
    const sigC = meshSignature(meshC);

    expect(sigA).not.toBe(sigB);
    expect(sigB).not.toBe(sigC);
    expect(sigA).not.toBe(sigC);
  });

  test('stair voxel differs from solid wall', async () => {
    const solidCenter = [
      [0,0,0],
      [0,1,0],
      [0,0,0]
    ];
    const stairCenter = [
      [0,0,0],
      [0,2,0],
      [0,0,0]
    ];

    const meshSolid = await buildFromPattern(solidCenter);
    const meshStair = await buildFromPattern(stairCenter);

    const sigSolid = meshSignature(meshSolid);
    const sigStair = meshSignature(meshStair);

    expect(sigSolid).not.toBe(sigStair);
  });
});
