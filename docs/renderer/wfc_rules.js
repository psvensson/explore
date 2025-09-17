// wfc_rules.js
// Build WFC adjacency rules with diagnostics.
import { clearVolumeOpen, middleFaceOpen } from './openness.js';
import { DIM_TOKENS } from './constants.js';

export function buildRules(tilePrototypes, { isolateStairs=true, forwardHeuristic=clearVolumeOpen, backwardHeuristic=middleFaceOpen } = {}) {
  const n = tilePrototypes.length;
  const rules = [];
  // Derive weights from meta.weight (default 1)
  const weights = tilePrototypes.map(p => (p && p.meta && typeof p.meta.weight === 'number') ? p.meta.weight : 1);
  const diagnostics = {
    totalPairs: 0,
    horizontalPruned: 0,
    forwardRejected: 0,
    backwardRejected: 0,
    verticalAllowed: 0,
    verticalTotal: 0
  };
  // --- Vertical stacking semantic helpers (small predicates; keep each ≤10 lines) ---
  /**
   * Return tile prototype by index.
   * @param {number} i index into tilePrototypes
   * @returns {object}
   */
  const tile = i => tilePrototypes[i];
  /**
   * Whether a prototype represents a stair tile.
   * @param {object} p tile prototype
   * @returns {boolean}
   */
  const isStair = p => !!(p && p.meta && p.meta.role === 'stair');
  /**
   * Whether a prototype is a designated landing tile (role or landing flag).
   * @param {object} p tile prototype
   * @returns {boolean}
   */
  const isLanding = p => !!(p && p.meta && (p.meta.role === 'landing' || p.meta.landing));
  /**
   * Detect solid floor: all 9 voxels of the first layer are solid (1). If meta.solidFloor is provided use it.
   * @param {object} p tile prototype
   * @returns {boolean}
   */
  const hasSolidFloor = p => p && (p.meta && typeof p.meta.solidFloor === 'boolean'
    ? p.meta.solidFloor
    : Array.isArray(p.voxels) && p.voxels.slice(0,9).every(v=>v===1));
  /**
   * Policy toggle: can a stair rest on another stair? Future constraint knob.
   * @returns {boolean}
   */
  const stairOnStairAllowed = () => true;
  /**
   * Unsupported overhang occurs when upper lacks a solid floor AND lower isn't a structural support (stair or landing).
   * @param {object} upper
   * @param {object} lower
   * @returns {boolean} true if invalid support condition
   */
  const violatesSupport = (upper, lower) => !hasSolidFloor(upper) && !isStair(lower) && !isLanding(lower);
  /** Main vertical predicate (currently permissive except future hook for support). */
  function canStack(upperIdx, lowerIdx){
    diagnostics.verticalTotal++;
    const upper = tile(upperIdx);
    const lower = tile(lowerIdx);
    if (isStair(upper) && isStair(lower) && !stairOnStairAllowed()) return false;
    if (violatesSupport(upper, lower)) return false;
    diagnostics.verticalAllowed++;
    return true;
  }

  for (let a=0;a<n;a++){
    for (let b=0;b<n;b++){
      diagnostics.totalPairs++;
      const A = tilePrototypes[a];
      const B = tilePrototypes[b];
      const aStair = A.meta && A.meta.role==='stair';
      const bStair = B.meta && B.meta.role==='stair';
      const horizontalBlocked = isolateStairs && aStair && bStair;
      let allowZForward = true, allowZBackward = true, allowXForward = true, allowXBackward = true;

      if (aStair && A.meta.axis==='z'){
        if (A.meta.dir===1){
          allowZForward = forwardHeuristic(B, 'negZ');
          if (!allowZForward) diagnostics.forwardRejected++;
          allowZBackward = backwardHeuristic(B, 'posZ');
          if (!allowZBackward) diagnostics.backwardRejected++;
        } else {
          allowZBackward = forwardHeuristic(B, 'posZ');
          if (!allowZBackward) diagnostics.forwardRejected++;
          allowZForward = backwardHeuristic(B, 'negZ');
          if (!allowZForward) diagnostics.backwardRejected++;
        }
      }
      if (aStair && A.meta.axis==='x'){
        if (A.meta.dir===1){
          allowXForward = forwardHeuristic(B, 'negX');
          if (!allowXForward) diagnostics.forwardRejected++;
          allowXBackward = backwardHeuristic(B, 'posX');
          if (!allowXBackward) diagnostics.backwardRejected++;
        } else {
          allowXBackward = forwardHeuristic(B, 'posX');
          if (!allowXBackward) diagnostics.forwardRejected++;
          allowXForward = backwardHeuristic(B, 'negX');
          if (!allowXForward) diagnostics.backwardRejected++;
        }
      }
      if (!horizontalBlocked){
        if (allowXForward) rules.push([DIM_TOKENS.X, a, b]);
        if (allowXBackward) rules.push([DIM_TOKENS.X, a, b]);
        if (allowZForward) rules.push([DIM_TOKENS.Z, a, b]);
        if (allowZBackward) rules.push([DIM_TOKENS.Z, a, b]);
      } else {
        diagnostics.horizontalPruned++;
      }
      if (canStack(b,a)) rules.push([DIM_TOKENS.Y, a, b]);
    }
  }
  
  // Deduplicate rules to reduce rule set size
  const originalCount = rules.length;
  const deduplicatedRules = deduplicateRules(rules);
  diagnostics.originalRules = originalCount;
  diagnostics.deduplicatedRules = deduplicatedRules.length;
  diagnostics.rulesRemoved = originalCount - deduplicatedRules.length;
  
  return { rules: deduplicatedRules, weights, diagnostics };
}

/**
 * Remove duplicate rules from the rule set.
 * Rules are considered duplicate if they have the same dimension and tile indices.
 */
function deduplicateRules(rules) {
  const seen = new Set();
  return rules.filter(rule => {
    const key = `${rule[0]}-${rule[1]}-${rule[2]}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
