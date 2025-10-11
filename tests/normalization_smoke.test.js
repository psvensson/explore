/**
 * normalization_smoke.test.js
 * Smoke tests for the newly introduced voxel normalization layer.
 */

import { normalizeToCanonical } from '../docs/utils/voxel_normalize.js';
import { VOXEL, LAYERS } from '../docs/utils/voxel_constants.js';

function shapeSignature(vox){
  return vox.map(zLayer => zLayer.map(yLayer => yLayer.join('')).join('|')).join(' / ');
}

describe('Voxel Normalization (Smoke)', () => {
  test('2D pattern converts to canonical with solid floor & ceiling', () => {
    // 2D floorplan (mid layer): corridor east-west (walls left/right)
    const pattern = [
      [0,1,0],
      [0,1,0],
      [0,1,0]
    ];
    const vox = normalizeToCanonical(pattern);
    expect(vox.length).toBe(3);
    // Floor layer should be solid
    for (let z=0; z<3; z++) for (let x=0; x<3; x++) expect(vox[z][LAYERS.FLOOR][x]).toBe(VOXEL.SOLID);
    // Mid layer should mirror pattern semantics (0 empty, 1 solid)
    for (let z=0; z<3; z++) for (let x=0; x<3; x++) expect(vox[z][LAYERS.MID][x]).toBe(pattern[z][x]);
    // Ceiling solid
    for (let z=0; z<3; z++) for (let x=0; x<3; x++) expect(vox[z][LAYERS.CEILING][x]).toBe(VOXEL.SOLID);
  });

  test('three-layer string form converts to numeric voxels', () => {
    const layers = [
      ['111','111','111'],
      ['010','010','010'],
      ['111','111','111']
    ];
    const vox = normalizeToCanonical(layers);
    expect(vox[0][0][0]).toBe(1); // z=0,y=0,x=0
    expect(vox[1][1][1]).toBe(1); // z=1,y=1,x=1 (central pillar)
  });

  test('canonical input returns deep clone (mutation-safe)', () => {
    const original = [
      [ // z=0
        [1,1,1], // y=0
        [0,0,0], // y=1
        [1,1,1]  // y=2
      ],
      [ // z=1
        [1,1,1],
        [0,2,0],
        [1,1,1]
      ],
      [ // z=2
        [1,1,1],
        [0,0,0],
        [1,1,1]
      ]
    ];
    const clone = normalizeToCanonical(original);
    expect(clone).not.toBe(original);
    clone[1][1][1] = 0;
    expect(original[1][1][1]).toBe(2); // original unchanged
  });
});
