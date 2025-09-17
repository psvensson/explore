// wfc_generate.js
import { buildRules } from './wfc_rules.js';
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
export async function generateWFCDungeon({ NDWFC3D, tileset, dims, rng, yieldEvery=500, maxSteps=50000, stallTimeoutMs=15000, maxYields=Infinity, signal, debug } ) {
  const log = makeLogger('WFC', debug);
  const { prototypes, symmetryTransforms } = tileset;
  const dataSize = dims.x * dims.y * dims.z;
  const protoTiles = prototypes.map((p, i) => ({ ...p, index: i }));
  const transforms = symmetryTransforms || [];
  const { rules, weights } = buildRules(protoTiles, { isolateStairs: true });
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
    let steps = 0; let done = false; let yields = 0; const t0 = nowMs();
    let aborted = false;
    if (signal && typeof signal.addEventListener === 'function'){
      signal.addEventListener('abort', ()=>{ aborted = true; }, { once: true });
      if (signal.aborted) aborted = true;
    }
    while (steps < maxSteps) {
      if (aborted) { log('abort:signal', { steps, yields }); throw new Error('WFC collapse aborted'); }
      for (let i=0;i<yieldEvery && steps<maxSteps;i++,steps++) {
        if (aborted) { log('abort:signal', { steps, yields }); throw new Error('WFC collapse aborted'); }
        if (model.step()) { done = true; break; }
      }
      if (done) break;
      if (steps < maxSteps) {
        yields++;
        log('yield', { steps });
        if (yields > maxYields) {
          log('abort:yieldCap', { yields, steps, maxYields });
          throw new Error('WFC collapse exceeded yield cap');
        }
        if ((nowMs() - t0) > stallTimeoutMs) {
          log('abort:stall', { steps, yields, stallTimeoutMs });
          throw new Error('WFC collapse stalled (time limit)');
        }
        await nextTick();
      }
    }
    if (!done) {
      log('abort:maxSteps', { steps, maxSteps });
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
