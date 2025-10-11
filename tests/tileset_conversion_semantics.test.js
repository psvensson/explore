import { SIMPLIFIED_TILESETS, convertTilesetForWFC } from '../docs/dungeon/simplified_tilesets.js';

describe('Tileset conversion respects centralized voxel semantics', () => {
  test('corridor_ns conversion yields walls north/south and open middle row', () => {
    const tileset = SIMPLIFIED_TILESETS['minimal_test'];
    expect(tileset).toBeTruthy();
    const wfc = convertTilesetForWFC(tileset);
    // Find first prototype whose sourceStructure is corridor_ns
    const proto = wfc.prototypes.find(p => p.meta?.sourceStructure === 'corridor_ns');
    expect(proto).toBeTruthy();
    const middle = proto.voxels[1]; // y=1 layer rows (z order)
    // Expect row strings walls (111) then open (000) then walls (111)
    expect(middle[0]).toBe('111');
    expect(middle[1]).toBe('000');
    expect(middle[2]).toBe('111');
  });
});