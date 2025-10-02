import { initializeTileset, tilesetManifest, _resetTilesetForTests } from '../docs/dungeon/tileset.js';

function manifestHash(man){
  // Simple deterministic hash from concatenated signature + tileId + weight
  const str = man.map(m=>`${m.id}:${m.tileId}:${m.weight}:${m.signature}`).join('|');
  let h=0; for(let i=0;i<str.length;i++){ h = (h*131 + str.charCodeAt(i)) >>> 0; }
  return h;
}

describe('tileset ordering stability', () => {
  test('manifest hash remains stable for canonical TILE_DEFS', () => {
    _resetTilesetForTests();
    const ts = initializeTileset();
    const man = tilesetManifest(ts);
    // If TILE_DEFS changes shape/order intentionally, update expectedHash.
  const expectedHash = 729210526; // updated after fixing stair tile 202 connectivity bug
    expect(manifestHash(man)).toBe(expectedHash);
    // Additional sanity: ids are sequential starting at 0
    expect(man.every((m,i)=>m.id===i)).toBe(true);
  });
});
