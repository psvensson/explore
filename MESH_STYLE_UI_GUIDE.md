# Mesh Style Selector - Visual Guide

## 🎨 What You'll See in the UI

After the integration, the **Mesh Style Selector** will appear in the **Controls** panel, between the "Tileset Configuration" dropdown and "Advanced Options".

### Location in UI Hierarchy:
```
Controls Panel
├── Dungeon Size (Width/Height/Depth inputs)
├── Tileset Configuration (Dropdown)
├── 🆕 Visual Style (Mesh Style Selector)  ← NEW!
├── Advanced Options
└── Generate Button
```

## 📸 What It Looks Like

### The Widget Contains:
1. **Label**: "Visual Style:"
2. **Dropdown Menu** with options:
   - Cubic Voxels (default)
   - Low-Poly
3. **Apply Button**: Blue button to activate the selected style
4. **Description**: Small text showing what the selected style does

### Visual Appearance:
```
┌─────────────────────────────────────────┐
│ Visual Style:                            │
│ ┌────────────────────┐  ┌──────────┐   │
│ │ Cubic Voxels    ▼  │  │  Apply   │   │
│ └────────────────────┘  └──────────┘   │
│ Standard cubic voxel style with solid... │
└─────────────────────────────────────────┘
```

## 🚀 How to Use It

### Step-by-Step:
1. **Open your browser** to `http://localhost:8080` (or wherever you serve the app)
2. **Look at the left panel** labeled "Controls"
3. **Scroll down** past "Dungeon Size" and "Tileset Configuration"
4. **You'll see "Visual Style:"** with a dropdown
5. **Select a style** from the dropdown (e.g., "Low-Poly")
6. **Click "Apply"** button
7. **The dungeon regenerates** with the new visual style!

## 🎭 Style Differences

### Cubic Voxels (Default)
- Standard 1×1×1 cubes
- Clean, minecraft-like appearance
- Sharp edges and flat surfaces
- Uniform colors (gray walls, dark floors)

### Low-Poly
- Faceted, angular surfaces (flat shading)
- Beveled edges (softer corners)
- Slight vertex variation (organic feel)
- Warmer color palette (browns, sandy tones)

## 🔍 Testing the Integration

### In Browser Console:
```javascript
// Check if generators are loaded
window.__DEBUG_MESH_GENERATORS__ = true;

// List available styles
import('./renderer/mesh-generators/index.js').then(m => {
  const registry = m.getGeneratorRegistry();
  console.log('Available styles:', registry.getGeneratorIds());
  // Output: ['voxel-cube', 'low-poly']
});

// Check current style
import('./renderer/mesh-generators/index.js').then(m => {
  const registry = m.getGeneratorRegistry();
  console.log('Current style:', registry.getActiveGeneratorId());
  // Output: 'voxel-cube'
});
```

## 🐛 Troubleshooting

### Widget Doesn't Appear?
**Check Console for Errors:**
```javascript
// Look for these logs:
// [GeneratorPanel] Mesh style selector initialized
// [MeshGenerators] Initialized generators: Cubic Voxels, Low-Poly
```

**Manual Test:**
```javascript
// Manually create widget to test
const { MeshStyleSelectorWidget } = await import('./ui/widgets/mesh-style-selector.js');
const widget = new MeshStyleSelectorWidget();
await widget.init();

// Should log available generators
console.log(widget.getData());
```

### Widget Shows But Dropdown is Empty?
This means the generator registry isn't initialized. Check:
```javascript
// In browser console:
import('./renderer/mesh-generators/index.js').then(m => {
  const registry = m.getGeneratorRegistry();
  console.log('Generators:', registry.getAllGenerators());
  // Should show 2 generators
});
```

**Fix:** Ensure `renderer.js` has loaded and bootstrapped generators.

### Apply Button Does Nothing?
Check if the callback is set:
```javascript
// The generator panel should set the callback
// Look for this in console:
// [GeneratorPanel] Applying mesh style: low-poly
```

## 📝 CSS Customization

If you want to customize the appearance, add to `docs/styles/main.css`:

```css
/* Customize mesh style selector */
.mesh-style-selector {
  background: linear-gradient(135deg, #1e3a5f 0%, #2d4a6b 100%);
  border: 2px solid #3b82f6;
}

.mesh-style-dropdown {
  font-size: 14px;
  font-weight: 500;
}

.apply-style-button {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
}

.apply-style-button:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.6);
}
```

## 🎬 Expected Behavior

### When You Change Styles:
1. Select "Low-Poly" from dropdown
2. Click "Apply"
3. **Success notification appears**: "Style applied successfully" (green)
4. **Dungeon regenerates automatically** (Generate button is clicked)
5. **Visual changes**:
   - Walls become more angular
   - Colors shift to warmer tones
   - Edges appear beveled
   - Surfaces have slight organic variation

### Performance Notes:
- Style switching is instant (registry lookup)
- Regeneration takes same time as normal generation
- Geometry is cached where possible (LowPolyGenerator)

## 🔧 Advanced Usage

### Listen to Style Changes Globally:
```javascript
window.addEventListener('meshGeneratorChanged', (event) => {
  console.log('Style changed!', {
    from: event.detail.previousId,
    to: event.detail.currentId,
    generator: event.detail.generator.getName()
  });
  
  // Update your custom UI, save preference, etc.
});
```

### Programmatic Style Switch:
```javascript
import { setActiveMeshGenerator } from './renderer/mesh-generators/index.js';

// Switch without UI
setActiveMeshGenerator('low-poly');

// Then regenerate manually
document.querySelector('[data-action="generate"]').click();
```

## ✅ Verification Checklist

After starting the app, verify:
- [ ] Controls panel loads
- [ ] "Visual Style:" label appears
- [ ] Dropdown shows "Cubic Voxels" and "Low-Poly"
- [ ] Blue "Apply" button is visible
- [ ] Description text updates when selecting different styles
- [ ] Clicking Apply regenerates the dungeon
- [ ] Green notification appears saying "Style applied successfully"
- [ ] Dungeon visual appearance changes

## 🎉 Success Indicators

You'll know it's working when:
1. **Widget appears** in the Controls panel
2. **Console shows**: `[GeneratorPanel] Mesh style selector initialized`
3. **Dropdown is populated** with 2 options
4. **Clicking Apply triggers regeneration**
5. **Visual style actually changes** in the 3D view

---

**Need Help?** Check browser console for error messages or enable debug mode:
```javascript
window.__DEBUG_MESH_GENERATORS__ = true;
```
