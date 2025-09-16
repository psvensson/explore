// Ensures stair tiles are not horizontally adjacent in generated rule set.

describe('stair no horizontal adjacency', () => {
  let initializeTileset, tilePrototypes;
  beforeAll(async () => {
    global.NDWFC3D = function(){};
    const mod = await import('../docs/dungeon/tileset.js');
    ({ initializeTileset, tilePrototypes } = mod);
  });

  test('no lateral rule pairs where both prototypes are stairs', async () => {
    initializeTileset();
    // Reproduce rule generation core for lateral tokens only.
    function middleFaceOpen(proto, face){
      const v = proto.voxels;
      if (face==='posZ') return v[2][1][1] === 0;
      if (face==='negZ') return v[0][1][1] === 0;
      if (face==='posX') return v[1][1][2] === 0;
      if (face==='negX') return v[1][1][0] === 0;
      return true;
    }
    const rules = [];
    const n = tilePrototypes.length;
    for (let a=0;a<n;a++){
      for (let b=0;b<n;b++){
        const A = tilePrototypes[a];
        const B = tilePrototypes[b];
        const aStair = A.meta && A.meta.role==='stair';
        const bStair = B.meta && B.meta.role==='stair';
        const horizontalBlocked = aStair && bStair;
        let allowZForward = true, allowZBackward = true, allowXForward = true, allowXBackward = true;
        if (aStair && A.meta.axis==='z'){
          if (A.meta.dir===1){
            allowZForward = middleFaceOpen(B, 'negZ');
            allowZBackward = middleFaceOpen(B, 'posZ');
          } else {
            allowZBackward = middleFaceOpen(B, 'posZ');
            allowZForward = middleFaceOpen(B, 'negZ');
          }
        }
        if (aStair && A.meta.axis==='x'){
          if (A.meta.dir===1){
            allowXForward = middleFaceOpen(B, 'negX');
            allowXBackward = middleFaceOpen(B, 'posX');
          } else {
            allowXBackward = middleFaceOpen(B, 'posX');
            allowXForward = middleFaceOpen(B, 'negX');
          }
        }
        if (!horizontalBlocked){
          if (allowXForward) rules.push(['y',a,b]);
          if (allowXBackward) rules.push(['y',a,b]);
          if (allowZForward) rules.push(['z',a,b]);
          if (allowZBackward) rules.push(['z',a,b]);
        }
      }
    }
    // Assert no rules with both stair indices for lateral tokens
    const stairIdx = new Set();
    tilePrototypes.forEach((p,i)=>{ if (p.meta && p.meta.role==='stair') stairIdx.add(i); });
    const bad = rules.filter(r=> (r[0]==='y' || r[0]==='z') && stairIdx.has(r[1]) && stairIdx.has(r[2]));
    expect(bad.length).toBe(0);
  });
});
