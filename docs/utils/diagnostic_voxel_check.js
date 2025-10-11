// diagnostic_voxel_check.js
// Diagnostic tool to verify voxel→mesh generation is correct

import { VOXEL } from '../utils/voxel_constants.js';
import { DEFAULT_TILE_STRUCTURES } from '../dungeon/defaults/default_tile_structures.js';

/**
 * Analyze a tile structure and report what should be rendered
 */
export function diagnoseTileStructure(structureId) {
  const structure = DEFAULT_TILE_STRUCTURES[structureId];
  if (!structure) {
    return { error: `Structure '${structureId}' not found` };
  }

  const analysis = {
    structureId,
    layers: {},
    totalSolid: 0,
    totalEmpty: 0,
    totalStair: 0
  };

  // Analyze each layer
  const layerNames = ['floor', 'mid', 'ceiling'];
  structure.structure.forEach((layer, layerIdx) => {
    const layerName = layerNames[layerIdx];
    const layerAnalysis = {
      solidVoxels: [],
      emptyVoxels: [],
      stairVoxels: []
    };

    layer.forEach((row, z) => {
      row.forEach((value, x) => {
        const pos = `(${x},${layerIdx},${z})`;
        if (value === VOXEL.SOLID) {
          layerAnalysis.solidVoxels.push(pos);
          analysis.totalSolid++;
        } else if (value === VOXEL.EMPTY) {
          layerAnalysis.emptyVoxels.push(pos);
          analysis.totalEmpty++;
        } else if (value === VOXEL.STAIR) {
          layerAnalysis.stairVoxels.push(pos);
          analysis.totalStair++;
        }
      });
    });

    analysis.layers[layerName] = layerAnalysis;
  });

  return analysis;
}

/**
 * Print diagnostic report
 */
export function printDiagnosticReport(structureId) {
  const analysis = diagnoseTileStructure(structureId);
  
  if (analysis.error) {
    console.error(analysis.error);
    return;
  }

  console.log(`\n=== DIAGNOSTIC REPORT: ${structureId} ===`);
  console.log(`Total voxels: ${analysis.totalSolid + analysis.totalEmpty + analysis.totalStair}`);
  console.log(`  Solid (should render): ${analysis.totalSolid}`);
  console.log(`  Empty (traversable air): ${analysis.totalEmpty}`);
  console.log(`  Stairs: ${analysis.totalStair}`);

  Object.entries(analysis.layers).forEach(([layerName, data]) => {
    console.log(`\n${layerName.toUpperCase()} LAYER:`);
    if (data.solidVoxels.length > 0) {
      console.log(`  ✅ SOLID voxels (should generate meshes): ${data.solidVoxels.length}`);
      console.log(`     Positions: ${data.solidVoxels.join(', ')}`);
    }
    if (data.emptyVoxels.length > 0) {
      console.log(`  🔲 EMPTY voxels (no mesh, traversable): ${data.emptyVoxels.length}`);
      console.log(`     Positions: ${data.emptyVoxels.join(', ')}`);
    }
    if (data.stairVoxels.length > 0) {
      console.log(`  🪜 STAIR voxels: ${data.stairVoxels.length}`);
      console.log(`     Positions: ${data.stairVoxels.join(', ')}`);
    }
  });

  console.log('\n');
}

// Browser console helper
if (typeof window !== 'undefined') {
  window.diagnoseTile = printDiagnosticReport;
  console.log('💡 Diagnostic tool loaded. Use: diagnoseTile("corridor_ns")');
}
