/**
 * Widget Registry - Clean ES module approach
 * Direct imports of all widget classes, no global state
 */

// Import all widget classes
import { MainTabsWidget } from './widgets/main-tabs-simple.js';
import { SceneViewerWidget } from './widgets/scene-viewer.js';
import { GeneratorPanelWidget } from './widgets/generator-panel.js';
import { SizeControlsWidget } from './widgets/size-controls.js';
import { TilesetSelectorWidget } from './widgets/tileset-selector.js';
import { GenerationActionsWidget } from './widgets/generation-actions.js';

// Widget registry map - clean and simple
export const WIDGET_REGISTRY = {
    'main-tabs-simple': MainTabsWidget,
    'scene-viewer': SceneViewerWidget,
    'generator-panel': GeneratorPanelWidget,
    'size-controls': SizeControlsWidget,
    'tileset-selector': TilesetSelectorWidget,
    'generation-actions': GenerationActionsWidget
};

// Widget configurations for bootstrap system
export const WIDGET_MOUNTS = [
    { selector: '#main-tabs-container', widget: 'main-tabs-simple' },
    { selector: '#generator-panel-container', widget: 'generator-panel' },
    { selector: '#scene-viewer-container', widget: 'scene-viewer' }
];

/**
 * Get a widget class by name
 */
export function getWidgetClass(name) {
    return WIDGET_REGISTRY[name];
}

/**
 * Get all available widget names
 */
export function getAvailableWidgets() {
    return Object.keys(WIDGET_REGISTRY);
}

// Node.js compatibility
if (typeof window !== 'undefined') {
    console.log('[Widget Registry] Loaded with', getAvailableWidgets().length, 'widgets');
}