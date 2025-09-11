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
    expect(tilePrototypes.length).toBe(13);
    expect(protoTileIds.length).toBe(13);
    expect(global.NDWFC3D.callCount()).toBe(13);
    expect(info.emptyWithFloorProtoIdx).toBeGreaterThanOrEqual(0);
    expect(info.solidProtoIdx).toBeGreaterThan(info.emptyWithFloorProtoIdx);
  });

  test('idempotent initializeTileset does not duplicate', () => {
    initializeTileset();
    expect(global.NDWFC3D.callCount()).toBe(13);
    initializeTileset();
    expect(tilePrototypes.length).toBe(13);
    expect(global.NDWFC3D.callCount()).toBe(13);
  });

  test('solid cube prototype voxels all 1s', () => {
    const { solidProtoIdx } = initializeTileset();
    const solid = tilePrototypes[solidProtoIdx];
    const flat = flattenVoxels(solid.voxels);
    expect(new Set(flat)).toEqual(new Set([1]));
  });

  test('stair-up tile contains voxel value 2 at expected coordinates', () => {
    initializeTileset();
    const stairUp = tilePrototypes[6];
    expect(stairUp.voxels[1][1][1]).toBe(2);
  });

  test('corridor tile has expected rotation transforms', () => {
    initializeTileset();
    const corridor = tilePrototypes[3];
    expect(corridor.transforms).toEqual(["ry","ry+ry","ry+ry+ry"]);
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
