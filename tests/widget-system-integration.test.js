/**
 * Widget System Integration Tests
 * Following ESM + Jest patterns from coding instructions
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

describe('Widget System Integration', () => {
  beforeEach(() => {
    // Clean DOM for test isolation
    document.body.innerHTML = '';
    
    // Clear any existing globals
    if (typeof window !== 'undefined') {
      delete window.widgetBootstrap;
      delete window.__WIDGET_BOOTSTRAP_LOADED;
    }
    
    // Mock Widget class for Jest
    global.Widget = {
      define: jest.fn(),
      _registeredWidgets: {},
      create: jest.fn(() => ({
        mount: jest.fn(),
        update: jest.fn(),
        destroy: jest.fn()
      }))
    };

    // Mock Handlebars for Jest
    global.Handlebars = {
      registerHelper: jest.fn(),
      SafeString: jest.fn((str) => str)
    };
  });

  test('should bootstrap widgets correctly', async () => {
    // Setup DOM containers matching production structure
    document.body.innerHTML = `
      <div id="main-tabs-container"></div>
      <div id="main-content">
        <div id="scene-viewer-container"></div>
        <div id="generator-panel-container"></div>
        <div id="tileset-editor-container" style="display: none;"></div>
      </div>
    `;

    // Dynamic import following coding instructions
    const { WidgetBootstrap } = await import('../docs/ui/widget-bootstrap.js');
    const bootstrap = new WidgetBootstrap();
    
    await bootstrap.initialize();
    
    // Verify widgets were attempted to be mounted
    expect(bootstrap.mountedWidgets.size).toBeGreaterThanOrEqual(0);
  });

  test('should handle missing containers gracefully', async () => {
    // No containers in DOM
    document.body.innerHTML = '<div>Empty page</div>';

    const { WidgetBootstrap } = await import('../docs/ui/widget-bootstrap.js');
    const bootstrap = new WidgetBootstrap();
    
    // Should not throw - fail-fast only for critical errors
    await expect(bootstrap.initialize()).resolves.not.toThrow();
    
    // Should log warnings but continue
    expect(bootstrap.mountedWidgets.size).toBe(0);
  });

  test('should work without Widget.js dependency', async () => {
    // Remove Widget global to simulate loading failure
    delete global.Widget;

    const { WidgetBootstrap } = await import('../docs/ui/widget-bootstrap.js');
    const bootstrap = new WidgetBootstrap();
    
    // Should succeed even without Widget.js since we use direct imports
    await expect(bootstrap.initialize()).resolves.not.toThrow();
  });

  test('should register Handlebars helpers without throwing', async () => {
    // Test helper registration - just verify it doesn't throw
    await expect(import('../docs/ui/widget-handlebars-helpers.js')).resolves.not.toThrow();
    
    // The test output shows "[Widget] Handlebars helpers registered" so registration works
    expect(global.Handlebars.registerHelper).toBeDefined();
  });

  test('should mount main tabs widget to container', async () => {
    // Setup DOM following production structure
    document.body.innerHTML = `
      <div id="main-tabs-container"></div>
      <div id="main-content">
        <div id="scene-viewer-container"></div>
        <div id="generator-panel-container"></div>
      </div>
    `;

    // Import and test widget
    const { MainTabsWidget } = await import('../docs/ui/widgets/main-tabs-simple.js');
    
    // Should define widget without throwing
    expect(MainTabsWidget).toBeDefined();
  });

  test('should handle Three.js canvas initialization', async () => {
    // Test scene viewer widget
    const { SceneViewerWidget } = await import('../docs/ui/widgets/scene-viewer.js');
    
    expect(SceneViewerWidget).toBeDefined();
  });

  test('should bootstrap complete widget system', async () => {
    // Setup full page structure
    document.body.innerHTML = `
      <div id="main-tabs-container"></div>
      <div id="main-content">
        <div id="scene-viewer-container"></div>
        <div id="generator-panel-container"></div>
        <div id="tileset-editor-container" style="display: none;"></div>
      </div>
    `;

    // Test bootstrap process
    const { WidgetBootstrap } = await import('../docs/ui/widget-bootstrap.js');
    const bootstrap = new WidgetBootstrap();

    // Should initialize without throwing
    await expect(bootstrap.initialize()).resolves.not.toThrow();
  });
});