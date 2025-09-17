import { generateWFCDungeon } from '../docs/renderer/wfc_generate.js';
import { gridToAscii } from '../docs/renderer/ascii.js';

class TrivialModel { constructor(){ this.grid=new Array(27).fill(0); } run(){ return true; } }
const NDWFC3D = function(){ return new TrivialModel(); };
NDWFC3D.prototype = TrivialModel.prototype;

const makeTileset = ()=> ({ prototypes: [
  { id:0, tileId:1, voxels:new Array(27).fill(0), size:[3,3,3], transforms:[], meta:{ weight:1 } },
  { id:1, tileId:2, voxels:new Array(27).fill(1), size:[3,3,3], transforms:[], meta:{ weight:1 } }
] });

test('generateWFCDungeon provides grid3D compatible with gridToAscii', async () => {
  const { grid3D } = await generateWFCDungeon({ NDWFC3D, tileset: makeTileset(), dims:{x:3,y:3,z:3}, rng:()=>0.5 });
  const s = gridToAscii(grid3D);
  expect(typeof s).toBe('string');
  expect(s.length).toBeGreaterThan(0);
});
