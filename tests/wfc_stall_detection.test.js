import { generateWFCDungeon } from '../docs/renderer/wfc_generate.js';

const dims = { x: 6, y: 6, z: 6 };
const rng = () => Math.random();

// Fake model that never completes but yields repeatedly
class NeverEndingModel {
  constructor(){ this._expanded=false; this._steps=0; }
  expand(){ this._expanded=true; }
  step(){ this._steps++; return false; }
}

test('generator aborts on stall by yield cap', async () => {
  const NDWFC3D = function(){ return new NeverEndingModel(); };
  NDWFC3D.prototype = NeverEndingModel.prototype;
  const tileset = { prototypes: [
    { id:0, tileId:1, voxels:new Array(27).fill(0), size:[3,3,3], transforms:[], meta:{ weight:1 } },
    { id:1, tileId:2, voxels:new Array(27).fill(1), size:[3,3,3], transforms:[], meta:{ weight:1 } }
  ] };
  await expect(generateWFCDungeon({ NDWFC3D, tileset, dims, rng, yieldEvery: 10, maxSteps: 100000, maxYields: 3 }))
    .rejects.toThrow(/yield cap|stalled|iteration cap/);
});

test('generator aborts on stall by time limit', async () => {
  const NDWFC3D = function(){ return new NeverEndingModel(); };
  NDWFC3D.prototype = NeverEndingModel.prototype;
  const tileset = { prototypes: [
    { id:0, tileId:1, voxels:new Array(27).fill(0), size:[3,3,3], transforms:[], meta:{ weight:1 } },
    { id:1, tileId:2, voxels:new Array(27).fill(1), size:[3,3,3], transforms:[], meta:{ weight:1 } }
  ] };
  await expect(generateWFCDungeon({ NDWFC3D, tileset, dims, rng, yieldEvery: 10, maxSteps: 100000, stallTimeoutMs: 5 }))
    .rejects.toThrow(/stalled|yield cap|iteration cap/);
});
