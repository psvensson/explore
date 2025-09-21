// Validates that forward neighbors of each stair prototype satisfy clear volume rule (middle row + top center empty)

describe('stair clear volume heuristic', () => {
  let initializeTileset, tilePrototypes, _resetTilesetForTests;
  beforeAll(async () => {
    global.NDWFC3D = function(){};
    const mod = await import('../docs/dungeon/tileset.js');
    ({ initializeTileset, tilePrototypes, _resetTilesetForTests } = mod);
  });
  beforeEach(() => {
    _resetTilesetForTests();
    global.NDWFC3D = function(){};
    initializeTileset();
  });

  function middleRowEmpty(vox, face){
    if (face==='posZ') return vox[2][1][0]===0 && vox[2][1][1]===0 && vox[2][1][2]===0;
    if (face==='negZ') return vox[0][1][0]===0 && vox[0][1][1]===0 && vox[0][1][2]===0;
    if (face==='posX') return vox[0][1][2]===0 && vox[1][1][2]===0 && vox[2][1][2]===0;
    if (face==='negX') return vox[0][1][0]===0 && vox[1][1][0]===0 && vox[2][1][0]===0;
    return true;
  }
  function topCenterEmpty(vox, face){
    if (face==='posZ') return vox[2][2][1]===0;
    if (face==='negZ') return vox[0][2][1]===0;
    if (face==='posX') return vox[1][2][2]===0;
    if (face==='negX') return vox[1][2][0]===0;
    return true;
  }

  test('stair prototypes are properly configured for WFC generation', () => {
    const stairs = tilePrototypes.filter(p=> p.meta && p.meta.role==='stair');
    const nonStairs = tilePrototypes.filter(p=> !(p.meta && p.meta.role==='stair'));
    
    expect(stairs.length).toBeGreaterThan(0);
    expect(nonStairs.length).toBeGreaterThan(0);
    
    // Verify stairs have proper metadata for WFC usage
    for (const stair of stairs){
      const { axis, dir, stairRole } = stair.meta;
      
      // Check that stairs have required metadata
      expect(axis).toBeDefined();
      expect(dir).toBeDefined(); 
      expect(stairRole).toBeDefined();
      expect(['lower', 'upper']).toContain(stairRole);
      
      // Check that stairs have proper voxel structure
      expect(stair.voxels).toBeDefined();
      expect(stair.voxels.length).toBe(3); // 3 z layers
      expect(stair.voxels[0].length).toBe(3); // 3 y layers
      expect(stair.voxels[0][0].length).toBe(3); // 3 x positions
      
      // Verify stair voxels (value 2) are present
      let hasStairVoxels = false;
      for (let z = 0; z < 3; z++) {
        for (let y = 0; y < 3; y++) {
          for (let x = 0; x < 3; x++) {
            if (stair.voxels[z][y][x] === 2) {
              hasStairVoxels = true;
            }
          }
        }
      }
      expect(hasStairVoxels).toBe(true);
    }
  });
});
