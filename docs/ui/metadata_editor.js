/**
 * MetadataEditor - Editor for weight and role packages
 * 
 * Allows creating and editing metadata packages that define probability weights,
 * functional roles, and properties for different dungeon generation behaviors.
 */

import { UIUtils } from './ui_utils.js';

export class MetadataEditor {
    constructor(container) {
        this.container = container;
        this.currentPackage = this.createDefaultPackage();
        this.editingPackage = null;
        this.currentPackageType = 'weight';
        
        this.initializeUI();
        this.loadExistingPackages();
    }

    createDefaultPackage() {
        return {
            name: '',
            description: '',
            type: 'weight',
            data: {
                corridor_weights: 1.0,
                room_weights: 1.0,
                stair_weights: 0.5,
                dead_end_weights: 0.3,
                open_space_weights: 0.1
            }
        };
    }

    initializeUI() {
        this.container.innerHTML = `
            <div class="metadata-editor">
                <div class="editor-header">
                    <h3>⚙️ Metadata Package Editor</h3>
                    <p>Define weight and role packages for different dungeon generation behaviors</p>
                </div>

                <!-- Package Type Selector -->
                <div class="package-type-selector">
                    <div class="type-tabs">
                        <button class="type-tab active" data-type="weight">Weight Packages</button>
                        <button class="type-tab" data-type="role">Role Packages</button>
                        <button class="type-tab" data-type="property">Property Packages</button>
                    </div>
                </div>

                <!-- Existing Packages -->
                <div class="existing-packages">
                    <h4 id="packages-title">Weight Packages</h4>
                    <div class="package-grid" id="package-grid">
                        <!-- Will be populated by loadExistingPackages -->
                    </div>
                </div>

                <!-- Package Form -->
                <div class="package-form">
                    <h4 id="form-title">Create New Weight Package</h4>
                    
                    <div class="form-row">
                        <div class="form-group col-md-6">
                            <label for="package-name">Package Name:</label>
                            <input type="text" id="package-name" class="form-control" 
                                   placeholder="e.g., high_connectivity">
                        </div>
                        <div class="form-group col-md-6">
                            <label for="package-description">Description:</label>
                            <input type="text" id="package-description" class="form-control" 
                                   placeholder="Describe this package...">
                        </div>
                    </div>

                    <!-- Dynamic Package Data Editor -->
                    <div id="package-data-editor">
                        <!-- Will be populated based on package type -->
                    </div>

                    <!-- Preview -->
                    <div class="package-preview">
                        <h5>Package Preview</h5>
                        <div class="preview-container" id="package-preview">
                            <!-- Will show package data -->
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="form-actions">
                        <button id="save-package" class="btn btn-success">Save Package</button>
                        <button id="clear-package" class="btn btn-secondary">Clear</button>
                        <button id="cancel-edit" class="btn btn-secondary" style="display: none;">Cancel Edit</button>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents();
        this.createPackageDataEditor();
        this.updatePreview();
    }

    bindEvents() {
        // Type tabs
        document.querySelectorAll('.type-tab').forEach(tab => {
            tab.onclick = () => this.switchPackageType(tab.dataset.type);
        });

        // Form events
        document.getElementById('package-name').oninput = () => this.updatePreview();
        document.getElementById('package-description').oninput = () => this.updatePreview();

        // Actions
        document.getElementById('save-package').onclick = () => this.savePackage();
        document.getElementById('clear-package').onclick = () => this.clearForm();
        document.getElementById('cancel-edit').onclick = () => this.cancelEdit();
    }

    switchPackageType(type) {
        this.currentPackageType = type;
        
        // Update tab appearance
        document.querySelectorAll('.type-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.type === type);
        });

        // Update titles
        const typeNames = {
            weight: 'Weight Packages',
            role: 'Role Packages', 
            property: 'Property Packages'
        };
        
        document.getElementById('packages-title').textContent = typeNames[type];
        document.getElementById('form-title').textContent = `Create New ${typeNames[type].slice(0, -1)}`;

        // Reset current package
        this.currentPackage = this.createDefaultPackageForType(type);
        this.loadExistingPackages();
        this.createPackageDataEditor();
        this.clearForm();
    }

    createDefaultPackageForType(type) {
        const defaults = {
            weight: {
                corridor_weights: 1.0,
                room_weights: 1.0,
                stair_weights: 0.5,
                dead_end_weights: 0.3,
                open_space_weights: 0.1
            },
            role: {
                corridor_role: 'corridor',
                room_role: 'room',
                stair_role: 'stair',
                stair_up_role: 'stair_up',
                stair_down_role: 'stair_down',
                dead_end_role: 'corridor',
                open_space_role: 'open_space'
            },
            property: {
                lighting: 'normal',
                accessibility: 'standard',
                danger_level: 'low'
            }
        };

        return {
            name: '',
            description: '',
            type,
            data: { ...defaults[type] }
        };
    }

    async loadExistingPackages() {
        const grid = document.getElementById('package-grid');
        grid.innerHTML = '';

        try {
            // Load default packages from the system
            const { TileMetadata } = await import('../dungeon/tile_metadata.js');
            
            let packages;
            if (this.currentPackageType === 'weight') {
                packages = TileMetadata.weightPackages;
            } else if (this.currentPackageType === 'role') {
                packages = TileMetadata.rolePackages;
            } else {
                packages = TileMetadata.propertyPackages;
            }

            Object.entries(packages).forEach(([name, data]) => {
                const card = document.createElement('div');
                card.className = 'package-card';
                card.innerHTML = `
                    <div class="package-header">
                        <h5>${name.replace(/_/g, ' ')}</h5>
                        <div class="package-actions">
                            <button class="btn btn-sm btn-info" onclick="metadataEditor.clonePackage('${name}')">Clone</button>
                            <button class="btn btn-sm btn-primary" onclick="metadataEditor.editPackage('${name}')">Edit</button>
                        </div>
                    </div>
                    <div class="package-data">
                        ${this.renderPackageData(data)}
                    </div>
                `;
                grid.appendChild(card);
            });
        } catch (error) {
            console.warn('Could not load metadata packages:', error);
            grid.innerHTML = '<div class="error-message">Could not load existing packages</div>';
        }
    }

    createPackageDataEditor() {
        const editor = document.getElementById('package-data-editor');
        editor.innerHTML = '';

        if (this.currentPackageType === 'weight') {
            this.createWeightEditor(editor);
        } else if (this.currentPackageType === 'role') {
            this.createRoleEditor(editor);
        } else {
            this.createPropertyEditor(editor);
        }
    }

    createWeightEditor(container) {
        const weightTypes = [
            { key: 'corridor_weights', label: 'Corridor Weight', description: 'How likely corridors are to appear' },
            { key: 'room_weights', label: 'Room Weight', description: 'How likely rooms are to appear' },
            { key: 'stair_weights', label: 'Stair Weight', description: 'How likely stairs are to appear' },
            { key: 'dead_end_weights', label: 'Dead End Weight', description: 'How likely dead ends are to appear' },
            { key: 'open_space_weights', label: 'Open Space Weight', description: 'How likely large open spaces are to appear' }
        ];

        container.innerHTML = `
            <h5>Weight Values</h5>
            <div class="weight-editor">
                ${weightTypes.map(weight => `
                    <div class="weight-group">
                        <label for="${weight.key}">${weight.label}:</label>
                        <input type="number" id="${weight.key}" class="form-control" 
                               min="0" step="0.1" value="${this.currentPackage.data[weight.key]}">
                        <small class="form-text">${weight.description}</small>
                    </div>
                `).join('')}
            </div>
        `;

        // Bind weight input events
        weightTypes.forEach(weight => {
            document.getElementById(weight.key).oninput = (e) => {
                this.currentPackage.data[weight.key] = parseFloat(e.target.value) || 0;
                this.updatePreview();
            };
        });
    }

    createRoleEditor(container) {
        const roleTypes = [
            { key: 'corridor_role', label: 'Corridor Role', description: 'Functional purpose of corridors' },
            { key: 'room_role', label: 'Room Role', description: 'Functional purpose of rooms' },
            { key: 'stair_role', label: 'Stair Role', description: 'Functional purpose of stairs' },
            { key: 'stair_up_role', label: 'Upward Stair Role', description: 'Functional purpose of upward stairs' },
            { key: 'stair_down_role', label: 'Downward Stair Role', description: 'Functional purpose of downward stairs' },
            { key: 'dead_end_role', label: 'Dead End Role', description: 'Functional purpose of dead ends' },
            { key: 'open_space_role', label: 'Open Space Role', description: 'Functional purpose of open spaces' }
        ];

        container.innerHTML = `
            <h5>Role Values</h5>
            <div class="role-editor">
                ${roleTypes.map(role => `
                    <div class="role-group">
                        <label for="${role.key}">${role.label}:</label>
                        <input type="text" id="${role.key}" class="form-control" 
                               value="${this.currentPackage.data[role.key]}">
                        <small class="form-text">${role.description}</small>
                    </div>
                `).join('')}
            </div>
        `;

        // Bind role input events
        roleTypes.forEach(role => {
            document.getElementById(role.key).oninput = (e) => {
                this.currentPackage.data[role.key] = e.target.value;
                this.updatePreview();
            };
        });
    }

    createPropertyEditor(container) {
        container.innerHTML = `
            <h5>Property Values</h5>
            <div class="property-editor">
                <div class="property-group">
                    <label for="lighting">Lighting:</label>
                    <select id="lighting" class="form-control">
                        <option value="dim">Dim</option>
                        <option value="normal">Normal</option>
                        <option value="bright">Bright</option>
                        <option value="dramatic">Dramatic</option>
                    </select>
                </div>
                
                <div class="property-group">
                    <label for="accessibility">Accessibility:</label>
                    <select id="accessibility" class="form-control">
                        <option value="challenging">Challenging</option>
                        <option value="standard">Standard</option>
                        <option value="easy">Easy</option>
                    </select>
                </div>
                
                <div class="property-group">
                    <label for="danger_level">Danger Level:</label>
                    <select id="danger_level" class="form-control">
                        <option value="minimal">Minimal</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                </div>
            </div>
        `;

        // Set current values
        document.getElementById('lighting').value = this.currentPackage.data.lighting;
        document.getElementById('accessibility').value = this.currentPackage.data.accessibility;
        document.getElementById('danger_level').value = this.currentPackage.data.danger_level;

        // Bind events
        ['lighting', 'accessibility', 'danger_level'].forEach(prop => {
            document.getElementById(prop).onchange = (e) => {
                this.currentPackage.data[prop] = e.target.value;
                this.updatePreview();
            };
        });
    }

    renderPackageData(data) {
        return `
            <div class="package-summary">
                ${Object.entries(data).map(([key, value]) => `
                    <div class="data-item">
                        <span class="key">${key.replace(/_/g, ' ')}:</span>
                        <span class="value">${value}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    updatePreview() {
        const preview = document.getElementById('package-preview');
        preview.innerHTML = `
            <div class="package-info">
                <h6>${this.currentPackage.name || 'Unnamed Package'}</h6>
                <p>${this.currentPackage.description || 'No description'}</p>
                <div class="package-data-preview">
                    ${this.renderPackageData(this.currentPackage.data)}
                </div>
            </div>
        `;
    }

    clonePackage(name) {
        this.loadPackageByName(name).then(sourceData => {
            if (sourceData) {
                this.currentPackage = {
                    name: `${name}_copy`,
                    description: `Copy of ${name}`,
                    type: this.currentPackageType,
                    data: JSON.parse(JSON.stringify(sourceData))
                };

                this.editingPackage = null;
                this.populateForm();
                document.getElementById('form-title').textContent = `Clone ${this.currentPackageType} Package: ${name}`;
            }
        });
    }

    editPackage(name) {
        this.loadPackageByName(name).then(sourceData => {
            if (sourceData) {
                this.currentPackage = {
                    name,
                    description: `Editing ${name}`,
                    type: this.currentPackageType,
                    data: JSON.parse(JSON.stringify(sourceData))
                };

                this.editingPackage = name;
                this.populateForm();
                document.getElementById('form-title').textContent = `Edit ${this.currentPackageType} Package: ${name}`;
                document.getElementById('cancel-edit').style.display = 'inline-block';
            }
        });
    }

    async loadPackageByName(name) {
        try {
            const { TileMetadata } = await import('../dungeon/tile_metadata.js');
            
            let sourceData;
            if (this.currentPackageType === 'weight') {
                sourceData = TileMetadata.weightPackages[name];
            } else if (this.currentPackageType === 'role') {
                sourceData = TileMetadata.rolePackages[name];
            } else {
                sourceData = TileMetadata.propertyPackages[name];
            }
            
            return sourceData;
        } catch (error) {
            console.error('Could not load package:', error);
            UIUtils.showMessage('Could not load package', 'error');
            return null;
        }
    }

    populateForm() {
        document.getElementById('package-name').value = this.currentPackage.name;
        document.getElementById('package-description').value = this.currentPackage.description;
        
        // Populate data fields
        Object.entries(this.currentPackage.data).forEach(([key, value]) => {
            const element = document.getElementById(key);
            if (element) {
                element.value = value;
            }
        });

        this.updatePreview();
    }

    savePackage() {
        const name = document.getElementById('package-name').value.trim();
        if (!name) {
            UIUtils.showMessage('Please enter a package name', 'error');
            return;
        }

        // Validate package
        if (!this.validatePackage()) {
            return;
        }

        // Save package to localStorage for now (since we can't modify imported modules)
        try {
            const storageKey = `custom${this.currentPackageType}Packages`;
            const savedPackages = JSON.parse(localStorage.getItem(storageKey) || '{}');
            savedPackages[name] = { ...this.currentPackage.data };
            localStorage.setItem(storageKey, JSON.stringify(savedPackages));

            UIUtils.showMessage(`${this.currentPackageType} package '${name}' saved successfully!`, 'success');
            this.loadExistingPackages();
            this.clearForm();
        } catch (error) {
            UIUtils.showMessage('Error saving package: ' + error.message, 'error');
        }
    }

    validatePackage() {
        try {
            if (this.currentPackageType === 'weight') {
                // Basic weight validation - all values should be numbers >= 0
                for (const [key, value] of Object.entries(this.currentPackage.data)) {
                    if (typeof value !== 'number' || value < 0) {
                        throw new Error(`${key} must be a non-negative number`);
                    }
                }
            } else if (this.currentPackageType === 'role') {
                // Basic role validation - all values should be non-empty strings
                for (const [key, value] of Object.entries(this.currentPackage.data)) {
                    if (typeof value !== 'string' || !value.trim()) {
                        throw new Error(`${key} must be a non-empty string`);
                    }
                }
            }
            return true;
        } catch (error) {
            UIUtils.showMessage(`Validation error: ${error.message}`, 'error');
            return false;
        }
    }

    clearForm() {
        this.currentPackage = this.createDefaultPackageForType(this.currentPackageType);
        this.editingPackage = null;
        
        document.getElementById('package-name').value = '';
        document.getElementById('package-description').value = '';
        
        const typeNames = {
            weight: 'Weight Package',
            role: 'Role Package', 
            property: 'Property Package'
        };
        document.getElementById('form-title').textContent = `Create New ${typeNames[this.currentPackageType]}`;
        document.getElementById('cancel-edit').style.display = 'none';

        this.createPackageDataEditor();
        this.updatePreview();
    }

    cancelEdit() {
        this.clearForm();
    }
}

// Global reference for onclick handlers
if (typeof window !== 'undefined') {
    window.metadataEditor = null;
}