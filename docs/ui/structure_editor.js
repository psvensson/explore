/**
 * StructureEditor - Editor for tile structures (geometries)
 * 
 * Allows creating and editing 3D voxel structures that define the basic
 * geometry and shape of tiles used in dungeon generation.
 */

import { UIUtils } from './ui_utils.js';
import { StructurePreviewUtil } from './utils/structure-preview-util.js';

export class StructureEditor {
    constructor(container) {
        this.container = container;
        this.currentStructure = this.createDefaultStructure();
        this.editingStructure = null;
        this.currentLayer = 0;
        
        this.initializeUI();
        this.loadExistingStructures();
    }

    createDefaultStructure() {
        return {
            name: '',
            description: '',
            layers: [
                ["111", "111", "111"],  // Floor (solid mass)
                ["111", "000", "111"],  // Middle: east-west corridor (walls north/south, open path through center row)
                ["111", "111", "111"]   // Ceiling (solid mass)
            ],
            transforms: [],
            category: 'corridor'
        };
    }

    initializeUI() {
        this.container.innerHTML = `
            <div class="structure-editor">
                <div class="editor-header">
                    <h3>🏗️ Structure Editor</h3>
                    <p>Define the basic 3D geometry and shape of tiles</p>
                </div>

                <!-- Existing Structures -->
                <div class="existing-structures">
                    <h4>Existing Structures</h4>
                    <div class="structure-list">
                        <div class="structure-grid" id="structure-grid">
                            <!-- Will be populated by loadExistingStructures -->
                        </div>
                    </div>
                </div>

                <!-- Structure Form -->
                <div class="structure-form">
                    <h4 id="form-title">Create New Structure</h4>
                    
                    <div class="form-row">
                        <div class="form-group col-md-6">
                            <label for="structure-name">Structure Name:</label>
                            <input type="text" id="structure-name" class="form-control" 
                                   placeholder="e.g., cross_intersection">
                        </div>
                        <div class="form-group col-md-6">
                            <label for="structure-category">Category:</label>
                            <select id="structure-category" class="form-control">
                                <option value="corridor">Corridor</option>
                                <option value="room">Room</option>
                                <option value="intersection">Intersection</option>
                                <option value="stair">Stair</option>
                                <option value="special">Special</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="structure-description">Description:</label>
                        <textarea id="structure-description" class="form-control" rows="2"
                                  placeholder="Describe this structure..."></textarea>
                    </div>

                    <!-- 3D Voxel Editor -->
                    <div class="voxel-editor">
                        <h5>3D Voxel Editor</h5>
                        <div class="layer-tabs">
                            <button class="layer-tab active" data-layer="0">Floor (Y=0)</button>
                            <button class="layer-tab" data-layer="1">Middle (Y=1)</button>
                            <button class="layer-tab" data-layer="2">Ceiling (Y=2)</button>
                        </div>
                        
                        <div class="voxel-grid" id="voxel-grid">
                            <!-- 3x3 grid for each layer -->
                        </div>
                        
                        <div class="voxel-legend">
                            <div class="legend-item">
                                <div class="voxel solid"></div>
                                <span>1 = Solid</span>
                            </div>
                            <div class="legend-item">
                                <div class="voxel empty"></div>
                                <span>0 = Empty</span>
                            </div>
                            <div class="legend-item">
                                <div class="voxel stair"></div>
                                <span>2 = Stair</span>
                            </div>
                        </div>
                    </div>

                    <!-- Transforms -->
                    <div class="transforms-section">
                        <h5>Automatic Rotations</h5>
                        <div class="checkbox-group">
                            <label><input type="checkbox" value="ry" id="transform-90"> 90° rotation</label>
                            <label><input type="checkbox" value="ry+ry" id="transform-180"> 180° rotation</label>
                            <label><input type="checkbox" value="ry+ry+ry" id="transform-270"> 270° rotation</label>
                        </div>
                    </div>

                    <!-- Preview -->
                    <div class="structure-preview">
                        <h5>Structure Preview</h5>
                        <div class="preview-container" id="structure-preview">
                            <!-- Will show ASCII representation of structure -->
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="form-actions">
                        <button id="save-structure" class="btn btn-success">Save Structure</button>
                        <button id="clear-structure" class="btn btn-secondary">Clear</button>
                        <button id="cancel-edit" class="btn btn-secondary" style="display: none;">Cancel Edit</button>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents();
        this.createVoxelEditor();
        this.updatePreview();
    }

    async loadExistingStructures() {
        const grid = document.getElementById('structure-grid');
        grid.innerHTML = '';

        try {
            // Load default structures from the system
            const { TileStructures } = await import('../dungeon/tile_structures.js');
            
            const sourceStructs = TileStructures.STRUCTURES || TileStructures.structures || {};
            Object.entries(sourceStructs).forEach(([name, structure]) => {
                const card = document.createElement('div');
                card.className = 'structure-card';
                card.innerHTML = `
                    <div class="structure-header">
                        <h5>${name.replace(/_/g, ' ')}</h5>
                        <div class="structure-actions">
                            <button class="btn btn-sm btn-info" onclick="structureEditor.cloneStructure('${name}')">Clone</button>
                            <button class="btn btn-sm btn-primary" onclick="structureEditor.editStructure('${name}')">Edit</button>
                        </div>
                    </div>
                    <div class="structure-preview-mini">
                        ${this.renderMiniPreview(structure)}
                    </div>
                    <div class="structure-info">
                        <small>Transforms: ${structure.transforms?.length || 0}</small>
                    </div>
                `;
                grid.appendChild(card);
            });
        } catch (error) {
            console.warn('Could not load tile structures:', error);
            grid.innerHTML = '<div class="error-message">Could not load existing structures</div>';
        }
    }

    createVoxelEditor() {
        const grid = document.getElementById('voxel-grid');
        grid.innerHTML = '';

        // Create 3x3 grid for current layer
        for (let z = 0; z < 3; z++) {
            for (let x = 0; x < 3; x++) {
                const cell = document.createElement('div');
                cell.className = 'voxel-cell';
                cell.dataset.x = x;
                cell.dataset.z = z;
                cell.onclick = () => this.toggleVoxel(x, z);
                grid.appendChild(cell);
            }
        }

        this.updateVoxelDisplay();
    }

    bindEvents() {
        // Layer tabs
        document.querySelectorAll('.layer-tab').forEach(tab => {
            tab.onclick = () => this.switchLayer(parseInt(tab.dataset.layer));
        });

        // Form events
        document.getElementById('structure-name').oninput = () => this.updatePreview();
        document.getElementById('structure-description').oninput = () => this.updatePreview();
        document.getElementById('structure-category').onchange = () => this.updatePreview();

        // Transform checkboxes
        document.querySelectorAll('[id^="transform-"]').forEach(cb => {
            cb.onchange = () => this.updateTransforms();
        });

        // Actions
        document.getElementById('save-structure').onclick = () => this.saveStructure();
        document.getElementById('clear-structure').onclick = () => this.clearForm();
        document.getElementById('cancel-edit').onclick = () => this.cancelEdit();
    }

    switchLayer(layerIndex) {
        this.currentLayer = layerIndex;
        
        // Update tab appearance
        document.querySelectorAll('.layer-tab').forEach(tab => {
            tab.classList.toggle('active', parseInt(tab.dataset.layer) === layerIndex);
        });

        this.updateVoxelDisplay();
    }

    toggleVoxel(x, z) {
        const currentLayer = this.currentLayer || 0;
        const currentValue = this.currentStructure.layers[currentLayer][z][x];
        
        // Cycle through: 0 -> 1 -> 2 -> 0
        let newValue;
        if (currentValue === '0') newValue = '1';
        else if (currentValue === '1') newValue = '2';
        else newValue = '0';

        // Update the structure
        const newRow = this.currentStructure.layers[currentLayer][z].split('');
        newRow[x] = newValue;
        this.currentStructure.layers[currentLayer][z] = newRow.join('');

        this.updateVoxelDisplay();
        this.updatePreview();
    }

    updateVoxelDisplay() {
        const currentLayer = this.currentLayer || 0;
        const layerData = this.currentStructure.layers[currentLayer];

        document.querySelectorAll('.voxel-cell').forEach(cell => {
            const x = parseInt(cell.dataset.x);
            const z = parseInt(cell.dataset.z);
            const value = layerData[z][x];

            cell.className = 'voxel-cell';
            if (value === '1') cell.classList.add('solid');
            else if (value === '2') cell.classList.add('stair');
            else cell.classList.add('empty');
        });
    }

    updateTransforms() {
        const transforms = [];
        if (document.getElementById('transform-90').checked) transforms.push('ry');
        if (document.getElementById('transform-180').checked) transforms.push('ry+ry');
        if (document.getElementById('transform-270').checked) transforms.push('ry+ry+ry');
        
        this.currentStructure.transforms = transforms;
        this.updatePreview();
    }

    updatePreview() {
        const preview = document.getElementById('structure-preview');
        preview.innerHTML = this.renderStructurePreview(this.currentStructure);
    }

    renderStructurePreview(structure) {
        return `
            <div class="layer-preview">
                ${structure.layers.map((layer, index) => `
                    <div class="layer">
                        <h6>Layer ${index}</h6>
                        <div class="layer-grid">
                            ${layer.map(row => `<div class="row">${row.split('').map(cell => 
                                `<span class="cell cell-${cell}">${cell}</span>`
                            ).join('')}</div>`).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="transform-info">
                Rotations: ${structure.transforms?.join(', ') || 'None'}
            </div>
        `;
    }

    renderMiniPreview(structure) {
        return StructurePreviewUtil.renderMini(structure);
    }

    cloneStructure(name) {
        this.loadStructureByName(name).then(structure => {
            if (structure) {
                this.currentStructure = {
                    name: `${name}_copy`,
                    description: `Copy of ${name}`,
                    layers: JSON.parse(JSON.stringify(structure.layers)),
                    transforms: [...(structure.transforms || [])],
                    category: 'corridor'
                };

                this.editingStructure = null;
                this.populateForm();
                document.getElementById('form-title').textContent = `Clone Structure: ${name}`;
            }
        });
    }

    editStructure(name) {
        this.loadStructureByName(name).then(structure => {
            if (structure) {
                this.currentStructure = {
                    name,
                    description: `Editing ${name}`,
                    layers: JSON.parse(JSON.stringify(structure.layers)),
                    transforms: [...(structure.transforms || [])],
                    category: 'corridor'
                };

                this.editingStructure = name;
                this.populateForm();
                document.getElementById('form-title').textContent = `Edit Structure: ${name}`;
                document.getElementById('cancel-edit').style.display = 'inline-block';
            }
        });
    }

    async loadStructureByName(name) {
        try {
            const { TileStructures } = await import('../dungeon/tile_structures.js');
            return TileStructures.STRUCTURES[name];
        } catch (error) {
            console.error('Could not load structure:', error);
            UIUtils.showMessage('Could not load structure', 'error');
            return null;
        }
    }

    populateForm() {
        document.getElementById('structure-name').value = this.currentStructure.name;
        document.getElementById('structure-description').value = this.currentStructure.description;
        document.getElementById('structure-category').value = this.currentStructure.category;

        // Update transform checkboxes
        document.getElementById('transform-90').checked = this.currentStructure.transforms.includes('ry');
        document.getElementById('transform-180').checked = this.currentStructure.transforms.includes('ry+ry');
        document.getElementById('transform-270').checked = this.currentStructure.transforms.includes('ry+ry+ry');

        this.currentLayer = 0;
        this.switchLayer(0);
        this.updateVoxelDisplay();
        this.updatePreview();
    }

    saveStructure() {
        const name = document.getElementById('structure-name').value.trim();
        if (!name) {
            UIUtils.showMessage('Please enter a structure name', 'error');
            return;
        }

        // Validate structure
        if (!this.validateStructure()) {
            return;
        }

        // Save structure to localStorage for now (since we can't modify imported modules)
        try {
            const savedStructures = JSON.parse(localStorage.getItem('customStructures') || '{}');
            savedStructures[name] = {
                layers: JSON.parse(JSON.stringify(this.currentStructure.layers)),
                transforms: [...this.currentStructure.transforms]
            };
            localStorage.setItem('customStructures', JSON.stringify(savedStructures));

            UIUtils.showMessage(`Structure '${name}' saved successfully!`, 'success');
            this.loadExistingStructures();
            this.clearForm();
        } catch (error) {
            UIUtils.showMessage('Error saving structure: ' + error.message, 'error');
        }
    }

    validateStructure() {
        // Check that structure has valid layers
        if (!this.currentStructure.layers || this.currentStructure.layers.length !== 3) {
            UIUtils.showMessage('Structure must have exactly 3 layers', 'error');
            return false;
        }

        // Check layer format
        for (let i = 0; i < 3; i++) {
            const layer = this.currentStructure.layers[i];
            if (!Array.isArray(layer) || layer.length !== 3) {
                UIUtils.showMessage(`Layer ${i} must have exactly 3 rows`, 'error');
                return false;
            }

            for (let j = 0; j < 3; j++) {
                if (typeof layer[j] !== 'string' || layer[j].length !== 3) {
                    UIUtils.showMessage(`Layer ${i}, row ${j} must be exactly 3 characters`, 'error');
                    return false;
                }

                if (!/^[012]+$/.test(layer[j])) {
                    UIUtils.showMessage(`Layer ${i}, row ${j} contains invalid characters (only 0, 1, 2 allowed)`, 'error');
                    return false;
                }
            }
        }

        return true;
    }

    clearForm() {
        this.currentStructure = this.createDefaultStructure();
        this.editingStructure = null;
        
        document.getElementById('structure-name').value = '';
        document.getElementById('structure-description').value = '';
        document.getElementById('structure-category').value = 'corridor';
        document.getElementById('form-title').textContent = 'Create New Structure';
        document.getElementById('cancel-edit').style.display = 'none';

        // Clear transform checkboxes
        document.querySelectorAll('[id^="transform-"]').forEach(cb => cb.checked = false);

        this.currentLayer = 0;
        this.switchLayer(0);
        this.updateVoxelDisplay();
        this.updatePreview();
    }

    cancelEdit() {
        this.clearForm();
    }
}

// Global reference for onclick handlers
if (typeof window !== 'undefined') {
    window.structureEditor = null;
}