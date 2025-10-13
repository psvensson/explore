# Mesh Style Selector - Debugging Empty Widget

## Problem
The "Visual Style" widget appears in the UI but the dropdown is empty (no styles to select).

## Root Cause
The mesh generators are initialized **asynchronously** after THREE.js loads, but the widget might initialize before the generators are ready.

## Solution Applied

I've updated the widget to:
1. ✅ Wait for generators to initialize (up to 5 seconds with retries)
2. ✅ Show "Loading styles..." message while waiting
3. ✅ Display error message if generators fail to load
4. ✅ Add extensive console logging for debugging

## Debugging Steps

### Step 1: Open Browser Console
1. Open your app in browser
2. Press **F12** or **Ctrl+Shift+I** (Chrome/Firefox)
3. Go to **Console** tab

### Step 2: Check for Initialization Logs

Look for these log messages in order:

```javascript
// ✅ These should appear:
[Render] Bootstrap check - window exists, not in Jest
[Render] Starting bootstrap - loading Three.js modules
[Render] Three.js loaded successfully, initializing mesh generators
[MeshGenerators] Initialized generators: Cubic Voxels, Low-Poly
[Render] Mesh generators initialized
[Render] Creating main renderer

// ✅ Then the widget logs:
[GeneratorPanel] Initializing mesh style selector...
[GeneratorPanel] Mesh style widget created, initializing registry...
[MeshStyleSelector] Generators loaded: ['voxel-cube', 'low-poly']
[GeneratorPanel] Registry initialized, mounting widget...
[GeneratorPanel] Widget mounted, setting up callback...
[GeneratorPanel] Mesh style selector fully initialized!
```

### Step 3: Manual Verification Commands

Run these in browser console to check state:

```javascript
// 1. Check if generators are loaded
import('./renderer/mesh-generators/index.js').then(m => {
  const registry = m.getGeneratorRegistry();
  console.log('Generator IDs:', registry.getGeneratorIds());
  console.log('Active generator:', registry.getActiveGeneratorId());
  console.log('All generators:', registry.getAllGenerators());
});
// Expected output:
// Generator IDs: ['voxel-cube', 'low-poly']
// Active generator: 'voxel-cube'
// All generators: Array(2) with generator objects

// 2. Check if THREE is loaded
console.log('THREE loaded:', typeof THREE !== 'undefined');
// Expected: true

// 3. Check widget state
const widgetContainer = document.querySelector('#mesh-style-selector-widget');
console.log('Widget container exists:', !!widgetContainer);
console.log('Widget HTML:', widgetContainer?.innerHTML.substring(0, 200));
```

## Common Issues & Fixes

### Issue 1: No Generator Logs Appear
**Symptom:** Console shows no `[MeshGenerators]` logs  
**Cause:** Generators not initializing  
**Check:**
```javascript
// In console:
window.__DUNGEON_RENDERER_BOOTSTRAPPED
// Should be: true
```
**Fix:** Ensure `renderer.js` bootstrap is running

### Issue 2: "Waiting for generators..." Repeatedly
**Symptom:** Console shows multiple retry attempts  
**Cause:** Generators taking too long or failing silently  
**Check:**
```javascript
// Check if THREE is available
console.log(window.THREE || 'THREE not loaded');

// Check import map
console.log(document.querySelector('script[type="importmap"]')?.innerHTML);
```

### Issue 3: Widget Shows "Loading styles..."
**Symptom:** Widget visible but stuck on loading message  
**Cause:** Template rendering with empty generators array  
**Debug:**
```javascript
// Get widget data
const widget = document.querySelector('.mesh-style-selector');
console.log('Widget visible:', widget?.offsetParent !== null);
console.log('Widget inner HTML:', widget?.innerHTML);
```

### Issue 4: Error Message Shown
**Symptom:** "⚠️ Mesh generators not available"  
**Cause:** Registry initialization failed  
**Check console** for error stack trace  
**Common causes:**
- Import path incorrect
- Module not found
- JavaScript error in generator code

## Manual Fix: Force Initialize

If generators aren't loading, force initialize them:

