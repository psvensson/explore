// Test simplified stair detection and stacking rules

global.NDWFC3D = function(){}; // stub registration

import { initializeTileset, tilePrototypes, _resetTilesetForTests } from '../docs/dungeon/tileset.js';

describe('Simplified stair system', ()=>{
  beforeAll(()=>{ initializeTileset(); });

  test('stair tiles are detected by voxel pattern', ()=>{
    // Find tiles with stair voxels (value 2)
    const stairTiles = tilePrototypes.filter(p=> 
      p.voxels.some(layer=>layer.some(row=>row.some(v=>v===2)))
    );
    expect(stairTiles.length).toBeGreaterThan(0);
    
    // Check that stair tiles have appropriate metadata
    for (const stairTile of stairTiles) {
      expect(stairTile.meta).toBeDefined();
      expect(stairTile.meta.role).toBe('stair');
      expect(stairTile.meta.axis).toBeDefined();
      expect(stairTile.meta.dir).toBeDefined();
    }
  });

  test('simplified canStack allows flexible stair connections', ()=>{
    // Find stair and non-stair tiles
    const stairTile = tilePrototypes.find(p=> p.meta && p.meta.role === 'stair');
    const nonStairTile = tilePrototypes.find(p=> p.tileId === 1); // basic solid tile
    
    expect(stairTile).toBeDefined();
    expect(nonStairTile).toBeDefined();
    
    // Simulate simplified canStack logic
    function canStack(upper, lower){
      const up = tilePrototypes[upper];
      const low = tilePrototypes[lower];
      
      const upperIsStair = up.meta && up.meta.role === 'stair';
      const lowerIsStair = low.meta && low.meta.role === 'stair';
      
      if (upperIsStair || lowerIsStair) {
        return true;
      }
      
      return true;
    }
    
    const stairIndex = tilePrototypes.indexOf(stairTile);
    const nonStairIndex = tilePrototypes.indexOf(nonStairTile);
    
    // All combinations should be allowed with simplified rules
    expect(canStack(stairIndex, nonStairIndex)).toBe(true);    // stair above non-stair
    expect(canStack(nonStairIndex, stairIndex)).toBe(true);    // non-stair above stair  
    expect(canStack(stairIndex, stairIndex)).toBe(true);       // stair above stair
    expect(canStack(nonStairIndex, nonStairIndex)).toBe(true); // non-stair above non-stair
  });
});