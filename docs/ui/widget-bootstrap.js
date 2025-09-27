/**
 * Widget Bootstrap - Clean ES module approach
 * Direct imports and mounting, no global state dependencies
 */

import { WIDGET_REGISTRY, WIDGET_MOUNTS, getWidgetClass } from './widget-registry.js';
import './widget-handlebars-helpers.js';

class WidgetBootstrap {
  constructor() {
    this.mountedWidgets = new Map();
    this.initTimeout = null;
  }

  async initialize() {
    if (typeof window === 'undefined') {
      console.log('[Widget] Skipping widget bootstrap in Node.js environment');
      return;
    }

    try {
      // Simple direct mounting - widgets are imported by registry
      this.mountWidgets();
      
      console.log('[Widget] Bootstrap complete');
    } catch (error) {
      console.error('[Widget] Bootstrap failed:', error);
    }
  }

  mountWidgets() {
    let mountedCount = 0;

    WIDGET_MOUNTS.forEach(({ selector, widget }) => {
      const container = document.querySelector(selector);
      if (container) {
        try {
          // Get widget class from registry (direct import)
          const WidgetClass = getWidgetClass(widget);
          if (WidgetClass) {
            // Use Widget.js placeholder system for proper rendering
            container.innerHTML = `<span data-widget-plh="${widget}"></span>`;
            
            // Register widget with Widget.js and trigger placeholder upgrade
            if (typeof window !== 'undefined' && window.Widget && window.Widget.define) {
              window.Widget.define(widget, WidgetClass);
            }
            
            // Store for tracking (the actual instance will be created by Widget.js)
            this.mountedWidgets.set(widget, { container, widget });
            mountedCount++;
            console.log(`[Widget] Mounted ${widget} to ${selector}`);
          } else {
            console.error(`[Widget] Widget class ${widget} not found in registry`);
          }
        } catch (error) {
          console.error(`[Widget] Failed to mount ${widget}:`, error);
        }
      } else {
        console.warn(`[Widget] Container ${selector} not found for ${widget}`);
      }
    });

    if (mountedCount === 0) {
      console.warn('[Widget] No widgets were mounted - check container selectors');
    }
  }

  getWidget(name) {
    return this.mountedWidgets.get(name);
  }

  getAllWidgets() {
    return Array.from(this.mountedWidgets.entries());
  }
}

// Auto-initialize when DOM is ready (browser-native pattern)
if (typeof window !== 'undefined' && !window.__WIDGET_BOOTSTRAP_LOADED) {
  window.__WIDGET_BOOTSTRAP_LOADED = true;
  
  const initializeWidgets = () => {
    window.widgetBootstrap = new WidgetBootstrap();
    window.widgetBootstrap.initialize();
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWidgets);
  } else {
    // DOM already loaded
    initializeWidgets();
  }
}

export { WidgetBootstrap };