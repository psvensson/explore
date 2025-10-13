/**
 * Generator Panel Widget - Contains size controls, actions, and advanced options
 */

import { getWidget } from '../widget-base.js';
import { setLayerLayoutMode, getLayerLayoutMode } from '../../utils/voxel-to-world.js';

const Widget = getWidget();

class GeneratorPanelWidget extends Widget {
    constructor() {
        super({
            name: 'generator-panel',
            template: `
                <section class="generator-panel">
                    <div class="panel-header" {{on 'click' 'toggleCollapse'}}>
                        <h2>Controls</h2>
                        <button class="collapse-toggle">
                            {{#if collapsed}}▶{{else}}▼{{/if}}
                        </button>
                    </div>
                    
                    {{#unless collapsed}}
                    <div class="panel-content">
                        <div id="size-controls-widget" class="control-widget"></div>
                        <div id="tileset-selector-widget" class="control-widget"></div>
                        <div id="mesh-style-selector-widget" class="control-widget"></div>
                        <div id="advanced-options-widget" class="control-widget"></div>
                        <div id="generation-actions-widget" class="control-widget"></div>
                        
                        <div class="usage-hint">
                            <p>Press <strong>F</strong> to toggle FPS / Orbit camera. In FPS mode use <strong>W A S D</strong> to move, <strong>Q E</strong> to turn left/right, <strong>Space</strong> up, <strong>Shift</strong> down, and move the mouse to look around (click canvas to lock pointer).</p>
                        </div>
                    </div>
                    {{/unless}}
                </section>
            `,
            style: `
                .generator-panel {
                    background: #1e3a5f;
                    color: #cfe6ff;
                    padding: 16px;
                    border-radius: 8px;
                    margin: 16px;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                }
                
                .panel-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                    cursor: pointer;
                }
                
                .panel-header h2 {
                    margin: 0;
                    font-size: 18px;
                    color: #cfe6ff;
                }
                
                .collapse-toggle {
                    background: none;
                    border: none;
                    color: #8bb3e8;
                    font-size: 16px;
                    cursor: pointer;
                    padding: 4px 8px;
                    border-radius: 3px;
                    transition: background 0.2s;
                }
                
                .collapse-toggle:hover {
                    background: rgba(139, 179, 232, 0.2);
                }
                
                .panel-content {
                    animation: slideDown 0.3s ease-out;
                }
                
                .control-widget {
                    margin-bottom: 8px;
                }
                
                .advanced-options-placeholder {
                    padding: 12px;
                    background: rgba(15, 39, 64, 0.5);
                    border: 1px dashed #1b4469;
                    border-radius: 4px;
                    text-align: center;
                }
                
                .placeholder-title {
                    font-weight: 600;
                    color: #8bb3e8;
                    margin-bottom: 4px;
                }
                
                .placeholder-text {
                    color: #6b8db5;
                    font-size: 12px;
                    margin: 0;
                }
                
                .usage-hint {
                    margin-top: 16px;
                    padding: 12px;
                    background: rgba(139, 179, 232, 0.1);
                    border-radius: 6px;
                    border-left: 4px solid #4a90e2;
                }
                
                .usage-hint p {
                    margin: 0;
                    font-size: 12px;
                    line-height: 1.4;
                    color: #b8d4f2;
                }
                
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        max-height: 0;
                        overflow: hidden;
                    }
                    to {
                        opacity: 1;
                        max-height: 1000px;
                    }
                }
            `
        });
        
        this.state = { 
            collapsed: false
        };

        // Sub-widget references
        this.subWidgets = {};
    }

