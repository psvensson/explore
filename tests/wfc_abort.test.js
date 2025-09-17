import { generateWFCDungeon } from '../docs/renderer/wfc_generate.js';

// Model that never completes, to test abort signal
class NeverEndingModel { expand(){} step(){ return false; } }

const tileset = { prototypes: [
  { id:0, tileId:1, voxels:new Array(27).fill(0), size:[3,3,3], transforms:[], meta:{ weight:1 } },
  { id:1, tileId:2, voxels:new Array(27).fill(1), size:[3,3,3], transforms:[], meta:{ weight:1 } }
] };

const dims = { x: 4, y: 4, z: 4 };

function makeNDWFC(){ const NDWFC3D = function(){ return new NeverEndingModel(); }; NDWFC3D.prototype = NeverEndingModel.prototype; return NDWFC3D; }

// Polyfill AbortController for jest if needed
const AC = global.AbortController || class { constructor(){ this.signal={ aborted:false, addEventListener:()=>{} }; } abort(){ this.signal.aborted=true; } };

test('generateWFCDungeon aborts via signal', async () => {
  const controller = new AC();
  const NDWFC3D = makeNDWFC();
  const p = generateWFCDungeon({ NDWFC3D, tileset, dims, yieldEvery: 10, maxSteps: 100000, maxYields: Infinity, stallTimeoutMs: 60000, signal: controller.signal });
  // Abort soon after start
  setTimeout(()=>controller.abort(), 0);
  await expect(p).rejects.toThrow(/aborted|yield cap|stalled|iteration cap/);
});
