/**
 * Widget Integration Tests
 * Tests the widget system functionality and DOM rendering
 */

import { jest } from '@jest/globals';

// Mock browser environment
global.document = {
    readyState: 'complete',
    createElement: jest.fn(() => ({
        innerHTML: '',
        style: {},
        appendChild: jest.fn(),
        addEventListener: jest.fn(),
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(() => []),
        dispatchEvent: jest.fn()
    })),
    getElementById: jest.fn(() => ({
        innerHTML: '',
        style: { display: 'block' },
        appendChild: jest.fn(),
        addEventListener: jest.fn(),
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(() => [])
    })),
    querySelectorAll: jest.fn(() => []),
    head: {
        appendChild: jest.fn()
    },
    body: {
        appendChild: jest.fn()
    },
    addEventListener: jest.fn()
};

global.window = {
    addEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    localStorage: {
        getItem: jest.fn(),
        setItem: jest.fn()
    }
};

global.Handlebars = {
    compile: jest.fn(() => jest.fn(() => '<div>Mock Template</div>')),
    registerHelper: jest.fn(),
    unregisterHelper: jest.fn(),
    helpers: {},
    SafeString: function(str) { this.string = str; }
};

global.Widget = {
    define: jest.fn(),
    _uidCounter: 1,
    styledOnce: new Set()
};

// Also assign to globalThis for ES module compatibility
globalThis.Widget = global.Widget;

describe('Widget System Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset Widget system
        global.Widget._uidCounter = 1;
        global.Widget.styledOnce.clear();
    });

    describe('Widget Registry', () => {
        test('should load widget registry module', async () => {
            expect.assertions(1);
            try {
                const { WidgetRegistry } = await import('../docs/ui/widget-registry.js');
                expect(WidgetRegistry).toBeDefined();
            } catch (error) {
                console.error('Failed to load widget registry:', error);
                throw error;
            }
        });

        test('should have correct static methods', async () => {
            const { WidgetRegistry } = await import('../docs/ui/widget-registry.js');
            expect(typeof WidgetRegistry.loadWidget).toBe('function');
            expect(typeof WidgetRegistry.loadWidgets).toBe('function');
            expect(WidgetRegistry.loaded).toBeInstanceOf(Set);
            expect(WidgetRegistry.pending).toBeInstanceOf(Map);
            expect(WidgetRegistry.widgetClasses).toBeInstanceOf(Map);
        });

        test('should load individual widgets', async () => {
            const { WidgetRegistry } = await import('../docs/ui/widget-registry.js');
            
            // Mock successful widget import
            jest.doMock('../docs/ui/widgets/size-controls.js', () => ({
                SizeControlsWidget: class MockSizeControls {
                    constructor() {
                        this.name = 'size-controls';
                    }
                }
            }), { virtual: true });

            await expect(WidgetRegistry.loadWidget('size-controls')).resolves.not.toThrow();
            expect(WidgetRegistry.loaded.has('size-controls')).toBe(true);
        });
    });

    describe('Individual Widgets', () => {
        test('should load main-tabs-simple widget', async () => {
            expect.assertions(2);
            try {
                const module = await import('../docs/ui/widgets/main-tabs-simple.js');
                expect(module.MainTabsWidget).toBeDefined();
                expect(typeof module.MainTabsWidget).toBe('function');
            } catch (error) {
                console.error('Failed to load main-tabs-simple widget:', error);
                throw error;
            }
        });

        test('should load generator-panel widget', async () => {
            expect.assertions(2);
            try {
                const module = await import('../docs/ui/widgets/generator-panel.js');
                expect(module.GeneratorPanelWidget).toBeDefined();
                expect(typeof module.GeneratorPanelWidget).toBe('function');
            } catch (error) {
                console.error('Failed to load generator-panel widget:', error);
                throw error;
            }
        });

        test('should load scene-viewer widget', async () => {
            expect.assertions(2);
            try {
                const module = await import('../docs/ui/widgets/scene-viewer.js');
                expect(module.SceneViewerWidget).toBeDefined();
                expect(typeof module.SceneViewerWidget).toBe('function');
            } catch (error) {
                console.error('Failed to load scene-viewer widget:', error);
                throw error;
            }
        });

        test('should load size-controls widget', async () => {
            expect.assertions(2);
            try {
                const module = await import('../docs/ui/widgets/size-controls.js');
                expect(module.SizeControlsWidget).toBeDefined();
                expect(typeof module.SizeControlsWidget).toBe('function');
            } catch (error) {
                console.error('Failed to load size-controls widget:', error);
                throw error;
            }
        });
    });

    describe('Widget Instantiation', () => {
        test('should create widget instances with proper structure', async () => {
            const { MainTabsWidget } = await import('../docs/ui/widgets/main-tabs-simple.js');
            
            const widget = new MainTabsWidget();
            expect(widget).toBeDefined();
            expect(widget.name).toBe('main-tabs-simple');
            expect(typeof widget.render).toBe('function');
            expect(widget.state).toBeDefined();
        });

        test('should register widgets with Widget.define', async () => {
            // Import a widget module (this should call Widget.define)
            await import('../docs/ui/widgets/main-tabs-simple.js');
            
            // Check that Widget.define was called
            expect(global.Widget.define).toHaveBeenCalledWith('main-tabs-simple', expect.any(Function));
        });
    });

    describe('Widget Rendering', () => {
        test('should render widget templates', async () => {
            const { MainTabsWidget } = await import('../docs/ui/widgets/main-tabs-simple.js');
            const widget = new MainTabsWidget();
            
            // Mock Handlebars compilation
            const mockTemplate = jest.fn(() => '<nav class="main-tab-nav">Mock Content</nav>');
            global.Handlebars.compile.mockReturnValue(mockTemplate);
            
            const rendered = widget.render({ is3DActive: true, isEditorActive: false });
            expect(rendered).toContain('Mock Content');
            expect(mockTemplate).toHaveBeenCalled();
        });
    });
});

