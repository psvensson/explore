/**
 * map-editor-config.js
 * Centralized configuration constants for Map Editor
 */

export const MAP_EDITOR_CONFIG = {
  GRID_SIZE: 9, // 9 units per tile (3×3×3 with unit=3)
  LAYER_COUNT: 3, // Floor, Mid, Ceiling
  ROTATION_STEPS: [0, 90, 180, 270],
  MAX_HISTORY: 100,
  OVERLAY_Z_INDEX: 1000,
  OVERLAY_OPACITY: 0.3,
  HOVER_COLOR: 'rgba(100, 200, 255, 0.3)',
  HOVER_BORDER: 'rgba(100, 200, 255, 0.8)',
  GRID_COLOR: 'rgba(100, 150, 200, 0.3)',
  GRID_LINE_WIDTH: 1
};
