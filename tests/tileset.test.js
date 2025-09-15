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
    // Updated tileset now has 11 prototypes after portal stair refactor
    expect(tilePrototypes.length).toBe(11);
    expect(protoTileIds.length).toBe(11);
    expect(global.NDWFC3D.callCount()).toBe(11);
    expect(info.emptyWithFloorProtoIdx).toBeGreaterThanOrEqual(0);
    expect(info.solidProtoIdx).toBeGreaterThan(info.emptyWithFloorProtoIdx);
  });

  test('idempotent initializeTileset does not duplicate', () => {
    initializeTileset();
    expect(global.NDWFC3D.callCount()).toBe(11);
    initializeTileset();
    expect(tilePrototypes.length).toBe(11);
    expect(global.NDWFC3D.callCount()).toBe(11);
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

  test('rejects incorrect layer count', () => {
    expect(() => createTileFormLayers([
      ["000","000","000"],
      ["000","000","000"]
    ], 0, { transforms: [] })).toThrow(/3 z-layers/);
  });

  test('rejects invalid voxel character', () => {
    expect(() => createTileFormLayers([
      ["000","000","000"],
      ["000","090","000"],
      ["000","000","000"]
    ], 0, { transforms: [] })).toThrow(/Invalid voxel char/);
  });
});
