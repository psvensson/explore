# Mesh Style Selector Fix - Widget Rendering Pattern

## Problem
The mesh style selector widget appeared but contained no options to select. The dropdown was empty.

## Root Cause
**Incorrect use of Widget.js rendering pattern**

The widget was calling `this.render()` directly, which doesn't actually update the DOM in the Widget.js framework. The Widget.js pattern requires:

1. **Initial mount**: `widget.mount(target, initialContextData)`
2. **Updates**: `this.update(newStateData)`

## The Bugs

### Bug 1: Incorrect Handlebars Helper
```javascript
// ❌ WRONG - helper is called "eq" not "if-eq"
{{#if-eq id ../selectedGenerator}}selected{{/if-eq}}
```

### Bug 2: Wrong Widget Rendering Pattern

#### In `mesh-style-selector.js` init():
```javascript
// ❌ WRONG - render() doesn't update DOM
this.render();
```

#### In `generator-panel.js` initMeshStyleSelector():
```javascript
// ❌ WRONG - mount without initial data
widget.mount(container);
```

#### In `mesh-style-selector.js` event handlers:
```javascript
// ❌ WRONG - calling render() directly
this._selectedGenerator = event.target.value;
this.render();
```

## The Fix

### 1. Fix Handlebars helper syntax
```javascript
// ✅ CORRECT - use (eq a b) helper
{{#if (eq id ../selectedGenerator)}}selected{{/if}}
```

### 2. Remove direct render() call from init()
```javascript
async init() {
  await window.__meshGeneratorsReady;
  const { getGeneratorRegistry } = await import('../../renderer/mesh-generators/index.js');
  this._registry = getGeneratorRegistry();
  
  window.addEventListener('meshGeneratorChanged', (event) => {
    this._selectedGenerator = event.detail.currentId;
    this.update(this.getData()); // ✅ Use update()
  });
  
  this._selectedGenerator = this._registry.getActiveGeneratorId();
  // ✅ No render() call here - mount() will handle it
}
```

### 3. Pass initial data to mount()
```javascript
// In generator-panel.js
await widget.init();
const initialData = widget.getData(); // ✅ Get data
widget.mount(container, initialData); // ✅ Pass to mount
```

### 4. Use update() for re-renders
```javascript
onAction(action, event) {
  switch (action) {
    case 'select-mesh-style':
      this._selectedGenerator = event.target.value;
      this.update(this.getData()); // ✅ Use update()
      break;
  }
}
```

## Widget.js Rendering Pattern

```
Constructor
    ↓
new Widget({ template, style })  // Compile template, inject CSS
    ↓
mount(target, ctx)  // Render with ctx, append to DOM
    ↓
update(newState)    // Re-render with new state, replace DOM
```

### Key Methods:
- `render(ctx)` - **Internal**: Compiles template with context (don't call directly)
- `mount(target, ctx)` - **Public**: Initial render and DOM attachment
- `update(newState)` - **Public**: Re-render with new state
- `getData()` - **Custom**: Prepare data for template (our pattern)

## Files Changed

1. **docs/ui/widgets/mesh-style-selector.js**
   - Removed `this.render()` call from `init()`
   - Changed `this.render()` to `this.update(this.getData())` in event handlers

2. **docs/renderer/mesh-generators/index.js**
   - Added debug logging to trace initialization

3. **docs/ui/widgets/generator-panel.js**
   - Changed to pass `initialData` to `widget.mount(container, initialData)`
   - Added debug logging

## Result
✅ Mesh style selector dropdown now populates with available generators
✅ "Voxel Cube" and "Low-Poly" options appear
✅ Widget properly re-renders when selection changes
✅ Clean async pattern maintained (no retries/fallbacks)

## Debugging Added
Comprehensive console logging to trace:
- Bootstrap promise resolution
- Generator initialization
- Registry state
- Widget initialization
- getData() calls
- Template rendering

Can be removed once verified working in production.