    ready() {
        console.log('[GeneratorPanel] Widget ready');

        // Restore collapse state from localStorage
        const savedCollapsed = localStorage.getItem('generatorPanelCollapsed');
        if (savedCollapsed !== null) {
            this.state.collapsed = savedCollapsed === 'true';
            this.update({ collapsed: this.state.collapsed });
        }

        // Apply saved layout mode (if any)
        const savedLayoutMode = localStorage.getItem('layerLayoutMode');
        if (savedLayoutMode) { 
            try { 
                setLayerLayoutMode(savedLayoutMode); 
            } catch (_) {} 
        }

        // Initialize sub-widgets when expanded
        if (!this.state.collapsed) {
            this.initializeSubWidgets();
        }
    }

    toggleCollapse() {
        const newCollapsed = !this.state.collapsed;
        this.update({ collapsed: newCollapsed });
        
        // Save collapse state to localStorage
        localStorage.setItem('generatorPanelCollapsed', newCollapsed.toString());

        // Initialize sub-widgets if expanding
        if (!newCollapsed) {
            setTimeout(() => this.initializeSubWidgets(), 100);
        }
    }

    async initializeSubWidgets() {
        try {
            // Import widget registry - widgets are already loaded via direct imports
            const { getWidgetClass } = await import('../widget-registry.js');
            
            // Sub-widgets are available in registry, just initialize them
            await this.initSizeControls();
            await this.initTilesetSelector();
            await this.initMeshStyleSelector();
            await this.initAdvancedOptions();
            await this.initGenerationActions();

            console.log('[GeneratorPanel] All sub-widgets initialized');
        } catch (error) {
            console.error('[GeneratorPanel] Failed to initialize sub-widgets:', error);
        }
    }

    async initSizeControls() {
        const container = this.el.querySelector('#size-controls-widget');
        if (container && !this.subWidgets.sizeControls) {
            const { getWidgetClass } = await import('../widget-registry.js');
            const SizeControlsWidget = getWidgetClass('size-controls');
            if (SizeControlsWidget) {
                // Use simple fallback HTML with defaults (avoids Widget.js complexity)
                container.innerHTML = `
                    <div class="size-controls">
                        <div class="size-controls-title">Dungeon Size</div>
                        <div class="size-inputs">
                            <label class="size-input-group">
                                Width
                                <input type="number" value="6" min="1" max="20" data-size="x" class="size-input" />
                            </label>
                            <label class="size-input-group">
                                Height
                                <input type="number" value="3" min="1" max="10" data-size="y" class="size-input" />
                            </label>
                            <label class="size-input-group">
                                Length
                                <input type="number" value="6" min="1" max="20" data-size="z" class="size-input" />
                            </label>
                        </div>
                    </div>
                `;
                
                // Add basic styling
                const style = document.createElement('style');
                style.textContent = `
                    .size-controls {
                        margin-top: 8px;
                    }
                    .size-controls-title {
                        font-weight: 600;
                        margin-bottom: 8px;
                        color: #cfe6ff;
                        font-size: 14px;
                    }
                    .size-inputs {
                        display: flex;
                        gap: 12px;
                        flex-wrap: wrap;
                    }
                    .size-input-group {
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                        font-size: 12px;
                        color: #8bb3e8;
                    }
                    .size-input {
                        width: 60px;
                        padding: 4px 6px;
                        background: #0f2740;
                        border: 1px solid #1b4469;
                        border-radius: 3px;
                        color: #cfe6ff;
                        font-size: 13px;
                    }
                    .size-input:focus {
                        outline: none;
                        border-color: #3fa0ff;
                        box-shadow: 0 0 0 2px rgba(63, 160, 255, 0.2);
                    }
                `;
                if (!document.head.querySelector('style[data-size-controls]')) {
                    style.setAttribute('data-size-controls', 'true');
                    document.head.appendChild(style);
                }
                
                this.subWidgets.sizeControls = true;
                console.log('[GeneratorPanel] Size controls created with fallback HTML and styling');
            }
        }
    }

