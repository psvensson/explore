# Map Editor Debugging Guide

## Logging Added for Diagnostics

I've added comprehensive logging to help diagnose why the grid isn't visible and tiles can't be placed. Here's what to look for in the browser console:

## Key Logging Points

### 1. Map Editor Initialization (`docs/ui/map_editor.js`)

**Look for:**
```
[MapEditor] Starting initialization...
[MapEditor] UI created
[MapEditor] Event listeners set up
[MapEditor] Default structures loaded
[MapEditor] Editor activated
```

**What it tells you:**
- If initialization completes successfully
- Which step might be failing

### 2. Tab Navigation (`docs/ui/widgets/main-tabs-simple.js`)

**Look for:**
```
[MainTabs] Starting map editor initialization...
[MainTabs] MapEditor class imported
[MainTabs] Map editor prerequisites: {
  container: true/false,
  renderer: true/false,
  rendererCanvas: true/false,
  rendererCamera: true/false,
  rendererScene: true/false,
  rendererTHREE: true/false,
  existingEditor: true/false
}
```

**What to check:**
- Are all prerequisites `true`?
- If any are `false`, that's likely the problem
- `renderer` must exist before map editor can initialize

### 3. DOM Elements (`docs/ui/map_editor.js` - createUI)

**Look for:**
```
[MapEditor] DOM elements found: {
  canvas: true/false,
  palette: true/false,
  allControlsFound: true/false
}

[MapEditor] Canvas details: {
  width: number,
  height: number,
  offsetWidth: number,
  offsetHeight: number,
  boundingRect: {...},
  display: "block" or "none",
  position: "absolute",
  zIndex: "100",
  pointerEvents: "all",
  visibility: "visible",
  opacity: "1",
  parent: "map-editor-viewport"
}
```

**What to check:**
- Canvas should have non-zero dimensions
- `display` should be something other than "none"
- `pointerEvents` should be "all"
- `visibility` should be "visible"
- `opacity` should be "1" (or close to it)

### 4. Canvas Resizing (`docs/ui/map_editor.js` - resizeCanvas)

**Look for:**
```
[MapEditor] resizeCanvas called {
  rendererCanvas: true/false,
  canvas: true/false,
  overlay: true/false
}

[MapEditor] Renderer canvas rect: {
  width: number,
  height: number,
  top: number,
  left: number
}

[MapEditor] Canvas resized to: {
  width: number,
  height: number,
  styleWidth: "XXXpx",
  styleHeight: "XXXpx",
  offsetParent: true/false,
  display: "block"
}
```

**What to check:**
- Canvas dimensions should match renderer canvas
- If width/height are 0, the canvas isn't sizing correctly
- `offsetParent` being `false` means element is hidden (display:none or visibility:hidden)

### 5. GridOverlay Construction (`docs/ui/utils/grid-overlay.js`)

**Look for:**
```
[MapEditor] Creating GridOverlay with: {
  canvas: true/false,
  camera: true/false,
  THREE: true/false
}
[MapEditor] GridOverlay created
```

**What to check:**
- All three parameters should be `true`
- If `camera` or `THREE` is false, renderer isn't properly initialized

### 6. Grid Rendering (`docs/ui/utils/grid-overlay.js` - render)

**Look for:**
```
[GridOverlay] Starting render {
  canvasWidth: number,
  canvasHeight: number,
  currentLayer: 0,
  gridSize: 9,
  hoveredCell: null or {x,y,z}
}

[GridOverlay] Grid points generated: number
[GridOverlay] Drew X visible grid points out of Y
```

**What to check:**
- Canvas dimensions should be > 0
- Grid points should be generated (e.g., 441 points for 21×21 grid)
- Visible points should be > 0 (if 0, camera might be looking away from grid)

### 7. Mouse Events (`docs/ui/map_editor.js` - handleMouseMove)

**Look for (first 3 events only):**
```
[MapEditor] Mouse move event: {
  clientX: number,
  clientY: number,
  rectLeft: number,
  rectTop: number,
  mouseX: number,
  mouseY: number,
  overlayExists: true/false,
  overlayScreenToGrid: "function"
}

[MapEditor] Grid position result: {x, y, z} or null
```

**What to check:**
- If no mouse events appear, canvas isn't receiving events
- If `overlayExists` is false, GridOverlay failed to initialize
- If grid position is always null, raycasting is failing

### 8. Raycasting (`docs/ui/utils/grid-overlay.js` - screenToGrid)

