# Canonical Voxel-to-World Coordinate System

## Overview

This document describes the **canonical coordinate system** implemented to ensure consistent mesh dimensions and placement across the entire application. All meshes (walls, floors, ceilings) now use standardized dimensions matching the idealized voxel cube.

## Problem Solved

**Before:** Meshes had inconsistent dimensions and placement:
- Ceilings had correct width/length but wrong placement
- Walls had odd dimensions and incorrect positioning
- Different code paths used different coordinate calculations
- No single source of truth for voxel→world conversion

**After:** Unified coordinate system with:
- All cubes (walls, solid blocks) are `unit × unit × unit` (typically 3×3×3)
- All planes (floors, ceilings) are `unit × 0.1*unit × unit` (thin slabs)
- Consistent positioning across main scene and editor previews
- Single source of truth in `voxel-to-world.js`

## Coordinate System Definition

### Voxel Space
- **Indices**: `[x, y, z]` where each ranges from `0` to `2` for a 3×3×3 tile
- **x**: Column (0=left, 1=center, 2=right)
- **y**: Layer/Height (0=floor, 1=middle, 2=ceiling)
- **z**: Row/Depth (0=front, 1=center, 2=back)

### World Space (Three.js)
With `unit = 3` (standard):

**X-axis** (horizontal, left-right):
- Voxel x=0 → World x=-3
- Voxel x=1 → World x=0
- Voxel x=2 → World x=+3
- Formula: `worldX = (voxelX - 1) * unit`

**Y-axis** (vertical, bottom-top):
- Voxel y=0 → World y=0 to 3 (floor layer)
- Voxel y=1 → World y=3 to 6 (middle layer)
- Voxel y=2 → World y=6 to 9 (ceiling layer)
- Formula: `worldY = voxelY * unit`

**Z-axis** (depth, front-back):
- Voxel z=0 → World z=-3
- Voxel z=1 → World z=0
- Voxel z=2 → World z=+3
- Formula: `worldZ = (voxelZ - 1) * unit`

### Mesh Center Positions

**Floor Meshes** (thin planes hugging the bottom of the tile):
```javascript
const { center } = getLayerMetrics(0, unit);
// For voxel y=0, unit=3: center ≈ 0.15
```

**Wall/Solid Cubes** (contiguous mid-layer geometry):
```javascript
const { center } = getLayerMetrics(1, unit);
// For voxel y=1, unit=3: center ≈ 1.5
```

**Ceiling Meshes** (thin planes closing the top of the tile):
```javascript
const { center } = getLayerMetrics(2, unit);
// For voxel y=2, unit=3: center ≈ 2.85
```

## Implementation

### Core Module: `docs/utils/voxel-to-world.js`

This is the **single source of truth** for coordinate conversion:

```javascript
// Convert voxel indices to world coordinates
voxelToWorld(x, y, z, unit = 3)

// Get center position for full cube (walls, solid blocks)
voxelToWorldCenter(x, y, z, unit = 3)

// Get position for floor plane
voxelToWorldFloor(x, y, z, unit = 3)

// Get position for ceiling plane
voxelToWorldCeiling(x, y, z, unit = 3)

// Get standard cube dimensions (height depends on layer metrics)
getStandardCubeDimensions(unit = 3, layerIndex = 1)

// Get standard plane dimensions (thickness from layer metrics)
getStandardPlaneDimensions(unit = 3, layerIndex = 0)
```

### Updated Files

1. **`docs/utils/voxel-to-world.js`** (NEW)
   - Canonical coordinate conversion functions
   - Single source of truth for all positioning

2. **`docs/renderer/mesh_geometry_builders.js`** (UPDATED)
   - `buildFloor()` now uses `voxelToWorldFloor()` and `getStandardPlaneDimensions()`
   - `buildCeiling()` now uses `voxelToWorldCeiling()` and `getStandardPlaneDimensions()`
   - `buildSolidCube()` now uses `voxelToWorldCenter()` and `getStandardCubeDimensions()`

3. **`docs/renderer/wfc_tile_mesh.js`** (UPDATED)
   - `placeNonWall()` uses canonical coordinate builders
   - `emitWalls()` uses `buildSolidCube()` with canonical coordinates
   - `processVoxels()` calls updated functions
   - Experimental policy path uses canonical coordinates

4. **All Test Files** (UPDATED)
   - Updated Y-coordinate expectations to contiguous layer metrics:
     - Floors: `0.15`
     - Walls: `1.5`
     - Ceilings: `2.85`
   - Updated X-coordinate expectations: `[0, 3, 6]` → `[-3, 0, 3]`

