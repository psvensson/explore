# Tile Editor 3D Preview Consistency

## Overview

This document describes the changes made to ensure the tile editor's 3D structure preview widgets use **exactly the same mesh generation** as the main 3D scene viewer.

## Problem

The legacy pipeline exposed an `editorMode` toggle and optional "experimental" rendering policies. These paths attempted to simplify walls or drop ceilings for preview clarity, but they diverged from runtime rendering and created mismatch bugs.

## Solution

Removed the preview-only branches entirely so every entry point hits the same code path:

### Files Modified

1. **`docs/ui/simplified_tileset_editor.js`**
   - Viewers now call the mesh pipeline with only canonical options (`unit`, `materialFactory`, `structureId`)
   - No flags or preview overrides remain

2. **`docs/ui/utils/structure-mesh-pipeline.js`**
   - Removed editor/experimental parameters from the cache key and build flow
   - Always feeds canonical voxel data directly into `buildTileMesh`

3. **`docs/renderer/wfc_tile_mesh.js`**
   - Deleted the editor/experimental branches and policy-selection fallback
   - `processVoxels` now always renders floors, ceilings, and walls exactly like runtime

## Technical Details

### Mesh Generation Flow

Both the main scene and tile editor now follow identical paths:

```javascript
Structure Data (canonical 3-layer format)
    ↓
normalizeToCanonical() 
    ↓
buildTileMesh()
    ↓
Same THREE.js mesh output
```

### Key Settings

```javascript
{
  materialFactory,     // Shared material factory
  unit: 3,             // Standard unit scale
}
```

## Benefits

1. **Visual Consistency**: Tile previews now exactly match the main 3D view
2. **WYSIWYG**: What you design in the editor is exactly what appears in generated dungeons
3. **No Surprises**: No hidden preprocessing or pattern simplification
4. **Same Pipeline**: Uses `buildTileMesh()` from `wfc_tile_mesh.js` - the authoritative mesh builder

## Testing

- All 217 tests pass
- No regressions in mesh generation
- Inline previews and modal editor both updated

## Usage

When you view a structure in the tile editor:
- The small inline 3D preview uses production rendering
- The structure editor modal's 3D view uses production rendering
- Both match exactly what appears in the main dungeon scene

## Migration Notes

If you have custom code that calls `StructureMeshPipeline`:
- Only pass canonical structure data; no feature flags are available
- The pipeline always returns meshes identical to the runtime renderer
- If you previously relied on editor-only behavior (e.g., hidden ceilings), update your UI instead of expecting mesh differences

## Related Files

- `docs/renderer/wfc_tile_mesh.js` - Core mesh builder (shared by both systems)
- `docs/renderer/mesh_factories.js` - Material and geometry factories
- `docs/ui/utils/voxel-3d-viewer.js` - 3D viewer wrapper
- `docs/ui/utils/structure-mesh-pipeline.js` - High-level mesh creation API
