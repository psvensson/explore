/**
 * Widget Base Module - ES Module wrapper for Widget.js
 * This module provides clean ES module access to the Widget class
 */

// Create MockWidget once for Node.js environment
const createMockWidget = () => {
    if (typeof global !== 'undefined' && global.MockWidget) {
        return global.MockWidget;
    }
    
    const MockWidget = class MockWidget {
        constructor(containerOrOptions = {}) {
            // Handle both Widget.js style (container first) and options object
            if (containerOrOptions && containerOrOptions.nodeType) {
                // Container element passed (Widget.js style)
                this.element = containerOrOptions;
                this.el = containerOrOptions;
                this.name = 'mock-widget';
            } else {
                // Options object passed (our constructor style)
                const { name = 'mock-widget', template = '', style = '' } = containerOrOptions;
                this.name = name;
                this.element = null;
                this.el = null;
            }
            this.uid = `${this.name}-${MockWidget._uidCounter++}`;
            this.state = {};
            this._readyFired = false;
        }
        
        render(ctx) {
            return `<div data-widget-id="${this.uid}">Mock ${this.name}</div>`;
        }
        
        setState(newState) {
            Object.assign(this.state, newState);
        }
        
        _wire() {}
        _afterRender() {}
        ready() {}
    };
    
    MockWidget._uidCounter = 1;
    MockWidget.styledOnce = new Set();
    MockWidget.define = function(name, Klass) {
        MockWidget._registeredWidgets = MockWidget._registeredWidgets || {};
        MockWidget._registeredWidgets[name] = Klass;
    };
    
    // Store for reuse
    if (typeof global !== 'undefined') {
        global.MockWidget = MockWidget;
    }
    
    return MockWidget;
};

// Wait for Widget.js to load and register the global Widget class
function waitForWidget() {
    return new Promise((resolve) => {
        // If Widget is already available, resolve immediately
        if (typeof window !== 'undefined' && window.Widget) {
            resolve(window.Widget);
            return;
        }
        
        // If we're in Node.js (testing), create a mock
        if (typeof window === 'undefined') {
            resolve(createMockWidget());
            return;
        }
        
        // In browser, wait for Widget to be available
        const checkWidget = () => {
            if (window.Widget) {
                resolve(window.Widget);
            } else {
                setTimeout(checkWidget, 10);
            }
        };
        checkWidget();
    });
}

// Export the Widget class promise
export const WidgetBase = waitForWidget();

// Also provide a synchronous getter for when we know it's loaded
export function getWidget() {
    // In browser with Widget.js loaded (must be a function, not just an object)
    if (typeof window !== 'undefined' && window.Widget && typeof window.Widget === 'function') {
        return window.Widget;
    }
    
    // In Node.js or Jest without real Widget - use MockWidget
    if (typeof window === 'undefined' || (typeof window === 'object' && (!window.Widget || typeof window.Widget !== 'function'))) {
        return createMockWidget();
    }
    
    throw new Error('Widget class not yet available');
}

// Default export for convenience
export default WidgetBase;