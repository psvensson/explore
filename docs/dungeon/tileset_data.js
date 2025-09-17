// tileset_data.js
// Canonical ordered tile definitions (pure data; no NDWFC side-effects).
// Keep ordering EXACT to preserve prototype indices relied on by tests.
export const TILE_DEFS = [
  // 0: Open space with solid floor & ceiling (middle empty)
  { tileId: 1, layers: [
      ["111","000","111"],
      ["111","000","111"],
      ["111","000","111"],
    ], transforms: [], meta:{ weight:4 } },
  // 1: Solid cube
  { tileId: 1, layers: [
      ["111","111","111"],
      ["111","111","111"],
      ["111","111","111"],
    ], transforms: [], meta:{ weight:2 } },
  // 2: Corridor variant (straight)
  { tileId: 0, layers: [
      ["111","111","111"],
      ["111","000","111"],
      ["111","000","111"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ weight:3 } },
  // 3: Side wall thinning
  { tileId: 0, layers: [
      ["111","111","111"],
      ["111","100","111"],
      ["111","100","111"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ weight:1.5 } },
  // 4: Tapered corner
  { tileId: 0, layers: [
      ["111","111","111"],
      ["111","100","111"],
      ["111","000","111"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ weight:1.5 } },
  // 5: +Z stair
  { tileId: 31, layers: [
      ["111","111","111"],
      ["111","020","010"],
      ["111","000","000"],
    ], transforms: [], meta:{ role:'stair', axis:'z', dir: 1, weight:0.8 } },
  // 6: -Z stair
  { tileId: 32, layers: [
      ["111","000","000"],
      ["111","020","010"],
      ["111","111","111"],
    ], transforms: [], meta:{ role:'stair', axis:'z', dir: -1, weight:0.8 } },
  // 7: +X stair
  { tileId: 33, layers: [
      ["111","101","111"],
      ["111","020","000"],
      ["111","000","000"],
    ], transforms: [], meta:{ role:'stair', axis:'x', dir: 1, weight:0.8 } },
  // 8: -X stair
  { tileId: 34, layers: [
      ["111","000","000"],
      ["111","020","000"],
      ["111","101","111"],
    ], transforms: [], meta:{ role:'stair', axis:'x', dir: -1, weight:0.8 } },
  // 9: Structural variant A
  { tileId: 0, layers: [
      ["111","111","111"],
      ["111","000","111"],
      ["111","111","111"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ weight:2 } },
  // 10: Duplicate of variant A for weighting
  { tileId: 0, layers: [
      ["111","111","111"],
      ["111","000","111"],
      ["111","111","111"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ weight:2 } },
  // 11: Compact open with pillars (no rotations)
  { tileId: 0, layers: [
      ["111","111","111"],
      ["111","000","111"],
      ["111","111","111"],
    ], transforms: [], meta:{ weight:1 } },
  // 12: Landing (tileId 50) – solid floor, empty mid, open top
  { tileId: 50, layers: [
      ["111","000","000"],
      ["111","000","000"],
      ["111","000","000"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ role:'landing', landing:true, weight:0.6 } },
];

export default TILE_DEFS;
