# Map Editor

## Overview
The Map Editor provides an interactive interface for manually placing and arranging 3D tiles to create custom dungeon layouts. Unlike the WFC-based generator (which creates random dungeons), the Map Editor gives you complete control over tile placement.

## Architecture

### Core Components

1. **MapEditorState** (`docs/dungeon/map_editor_state.js`)
   - Data model with undo/redo support
   - Sparse 3D grid storage using nested Maps
   - Command pattern for operations (PlaceTileCommand, RemoveTileCommand)
   - JSON serialization for save/load
   - History limit: 100 operations

2. **GridOverlay** (`docs/ui/utils/grid-overlay.js`)
   - Canvas-based grid visualization
   - THREE.js raycasting for mouse→grid conversion
   - Horizontal plane intersection at current layer
   - Visual feedback (hovered cell, grid lines)
   - Grid size: 9 units (matches 3×3×3 tiles with unit=3)

3. **MapEditor** (`docs/ui/map_editor.js`)
   - Main controller orchestrating all components
   - UI event handling (mouse, keyboard, buttons)
   - Tile palette management
   - Layer/rotation controls
   - Save/load functionality

4. **Renderer Extensions** (`docs/renderer/renderer.js`)
   - `setEditorMode(enabled)` - Toggle between WFC/editor view
   - `renderEditorTile(tile)` - Create mesh for placed tile
   - `removeEditorTile(tileId)` - Remove specific tile mesh
   - `clearEditorTiles()` - Remove all editor tiles
   - Editor tiles stored in separate Group (hidden in WFC mode)

## User Workflow

### Basic Operations

1. **Select Tile**: Click tile in left palette
2. **Choose Layer**: Use ↓/↑ buttons or `[` / `]` keys
   - Layer 0: Floor
   - Layer 1: Mid (walls)
   - Layer 2: Ceiling
3. **Set Rotation**: Use ↶/↷ buttons or `r` / `Shift+R` keys (0°, 90°, 180°, 270°)
4. **Place Tile**: Click grid position in viewport
5. **Remove Tile**: Shift+Click or Right-Click existing tile

### Keyboard Shortcuts

- **Ctrl+Z**: Undo
- **Ctrl+Y** / **Ctrl+Shift+Z**: Redo
- **[** / **]**: Change layer
- **r**: Rotate clockwise 90°
- **Shift+R**: Rotate counter-clockwise 90°

### Save/Load

- **Save**: Downloads JSON file with timestamp (`dungeon-map-{timestamp}.json`)
- **Load**: Opens file picker, restores all tiles from JSON
- **Format**: Human-readable JSON with tile positions, rotations, structure IDs

## Technical Details

### Coordinate System

- **Grid Coordinates**: Integer voxel positions (x, y, z)
  - x: Horizontal axis (east/west)
  - y: Vertical axis (layers: 0, 1, 2)
  - z: Depth axis (north/south)
  
- **World Coordinates**: THREE.js scene positions (multiples of 9)
  - Each tile occupies 9 units (3×3×3 voxels with unit=3)
  - Grid position (1, 0, 2) → World position (9, 0, 18)

### State Management

```javascript
// PlacedTile structure
{
  id: "tile_1234567890",
  structureId: "basic_empty_01",
  position: { x: 0, y: 1, z: 0 },
  rotation: 90  // degrees
}

// State operations
state.placeTile(x, y, z, structureId, rotation)
state.removeTile(x, y, z)
state.getTileAt(x, y, z)
state.getAllTiles()
state.undo()
state.redo()
state.clearAll()
```

### Renderer Integration

The map editor reuses the same Three.js scene as the WFC generator but in a separate Group:

```javascript
// WFC tiles
scene.add(tileGroup)  // visible in normal mode

// Editor tiles
scene.add(editorTiles)  // visible in editor mode
```

When switching modes:
- Editor mode: Hide `tileGroup`, show `editorTiles`, add grid helper
- Normal mode: Show `tileGroup`, hide `editorTiles`, hide grid

### Canvas Overlay

The grid overlay is a transparent canvas positioned absolutely over the Three.js viewport:

1. Mouse position captured relative to canvas
2. Screen→NDC conversion using canvas dimensions
3. THREE.Raycaster cast from camera through mouse position
4. Intersection with horizontal plane at `currentLayer * 9`
5. World position → grid position (divide by 9, round to integers)

## Extension Points

### Adding Custom Tiles

Tiles are loaded from `DEFAULT_TILE_STRUCTURES`:

```javascript
// In docs/dungeon/defaults/default_tile_structures.js
export const DEFAULT_TILE_STRUCTURES = {
  'my_custom_tile': {
    name: 'Custom Tile',
    layers: [
      // Floor layer (3×3)
      [[1,1,1], [1,0,1], [1,1,1]],
      // Mid layer (3×3)
      [[1,0,1], [0,0,0], [1,0,1]],
      // Ceiling layer (3×3)
      [[1,1,1], [1,1,1], [1,1,1]]
    ]
  }
};
```

### Custom Controls

To add new UI controls, extend the `createUI()` method in `MapEditor`:

```javascript
createUI() {
  // ... existing code ...
  
  // Add custom button
  const customBtn = document.createElement('button');
  customBtn.textContent = 'Custom Action';
  customBtn.addEventListener('click', () => this.customAction());
  this.controls.customBtn = customBtn;
}

customAction() {
  // Your logic here
}
```

## Testing

To test the map editor:

1. Start local server: `npx http-server docs -p 8080`
2. Open http://localhost:8080
3. Click "Map Editor" tab in navigation
4. Canvas overlay should appear over 3D viewport
5. Tile palette on left, controls on right
6. Click to place tiles, verify mesh rendering
7. Test undo/redo with Ctrl+Z/Y
8. Save map, reload page, load map to verify persistence

## Known Limitations

1. **Layer Limit**: Only 3 layers (floor, mid, ceiling) supported
2. **No Multi-Select**: Must place/remove tiles one at a time
3. **No Copy/Paste**: Can't duplicate tile patterns
4. **Grid Size Fixed**: Always 9 units (3×3×3 with unit=3)
5. **No WFC Integration**: Editor tiles don't use adjacency rules

## Future Enhancements

Potential improvements:
- Multi-select with drag box
- Copy/paste tile patterns
- Flood fill tool
- Brush mode (click-drag to place multiple)
- Template library (save/load patterns)
- Export to WFC-compatible tileset
- Snap to existing tiles
- Auto-connect corridors
- Preview mode (hide grid/controls)
- Minimap view

## Troubleshooting

### Canvas not visible
- Check `#grid-overlay-canvas` has `pointer-events: all`
- Verify canvas positioned absolutely with `z-index: 100`
- Canvas should resize to match renderer viewport

### Tiles not appearing
- Check `window.dungeonRenderer` exists
- Verify THREE.js loaded before MapEditor initialization
- Check browser console for async import errors

### Raycasting not working
- Verify camera reference is correct (not null)
- Check plane position matches current layer * 9
- Ensure mouse coordinates relative to canvas, not window

### Undo/redo not working
- Check command history not at limit (100 ops)
- Verify commands pushed to history stack
- Check `syncRendererWithState()` called after undo/redo
