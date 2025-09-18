// tileset_data.js
// Canonical ordered tile definitions for traversable dungeon generation
// Keep ordering EXACT to preserve prototype indices relied on by tests.
const TILE_DEFS = [
  // 0: Cross intersection (connects all 4 directions) 
  { tileId: 0, layers: [
      ["111","111","111"],
      ["101","000","101"],  // + shape: openings N,E,S,W
      ["111","111","111"],
    ], transforms: [], meta:{ weight: 4 } },

  // 1: Solid wall/rock (use sparingly for connectivity) 
  { tileId: 1, layers: [
      ["111","111","111"],
      ["111","111","111"],
      ["111","111","111"],
    ], transforms: [], meta:{ weight: 3 } },

  // 2: North-South corridor (vertical passage)
  { tileId: 0, layers: [
      ["111","111","111"],
      ["111","000","111"],  // Vertical line: open N-S, walls E-W
      ["111","111","111"],
    ], transforms: ["ry"], meta:{ weight: 12 } },

  // 3: L-corner (connects two adjacent directions)
  { tileId: 0, layers: [
      ["111","111","111"],
      ["111","000","011"],  // L-shape: open N+E, walls S+W
      ["111","111","111"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ weight: 8 } },

  // 4: T-junction (connects 3 directions)
  { tileId: 0, layers: [
      ["111","111","111"],
      ["101","000","111"],  // T-shape: open N+E+W, blocked S
      ["111","111","111"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ weight: 6 } },

  // 5: Open room (large traversable space)
  { tileId: 0, layers: [
      ["111","111","111"],
      ["000","000","000"],  // Full 3x3 open space
      ["111","111","111"],
    ], transforms: [], meta:{ weight: 6 } },

  // 6: Dead-end corridor (open to one direction only)
  { tileId: 0, layers: [
      ["111","111","111"],
      ["101","101","111"],  // Single opening north only
      ["111","111","111"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ weight: 5 } },

  // 7: Small pillar room (open space with center obstacle)
  { tileId: 0, layers: [
      ["111","111","111"],
      ["000","010","000"],  // Open with center pillar
      ["111","111","111"],
    ], transforms: [], meta:{ weight: 3 } },

  // 8: Stair down (going to lower level)
  { tileId: 2, layers: [
      ["111","111","111"],
      ["101","000","101"],  // Traversable center with stairs
      ["111","111","111"],
    ], transforms: [], meta:{ weight: 1 } },

  // 9: Stair up (going to upper level)
  { tileId: 3, layers: [
      ["111","111","111"],
      ["101","000","101"],  // Traversable center with stairs
      ["111","111","111"],
    ], transforms: [], meta:{ weight: 1 } }
];

export default TILE_DEFS;