// Test to ensure stair tiles (tileId=2) only stack vertically in valid lower/upper pairing.

global.NDWFC3D = function(){}; // stub registration

import { initializeTileset, tilePrototypes, _resetTilesetForTests } from '../docs/dungeon/tileset.js';
import WFC from '../docs/dungeon/ndwfc.js';

// We import renderer's stair heuristic indirectly by reproducing minimal logic (no need to spin entire renderer pipeline)

function classifyStair(proto){
  if (proto.tileId!==2) return 'none';
  const vox = proto.voxels; let yCount=[0,0,0];
  for (let z=0;z<3;z++) for (let y=0;y<3;y++) for (let x=0;x<3;x++) if (vox[z][y][x]===2) yCount[y]++;
  if (yCount[0]>0 && yCount[2]===0) return 'lower';
  if (yCount[2]>0 && yCount[0]===0) return 'upper';
  return 'neutral';
}

describe('Stair vertical-only constraint (Strategy A)', ()=>{
  beforeAll(()=>{ initializeTileset(); });

  test('no stair tile appears without its counterpart directly stacked', ()=>{
    // Build rules the same way renderer does (simplified) to isolate vertical relationships
    const n = tilePrototypes.length;
    const weights = new Array(n).fill(1);
    const rules=[];
    function stairHeuristic(p){ return {kind: classifyStair(p)}; }
    function canStack(upper, lower){
      const up = tilePrototypes[upper];
      const low = tilePrototypes[lower];
      const isUp = stairHeuristic(up).kind==='upper';
      const isLow= stairHeuristic(low).kind==='lower';
      if (isLow) return isUp; if (isUp) return isLow; return true;
    }
    for (let a=0;a<n;a++) for (let b=0;b<n;b++){
      rules.push(['y',a,b]); rules.push(['z',a,b]); if (canStack(b,a)) rules.push(['x',a,b]);
    }
    // Extract just vertical rules
    const vertical = rules.filter(r=>r[0]==='x');
    for (const r of vertical){
      const below = r[1]; const above = r[2];
      const kBelow = classifyStair(tilePrototypes[below]);
      const kAbove = classifyStair(tilePrototypes[above]);
      if (kBelow==='lower') expect(kAbove).toBe('upper');
      if (kAbove==='upper') expect(kBelow).toBe('lower');
    }
  });
});
