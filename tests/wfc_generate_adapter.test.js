import { generateWFCDungeon } from '../docs/renderer/wfc_generate.js';

// Minimal fake tileset
const makeTileset = ()=> ({ prototypes: [
  { id:0, tileId:1, voxels:new Array(27).fill(0), size:[3,3,3], transforms:[], meta:{ weight:1 } },
  { id:1, tileId:2, voxels:new Array(27).fill(1), size:[3,3,3], transforms:[], meta:{ weight:1 } }
] });

const dims = { x:3, y:3, z:3 };
const rng = () => Math.random();

describe('generateWFCDungeon adapter (single incremental path)', () => {
  test('works with expand/step API', async () => {
    class StepModel { constructor(){ this._expanded=false; this._steps=0; this._done=false; } expand(){ this._expanded=true; } step(){ this._steps++; if(this._steps>1){ this._done=true; return true;} return false; } readout(){ return { '0,0,0':0 }; } }
    const NDWFC3D = function(){ return new StepModel(); };
    NDWFC3D.prototype = StepModel.prototype;
    const { grid } = await generateWFCDungeon({ NDWFC3D, tileset: makeTileset(), dims, rng });
    expect(grid.length).toBe(27);
  });

  test('throws when NDWFC3D lacks expand/step', async () => {
    const NDWFC3D = function registerOnly(){}; // no constructor behavior
    await expect(generateWFCDungeon({ NDWFC3D, tileset: makeTileset(), dims, rng }))
      .rejects.toThrow('Unsupported NDWFC3D interface');
  });
});
