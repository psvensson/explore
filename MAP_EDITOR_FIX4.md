# Map Editor Fix #4 - Method Name & Coordinate System

## Problems Fixed

### 1. ❌ TypeError: `this.state.getTileAt is not a function`

**Error:** When clicking, the code tried to call `getTileAt()` which doesn't exist  
**Cause:** Method name mismatch - MapEditorState has `getTile()` not `getTileAt()`  
**Fix:** Changed method call from `getTileAt(x, y, z)` to `getTile(x, y, z)`

**File:** `docs/ui/map_editor.js` - `handleMouseClick()` method

### 2. ❌ Negative coordinates and wrong NDC values

**Symptoms:**
- `localY: -192` (negative, outside canvas)
- `NDC y: 1.22` (outside -1 to 1 range)
- 0 visible grid points
- No raycast intersections

**Root Cause:** Double coordinate transformation!

The `screenToGrid()` method was treating mouseX/mouseY as **screen coordinates** and subtracting `rect.left/top` again, but they were **already canvas-relative** coordinates calculated in `handleMouseMove()`.

**Before (Broken):**
```javascript
// In handleMouseMove():
this.mouseX = event.clientX - rect.left;  // ✅ Canvas-relative
this.mouseY = event.clientY - rect.top;   // ✅ Canvas-relative

// In screenToGrid():
const rect = this.canvas.getBoundingClientRect();
const x = mouseX - rect.left;  // ❌ Subtracting again!
const y = mouseY - rect.top;   // ❌ Double transformation!
```

Result: Coordinates went **negative** because we subtracted the offset twice!

**After (Fixed):**
```javascript
// In screenToGrid():
const x = mouseX;  // ✅ Already canvas-relative
const y = mouseY;  // ✅ Use directly

// Use canvas dimensions for NDC:
const mouse = new this.THREE.Vector2(
  (x / this.canvas.width) * 2 - 1,
  -(y / this.canvas.height) * 2 + 1
);
```

## Changes Made

### File: `docs/ui/map_editor.js`
```javascript
// Line ~370 - Fixed method name
- const existingTile = this.state.getTileAt(x, y, z);
+ const existingTile = this.state.getTile(x, y, z);
```

### File: `docs/ui/utils/grid-overlay.js`
```javascript
// screenToGrid() method - Fixed coordinate system
- const rect = this.canvas.getBoundingClientRect();
- const x = mouseX - rect.left;  // Wrong: double transformation
- const y = mouseY - rect.top;

+ const x = mouseX;  // Correct: already canvas-relative
+ const y = mouseY;

// Use canvas dimensions not rect for NDC
- const mouse = new this.THREE.Vector2(
-   (x / rect.width) * 2 - 1,
-   -(y / rect.height) * 2 + 1
- );

+ const mouse = new this.THREE.Vector2(
+   (x / this.canvas.width) * 2 - 1,
+   -(y / this.canvas.height) * 2 + 1
+ );
```

## Expected Results

After refresh, you should see:

✅ **Positive coordinates:**
```
localX: 238 (positive, within canvas)
localY: 71 (positive, within canvas)
```

✅ **Valid NDC coordinates:**
```
NDC mouse: { x: -0.829, y: -0.918 } ← Both within -1 to 1
```

✅ **Raycast intersections:**
```
[GridOverlay] Intersection found: { x: -15, y: 0, z: 42 }
[GridOverlay] Grid position: { x: -2, y: 0, z: 5 }
```

✅ **Visible grid:**
```
[GridOverlay] Drew 150+ visible grid points out of 441
```

✅ **No click errors** - getTile() will work correctly

## Test Results

✅ **226/226 tests passing** - No regressions

## What This Fixes

- ✅ Click handler won't throw TypeError
- ✅ Mouse coordinates will be correct (positive, in bounds)
- ✅ NDC coordinates will be valid (-1 to 1 range)
- ✅ Raycasting will find intersections
- ✅ Grid will be visible on canvas
- ✅ Tile placement will work

## Next Steps

1. **Refresh browser** (Ctrl+R)
2. **Click "Map Editor" tab**
3. **Move mouse over 3D view** - should show coordinates
4. **Click to place tiles** - should work without errors!

The coordinate system is now correct - no more double transformations!
