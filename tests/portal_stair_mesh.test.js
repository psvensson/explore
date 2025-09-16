import { initializeTileset, tilePrototypes, _resetTilesetForTests } from '../docs/dungeon/tileset.js';
import meshUtil from '../docs/renderer/wfc_tile_mesh.js';

// Minimal THREE stub sufficient for buildTileMesh
class Vector3 { constructor(x=0,y=0,z=0){ this.x=x; this.y=y; this.z=z; } set(x,y,z){ this.x=x; this.y=y; this.z=z; return this; } add(v){ this.x+=v.x; this.y+=v.y; this.z+=v.z; return this; } }
class Group { constructor(){ this.children=[]; } add(o){ this.children.push(o); } }
class BoxGeometry { constructor(){ this.type='BoxGeometry'; } }
class MeshStandardMaterial { constructor(cfg){ this.color=cfg.color; this.userData={}; } }
class Mesh { constructor(geom, mat){ this.geometry=geom; this.material=mat; this.position=new Vector3(); }
}
class CanvasTexture { constructor(){} }

const THREE = { Group, BoxGeometry, MeshStandardMaterial, Mesh, Vector3, CanvasTexture };

function getPortalTiles(){
  const lower = tilePrototypes.find(p=>p.tileId===31);
  const upper = tilePrototypes.find(p=>p.tileId===32);
  if (!lower || !upper) throw new Error('Portal tiles not found');
  return { lower, upper };
}

describe('portal stair mesh openness', () => {
  beforeEach(() => {
    global.NDWFC3D = function(){}; // stub consumption in tileset
    _resetTilesetForTests();
    initializeTileset();
  });

  function buildForProto(proto){
    const protoIndex = tilePrototypes.indexOf(proto);
    expect(protoIndex).toBeGreaterThan(-1);
    // rotationY = 0
    return meshUtil.buildTileMesh({ THREE, prototypeIndex: protoIndex, rotationY:0, unit:3 });
  }

  function collectTypes(group){
    return group.children.map(c=> c.material && c.material.userData && c.material.userData.type).filter(Boolean);
  }

  test('lower portal (31) has no ceiling geometry and contains stair steps', () => {
    const { lower } = getPortalTiles();
    const mesh = buildForProto(lower);
    const types = collectTypes(mesh);
    // Should not include any ceiling plates
    expect(types).not.toContain('ceiling');
    expect(types).not.toContain('ceiling_full');
    // Should include stair representation
    expect(types.some(t => t==='stair' || t==='portal-stair')).toBe(true);
  });

  test('upper portal (32) now includes solid floor (design change) and has no ceiling', () => {
    const { upper } = getPortalTiles();
    const mesh = buildForProto(upper);
    const types = collectTypes(mesh);
    // Floors are now expected
    expect(types.filter(t=>t==='floor' || t==='floor_full').length).toBeGreaterThan(0);
    // Still no ceiling geometry
    expect(types).not.toContain('ceiling');
    expect(types).not.toContain('ceiling_full');
    // Includes stair representation
    expect(types.some(t => t==='stair' || t==='portal-stair')).toBe(true);
  });

  test('portal tiles emit no mid wall plates blocking traversal', () => {
    const { lower, upper } = getPortalTiles();
    const lowerMesh = buildForProto(lower);
    const upperMesh = buildForProto(upper);
    const lowerTypes = collectTypes(lowerMesh);
    const upperTypes = collectTypes(upperMesh);
    // Wall types we consider blocking in stair interior
    const wallTypes = ['wall_xMajor','wall_zMajor','wall_both','wall_pillar'];
    wallTypes.forEach(t => {
      expect(lowerTypes).not.toContain(t);
      expect(upperTypes).not.toContain(t);
    });
  });
});
