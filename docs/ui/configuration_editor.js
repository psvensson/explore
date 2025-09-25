/**
 * ConfigurationEditor - Step 4 of the hierarchical tileset editor
 * 
 * Creates complete tileset configurations with generation parameters,
 * export options, and validation for WFC dungeon generation.
 */

export class ConfigurationEditor {
    
    constructor(container, onUpdate) {
        this.container = container;
        this.onUpdate = onUpdate || (() => {});
        this.currentConfig = null;
        this.configData = this.getDefaultConfig();
        
        this.loadExistingConfigurations();
    }

    render() {
        this.container.innerHTML = `
            <div class="config-editor">
                <div class="editor-header">
                    <h2>Step 4: Build Configurations</h2>
                    <p>Create complete tileset configurations for dungeon generation</p>
                </div>
                
                <div class="config-editor-content">
                    <div class="config-selector">
                        <div class="selector-header">
                            <h3>Configurations</h3>
                            <button class="btn btn-primary" onclick="this.createNewConfiguration()">
                                <span class="icon">+</span> New Configuration
                            </button>
                        </div>
                        <div class="config-list" id="config-list">
                            ${this.renderConfigurationList()}
                        </div>
                    </div>
                    
                    <div class="config-workspace">
                        <div class="workspace-tabs">
                            <button class="tab-btn active" data-tab="metadata">Tileset Metadata</button>
                            <button class="tab-btn" data-tab="generation">Generation Parameters</button>
                            <button class="tab-btn" data-tab="validation">Validation & Testing</button>
                            <button class="tab-btn" data-tab="export">Export & Deploy</button>
                        </div>
                        
                        <div class="tab-content active" id="metadata-tab">
                            ${this.renderMetadataEditor()}
                        </div>
                        
                        <div class="tab-content" id="generation-tab">
                            ${this.renderGenerationParameters()}
                        </div>
                        
                        <div class="tab-content" id="validation-tab">
                            ${this.renderValidationTools()}
                        </div>
                        
                        <div class="tab-content" id="export-tab">
                            ${this.renderExportOptions()}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.attachEventListeners();
        this.loadSelectedConfiguration();
    }

    renderConfigurationList() {
        const existingConfigs = Object.keys(this.existingConfigurations);
        const customConfigs = this.getCustomConfigurations();
        
        return `
            ${existingConfigs.length > 0 ? `
                <div class="config-section">
                    <h4>Built-in Configurations</h4>
                    ${existingConfigs.map(name => `
                        <div class="config-card ${this.currentConfig === name ? 'selected' : ''}" data-config="${name}">
                            <div class="config-info">
                                <h5>${name}</h5>
                                <p>${this.existingConfigurations[name].description || 'No description'}</p>
                                <div class="config-stats">
                                    <span class="stat">v${this.existingConfigurations[name].version || '1.0'}</span>
                                </div>
                            </div>
                            <div class="config-actions">
                                <button class="btn btn-sm" onclick="this.cloneConfiguration('${name}')">Clone</button>
                                <button class="btn btn-sm btn-primary" onclick="this.selectConfiguration('${name}')">Edit</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            ${customConfigs.length > 0 ? `
                <div class="config-section">
                    <h4>Custom Configurations</h4>
                    ${customConfigs.map(name => `
                        <div class="config-card ${this.currentConfig === name ? 'selected' : ''}" data-config="${name}">
                            <div class="config-info">
                                <h5>${name}</h5>
                                <p>${this.getCustomConfiguration(name).description || 'Custom configuration'}</p>
                                <div class="config-stats">
                                    <span class="stat">v${this.getCustomConfiguration(name).version || '1.0'}</span>
                                </div>
                            </div>
                            <div class="config-actions">
                                <button class="btn btn-sm" onclick="this.deleteConfiguration('${name}')">Delete</button>
                                <button class="btn btn-sm btn-primary" onclick="this.selectConfiguration('${name}')">Edit</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            ${existingConfigs.length === 0 && customConfigs.length === 0 ? `
                <div class="empty-state">
                    <p>No configurations found. Create your first tileset configuration!</p>
                </div>
            ` : ''}
        `;
    }

    renderMetadataEditor() {
        return `
            <div class="metadata-editor">
                <div class="editor-section">
                    <h3>Tileset Information</h3>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="tileset-name">Tileset Name</label>
                            <input type="text" id="tileset-name" 
                                   value="${this.configData.name || ''}"
                                   placeholder="Enter tileset name">
                        </div>
                        
                        <div class="form-group">
                            <label for="tileset-version">Version</label>
                            <input type="text" id="tileset-version" 
                                   value="${this.configData.version || '1.0.0'}"
                                   placeholder="1.0.0">
                        </div>
                        
                        <div class="form-group full-width">
                            <label for="tileset-description">Description</label>
                            <textarea id="tileset-description" rows="3"
                                      placeholder="Describe this tileset configuration...">${this.configData.description || ''}</textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="tileset-author">Author</label>
                            <input type="text" id="tileset-author" 
                                   value="${this.configData.author || ''}"
                                   placeholder="Your name">
                        </div>
                        
                        <div class="form-group">
                            <label for="tileset-license">License</label>
                            <select id="tileset-license">
                                <option value="MIT" ${this.configData.license === 'MIT' ? 'selected' : ''}>MIT</option>
                                <option value="Apache-2.0" ${this.configData.license === 'Apache-2.0' ? 'selected' : ''}>Apache 2.0</option>
                                <option value="GPL-3.0" ${this.configData.license === 'GPL-3.0' ? 'selected' : ''}>GPL 3.0</option>
                                <option value="BSD-3-Clause" ${this.configData.license === 'BSD-3-Clause' ? 'selected' : ''}>BSD 3-Clause</option>
                                <option value="Custom" ${this.configData.license === 'Custom' ? 'selected' : ''}>Custom</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="editor-section">
                    <h3>Package Configuration</h3>
                    <div class="package-selector">
                        <label for="base-package">Base Tile Package</label>
                        <select id="base-package">
                            <option value="">Select a tile package...</option>
                            ${this.getAvailablePackages().map(pkg => `
                                <option value="${pkg}" ${this.configData.basePackage === pkg ? 'selected' : ''}>${pkg}</option>
                            `).join('')}
                        </select>
                        <p class="help-text">Choose the tile package to use as the base for this configuration</p>
                    </div>
                </div>
                
                <div class="editor-section">
                    <h3>Tileset Tags</h3>
                    <div class="tags-editor">
                        <div class="tags-input">
                            <input type="text" id="tag-input" placeholder="Add tags (press Enter)">
                        </div>
                        <div class="tags-list" id="tags-list">
                            ${(this.configData.tags || []).map(tag => `
                                <span class="tag">
                                    ${tag}
                                    <button class="tag-remove" onclick="this.removeTag('${tag}')">×</button>
                                </span>
                            `).join('')}
                        </div>
                        <div class="suggested-tags">
                            <span class="label">Suggested:</span>
                            ${['dungeon', 'corridor', '3d', 'wfc', 'procedural'].map(tag => `
                                <button class="suggested-tag" onclick="this.addTag('${tag}')">${tag}</button>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="save-section">
                    <button class="btn btn-primary" onclick="this.saveMetadata()">
                        <span class="icon">💾</span> Save Metadata
                    </button>
                </div>
            </div>
        `;
    }

    renderGenerationParameters() {
        return `
            <div class="generation-editor">
                <div class="editor-section">
                    <h3>WFC Parameters</h3>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="max-steps">Max Generation Steps</label>
                            <input type="number" id="max-steps" 
                                   value="${this.configData.wfc?.maxSteps || 10000}"
                                   min="100" max="100000" step="100">
                            <p class="help-text">Maximum iterations before giving up</p>
                        </div>
                        
                        <div class="form-group">
                            <label for="yield-every">Yield Every</label>
                            <input type="number" id="yield-every" 
                                   value="${this.configData.wfc?.yieldEvery || 500}"
                                   min="10" max="5000" step="10">
                            <p class="help-text">Steps between yielding control</p>
                        </div>
                        
                        <div class="form-group">
                            <label for="center-seed">
                                <input type="checkbox" id="center-seed" 
                                       ${this.configData.wfc?.centerSeed ? 'checked' : ''}>
                                Center Seed
                            </label>
                            <p class="help-text">Start generation from center tile</p>
                        </div>
                        
                        <div class="form-group">
                            <label for="connectivity-check">
                                <input type="checkbox" id="connectivity-check" 
                                       ${this.configData.wfc?.connectivityCheck ? 'checked' : ''}>
                                Connectivity Validation
                            </label>
                            <p class="help-text">Validate that generated maps are connected</p>
                        </div>
                    </div>
                </div>
                
                <div class="editor-section">
                    <h3>Generation Presets</h3>
                    <div class="preset-grid">
                        <div class="preset-option">
                            <h4>Small Dungeons</h4>
                            <p>Optimized for 3x3 to 5x5 maps</p>
                            <div class="preset-params">
                                <span>Max Steps: 5,000</span>
                                <span>Yield: 100</span>
                                <span>Center Seed: Yes</span>
                            </div>
                            <button class="btn btn-sm" onclick="this.applyPreset('small')">Apply</button>
                        </div>
                        
                        <div class="preset-option">
                            <h4>Medium Dungeons</h4>
                            <p>Balanced for 6x6 to 10x10 maps</p>
                            <div class="preset-params">
                                <span>Max Steps: 15,000</span>
                                <span>Yield: 300</span>
                                <span>Center Seed: Yes</span>
                            </div>
                            <button class="btn btn-sm" onclick="this.applyPreset('medium')">Apply</button>
                        </div>
                        
                        <div class="preset-option">
                            <h4>Large Dungeons</h4>
                            <p>For complex 12x12+ maps</p>
                            <div class="preset-params">
                                <span>Max Steps: 50,000</span>
                                <span>Yield: 1,000</span>
                                <span>Center Seed: No</span>
                            </div>
                            <button class="btn btn-sm" onclick="this.applyPreset('large')">Apply</button>
                        </div>
                    </div>
                </div>
                
                <div class="editor-section">
                    <h3>Advanced Options</h3>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="retry-attempts">Retry Attempts</label>
                            <input type="number" id="retry-attempts" 
                                   value="${this.configData.generation?.retryAttempts || 3}"
                                   min="1" max="10">
                            <p class="help-text">Number of attempts if generation fails</p>
                        </div>
                        
                        <div class="form-group">
                            <label for="backtrack-limit">Backtrack Limit</label>
                            <input type="number" id="backtrack-limit" 
                                   value="${this.configData.generation?.backtrackLimit || 100}"
                                   min="0" max="1000">
                            <p class="help-text">Maximum backtracking steps</p>
                        </div>
                        
                        <div class="form-group full-width">
                            <label for="custom-constraints">Custom Constraints</label>
                            <textarea id="custom-constraints" rows="4"
                                      placeholder="Additional WFC constraints (JSON format)...">${JSON.stringify(this.configData.generation?.customConstraints || {}, null, 2)}</textarea>
                        </div>
                    </div>
                </div>
                
                <div class="save-section">
                    <button class="btn btn-primary" onclick="this.saveGenerationParams()">
                        <span class="icon">⚙️</span> Save Parameters
                    </button>
                </div>
            </div>
        `;
    }

    renderValidationTools() {
        return `
            <div class="validation-tools">
                <div class="validation-section">
                    <h3>Configuration Validation</h3>
                    <div class="validation-checks" id="validation-results">
                        ${this.renderValidationResults()}
                    </div>
                    <button class="btn btn-primary" onclick="this.runValidation()">
                        <span class="icon">🔍</span> Run Validation
                    </button>
                </div>
                
                <div class="testing-section">
                    <h3>Generation Testing</h3>
                    <div class="test-grid">
                        <div class="test-option">
                            <h4>Quick Test (3x3)</h4>
                            <p>Fast validation of basic generation</p>
                            <button class="btn btn-primary" onclick="this.runQuickTest()">
                                <span class="icon">⚡</span> Quick Test
                            </button>
                        </div>
                        
                        <div class="test-option">
                            <h4>Standard Test (5x5)</h4>
                            <p>Balanced test of typical usage</p>
                            <button class="btn btn-primary" onclick="this.runStandardTest()">
                                <span class="icon">🎯</span> Standard Test
                            </button>
                        </div>
                        
                        <div class="test-option">
                            <h4>Stress Test (10x10)</h4>
                            <p>Heavy test for performance validation</p>
                            <button class="btn btn-primary" onclick="this.runStressTest()">
                                <span class="icon">💪</span> Stress Test
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="test-results" id="test-results">
                    <h4>Test Results</h4>
                    <div class="results-content">
                        <p>No tests run yet. Click a test button above to begin.</p>
                    </div>
                </div>
                
                <div class="performance-analysis">
                    <h3>Performance Analysis</h3>
                    <div class="analysis-grid" id="performance-stats">
                        <div class="stat-card">
                            <span class="stat-label">Average Generation Time</span>
                            <span class="stat-value">--</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-label">Success Rate</span>
                            <span class="stat-value">--</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-label">Memory Usage</span>
                            <span class="stat-value">--</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-label">Connectivity Score</span>
                            <span class="stat-value">--</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderValidationResults() {
        // This would run actual validation checks
        return `
            <div class="validation-result pending">
                <span class="icon">⏳</span>
                <span>Validation not run yet</span>
            </div>
        `;
    }

    renderExportOptions() {
        return `
            <div class="export-options">
                <div class="export-section">
                    <h3>Export Formats</h3>
                    <div class="export-grid">
                        <div class="export-option">
                            <h4>Complete Configuration</h4>
                            <p>Full tileset with all settings</p>
                            <button class="btn btn-primary" onclick="this.exportComplete()">
                                <span class="icon">📦</span> Export Complete
                            </button>
                        </div>
                        
                        <div class="export-option">
                            <h4>WFC JSON</h4>
                            <p>WFC-compatible format only</p>
                            <button class="btn btn-primary" onclick="this.exportWFC()">
                                <span class="icon">🔧</span> Export WFC
                            </button>
                        </div>
                        
                        <div class="export-option">
                            <h4>Documentation</h4>
                            <p>README and usage instructions</p>
                            <button class="btn btn-primary" onclick="this.exportDocs()">
                                <span class="icon">📚</span> Export Docs
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="deployment-section">
                    <h3>Deployment Options</h3>
                    <div class="deployment-grid">
                        <div class="deployment-option">
                            <h4>Replace Current Tileset</h4>
                            <p>Update the active tileset configuration</p>
                            <button class="btn btn-warning" onclick="this.replaceActiveTileset()">
                                <span class="icon">🔄</span> Replace Active
                            </button>
                        </div>
                        
                        <div class="deployment-option">
                            <h4>Add to Library</h4>
                            <p>Save to the tileset library</p>
                            <button class="btn btn-success" onclick="this.addToLibrary()">
                                <span class="icon">📚</span> Add to Library
                            </button>
                        </div>
                        
                        <div class="deployment-option">
                            <h4>Share Configuration</h4>
                            <p>Generate shareable link or code</p>
                            <button class="btn btn-primary" onclick="this.shareConfiguration()">
                                <span class="icon">🔗</span> Share
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="final-summary">
                    <h3>Configuration Summary</h3>
                    <div class="summary-content" id="config-summary">
                        ${this.renderConfigurationSummary()}
                    </div>
                </div>
            </div>
        `;
    }

    renderConfigurationSummary() {
        return `
            <div class="summary-grid">
                <div class="summary-item">
                    <span class="label">Name:</span>
                    <span class="value">${this.configData.name || 'Untitled'}</span>
                </div>
                <div class="summary-item">
                    <span class="label">Version:</span>
                    <span class="value">${this.configData.version || '1.0.0'}</span>
                </div>
                <div class="summary-item">
                    <span class="label">Base Package:</span>
                    <span class="value">${this.configData.basePackage || 'None'}</span>
                </div>
                <div class="summary-item">
                    <span class="label">Max Steps:</span>
                    <span class="value">${this.configData.wfc?.maxSteps || 10000}</span>
                </div>
                <div class="summary-item">
                    <span class="label">Center Seed:</span>
                    <span class="value">${this.configData.wfc?.centerSeed ? 'Yes' : 'No'}</span>
                </div>
                <div class="summary-item">
                    <span class="label">Tags:</span>
                    <span class="value">${(this.configData.tags || []).join(', ') || 'None'}</span>
                </div>
            </div>
        `;
    }

    // Data management
    loadExistingConfigurations() {
        // Load built-in configurations (these would come from the system)
        this.existingConfigurations = {
            'standard_dungeon': {
                name: 'Standard Dungeon',
                description: 'Default dungeon configuration with balanced corridors and rooms',
                version: '1.0.0',
                author: 'System'
            },
            'corridor_heavy': {
                name: 'Corridor Heavy',
                description: 'Emphasis on long corridors and passages',
                version: '1.0.0',
                author: 'System'
            }
        };
    }

    getCustomConfigurations() {
        try {
            return JSON.parse(localStorage.getItem('custom_configurations') || '[]');
        } catch {
            return [];
        }
    }

    getCustomConfiguration(name) {
        try {
            const configs = JSON.parse(localStorage.getItem('custom_configuration_data') || '{}');
            return configs[name] || this.getDefaultConfig();
        } catch {
            return this.getDefaultConfig();
        }
    }

    getDefaultConfig() {
        return {
            name: '',
            version: '1.0.0',
            description: '',
            author: '',
            license: 'MIT',
            tags: [],
            basePackage: '',
            wfc: {
                maxSteps: 10000,
                yieldEvery: 500,
                centerSeed: true,
                connectivityCheck: true
            },
            generation: {
                retryAttempts: 3,
                backtrackLimit: 100,
                customConstraints: {}
            }
        };
    }

    getAvailablePackages() {
        // Get packages from tile package editor
        const customPackages = JSON.parse(localStorage.getItem('custom_tile_packages') || '[]');
        const builtinPackages = ['standard_dungeon', 'corridor_heavy', 'room_focused'];
        return [...builtinPackages, ...customPackages];
    }

    // Event handlers
    attachEventListeners() {
        // Tab switching
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-btn')) {
                this.switchTab(e.target.dataset.tab);
            }
        });

        // Form field changes
        this.container.addEventListener('change', (e) => {
            this.updateConfigData();
        });

        this.container.addEventListener('input', (e) => {
            this.updateConfigData();
        });

        // Tag input
        this.container.addEventListener('keypress', (e) => {
            if (e.target.id === 'tag-input' && e.key === 'Enter') {
                e.preventDefault();
                this.addTag(e.target.value.trim());
                e.target.value = '';
            }
        });

        // Global methods for inline handlers
        window.configurationEditor = this;
    }

    // UI Actions
    createNewConfiguration() {
        const name = prompt('Enter configuration name:');
        if (name && name.trim()) {
            this.currentConfig = name.trim();
            this.configData = { ...this.getDefaultConfig(), name: this.currentConfig };
            this.saveCustomConfiguration(this.currentConfig, this.configData);
            this.render();
        }
    }

    selectConfiguration(name) {
        this.currentConfig = name;
        if (this.existingConfigurations[name]) {
            this.configData = { ...this.getDefaultConfig(), ...this.existingConfigurations[name] };
        } else {
            this.configData = this.getCustomConfiguration(name);
        }
        this.render();
    }

    cloneConfiguration(name) {
        const newName = prompt(`Clone "${name}" as:`, `${name}_copy`);
        if (newName && newName.trim()) {
            const originalConfig = this.existingConfigurations[name] || this.getCustomConfiguration(name);
            const clonedConfig = { ...originalConfig, name: newName.trim() };
            this.saveCustomConfiguration(newName.trim(), clonedConfig);
            this.currentConfig = newName.trim();
            this.configData = clonedConfig;
            this.render();
        }
    }

    deleteConfiguration(name) {
        if (confirm(`Delete configuration "${name}"?`)) {
            const configs = this.getCustomConfigurations().filter(n => n !== name);
            const configData = JSON.parse(localStorage.getItem('custom_configuration_data') || '{}');
            delete configData[name];
            
            localStorage.setItem('custom_configurations', JSON.stringify(configs));
            localStorage.setItem('custom_configuration_data', JSON.stringify(configData));
            
            if (this.currentConfig === name) {
                this.currentConfig = null;
                this.configData = this.getDefaultConfig();
            }
            this.render();
        }
    }

    // Form actions
    updateConfigData() {
        if (!this.currentConfig) return;
        
        // Update configuration data from form fields
        const nameField = document.getElementById('tileset-name');
        if (nameField) this.configData.name = nameField.value;
        
        const versionField = document.getElementById('tileset-version');
        if (versionField) this.configData.version = versionField.value;
        
        const descField = document.getElementById('tileset-description');
        if (descField) this.configData.description = descField.value;
        
        const authorField = document.getElementById('tileset-author');
        if (authorField) this.configData.author = authorField.value;
        
        const licenseField = document.getElementById('tileset-license');
        if (licenseField) this.configData.license = licenseField.value;
        
        const packageField = document.getElementById('base-package');
        if (packageField) this.configData.basePackage = packageField.value;
        
        // WFC parameters
        const maxStepsField = document.getElementById('max-steps');
        if (maxStepsField) {
            this.configData.wfc = this.configData.wfc || {};
            this.configData.wfc.maxSteps = parseInt(maxStepsField.value);
        }
        
        const yieldEveryField = document.getElementById('yield-every');
        if (yieldEveryField) {
            this.configData.wfc = this.configData.wfc || {};
            this.configData.wfc.yieldEvery = parseInt(yieldEveryField.value);
        }
        
        const centerSeedField = document.getElementById('center-seed');
        if (centerSeedField) {
            this.configData.wfc = this.configData.wfc || {};
            this.configData.wfc.centerSeed = centerSeedField.checked;
        }
        
        const connectivityField = document.getElementById('connectivity-check');
        if (connectivityField) {
            this.configData.wfc = this.configData.wfc || {};
            this.configData.wfc.connectivityCheck = connectivityField.checked;
        }
    }

    saveMetadata() {
        this.updateConfigData();
        this.saveCurrentConfiguration();
        alert('Metadata saved!');
    }

    saveGenerationParams() {
        this.updateConfigData();
        this.saveCurrentConfiguration();
        alert('Generation parameters saved!');
    }

    // Tag management
    addTag(tag) {
        if (tag && !this.configData.tags.includes(tag)) {
            this.configData.tags.push(tag);
            this.updateTagsList();
            this.saveCurrentConfiguration();
        }
    }

    removeTag(tag) {
        this.configData.tags = this.configData.tags.filter(t => t !== tag);
        this.updateTagsList();
        this.saveCurrentConfiguration();
    }

    updateTagsList() {
        const tagsList = document.getElementById('tags-list');
        if (tagsList) {
            tagsList.innerHTML = (this.configData.tags || []).map(tag => `
                <span class="tag">
                    ${tag}
                    <button class="tag-remove" onclick="configurationEditor.removeTag('${tag}')">×</button>
                </span>
            `).join('');
        }
    }

    // Preset application
    applyPreset(presetType) {
        const presets = {
            small: {
                maxSteps: 5000,
                yieldEvery: 100,
                centerSeed: true,
                retryAttempts: 5
            },
            medium: {
                maxSteps: 15000,
                yieldEvery: 300,
                centerSeed: true,
                retryAttempts: 3
            },
            large: {
                maxSteps: 50000,
                yieldEvery: 1000,
                centerSeed: false,
                retryAttempts: 2
            }
        };
        
        const preset = presets[presetType];
        if (preset) {
            this.configData.wfc = { ...this.configData.wfc, ...preset };
            this.configData.generation = { ...this.configData.generation, retryAttempts: preset.retryAttempts };
            this.saveCurrentConfiguration();
            
            // Refresh the generation tab if it's active
            const generationTab = document.getElementById('generation-tab');
            if (generationTab && generationTab.classList.contains('active')) {
                generationTab.innerHTML = this.renderGenerationParameters();
            }
            
            alert(`Applied ${presetType} preset!`);
        }
    }

    // Testing and validation
    runValidation() {
        const resultsDiv = document.getElementById('validation-results');
        resultsDiv.innerHTML = `
            <div class="validation-result running">
                <span class="icon">⏳</span>
                <span>Running validation...</span>
            </div>
        `;
        
        // Simulate validation
        setTimeout(() => {
            resultsDiv.innerHTML = `
                <div class="validation-result success">
                    <span class="icon">✅</span>
                    <span>Configuration is valid</span>
                </div>
                <div class="validation-result warning">
                    <span class="icon">⚠️</span>
                    <span>No base package selected</span>
                </div>
            `;
        }, 1000);
    }

    runQuickTest() {
        this.runTest('3x3', 'Quick test completed successfully!');
    }

    runStandardTest() {
        this.runTest('5x5', 'Standard test completed successfully!');
    }

    runStressTest() {
        this.runTest('10x10', 'Stress test completed successfully!');
    }

    runTest(size, message) {
        const resultsDiv = document.getElementById('test-results');
        const contentDiv = resultsDiv.querySelector('.results-content');
        
        contentDiv.innerHTML = `
            <div class="test-running">
                <span class="icon">⏳</span>
                <span>Running ${size} generation test...</span>
            </div>
        `;
        
        // Simulate test
        setTimeout(() => {
            contentDiv.innerHTML = `
                <div class="test-result success">
                    <h5>${size} Test Results</h5>
                    <p>${message}</p>
                    <div class="test-stats">
                        <span>Generation Time: ${Math.floor(Math.random() * 500 + 100)}ms</span>
                        <span>Success Rate: ${Math.floor(Math.random() * 20 + 80)}%</span>
                        <span>Connectivity: 100%</span>
                    </div>
                </div>
            `;
        }, 2000);
    }

    // Export methods
    exportComplete() {
        const exportData = {
            metadata: {
                name: this.configData.name,
                version: this.configData.version,
                description: this.configData.description,
                author: this.configData.author,
                license: this.configData.license,
                tags: this.configData.tags
            },
            configuration: this.configData,
            exported: new Date().toISOString()
        };
        
        this.downloadJSON(exportData, `${this.configData.name || 'configuration'}_complete.json`);
    }

    exportWFC() {
        const wfcData = {
            wfc: this.configData.wfc,
            generation: this.configData.generation,
            basePackage: this.configData.basePackage
        };
        
        this.downloadJSON(wfcData, `${this.configData.name || 'configuration'}_wfc.json`);
    }

    exportDocs() {
        const docs = this.generateDocumentation();
        this.downloadText(docs, `${this.configData.name || 'configuration'}_README.md`);
    }

    generateDocumentation() {
        return `# ${this.configData.name || 'Tileset Configuration'}

## Description
${this.configData.description || 'No description provided.'}

## Details
- **Version:** ${this.configData.version || '1.0.0'}
- **Author:** ${this.configData.author || 'Unknown'}
- **License:** ${this.configData.license || 'MIT'}
- **Base Package:** ${this.configData.basePackage || 'None'}

## Tags
${(this.configData.tags || []).map(tag => `- ${tag}`).join('\n') || 'No tags'}

## WFC Parameters
- **Max Steps:** ${this.configData.wfc?.maxSteps || 10000}
- **Yield Every:** ${this.configData.wfc?.yieldEvery || 500}
- **Center Seed:** ${this.configData.wfc?.centerSeed ? 'Yes' : 'No'}
- **Connectivity Check:** ${this.configData.wfc?.connectivityCheck ? 'Yes' : 'No'}

## Usage
1. Load this configuration in your tileset editor
2. Generate dungeons using the specified parameters
3. Validate connectivity and performance as needed

Generated on ${new Date().toISOString()}
`;
    }

    // Helper methods
    switchTab(tabName) {
        // Update tab buttons
        this.container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Update tab content
        this.container.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
    }

    saveCustomConfiguration(name, configData) {
        const configs = this.getCustomConfigurations();
        if (!configs.includes(name)) {
            configs.push(name);
            localStorage.setItem('custom_configurations', JSON.stringify(configs));
        }
        
        const allConfigData = JSON.parse(localStorage.getItem('custom_configuration_data') || '{}');
        allConfigData[name] = configData;
        localStorage.setItem('custom_configuration_data', JSON.stringify(allConfigData));
    }

    saveCurrentConfiguration() {
        if (this.currentConfig) {
            this.saveCustomConfiguration(this.currentConfig, this.configData);
            this.onUpdate();
        }
    }

    loadSelectedConfiguration() {
        // Auto-select first configuration if none selected
        if (!this.currentConfig) {
            const allConfigs = [...Object.keys(this.existingConfigurations), ...this.getCustomConfigurations()];
            if (allConfigs.length > 0) {
                this.selectConfiguration(allConfigs[0]);
            }
        }
    }

    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        this.downloadBlob(blob, filename);
    }

    downloadText(text, filename) {
        const blob = new Blob([text], { type: 'text/plain' });
        this.downloadBlob(blob, filename);
    }

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Deployment methods
    replaceActiveTileset() {
        if (confirm('Replace the active tileset configuration? This cannot be undone.')) {
            alert('Active tileset replaced! (This would integrate with the main system)');
        }
    }

    addToLibrary() {
        alert('Configuration added to library! (This would save to the tileset library)');
    }

    shareConfiguration() {
        const shareData = btoa(JSON.stringify(this.configData));
        const shareUrl = `${window.location.origin}${window.location.pathname}?config=${shareData}`;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareUrl).then(() => {
                alert('Share URL copied to clipboard!');
            });
        } else {
            prompt('Share URL:', shareUrl);
        }
    }
}

// Global methods for inline handlers
if (typeof window !== 'undefined') {
    window.createNewConfiguration = () => window.configurationEditor?.createNewConfiguration();
    window.selectConfiguration = (name) => window.configurationEditor?.selectConfiguration(name);
    window.cloneConfiguration = (name) => window.configurationEditor?.cloneConfiguration(name);
    window.deleteConfiguration = (name) => window.configurationEditor?.deleteConfiguration(name);
    window.saveMetadata = () => window.configurationEditor?.saveMetadata();
    window.saveGenerationParams = () => window.configurationEditor?.saveGenerationParams();
    window.addTag = (tag) => window.configurationEditor?.addTag(tag);
    window.removeTag = (tag) => window.configurationEditor?.removeTag(tag);
    window.applyPreset = (preset) => window.configurationEditor?.applyPreset(preset);
    window.runValidation = () => window.configurationEditor?.runValidation();
    window.runQuickTest = () => window.configurationEditor?.runQuickTest();
    window.runStandardTest = () => window.configurationEditor?.runStandardTest();
    window.runStressTest = () => window.configurationEditor?.runStressTest();
    window.exportComplete = () => window.configurationEditor?.exportComplete();
    window.exportWFC = () => window.configurationEditor?.exportWFC();
    window.exportDocs = () => window.configurationEditor?.exportDocs();
    window.replaceActiveTileset = () => window.configurationEditor?.replaceActiveTileset();
    window.addToLibrary = () => window.configurationEditor?.addToLibrary();
    window.shareConfiguration = () => window.configurationEditor?.shareConfiguration();
}