**Look for (first 3 calls only):**
```
[GridOverlay] screenToGrid called: {
  mouseX: number,
  mouseY: number,
  rect: {...},
  localX: number,
  localY: number,
  camera: true/false,
  raycastPlane: true/false,
  currentLayer: 0,
  gridSize: 9
}

[GridOverlay] NDC mouse: { x: -1 to 1, y: -1 to 1 }
[GridOverlay] Raycaster set: {
  origin: Vector3,
  direction: Vector3
}
[GridOverlay] Intersection found: { x, y, z }
[GridOverlay] Grid position: { x, y, z }
```

**What to check:**
- `camera` and `raycastPlane` must be `true`
- NDC coordinates should be within -1 to 1 range
- If "No intersection with raycast plane" appears, camera is looking parallel to or away from the plane

### 9. Editor Activation (`docs/ui/map_editor.js` - activate)

**Look for:**
```
[MapEditor] Activating editor mode...
[MapEditor] Renderer editor mode set to true
[MapEditor] Canvas resized
[MapEditor] Overlay rendered
[MapEditor] State synced with renderer
```

**What to check:**
- All steps should complete without errors
- If activation doesn't complete, check which step fails

## Common Problems & Solutions

### Problem: Canvas has zero dimensions
**Symptoms:** Canvas width/height are 0
**Cause:** Renderer canvas not visible or not sized yet
**Solution:** Check that 3D renderer initialized first, scene-viewer-container is visible

### Problem: No mouse events
**Symptoms:** No "[MapEditor] Mouse move event" logs
**Cause:** Canvas not receiving pointer events
**Solution:** Check CSS pointer-events property, z-index, and canvas position in DOM

### Problem: Grid not visible
**Symptoms:** "Drew 0 visible grid points"
**Cause:** Camera looking away from grid plane, or canvas not rendering
**Solution:** Check camera position, grid plane Y level, canvas context

### Problem: No raycast intersections
**Symptoms:** "No intersection with raycast plane"
**Cause:** Camera parallel to grid plane or looking away
**Solution:** Adjust camera angle, verify raycast plane normal and distance

### Problem: GridOverlay fails to initialize
**Symptoms:** Error during GridOverlay construction
**Cause:** Missing THREE.js reference or camera
**Solution:** Ensure renderer.THREE and renderer.camera exist before map editor init

## How to Test

1. **Open browser console** (F12 or right-click → Inspect → Console)

2. **Clear console** to see fresh logs

3. **Click "Map Editor" tab**

4. **Look for the log sequence:**
   - MainTabs initialization
   - MapEditor initialization
   - GridOverlay creation
   - Canvas sizing
   - Grid rendering
   - Mouse events (move cursor over 3D view)

5. **Check for errors or warnings** (red or yellow text)

6. **Note which step fails** - the last successful log before an error

## Expected Successful Flow

```
[MainTabs] Starting map editor initialization...
[MainTabs] MapEditor class imported
[MainTabs] Map editor prerequisites: { all true }
[MainTabs] Creating new MapEditor instance...
[MapEditor] Starting initialization...
[MapEditor] UI created
[MapEditor] DOM elements found: { all true }
[MapEditor] Canvas details: { width: 800+, height: 600+, display: "block", ... }
[MapEditor] Creating GridOverlay with: { all true }
[MapEditor] GridOverlay created
[MapEditor] Event listeners set up
[MapEditor] Default structures loaded
[MapEditor] Editor activated
[MapEditor] Activating editor mode...
[MapEditor] Renderer editor mode set to true
[MapEditor] resizeCanvas called { all true }
[MapEditor] Renderer canvas rect: { width: 800+, height: 600+ }
[MapEditor] Canvas resized to: { width: 800+, height: 600+ }
[MapEditor] Overlay rendered
[GridOverlay] Starting render { canvasWidth: 800+, canvasHeight: 600+, ... }
[GridOverlay] Grid points generated: 441
[GridOverlay] Drew 100+ visible grid points out of 441
[MapEditor] State synced with renderer
[MainTabs] Map editor initialized
--- Move mouse over 3D view ---
[MapEditor] Mouse move event: { ... }
[GridOverlay] screenToGrid called: { ... }
[GridOverlay] NDC mouse: { x: 0.5, y: -0.3 }
[GridOverlay] Raycaster set: { ... }
[GridOverlay] Intersection found: { x: 18, y: 0, z: 27 }
[GridOverlay] Grid position: { x: 2, y: 0, z: 3 }
[MapEditor] Grid position result: { x: 2, y: 0, z: 3 }
```

## Reporting Issues

When reporting the problem, please include:

1. **Full console log** from clicking "Map Editor" tab
2. **Any error messages** (red text)
3. **Browser and version** (Chrome, Firefox, etc.)
4. **Screen resolution**
5. **Whether 3D view works** before switching to map editor

This will help identify exactly where the initialization is failing!