    async initTilesetSelector() {
        const container = this.el.querySelector('#tileset-selector-widget');
        if (container && !this.subWidgets.tilesetSelector) {
            const { getWidgetClass } = await import('../widget-registry.js');
            const TilesetSelectorWidget = getWidgetClass('tileset-selector');
            if (TilesetSelectorWidget) {
                try {
                    const widget = new TilesetSelectorWidget();
                    
                    // Fallback to simple HTML with hardcoded defaults
                    container.innerHTML = `
                        <div class="tileset-selector">
                            <label for="tileset-dropdown" class="tileset-label">
                                Tileset Configuration:
                            </label>
                            <div class="tileset-controls">
                                <select id="tileset-dropdown" class="tileset-dropdown">
                                    <option value="default" selected>Default Dungeon</option>
                                    <option value="simple">Simple Rooms</option>
                                    <option value="advanced">Advanced (Coming Soon)</option>
                                </select>
                            </div>
                            <div class="tileset-info">
                                <small>Standard dungeon rooms and corridors</small>
                                <span class="tile-count">12 tiles</span>
                            </div>
                        </div>
                    `;
                    
                    this.subWidgets.tilesetSelector = widget;
                    console.log('[GeneratorPanel] Tileset selector created with defaults');
                } catch (error) {
                    console.error('[GeneratorPanel] Failed to create tileset selector:', error);
                }
            }
        }
    }

    async initMeshStyleSelector() {
        const container = this.el.querySelector('#mesh-style-selector-widget');
        if (!container || this.subWidgets.meshStyleSelector) {
            return;
        }

        // Dynamically import the mesh style selector
        const { MeshStyleSelectorWidget } = await import('./mesh-style-selector.js');
        const widget = new MeshStyleSelectorWidget();
        
        // Initialize widget (awaits bootstrap promise internally)
        await widget.init();
        
        // Mount to container with initial data from getData()
        const initialData = widget.getData();
        console.log('[GeneratorPanel] Mounting mesh style selector with data:', initialData);
        widget.mount(container, initialData);
        
        // Handle style application - regenerate dungeon
        widget.onApply(async (generatorId) => {
            // Trigger regeneration with new style
            const generateBtn = document.querySelector('[data-action="generate"]');
            if (generateBtn) {
                generateBtn.click();
            }
        });
        
        this.subWidgets.meshStyleSelector = widget;
    }

    async initAdvancedOptions() {
        const container = this.el.querySelector('#advanced-options-widget');
        if (container && !this.subWidgets.advancedOptions) {
            // Render options: switch layer layout mode for mesh rendering
            container.innerHTML = `
                <div class="advanced-options">
                    <div class="placeholder-title">Render Options</div>
                    <label class="layout-mode-label" style="display:flex;gap:8px;align-items:center;margin:6px 0;">
                        <span>Cell Layout</span>
                        <select id="layout-mode-select" class="layout-mode-select" style="flex:0 0 auto;background:#0f2740;border:1px solid #1b4469;border-radius:3px;color:#cfe6ff;padding:4px 6px;">
                            <option value="canonical">Canonical (thin floor/ceiling)</option>
                            <option value="equalThirds">Equal Thirds (uniform boxes)</option>
                        </select>
                    </label>
                    <p class="placeholder-text">This only affects rendering; generation and rules are unchanged.</p>
                </div>
            `;

            // Initialize select with current or saved mode
            const select = container.querySelector('#layout-mode-select');
            const saved = localStorage.getItem('layerLayoutMode');
            const current = saved || (typeof getLayerLayoutMode === 'function' ? getLayerLayoutMode() : 'canonical');
            select.value = current;

            // Apply mode and trigger regeneration when changed
            select.addEventListener('change', () => {
                const mode = select.value;
                try { setLayerLayoutMode(mode); } catch (_) {}
                localStorage.setItem('layerLayoutMode', mode);
                // Re-generate to reflect new rendering mode
                this.handleGeneration();
            });

            this.subWidgets.advancedOptions = true;
        }
    }

