import { generateWFCDungeon } from '../docs/renderer/wfc_generate.js';
import { initializeTileset, tilePrototypes, _resetTilesetForTests } from '../docs/dungeon/tileset.js';

// Mock NDWFC3D - we'll use the embedded WFC from the generator itself
// by passing undefined and letting generateWFCDungeon use its fallback
global.NDWFC3D = undefined;

describe('WFC Generation Completion', () => {
  beforeEach(() => {
    _resetTilesetForTests();
    initializeTileset();
  });

  test('3x3x3 generation completes successfully within reasonable time', async () => {
    const startTime = Date.now();
    
    const result = await generateWFCDungeon({
      NDWFC3D: undefined, // Use embedded fallback
      tileset: { prototypes: tilePrototypes },
      dims: { x: 3, y: 3, z: 3 },
      rng: () => Math.random(),
      yieldEvery: 500, // Back to normal
      maxSteps: 50000,
      stallTimeoutMs: 15000, // 15 second timeout
      debug: true // Enable debugging to see step counts
    });
    
    const duration = Date.now() - startTime;
    
    // Verify generation completed successfully
    expect(result).toBeDefined();
    expect(result.grid).toBeDefined();
    expect(result.grid3D).toBeDefined();
    expect(result.tiles).toBeDefined();
    
    // Verify grid dimensions
    expect(result.grid.length).toBe(27); // 3x3x3 = 27 cells
    expect(result.grid3D.length).toBe(3); // 3 Z layers
    expect(result.grid3D[0].length).toBe(3); // 3 Y rows
    expect(result.grid3D[0][0].length).toBe(3); // 3 X cols
    
    // Verify tiles array
    expect(result.tiles.length).toBe(27);
    expect(result.tiles[0]).toHaveProperty('prototypeIndex');
    expect(result.tiles[0]).toHaveProperty('position');
    expect(result.tiles[0]).toHaveProperty('rotationY');
    
    // Performance check: should complete within reasonable time
    expect(duration).toBeLessThan(15000); // Less than 15 seconds
    
    console.log(`3x3x3 generation completed in ${duration}ms`);
  }, 20000); // 20 second Jest timeout

  test('4x3x4 generation completes successfully', async () => {
    const startTime = Date.now();
    
    const result = await generateWFCDungeon({
      NDWFC3D: undefined, // Use embedded fallback
      tileset: { prototypes: tilePrototypes },
      dims: { x: 4, y: 3, z: 4 },
      rng: () => Math.random(),
      yieldEvery: 100,
      maxSteps: 40000,     // Reasonable step limit 
      stallTimeoutMs: 15000, // 15 second timeout
      debug: false
    });
    
    const duration = Date.now() - startTime;
    
    // Verify generation completed successfully
    expect(result).toBeDefined();
    expect(result.grid.length).toBe(48); // 4x3x4 = 48 cells
    expect(result.tiles.length).toBe(48);
    
    // Performance check
    expect(duration).toBeLessThan(18000); // Less than 18 seconds
    
    console.log(`4x3x4 generation completed in ${duration}ms`);
  }, 20000); // 20 second Jest timeout

  test('generation with abort signal works', async () => {
    const controller = new AbortController();
    
    // Start generation but abort after 100ms
    setTimeout(() => controller.abort(), 100);
    
    await expect(generateWFCDungeon({
      NDWFC3D: undefined, // Use embedded fallback
      tileset: { prototypes: tilePrototypes },
      dims: { x: 10, y: 3, z: 10 }, // Larger grid more likely to take time
      rng: () => Math.random(),
      signal: controller.signal,
      yieldEvery: 50,
      maxSteps: 50000,
      debug: false
    })).rejects.toThrow('WFC collapse aborted');
  });
});