# Renderer Module - Coordinate System Documentation

## Recent Updates

### 3D Structure Preview Implementation ✅ COMPLETE
- **Feature**: Interactive 3D preview in Structure Editor using reusable renderer components
- **Implementation**: `showQuickPreview()` in SimplifiedTilesetEditor now shows live 3D mesh
- **Reusability**: Uses `makeScene`, `addBasicLights`, `convertStructureToMesh`, `makeOrbitControls` from existing renderer
- **Fallback**: Gracefully falls back to 2D voxel view if THREE.js unavailable
- **Integration**: Full OrbitControls support for interactive 3D navigation

## Historical Issues & Solutions

### 2025-09-29: Coordinate System Regression - "Tilt" Issue RESOLVED ✅
**Problem**: Meshes appeared "tilted the wrong way" - coordinate system confusion causing incorrect mesh positioning.

**Root Cause**: Wall positioning in `emitWalls()` function used thickness-based coordinates instead of grid-based coordinates:
```javascript
// INCORRECT (caused tilt):
const pz = (z<=1) ? (0+t/2) : (unit-t/2);  // Results in 0.05, 2.95
const px = (x<=1) ? (0+t/2) : (unit-t/2);  // Results in 0.05, 2.95

// CORRECT (fixed tilt):  
const pz = z*f + f/2;  // Results in 0.5, 1.5, 2.5
const px = x*f + f/2;  // Results in 0.5, 1.5, 2.5
```

**Symptoms Detected**:
- Suspicious mesh positions: `(1.5, 1.5, 0.05)` and `(1.5, 1.5, 2.95)`
- Z-coordinates using Y-level values (0.05/2.95) instead of grid values (0.5/1.5/2.5)

**Solution Applied**: 
1. Unified all mesh positioning to use consistent grid-based coordinate mapping
2. Fixed `emitWalls()` function coordinate calculations
3. Created comprehensive coordinate analysis tests for early detection

**Prevention**: 
- Always use `*f + f/2` pattern for grid positioning
- Reserve thickness (`t`) only for visual offsets (floor/ceiling height adjustments)
- Run `tests/coordinate_analysis.test.js` to detect coordinate axis confusion

**Verification**: Issue resolved - all coordinate analysis tests pass, no suspicious mesh positions detected.MPORTANT**: This module handles the conversion between tileset data coordinate system and Three.js 3D rendering coordinate system. **Coordinate system mismatches cause visual rotation/tilt bugs.**

## Coordinate System Standards

### **Tileset Data Format (Y-Up Convention)**
```javascript
// Tileset structure format: structure[layer][row][col]
structure: [
  // Layer 0 (Y=0, bottom/floor)
  [[1,1,1], [1,0,1], [1,1,1]], // row 0, 1, 2 (Z-axis, depth)
  //  ^ ^ ^   columns 0,1,2 (X-axis, width)
  
  // Layer 1 (Y=1, middle)
  [[1,0,1], [0,0,0], [1,0,1]],
  
  // Layer 2 (Y=2, top/ceiling)  
  [[1,1,1], [1,0,1], [1,1,1]]
]
```

**Dimensions Mapping:**
- `structure[layer][row][col]` = `structure[Y][Z][X]`
- **Layer** = Y-axis (height/vertical) - 0=bottom, 2=top
- **Row** = Z-axis (depth/forward-back) - 0=near, 2=far  
- **Col** = X-axis (width/left-right) - 0=left, 2=right

### **Three.js World Coordinate System**
```javascript
// Three.js uses standard right-handed coordinate system:
// +X = right
// +Y = up  
// +Z = toward viewer (out of screen)

mesh.position.set(x, y, z);
//                |  |  |
//                |  |  +-- depth (Z-axis)
//                |  +-- height (Y-axis) 
//                +-- width (X-axis)
```

## **CRITICAL CONVERSION RULES**

