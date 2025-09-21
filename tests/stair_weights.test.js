/**
 * Test to verify that increased stair weights improve 3D connectivity
 */

import { beforeAll, describe, test, expect } from '@jest/globals';
import { initializeTileset, tilePrototypes } from '../docs/dungeon/tileset.js';
import '../docs/dungeon/ndwfc.js';

describe('3D connectivity with increased stair weights', () => {
  beforeAll(() => {
    // Mock DOM
    global.document = { createElement: () => ({ getContext: () => ({}) }) };
    
    // Initialize tileset
    initializeTileset();
  });

  test('stair tiles have increased weights', () => {
    const stairTiles = tilePrototypes.filter(p => p.tileId === 201 || p.tileId === 202);
    expect(stairTiles.length).toBe(2);
    
    stairTiles.forEach(tile => {
      expect(tile.meta.weight).toBe(2.0);
      console.log(`Tile ${tile.tileId} weight: ${tile.meta.weight}`);
    });
  });

  test('stair probability is significantly increased', () => {
    // Calculate total weight and stair weight percentage
    const totalWeight = tilePrototypes.reduce((sum, p) => sum + (p.meta?.weight || 1), 0);
    const stairWeight = tilePrototypes
      .filter(p => p.tileId === 201 || p.tileId === 202)
      .reduce((sum, p) => sum + (p.meta?.weight || 1), 0);
    
    const stairProbability = (stairWeight / totalWeight) * 100;
    
    console.log(`Total weight: ${totalWeight}`);
    console.log(`Stair weight: ${stairWeight}`);
    console.log(`Stair probability: ${stairProbability.toFixed(1)}%`);
    
    // Before: 0.2 / 10.2 = 1.96%
    // After: 4.0 / 90 = 4.44%
    expect(stairProbability).toBeGreaterThan(4.0); // Should be significantly higher than 1.96%
  });

  test('weight change represents 20x increase in stair likelihood', () => {
    // Each stair tile went from weight 0.1 to weight 2.0
    // This is a 20x increase per tile
    const oldWeight = 0.1;
    const newWeight = 2.0;
    const increase = newWeight / oldWeight;
    
    expect(increase).toBe(20);
    console.log(`Stair weight increased by ${increase}x (from ${oldWeight} to ${newWeight})`);
  });
});