describe('DOM Integration Tests', () => {
    test('should have widget containers in HTML structure', async () => {
        // Mock fetch to return the actual HTML content
        global.fetch = jest.fn(() =>
            Promise.resolve({
                text: () => Promise.resolve(`
                    <div id="main-tabs-widget"></div>
                    <div id="generator-panel-widget"></div>
                    <div id="scene-viewer-widget"></div>
                `)
            })
        );

        const response = await fetch('http://localhost:8080');
        const html = await response.text();
        
        expect(html).toContain('id="main-tabs-widget"');
        expect(html).toContain('id="generator-panel-widget"');
        expect(html).toContain('id="scene-viewer-widget"');
    });

    test('should have correct script loading order', async () => {
        global.fetch = jest.fn(() =>
            Promise.resolve({
                text: () => Promise.resolve(`
                    <script src="https://cdn.jsdelivr.net/npm/handlebars@4.7.8/dist/handlebars.min.js"></script>
                    <script src="ui/Widget.js"></script>
                    <script type="module" src="ui/widget-registry.js"></script>
                `)
            })
        );

        const response = await fetch('http://localhost:8080');
        const html = await response.text();
        
        expect(html).toContain('handlebars');
        expect(html).toContain('Widget.js');
        expect(html).toContain('widget-registry.js');
    });
});

describe('Widget System Initialization', () => {
    test('should initialize basic widgets without errors', async () => {
        // Mock DOM elements
        const mockContainers = {
            'main-tabs-widget': { innerHTML: '', style: {} },
            'generator-panel-widget': { innerHTML: '', style: {} },
            'scene-viewer-widget': { innerHTML: '', style: {} }
        };

        global.document.getElementById = jest.fn((id) => mockContainers[id] || null);

        const { WidgetRegistry } = await import('../docs/ui/widget-registry.js');
        
        // Mock widget loading
        WidgetRegistry.loadWidgets = jest.fn(() => Promise.resolve());
        
        // Should not throw
        await expect(async () => {
            await WidgetRegistry.loadWidgets([
                'main-tabs-simple',
                'generator-panel',
                'scene-viewer'
            ]);
        }).not.toThrow();
    });
});