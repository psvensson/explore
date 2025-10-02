/**
 * Main Tabs Widget - Top-level navigation
 * Following widget-base import pattern and Node.js compatibility
 */

import { getWidget } from '../widget-base.js';

const Widget = getWidget();

class MainTabsWidget extends Widget {
    constructor() {
        super({
            name: 'main-tabs-simple',
            template: `
                <div class="main-tab-nav">
                    <button class="main-tab-button {{#if is3DActive}}active{{/if}}" 
                            data-click="switch3D">3D View</button>
                    <button class="main-tab-button {{#if isEditorActive}}active{{/if}}" 
                            data-click="switchEditor">Tileset Editor</button>
                </div>
            `,
            style: `
                .main-tab-nav {
                    display: flex;
                    background: rgba(17, 17, 19, 0.95);
                    border-bottom: 1px solid rgba(51, 51, 51, 0.8);
                    padding: 0;
                }
                .main-tab-button {
                    background: transparent;
                    color: rgba(207, 230, 255, 0.7);
                    border: none;
                    padding: 12px 24px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-size: 14px;
                    font-weight: 500;
                }
                .main-tab-button:hover {
                    background: rgba(51, 51, 51, 0.3);
                    color: rgba(207, 230, 255, 0.9);
                }
                .main-tab-button.active {
                    background: rgba(34, 139, 246, 0.1);
                    color: #60A5FA;
                    border-bottom: 2px solid #60A5FA;
                }
            `
        });
        
        this.state = { 
            is3DActive: true, 
            isEditorActive: false 
        };
    }

    ready() {
        console.log('[MainTabs] Widget ready');
        // Initialize the view based on current state
        // Use setTimeout to ensure other widgets have time to mount
        setTimeout(() => this.updateMainContent(), 0);
    }

    switch3D() {
        this.update({ 
            is3DActive: true, 
            isEditorActive: false 
        });
        this.updateMainContent();
    }

    switchEditor() {
        this.update({ 
            is3DActive: false, 
            isEditorActive: true 
        });
        this.updateMainContent();
        this.initializeTilesetEditor();
    }

    updateMainContent() {
        if (typeof window === 'undefined') return;

        const sceneContainer = document.getElementById('scene-viewer-container');
        const generatorContainer = document.getElementById('generator-panel-container');
        const editorContainer = document.getElementById('tileset-editor-container');

        console.log('[MainTabs] updateMainContent called', {
            is3DActive: this.state.is3DActive,
            sceneContainer: !!sceneContainer,
            generatorContainer: !!generatorContainer,
            editorContainer: !!editorContainer
        });

        if (this.state.is3DActive) {
            // Show 3D view components
            if (sceneContainer) {
                sceneContainer.style.display = 'block';
                console.log('[MainTabs] Scene container shown', {
                    display: sceneContainer.style.display,
                    offsetWidth: sceneContainer.offsetWidth,
                    offsetHeight: sceneContainer.offsetHeight,
                    clientWidth: sceneContainer.clientWidth,
                    clientHeight: sceneContainer.clientHeight,
                    children: sceneContainer.children.length,
                    hasCanvas: !!sceneContainer.querySelector('canvas')
                });
            }
            if (generatorContainer) {
                generatorContainer.style.display = 'block';
                console.log('[MainTabs] Generator container shown', {
                    display: generatorContainer.style.display,
                    offsetWidth: generatorContainer.offsetWidth,
                    offsetHeight: generatorContainer.offsetHeight
                });
            }
            if (editorContainer) {
                editorContainer.style.display = 'none';
                console.log('[MainTabs] Editor container hidden');
            }
            
            // Check if canvas exists and log its dimensions
            const canvas = document.getElementById('threejs-canvas');
            if (canvas) {
                console.log('[MainTabs] Canvas found after showing 3D view', {
                    width: canvas.width,
                    height: canvas.height,
                    offsetWidth: canvas.offsetWidth,
                    offsetHeight: canvas.offsetHeight,
                    clientWidth: canvas.clientWidth,
                    clientHeight: canvas.clientHeight,
                    parentId: canvas.parentElement?.id,
                    visible: canvas.offsetParent !== null
                });
            } else {
                console.log('[MainTabs] No canvas found after showing 3D view');
            }
        } else {
            // Show tileset editor
            if (sceneContainer) {
                sceneContainer.style.display = 'none';
                console.log('[MainTabs] Scene container hidden');
            }
            if (generatorContainer) {
                generatorContainer.style.display = 'none';
                console.log('[MainTabs] Generator container hidden');
            }
            if (editorContainer) {
                editorContainer.style.display = 'block';
                console.log('[MainTabs] Editor container shown', {
                    display: editorContainer.style.display,
                    offsetWidth: editorContainer.offsetWidth,
                    offsetHeight: editorContainer.offsetHeight,
                    children: editorContainer.children.length
                });
            }
        }
    }

    async initializeTilesetEditor() {
        if (typeof window === 'undefined') return;

        try {
            // Lazy loading for simplified tileset editor following coding instructions
            const { SimplifiedTilesetEditor } = await import('../simplified_tileset_editor.js');
            
            const container = document.getElementById('tileset-editor-container');
            if (container && !window.mainTilesetEditor) {
                window.mainTilesetEditor = new SimplifiedTilesetEditor(container);
                console.log('[MainTabs] Simplified tileset editor initialized');
            }
        } catch (error) {
            console.error('[MainTabs] Failed to initialize simplified tileset editor:', error);
            
            // Fallback message if editor fails to load
            const container = document.getElementById('tileset-editor-container');
            if (container) {
                container.innerHTML = `
                    <div class="editor-error">
                        <h3>Tileset Editor Error</h3>
                        <p>Failed to load simplified tileset editor: ${error.message}</p>
                        <p>Check browser console for details.</p>
                    </div>
                `;
            }
        }
    }
}

// Register with Widget.js if available (browser environment)
if (typeof window !== 'undefined' && window.Widget && window.Widget.define) {
    window.Widget.define('main-tabs-simple', MainTabsWidget);
}

export { MainTabsWidget };