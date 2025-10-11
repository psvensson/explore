# Map Editor Fix #2 - THREE Reference Issue

## Problem Identified

**Error:** `[GridOverlay] screenToGrid: window.THREE not available`  
**Result:** 
- Grid points generated (441) but 0 visible
- Raycasting failing (all positions returning null)
- Mouse movements not converting to grid coordinates

## Root Cause

GridOverlay was using `window.THREE` everywhere, but the constructor was receiving the THREE object **directly as a parameter** (not from window). The code was checking the wrong source.

**Constructor signature was:**
```javascript
constructor(canvas, camera, THREE) // ← Third param is THREE object
```

**But code was using:**
```javascript
if (!window.THREE) return null; // ❌ Wrong - checking window
new window.THREE.Vector3() // ❌ Wrong - using window
```

## Fix Applied

Changed all references from `window.THREE` to `this.THREE`:

### File: `docs/ui/utils/grid-overlay.js`

1. **Constructor** - Store THREE reference:
```javascript
constructor(canvas, camera, THREE) {
  this.THREE = THREE; // ✅ Store it as instance property
  // ...
}
```

2. **updateRaycastPlane()** - Use stored reference:
```javascript
this.raycastPlane = new this.THREE.Plane(
  new this.THREE.Vector3(0, 1, 0),
  -planeY
);
```

3. **screenToGrid()** - Use stored reference:
```javascript
if (!this.THREE) return null; // ✅ Check instance property
const mouse = new this.THREE.Vector2(...);
const raycaster = new this.THREE.Raycaster();
const intersection = new this.THREE.Vector3();
```

4. **worldToScreen()** - Use stored reference:
```javascript
const vector = new this.THREE.Vector3(worldPos.x, worldPos.y, worldPos.z);
```

## Expected Results After Fix

When you refresh and open Map Editor:

✅ No more "window.THREE not available" warnings  
✅ Grid points will be visible (100+ out of 441)  
✅ Mouse movements will show grid coordinates  
✅ Raycasting will work (clicking will place tiles)  

## Test Results

✅ **226/226 tests passing** - No regressions

## Next Steps

1. **Refresh browser** (Ctrl+R)
2. **Click "Map Editor" tab**
3. **Look for these success indicators:**
   - `[GridOverlay] Drew 100+ visible grid points out of 441` ✅
   - `[GridOverlay] Grid position: {x: 2, y: 0, z: 3}` ✅
   - Status bar shows `Position: (2, 0, 3)` when hovering ✅

The grid should now be visible as small crosses on the 3D viewport!
