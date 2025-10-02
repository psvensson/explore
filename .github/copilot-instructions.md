# AI Agent Instructions for My Dungeon Web

## Project Architecture Overview

This is a **no-build, browser-native** 3D dungeon generator using Wave Function Collapse (WFC) with Three.js. The entire application runs from the `docs/` folder using ES modules and import maps - no bundling required.

### Core Domain Logic

**3-Layer Architecture:**
1. **Tileset System** (`docs/dungeon/`) - WFC-compatible 3×3×3 voxel tiles with adjacency rules
2. **Renderer** (`docs/renderer/`) - Three.js scene management with FPS/orbit controls  
3. **UI Layer** (`docs/ui/`) - Tab-based interface with hierarchical tileset editor

**Critical Dependencies:**
- `docs/dungeon/ndwfc.js` (third-party WFC engine) must load before `tileset.js`
- `window.NDWFC3D` global registration pattern drives tile initialization
- Three.js loaded via CDN import map, with fallback dynamic imports

## Key Development Patterns

### Node.js Compatibility Guards
All browser-specific modules use:
```javascript
if (typeof window !== 'undefined') {
  // Browser-only code
}
```
This prevents import failures in Jest tests that run in Node.js environment.

### WFC Generation Flow
```javascript
// Core WFC pipeline in docs/renderer/wfc_generate.js
generateWFCDungeon({
  tileset: { prototypes: tilePrototypes },
  dims: { x, y, z },
  yieldEvery: 500,  // Prevent UI blocking
  maxSteps: 50000,
  centerSeed: true  // Start with cross-intersection
})
```

**Critical:** WFC uses **incremental step/expand API** to avoid blocking the browser thread. Legacy `model.run()` is fallback only.

### Tileset Editor Architecture (Refactored - Phases 1, 2 & 3)

The tileset editor has been **extensively refactored** for maintainability:

**Phase 1 - Utility Extraction:**
- `docs/renderer/lighting-profiles.js` - Centralized lighting configurations
- `docs/utils/voxel-coordinates.js` - Coordinate conversion utilities
- `docs/renderer/scene_setup.js` - Enhanced with axis indicators

**Phase 2 - Class Extraction:**
- `docs/ui/utils/voxel-3d-viewer.js` - Reusable 3D viewer class (scene, camera, renderer, lighting)
- `docs/ui/utils/viewer-controls.js` - Reusable mouse controls class (rotation, zoom)

**Phase 3 - Pipeline & Modal Utilities:**
- `docs/ui/utils/structure-mesh-pipeline.js` - Centralized structure-to-mesh conversion pipeline
- `docs/ui/utils/modal-manager.js` - Standardized modal/dialog management

**Hierarchical Workflow** in `docs/ui/`:
1. **Structure Editor** - Define 3D voxel geometry with inline 3D previews
2. **Metadata Editor** - Create weight/role packages  
3. **Package Editor** - Combine structures + metadata
4. **Configuration Editor** - Export complete tilesets

**3D Viewer Pattern:**
```javascript
// Create viewer using refactored classes
const viewer = new Voxel3DViewer(canvas, { viewerType: 'inline', ... });
await viewer.initialize(THREERef);
viewer.setMesh(tileMesh);

// Add controls
const controls = new ViewerControls(canvas, viewer);
controls.enable();

// Start rendering
viewer.startRenderLoop();

// Cleanup
controls.destroy();
viewer.stopRenderLoop();
```

**Mesh Pipeline Pattern:**
```javascript
// Static methods for mesh creation
const mesh = await StructureMeshPipeline.createMeshFromStructure(THREERef, layersArray);
const mesh2 = await StructureMeshPipeline.createMeshFromStructureId(THREERef, 'struct_id', allStructures);
```

**Modal Manager Pattern:**
```javascript
// Static methods for dialogs
const modal = ModalManager.createModal({ title: 'Title', content: 'Content' });
ModalManager.showModal(modal);
ModalManager.closeModal(modal);
ModalManager.showNotification({ message: 'Success!', type: 'success' });
```

