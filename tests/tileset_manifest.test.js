import { initializeTileset, tilesetManifest, _resetTilesetForTests } from '../docs/dungeon/tileset.js';

describe('tilesetManifest()', () => {
  beforeEach(()=>{ _resetTilesetForTests(); });
  test('returns array with expected fields and matches prototype count', () => {
    const ts = initializeTileset();
    const man = tilesetManifest();
    expect(Array.isArray(man)).toBe(true);
    expect(man.length).toBe(ts.tilePrototypes.length);
    const sample = man[0];
    expect(sample).toHaveProperty('id');
    expect(sample).toHaveProperty('tileId');
    expect(sample).toHaveProperty('weight');
    expect(sample).toHaveProperty('signature');
    // Signatures must be deterministic strings
    man.forEach(m=>{
      expect(typeof m.signature).toBe('string');
      expect(m.signature.length).toBeGreaterThan(0);
    });
  });
});
