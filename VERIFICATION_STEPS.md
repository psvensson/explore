# Verification Steps for Mesh Style Selector Fix

## Quick Test (Browser)

1. **Open the application**: http://localhost:8080

2. **Open browser console** (F12)

3. **Look for these console logs** (in order):
   ```
   [Render] Bootstrap check - window exists, not in Jest
   [Render] Starting bootstrap - loading Three.js modules
   [Render] Three.js loaded successfully, initializing mesh generators
   [MeshGenerators] initializeMeshGenerators() called
   [MeshGenerators] VoxelCubeGenerator registered
   [MeshGenerators] LowPolyGenerator registered
   [MeshGenerators] Registered generator IDs: ["voxel-cube", "lowpoly"]
   [GeneratorPanel] Mounting mesh style selector with data: {generators: [...], ...}
   [MeshStyleSelector] init() called
   [MeshStyleSelector] Awaiting __meshGeneratorsReady promise
   [MeshStyleSelector] Promise resolved
   [MeshStyleSelector] Registry acquired: {hasRegistry: true, generatorIds: [...]}
   [MeshStyleSelector] getData() called
   [MeshStyleSelector] Returning data: {generators: [{id: "voxel-cube", name: "Voxel Cube"}, ...]}
   ```

4. **Visual verification**:
   - The "Controls" panel should contain a "Visual Style" dropdown
   - The dropdown should show: "Voxel Cube" and "Low-Poly"
   - One option should be selected by default (Voxel Cube)
   - An "Apply" button should be next to the dropdown

5. **Functional test**:
   - Select "Low-Poly" from dropdown
   - Click "Apply" button
   - The dungeon should regenerate with the new mesh style

## Expected Console Output Timeline

```
0ms: Page load starts
~50ms: Bootstrap starts
~150ms: THREE.js loading
~300ms: Mesh generators initializing
~350ms: Registry populated with 2 generators
~400ms: Widget mount starts
~450ms: Widget awaits promise
~500ms: Promise resolves
~550ms: getData() called
~600ms: Template rendered with 2 options
```

## Troubleshooting

### If dropdown is still empty:
1. Check if `__meshGeneratorsReady` promise exists: `console.log(window.__meshGeneratorsReady)`
2. Check registry state: 
   ```javascript
   import('./renderer/mesh-generators/index.js').then(m => {
     const reg = m.getGeneratorRegistry();
     console.log('IDs:', reg.getGeneratorIds());
     console.log('All:', reg.getAllGenerators());
   })
   ```

### If console shows errors:
- **"Registry not defined"**: Bootstrap promise didn't resolve
- **"getAllGenerators is not a function"**: Wrong registry instance
- **"Cannot read property 'map' of undefined"**: getData() called before init()

## Debug Mode

Enable verbose logging:
```javascript
window.__DEBUG_MESH_GENERATORS__ = true;
```

Then reload the page.

## Clean Test

1. Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
2. Clear cache if needed
3. Check Network tab - ensure all modules load:
   - renderer.js
   - mesh-generators/index.js
   - mesh-generators/generator-registry.js
   - mesh-generators/voxel-cube-generator.js
   - mesh-generators/lowpoly-generator.js
   - ui/widgets/mesh-style-selector.js

## Success Criteria

✅ Dropdown shows 2 options: "Voxel Cube" and "Low-Poly"
✅ No console errors
✅ Widget appears in Controls panel below "Tileset Configuration"
✅ Selecting different option updates dropdown selection
✅ Clicking "Apply" triggers regeneration
