# Map Editor Fix #3 - Canvas Positioning Issue

## Problem Identified

**Symptoms:**
- Grid not visible (0 out of 441 points drawn)
- Clicks not registering
- Mouse coordinates negative: `localX: -52, localY: -595`
- NDC coordinates out of range: `x: -1.037, y: 1.714` (should be -1 to 1)
- Canvas offset from 3D view: `rectTop: 619.76, rectLeft: 291.11`

**Root Cause:**
The overlay canvas was positioned **inside `.map-editor-viewport` container** (a grid layout cell), but the actual 3D renderer canvas is in a **completely different container** (`#scene-viewer-container`). The overlay canvas needs to be positioned **exactly over** the 3D canvas to capture mouse events correctly.

## Architecture Issue

### Before (Broken):
```
<div id="map-editor-container">
  <div class="map-editor-layout"> (grid layout)
    <div class="map-editor-palette"> (left column)
    <div class="map-editor-viewport"> (right column)
      <canvas id="grid-overlay-canvas"> ❌ HERE
      
<div id="scene-viewer-container"> (separate, elsewhere)
  <canvas id="threejs-canvas"> ← Actual 3D canvas
```

**Problem:** Overlay canvas is in a different layout container than the 3D canvas!

### After (Fixed):
```
<canvas id="grid-overlay-canvas"> ✅ Positioned with fixed layout
  style="position: fixed; top: 198px; left: 0px; ..."
  
  → Covers the exact position of:
  
<canvas id="threejs-canvas"> ← 3D renderer canvas
```

## Solution Applied

### 1. Dynamic Fixed Positioning

**File:** `docs/ui/map_editor.js` - `resizeCanvas()` method

Changed canvas positioning from static (relative to parent) to **fixed** (relative to viewport):

```javascript
resizeCanvas() {
  const rect = rendererCanvas.getBoundingClientRect();
  
  // Set dimensions
  this.canvas.width = rect.width;
  this.canvas.height = rect.height;
  
  // ✅ NEW: Position canvas EXACTLY over renderer canvas
  this.canvas.style.position = 'fixed';
  this.canvas.style.top = `${rect.top}px`;
  this.canvas.style.left = `${rect.left}px`;
  this.canvas.style.pointerEvents = 'all';
  this.canvas.style.zIndex = '1000';
}
```

### 2. Scroll Event Handling

Added scroll event listener to reposition canvas when page scrolls:

```javascript
handleScroll() {
  if (this.isActive) {
    this.resizeCanvas(); // Reposition on scroll
  }
}

// In setupEventListeners():
window.addEventListener('scroll', this.handleScroll);
```

### 3. CSS Simplification

**File:** `docs/styles/main.css`

Removed static positioning since JavaScript handles it dynamically:

```css
#grid-overlay-canvas {
  /* Position and size set dynamically by JavaScript */
  cursor: crosshair;
  pointer-events: all;
}
```

## Expected Results

After refresh, the logs should show:

✅ **Correct positioning:**
```
[MapEditor] Canvas resized and repositioned to: {
  width: 2783,
  height: 1666,
  top: "198.64px",  ← Matches renderer canvas
  left: "0px",       ← Matches renderer canvas
  position: "fixed"
}
```

✅ **Valid mouse coordinates:**
```
localX: 410 (positive, within canvas)
localY: 35 (positive, within canvas)
```

✅ **Valid NDC coordinates:**
```
NDC mouse: { x: 0.295, y: -0.958 } ← Within -1 to 1 range
```

✅ **Raycast intersections:**
```
[GridOverlay] Intersection found: { x: 18, y: 0, z: 27 }
[GridOverlay] Grid position: { x: 2, y: 0, z: 3 }
```

✅ **Visible grid points:**
```
[GridOverlay] Drew 120 visible grid points out of 441
```

## Files Modified

1. **`docs/ui/map_editor.js`**:
   - Enhanced `resizeCanvas()` with fixed positioning
   - Added `handleScroll()` method
   - Bound scroll event listener
   - Added scroll cleanup in `destroy()`

2. **`docs/styles/main.css`**:
   - Simplified `#grid-overlay-canvas` (removed static positioning)

## Test Results

✅ **226/226 tests passing** - No regressions

## What This Fixes

- ✅ Canvas now covers the exact 3D viewport area
- ✅ Mouse coordinates will be correct (positive, within bounds)
- ✅ NDC coordinates will be valid (-1 to 1)
- ✅ Raycasting will hit the grid plane
- ✅ Grid will be visible (100+ points drawn)
- ✅ Clicks will place tiles
- ✅ Canvas repositions on scroll/resize

## Next Steps

1. **Refresh browser** (Ctrl+R)
2. **Click "Map Editor" tab**
3. **You should now see:**
   - Grid overlay with crosses visible on 3D viewport
   - Status bar shows coordinates when hovering
   - Clicking places tiles

The canvas is now properly positioned as a **fixed overlay** directly over the 3D renderer!
