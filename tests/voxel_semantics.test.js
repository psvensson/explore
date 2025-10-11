import { VOXEL, getVoxelMeaning } from '../docs/utils/voxel_constants.js';
import { normalizeToCanonical } from '../docs/utils/voxel_normalize.js';

// Minimal mock THREE for mesh path if needed (kept lightweight)
const MockTHREE = {
  Group: class { constructor(){ this.children=[]; } add(o){ this.children.push(o);} },
  Mesh: class { constructor(geom, mat){ this.geometry=geom; this.material=mat; this.position={x:0,y:0,z:0,set(x,y,z){ this.x=x; this.y=y; this.z=z; }};} },
  BoxGeometry: class { constructor(){} }
};

describe('Voxel semantics single source of truth', () => {
  test('VOXEL constants match documented meanings', () => {
    expect(VOXEL.EMPTY).toBe(0);
    expect(VOXEL.SOLID).toBe(1);
    expect(VOXEL.STAIR).toBe(2);
    expect(getVoxelMeaning(VOXEL.EMPTY)).toBe('empty');
    expect(getVoxelMeaning(VOXEL.SOLID)).toBe('solid');
    expect(getVoxelMeaning(VOXEL.STAIR)).toBe('stair');
  });

  test('Corridor pattern (east-west) has open center row with walls north/south', async () => {
    const corridorEW = [
      ['111','000','111'], // middle layer (y=1) after stripping floor/ceiling in editor preview
    ];
    // Expand to canonical by adding floor/ceiling implicitly using normalization helper on 3-layer string form
    const threeLayer = [ ['111','111','111'], ['111','000','111'], ['111','111','111'] ];
    const vox = normalizeToCanonical(threeLayer); // vox[z][y][x]

    // Assert center row (z=1) is empty path across x; outer rows are solid walls at x positions
    expect(vox[1][1].join('')).toBe('000'); // z=1 row across x
    expect(vox[0][1].join('')).toBe('111'); // z=0 row walls
    expect(vox[2][1].join('')).toBe('111'); // z=2 row walls
  });
});
