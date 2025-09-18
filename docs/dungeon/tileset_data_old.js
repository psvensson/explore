// tileset_data.js
// Canonical ordered tile definitions for traversable dungeon generation
// Keep ordering EXACT to preserve prototype indices relied on by tests.
export const TILE_DEFS = [
  // 0: Open floor space - guaranteed traversable center
  { tileId: 0, layers: [
      ["111","111","111"],
      ["101","000","101"],  // Center always passable, walls on sides
      ["111","111","111"],
    ], transforms: [], meta:{ weight: 8 } },

  // 1: Solid wall/rock (use sparingly for connectivity) 
  { tileId: 1, layers: [
      ["111","111","111"],
      ["111","111","111"],
      ["111","111","111"],
    ], transforms: [], meta:{ weight: 3 } },

  // 2: North-South corridor
  { tileId: 0, layers: [
      ["111","111","111"],
      ["101","000","101"],  // Vertical corridor: walls-space-walls
      ["111","111","111"],
    ], transforms: ["ry"], meta:{ weight: 12 } },

  // 3: L-corner (connects North + East)
  { tileId: 0, layers: [
      ["111","111","111"],
      ["101","000","011"],  // L-shape: blocked SW, open NE
      ["111","111","111"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ weight: 8 } },

  // 4: T-junction (connects North + East + West, blocked South)
  { tileId: 0, layers: [
      ["111","111","111"],
      ["000","000","000"],  // T-shape: open top row, blocked bottom
      ["111","111","111"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ weight: 6 } },

  // 5: Cross intersection (connects all 4 directions)
  { tileId: 0, layers: [
      ["111","111","111"],
      ["010","000","010"],  // Cross: corridors in 4 directions, corner pillars
      ["111","111","111"],
    ], transforms: [], meta:{ weight: 1.5 } },

  // 6: Room part
  { tileId: 0, layers: [
      ["111","111","111"],
      [ "100",
        "100",
        "100"],
      ["111","111","111"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ weight: 2.5 } },

  // 7: Dead end (corridor terminus)
  { tileId: 0, layers: [
      ["111","111","111"],
      [ "111",
        "101",
        "101"],
      ["111","111","111"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ weight: 2 } },

  // 8: +Z stair (going up) --------------------------------------------------------------------
  { tileId: 31, layers: [
      [ "111",
        "111",
        "111"],
      [ "111",
        "020",
        "010"],
      [ "111",
        "000",
        "000"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ role:'stair', axis:'z', dir: 1, weight: 0.1 } },

  // 9: -Z stair (going down)
  { tileId: 32, layers: [
      [ "111",
        "000",
        "000"],
      [ "111",
        "020",
        "010"],
      [ "111",
        "111",
        "111"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ role:'stair', axis:'z', dir: -1, weight: 0.1 } },

  // 10: +X stair (going up in X direction)
  { tileId: 33, layers: [
      [ "111",
        "101",
        "111"],
      [ "111",
        "020",
        "000"],
      [ "111",
        "000",
        "000"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ role:'stair', axis:'x', dir: 1, weight: 0.1 } },

  // 11: -X stair (going down in X direction) --------------------------------------------------
  { tileId: 34, layers: [
      [ 
        "111",
        "000",
        "000"],
      [ "111",
        "020",
        "000"],
      [ "111",
        "101",
        "111"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ role:'stair', axis:'x', dir: -1, weight: 0.1 } },

  // 12: Landing (open space above/below stairs)
  { tileId: 50, layers: [
      ["111","111","111"],
      [ "111",
        "000",
        "111"],
      ["000","000","000"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ role:'landing', landing:true, weight: 0.2 } },
];

export default TILE_DEFS;
