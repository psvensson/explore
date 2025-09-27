/**
 * Tests for 3D View Widgets - Size Controls and Tileset Selector
 */

import { jest } from '@jest/globals';

// Mock Widget.js
global.Widget = {
  define: jest.fn()
};

// Mock DOM
global.document = {
  createElement: jest.fn(() => ({
    innerHTML: '',
    style: {},
    addEventListener: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(() => [])
  })),
  contains: jest.fn(() => true)
};

global.window = {
  Widget: global.Widget,
  addEventListener: jest.fn()
};

describe('3D View Widgets Defaults', () => {
  
  describe('SizeControlsWidget', () => {
    let SizeControlsWidget;
    
    beforeEach(async () => {
      // Reset mocks
      jest.clearAllMocks();
      
      // Import the widget
      const module = await import('../docs/ui/widgets/size-controls.js');
      SizeControlsWidget = module.SizeControlsWidget;
    });
    
    test('should have correct default dimensions', () => {
      const widget = new SizeControlsWidget();
      
      expect(widget.state).toBeDefined();
      expect(widget.state.width).toBe(6);
      expect(widget.state.height).toBe(3);
      expect(widget.state.length).toBe(6);
    });
    
    test('template should use state values', () => {
      const widget = new SizeControlsWidget();
      const template = widget.options.template;
      
      expect(template).toContain('{{width}}');
      expect(template).toContain('{{height}}');
      expect(template).toContain('{{length}}');
    });
    
    test('getSize should return current state values', () => {
      const widget = new SizeControlsWidget();
      const size = widget.getSize();
      
      expect(size).toEqual({
        x: 6,
        y: 3,
        z: 6
      });
    });
    
    test('should have proper input constraints', () => {
      const widget = new SizeControlsWidget();
      const template = widget.options.template;
      
      // Check min/max values
      expect(template).toContain('min="1"');
      expect(template).toContain('max="20"'); // for width and length
      expect(template).toContain('max="10"'); // for height
    });
  });
  
  describe('TilesetSelectorWidget', () => {
    let TilesetSelectorWidget;
    
    beforeEach(async () => {
      jest.clearAllMocks();
      
      const module = await import('../docs/ui/widgets/tileset-selector.js');
      TilesetSelectorWidget = module.TilesetSelectorWidget;
    });
    
    test('should have default tileset selection', () => {
      const widget = new TilesetSelectorWidget();
      
      expect(widget.state).toBeDefined();
      expect(widget.state.selectedTileset).toBe('default');
    });
    
    test('should have multiple tileset options', () => {
      const widget = new TilesetSelectorWidget();
      
      expect(widget.state.tilesets).toBeDefined();
      expect(Array.isArray(widget.state.tilesets)).toBe(true);
      expect(widget.state.tilesets.length).toBeGreaterThan(1);
      
      // Check for expected options
      const tilesetValues = widget.state.tilesets.map(t => t.value);
      expect(tilesetValues).toContain('default');
      expect(tilesetValues).toContain('simple');
    });
    
    test('should have default tileset info', () => {
      const widget = new TilesetSelectorWidget();
      
      expect(widget.state.selectedTilesetInfo).toBeDefined();
      expect(widget.state.selectedTilesetInfo.description).toBeTruthy();
      expect(widget.state.selectedTilesetInfo.tileCount).toBeGreaterThan(0);
    });
    
    test('template should show selected tileset', () => {
      const widget = new TilesetSelectorWidget();
      const template = widget.options.template;
      
      expect(template).toContain('{{#each tilesets}}');
      expect(template).toContain('{{#if-eq value ../selectedTileset}}selected{{/if-eq}}');
    });
  });
  
  describe('GeneratorPanelWidget', () => {
    let GeneratorPanelWidget;
    
    beforeEach(async () => {
      jest.clearAllMocks();
      
      const module = await import('../docs/ui/widgets/generator-panel.js');
      GeneratorPanelWidget = module.GeneratorPanelWidget;
    });
    
    test('should initialize with expanded state by default', () => {
      const widget = new GeneratorPanelWidget();
      
      expect(widget.state).toBeDefined();
      expect(widget.state.collapsed).toBe(false);
    });
    
    test('template should contain sub-widget containers', () => {
      const widget = new GeneratorPanelWidget();
      const template = widget.options.template;
      
      expect(template).toContain('id="size-controls-widget"');
      expect(template).toContain('id="tileset-selector-widget"');
      expect(template).toContain('id="generation-actions-widget"');
      expect(template).toContain('id="advanced-options-widget"');
    });
    
    test('should have collapse toggle functionality', () => {
      const widget = new GeneratorPanelWidget();
      const template = widget.options.template;
      
      expect(template).toContain('{{on \'click\' \'toggleCollapse\'}}');
      expect(template).toContain('{{#if collapsed}}▶{{else}}▼{{/if}}');
    });
  });
  
  describe('SceneViewerWidget', () => {
    let SceneViewerWidget;
    
    beforeEach(async () => {
      jest.clearAllMocks();
      
      const module = await import('../docs/ui/widgets/scene-viewer.js');
      SceneViewerWidget = module.SceneViewerWidget;
    });
    
    test('template should contain canvas element', () => {
      const widget = new SceneViewerWidget();
      const template = widget.options.template;
      
      expect(template).toContain('<canvas id="threejs-canvas">');
      expect(template).toContain('class="scene-viewer"');
      expect(template).toContain('class="fps-counter"');
    });
    
    test('should have proper CSS for canvas sizing', () => {
      const widget = new SceneViewerWidget();
      const style = widget.options.style;
      
      expect(style).toContain('.scene-viewer');
      expect(style).toContain('#threejs-canvas');
      expect(style).toContain('width: 100%');
      expect(style).toContain('height: 100%');
    });
  });
});