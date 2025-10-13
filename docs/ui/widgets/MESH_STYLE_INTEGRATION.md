# Mesh Style Selector - Integration Guide

## Quick Integration

### 1. Add to HTML (if not using widget system)
```html
<div id="mesh-style-container"></div>
```

### 2. Initialize Widget
```javascript
import { MeshStyleSelectorWidget } from './ui/widgets/mesh-style-selector.js';

// Create widget instance
const meshStyleWidget = new MeshStyleSelectorWidget();

// Initialize with generator registry
await meshStyleWidget.init();

// Mount to container
const container = document.getElementById('mesh-style-container');
meshStyleWidget.mount(container);

// Set callback for when style is applied
meshStyleWidget.onApply(async (generatorId) => {
  console.log('Style changed to:', generatorId);
  
  // Regenerate your scene here
  // Example:
  await regenerateDungeon();
  
  // Or for map editor:
  mapEditor.refreshAllTiles();
});
```

## Integration with Main UI

### Option A: Add to Generation Controls
```javascript
// In docs/ui/widgets/generator-panel.js or similar
import { MeshStyleSelectorWidget } from './mesh-style-selector.js';

class GeneratorPanel {
  async render() {
    // ... existing code
    
    // Add mesh style selector
    this.meshStyleWidget = new MeshStyleSelectorWidget();
    await this.meshStyleWidget.init();
    this.meshStyleWidget.mount(this.container);
    
    // Connect to regeneration
    this.meshStyleWidget.onApply(async (generatorId) => {
      await this.regenerateWithNewStyle(generatorId);
    });
  }
}
```

### Option B: Add to Advanced Options
```javascript
// In docs/ui/widgets/advanced-options.js
const advancedSection = document.querySelector('.advanced-options');

const meshStyleWidget = new MeshStyleSelectorWidget();
await meshStyleWidget.init();
meshStyleWidget.mount(advancedSection);

meshStyleWidget.onApply(async (generatorId) => {
  // Regenerate current dungeon with new style
  const currentDungeon = dungeonRenderer.getCurrentDungeon();
  await dungeonRenderer.regenerateWithStyle(currentDungeon, generatorId);
});
```

## Full Example: Main UI Integration

```javascript
// docs/ui/ui.js or similar main UI file

import { MeshStyleSelectorWidget } from './widgets/mesh-style-selector.js';

export class DungeonUI {
  async initialize() {
    // ... existing initialization
    
    // Add mesh style selector to controls panel
    await this.initializeMeshStyleSelector();
  }
  
  async initializeMeshStyleSelector() {
    const controlsPanel = document.querySelector('#generation-controls');
    
    // Create a section for style controls
    const styleSection = document.createElement('div');
    styleSection.className = 'style-controls-section';
    styleSection.innerHTML = '<h3>Visual Style</h3>';
    
    // Mount widget
    this.meshStyleWidget = new MeshStyleSelectorWidget();
    await this.meshStyleWidget.init();
    this.meshStyleWidget.mount(styleSection);
    
    // Handle style changes
    this.meshStyleWidget.onApply(async (generatorId) => {
      console.log(`Applying style: ${generatorId}`);
      
      // Show loading indicator
      this.showLoadingIndicator('Regenerating with new style...');
      
      try {
        // Clear current scene
        this.renderer.clearScene();
        
        // Regenerate with current parameters but new style
        await this.generateDungeon({
          ...this.currentParams,
          generatorId // Pass to generation function
        });
        
        this.hideLoadingIndicator();
      } catch (err) {
        console.error('Failed to apply style:', err);
        this.showError('Failed to apply style: ' + err.message);
      }
    });
    
    controlsPanel.appendChild(styleSection);
  }
}
```

## CSS Styling (Optional Customization)

```css
/* Add to docs/styles/main.css or component-specific CSS */

.style-controls-section {
  margin-top: 20px;
  padding: 15px;
  background: rgba(15, 23, 42, 0.9);
  border-radius: 8px;
  border: 1px solid #334155;
}

.style-controls-section h3 {
  margin: 0 0 10px 0;
  color: #e2e8f0;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Override widget colors if needed */
.mesh-style-selector {
  --primary-color: #3b82f6;
  --hover-color: #60a5fa;
  --background: rgba(11, 21, 34, 0.6);
}
```

## Advanced: Listening to Style Changes

```javascript
// Listen to global style change events
window.addEventListener('meshGeneratorChanged', (event) => {
  const { previousId, currentId, generator } = event.detail;
  
  console.log(`Style changed: ${previousId} → ${currentId}`);
  console.log('Generator:', generator.getName());
  
  // Update UI to reflect new style
  updateStyleIndicator(currentId);
  
  // Optional: Save preference
  localStorage.setItem('preferredMeshStyle', currentId);
});
```

## Programmatic Style Control

```javascript
// Without using the widget
import { 
  getGeneratorRegistry,
  setActiveMeshGenerator 
} from '../renderer/mesh-generators/index.js';

// Get available styles
const registry = getGeneratorRegistry();
const styles = registry.getGeneratorIds(); // ['voxel-cube', 'low-poly']

// Switch style programmatically
setActiveMeshGenerator('low-poly');

// Get current style
const currentStyle = registry.getActiveGeneratorId();
console.log('Current style:', currentStyle);
```

## Testing Integration

```javascript
// Mock for tests
const mockWidget = {
  init: async () => {},
  mount: () => {},
  onApply: (callback) => {
    mockWidget._applyCallback = callback;
  },
  triggerApply: (generatorId) => {
    if (mockWidget._applyCallback) {
      mockWidget._applyCallback(generatorId);
    }
  }
};

// Use in tests
it('should regenerate on style change', async () => {
  const widget = mockWidget;
  await widget.init();
  
  let regenerated = false;
  widget.onApply(async () => {
    regenerated = true;
  });
  
  widget.triggerApply('low-poly');
  expect(regenerated).toBe(true);
});
```

## Notes
- Widget requires `getWidget()` base class from `ui/widget-base.js`
- Generator registry must be initialized (happens automatically in browser)
- Style changes dispatch `meshGeneratorChanged` event on `window`
- Widget includes built-in notification system for user feedback
