/**
 * TilesetRenderer - Handles displaying tiles and tileset statistics
 * 
 * Provides functionality for rendering tile lists, statistics, and preview information.
 */

import { UIUtils } from './ui_utils.js';
import { PackageResolver } from '../dungeon/package_resolver.js';

export class TilesetRenderer {
    constructor(container, options = {}) {
        this.container = container;
        this.packageResolver = options.packageResolver || new PackageResolver();
        this.currentConfig = options.currentConfig || { tiles: [] };
        this.onTileRemove = options.onTileRemove || (() => {});
        this.onTileEdit = options.onTileEdit || (() => {});
        
        this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="tileset-renderer">
                <!-- Statistics Panel -->
                <div class="stats-panel">
                    <h4>Configuration Statistics</h4>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-label">Total Tiles:</span>
                            <span id="total-tiles" class="stat-value">0</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Total Weight:</span>
                            <span id="total-weight" class="stat-value">0.0</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Stairs:</span>
                            <span id="stair-percentage" class="stat-value">0%</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Rooms:</span>
                            <span id="room-percentage" class="stat-value">0%</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Corridors:</span>
                            <span id="corridor-percentage" class="stat-value">0%</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Floors:</span>
                            <span id="floor-percentage" class="stat-value">0%</span>
                        </div>
                    </div>
                </div>

                <!-- Tiles List -->
                <div class="tiles-list-panel">
                    <h4>
                        Configured Tiles 
                        <small class="tile-count">(<span id="tile-count">0</span> tiles)</small>
                    </h4>
                    
                    <div class="tiles-controls">
                        <div class="form-row">
                            <div class="col-md-4">
                                <input type="text" id="tile-search" class="form-control" 
                                       placeholder="Search tiles...">
                            </div>
                            <div class="col-md-4">
                                <select id="tile-filter" class="form-control">
                                    <option value="">All Sources</option>
                                    <option value="custom">Custom</option>
                                    <option value="predefined">Predefined</option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <select id="role-filter" class="form-control">
                                    <option value="">All Roles</option>
                                    <option value="floor">Floor</option>
                                    <option value="wall">Wall</option>
                                    <option value="stair_up">Stair Up</option>
                                    <option value="stair_down">Stair Down</option>
                                    <option value="door">Door</option>
                                    <option value="corridor">Corridor</option>
                                    <option value="room">Room</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="table-responsive">
                        <table class="table table-striped tiles-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Structure</th>
                                    <th>Weight</th>
                                    <th>Role</th>
                                    <th>Rotations</th>
                                    <th>Source</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="tiles-list">
                                <!-- Tiles will be populated here -->
                            </tbody>
                        </table>
                    </div>
                    
                    <div id="tiles-empty" class="empty-state" style="display: none;">
                        <p>No tiles configured yet. Add tiles using the editor above.</p>
                    </div>
                </div>

                <!-- Preview Panel -->
                <div class="preview-panel">
                    <h4>Configuration Preview</h4>
                    <div id="config-preview" class="config-preview">
                        <!-- Preview content will be populated here -->
                    </div>
                </div>
            </div>
        `;

        this.bindEvents();
        this.updateDisplay();
    }

    bindEvents() {
        // Search and filter functionality
        UIUtils.getElementById('tile-search')?.addEventListener('input', 
            UIUtils.debounce(() => this.filterTiles(), 300));
        UIUtils.getElementById('tile-filter')?.addEventListener('change', () => this.filterTiles());
        UIUtils.getElementById('role-filter')?.addEventListener('change', () => this.filterTiles());
    }

    updateDisplay() {
        this.updateTilesList();
        this.updateStatistics();
        this.updatePreview();
    }

    updateTilesList() {
        const tbody = UIUtils.getElementById('tiles-list');
        const emptyState = UIUtils.getElementById('tiles-empty');
        const tileCount = UIUtils.getElementById('tile-count');
        
        if (!tbody) return;

        // Update tile count
        if (tileCount) {
            tileCount.textContent = this.currentConfig.tiles.length;
        }

        // Show/hide empty state
        if (this.currentConfig.tiles.length === 0) {
            tbody.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        // Clear existing content
        tbody.innerHTML = '';

        // Populate tiles
        this.currentConfig.tiles.forEach((tile, index) => {
            const row = this.createTileRow(tile, index);
            tbody.appendChild(row);
        });

        // Apply current filters
        this.filterTiles();
    }

    createTileRow(tile, index) {
        const row = document.createElement('tr');
        row.setAttribute('data-tile-index', index);
        row.setAttribute('data-tile-source', tile.source || 'unknown');
        row.setAttribute('data-tile-role', this.getTileRole(tile));
        
        const structureName = tile.structure_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const rotationStr = tile.rotations && tile.rotations.length > 0 
            ? tile.rotations.join('°, ') + '°' 
            : 'None';
        const weight = this.getTileWeight(tile);
        const role = this.getTileRole(tile);
        const source = tile.source || 'unknown';
        
        row.innerHTML = `
            <td class="tile-id">${tile.tileId}</td>
            <td class="tile-structure">${structureName}</td>
            <td class="tile-weight">${weight}</td>
            <td class="tile-role">
                <span class="badge badge-${this.getRoleBadgeClass(role)}">${role}</span>
            </td>
            <td class="tile-rotations">${rotationStr}</td>
            <td class="tile-source">
                <span class="badge badge-${source === 'custom' ? 'primary' : 'secondary'}">${source}</span>
            </td>
            <td class="tile-actions">
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-info" onclick="window.tilesetRenderer?.editTile(${index})" 
                            title="Edit Tile">
                        ✏️
                    </button>
                    <button class="btn btn-outline-danger" onclick="window.tilesetRenderer?.removeTile(${index})" 
                            title="Remove Tile">
                        🗑️
                    </button>
                </div>
            </td>
        `;
        
        return row;
    }

    getTileWeight(tile) {
        if (tile.custom_weight !== undefined) {
            return tile.custom_weight;
        }
        
        if (tile.weight_package === 'custom') {
            return tile.custom_weight || 1.0;
        }
        
        // Try to get weight from package resolver
        try {
            const resolved = this.packageResolver.resolveCustomConfig({ tiles: [tile] });
            if (resolved.tiles && resolved.tiles[0]) {
                return resolved.tiles[0].weight || 1.0;
            }
        } catch (error) {
            // Fallback to package name or default
        }
        
        return tile.weight_package || 'default';
    }

    getTileRole(tile) {
        if (tile.custom_role !== undefined) {
            return tile.custom_role;
        }
        
        if (tile.role_package === 'custom') {
            return tile.custom_role || 'floor';
        }
        
        // Try to get role from package resolver
        try {
            const resolved = this.packageResolver.resolveCustomConfig({ tiles: [tile] });
            if (resolved.tiles && resolved.tiles[0]) {
                return resolved.tiles[0].role || 'floor';
            }
        } catch (error) {
            // Fallback to package name or default
        }
        
        return tile.role_package || 'floor';
    }

    getRoleBadgeClass(role) {
        const roleClasses = {
            'floor': 'success',
            'wall': 'secondary',
            'stair_up': 'info',
            'stair_down': 'info',
            'door': 'warning',
            'corridor': 'primary',
            'room': 'success'
        };
        return roleClasses[role] || 'secondary';
    }

    updateStatistics() {
        try {
            // Resolve current configuration to get actual tile data
            const resolved = this.packageResolver.resolveCustomConfig(this.currentConfig);
            const stats = this.packageResolver.getStats(resolved);
            
            // Update basic stats
            const totalTilesEl = UIUtils.getElementById('total-tiles');
            const totalWeightEl = UIUtils.getElementById('total-weight');
            
            if (totalTilesEl) totalTilesEl.textContent = stats.totalTiles;
            if (totalWeightEl) totalWeightEl.textContent = stats.totalWeight.toFixed(1);
            
            // Calculate and update percentages
            const typeCount = stats.typeCount || {};
            const total = stats.totalTiles || 1; // Avoid division by zero
            
            this.updatePercentage('stair-percentage', 
                ((typeCount.stair_up || 0) + (typeCount.stair_down || 0)) / total * 100);
            this.updatePercentage('room-percentage', 
                (typeCount.room || 0) / total * 100);
            this.updatePercentage('corridor-percentage', 
                (typeCount.corridor || 0) / total * 100);
            this.updatePercentage('floor-percentage', 
                (typeCount.floor || 0) / total * 100);
            
        } catch (error) {
            // Handle invalid configuration
            console.warn('Failed to calculate statistics:', error);
            
            const totalTilesEl = UIUtils.getElementById('total-tiles');
            const totalWeightEl = UIUtils.getElementById('total-weight');
            
            if (totalTilesEl) totalTilesEl.textContent = this.currentConfig.tiles.length;
            if (totalWeightEl) totalWeightEl.textContent = 'Invalid';
            
            this.updatePercentage('stair-percentage', 0);
            this.updatePercentage('room-percentage', 0);
            this.updatePercentage('corridor-percentage', 0);
            this.updatePercentage('floor-percentage', 0);
        }
    }

    updatePercentage(elementId, percentage) {
        const element = UIUtils.getElementById(elementId);
        if (element) {
            element.textContent = percentage.toFixed(1) + '%';
        }
    }

    updatePreview() {
        const previewEl = UIUtils.getElementById('config-preview');
        if (!previewEl) return;

        try {
            const resolved = this.packageResolver.resolveCustomConfig(this.currentConfig);
            const stats = this.packageResolver.getStats(resolved);
            
            const customTiles = this.currentConfig.tiles.filter(t => t.source === 'custom').length;
            const predefinedTiles = this.currentConfig.tiles.filter(t => t.source === 'predefined').length;
            
            previewEl.innerHTML = `
                <div class="preview-content">
                    <div class="preview-section">
                        <h5>Configuration Overview</h5>
                        <ul class="preview-list">
                            <li><strong>Total Tiles:</strong> ${stats.totalTiles}</li>
                            <li><strong>Custom Tiles:</strong> ${customTiles}</li>
                            <li><strong>Predefined Tiles:</strong> ${predefinedTiles}</li>
                            <li><strong>Total Weight:</strong> ${stats.totalWeight.toFixed(1)}</li>
                        </ul>
                    </div>
                    
                    <div class="preview-section">
                        <h5>Type Distribution</h5>
                        <div class="type-distribution">
                            ${this.renderTypeDistribution(stats.typeCount, stats.totalTiles)}
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            previewEl.innerHTML = `
                <div class="preview-error">
                    <p>⚠️ Configuration contains errors and may not generate properly.</p>
                    <small>${error.message}</small>
                </div>
            `;
        }
    }

    renderTypeDistribution(typeCount, totalTiles) {
        if (!typeCount || totalTiles === 0) {
            return '<p>No tile data available</p>';
        }

        const types = Object.keys(typeCount).sort();
        return types.map(type => {
            const count = typeCount[type];
            const percentage = ((count / totalTiles) * 100).toFixed(1);
            return `
                <div class="type-item">
                    <span class="type-name">${type.replace(/_/g, ' ')}:</span>
                    <span class="type-count">${count} (${percentage}%)</span>
                </div>
            `;
        }).join('');
    }

    filterTiles() {
        const searchTerm = UIUtils.getElementById('tile-search')?.value.toLowerCase() || '';
        const sourceFilter = UIUtils.getElementById('tile-filter')?.value || '';
        const roleFilter = UIUtils.getElementById('role-filter')?.value || '';
        
        const rows = this.container.querySelectorAll('#tiles-list tr');
        
        rows.forEach(row => {
            const index = row.getAttribute('data-tile-index');
            const tile = this.currentConfig.tiles[parseInt(index)];
            
            if (!tile) {
                row.style.display = 'none';
                return;
            }
            
            let show = true;
            
            // Search filter
            if (searchTerm) {
                const searchableText = `
                    ${tile.tileId} 
                    ${tile.structure_name} 
                    ${this.getTileRole(tile)}
                `.toLowerCase();
                
                if (!searchableText.includes(searchTerm)) {
                    show = false;
                }
            }
            
            // Source filter
            if (sourceFilter && tile.source !== sourceFilter) {
                show = false;
            }
            
            // Role filter
            if (roleFilter && this.getTileRole(tile) !== roleFilter) {
                show = false;
            }
            
            row.style.display = show ? '' : 'none';
        });
    }

    removeTile(index) {
        if (confirm('Are you sure you want to remove this tile?')) {
            this.onTileRemove(index);
        }
    }

    editTile(index) {
        this.onTileEdit(index);
    }

    // Update configuration reference
    setConfiguration(config) {
        this.currentConfig = config;
        this.updateDisplay();
    }

    // Get current configuration
    getConfiguration() {
        return this.currentConfig;
    }

    // Expose instance globally for onclick handlers
    exposeGlobally() {
        window.tilesetRenderer = this;
    }
}