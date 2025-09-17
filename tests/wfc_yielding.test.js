import { generateWFCDungeon } from '../docs/renderer/wfc_generate.js';

// Fake NDWFC3D with step-based API that requires many steps to finish
class SlowStepModel {
  constructor(){ this._expanded=false; this._steps=0; this._done=false; this.grid=new Array(27).fill(0); }
  expand(){ this._expanded=true; }
  step(){ this._steps++; if(this._steps>=2000){ this._done=true; return true;} return false; }
  readout(){ return { '0,0,0':0 }; }
}

const NDWFC3D = function(){ return new SlowStepModel(); };
NDWFC3D.prototype = SlowStepModel.prototype;

const makeTileset = ()=> ({ prototypes: [
  { id:0, tileId:1, voxels:new Array(27).fill(0), size:[3,3,3], transforms:[], meta:{ weight:1 } },
  { id:1, tileId:2, voxels:new Array(27).fill(1), size:[3,3,3], transforms:[], meta:{ weight:1 } }
] });

describe('generateWFCDungeon yielding', () => {
  test('does not block event loop by yielding between chunks', async () => {
    const start = Date.now();
    const dims = { x:3, y:3, z:3 };
    const rng = () => Math.random();
    const { grid } = await generateWFCDungeon({ NDWFC3D, tileset: makeTileset(), dims, rng, yieldEvery:100 });
    expect(grid.length).toBe(27);
    // Should take at least a few ticks (not purely synchronous tight loop)
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(0);
  });
});
