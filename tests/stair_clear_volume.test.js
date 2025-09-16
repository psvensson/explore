// Validates that forward neighbors of each stair prototype satisfy clear volume rule (middle row + top center empty)

describe('stair clear volume heuristic', () => {
  let initializeTileset, tilePrototypes, _resetTilesetForTests;
  beforeAll(async () => {
    global.NDWFC3D = function(){};
    const mod = await import('../docs/dungeon/tileset.js');
    ({ initializeTileset, tilePrototypes, _resetTilesetForTests } = mod);
  });
  beforeEach(() => {
    _resetTilesetForTests();
    global.NDWFC3D = function(){};
    initializeTileset();
  });

  function middleRowEmpty(vox, face){
    if (face==='posZ') return vox[2][1][0]===0 && vox[2][1][1]===0 && vox[2][1][2]===0;
    if (face==='negZ') return vox[0][1][0]===0 && vox[0][1][1]===0 && vox[0][1][2]===0;
    if (face==='posX') return vox[0][1][2]===0 && vox[1][1][2]===0 && vox[2][1][2]===0;
    if (face==='negX') return vox[0][1][0]===0 && vox[1][1][0]===0 && vox[2][1][0]===0;
    return true;
  }
  function topCenterEmpty(vox, face){
    if (face==='posZ') return vox[2][2][1]===0;
    if (face==='negZ') return vox[0][2][1]===0;
    if (face==='posX') return vox[1][2][2]===0;
    if (face==='negX') return vox[1][2][0]===0;
    return true;
  }

  test('at least one non-stair prototype satisfies clear forward volume for each stair', () => {
    const stairs = tilePrototypes.filter(p=> p.meta && p.meta.role==='stair');
    const nonStairs = tilePrototypes.filter(p=> !(p.meta && p.meta.role==='stair'));
    expect(stairs.length).toBeGreaterThan(0);
    for (const stair of stairs){
      const { axis, dir } = stair.meta;
      let face;
      if (axis==='z') face = dir===1 ? 'posZ' : 'negZ';
      else face = dir===1 ? 'posX' : 'negX';
      const candidates = nonStairs.filter(ns => middleRowEmpty(ns.voxels, face) && topCenterEmpty(ns.voxels, face));
      expect(candidates.length).toBeGreaterThan(0);
    }
  });
});
