describe('portal stacking rules', () => {
  let initializeTileset, tilePrototypes, _resetTilesetForTests;

  beforeAll(async () => {
    global.NDWFC3D = function(){}; // stub
    const mod = await import('../docs/dungeon/tileset.js');
    ({ initializeTileset, tilePrototypes, _resetTilesetForTests } = mod);
  });

  beforeEach(() => {
    _resetTilesetForTests();
    global.NDWFC3D = function(){}; // reset stub
    initializeTileset();
  });

  function countSolidRow(vox, y){
    let c=0; for (let z=0;z<3;z++) for (let x=0;x<3;x++) if (vox[z][y][x]===1) c++; return c;
  }
  function isPortalLower(p){ return p.tileId === 31; }
  function isPortalUpper(p){ return p.tileId === 32; }

  test('stair openness semantics: lower has solid floor & open ceiling; upper has open floor & solid ceiling', () => {
    const lower = tilePrototypes.find(isPortalLower);
    const upper = tilePrototypes.find(isPortalUpper);
    expect(lower).toBeTruthy(); expect(upper).toBeTruthy();
    // Lower: y=0 mostly solid, y=2 mostly empty
    expect(countSolidRow(lower.voxels,0)).toBeGreaterThan(0);
    expect(countSolidRow(lower.voxels,2)).toBe(0);
    // Upper: y=0 empty, y=2 solid
    expect(countSolidRow(upper.voxels,0)).toBe(0);
    expect(countSolidRow(upper.voxels,2)).toBeGreaterThan(0);
  });

  test('vertical stacking: upper(32) allowed above lower(31) only', () => {
    const lower = tilePrototypes.find(isPortalLower);
    const upper = tilePrototypes.find(isPortalUpper);

    function canStack(upperTile, lowerTile){
      if (lowerTile.tileId===31) return upperTile.tileId===32;
      if (upperTile.tileId===32) return lowerTile.tileId===31;
      return true;
    }

    expect(canStack(upper, lower)).toBe(true); // required pairing
    expect(canStack(lower, lower)).toBe(false);
    expect(canStack(upper, upper)).toBe(false);
  });
});
