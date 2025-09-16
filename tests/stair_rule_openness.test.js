// Test stair rule openness: both forward landing and backward entry must be open.

describe('stair rule openness', () => {
  let initializeTileset, tilePrototypes;
  beforeAll(async () => {
    global.NDWFC3D = function(){}; // stub
    const mod = await import('../docs/dungeon/tileset.js');
    ({ initializeTileset, tilePrototypes } = mod);
  });

  function middleFaceOpen(proto, face){
    const v = proto.voxels;
    if (face==='posZ') return v[2][1][1] === 0;
    if (face==='negZ') return v[0][1][1] === 0;
    if (face==='posX') return v[1][1][2] === 0;
    if (face==='negX') return v[1][1][0] === 0;
    return true;
  }

  test('each stair prototype has open forward and backward neighbor possibilities filtered by face openness heuristic', () => {
    initializeTileset();
    const stairs = tilePrototypes.filter(p=> p.meta && p.meta.role==='stair');
    expect(stairs.length).toBe(4);
    const nonStairs = tilePrototypes.filter(p=> !(p.meta && p.meta.role==='stair'));

    for (const stair of stairs){
      const { axis, dir } = stair.meta;
      if (axis==='z'){
        // Forward direction faces +Z or -Z; both sides must be open in neighbor faces now
        const forwardFace = dir===1 ? 'posZ' : 'negZ';
        const backwardFace = dir===1 ? 'negZ' : 'posZ';
  // Ensure the stair itself exposes emptiness in its forward boundary face (landing side)
  expect(middleFaceOpen(stair, forwardFace)).toBe(true);
  // We do NOT require backward face to be open in the stair itself (step may occupy it)
        // Ensure at least one non-stair candidate satisfies openness for both directions
        const candidates = nonStairs.filter(p=> middleFaceOpen(p, forwardFace==='posZ'?'negZ':'posZ') && middleFaceOpen(p, backwardFace==='posZ'?'negZ':'posZ'));
        expect(candidates.length).toBeGreaterThan(0);
      } else if (axis==='x') {
        const forwardFace = dir===1 ? 'posX' : 'negX';
        const backwardFace = dir===1 ? 'negX' : 'posX';
  expect(middleFaceOpen(stair, forwardFace)).toBe(true);
        const candidates = nonStairs.filter(p=> middleFaceOpen(p, forwardFace==='posX'?'negX':'posX') && middleFaceOpen(p, backwardFace==='posX'?'negX':'posX'));
        expect(candidates.length).toBeGreaterThan(0);
      }
    }
  });
});
