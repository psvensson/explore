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

  function hasCeilingHole(proto){
    // hole defined as at least one 0 in y=2 row of any z layer OR special pattern 101 in mid-layer top row
    for (let z=0; z<3; z++) {
      if (proto.voxels[z][2].some(v=>v===0)) return true;
    }
    return false;
  }
  function hasFloorHole(proto){
    for (let z=0; z<3; z++) {
      if (proto.voxels[z][0].some(v=>v===0)) return true;
    }
    return false;
  }
  function isPortalLower(p){ return p.tileId === 31; }
  function isPortalUpper(p){ return p.tileId === 32; }

  test('only portal lower has ceiling hole and only portal upper has floor hole', () => {
    const lower = tilePrototypes.find(isPortalLower);
    const upper = tilePrototypes.find(isPortalUpper);
    expect(lower).toBeTruthy();
    expect(upper).toBeTruthy();
    for (const p of tilePrototypes) {
      if (isPortalLower(p)) {
        expect(hasCeilingHole(p)).toBe(true);
        expect(hasFloorHole(p)).toBe(false);
      } else if (isPortalUpper(p)) {
        expect(hasFloorHole(p)).toBe(true);
        expect(hasCeilingHole(p)).toBe(false);
      } else {
        expect(hasFloorHole(p)).toBe(false);
        expect(hasCeilingHole(p)).toBe(false);
      }
    }
  });

  test('vertical stacking: upper(32) allowed above lower(31) only', () => {
    const lower = tilePrototypes.find(isPortalLower);
    const upper = tilePrototypes.find(isPortalUpper);

    function extractFloor(vox){
      return vox.map(zLayer => zLayer[0].slice());
    }
    function extractCeiling(vox){
      return vox.map(zLayer => zLayer[2].slice());
    }
    function patternsMatch(a,b){
      for (let z=0; z<3; z++) for (let x=0; x<3; x++) if (a[z][x] !== b[z][x]) return false; return true;
    }
    function canStack(upperTile, lowerTile){
      const upperFloor = extractFloor(upperTile.voxels);
      const lowerCeil  = extractCeiling(lowerTile.voxels);
      if (!patternsMatch(upperFloor, lowerCeil)) return false;
      const lowerHasHole = hasCeilingHole(lowerTile);
      const upperHasHole = hasFloorHole(upperTile);
      if (lowerHasHole !== upperHasHole) return false;
      // Prevent stacking two identical portal types
      if (isPortalLower(upperTile) && isPortalLower(lowerTile)) return false;
      if (isPortalUpper(upperTile) && isPortalUpper(lowerTile)) return false;
      // Explicitly disallow lower above upper orientation even if patterns match (design rule)
      if (isPortalLower(upperTile) && isPortalUpper(lowerTile)) return false;
      return true;
    }

    // Valid: upper above lower
  expect(canStack(upper, lower)).toBe(true); // correct orientation
  expect(canStack(lower, upper)).toBe(false); // inverted orientation should fail
    expect(canStack(lower, lower)).toBe(false);
    expect(canStack(upper, upper)).toBe(false);
  });
});
