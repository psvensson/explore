import { createRenderer } from '../docs/renderer/renderer.js';

describe('renderer', () => {
  beforeEach(()=>{ document.body.innerHTML='<div id="threejs-canvas" style="width:400px;height:300px"></div>'; });
  test('throws if THREE missing', () => {
    expect(() => createRenderer({})).toThrow(/THREE dependency missing/);
  });
  test('throws if container missing', () => {
    document.body.innerHTML='';
    const THREE = { Scene: class{}, PerspectiveCamera: class{}, WebGLRenderer: class{ setSize(){} }, DirectionalLight: class{}, GridHelper: class{} };
    expect(() => createRenderer({ THREE, containerId: 'nope'})).toThrow(/not found/);
  });
  test('creates renderer with container', () => {
    const THREE = {
      Scene: class { constructor(){ this.children=[];} add(o){ this.children.push(o);} },
      PerspectiveCamera: class { constructor(){ this.position={ set(){}};} updateProjectionMatrix(){} },
      WebGLRenderer: class { constructor(){ this.domElement=document.createElement('canvas'); } setSize(){} render(){} },
      DirectionalLight: class { constructor(){ this.position={ set(){}}; } },
      GridHelper: class {},
    };
    const inst = createRenderer({ THREE });
    expect(inst.renderer.domElement).toBeTruthy();
  });
});
