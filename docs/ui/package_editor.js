/**
 * TilePackageEditor - Step 3 of the hierarchical tileset editor
 * 
 * Combines structures (from Step 1) with metadata packages (from Step 2)
 * to create complete tile definitions with rotations and previews.
 */

import { TileStructures } from '../dungeon/tile_structures.js';
import { TileMetadata } from '../dungeon/tile_metadata.js';
import { TilePackages } from '../dungeon/tile_packages.js';

export class TilePackageEditor {
    
    constructor(container, onUpdate) {
        this.container = container;
        this.onUpdate = onUpdate || (() => {});
        this.currentPackage = null;
        this.selectedTiles = [];
        this.previewMode = 'structure'; // 'structure' | 'metadata' | 'combined'
        
        this.loadExistingPackages();
    }

    render() {
        this.container.innerHTML = `
            <div class="package-editor">
                <div class="editor-header">
                    <h2>Step 3: Tile Packages</h2>
                    <p>Combine structures with metadata to create complete tile definitions</p>
                </div>
                
                <div class="package-editor-content">
                    <div class="package-selector">
                        <div class="selector-header">
                            <h3>Tileset Packages</h3>
                            <button class="btn btn-primary" onclick="this.createNewPackage()">
                                <span class="icon">+</span> New Package
                            </button>
                        </div>
                        <div class="package-list" id="package-list">
                            ${this.renderPackageList()}
                        </div>
                    </div>
                    
                    <div class="package-workspace">
                        <div class="workspace-tabs">
                            <button class="tab-btn active" data-tab="builder">Package Builder</button>
                            <button class="tab-btn" data-tab="preview">Tile Preview</button>
                            <button class="tab-btn" data-tab="export">Export</button>
                        </div>
                        
                        <div class="tab-content active" id="builder-tab">
                            ${this.renderPackageBuilder()}
                        </div>
                        
                        <div class="tab-content" id="preview-tab">
                            ${this.renderTilePreview()}
                        </div>
                        
                        <div class="tab-content" id="export-tab">
                            ${this.renderExportOptions()}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.attachEventListeners();
        this.loadSelectedPackage();
    }

    renderPackageList() {
        const existingPackages = Object.keys(this.existingPackages);
        const customPackages = this.getCustomPackages();
        
        return `
            ${existingPackages.length > 0 ? `
                <div class="package-section">
                    <h4>Existing Packages</h4>
                    ${existingPackages.map(name => `
                        <div class="package-card ${this.currentPackage === name ? 'selected' : ''}" data-package="${name}">
                            <div class="package-info">
                                <h5>${name}</h5>
                                <p>${this.existingPackages[name].length} tiles</p>
                            </div>
                            <div class="package-actions">
                                <button class="btn btn-sm" onclick="this.clonePackage('${name}')">Clone</button>
                                <button class="btn btn-sm btn-primary" onclick="this.selectPackage('${name}')">Edit</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            ${customPackages.length > 0 ? `
                <div class="package-section">
                    <h4>Custom Packages</h4>
                    ${customPackages.map(name => `
                        <div class="package-card ${this.currentPackage === name ? 'selected' : ''}" data-package="${name}">
                            <div class="package-info">
                                <h5>${name}</h5>
                                <p>${this.getCustomPackage(name).length} tiles</p>
                            </div>
                            <div class="package-actions">
                                <button class="btn btn-sm" onclick="this.deletePackage('${name}')">Delete</button>
                                <button class="btn btn-sm btn-primary" onclick="this.selectPackage('${name}')">Edit</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            ${existingPackages.length === 0 && customPackages.length === 0 ? `
                <div class="empty-state">
                    <p>No packages found. Create your first tile package!</p>
                </div>
            ` : ''}
        `;
    }

    renderPackageBuilder() {
        if (!this.currentPackage) {
            return `
                <div class="builder-empty">
                    <h3>Select or Create a Package</h3>
                    <p>Choose an existing package to edit or create a new one to get started.</p>
                </div>
            `;
        }

        const structures = TileStructures.getAllStructures();
        const weightPackages = TileMetadata.getWeightPackages();
        const rolePackages = TileMetadata.getRolePackages();
        const propertyPackages = TileMetadata.getPropertyPackages();
        
        return `
            <div class="package-builder">
                <div class="builder-header">
                    <h3>Editing: ${this.currentPackage}</h3>
                    <div class="builder-controls">
                        <button class="btn btn-sm" onclick="this.addTileToPackage()">
                            <span class="icon">+</span> Add Tile
                        </button>
                        <button class="btn btn-sm" onclick="this.generateRotations()">
                            <span class="icon">🔄</span> Auto Rotations
                        </button>
                        <button class="btn btn-sm btn-success" onclick="this.savePackage()">
                            <span class="icon">💾</span> Save
                        </button>
                    </div>
                </div>
                
                <div class="tile-list">
                    <div class="tile-list-header">
                        <span>Structure</span>
                        <span>Weight Package</span>
                        <span>Role Package</span>
                        <span>Properties</span>
                        <span>Rotation</span>
                        <span>Actions</span>
                    </div>
                    <div class="tile-rows" id="tile-rows">
                        ${this.renderTileRows()}
                    </div>
                </div>
                
                <div class="add-tile-form" id="add-tile-form" style="display: none;">
                    <h4>Add New Tile</h4>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Structure</label>
                            <select id="structure-select">
                                <option value="">Select structure...</option>
                                ${Object.keys(structures).map(name => `
                                    <option value="${name}">${name}</option>
                                `).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Weight Package</label>
                            <select id="weight-package-select">
                                <option value="">Select weight package...</option>
                                ${Object.keys(weightPackages).map(name => `
                                    <option value="${name}">${name}</option>
                                `).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Role Package</label>
                            <select id="role-package-select">
                                <option value="">Select role package...</option>
                                ${Object.keys(rolePackages).map(name => `
                                    <option value="${name}">${name}</option>
                                `).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Properties</label>
                            <select id="property-package-select">
                                <option value="">Select properties...</option>
                                ${Object.keys(propertyPackages).map(name => `
                                    <option value="${name}">${name}</option>
                                `).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Rotation (degrees)</label>
                            <select id="rotation-select">
                                <option value="0">0°</option>
                                <option value="90">90°</option>
                                <option value="180">180°</option>
                                <option value="270">270°</option>
                            </select>
                        </div>
                        
                        <div class="form-actions">
                            <button class="btn btn-sm" onclick="this.cancelAddTile()">Cancel</button>
                            <button class="btn btn-sm btn-primary" onclick="this.confirmAddTile()">Add Tile</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderTileRows() {
        const tiles = this.getCurrentPackageTiles();
        
        if (tiles.length === 0) {
            return `
                <div class="empty-tiles">
                    <p>No tiles in this package. Add your first tile above.</p>
                </div>
            `;
        }
        
        return tiles.map((tile, index) => `
            <div class="tile-row" data-index="${index}">
                <div class="tile-structure">
                    <span class="structure-name">${tile.structure_name}</span>
                    <div class="structure-preview">
                        ${this.renderStructurePreview(tile.structure_name)}
                    </div>
                </div>
                <div class="tile-weight">${tile.weight_package}</div>
                <div class="tile-role">${tile.role_package}</div>
                <div class="tile-properties">${tile.properties}</div>
                <div class="tile-rotation">${tile.rotation}°</div>
                <div class="tile-actions">
                    <button class="btn btn-xs" onclick="this.duplicateTile(${index})">Duplicate</button>
                    <button class="btn btn-xs" onclick="this.removeTile(${index})">Remove</button>
                </div>
            </div>
        `).join('');
    }

    renderStructurePreview(structureName) {
        // Simple ASCII preview of the structure
        try {
            const structure = TileStructures.getStructure(structureName);
            if (!structure || !structure.layers || structure.layers.length < 2) {
                return '<div class="preview-error">No preview</div>';
            }
            
            // Show the middle layer as a simple grid
            const middleLayer = structure.layers[1];
            return `
                <div class="ascii-preview">
                    ${middleLayer.map(row => `
                        <div class="preview-row">
                            ${row.split('').map(cell => `
                                <span class="preview-cell ${cell === '0' ? 'open' : 'wall'}">${cell === '0' ? '·' : '█'}</span>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (error) {
            return '<div class="preview-error">Error</div>';
        }
    }

    renderTilePreview() {
        return `
            <div class="tile-preview">
                <div class="preview-header">
                    <h3>Tile Preview</h3>
                    <div class="preview-controls">
                        <label>
                            <input type="radio" name="preview-mode" value="structure" ${this.previewMode === 'structure' ? 'checked' : ''}>
                            Structure Only
                        </label>
                        <label>
                            <input type="radio" name="preview-mode" value="metadata" ${this.previewMode === 'metadata' ? 'checked' : ''}>
                            Metadata Only
                        </label>
                        <label>
                            <input type="radio" name="preview-mode" value="combined" ${this.previewMode === 'combined' ? 'checked' : ''}>
                            Combined
                        </label>
                    </div>
                </div>
                
                <div class="preview-content" id="preview-content">
                    ${this.renderPreviewContent()}
                </div>
            </div>
        `;
    }

    renderPreviewContent() {
        if (!this.currentPackage) {
            return '<p>Select a package to preview tiles</p>';
        }
        
        const tiles = this.getCurrentPackageTiles();
        
        return `
            <div class="preview-grid">
                ${tiles.map((tile, index) => `
                    <div class="preview-tile" data-index="${index}">
                        <div class="tile-header">
                            <h4>Tile ${index + 1}</h4>
                            <span class="rotation-badge">${tile.rotation}°</span>
                        </div>
                        <div class="tile-structure-preview">
                            ${this.renderStructurePreview(tile.structure_name)}
                        </div>
                        <div class="tile-metadata">
                            <div class="metadata-item">
                                <span class="label">Weight:</span>
                                <span class="value">${tile.weight_package}</span>
                            </div>
                            <div class="metadata-item">
                                <span class="label">Role:</span>
                                <span class="value">${tile.role_package}</span>
                            </div>
                            <div class="metadata-item">
                                <span class="label">Properties:</span>
                                <span class="value">${tile.properties}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderExportOptions() {
        return `
            <div class="export-options">
                <div class="export-header">
                    <h3>Export Package</h3>
                    <p>Export your tile package for use in dungeons</p>
                </div>
                
                <div class="export-formats">
                    <div class="format-option">
                        <h4>JSON Package</h4>
                        <p>Export as JSON for integration with other tools</p>
                        <button class="btn btn-primary" onclick="this.exportAsJSON()">
                            <span class="icon">📄</span> Export JSON
                        </button>
                    </div>
                    
                    <div class="format-option">
                        <h4>Tileset Data</h4>
                        <p>Export as tileset_data.js format</p>
                        <button class="btn btn-primary" onclick="this.exportAsTilesetData()">
                            <span class="icon">🔧</span> Export Tileset
                        </button>
                    </div>
                    
                    <div class="format-option">
                        <h4>Package Registry</h4>
                        <p>Add to tile_packages.js registry</p>
                        <button class="btn btn-primary" onclick="this.addToRegistry()">
                            <span class="icon">📋</span> Add to Registry
                        </button>
                    </div>
                </div>
                
                <div class="package-summary">
                    <h4>Package Summary</h4>
                    <div class="summary-stats" id="package-summary">
                        ${this.renderPackageSummary()}
                    </div>
                </div>
            </div>
        `;
    }

    renderPackageSummary() {
        if (!this.currentPackage) {
            return '<p>No package selected</p>';
        }
        
        const tiles = this.getCurrentPackageTiles();
        const structures = [...new Set(tiles.map(t => t.structure_name))];
        const weightPackages = [...new Set(tiles.map(t => t.weight_package))];
        const rolePackages = [...new Set(tiles.map(t => t.role_package))];
        
        return `
            <div class="summary-grid">
                <div class="stat">
                    <span class="stat-label">Total Tiles:</span>
                    <span class="stat-value">${tiles.length}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Unique Structures:</span>
                    <span class="stat-value">${structures.length}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Weight Packages:</span>
                    <span class="stat-value">${weightPackages.length}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Role Packages:</span>
                    <span class="stat-value">${rolePackages.length}</span>
                </div>
            </div>
            
            <div class="structure-list">
                <h5>Structures Used:</h5>
                <ul>
                    ${structures.map(name => `<li>${name}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    // Data management
    loadExistingPackages() {
        this.existingPackages = TilePackages.packages || {};
    }

    getCustomPackages() {
        try {
            return JSON.parse(localStorage.getItem('custom_tile_packages') || '[]');
        } catch {
            return [];
        }
    }

    getCustomPackage(name) {
        try {
            const packages = JSON.parse(localStorage.getItem('custom_tile_package_data') || '{}');
            return packages[name] || [];
        } catch {
            return [];
        }
    }

    getCurrentPackageTiles() {
        if (!this.currentPackage) return [];
        
        if (this.existingPackages[this.currentPackage]) {
            return this.existingPackages[this.currentPackage];
        }
        
        return this.getCustomPackage(this.currentPackage);
    }

    // Event handlers
    attachEventListeners() {
        // Tab switching
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-btn')) {
                this.switchTab(e.target.dataset.tab);
            }
        });
        
        // Preview mode switching
        this.container.addEventListener('change', (e) => {
            if (e.target.name === 'preview-mode') {
                this.previewMode = e.target.value;
                this.updatePreview();
            }
        });
        
        // Make methods globally accessible for inline onclick handlers
        window.tilePackageEditor = this;
    }

    // UI Actions
    createNewPackage() {
        const name = prompt('Enter package name:');
        if (name && name.trim()) {
            this.currentPackage = name.trim();
            this.saveCustomPackage(this.currentPackage, []);
            this.render();
        }
    }

    selectPackage(name) {
        this.currentPackage = name;
        this.render();
    }

    clonePackage(name) {
        const newName = prompt(`Clone "${name}" as:`, `${name}_copy`);
        if (newName && newName.trim()) {
            const tiles = this.existingPackages[name] || [];
            this.saveCustomPackage(newName.trim(), [...tiles]);
            this.currentPackage = newName.trim();
            this.render();
        }
    }

    deletePackage(name) {
        if (confirm(`Delete package "${name}"?`)) {
            const packages = this.getCustomPackages().filter(n => n !== name);
            const packageData = JSON.parse(localStorage.getItem('custom_tile_package_data') || '{}');
            delete packageData[name];
            
            localStorage.setItem('custom_tile_packages', JSON.stringify(packages));
            localStorage.setItem('custom_tile_package_data', JSON.stringify(packageData));
            
            if (this.currentPackage === name) {
                this.currentPackage = null;
            }
            this.render();
        }
    }

    addTileToPackage() {
        const form = document.getElementById('add-tile-form');
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
    }

    cancelAddTile() {
        document.getElementById('add-tile-form').style.display = 'none';
    }

    confirmAddTile() {
        const structure = document.getElementById('structure-select').value;
        const weightPackage = document.getElementById('weight-package-select').value;
        const rolePackage = document.getElementById('role-package-select').value;
        const properties = document.getElementById('property-package-select').value;
        const rotation = parseInt(document.getElementById('rotation-select').value);
        
        if (!structure || !weightPackage || !rolePackage) {
            alert('Please fill in all required fields');
            return;
        }
        
        const tiles = this.getCurrentPackageTiles();
        tiles.push({
            structure_name: structure,
            weight_package: weightPackage,
            role_package: rolePackage,
            properties: properties || 'default',
            rotation: rotation
        });
        
        this.saveCurrentPackage(tiles);
        this.cancelAddTile();
        this.render();
    }

    removeTile(index) {
        const tiles = this.getCurrentPackageTiles();
        tiles.splice(index, 1);
        this.saveCurrentPackage(tiles);
        this.render();
    }

    duplicateTile(index) {
        const tiles = this.getCurrentPackageTiles();
        const tile = { ...tiles[index] };
        tiles.splice(index + 1, 0, tile);
        this.saveCurrentPackage(tiles);
        this.render();
    }

    generateRotations() {
        const tiles = this.getCurrentPackageTiles();
        const rotated = [];
        
        tiles.forEach(tile => {
            if (tile.rotation === 0) {
                // Add 90, 180, 270 degree rotations
                rotated.push(
                    { ...tile, rotation: 90 },
                    { ...tile, rotation: 180 },
                    { ...tile, rotation: 270 }
                );
            }
        });
        
        if (rotated.length > 0) {
            tiles.push(...rotated);
            this.saveCurrentPackage(tiles);
            this.render();
        } else {
            alert('No base rotations (0°) found to generate from');
        }
    }

    savePackage() {
        if (this.currentPackage) {
            alert('Package saved!');
            this.onUpdate();
        }
    }

    // Helper methods
    saveCustomPackage(name, tiles) {
        const packages = this.getCustomPackages();
        if (!packages.includes(name)) {
            packages.push(name);
            localStorage.setItem('custom_tile_packages', JSON.stringify(packages));
        }
        
        const packageData = JSON.parse(localStorage.getItem('custom_tile_package_data') || '{}');
        packageData[name] = tiles;
        localStorage.setItem('custom_tile_package_data', JSON.stringify(packageData));
    }

    saveCurrentPackage(tiles) {
        if (this.currentPackage) {
            this.saveCustomPackage(this.currentPackage, tiles);
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        this.container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Update tab content
        this.container.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
        
        // Refresh content if needed
        if (tabName === 'preview') {
            this.updatePreview();
        }
    }

    updatePreview() {
        const previewContent = document.getElementById('preview-content');
        if (previewContent) {
            previewContent.innerHTML = this.renderPreviewContent();
        }
    }

    loadSelectedPackage() {
        // Auto-select first package if none selected
        if (!this.currentPackage) {
            const allPackages = [...Object.keys(this.existingPackages), ...this.getCustomPackages()];
            if (allPackages.length > 0) {
                this.currentPackage = allPackages[0];
            }
        }
    }

    // Export methods
    exportAsJSON() {
        if (!this.currentPackage) return;
        
        const tiles = this.getCurrentPackageTiles();
        const exportData = {
            name: this.currentPackage,
            tiles: tiles,
            exported: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentPackage}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    exportAsTilesetData() {
        // This would generate tileset_data.js format
        alert('Tileset data export coming soon!');
    }

    addToRegistry() {
        alert('Registry integration coming soon!');
    }
}

// Global methods for inline handlers
if (typeof window !== 'undefined') {
    window.createNewPackage = () => window.tilePackageEditor?.createNewPackage();
    window.selectPackage = (name) => window.tilePackageEditor?.selectPackage(name);
    window.clonePackage = (name) => window.tilePackageEditor?.clonePackage(name);
    window.deletePackage = (name) => window.tilePackageEditor?.deletePackage(name);
    window.addTileToPackage = () => window.tilePackageEditor?.addTileToPackage();
    window.cancelAddTile = () => window.tilePackageEditor?.cancelAddTile();
    window.confirmAddTile = () => window.tilePackageEditor?.confirmAddTile();
    window.removeTile = (index) => window.tilePackageEditor?.removeTile(index);
    window.duplicateTile = (index) => window.tilePackageEditor?.duplicateTile(index);
    window.generateRotations = () => window.tilePackageEditor?.generateRotations();
    window.savePackage = () => window.tilePackageEditor?.savePackage();
    window.exportAsJSON = () => window.tilePackageEditor?.exportAsJSON();
    window.exportAsTilesetData = () => window.tilePackageEditor?.exportAsTilesetData();
    window.addToRegistry = () => window.tilePackageEditor?.addToRegistry();
}