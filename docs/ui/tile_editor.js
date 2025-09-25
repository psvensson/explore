/**
 * TileEditor - Individual tile creation and editing component
 * 
 * Handles creating new tiles, editing existing tiles, and managing tile forms.
 */

import { UIUtils } from './ui_utils.js';
import { TileStructures } from '../dungeon/tile_structures.js';
import { TileMetadata } from '../dungeon/tile_metadata.js';
import { TilePackages } from '../dungeon/tile_packages.js';

export class TileEditor {
    constructor(container, options = {}) {
        this.container = container;
        this.currentConfig = options.currentConfig || { tiles: [] };
        this.nextTileId = options.nextTileId || 300;
        this.onTileAdd = options.onTileAdd || (() => {});
        this.onTileRemove = options.onTileRemove || (() => {});
        this.onTileChange = options.onTileChange || (() => {});
        
        this.render();
        this.bindEvents();
        this.populateStructureOptions();
        this.populatePackageOptions();
    }

    render() {
        this.container.innerHTML = `
            <div class="tile-editor">
                <h3>Tile Editor</h3>
                
                <!-- Tile Creation Form -->
                <div class="tile-form">
                    <div class="form-row">
                        <div class="form-group col-md-6">
                            <label for="tile-id">Tile ID:</label>
                            <input type="number" id="tile-id" class="form-control" 
                                   value="${this.nextTileId}" min="1" max="999">
                        </div>
                        <div class="form-group col-md-6">
                            <label for="tile-structure">Structure:</label>
                            <select id="tile-structure" class="form-control">
                                <option value="">Select structure...</option>
                            </select>
                        </div>
                    </div>

                    <!-- Weight Configuration -->
                    <div class="form-group">
                        <label for="weight-package">Weight Package:</label>
                        <select id="weight-package" class="form-control">
                            <option value="default">Default Package</option>
                            <option value="custom">Custom Weight</option>
                        </select>
                    </div>

                    <div class="form-group" id="custom-weight-group" style="display: none;">
                        <label for="tile-weight">Custom Weight:</label>
                        <input type="number" id="tile-weight" class="form-control" 
                               value="1.0" min="0" max="100" step="0.1">
                    </div>

                    <!-- Role Configuration -->
                    <div class="form-group">
                        <label for="role-package">Role Package:</label>
                        <select id="role-package" class="form-control">
                            <option value="default">Default Package</option>
                            <option value="custom">Custom Role</option>
                        </select>
                    </div>

                    <div class="form-group" id="custom-role-group" style="display: none;">
                        <label for="tile-role">Custom Role:</label>
                        <select id="tile-role" class="form-control">
                            <option value="floor">Floor</option>
                            <option value="wall">Wall</option>
                            <option value="stair_up">Stair Up</option>
                            <option value="stair_down">Stair Down</option>
                            <option value="door">Door</option>
                            <option value="corridor">Corridor</option>
                            <option value="room">Room</option>
                        </select>
                    </div>

                    <!-- Rotations -->
                    <div class="form-group">
                        <label>Additional Rotations:</label>
                        <div class="rotation-checkboxes">
                            <div class="form-check form-check-inline">
                                <input type="checkbox" id="rot-90" class="form-check-input" value="90">
                                <label for="rot-90" class="form-check-label">90°</label>
                            </div>
                            <div class="form-check form-check-inline">
                                <input type="checkbox" id="rot-180" class="form-check-input" value="180">
                                <label for="rot-180" class="form-check-label">180°</label>
                            </div>
                            <div class="form-check form-check-inline">
                                <input type="checkbox" id="rot-270" class="form-check-input" value="270">
                                <label for="rot-270" class="form-check-label">270°</label>
                            </div>
                        </div>
                    </div>

                    <!-- Package Information Display -->
                    <div id="package-info" class="package-info"></div>

                    <!-- Action Buttons -->
                    <div class="tile-actions">
                        <button id="add-tile" class="btn btn-primary">Add Tile</button>
                        <button id="clear-form" class="btn btn-secondary">Clear Form</button>
                    </div>
                </div>

                <!-- Predefined Package Loader -->
                <div class="predefined-packages">
                    <h4>Load Predefined Package</h4>
                    <div class="form-row">
                        <div class="form-group col-md-8">
                            <select id="predefined-package" class="form-control">
                                <option value="">Select a predefined package...</option>
                            </select>
                        </div>
                        <div class="form-group col-md-4">
                            <button id="load-predefined" class="btn btn-info">Load Package</button>
                            <button id="add-predefined" class="btn btn-success">Add to Config</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Form field event handlers
        UIUtils.getElementById('weight-package')?.addEventListener('change', () => this.updateWeightInput());
        UIUtils.getElementById('role-package')?.addEventListener('change', () => this.updateRoleInput());
        UIUtils.getElementById('tile-structure')?.addEventListener('change', () => this.showPackageInfo());

        // Action buttons
        UIUtils.getElementById('add-tile')?.addEventListener('click', () => this.addTile());
        UIUtils.getElementById('clear-form')?.addEventListener('click', () => this.clearForm());
        UIUtils.getElementById('load-predefined')?.addEventListener('click', () => this.loadPredefinedPackage());
        UIUtils.getElementById('add-predefined')?.addEventListener('click', () => this.addPredefinedPackage());

        // Auto-update next tile ID
        UIUtils.getElementById('tile-id')?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            if (!isNaN(value) && value >= this.nextTileId) {
                this.nextTileId = value;
            }
        });
    }

    populateStructureOptions() {
        const structureSelect = UIUtils.getElementById('tile-structure');
        if (!structureSelect) return;

        // Get available structures from TileStructures
        const structures = Object.keys(TileStructures.registry);
        structures.forEach(structure => {
            const option = document.createElement('option');
            option.value = structure;
            option.textContent = structure.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            structureSelect.appendChild(option);
        });
    }

    populatePackageOptions() {
        const predefinedSelect = UIUtils.getElementById('predefined-package');
        if (!predefinedSelect) return;

        // Get available packages from TilePackages
        const packages = Object.keys(TilePackages.packages);
        packages.forEach(packageName => {
            const option = document.createElement('option');
            option.value = packageName;
            option.textContent = packageName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            predefinedSelect.appendChild(option);
        });
    }

    updateWeightInput() {
        const weightPackage = UIUtils.getElementById('weight-package')?.value;
        const customWeightGroup = UIUtils.getElementById('custom-weight-group');
        
        if (customWeightGroup) {
            customWeightGroup.style.display = weightPackage === 'custom' ? 'block' : 'none';
        }
        
        this.showPackageInfo();
    }

    updateRoleInput() {
        const rolePackage = UIUtils.getElementById('role-package')?.value;
        const customRoleGroup = UIUtils.getElementById('custom-role-group');
        
        if (customRoleGroup) {
            customRoleGroup.style.display = rolePackage === 'custom' ? 'block' : 'none';
        }
        
        this.showPackageInfo();
    }

    showPackageInfo() {
        const structure = UIUtils.getElementById('tile-structure')?.value;
        const weightPackage = UIUtils.getElementById('weight-package')?.value;
        const rolePackage = UIUtils.getElementById('role-package')?.value;
        const infoDiv = UIUtils.getElementById('package-info');
        
        if (!structure || !infoDiv) {
            if (infoDiv) infoDiv.innerHTML = '';
            return;
        }

        let info = '<div class="package-preview"><h5>Tile Preview</h5>';
        
        // Get structure info
        const structureData = TileStructures.registry[structure];
        if (structureData) {
            info += `<p><strong>Structure:</strong> ${structure}</p>`;
            info += `<p><strong>Size:</strong> ${structureData.width}x${structureData.height}x${structureData.depth}</p>`;
        }

        // Get weight info
        if (weightPackage === 'custom') {
            const weight = UIUtils.getElementById('tile-weight')?.value || '1.0';
            info += `<p><strong>Weight:</strong> ${weight} (custom)</p>`;
        } else {
            const defaultWeight = TileMetadata.getWeight(structure) || 1.0;
            info += `<p><strong>Weight:</strong> ${defaultWeight} (from ${weightPackage} package)</p>`;
        }

        // Get role info
        if (rolePackage === 'custom') {
            const role = UIUtils.getElementById('tile-role')?.value || 'floor';
            info += `<p><strong>Role:</strong> ${role} (custom)</p>`;
        } else {
            const defaultRole = TileMetadata.getRole(structure) || 'floor';
            info += `<p><strong>Role:</strong> ${defaultRole} (from ${rolePackage} package)</p>`;
        }

        info += '</div>';
        infoDiv.innerHTML = info;
    }

    addTile() {
        const tileId = parseInt(UIUtils.getElementById('tile-id')?.value);
        const structure = UIUtils.getElementById('tile-structure')?.value;
        const weight = parseFloat(UIUtils.getElementById('tile-weight')?.value || '1.0');
        const role = UIUtils.getElementById('tile-role')?.value || 'floor';
        const weightPackage = UIUtils.getElementById('weight-package')?.value || 'default';
        const rolePackage = UIUtils.getElementById('role-package')?.value || 'default';
        
        const rotationCheckboxes = ['rot-90', 'rot-180', 'rot-270'];
        const rotations = rotationCheckboxes
            .filter(id => UIUtils.getElementById(id)?.checked)
            .map(id => parseInt(UIUtils.getElementById(id)?.value));

        // Validation
        if (!tileId || !structure) {
            UIUtils.showAlert('Please fill in Tile ID and Structure', 'warning');
            return;
        }

        if (this.currentConfig.tiles.some(tile => tile.tileId === tileId)) {
            UIUtils.showAlert('Tile ID already exists in configuration', 'danger');
            return;
        }

        const tile = {
            tileId,
            structure_name: structure,
            weight_package: weightPackage,
            role_package: rolePackage,
            rotations: rotations,
            source: 'custom'
        };

        if (weightPackage === 'custom') {
            tile.custom_weight = weight;
        }
        if (rolePackage === 'custom') {
            tile.custom_role = role;
        }

        this.currentConfig.tiles.push(tile);
        this.onTileAdd(tile);
        
        // Update next tile ID and clear form
        this.nextTileId = Math.max(this.nextTileId + 1, tileId + 1);
        this.clearForm();
        
        UIUtils.showAlert(`Tile ${tileId} added successfully`, 'success');
    }

    removeTile(index) {
        if (index >= 0 && index < this.currentConfig.tiles.length) {
            const removedTile = this.currentConfig.tiles.splice(index, 1)[0];
            this.onTileRemove(removedTile, index);
            UIUtils.showAlert('Tile removed', 'info');
        }
    }

    clearForm() {
        const tileIdField = UIUtils.getElementById('tile-id');
        const structureField = UIUtils.getElementById('tile-structure');
        const weightField = UIUtils.getElementById('tile-weight');
        const roleField = UIUtils.getElementById('tile-role');
        const weightPackageField = UIUtils.getElementById('weight-package');
        const rolePackageField = UIUtils.getElementById('role-package');
        
        if (tileIdField) tileIdField.value = this.nextTileId;
        if (structureField) structureField.value = '';
        if (weightField) weightField.value = '1.0';
        if (roleField) roleField.value = 'floor';
        if (weightPackageField) weightPackageField.value = 'default';
        if (rolePackageField) rolePackageField.value = 'default';
        
        const rotationCheckboxes = ['rot-90', 'rot-180', 'rot-270'];
        rotationCheckboxes.forEach(id => {
            const checkbox = UIUtils.getElementById(id);
            if (checkbox) checkbox.checked = false;
        });

        this.updateWeightInput();
        this.updateRoleInput();
        this.showPackageInfo();
    }

    loadPredefinedPackage() {
        const packageSelect = UIUtils.getElementById('predefined-package');
        const packageName = packageSelect?.value;
        
        if (!packageName) {
            UIUtils.showAlert('Please select a predefined package', 'warning');
            return;
        }

        try {
            const packageData = TilePackages.packages[packageName];
            if (!packageData) {
                UIUtils.showAlert('Package not found', 'danger');
                return;
            }

            // Display package information
            const infoDiv = UIUtils.getElementById('package-info');
            if (infoDiv) {
                const tileCount = packageData.tiles ? packageData.tiles.length : 0;
                infoDiv.innerHTML = `
                    <div class="package-preview">
                        <h5>${packageName} Package</h5>
                        <p><strong>Description:</strong> ${packageData.description || 'No description'}</p>
                        <p><strong>Tiles:</strong> ${tileCount}</p>
                        <p><strong>Theme:</strong> ${packageData.theme || 'General'}</p>
                    </div>
                `;
            }

            UIUtils.showAlert(`Package "${packageName}" loaded for preview`, 'info');
        } catch (error) {
            UIUtils.showAlert(`Failed to load package: ${error.message}`, 'danger');
        }
    }

    addPredefinedPackage() {
        const packageSelect = UIUtils.getElementById('predefined-package');
        const packageName = packageSelect?.value;
        
        if (!packageName) {
            UIUtils.showAlert('Please select a predefined package', 'warning');
            return;
        }

        try {
            const packageData = TilePackages.packages[packageName];
            if (!packageData || !packageData.tiles) {
                UIUtils.showAlert('Package not found or has no tiles', 'danger');
                return;
            }

            let addedCount = 0;
            let skippedCount = 0;

            packageData.tiles.forEach(tile => {
                // Check if tile ID already exists
                if (this.currentConfig.tiles.some(existing => existing.tileId === tile.tileId)) {
                    skippedCount++;
                } else {
                    // Add source information
                    const tileWithSource = { ...tile, source: 'predefined', package: packageName };
                    this.currentConfig.tiles.push(tileWithSource);
                    addedCount++;
                    
                    // Update next tile ID
                    this.nextTileId = Math.max(this.nextTileId, tile.tileId + 1);
                }
            });

            this.onTileChange();

            let message = `Added ${addedCount} tiles from "${packageName}" package`;
            if (skippedCount > 0) {
                message += `, skipped ${skippedCount} duplicate tile IDs`;
            }
            
            UIUtils.showAlert(message, 'success');
            
            // Update the tile ID field
            const tileIdField = UIUtils.getElementById('tile-id');
            if (tileIdField) tileIdField.value = this.nextTileId;

        } catch (error) {
            UIUtils.showAlert(`Failed to add package: ${error.message}`, 'danger');
        }
    }

    // Update current configuration reference
    setConfiguration(config) {
        this.currentConfig = config;
    }

    // Get current configuration
    getConfiguration() {
        return this.currentConfig;
    }

    // Update next tile ID
    setNextTileId(id) {
        this.nextTileId = id;
        const tileIdField = UIUtils.getElementById('tile-id');
        if (tileIdField) tileIdField.value = this.nextTileId;
    }
}