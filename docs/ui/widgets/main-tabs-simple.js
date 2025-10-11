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
                    <button class="main-tab-button {{#if isMapEditorActive}}active{{/if}}" 
                            data-click="switchMapEditor">Map Editor</button>
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
            isMapEditorActive: false,
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
            isMapEditorActive: false,
            isEditorActive: false 
        });
        this.updateMainContent();
    }

    switchMapEditor() {
        this.update({ 
            is3DActive: false,
            isMapEditorActive: true,
            isEditorActive: false 
        });
        this.updateMainContent();
        this.initializeMapEditor();
    }

    switchEditor() {
        this.update({ 
            is3DActive: false,
            isMapEditorActive: false,
            isEditorActive: true 
        });
        this.updateMainContent();
        this.initializeTilesetEditor();
    }

    updateMainContent() {
        if (typeof window === 'undefined') return;

        const sceneContainer = document.getElementById('scene-viewer-container');
        const generatorContainer = document.getElementById('generator-panel-container');
        const mapEditorContainer = document.getElementById('map-editor-container');
        const editorContainer = document.getElementById('tileset-editor-container');

        console.log('[MainTabs] updateMainContent called', {
            is3DActive: this.state.is3DActive,
            isMapEditorActive: this.state.isMapEditorActive,
            sceneContainer: !!sceneContainer,
            generatorContainer: !!generatorContainer,
            mapEditorContainer: !!mapEditorContainer,
            editorContainer: !!editorContainer
        });

        if (this.state.is3DActive) {
            // Show 3D view components
            if (sceneContainer) {
                sceneContainer.style.display = 'block';
                console.log('[MainTabs] Scene container shown');
            }
            if (generatorContainer) {
                generatorContainer.style.display = 'block';
                console.log('[MainTabs] Generator container shown');
            }
            if (mapEditorContainer) {
                mapEditorContainer.style.display = 'none';
                console.log('[MainTabs] Map editor container hidden');
            }
            if (editorContainer) {
                editorContainer.style.display = 'none';
                console.log('[MainTabs] Editor container hidden');
            }
            
            // Deactivate map editor if active
            if (window.mainMapEditor) {
                window.mainMapEditor.deactivate();
            }
            
            // Check if canvas exists
            const canvas = document.getElementById('threejs-canvas');
            if (canvas) {
                console.log('[MainTabs] Canvas found after showing 3D view');
            }
        } else if (this.state.isMapEditorActive) {
            // Show map editor
            if (sceneContainer) {
                sceneContainer.style.display = 'block';
                console.log('[MainTabs] Scene container shown (for map editor)');
            }
            if (generatorContainer) {
                generatorContainer.style.display = 'none';
                console.log('[MainTabs] Generator container hidden');
            }
            if (mapEditorContainer) {
                mapEditorContainer.style.display = 'block';
                console.log('[MainTabs] Map editor container shown');
            }
            if (editorContainer) {
                editorContainer.style.display = 'none';
                console.log('[MainTabs] Tileset editor container hidden');
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
            if (mapEditorContainer) {
                mapEditorContainer.style.display = 'none';
                console.log('[MainTabs] Map editor container hidden');
            }
            if (editorContainer) {
                editorContainer.style.display = 'block';
                console.log('[MainTabs] Editor container shown');
            }
            
            // Deactivate map editor if active
            if (window.mainMapEditor) {
                window.mainMapEditor.deactivate();
            }
        }
    }

    async initializeMapEditor() {
        if (typeof window === 'undefined') return;

        try {
            console.log('[MainTabs] Starting map editor initialization...');
            
            // Lazy load map editor and Three.js
            const { MapEditor } = await import('../map_editor.js');
            console.log('[MainTabs] MapEditor class imported');
            
            const container = document.getElementById('map-editor-container');
            const renderer = window.dungeonRenderer;
            
            console.log('[MainTabs] Map editor prerequisites:', {
                container: !!container,
                renderer: !!renderer,
                rendererCanvas: !!renderer?.canvas,
                rendererCamera: !!renderer?.camera,
                rendererScene: !!renderer?.scene,
                rendererTHREE: !!renderer?.THREE,
                existingEditor: !!window.mainMapEditor
            });
            
            if (!renderer) {
                throw new Error('Dungeon renderer not initialized');
            }
            
            // Get THREE from renderer
            const THREE = renderer.THREE;
            
            if (container && !window.mainMapEditor) {
                console.log('[MainTabs] Creating new MapEditor instance...');
                window.mainMapEditor = new MapEditor(container, renderer, THREE);
                await window.mainMapEditor.initialize();
                console.log('[MainTabs] Map editor initialized');
            } else if (window.mainMapEditor) {
                console.log('[MainTabs] Reactivating existing MapEditor instance');
                window.mainMapEditor.activate();
            }
        } catch (error) {
            console.error('[MainTabs] Failed to initialize map editor:', error);
            console.error('[MainTabs] Error stack:', error.stack);
            
            const container = document.getElementById('map-editor-container');
            if (container) {
                container.innerHTML = `
                    <div class="editor-error">
                        <h3>Map Editor Error</h3>
                        <p>Failed to load map editor: ${error.message}</p>
                        <p>Check browser console for details.</p>
                    </div>
                `;
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