**View Preservation Pattern:**
```javascript
// In tileset_editor.js - views persist across navigation
showEditor() {
  // Hide all views
  Object.values(this.views).forEach(view => view.style.display = 'none');
  
  // Create or show target view
  if (!this.views.target) {
    this.views.target = document.createElement('div');
    this.editors.target = new TargetEditor(this.views.target);
  }
  this.views.target.style.display = 'block';
}
```

### Testing Strategy

**ESM + Jest Configuration:**
```json
// jest.config.js
{
  "testEnvironment": "jsdom",
  "type": "module",
  "NODE_OPTIONS": "--experimental-vm-modules"
}
```

**Critical Test Patterns:**
- Always call `_resetTilesetForTests()` in `beforeEach`
- Mock `global.NDWFC3D = function(){}` before importing tileset
- Use dynamic imports to avoid circular ESM issues: `const mod = await import('../docs/path.js')`

**Refactored Class Testing:**
- `StructureMeshPipeline` and `ModalManager` use **static methods** only
- `Voxel3DViewer` and `ViewerControls` are **instance classes**
- Pipeline methods are **async** - always `await`
- Structure lookups use plain objects `{}` not Maps
- See `tests/refactored-classes.test.js` for patterns

**Current Test Status:** 89% pass rate (190/213 tests passing)

### Three.js Integration

**Bootstrap Pattern:**
```javascript
// Auto-bootstrap check in renderer.js
if (typeof window !== 'undefined' && !process.env.JEST_WORKER_ID) {
  if (!window.__DUNGEON_RENDERER_BOOTSTRAPPED) {
    // Initialize Three.js scene
  }
}
```

**Important:** `THREERef` must be acquired **before** calling any Three.js-dependent functions to avoid initialization race conditions.

## Critical File Relationships

### Load Order Dependencies
1. `docs/index.html` - Sets import map for Three.js
2. `docs/dungeon/tileset.js` - Requires `window.NDWFC3D` global
3. `docs/renderer/renderer.js` - Exposes `window.generateWFCDungeon`
4. `docs/ui/ui.js` - Wires UI controls to renderer

### Module Import Patterns
```javascript
// Lazy loading for heavy dependencies
const { generateWFCDungeon } = await import('../renderer/wfc_generate.js');

// Conditional imports for Node.js compatibility
if (typeof window !== 'undefined') {
  window.tilesetEditor = new TilesetEditor();
}
```

## Development Workflows

### Running Tests
```bash
npm test                    # Full Jest suite
npm test -- tests/ui.test.js  # Single test file
```

### Local Development
```bash
npx http-server docs -p 8080  # Serve from docs/ folder
# Open http://localhost:8080
```

### Debugging WFC Issues
Enable debug flags:
```javascript
window.__WFC_DEBUG__ = true;
window.__SHOW_TILE_IDS = true;
window.__RENDER_DEBUG__ = true;
```

Check `rules_snapshot.test.js` for adjacency rule regressions.

## Common Pitfalls

1. **Import Map Issues**: Three.js must be accessible via `"three"` specifier
2. **WFC Blocking**: Always use `yieldEvery` parameter for responsive generation  
3. **Tileset Registration**: Missing `NDWFC3D` global causes silent tile registration failures
4. **Test Isolation**: Forgot `_resetTilesetForTests()` causes test interference
5. **View Management**: Destroying DOM in tileset editor causes blank screens - use show/hide pattern instead

## Extension Points

- **New Tile Types**: Add to `docs/dungeon/tileset_data.js` with edge patterns
- **UI Components**: Follow hierarchical editor pattern in `docs/ui/`  
- **WFC Rules**: Extend `docs/renderer/wfc_rules.js` for adjacency logic
- **Rendering**: Add mesh utilities in `docs/renderer/wfc_tile_mesh.js`

The codebase prioritizes **fail-fast** design - missing dependencies should throw immediately rather than silently failing.