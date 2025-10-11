import { TileStructures } from '../docs/dungeon/tile_structures.js';
import { StructurePreviewUtil } from '../docs/ui/utils/structure-preview-util.js';

describe('Structure preview correctness', () => {
  test('corridor_ns mid layer differs from multi_level_open_up and matches expected pattern', () => {
    const corridor = TileStructures.getWithLegacyLayers('corridor_ns');
    const multi = TileStructures.getWithLegacyLayers('multi_level_open_up');
    // corridor_ns mid layer should be walls north/south and open center row
    expect(corridor.layers[1]).toEqual(['111','000','111']);
    // multi_level_open_up mid layer is fully empty
    expect(multi.layers[1]).toEqual(['000','000','000']);
    // Ensure they are not the same
    expect(corridor.layers[1]).not.toEqual(multi.layers[1]);
  });
});
