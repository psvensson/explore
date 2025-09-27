/**
 * StructureEditorWidget - Widget for designing 3D tile structures
 */

import { getWidget } from '../widget-base.js';

export class StructureEditorWidget extends getWidget() {
    constructor(element) {
        super(element, {
            template: `
                <div class="structure-editor">
                    <div class="editor-header">
                        <h2>🏗️ Design Structures</h2>
                        <p>Create the basic 3D geometry and shape of your tiles</p>
                    </div>

                    <div class="editor-layout">
                        <div class="editor-sidebar">
                            <div class="tool-panel">
                                <h3>Tools</h3>
                                <div class="tool-buttons">
                                    <button class="tool-btn {{#if-eq activeTool 'voxel'}}active{{/if-eq}}" 
                                            onclick="{{ref}}.setTool('voxel')">
                                        📦 Voxel
                                    </button>
                                    <button class="tool-btn {{#if-eq activeTool 'eraser'}}active{{/if-eq}}" 
                                            onclick="{{ref}}.setTool('eraser')">
                                        🗑️ Eraser
                                    </button>
                                    <button class="tool-btn {{#if-eq activeTool 'paint'}}active{{/if-eq}}" 
                                            onclick="{{ref}}.setTool('paint')">
                                        🎨 Paint
                                    </button>
                                </div>
                            </div>

                            <div class="structure-list">
                                <h3>Structures</h3>
                                <div class="structure-items">
                                    {{#each structures}}
                                    <div class="structure-item {{#if-eq ../selectedStructure.id id}}selected{{/if-eq}}"
                                         onclick="{{../ref}}.selectStructure({{@index}})">
                                        <div class="structure-preview">
                                            <div class="preview-icon">{{icon}}</div>
                                        </div>
                                        <div class="structure-info">
                                            <div class="structure-name">{{name}}</div>
                                            <div class="structure-meta">{{category}} • {{voxelCount}}v</div>
                                        </div>
                                    </div>
                                    {{/each}}
                                </div>
                                <button class="btn btn-primary" onclick="{{ref}}.createNewStructure()">
                                    + New Structure
                                </button>
                            </div>
                        </div>

                        <div class="editor-main">
                            <div class="voxel-editor">
                                <div class="editor-viewport" id="structure-viewport">
                                    {{#if selectedStructure}}
                                    <div class="viewport-placeholder">
                                        <div class="placeholder-icon">🏗️</div>
                                        <div class="placeholder-text">3D Voxel Editor</div>
                                        <div class="placeholder-subtitle">Structure: {{selectedStructure.name}}</div>
                                    </div>
                                    {{else}}
                                    <div class="viewport-placeholder">
                                        <div class="placeholder-icon">📦</div>
                                        <div class="placeholder-text">Select or create a structure to begin editing</div>
                                    </div>
                                    {{/if}}
                                </div>
                            </div>

                            <div class="editor-controls">
                                <div class="view-controls">
                                    <button class="control-btn" onclick="{{ref}}.rotateView('x')">↻ X</button>
                                    <button class="control-btn" onclick="{{ref}}.rotateView('y')">↻ Y</button>
                                    <button class="control-btn" onclick="{{ref}}.rotateView('z')">↻ Z</button>
                                    <button class="control-btn" onclick="{{ref}}.resetView()">🏠 Reset</button>
                                </div>
                                
                                {{#if selectedStructure}}
                                <div class="structure-properties">
                                    <input type="text" value="{{selectedStructure.name}}" 
                                           onchange="{{ref}}.updateStructureName(event.target.value)"
                                           placeholder="Structure name">
                                    <select onchange="{{ref}}.updateStructureCategory(event.target.value)">
                                        <option value="room" {{#if-eq selectedStructure.category 'room'}}selected{{/if-eq}}>Room</option>
                                        <option value="corridor" {{#if-eq selectedStructure.category 'corridor'}}selected{{/if-eq}}>Corridor</option>
                                        <option value="junction" {{#if-eq selectedStructure.category 'junction'}}selected{{/if-eq}}>Junction</option>
                                        <option value="stair" {{#if-eq selectedStructure.category 'stair'}}selected{{/if-eq}}>Stair</option>
                                        <option value="door" {{#if-eq selectedStructure.category 'door'}}selected{{/if-eq}}>Door</option>
                                    </select>
                                </div>
                                {{/if}}
                            </div>
                        </div>
                    </div>
                </div>
            `,
            style: `
                .structure-editor {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    background: #1a1a1a;
                    color: #e0e0e0;
                }
                
                .editor-header {
                    padding: 20px;
                    border-bottom: 1px solid #333;
                }
                
                .editor-header h2 {
                    margin: 0 0 8px 0;
                    color: #cfe6ff;
                }
                
                .editor-header p {
                    margin: 0;
                    color: #8bb3e8;
                }
                
                .editor-layout {
                    flex: 1;
                    display: flex;
                    overflow: hidden;
                }
                
                .editor-sidebar {
                    width: 300px;
                    background: #2d2d2d;
                    border-right: 1px solid #333;
                    display: flex;
                    flex-direction: column;
                    overflow-y: auto;
                }
                
                .tool-panel, .structure-list {
                    padding: 16px;
                    border-bottom: 1px solid #333;
                }
                
                .tool-panel h3, .structure-list h3 {
                    margin: 0 0 12px 0;
                    font-size: 14px;
                    color: #cfe6ff;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .tool-buttons {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                }
                
                .tool-btn {
                    padding: 8px;
                    background: #3a3a3a;
                    border: 1px solid #4a4a4a;
                    color: #e0e0e0;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.2s;
                }
                
                .tool-btn:hover {
                    background: #4a4a4a;
                }
                
                .tool-btn.active {
                    background: #4a90e2;
                    border-color: #357abd;
                }
                
                .structure-items {
                    max-height: 300px;
                    overflow-y: auto;
                    margin-bottom: 12px;
                }
                
                .structure-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 8px;
                    cursor: pointer;
                    border-radius: 4px;
                    transition: background 0.2s;
                }
                
                .structure-item:hover {
                    background: #3a3a3a;
                }
                
                .structure-item.selected {
                    background: #4a90e2;
                }
                
                .structure-preview {
                    width: 32px;
                    height: 32px;
                    background: #3a3a3a;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .preview-icon {
                    font-size: 16px;
                }
                
                .structure-info {
                    flex: 1;
                }
                
                .structure-name {
                    font-size: 13px;
                    font-weight: 500;
                }
                
                .structure-meta {
                    font-size: 11px;
                    color: #8bb3e8;
                }
                
                .editor-main {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }
                
                .voxel-editor {
                    flex: 1;
                    position: relative;
                }
                
                .editor-viewport {
                    width: 100%;
                    height: 100%;
                    background: #0f0f0f;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .viewport-placeholder {
                    text-align: center;
                    color: #666;
                }
                
                .placeholder-icon {
                    font-size: 48px;
                    margin-bottom: 16px;
                }
                
                .placeholder-text {
                    font-size: 18px;
                    margin-bottom: 8px;
                }
                
                .placeholder-subtitle {
                    font-size: 14px;
                    color: #4a90e2;
                }
                
                .editor-controls {
                    padding: 16px;
                    background: #2a2a2a;
                    border-top: 1px solid #333;
                    display: flex;
                    gap: 16px;
                    align-items: center;
                }
                
                .view-controls {
                    display: flex;
                    gap: 8px;
                }
                
                .control-btn {
                    padding: 6px 12px;
                    background: #3a3a3a;
                    border: 1px solid #4a4a4a;
                    color: #e0e0e0;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.2s;
                }
                
                .control-btn:hover {
                    background: #4a4a4a;
                }
                
                .structure-properties {
                    display: flex;
                    gap: 8px;
                    flex: 1;
                }
                
                .structure-properties input,
                .structure-properties select {
                    padding: 6px 8px;
                    background: #3a3a3a;
                    border: 1px solid #4a4a4a;
                    color: #e0e0e0;
                    border-radius: 4px;
                    font-size: 12px;
                }
                
                .btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 13px;
                    transition: all 0.2s;
                }
                
                .btn-primary {
                    background: #4a90e2;
                    color: white;
                    width: 100%;
                }
                
                .btn-primary:hover {
                    background: #357abd;
                }
            `
        });
        
        this.state = { 
            activeTool: 'voxel',
            selectedStructure: null,
            structures: [
                {
                    id: 1,
                    name: 'Basic Room',
                    category: 'room',
                    icon: '🏠',
                    voxelCount: 27
                },
                {
                    id: 2,
                    name: 'Straight Corridor',
                    category: 'corridor',
                    icon: '📏',
                    voxelCount: 9
                },
                {
                    id: 3,
                    name: 'T-Junction',
                    category: 'junction',
                    icon: '🔀',
                    voxelCount: 15
                }
            ]
        };
    }

