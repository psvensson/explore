// wfc_generate.js
import { buildRules } from './wfc_rules.js';
import { buildEdgePatternRules } from './edge_pattern_wfc_rules.js';
import WFC from '../dungeon/ndwfc.js';

// Lightweight debug helpers (no-op by default)
const hasDOM = typeof window !== 'undefined';
const nowMs = () => (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
function debugEnabled(explicit){
  if (typeof explicit === 'boolean') return explicit;
  if (hasDOM && typeof window.__WFC_DEBUG__ === 'boolean') return window.__WFC_DEBUG__;
  if (hasDOM && typeof URLSearchParams !== 'undefined'){
    try { return new URLSearchParams(window.location.search).get('wfcDebug') === '1'; } catch(_){}
  }
  return false;
}
function makeLogger(ns, enabled){
  const on = debugEnabled(enabled);
  const t0 = nowMs();
  const fmt = (ev, data) => [`[%c${ns}%c] +${(nowMs()-t0).toFixed(1)}ms`, 'color:#5cf', 'color:inherit', ev, data||''];
  const log = (ev, data) => { if (on) console.debug(...fmt(ev, data)); };
  log.enabled = on; return log;
}
const nextTick = () => new Promise(res => {
  if (hasDOM && typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(()=>res());
  else setTimeout(res, 0);
});

// Generate a dungeon using the incremental NDWFC API (expand + step loop).
// Adapts previous model.run() expectation to the existing ndwfc.js engine.
export async function generateWFCDungeon({ NDWFC3D, tileset, dims, rng, yieldEvery=500, maxSteps=50000, stallTimeoutMs=60000, maxYields=Infinity, signal, debug } ) {
  const log = makeLogger('WFC', debug);
  const { prototypes, symmetryTransforms } = tileset;
  const dataSize = dims.x * dims.y * dims.z;
  const protoTiles = prototypes.map((p, i) => ({ ...p, index: i }));
  const transforms = symmetryTransforms || [];
  
  // Use edge pattern based rules instead of openness heuristics
  const { rules, weights } = buildEdgePatternRules(protoTiles, { isolateStairs: true });
  log('init', { dims, tiles: protoTiles.length, rules: rules.length, yieldEvery, maxSteps });

  // Defensive guard: empty tiles or rules indicate tileset not initialized or miswired
  if (!protoTiles.length) {
    const msg = 'Tileset prototypes are empty. Ensure initializeTileset() ran and pass { tileset: { prototypes: tilePrototypes } } to generateWFCDungeon.';
    log('error:tiles-empty', { message: msg });
    throw new Error(msg);
  }
  if (!rules.length) {
    const msg = 'No WFC rules were generated from the tileset. Check tileset contents or rule builder configuration.';
    log('error:rules-empty', { message: msg });
    throw new Error(msg);
  }

  // --- Instantiate model across possible legacy interfaces ---
  let model = null;
  let ctorError = null;
  if (NDWFC3D) {
    try { model = new NDWFC3D({ nd: 3, weights, rules, wave: {} }); } catch(e){ ctorError = e; log('ctor-error', String(e)); }
  }
  // If NDWFC3D was a registration function (not a constructor) model may be undefined or missing methods.
  const hasExpand = model && typeof model.expand === 'function' && typeof model.step === 'function';
  const hasRun = model && typeof model.run === 'function';
  if (!hasExpand && !hasRun) {
    // Fallback: direct use of embedded WFC implementation.
    model = new WFC({ nd:3, weights, rules, wave:{} });
  }
  log('api', { path: hasExpand? 'incremental' : (hasRun? 'legacy-run' : 'embedded') });

  // Prefer incremental path (expand/step) to avoid blocking the browser; otherwise, use legacy run().
  if (typeof model.expand === 'function' && typeof model.step === 'function') {
    log('expand:start');
    model.expand([0,0,0],[dims.x,dims.y,dims.z]);
    log('expand:done');
    
    // Apply strategic initial constraints to guide WFC toward better solutions
    // Temporarily disabled to test if constraints are causing yield cap issues
    // applyInitialConstraints(model, dims, protoTiles, log);
    
    let steps = 0; let done = false; let yields = 0; const t0 = nowMs();
    let aborted = false;
    if (signal && typeof signal.addEventListener === 'function'){
      signal.addEventListener('abort', ()=>{ aborted = true; }, { once: true });
      if (signal.aborted) aborted = true;
    }
    while (steps < maxSteps) {
      if (aborted) { log('abort:signal', { steps, yields }); throw new Error('WFC collapse aborted'); }
      
      // Adaptive batch size based on grid size (larger grids can handle bigger batches)
      const gridSize = dims.x * dims.y * dims.z;
      const batchSize = gridSize > 125 ? Math.min(10, yieldEvery) : 1; // Batch only for grids > 5x5x5
      
      for (let i=0; i < Math.min(batchSize, yieldEvery) && steps < maxSteps; i++, steps++) {
        if (aborted) { log('abort:signal', { steps, yields }); throw new Error('WFC collapse aborted'); }
        if (model.step()) { done = true; break; }
      }
      
      // Yield after processing batch or reaching yieldEvery steps
      if (steps % yieldEvery === 0 || done) {
        yields++;
        if (yields > maxYields) {
          log('abort:yieldCap', { yields, steps, maxYields });
          throw new Error('WFC collapse exceeded yield cap');
        }
        if ((nowMs() - t0) > stallTimeoutMs) {
          log('abort:stall', { steps, yields, stallTimeoutMs });
          throw new Error('WFC collapse stalled (time limit)');
        }
        if (yields % 50 === 0) { log('step:progress', { steps, yields, dims, progress: (steps/maxSteps*100).toFixed(1) + '%' }); }
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      if (done) break;
    }
    if (!done) {
      log('abort:maxSteps', { steps, maxSteps, progress: (steps/maxSteps*100).toFixed(1) + '%' });
      throw new Error('WFC collapse (step) exceeded iteration cap');
    }
    log('done', { steps });
  } else if (typeof model.run === 'function') {
    log('run:start', { maxSteps });
    const ok = model.run(maxSteps);
    log('run:done', { ok });
    if (!ok) throw new Error('WFC collapse (run) failed or exceeded iteration cap');
  } else {
    throw new Error('Unsupported NDWFC3D interface: missing run() and expand()/step()');
  }

  const wave = typeof model.readout === 'function' ? model.readout() : null;
  const grid = new Array(dataSize);
  // Also build a nested 3D grid for ASCII/debug consumption: grid3D[z][y][x]
  const grid3D = Array.from({ length: dims.z }, () => Array.from({ length: dims.y }, () => new Array(dims.x).fill(0)));
  for (let z=0; z<dims.z; z++){
    for (let y=0; y<dims.y; y++){
      for (let x=0; x<dims.x; x++){
        const key=`${x},${y},${z}`; const tileIndex = wave ? wave[key] : (model.grid ? model.grid[x + y*dims.x + z*dims.x*dims.y] : 0); const idx=x + y*dims.x + z*dims.x*dims.y; const val=typeof tileIndex==='number'?tileIndex:0; grid[idx]=val; grid3D[z][y][x]=val;
      }
    }
  }
  log('readout', { cells: grid.length });
  // Derive placed tiles from the collapsed wave (prototype index per cell). Rotation defaults to 0.
  const placed = [];
  for (let z=0; z<dims.z; z++){
    for (let y=0; y<dims.y; y++){
      for (let x=0; x<dims.x; x++){
        const idx = x + y*dims.x + z*dims.x*dims.y;
        let prototypeIndex = grid[idx] ?? 0;
        if (!(prototypeIndex>=0 && prototypeIndex < protoTiles.length)){
          log('warn:prototypeIndexOutOfRange', { idx, val: prototypeIndex, max: protoTiles.length-1 });
          prototypeIndex = 0;
        }
        placed.push({ prototypeIndex, rotationY: 0, position: [z, y, x] });
      }
    }
  }
  return { grid, grid3D, rules, tiles: placed, weights };
}

/**
 * Apply strategic initial constraints to guide WFC toward better solutions.
 * Seeds the grid with smart placements to reduce search space and improve convergence.
 */
function applyInitialConstraints(model, dims, protoTiles, log) {
  try {
    // Skip constraints for very small grids - they become over-constrained
    if (dims.x <= 3 || dims.y <= 3 || dims.z <= 3) {
      log('constraints:skipped', { reason: 'grid too small', dims });
      return;
    }
    
    // Find prototype indices for different tile types
    const openSpaceIndex = protoTiles.findIndex(p => p.meta?.weight >= 8); // High weight open space
    const corridorIndex = protoTiles.findIndex(p => p.meta?.weight >= 10); // High weight corridor
    const solidIndex = protoTiles.findIndex(p => p.meta?.weight <= 0.2); // Low weight solid
    
    const centerX = Math.floor(dims.x / 2);
    const centerY = Math.floor(dims.y / 2); 
    const centerZ = Math.floor(dims.z / 2);
    
    let constraintsApplied = 0;
    
    // Strategy 1: Only seed center for medium+ grids (5x5x5+)
    if (openSpaceIndex >= 0 && dims.x >= 5 && dims.z >= 5) {
      if (typeof model.setCell === 'function') {
        model.setCell(centerX, centerY, centerZ, openSpaceIndex);
        constraintsApplied++;
      } else if (typeof model.constrain === 'function') {
        model.constrain(centerX, centerY, centerZ, [openSpaceIndex]);
        constraintsApplied++;
      }
    }
    
    // Strategy 2: Only add edge walls for larger grids (7x7x7+) 
    if (solidIndex >= 0 && dims.x >= 7 && dims.z >= 7) {
      const edgePositions = [
        [0, centerY, centerZ],           // -X edge
        [dims.x-1, centerY, centerZ],    // +X edge  
        [centerX, centerY, 0],           // -Z edge
        [centerX, centerY, dims.z-1],    // +Z edge
      ];
      
      for (const [x, y, z] of edgePositions) {
        if (typeof model.setCell === 'function') {
          model.setCell(x, y, z, solidIndex);
          constraintsApplied++;
        } else if (typeof model.constrain === 'function') {
          model.constrain(x, y, z, [solidIndex]);
          constraintsApplied++;
        }
      }
    }
    
    // Strategy 3: Only create spine for large grids (9x9x9+)
    if (corridorIndex >= 0 && dims.x >= 9 && dims.z >= 9) {
      // Place corridor tiles along center line to encourage connectivity
      const spinePositions = [
        [centerX, centerY, centerZ - 1],
        [centerX, centerY, centerZ + 1],
      ];
      
      for (const [x, y, z] of spinePositions) {
        if (x >= 0 && x < dims.x && z >= 0 && z < dims.z) {
          if (typeof model.setCell === 'function') {
            model.setCell(x, y, z, corridorIndex);
            constraintsApplied++;
          } else if (typeof model.constrain === 'function') {
            model.constrain(x, y, z, [corridorIndex]);
            constraintsApplied++;
          }
        }
      }
    }
    
    if (constraintsApplied > 0) {
      log('constraints:applied', { 
        count: constraintsApplied, 
        openIndex: openSpaceIndex, 
        solidIndex: solidIndex,
        corridorIndex: corridorIndex,
        dims
      });
    } else {
      log('constraints:skipped', { reason: 'grid size below thresholds', dims });
    }
    
  } catch (error) {
    log('constraints:error', { error: error.message });
    // Don't throw - constraints are optional optimization
  }
}
