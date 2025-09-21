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
  test('stair prototypes have appropriate floor design for vertical connectivity', () => {
    initializeTileset();
    const stairs = tilePrototypes.filter(p => p.meta && p.meta.role==='stair');
    expect(stairs.length).toBeGreaterThan(0);
    
    for (const stair of stairs){
      const { stairRole } = stair.meta;
      
      if (stairRole === 'lower') {
        // Lower stairs should have solid bottom layer (they're the foundation)
        for (let z=0; z<3; z++){
          for (let x=0; x<3; x++){
            expect(stair.voxels[z][0][x]).toBe(1);
          }
        }
      } else if (stairRole === 'upper') {
        // Upper stairs can have openings in bottom layer for vertical connectivity
        // Just check that the structure is reasonable (not all empty)
        let solidCount = 0;
        for (let z=0; z<3; z++){
          for (let x=0; x<3; x++){
            if (stair.voxels[z][0][x] === 1) solidCount++;
          }
        }
        expect(solidCount).toBeGreaterThan(0); // Some solid structure should exist
      }
    }
  });
});
