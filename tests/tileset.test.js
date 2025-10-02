// Clean test file uses dynamic import after stubbing NDWFC3D and a manual spy.

describe('tileset', () => {
  let initializeTileset, createTileFormLayers, tilePrototypes, protoTileIds, _resetTilesetForTests;

  function flattenVoxels(v) { return v.flat(2); }

  beforeAll(async () => {
    global.NDWFC3D = function() {}; // stub before first import
  const mod = await import('../docs/dungeon/tileset.js');
    ({ initializeTileset, createTileFormLayers, tilePrototypes, protoTileIds, _resetTilesetForTests } = mod);
  });

  beforeEach(() => {
    _resetTilesetForTests();
    const calls = [];
    function spy(proto){ calls.push(proto); }
    spy.callCount = () => calls.length;
    global.NDWFC3D = spy;
  });

  test('initializes expected number of prototypes and registers each', () => {
    const info = initializeTileset();
    // Full tileset expanded to 17 prototypes including multi-level tiles.
    expect(tilePrototypes.length).toBe(17);
    expect(protoTileIds.length).toBe(17);
    expect(global.NDWFC3D.callCount()).toBe(17);
    expect(info.emptyWithFloorProtoIdx).toBeGreaterThanOrEqual(0);
    expect(info.solidProtoIdx).toBeGreaterThan(info.emptyWithFloorProtoIdx);
  });

  test('idempotent initializeTileset does not duplicate', () => {
    initializeTileset();
    expect(global.NDWFC3D.callCount()).toBe(17);
    initializeTileset();
    expect(tilePrototypes.length).toBe(17);
    expect(global.NDWFC3D.callCount()).toBe(17);
  });

  test('solid cube prototype voxels all 1s', () => {
    const { solidProtoIdx } = initializeTileset();
    const solid = tilePrototypes[solidProtoIdx];
    const flat = flattenVoxels(solid.voxels);
    expect(new Set(flat)).toEqual(new Set([1]));
  });

  test('at least one stair tile has a 2 in mid layer center', () => {
    initializeTileset();
    const stairIndices = tilePrototypes
      .map((p,i)=>({p,i}))
      .filter(o=> o.p.voxels.some(zLayer => zLayer[1].includes(2)));
    expect(stairIndices.length).toBeGreaterThan(0);
    const hasCenter = stairIndices.some(o=> o.p.voxels[1][1][1]===2);
    expect(hasCenter).toBe(true);
  });

  test('at least one rotated corridor tile exposes all ry transforms', () => {
    initializeTileset();
    const any = tilePrototypes.find(p=> Array.isArray(p.transforms) && p.transforms.length===3);
    expect(any).toBeTruthy();
    expect(any.transforms).toEqual(["ry","ry+ry","ry+ry+ry"]);
  });

  test('directional stair prototypes exist with expected connectivity openings', () => {
    initializeTileset();
    const stairs = tilePrototypes.filter(p => p.meta && p.meta.role === 'stair');
    expect(stairs.length).toBe(2); // 2 base stairs: lower (+Z) and upper (-Z), transforms handle rotations
    
    // Check that stairs have the expected openings for connectivity
    function hasConnectivityOpening(proto){
      const v = proto.voxels;
      // Stairs should have opening at their FORWARD face (landing direction) for connectivity
      // For +Z stair (dir=1): forward is z=2, should be open at v[2][1][1]
      // For -Z stair (dir=-1): forward is z=0, should be open at v[0][1][1]
      const dir = proto.meta.dir;
      if (dir === 1) {
        return v[2][1][1] === 0; // +Z stair: back row (forward direction)
      } else {
        return v[0][1][1] === 0; // -Z stair: front row (forward direction)
      }
    }
    
    for (const stair of stairs){
      const { axis, dir, stairRole } = stair.meta;
      expect(axis).toBe('z'); // Both our stairs are Z-axis
      expect(hasConnectivityOpening(stair)).toBe(true);
      
      if (stairRole === 'lower') {
        expect(dir).toBe(1);
        // Lower stair should have open ceiling for vertical connection
        expect(stair.voxels[1][2][1]).toBe(0); // center top should be open
      } else if (stairRole === 'upper') {
        expect(dir).toBe(-1);
        // Upper stair should have open floor for vertical connection  
        expect(stair.voxels[1][0][1]).toBe(0); // center bottom should be open
      }
    }
  });

  test('rejects incorrect layer count', () => {
    expect(() => createTileFormLayers([
      ["000","000","000"],
      ["000","000","000"]
    ], 0, { transforms: [] })).toThrow(/Expected 3 layers/);
  });

  test('rejects invalid voxel character', () => {
    expect(() => createTileFormLayers([
      ["000","000","000"],
      ["000","090","000"],
      ["000","000","000"]
    ], 0, { transforms: [] })).toThrow(/Invalid voxel char/);
  });
});
