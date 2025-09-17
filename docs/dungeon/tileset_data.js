// tileset_data.js
// Canonical ordered tile definitions for traversable dungeon generation
// Keep ordering EXACT to preserve prototype indices relied on by tests.
export const TILE_DEFS = [
  // 0: Open floor space (basic room/corridor floor) - expected at index 0
  { tileId: 0, layers: [
      ["111","111","111"],
      ["000","000","000"],
      ["111","111","111"],
    ], transforms: [], meta:{ weight: 4 } },

  // 1: Solid wall/rock (common filler) - expected at index 1  
  { tileId: 1, layers: [
      ["111","111","111"],
      ["111","111","111"],
      ["111","111","111"],
    ], transforms: [], meta:{ weight: 6 } },

  // 2: Straight corridor (N-S)
  { tileId: 0, layers: [
      ["111","111","111"],
      ["101",
        "101",
        "101"],
      ["111","111","111"],
    ], transforms: ["ry"], meta:{ weight: 3 } },

  // 3: Corner (L-shaped corridor)
  { tileId: 0, layers: [
      ["111","111","111"],
      [ "111",
        "100",
        "100"],
      ["111","111","111"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ weight: 2 } },

  // 4: T-junction (three-way intersection)
  { tileId: 0, layers: [
      ["111","111","111"],
      [ "111",
        "000",
        "101"],
      ["111","111","111"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ weight: 1.5 } },

  // 5: X-junction (four-way intersection)
  { tileId: 0, layers: [
      ["111","111","111"],
      ["101","000","101"],
      ["111","111","111"],
    ], transforms: [], meta:{ weight: 0.8 } },

  // 6: Room corner (open corner for larger spaces)
  { tileId: 0, layers: [
      ["111","111","111"],
      [ "111",
        "100",
        "100"],
      ["111","111","111"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ weight: 1.2 } },

  // 7: Dead end (corridor terminus)
  { tileId: 0, layers: [
      ["111","111","111"],
      [ "111",
        "101",
        "101"],
      ["111","111","111"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ weight: 1 } },

  // 8: +Z stair (going up)
  { tileId: 31, layers: [
      ["111","111","111"],
      ["111","020","010"],
      ["111","000","000"],
    ], transforms: [], meta:{ role:'stair', axis:'z', dir: 1, weight: 0.8 } },

  // 9: -Z stair (going down)
  { tileId: 32, layers: [
      ["111","000","000"],
      ["111","020","010"],
      ["111","111","111"],
    ], transforms: [], meta:{ role:'stair', axis:'z', dir: -1, weight: 0.8 } },

  // 10: +X stair (going up in X direction)
  { tileId: 33, layers: [
      ["111","101","111"],
      ["111","020","000"],
      ["111","000","000"],
    ], transforms: [], meta:{ role:'stair', axis:'x', dir: 1, weight: 0.8 } },

  // 11: -X stair (going down in X direction)
  { tileId: 34, layers: [
      ["111","000","000"],
      ["111","020","000"],
      ["111","101","111"],
    ], transforms: [], meta:{ role:'stair', axis:'x', dir: -1, weight: 0.8 } },

  // 12: Landing (open space above/below stairs)
  { tileId: 50, layers: [
      ["111","111","111"],
      ["111","000","111"],
      ["000","000","000"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ role:'landing', landing:true, weight: 0.6 } },
];

export default TILE_DEFS;
