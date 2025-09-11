// Integration test: ensure a small 3D WFC using the defined tileset collapses without hanging.

describe('wfc integration with tileset', () => {
  let initializeTileset, tilePrototypes, _resetTilesetForTests, WFC;

  beforeAll(async () => {
    // Stub NDWFC3D before importing tileset so registration succeeds.
    global.NDWFC3D = function(proto) {
      // Collect prototypes – tileset module pushes to exported arrays itself.
    };
    const tilesetMod = await import('../docs/dungeon/tileset.js');
    ({ initializeTileset, tilePrototypes, _resetTilesetForTests } = tilesetMod);
    // Import WFC algorithm (CommonJS default export interop)
  WFC = (await import('../docs/dungeon/ndwfc.js')).default;
  });

  beforeEach(() => {
    _resetTilesetForTests();
    // Fresh stub each test
    global.NDWFC3D = function(proto) {};
  });

  test('collapses 2x2x2 domain successfully', () => {
    initializeTileset();
    const n = tilePrototypes.length;
    expect(n).toBeGreaterThan(0);
    // All weights equal (uniform distribution)
    const weights = new Array(n).fill(1);
    // Allow all adjacencies along all axes (permissive rules guarantee solvability)
    const rules = [];
    for (let a = 0; a < n; a++) {
      for (let b = 0; b < n; b++) {
        rules.push(['x', a, b]);
        rules.push(['y', a, b]);
        rules.push(['z', a, b]);
      }
    }
    const wfc = new WFC({ nd: 3, weights, rules });
    // Expand to 2x2x2 grid
    wfc.expand([0,0,0],[2,2,2]);
    let finished = false;
    for (let i = 0; i < 500; i++) {
      if (wfc.step()) { finished = true; break; }
    }
    expect(finished).toBe(true);
  });
});
