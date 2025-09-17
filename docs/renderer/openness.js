// openness.js
// Shared openness / clearance heuristics for stair adjacency rules.
// Exported for reuse in renderer rule building and potential tests.

/**
 * Check that the entire middle boundary row (y=1) of a face is empty.
 * Faces: 'posZ','negZ','posX','negX'. Expects proto.voxels[z][y][x].
 */
export function middleFaceOpen(proto, face){
  const v = proto.voxels;
  if (face==='posZ') return v[2][1][0]===0 && v[2][1][1]===0 && v[2][1][2]===0;
  if (face==='negZ') return v[0][1][0]===0 && v[0][1][1]===0 && v[0][1][2]===0;
  if (face==='posX') return v[0][1][2]===0 && v[1][1][2]===0 && v[2][1][2]===0;
  if (face==='negX') return v[0][1][0]===0 && v[1][1][0]===0 && v[2][1][0]===0;
  return true;
}

/**
 * Clear volume requirement: middle boundary row empty AND top-layer center cell empty in neighbor facing the landing.
 */
export function clearVolumeOpen(proto, face){
  if (!middleFaceOpen(proto, face)) return false;
  const v = proto.voxels;
  if (face==='posZ') return v[2][2][1]===0; // top center of boundary slice
  if (face==='negZ') return v[0][2][1]===0;
  if (face==='posX') return v[1][2][2]===0; // middle z slice top center at x=2
  if (face==='negX') return v[1][2][0]===0;
  return true;
}

/** Convenience helper deciding which heuristic to apply for a given stair direction side. */
export function forwardClearRequirement(proto, face){ return clearVolumeOpen(proto, face); }
export function backwardClearRequirement(proto, face){ return middleFaceOpen(proto, face); }
