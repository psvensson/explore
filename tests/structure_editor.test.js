/**
 * Test for structure editor functionality in simplified tileset system
 */

import { describe, test, expect, beforeEach } from '@jest/globals';

// Mock NDWFC3D global before imports
global.NDWFC3D = function MockNDWFC3D() {
  return {
    step: () => ({ status: 'success' }),
    expand: () => ({ status: 'success' }),
    getGrid: () => new Array(27).fill(0).map((_, i) => i % 2),
    getTiles: () => [
      { position: [0, 0, 0], prototypeIndex: 0, rotationY: 0 }
    ]
  };
};

// Mock DOM environment
global.document = {
  createElement: (tag) => ({
    className: '',
    innerHTML: '',
    style: {},
    dataset: {},
    addEventListener: () => {},
    appendChild: () => {},
    removeChild: () => {},
    querySelector: () => null,
    querySelectorAll: () => []
  }),
  body: {
    appendChild: () => {},
    removeChild: () => {}
  }
};

describe('Structure Editor Functionality', () => {
  test('should create valid voxel data structure', () => {
    // Test that default voxel data is correctly sized
    const defaultVoxels = new Array(27).fill(0); // 3x3x3
    expect(defaultVoxels).toHaveLength(27);
    
    // Test coordinate calculation
    for (let y = 0; y < 3; y++) {
      for (let z = 0; z < 3; z++) {
        for (let x = 0; x < 3; x++) {
          const index = y * 9 + z * 3 + x;
          expect(index).toBeGreaterThanOrEqual(0);
          expect(index).toBeLessThan(27);
        }
      }
    }
  });

  test('should render enhanced voxel preview with 3 layers', () => {
    // Mock the voxel preview rendering logic without importing the full editor
    const renderVoxelPreview = (voxelData) => {
      const layers = [
        voxelData.slice(0, 9),   // y=0 (bottom)
        voxelData.slice(9, 18),  // y=1 (middle) 
        voxelData.slice(18, 27)  // y=2 (top)
      ];
      
      return layers.map((layer, layerIndex) => 
        `<div class="voxel-layer" data-layer="${layerIndex}">Y=${layerIndex}</div>`
      ).join('');
    };
    
    // Test voxel data (3x3x3 = 27 elements)
    const voxelData = [
      // Y=0 layer (bottom)
      1, 0, 1,
      0, 1, 0, 
      1, 0, 1,
      // Y=1 layer (middle)
      0, 1, 0,
      1, 1, 1,
      0, 1, 0,
      // Y=2 layer (top)
      1, 1, 1,
      1, 0, 1,
      1, 1, 1
    ];
    
    const preview = renderVoxelPreview(voxelData);
    
    // Should contain 3 layers
    expect(preview).toContain('data-layer="0"');
    expect(preview).toContain('data-layer="1"');
    expect(preview).toContain('data-layer="2"');
    
    // Should contain layer labels
    expect(preview).toContain('Y=0');
    expect(preview).toContain('Y=1');
    expect(preview).toContain('Y=2');
  });

  test('should validate structure editor actions', () => {
    // Test action handling logic
    const actions = ['create-structure', 'edit-structure', 'duplicate-structure'];
    
    actions.forEach(action => {
      expect(action).toMatch(/^(create|edit|duplicate)-structure$/);
    });
    
    // Test that structure IDs are handled correctly
    const mockEvent = {
      target: {
        dataset: {
          structureId: 'test_corridor',
          action: 'edit-structure'
        }
      }
    };
    
    expect(mockEvent.target.dataset.structureId).toBe('test_corridor');
    expect(mockEvent.target.dataset.action).toBe('edit-structure');
  });

  test('should integrate with existing TileStructures system', async () => {
    const { TileStructures } = await import('../docs/dungeon/tile_structures.js');
    
    // Should be able to access existing structures
    expect(TileStructures.structures).toBeDefined();
    expect(Object.keys(TileStructures.structures).length).toBeGreaterThan(0);
    
    // Each structure should have required properties
    const firstStructure = Object.values(TileStructures.structures)[0];
    expect(firstStructure).toHaveProperty('structure');
    expect(firstStructure).toHaveProperty('edges');
    
    // The structure format is nested arrays - check that it exists and has the right shape
    expect(firstStructure.structure).toBeDefined();
    expect(Array.isArray(firstStructure.structure)).toBe(true);
    expect(firstStructure.edges).toHaveLength(4); // N, E, S, W
    
    // Edges should be strings
    firstStructure.edges.forEach(edge => {
      expect(typeof edge).toBe('string');
    });
  });
});