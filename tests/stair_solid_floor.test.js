describe('stair solid floor', () => {
  let initializeTileset, tilePrototypes, _resetTilesetForTests;
  beforeAll(async () => {
    global.NDWFC3D = function(){}; // stub
    const mod = await import('../docs/dungeon/tileset.js');
    ({ initializeTileset, tilePrototypes, _resetTilesetForTests } = mod);
  });
  beforeEach(() => {
    _resetTilesetForTests();
    global.NDWFC3D = function(){};
  });
  test('all stair prototypes have fully solid bottom layer (y=0 rows all 1s)', () => {
    initializeTileset();
    const stairs = tilePrototypes.filter(p => p.meta && p.meta.role==='stair');
    expect(stairs.length).toBeGreaterThan(0);
    for (const stair of stairs){
      for (let z=0; z<3; z++){
        for (let x=0; x<3; x++){
          expect(stair.voxels[z][0][x]).toBe(1);
        }
      }
    }
  });
});
