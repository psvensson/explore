/**
 * Debug Jest Widget Loading - CLEAN version without mock interference
 */
import { jest } from '@jest/globals';

// Minimal setup to avoid interference
global.document = {
    readyState: 'complete',
    createElement: jest.fn(() => ({ appendChild: jest.fn() })),
    head: { appendChild: jest.fn() },
    body: { appendChild: jest.fn() }
};

global.Handlebars = {
    compile: jest.fn(() => jest.fn(() => '<div>Mock Template</div>')),
    registerHelper: jest.fn(),
    unregisterHelper: jest.fn(),
    helpers: {},
    SafeString: function(str) { this.string = str; }
};

// DO NOT set global.Widget - let widget-base.js handle it

describe('Debug Widget Loading', () => {
    test('should check getWidget() return value', async () => {
        const { getWidget } = await import('../docs/ui/widget-base.js');
        const Widget = getWidget();
        
        console.log('Widget type:', typeof Widget);
        console.log('Widget name:', Widget.name);
        console.log('Widget constructor:', Widget.constructor);
        console.log('Widget prototype:', Object.getOwnPropertyNames(Widget.prototype));
        
        // Test if we can extend it
        try {
            class TestWidget extends Widget {
                constructor() {
                    super({ name: 'test', template: '<div>test</div>' });
                }
            }
            console.log('Extension successful:', typeof TestWidget);
        } catch (error) {
            console.error('Extension failed:', error.message);
        }
    });
    
    test('should debug actual widget import', async () => {
        try {
            // First, check the base
            const { getWidget } = await import('../docs/ui/widget-base.js');
            const Widget = getWidget();
            console.log('Base Widget available:', typeof Widget);
            
            // Now try the actual import
            const module = await import('../docs/ui/widgets/main-tabs-simple.js');
            console.log('Widget module loaded:', typeof module.MainTabsWidget);
        } catch (error) {
            console.error('Import error:', error.message);
            console.error('Stack:', error.stack);
        }
    });
});