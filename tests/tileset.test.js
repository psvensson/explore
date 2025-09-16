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
    // After adding directional stair variants plus open landing tile we now expect 13 prototypes.
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

  test('directional stair prototypes exist with expected forward-face openness', () => {
    initializeTileset();
    const stairs = tilePrototypes.filter(p => p.meta && p.meta.role === 'stair');
    expect(stairs.length).toBe(4); // +Z, -Z, +X, -X
    function middleFaceOpen(proto, face){
      const v = proto.voxels;
      if (face==='posZ') return v[2][1][1] === 0;
      if (face==='negZ') return v[0][1][1] === 0;
      if (face==='posX') return v[1][1][2] === 0;
      if (face==='negX') return v[1][1][0] === 0;
      return true;
    }
    for (const stair of stairs){
      const { axis, dir } = stair.meta;
      if (axis==='z'){
        if (dir===1){
          // forward +Z => neighbor face is -Z of neighbor, so stair's +Z face should be mostly open at mid boundary (its own far layer should have empties)
          expect(middleFaceOpen(stair, 'posZ')).toBe(true);
        } else {
          expect(middleFaceOpen(stair, 'negZ')).toBe(true);
        }
      } else if (axis==='x') {
        if (dir===1){
          expect(middleFaceOpen(stair, 'posX')).toBe(true);
        } else {
          expect(middleFaceOpen(stair, 'negX')).toBe(true);
        }
      }
    }
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
