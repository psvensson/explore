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
    class WebGLRenderer { constructor(){ this.domElement=document.createElement('canvas'); } setSize(){} render(){} }
    class DirectionalLight { constructor(){ this.position={ set(){} }; } }
    class GridHelper {}
    class OrbitControlsMock {
      constructor(camera, dom){ this.camera=camera; this.domElement=dom; this.target=new Vector3(); this.minDistance=5; this.maxDistance=300; }
      update(){}
    }
    const THREE = { Scene, PerspectiveCamera, WebGLRenderer, DirectionalLight, GridHelper, OrbitControls: OrbitControlsMock, Vector3 };
    const inst = createRenderer({ THREE });
    expect(inst.controls).toBeInstanceOf(OrbitControlsMock);
  });
});
