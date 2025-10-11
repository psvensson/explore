import { StructurePreviewUtil } from '../docs/ui/utils/structure-preview-util.js';
import { TileStructures } from '../docs/dungeon/tile_structures.js';

describe('StructurePreviewUtil', () => {
  test('derives middle layer rows from canonical numeric structure', () => {
    const s = TileStructures.get('corridor_ns');
    const rows = StructurePreviewUtil.getMiddleLayerRows(s);
    expect(rows).toEqual(['111','000','111']);
  });

  test('renderMini returns expected html markers', () => {
    const s = TileStructures.get('corridor_nsew');
    const html = StructurePreviewUtil.renderMini(s);
    expect(html).toContain('mini-preview');
    expect(html).toContain('data-source="structure"');
  });
});
