import { createRenderer } from '../docs/renderer/renderer.js';

describe('renderer', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="threejs-canvas" style="width:400px;height:300px"></div>';
  });

  test('throws if THREE missing', () => {
    expect(() => createRenderer({})).toThrow(/THREE dependency missing/);
  });

  test('throws if OrbitControls missing', () => {
    const THREE = {
      Scene: class {},
      PerspectiveCamera: class {},
      WebGLRenderer: class { setSize(){} },
      DirectionalLight: class {},
      GridHelper: class {},
      Vector3: class {}
    };
    expect(() => createRenderer({ THREE })).toThrow(/OrbitControls missing/);
  });

  test('creates renderer with mandatory OrbitControls', () => {
    class Vector3 {
      constructor(x=0,y=0,z=0){ this.x=x; this.y=y; this.z=z; }
      set(x,y,z){ this.x=x; this.y=y; this.z=z; return this; }
      clone(){ return new Vector3(this.x,this.y,this.z); }
      sub(v){ return new Vector3(this.x-v.x,this.y-v.y,this.z-v.z); }
      normalize(){ const l=Math.hypot(this.x,this.y,this.z)||1; return new Vector3(this.x/l,this.y/l,this.z/l); }
      multiplyScalar(s){ this.x*=s; this.y*=s; this.z*=s; return this; }
      add(v){ this.x+=v.x; this.y+=v.y; this.z+=v.z; return this; }
      distanceTo(v){ return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z); }
      copy(v){ this.x=v.x; this.y=v.y; this.z=v.z; return this; }
    }
    class Scene { constructor(){ this.children=[];} add(o){ this.children.push(o);} }
    class PerspectiveCamera { constructor(){ this.position=new Vector3(); this.matrix={ elements:new Array(16).fill(0) }; this.matrix.elements[0]=1; this.matrix.elements[5]=1; this.matrix.elements[10]=1;} updateProjectionMatrix(){} }
    class WebGLRenderer { 
      constructor(){ 
        this.domElement=document.createElement('canvas');
        this.info = { render: { calls: 0 } };
      } 
      setSize(){} 
      render(){ this.info.render.calls++; } 
      getSize(){ return {width: 800, height: 600}; } 
    }
    class DirectionalLight { constructor(){ this.position=new Vector3(10,10,10); this.visible=true; this.type='DirectionalLight'; } }
    class GridHelper { constructor(){ this.position=new Vector3(); this.visible=true; this.type='GridHelper'; } }
    class Group { constructor(){ this.children=[]; this.position=new Vector3(); this.visible=true; this.type='Group'; this.name=''; } add(o){ this.children.push(o); } remove(o){ const i=this.children.indexOf(o); if(i>=0)this.children.splice(i,1); } }
    class Mesh { constructor(geom, mat){ this.geometry=geom; this.material=mat; this.position=new Vector3(); this.visible=true; this.type='Mesh'; } }
    class BoxGeometry { constructor(w,h,d){ this.width=w; this.height=h; this.depth=d; } }
    class MeshLambertMaterial { constructor(opts){ this.color=opts.color; } }
    class Vector2 { constructor(x=0,y=0){ this.width=x; this.height=y; } }
    class OrbitControlsMock {
      constructor(camera, dom){ this.camera=camera; this.domElement=dom; this.target=new Vector3(); this.minDistance=5; this.maxDistance=300; }
      update(){}
    }
    const THREE = { 
      Scene, PerspectiveCamera, WebGLRenderer, DirectionalLight, GridHelper, Group,
      OrbitControls: OrbitControlsMock, Vector3, Vector2, Mesh, BoxGeometry, MeshLambertMaterial 
    };
    const inst = createRenderer({ THREE });
    expect(inst.controls).toBeInstanceOf(OrbitControlsMock);
  });
});
