/**
 * MainTabsWidget - Top-level tab navigation between 3D View and Tileset Editor
 */

export class MainTabsWidget extends Widget {
    constructor() {
        super({
            name: 'main-tabs',
            template: `
                <div class="main-tab-system">
                    <nav class="main-tab-nav">
                        <button class="main-tab-button {{#if is3DActive}}active{{/if}}" 
                                data-click="switch3D">3D View</button>
                        <button class="main-tab-button {{#if isEditorActive}}active{{/if}}" 
                                data-click="switchEditor">Tileset Editor</button>
                    </nav>
                    
                    <main class="main-tab-content">
                        <div id="main-3d-pane" class="main-tab-pane {{#if is3DActive}}active{{/if}}">
                            {{widget "scene-viewer"}}
                            {{widget "generator-panel"}}
                        </div>
                        
                        <div id="main-editor-pane" class="main-tab-pane {{#if isEditorActive}}active{{/if}}">
                            <div id="tileset-editor-container">
                                {{#if isEditorActive}}
                                    {{widget "tileset-editor"}}
                                {{/if}}
                            </div>
                        </div>
                    </main>
                </div>
            `,
            style: `
                .main-tab-system {
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                }
                
                .main-tab-nav {
                    display: flex;
                    background: #0f2740;
                    border-bottom: 2px solid #2d5aa0;
                    padding: 0;
                    margin: 0;
                }
                
                .main-tab-button {
                    background: transparent;
                    border: none;
                    color: #8bb3e8;
                    padding: 12px 24px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    border-bottom: 3px solid transparent;
                    transition: all 0.2s;
                }
                
                .main-tab-button:hover {
                    background: rgba(139, 179, 232, 0.1);
                    color: #cfe6ff;
                }
                
                .main-tab-button.active {
                    color: #cfe6ff;
                    border-bottom-color: #4a90e2;
                    background: rgba(139, 179, 232, 0.15);
                }
                
                .main-tab-content {
                    flex: 1;
                    position: relative;
                    overflow: hidden;
                }
                
                .main-tab-pane {
                    display: none;
                    width: 100%;
                    height: 100%;
                    overflow-y: auto;
                }
                
                .main-tab-pane.active {
                    display: block;
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
        
        // Initialize main tileset editor when editor tab is clicked
        this.el.addEventListener('editor-activated', async () => {
            if (!window.mainTilesetEditor) {
                await this._initMainTilesetEditor();
            }
        });
    }

    switch3D() {
        console.log('[MainTabs] Switching to 3D view');
        this.update({ 
            is3DActive: true, 
            isEditorActive: false 
        });
    }

    switchEditor() {
        console.log('[MainTabs] Switching to tileset editor');
        this.update({ 
            is3DActive: false, 
            isEditorActive: true 
        });
        
        // Emit editor activation event
        this.el.dispatchEvent(new CustomEvent('editor-activated', { bubbles: true }));
    }

    async _initMainTilesetEditor() {
        try {
            const { TilesetEditor } = await import('../tileset_editor.js');
            const editorContainer = document.getElementById('tileset-editor-container');
            
            if (editorContainer) {
                window.mainTilesetEditor = new TilesetEditor(editorContainer);
                console.log('[MainTabs] Tileset editor initialized');
            }
        } catch (error) {
            console.error('[MainTabs] Failed to initialize tileset editor:', error);
        }
    }
}

// Register the widget
Widget.define('main-tabs', MainTabsWidget);