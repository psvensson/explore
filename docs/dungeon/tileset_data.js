// tileset_data.js
// Canonical ordered tile definitions for traversable dungeon generation
// Each tile shows a 3x3 grid visualization of its middle layer for easy understanding
// Keep ordering EXACT to preserve prototype indices relied on by tests.

const TILE_DEFS = [
  // 0: Cross intersection (connects all 4 directions)
  // Middle layer pattern:
  // 1 0 1
  // 0 0 0  
  // 1 0 1
  { tileId: 100, layers: [
      ["111","111","111"],  // Floor layer
      [
        "101",  // 1 0 1
        "000",  // 0 0 0
        "101"   // 1 0 1
      ],
      ["111","111","111"],  // Ceiling layer
    ], transforms: [], meta:{ weight: 8 } },

  // 1: Solid wall/rock (use sparingly for connectivity)
  // Middle layer pattern:
  // 1 1 1
  // 1 1 1
  // 1 1 1
  { tileId: 101, layers: [
      ["111","111","111"],
      [
        "111",  // 1 1 1
        "111",  // 1 1 1
        "111"   // 1 1 1
      ],
      ["111","111","111"],
    ], transforms: [], meta:{ weight: 12 } },

  // 2: North-South corridor (vertical passage)
  // Middle layer pattern:
  // 1 1 1
  // 0 0 0
  // 1 1 1
  { tileId: 102, layers: [
      ["111","111","111"],
      [
        "111",  // 1 1 1
        "000",  // 0 0 0
        "111"   // 1 1 1
      ],
      ["111","111","111"],
    ], transforms: ["ry"], meta:{ weight: 8 } },

  // 3: L-corner (connects two adjacent directions)
  // Middle layer pattern:
  // 1 0 1
  // 0 0 0
  // 1 0 1 (changed from 011 to 101 for WFC compatibility)
  { tileId: 103, layers: [
      ["111","111","111"],
      [
        "111",  // 1 0 1
        "100",  // 0 0 0
        "101"   // 1 0 1 (changed from 011 to match existing north edges)
      ],
      ["111","111","111"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ weight: 8 } },

  // 4: T-junction (connects 3 directions)
  // Middle layer pattern:
  // 1 0 1
  // 0 0 0
  // 1 1 1
  { tileId: 104, layers: [
      ["111","111","111"],
      [
        "101",  // 1 0 1
        "000",  // 0 0 0
        "111"   // 1 1 1
      ],
      ["111","111","111"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ weight: 6 } },

     {tileId: 105, layers: [
      ["111","111","111"],
      [
        "100",  // 1 0 1
        "000",  // 0 0 0
        "000"   // 0 0 0
      ],
      ["111","111","111"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ weight: 8 } },

  {tileId: 106, layers: [
      ["111","111","111"],
      [
        "111",  // 1 0 1
        "100",  // 0 0 0
        "100"   // 0 0 0
      ],
      ["111","111","111"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ weight: 8 } },


  { tileId: 107, layers: [
      ["111","111","111"],
      [
        "111",  // 1 0 1
        "000",  // 0 0 0
        "000"   // 0 0 0
      ],
      ["111","111","111"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ weight: 8 } },

  // 8: Corridor opening to room
  // Middle layer pattern:
  // 1 0 1
  // 0 0 0
  // 0 0 0
  { tileId: 108, layers: [
      ["111","111","111"],
      [
        "101",  // 1 0 1
        "000",  // 0 0 0
        "000"   // 0 0 0
      ],
      ["111","111","111"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ weight: 8 } },

  // 9: Room corner
  // Middle layer pattern:
  // 1 1 1
  // 1 0 1 (changed from 100 to 101 for WFC compatibility)
  // 1 0 1 (changed from 100 to 101 for WFC compatibility)
  { tileId: 109, layers: [
      ["111","111","111"],
      [
        "111",  // 1 1 1
        "101",  // 1 0 1 (changed from 100 to match existing patterns)
        "101"   // 1 0 1 (changed from 100 to match existing patterns)
      ],
      ["111","111","111"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ weight: 8 } },

  // 10: Open room
  // Middle layer pattern:
  // 0 0 0
  // 0 0 0
  // 0 0 0
  { tileId: 110, layers: [
      ["111","111","111"],
      [
        "000",  // 0 0 0
        "000",  // 0 0 0
        "000"   // 0 0 0
      ],
      ["111","111","111"],
    ], transforms: [], meta:{ weight: 8 } },


{ tileId: 111, layers: [
      ["111","111","111"],
      [
        "000",  
        "000",  
        "000"   
      ],
      ["000","000","000"],
    ], transforms: [], meta:{ weight: 8 } },

    { tileId: 112, layers: [
      ["111","111","111"],
      [
        "111",  
        "000",  
        "000"   
      ],
      ["000","000","000"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ weight: 8 } },

{ tileId: 113, layers: [
      ["000","000","000"],
      [
        "000",  
        "000",  
        "000"   
      ],
      ["111","111","111"],
    ], transforms: [], meta:{ weight: 8 } },
    
 { tileId: 114, layers: [
      ["000","000","000"],
      [
        "111",  
        "000",  
        "000"   
      ],
      ["111","111","111"],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ weight: 8 } },


  // 11: +Z stair (lower/going up) 
  // Floor layer: solid base
  // Middle layer: stair steps with passable path
  // Ceiling layer: open above for vertical movement to upper stair
  { tileId: 201, layers: [
      [
        "111",  // 1 1 1
        "111",  // 1 1 1  
        "111"   // 1 1 1
      ],
      [
        "111",  // 1 1 1
        "020",  // 0 2 0
        "101"   // 1 0 1 (changed from 000 to match corridor patterns)
      ],
      [
        "111",  // 1 1 1
        "000",  // 0 0 0
        "000"   // 0 0 0
      ],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ 
      role:'stair', 
      stairRole: 'lower',
      axis:'z', 
      dir: 1, 
      weight: 2.0,  // Increased from 0.1 to ensure vertical connectivity
      requiredAboveEmpty: [[1,1,1], [2,1,1]]  // Center positions must be empty above
    } },

  // 12: -Z stair (upper/going down)
  // Floor layer: open below for vertical movement from lower stair
  // Middle layer: stair steps with passable path
  // Ceiling layer: solid top
  { tileId: 202, layers: [
      [
        "111",  // 1 1 1
        "000",  // 0 0 0
        "000"   // 0 0 0
      ],
      [
        "111",  // 1 1 1
        "020",  // 0 2 0
        "101"   // 1 0 1 (changed from 000 to match corridor patterns)
      ],
      [
        "111",  // 1 1 1
        "111",  // 1 1 1
        "111"   // 1 1 1
      ],
    ], transforms: ["ry","ry+ry","ry+ry+ry"], meta:{ 
      role:'stair', 
      stairRole: 'upper',
      axis:'z', 
      dir: -1, 
      weight: 2.0,  // Increased from 0.1 to ensure vertical connectivity
      requiredBelowEmpty: [[1,1,1], [0,1,1]]  // Center positions must be empty below
    } }
];

export default TILE_DEFS;