### **Correct Mesh Generation Pattern**
```javascript
// ✅ CORRECT coordinate mapping:
for (let layer = 0; layer < structure.length; layer++) {          // Y (height)
  for (let row = 0; row < structure[layer].length; row++) {       // Z (depth)  
    for (let col = 0; col < structure[layer][row].length; col++) { // X (width)
      if (structure[layer][row][col] === 1) {
        cube.position.set(
          col * tileSize,    // X = col (width coordinate)
          layer * tileSize,  // Y = layer (height coordinate)
          row * tileSize     // Z = row (depth coordinate)  
        );
      }
    }
  }
}
```

### **Common Coordinate System Bugs**

❌ **WRONG - Treats first dimension as Z:**
```javascript
// This causes 90-degree rotation bugs!
for (let z = 0; z < structure.length; z++) {
  for (let y = 0; y < structure[z].length; y++) {
    for (let x = 0; x < structure[z][y].length; x++) {
      // structure[z][y][x] is actually structure[layer][row][col] = structure[Y][Z][X]
      const v = vox[z][y][x]; // WRONG MAPPING!
    }
  }
}
```

## **File Responsibilities**

### **Core Mesh Generation**
- **`wfc_tile_mesh.js`** - Converts tileset structures to Three.js meshes
  - `buildTileMesh()` - Main WFC tile mesh generation function
  - `convertStructureToMesh()` - Utility function for structure → mesh conversion
  - `processVoxels()` - Processes individual voxels with correct coordinate mapping
  - **MUST follow Y-up → Three.js mapping rules**

### **WFC Integration**  
- **`wfc_generate.js`** - Generates dungeons using Wave Function Collapse
- **`renderer.js`** - Three.js scene setup and management

## **Historical Issues & Fixes**

### **Coordinate System Regression (Fixed Sept 2025)**
- **Problem**: Tiles appeared rotated/tilted due to wrong coordinate mapping
- **Root Cause**: Functions treating `vox[z][y][x]` instead of `vox[y][z][x]`
- **Solution**: Updated all voxel processing functions to use correct coordinate order

### **Functions Fixed**:
- `rotateYOnce()`, `equalVox()`, `hasStairVoxel()`, `detectStairDirection()`
- `processVoxels()`, `classifyMid()`, `convertStructureToMesh()`

## **Testing & Debug**

```javascript
// Enable coordinate debugging:
window.__RENDER_DEBUG__ = true;
window.__SHOW_TILE_IDS = true;

// Add coordinate helper axes to scene:
const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper); // Red=X, Green=Y, Blue=Z
```

## **Future Development**

⚠️ **Always verify coordinate system consistency** when:
- Adding new tileset structures or mesh generation features
- Modifying WFC generation or voxel processing logic
- Debugging visual issues (check mesh generation first)

**Remember**: `structure[layer][row][col]` = `structure[Y][Z][X]` → `position.set(X, Y, Z)`

```javascript
document.addEventListener('DOMContentLoaded', () => {
    initRenderer();
});
```

## Dependencies
This component relies on the Three.js library. Ensure that it is included in your project before using the Renderer component.

## Conclusion
The Renderer component is a crucial part of the dungeon visualization project, providing an interactive 3D experience. For further details on integration with other components, refer to the main project README and the documentation for the UI and Dungeon components.

## WFC Dungeon Generation

The function `window.generateWFCDungeon({x,y,z})` dynamically imports the tileset, WFC implementation, and mesh utilities, then:

1. Initializes / registers tiles via `initializeTileset()`.
2. Runs the WFC solver to produce a voxel grid.
3. Converts the voxel grid to tile placements.
4. Lazily ensures a Three.js namespace (`window.THREE` if already loaded by bootstrap, else dynamic import).
5. Builds meshes and updates the main scene via `updateDungeonMesh`.
6. Initializes the mini tile selection viewer (needs a valid THREE reference first).

### Important Ordering Detail
`THREERef` must be acquired **before** calling `setupMiniViewer` (or any function that uses THREE). A previous bug referenced `THREERef` prior to its declaration, causing the runtime error:

```
ReferenceError: can't access lexical declaration 'THREERef' before initialization
```

This was fixed by moving the acquisition of `THREERef` above the first usage. When modifying `generateWFCDungeon`, preserve this ordering.

### Re-import Behavior
If `window.THREE` already exists (bootstrapped on page load), the code reuses it to avoid duplicate network requests. Otherwise it performs a dynamic `import()` from the CDN.