    async initGenerationActions() {
        const container = this.el.querySelector('#generation-actions-widget');
        if (container && !this.subWidgets.generationActions) {
            try {
                // Create simple HTML with working button
                container.innerHTML = `
                    <div class="generation-actions">
                        <button type="button" 
                                class="generate-button"
                                id="generate-dungeon-btn">
                            Generate Dungeon
                        </button>
                    </div>
                `;
                
                // Add click handler directly
                const generateBtn = container.querySelector('#generate-dungeon-btn');
                if (generateBtn) {
                    generateBtn.addEventListener('click', () => {
                        console.log('[GeneratorPanel] Generate button clicked!');
                        console.log('[GeneratorPanel] Checking window functions:', {
                            hasGenerateWFCDungeon: typeof window.generateWFCDungeon,
                            hasDungeonRenderer: typeof window.dungeonRenderer,
                            hasNDWFC3D: typeof window.NDWFC3D,
                            windowKeys: Object.keys(window).filter(k => k.includes('generate') || k.includes('WFC') || k.includes('dungeon')).slice(0, 10)
                        });
                        this.handleGeneration();
                    });
                    
                    console.log('[GeneratorPanel] Generation button created and wired up');
                } else {
                    console.error('[GeneratorPanel] Could not find generate button after creating HTML');
                }
                
                this.subWidgets.generationActions = true;
            } catch (error) {
                console.error('[GeneratorPanel] Failed to create generation actions:', error);
            }
        }
    }

    handleGeneration(data) {
        console.log('[GeneratorPanel] handleGeneration called');
        
        // Collect parameters from form inputs (since we're using fallback HTML)
        const sizeInputs = this.el.querySelectorAll('.size-input');
        const tilesetSelect = this.el.querySelector('#tileset-dropdown');
        
        let size = { x: 6, y: 3, z: 6 }; // defaults
        
        // Read from actual form inputs
        sizeInputs.forEach(input => {
            const dimension = input.getAttribute('data-size');
            const value = parseInt(input.value, 10) || 1;
            if (dimension === 'x') size.x = value;
            else if (dimension === 'y') size.y = value;
            else if (dimension === 'z') size.z = value;
        });
        
        const tileset = tilesetSelect?.value || 'default';
        const params = { ...size, tileset };
        
        console.log('[GeneratorPanel] Generating with params:', params);

        // Check if the generation function exists
        if (typeof window.generateWFCDungeon === 'function') {
            console.log('[GeneratorPanel] Calling window.generateWFCDungeon');
            window.generateWFCDungeon(params);
        } else {
            console.error('[GeneratorPanel] window.generateWFCDungeon not found. Available window functions:', 
                Object.keys(window).filter(key => key.includes('generate') || key.includes('WFC')));
            
            // Try alternative function names
            if (typeof window.generateDungeon === 'function') {
                console.log('[GeneratorPanel] Trying window.generateDungeon instead');
                window.generateDungeon(params);
            } else {
                console.error('[GeneratorPanel] No generation function found');
            }
        }

        // Simulate completion (in real implementation, this would be handled by the generation system)
        if (data && data.onComplete) {
            setTimeout(() => data.onComplete(true), 2000);
        }
    }

    handleCancellation() {
        console.log('[GeneratorPanel] Cancelling generation');
        
        if (window.cancelWFCDungeon) {
            window.cancelWFCDungeon();
        }
    }
}

// Register the widget
if (typeof window !== 'undefined' && window.Widget) {
    // Store widget for bootstrap system to find
    window.Widget._registeredWidgets = window.Widget._registeredWidgets || {};
    window.Widget._registeredWidgets['generator-panel'] = GeneratorPanelWidget;
    
    if (typeof window.Widget.define === 'function') {
        window.Widget.define('generator-panel', GeneratorPanelWidget);
    }
}

// Register with Widget.js if available (browser environment)
if (typeof window !== 'undefined' && window.Widget && window.Widget.define) {
    window.Widget.define('generator-panel', GeneratorPanelWidget);
}

export { GeneratorPanelWidget };
