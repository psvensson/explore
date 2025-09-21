// Mock NDWFC3D before importing tileset to satisfy commitTilePrototype side-effect.
global.NDWFC3D = function(){};
import { _resetTilesetForTests, createTileFormLayers, tilePrototypes } from '../docs/dungeon/tileset.js';
import { buildTileMesh } from '../docs/renderer/wfc_tile_mesh.js';

// Provide a minimal THREE stub sufficient for buildTileMesh
const THREE = {
  Group: function(){ this.children=[]; this.add=(o)=>this.children.push(o); },
  Mesh: function(geom, mat){ this.geometry=geom; this.material=mat; this.position={ set(){} }; },
  BoxGeometry: function(w,h,d){ this.parameters={width:w,height:h,depth:d}; },
  Float32BufferAttribute: function(){},
  BufferGeometry: function(){ this.setAttribute=()=>{}; this.setIndex=()=>{}; this.computeVertexNormals=()=>{}; },
  MeshStandardMaterial: function(cfg){ Object.assign(this,cfg); this.userData={}; },
  CanvasTexture: function(){}
};

describe('empty top / bottom layer voxelization', ()=>{
  beforeAll(()=>{
    _resetTilesetForTests();
    // Prototype with full floor (y=0 across all z planes) and empty middle/top
    // Each outer array element is a z-slice; each inner string is a y-row; chars are x.
    // We want y=0: "111" for all z slices, y=1,y=2 empty.
    createTileFormLayers([
      ["111","000","000"],
      ["111","000","000"],
      ["111","000","000"]
    ], 9001, { transforms: [] });
  });

  test('produces appropriate mesh elements for solid bottom layer', ()=>{
    const protoIndex = tilePrototypes.length-1;
    const group = buildTileMesh({THREE, prototypeIndex: protoIndex, rotationY:0, unit:1});
    const types = group.children.map(c=>c.material && c.material.userData && c.material.userData.type).filter(Boolean);
    
    // Expect some floor slabs to be generated for the solid bottom layer
    const floorCount = types.filter(t=>t==='floor').length;
    expect(floorCount).toBeGreaterThan(0);
    
    // Check that mesh generation produces reasonable results
    expect(group.children.length).toBeGreaterThan(0);
    
    // The tile should have some mesh elements since it has solid voxels
    const totalMeshElements = types.length;
    expect(totalMeshElements).toBeGreaterThan(0);
  });
});
