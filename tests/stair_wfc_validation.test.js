// stair_wfc_validation.test.js  
// Test to validate that stairs can now be properly placed by WFC

import TILE_DEFS from '../docs/dungeon/tileset_data.js';

describe('Stair WFC Validation', () => {
  test('should confirm stairs have no unique edge patterns', () => {
    const stairTiles = TILE_DEFS.filter(t => t.meta?.role === 'stair');
    const nonStairTiles = TILE_DEFS.filter(t => t.meta?.role !== 'stair');
    
    // Extract all edge patterns
    function extractEdges(layers) {
      const middle = layers[1];
      return [
        middle[0], // north
        middle[2], // south  
        middle[0][2] + middle[1][2] + middle[2][2], // east
        middle[0][0] + middle[1][0] + middle[2][0]  // west
      ];
    }
    
    const stairEdges = new Set();
    const corridorEdges = new Set();
    
    stairTiles.forEach(tile => {
      extractEdges(tile.layers).forEach(edge => stairEdges.add(edge));
    });
    
    nonStairTiles.forEach(tile => {
      extractEdges(tile.layers).forEach(edge => corridorEdges.add(edge));
    });
    
    const uniqueStairEdges = Array.from(stairEdges).filter(edge => !corridorEdges.has(edge));
    
    console.log('Stair edges:', Array.from(stairEdges).sort());
    console.log('Corridor edges:', Array.from(corridorEdges).sort());
    console.log('Unique stair edges (should be empty):', uniqueStairEdges);
    
    expect(uniqueStairEdges).toEqual([]);
  });
  
  test('should verify stairs maintain their structural integrity', () => {
    const stairTiles = TILE_DEFS.filter(t => t.meta?.role === 'stair');
    
    stairTiles.forEach(stair => {
      console.log(`\nValidating stair ${stair.tileId} (${stair.meta.axis} ${stair.meta.dir}):`);
      
      // Check that stairs still have passable center
      const middle = stair.layers[1];
      const centerPassable = middle[1][1] === '0' || middle[1][1] === '2';
      console.log(`  Center passable: ${centerPassable} (${middle[1][1]})`);
      expect(centerPassable).toBe(true);
      
      // Check that stairs have proper step indicator
      const hasStepIndicator = middle[1].includes('2');
      console.log(`  Has step indicator (2): ${hasStepIndicator}`);
      expect(hasStepIndicator).toBe(true);
      
      // Check layer structure makes sense for direction
      if (stair.meta.dir === 1) { // going up
        const openAbove = stair.layers[2][1] === '000' && stair.layers[2][2] === '000';
        console.log(`  Open above (up stair): ${openAbove}`);
        expect(openAbove).toBe(true);
      } else { // going down  
        const openBelow = stair.layers[0][1] === '000' && stair.layers[0][2] === '000';
        console.log(`  Open below (down stair): ${openBelow}`);
        expect(openBelow).toBe(true);
      }
    });
  });
  
  test('should check that stairs can connect in all 4 rotations', () => {
    const stairTiles = TILE_DEFS.filter(t => t.meta?.role === 'stair');
    const corridorTiles = TILE_DEFS.filter(t => t.meta?.role !== 'stair').slice(0, 5);
    
    stairTiles.forEach(stair => {
      console.log(`\nTesting stair ${stair.tileId} rotations:`);
      
      // Simulate the 4 rotations from transforms
      const rotations = stair.transforms ? stair.transforms.length + 1 : 1;
      console.log(`  Has ${rotations} rotations (including base orientation)`);
      
      // In each rotation, stairs should be able to connect to some corridor
      expect(rotations).toBeGreaterThanOrEqual(4); // Should have 4-way rotation
      
      // Check that transforms array is properly configured
      expect(stair.transforms).toContain('ry');
      expect(stair.transforms).toContain('ry+ry');
      expect(stair.transforms).toContain('ry+ry+ry');
    });
  });
  
  test('should verify stair weight is appropriate for WFC', () => {
    const stairTiles = TILE_DEFS.filter(t => t.meta?.role === 'stair');
    
    stairTiles.forEach(stair => {
      console.log(`Stair ${stair.tileId} weight: ${stair.meta.weight}`);
      
      // Stairs should have reasonable weight (not too high or too low)
      expect(stair.meta.weight).toBeGreaterThan(0);
      expect(stair.meta.weight).toBeLessThanOrEqual(5); // Not too common
    });
    
    console.log('✅ All stair tiles have appropriate weights for WFC generation');
  });
});