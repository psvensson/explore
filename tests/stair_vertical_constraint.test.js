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
    // Build rules using metadata-driven approach (preferred) with heuristic fallback
    const n = tilePrototypes.length;
    const weights = new Array(n).fill(1);
    const rules=[];
    
    function canStack(upper, lower){
      const up = tilePrototypes[upper];
      const low = tilePrototypes[lower];
      
      // Prefer explicit metadata
      const lowerRole = low.meta && low.meta.stairRole;
      const upperRole = up.meta && up.meta.stairRole;
      
      if (lowerRole === 'lower') {
        if (upperRole !== 'upper') return false;
        // Check clearance if defined
        if (low.meta && low.meta.requiredAboveEmpty) {
          for (const [z,y,x] of low.meta.requiredAboveEmpty) {
            if (up.voxels[z] && up.voxels[z][y] && up.voxels[z][y][x] !== 0) {
              return false;
            }
          }
        }
        return true;
      }
      if (upperRole === 'upper') return (lowerRole === 'lower');
      
  // Heuristic fallback
      const isUp = classifyStair(up)==='upper';
      const isLow = classifyStair(low)==='lower';
      if (isLow) return isUp; 
      if (isUp) return isLow; 
      return true;
    }
    
    for (let a=0;a<n;a++) for (let b=0;b<n;b++){
      rules.push(['y',a,b]); rules.push(['z',a,b]); 
      if (canStack(b,a)) rules.push(['x',a,b]);
    }
    
    // Extract just vertical rules and verify stair pairing
    const vertical = rules.filter(r=>r[0]==='x');
    for (const r of vertical){
      const below = r[1]; const above = r[2];
      const belowProto = tilePrototypes[below];
      const aboveProto = tilePrototypes[above];
      
      // Use metadata if available, fallback to heuristic
      const belowRole = belowProto.meta?.stairRole || (classifyStair(belowProto)==='lower' ? 'lower' : null);
      const aboveRole = aboveProto.meta?.stairRole || (classifyStair(aboveProto)==='upper' ? 'upper' : null);
      
      if (belowRole==='lower') expect(aboveRole).toBe('upper');
      if (aboveRole==='upper') expect(belowRole).toBe('lower');
    }
  });
});