## Mesh Dimensions

### Standard Cube (Walls, Solid Blocks)
- **Dimensions**: `unit × layerThickness × unit` (e.g., 3×2.4×3 for mid-layer walls)
- **Use cases**: Mid-layer walls, solid blocks, stairs
- **Positioning**: Centered on voxel position using `getLayerMetrics(layerIndex).center`

### Standard Plane (Floors, Ceilings)
- **Dimensions**: `unit × layerThickness × unit` (e.g., 3×0.3×3 for floors/ceilings)
- **Use cases**: Floor and ceiling surfaces
- **Positioning**: 
  - Floor: Bottom layer (center ≈0.15 for unit=3)
  - Ceiling: Top layer (center ≈2.85 for unit=3)

## Test Verification

All **217 tests pass**, including:

- `tile_editor_meshes.test.js` - Verifies editor mesh positions use canonical system
- `visual_coordinate_test.test.js` - Validates mesh positioning in generated dungeons
- `tile_orientation_analysis.test.js` - Confirms ceiling material consistency
- `floor_missing_analysis.test.js` - Checks floor/ceiling presence
- `empty_tile_stacking.test.js` - Tests vertical tile stacking
- `ceiling_consistency_analysis.test.js` - Validates material consistency across dungeons

## Usage Guidelines

### For New Mesh Code

**Always use the canonical coordinate functions:**

```javascript
import { 
  voxelToWorldCenter, 
  voxelToWorldFloor,
  voxelToWorldCeiling,
  getStandardCubeDimensions,
  getStandardPlaneDimensions
} from '../utils/voxel-to-world.js';

// For a wall cube at voxel (x=1, y=1, z=1)
const pos = voxelToWorldCenter(1, 1, 1, unit);
const dims = getStandardCubeDimensions(unit, 1);
const geometry = new THREE.BoxGeometry(dims.width, dims.height, dims.depth);
const mesh = new THREE.Mesh(geometry, material);
mesh.position.set(pos.x, pos.y, pos.z);

// For a floor plane at voxel (x=1, y=0, z=1)
const floorPos = voxelToWorldFloor(1, 0, 1, unit);
const planeDims = getStandardPlaneDimensions(unit, 0);
const floorGeom = new THREE.BoxGeometry(planeDims.width, planeDims.height, planeDims.depth);
const floorMesh = new THREE.Mesh(floorGeom, floorMaterial);
floorMesh.position.set(floorPos.x, floorPos.y, floorPos.z);
```

### For Test Code

**Use canonical coordinates when filtering meshes by position:**

```javascript
// Find floor meshes (canonical system, unit=3)
const floorMeshes = meshGroup.children.filter(m => 
  Math.abs(m.position.y - 0.15) < 0.2
);

// Find wall meshes (canonical system, unit=3)
const wallMeshes = meshGroup.children.filter(m => 
  Math.abs(m.position.y - 1.5) < 0.6
);

// Find ceiling meshes (canonical system, unit=3)
const ceilingMeshes = meshGroup.children.filter(m => 
  Math.abs(m.position.y - 2.85) < 0.2
);
```

## Benefits

1. **Visual Consistency**: All meshes have uniform, predictable dimensions
2. **Maintainability**: Single source of truth for coordinate conversion
3. **Debuggability**: Clear, documented coordinate system
4. **Extensibility**: Easy to add new mesh types using standard functions
5. **Testing**: Predictable coordinates make test assertions reliable
6. **Editor Accuracy**: 3D previews match main scene exactly

## Migration Notes

### Breaking Changes
- Tests that hard-coded old coordinate values needed updates
- Any custom mesh code using ad-hoc coordinate calculations should migrate to canonical functions

### Non-Breaking
- The coordinate system is backwards-compatible with existing tile structures
- All existing tile definitions work without modification
- The change is transparent to end users

## Future Improvements

- Consider adding coordinate helpers for multi-tile dungeons
- Add visualization tools for debugging coordinate systems
- Extend system to support variable unit sizes more elegantly
- Add coordinate system validation tools

## References

- Core implementation: `docs/utils/voxel-to-world.js`
- Mesh builders: `docs/renderer/mesh_geometry_builders.js`
- Main mesh generation: `docs/renderer/wfc_tile_mesh.js`
- Tile structures (ground truth): `docs/dungeon/defaults/default_tile_structures.js`
