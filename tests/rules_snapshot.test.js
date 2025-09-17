import { initializeTileset, tilePrototypes } from '../docs/dungeon/tileset.js';

// Dynamic import to avoid circular ESM issues
async function getBuildRules(){
  const mod = await import('../docs/renderer/wfc_rules.js');
  return mod.buildRules;
}

describe('rules snapshot', () => {
  beforeAll(() => {
    global.NDWFC3D = function(){}; // stub
    initializeTileset();
  });

  test('stair forward has at least one clear-volume neighbor and stairs are isolated laterally', async () => {
    const buildRules = await getBuildRules();
    const { rules, diagnostics } = buildRules(tilePrototypes, {});
    // Build adjacency map for horizontal tokens (exclude vertical 'x' token from original mapping; our DIM_TOKENS.Y maps to 'x')
    const horiz = rules.filter(r => r[0] !== 'x');
    const neighborMap = new Map(); // key a-> set of b
    for (const [dim,a,b] of horiz){
      if (!neighborMap.has(a)) neighborMap.set(a,new Set());
      neighborMap.get(a).add(b);
    }
    const stairIndices = tilePrototypes.map((p,i)=>({p,i})).filter(o=>o.p.meta && o.p.meta.role==='stair');
    expect(stairIndices.length).toBeGreaterThan(0);
    // For each stair ensure at least one non-stair neighbor candidate exists (forward or backward) horizontally
    for (const {p,i} of stairIndices){
      const neighbors = neighborMap.get(i) || new Set();
      const nonStair = [...neighbors].filter(j => !(tilePrototypes[j].meta && tilePrototypes[j].meta.role==='stair'));
      expect(nonStair.length).toBeGreaterThan(0);
    }
    // Lateral isolation: no rule where both prototypes are stairs should exist on horizontal axes
    for (const [token,a,b] of horiz){
      const A = tilePrototypes[a];
      const B = tilePrototypes[b];
      const both = A.meta && A.meta.role==='stair' && B.meta && B.meta.role==='stair';
      expect(both).toBe(false);
    }
    // Basic sanity on diagnostics
    expect(diagnostics.totalPairs).toBeGreaterThan(0);
  });
});
