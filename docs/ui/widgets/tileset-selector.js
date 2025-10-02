/**
 * Tileset Selector Widget - Dropdown for selecting tilesets
 */

import { getWidget } from '../widget-base.js';

export class TilesetSelectorWidget extends getWidget() {
    constructor() {
        super({
            name: 'tileset-selector',
            template: `
                <div class="tileset-selector">
                    <label for="tileset-dropdown" class="tileset-label">
                        Tileset Configuration:
                    </label>
                    <div class="tileset-controls">
                        <select id="tileset-dropdown" 
                                class="tileset-dropdown"
                                data-action="select-tileset">
                            {{#each tilesets}}
                            <option value="{{value}}" {{#if-eq value ../selectedTileset}}selected{{/if-eq}}>
                                {{name}}
                            </option>
                            {{/each}}
                        </select>
                        <button type="button" 
                                class="refresh-button"
                                data-action="refresh-tilesets"
                                title="Refresh available tilesets">
                            ↻
                        </button>
                    </div>
                    
                    {{#if selectedTilesetInfo}}
                    <div class="tileset-info">
                        <small>{{selectedTilesetInfo.description}}</small>
                        {{#if selectedTilesetInfo.tileCount}}
                        <span class="tile-count">{{selectedTilesetInfo.tileCount}} tiles</span>
                        {{/if}}
                    </div>
                    {{/if}}
                </div>
            `,
            style: `
                .tileset-selector {
                    margin-top: 12px;
                }
                
                .tileset-label {
                    display: block;
                    margin-bottom: 6px;
                    font-weight: 500;
                    font-size: 13px;
                    color: #cfe6ff;
                }
                
                .tileset-controls {
                    display: flex;
                    gap: 6px;
                    align-items: center;
                }
                
                .tileset-dropdown {
                    flex: 1;
                    padding: 6px 8px;
                    border: 1px solid #2d4a6b;
                    border-radius: 4px;
                    font-size: 13px;
                    background: rgba(11, 21, 34, 0.8);
                    color: #cfe6ff;
                    cursor: pointer;
                }
                
                .tileset-dropdown:focus {
                    outline: none;
                    border-color: #60A5FA;
                    box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2);
                }
                
                .refresh-button {
                    background: rgba(15, 39, 64, 0.8);
                    border: 1px solid #2d4a6b;
                    color: #cfe6ff;
                    padding: 6px 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s;
                    min-width: 32px;
                }
                
                .refresh-button:hover {
                    background: rgba(27, 68, 105, 0.8);
                    border-color: #60A5FA;
                    transform: rotate(90deg);
                }
                
                .tileset-info {
                    margin-top: 6px;
                    padding: 6px 8px;
                    background: rgba(15, 39, 64, 0.5);
                    border: 1px solid #2d4a6b;
                    border-radius: 3px;
                    font-size: 11px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .tile-count {
                    font-weight: 500;
                    color: #60A5FA;
                }
            `
        });
        
        this.state = { 
            selectedTileset: 'basic_dungeon',
            tilesets: [],
            selectedTilesetInfo: null
        };
        
        // Load simplified tilesets on initialization
        this.loadSimplifiedTilesets();
    }

    onRender() {
        // Handle tileset selection
        this.element.addEventListener('change', (e) => {
            if (e.target.matches('[data-action="select-tileset"]')) {
                const selectedValue = e.target.value;
                const selectedTileset = this.state.tilesets.find(t => t.value === selectedValue);
                
                this.update({ 
                    selectedTileset: selectedValue,
                    selectedTilesetInfo: selectedTileset?.info || null
                });
                
                this.emit('tileset-selected', {
                    value: selectedValue,
                    tileset: selectedTileset
                });
            }
        });

        // Handle refresh button
        this.element.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="refresh-tilesets"]')) {
                this.refreshTilesets();
            }
        });
    }

    async loadSimplifiedTilesets() {
        try {
            // Lazy load simplified tilesets 
            const { listTilesets, getTilesetById } = await import('../../dungeon/simplified_tilesets.js');
            
            const availableTilesets = listTilesets();
            const tilesetOptions = availableTilesets.map(tileset => ({
                value: tileset.id,
                name: tileset.name,
                info: {
                    description: tileset.description,
                    tileCount: tileset.tileCount
                }
            }));
            
            // Set default selection info
            const defaultTileset = getTilesetById(this.state.selectedTileset);
            const defaultInfo = defaultTileset ? {
                description: defaultTileset.description,
                tileCount: defaultTileset.tiles.length
            } : null;
            
            this.update({ 
                tilesets: tilesetOptions,
                selectedTilesetInfo: defaultInfo
            });
            
            console.log('[TilesetSelector] Loaded simplified tilesets:', tilesetOptions.length);
            
        } catch (error) {
            console.error('[TilesetSelector] Failed to load simplified tilesets:', error);
            
            // Fallback to basic options
            this.update({
                tilesets: [
                    { value: 'basic_dungeon', name: 'Basic Dungeon (fallback)' }
                ],
                selectedTilesetInfo: { description: 'Fallback tileset', tileCount: 'unknown' }
            });
        }
    }

    async refreshTilesets() {
        try {
            // Reload simplified tilesets
            await this.loadSimplifiedTilesets();
            
            // Emit refresh event to allow parent to update tileset list
            this.emit('refresh-tilesets');
            
            // Visual feedback
            const button = this.element.querySelector('.refresh-button');
            if (button) {
                button.style.transform = 'rotate(360deg)';
                setTimeout(() => {
                    button.style.transform = '';
                }, 300);
            }
        } catch (error) {
            console.error('Failed to refresh tilesets:', error);
        }
    }

    // Update available tilesets
    setTilesets(tilesets) {
        this.update({ tilesets });
    }

    // Add a new tileset option
    addTileset(tileset) {
        const newTilesets = [...this.state.tilesets];
        const existingIndex = newTilesets.findIndex(t => t.value === tileset.value);
        
        if (existingIndex >= 0) {
            newTilesets[existingIndex] = tileset;
        } else {
            newTilesets.push(tileset);
        }
        
        this.update({ tilesets: newTilesets });
    }

    // Get currently selected tileset
    getSelectedTileset() {
        return this.state.selectedTileset;
    }

    // Set selected tileset programmatically
    setSelectedTileset(value) {
        const tileset = this.state.tilesets.find(t => t.value === value);
        if (tileset) {
            this.update({ 
                selectedTileset: value,
                selectedTilesetInfo: tileset.info || null
            });
        }
    }
}

// Register widget
if (typeof window !== 'undefined') {
    getWidget().define('tileset-selector', TilesetSelectorWidget);
}