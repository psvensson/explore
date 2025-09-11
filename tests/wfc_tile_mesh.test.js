import { initializeTileset, tilePrototypes, _resetTilesetForTests } from '../docs/dungeon/tileset.js';
import { rotateY, detectTile, buildTileMesh } from '../docs/renderer/wfc_tile_mesh.js';

describe('wfc tile mesh parsing', () => {
  beforeAll(() => {
    global.NDWFC3D = function(){}; // stub
    initializeTileset();
  });

  test('every prototype rotation variant is detectable (parseable)', () => {
    for (let i=0;i<tilePrototypes.length;i++){
      const base = tilePrototypes[i].voxels;
      for (let r=0;r<4;r++){
        const rotated = rotateY(base,r);
        const res = detectTile(rotated); // Should not throw
        expect(res).toHaveProperty('prototypeIndex');
      }
    }
  });

  test('buildTileMesh creates group with children for solid cube', () => {
    // Find solid cube (all 1s) by checking voxel pattern
    const idx = tilePrototypes.findIndex(p=> p.voxels.every(layer=> layer.every(row=> row.every(v=> v===1))));
    expect(idx).toBeGreaterThan(-1);
    const THREE = {
      Group: class { constructor(){ this.children=[];} add(c){this.children.push(c);} },
      BoxGeometry: class { constructor(){} },
      MeshStandardMaterial: class { constructor(cfg){ this.cfg=cfg; } },
      Mesh: class { constructor(g,m){ this.geom=g; this.mat=m; this.position={set(){}}; } }
    };
    const group = buildTileMesh({THREE, prototypeIndex: idx, rotationY:0, unit:3});
    expect(group.children.length).toBeGreaterThan(0);
  });
});