    ready() {
        console.log('[StructureEditor] Widget ready');
        
        // Select first structure by default
        if (this.state.structures.length > 0) {
            this.selectStructure(0);
        }
    }

    setTool(tool) {
        this.update({ activeTool: tool });
        console.log(`[StructureEditor] Tool changed to: ${tool}`);
    }

    selectStructure(index) {
        const structure = this.state.structures[index];
        if (structure) {
            this.update({ selectedStructure: structure });
            console.log(`[StructureEditor] Selected structure: ${structure.name}`);
        }
    }

    createNewStructure() {
        const newStructure = {
            id: Date.now(),
            name: 'New Structure',
            category: 'room',
            icon: '📦',
            voxelCount: 1
        };
        
        const structures = [...this.state.structures, newStructure];
        this.update({ structures, selectedStructure: newStructure });
        console.log('[StructureEditor] Created new structure');
    }

    rotateView(axis) {
        console.log(`[StructureEditor] Rotating view on ${axis} axis`);
    }

    resetView() {
        console.log('[StructureEditor] Resetting view');
    }

    updateStructureName(name) {
        if (this.state.selectedStructure) {
            const updatedStructure = { ...this.state.selectedStructure, name };
            const structures = this.state.structures.map(s => 
                s.id === updatedStructure.id ? updatedStructure : s
            );
            this.update({ structures, selectedStructure: updatedStructure });
        }
    }

    updateStructureCategory(category) {
        if (this.state.selectedStructure) {
            const updatedStructure = { ...this.state.selectedStructure, category };
            const structures = this.state.structures.map(s => 
                s.id === updatedStructure.id ? updatedStructure : s
            );
            this.update({ structures, selectedStructure: updatedStructure });
        }
    }
}

// Register widget
if (typeof window !== 'undefined') {
    getWidget().define('structure-editor', StructureEditorWidget);
}