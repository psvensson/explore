/**
 * Verifies conversion of canonical built-in structure (numeric 3D arrays) into
 * the 2D mid-layer strings used by mini previews. This isolates the logic
 * without relying on DOM rendering of StructureEditor (which is browser-only
 * and conditionally bootstrapped).
 */

describe('Mini preview mid-layer derivation', () => {
  test('corridor_ns mid layer is 111 / 000 / 111', async () => {
    const [{ TileStructures }, { StructurePreviewUtil }] = await Promise.all([
      import('../docs/dungeon/tile_structures.js'),
      import('../docs/ui/utils/structure-preview-util.js')
    ]);
    const s = TileStructures.get('corridor_ns');
    expect(StructurePreviewUtil.getMiddleLayerRows(s)).toEqual(['111','000','111']);
  });

  test('corridor_nsew mid layer has corner pillars 101 / 000 / 101', async () => {
    const [{ TileStructures }, { StructurePreviewUtil }] = await Promise.all([
      import('../docs/dungeon/tile_structures.js'),
      import('../docs/ui/utils/structure-preview-util.js')
    ]);
    const s = TileStructures.get('corridor_nsew');
    expect(StructurePreviewUtil.getMiddleLayerRows(s)).toEqual(['101','000','101']);
  });
});
