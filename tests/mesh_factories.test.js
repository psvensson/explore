import { makeGeometryFactory, makeMaterialFactory, isAllSolid, buildStairs } from '../docs/renderer/mesh_factories.js';

describe('mesh_factories', ()=>{
  const THREEStub = ()=>{}; // minimal host
  const THREE = {
    BoxGeometry: function(w,h,d){ this.w=w; this.h=h; this.d=d; },
    MeshStandardMaterial: function(cfg){ this.color=cfg.color; },
    CanvasTexture: function(){}
  };
  test('isAllSolid detects solid', ()=>{
    const solid = Array.from({length:3},()=>Array.from({length:3},()=>Array(3).fill(1)));
    expect(isAllSolid(solid)).toBe(true);
    solid[1][1][1]=0; expect(isAllSolid(solid)).toBe(false);
  });
  test('geometry factory caches and returns shapes', ()=>{
    const factory = makeGeometryFactory(THREE, 9);
    const g1 = factory('floor');
    const g2 = factory('floor');
    expect(g1).toBe(g2); // cache reused
    const wall = factory('wall_xMajor');
    expect(wall.w).toBe(9);
  });
  test('material factory caches', ()=>{
    const matFactory = makeMaterialFactory(THREE);
    const m1 = matFactory('floor',0x333333,'floor');
    const m2 = matFactory('floor',0x333333,'floor');
    expect(m1).toBe(m2);
  });
  test('buildStairs adds 3 steps', ()=>{
    const group = { children:[], add(o){ this.children.push(o); } };
    const dirInfo={axis:'x',dir:1};
    buildStairs({THREE, group, dirInfo, unit:9, stairMat:{}});
    expect(group.children.length).toBe(3);
  });
});
