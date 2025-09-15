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
    // Updated tileset now has 10 prototypes after normalization
    expect(tilePrototypes.length).toBe(10);
    expect(protoTileIds.length).toBe(10);
    expect(global.NDWFC3D.callCount()).toBe(10);
    expect(info.emptyWithFloorProtoIdx).toBeGreaterThanOrEqual(0);
    expect(info.solidProtoIdx).toBeGreaterThan(info.emptyWithFloorProtoIdx);
  });

  test('idempotent initializeTileset does not duplicate', () => {
    initializeTileset();
    expect(global.NDWFC3D.callCount()).toBe(10);
    initializeTileset();
    expect(tilePrototypes.length).toBe(10);
    expect(global.NDWFC3D.callCount()).toBe(10);
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

  test('only portal tiles have holes in floor or ceiling', () => {
    initializeTileset();
    function layerHasHoleRow(voxels, yRow) {
      for (let z=0; z<3; z++) {
        for (let x=0; x<3; x++) {
          if (voxels[z][yRow][x] === 0) return true; // hole (absence) in that full row position
        }
      }
      return false;
    }
    const portalIds = new Set([31,32]);
    for (const proto of tilePrototypes) {
      const hasFloorHole = layerHasHoleRow(proto.voxels,0) && proto.voxels.some(zLayer=>zLayer[0].some(v=>v===0));
      const hasCeilingHole = layerHasHoleRow(proto.voxels,2) && proto.voxels.some(zLayer=>zLayer[2].some(v=>v===0));
      if (hasFloorHole || hasCeilingHole) {
        expect(portalIds.has(proto.tileId)).toBe(true);
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
