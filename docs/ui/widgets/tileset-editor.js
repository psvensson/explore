/**
 * TilesetEditorWidget - Main coordinator widget for the hierarchical tileset editor
 */

import { getWidget } from '../widget-base.js';

export class TilesetEditorWidget extends getWidget() {
    constructor(element) {
        super(element, {
            template: `
                <div class="tileset-editor">
                    <!-- Navigation Breadcrumb -->
                    <div class="editor-navigation">
                        <div class="breadcrumb">
                            <span class="breadcrumb-item {{#if-eq currentView 'overview'}}active{{/if-eq}}" 
                                  onclick="{{ref}}.showOverview()">Tileset Editor</span>
                            {{#unless (eq currentView 'overview')}}
                            <span class="breadcrumb-separator"> / </span>
                            <span class="breadcrumb-item active">{{currentViewTitle}}</span>
                            {{/unless}}
                        </div>
                        {{#unless (eq currentView 'overview')}}
                        <button class="btn btn-secondary" onclick="{{ref}}.showOverview()">← Back to Overview</button>
                        {{/unless}}
                    </div>

                    <!-- Main Content Area -->
                    <div class="editor-content">
                        {{#if-eq currentView 'overview'}}
                            {{widget "tileset-overview"}}
                        {{else if-eq currentView 'structure'}}
                            {{widget "structure-editor"}}
                        {{else if-eq currentView 'metadata'}}
                            {{widget "metadata-editor"}}
                        {{else if-eq currentView 'package'}}
                            {{widget "package-editor"}}
                        {{else if-eq currentView 'configuration'}}
                            {{widget "configuration-editor"}}
                        {{/if-eq}}
                    </div>
                </div>
            `,
            style: `
                .tileset-editor {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    background: #1a1a1a;
                    color: #e0e0e0;
                }
                
                .editor-navigation {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 20px;
                    background: #2d2d2d;
                    border-bottom: 2px solid #4a90e2;
                }
                
                .breadcrumb {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 14px;
                }
                
                .breadcrumb-item {
                    cursor: pointer;
                    color: #8bb3e8;
                    transition: color 0.2s;
                }
                
                .breadcrumb-item:hover {
                    color: #cfe6ff;
                }
                
                .breadcrumb-item.active {
                    color: #cfe6ff;
                    font-weight: 600;
                }
                
                .breadcrumb-separator {
                    color: #666;
                }
                
                .btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 13px;
                    transition: all 0.2s;
                }
                
                .btn-secondary {
                    background: #4a90e2;
                    color: white;
                }
                
                .btn-secondary:hover {
                    background: #357abd;
                }
                
                .editor-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 0;
                }
            `
        });
        
        this.state = { 
            currentView: 'overview',
            currentViewTitle: ''
        };
    }

    ready() {
        console.log('[TilesetEditor] Widget ready');
        
        // Listen for navigation events from child widgets
        this.element.addEventListener('navigate-to-step', (e) => {
            const { step } = e.detail;
            switch (step) {
                case 'structure':
                    this.showStructureEditor();
                    break;
                case 'metadata':
                    this.showMetadataEditor();
                    break;
                case 'package':
                    this.showPackageEditor();
                    break;
                case 'configuration':
                    this.showConfigurationEditor();
                    break;
            }
        });
    }

    showOverview() {
        this.update({ 
            currentView: 'overview',
            currentViewTitle: ''
        });
    }

    showStructureEditor() {
        this.update({ 
            currentView: 'structure',
            currentViewTitle: 'Design Structures'
        });
    }

    showMetadataEditor() {
        this.update({ 
            currentView: 'metadata',
            currentViewTitle: 'Create Metadata Packages'
        });
    }

    showPackageEditor() {
        this.update({ 
            currentView: 'package',
            currentViewTitle: 'Combine into Tile Packages'
        });
    }

    showConfigurationEditor() {
        this.update({ 
            currentView: 'configuration',
            currentViewTitle: 'Build Configurations'
        });
    }
}

// Register widget
if (typeof window !== 'undefined') {
    getWidget().define('tileset-editor', TilesetEditorWidget);
}