```javascript
// In browser console:

// 1. Import THREE
const THREE = await import('three');

// 2. Manually initialize generators
const { initializeMeshGenerators } = await import('./renderer/mesh-generators/index.js');
initializeMeshGenerators(THREE);

// 3. Verify
const { getGeneratorRegistry } = await import('./renderer/mesh-generators/index.js');
const registry = getGeneratorRegistry();
console.log('Generators after manual init:', registry.getGeneratorIds());

// 4. Reload widget (if needed)
location.reload();
```

## Timing Issue Fix

If it's a timing issue, try generating a dungeon first:

1. **Click "Generate"** button in UI
2. **Wait** for dungeon to appear
3. **Check** if mesh style dropdown now has options

The first generation triggers the full renderer bootstrap, which should initialize generators.

## Expected Console Output (Success)

```
[Render] Bootstrap check - window exists, not in Jest
[Render] Starting bootstrap - loading Three.js modules  
[Render] Three.js loaded successfully, initializing mesh generators
[MeshGenerators] Initialized generators: Cubic Voxels, Low-Poly ← KEY!
[Render] Mesh generators initialized
[Render] Creating main renderer
[Render] Main renderer instance created and returned

... (later when UI loads) ...

[GeneratorPanel] Initializing mesh style selector...
[GeneratorPanel] Mesh style widget created, initializing registry...
[MeshStyleSelector] getData returning: {generatorCount: 2, selectedId: 'voxel-cube'}
[GeneratorPanel] Registry initialized, mounting widget...
[GeneratorPanel] Widget mounted, setting up callback...
[GeneratorPanel] Mesh style selector fully initialized!
```

## Test the Fix

Run this complete test in browser console:

```javascript
(async () => {
  console.log('=== MESH STYLE SELECTOR DEBUG TEST ===');
  
  // Test 1: Check THREE
  console.log('1. THREE loaded:', typeof THREE !== 'undefined');
  
  // Test 2: Check generator registry
  try {
    const { getGeneratorRegistry } = await import('./renderer/mesh-generators/index.js');
    const registry = getGeneratorRegistry();
    const ids = registry.getGeneratorIds();
    console.log('2. Generator IDs:', ids);
    console.log('   ✓ Expected: 2 generators, Got:', ids.length);
    
    if (ids.length === 0) {
      console.error('   ✗ NO GENERATORS REGISTERED!');
      console.log('   → Try clicking Generate button first');
    } else {
      console.log('   ✓ Generators registered successfully');
    }
  } catch (err) {
    console.error('2. ✗ Failed to load registry:', err);
  }
  
  // Test 3: Check widget
  const widget = document.querySelector('#mesh-style-selector-widget');
  console.log('3. Widget container exists:', !!widget);
  
  if (widget) {
    const dropdown = widget.querySelector('.mesh-style-dropdown');
    const options = dropdown?.querySelectorAll('option');
    console.log('   Dropdown exists:', !!dropdown);
    console.log('   Options count:', options?.length || 0);
    
    if (options && options.length > 0) {
      console.log('   ✓ Dropdown populated!');
      Array.from(options).forEach(opt => {
        console.log('      -', opt.textContent, '(value:', opt.value + ')');
      });
    } else {
      console.error('   ✗ Dropdown is EMPTY');
      console.log('   Widget HTML preview:', widget.innerHTML.substring(0, 300));
    }
  }
  
  console.log('=== TEST COMPLETE ===');
})();
```

## Quick Fixes to Try

### Fix 1: Refresh Page After First Generation
1. Load app
2. Click "Generate" button
3. Wait for dungeon to appear
4. **Refresh page (F5)**
5. Check if dropdown now has options

### Fix 2: Enable Debug Mode
```javascript
// In console before anything loads:
window.__DEBUG_MESH_GENERATORS__ = true;
```
Then reload page and watch console logs.

### Fix 3: Check Import Map
Verify the import map is correct in `index.html`:
```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js",
    ...
  }
}
</script>
```

## Still Not Working?

Share the **full console output** when you:
1. Load the page fresh (Ctrl+Shift+R)
2. Look for the first 50 lines of console logs
3. Copy and share any **red error messages**

The logs will show exactly where in the initialization chain things are failing.
