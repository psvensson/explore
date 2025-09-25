/**
 * ConfigurationPanel - Manages tileset configuration metadata and global settings
 * 
 * Handles the configuration name, description, global settings, and 
 * configuration management operations (save, load, clone, delete).
 */

import { UIUtils } from './ui_utils.js';
import { TilesetConfigManager } from './tileset_config_manager.js';

export class ConfigurationPanel {
    constructor(container, options = {}) {
        this.container = container;
        this.configManager = options.configManager || new TilesetConfigManager();
        this.currentConfig = options.currentConfig || this.createDefaultConfig();
        this.onConfigChange = options.onConfigChange || (() => {});
        this.onConfigLoad = options.onConfigLoad || (() => {});
        
        this.render();
        this.bindEvents();
        this.loadSavedConfigurations();
    }

    createDefaultConfig() {
        return {
            name: 'Custom Configuration',
            description: '',
            tiles: [],
            globalSettings: {
                centerSeed: true,
                maxSteps: 5000,
                timeout: 60000
            }
        };
    }

    render() {
        this.container.innerHTML = `
            <div class="configuration-panel">
                <!-- Header Actions -->
                <div class="config-header">
                    <h3>Configuration Management</h3>
                    <div class="config-actions">
                        <button id="new-config" class="btn btn-primary">New Config</button>
                        <button id="save-config" class="btn btn-success">Save</button>
                        <button id="test-generation" class="btn btn-info">Test Generation</button>
                        <button id="clear-config" class="btn btn-warning">Clear</button>
                    </div>
                </div>

                <!-- Configuration List -->
                <div class="config-list">
                    <h4>Saved Configurations</h4>
                    <div class="config-selector-group">
                        <select id="config-selector" class="form-control">
                            <option value="">Select a configuration...</option>
                        </select>
                        <div class="config-actions">
                            <button id="load-config" class="btn btn-info">Load</button>
                            <button id="clone-config" class="btn btn-warning">Clone</button>
                            <button id="delete-config" class="btn btn-danger">Delete</button>
                        </div>
                    </div>
                    <div id="config-summary" class="config-summary"></div>
                </div>

                <!-- Configuration Details -->
                <div class="config-details">
                    <div class="form-group">
                        <label for="config-name">Configuration Name:</label>
                        <input type="text" id="config-name" class="form-control" 
                               value="${this.currentConfig.name}">
                    </div>
                    
                    <div class="form-group">
                        <label for="config-description">Description:</label>
                        <textarea id="config-description" class="form-control" rows="3"
                                  placeholder="Describe this tileset configuration...">${this.currentConfig.description}</textarea>
                    </div>
                    
                    <!-- Global Settings -->
                    <div class="global-settings">
                        <h4>Global Settings</h4>
                        
                        <div class="form-group">
                            <div class="form-check">
                                <input type="checkbox" id="center-seed" class="form-check-input" 
                                       ${this.currentConfig.globalSettings.centerSeed ? 'checked' : ''}>
                                <label for="center-seed" class="form-check-label">Center Seed</label>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="max-steps">Max Steps:</label>
                            <input type="number" id="max-steps" class="form-control" 
                                   value="${this.currentConfig.globalSettings.maxSteps}" 
                                   min="100" max="50000" step="100">
                        </div>
                        
                        <div class="form-group">
                            <label for="timeout">Timeout (ms):</label>
                            <input type="number" id="timeout" class="form-control" 
                                   value="${this.currentConfig.globalSettings.timeout}" 
                                   min="5000" max="300000" step="1000">
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Configuration management buttons
        UIUtils.getElementById('new-config')?.addEventListener('click', () => this.newConfiguration());
        UIUtils.getElementById('save-config')?.addEventListener('click', () => this.saveConfiguration());
        UIUtils.getElementById('load-config')?.addEventListener('click', () => this.loadConfiguration());
        UIUtils.getElementById('clone-config')?.addEventListener('click', () => this.cloneConfiguration());
        UIUtils.getElementById('delete-config')?.addEventListener('click', () => this.deleteConfiguration());
        UIUtils.getElementById('test-generation')?.addEventListener('click', () => this.testGeneration());
        UIUtils.getElementById('clear-config')?.addEventListener('click', () => this.clearConfiguration());

        // Configuration selector
        UIUtils.getElementById('config-selector')?.addEventListener('change', () => this.showConfigurationSummary());

        // Form field change handlers
        UIUtils.getElementById('config-name')?.addEventListener('input', (e) => {
            this.currentConfig.name = e.target.value;
            this.onConfigChange(this.currentConfig);
        });

        UIUtils.getElementById('config-description')?.addEventListener('input', (e) => {
            this.currentConfig.description = e.target.value;
            this.onConfigChange(this.currentConfig);
        });

        UIUtils.getElementById('center-seed')?.addEventListener('change', (e) => {
            this.currentConfig.globalSettings.centerSeed = e.target.checked;
            this.onConfigChange(this.currentConfig);
        });

        UIUtils.getElementById('max-steps')?.addEventListener('input', (e) => {
            this.currentConfig.globalSettings.maxSteps = parseInt(e.target.value) || 5000;
            this.onConfigChange(this.currentConfig);
        });

        UIUtils.getElementById('timeout')?.addEventListener('input', (e) => {
            this.currentConfig.globalSettings.timeout = parseInt(e.target.value) || 60000;
            this.onConfigChange(this.currentConfig);
        });
    }

    loadSavedConfigurations() {
        const selector = UIUtils.getElementById('config-selector');
        if (!selector) return;

        const configs = this.configManager.getAllConfigurations();
        selector.innerHTML = '<option value="">Select a configuration...</option>';
        
        Object.keys(configs).forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            selector.appendChild(option);
        });
    }

    showConfigurationSummary() {
        const selector = UIUtils.getElementById('config-selector');
        const summaryDiv = UIUtils.getElementById('config-summary');
        
        if (!selector || !summaryDiv) return;

        const configName = selector.value;
        if (!configName) {
            summaryDiv.innerHTML = '';
            return;
        }

        const config = this.configManager.getConfiguration(configName);
        if (!config) {
            summaryDiv.innerHTML = '<p>Configuration not found.</p>';
            return;
        }

        const tileCount = config.tiles ? config.tiles.length : 0;
        summaryDiv.innerHTML = `
            <div class="config-preview">
                <h5>${config.name}</h5>
                <p><strong>Description:</strong> ${config.description || 'No description'}</p>
                <p><strong>Tiles:</strong> ${tileCount}</p>
                <p><strong>Settings:</strong> Max Steps: ${config.globalSettings?.maxSteps || 5000}, 
                   Timeout: ${config.globalSettings?.timeout || 60000}ms</p>
            </div>
        `;
    }

    newConfiguration() {
        if (this.hasUnsavedChanges()) {
            if (!confirm('You have unsaved changes. Are you sure you want to create a new configuration?')) {
                return;
            }
        }

        this.currentConfig = this.createDefaultConfig();
        this.updateFormFields();
        this.onConfigChange(this.currentConfig);
        UIUtils.showAlert('New configuration created', 'success');
    }

    saveConfiguration() {
        const name = this.currentConfig.name?.trim();
        if (!name) {
            UIUtils.showAlert('Please enter a configuration name', 'warning');
            return;
        }

        try {
            this.configManager.saveConfiguration(name, this.currentConfig);
            this.loadSavedConfigurations();
            UIUtils.showAlert(`Configuration "${name}" saved successfully`, 'success');
        } catch (error) {
            UIUtils.showAlert(`Failed to save configuration: ${error.message}`, 'danger');
        }
    }

    loadConfiguration() {
        const selector = UIUtils.getElementById('config-selector');
        const configName = selector?.value;
        
        if (!configName) {
            UIUtils.showAlert('Please select a configuration to load', 'warning');
            return;
        }

        if (this.hasUnsavedChanges()) {
            if (!confirm('You have unsaved changes. Are you sure you want to load a different configuration?')) {
                return;
            }
        }

        try {
            const config = this.configManager.getConfiguration(configName);
            if (!config) {
                UIUtils.showAlert('Configuration not found', 'danger');
                return;
            }

            this.currentConfig = { ...config };
            this.updateFormFields();
            this.onConfigLoad(this.currentConfig);
            UIUtils.showAlert(`Configuration "${configName}" loaded successfully`, 'success');
        } catch (error) {
            UIUtils.showAlert(`Failed to load configuration: ${error.message}`, 'danger');
        }
    }

    cloneConfiguration() {
        const selector = UIUtils.getElementById('config-selector');
        const configName = selector?.value;
        
        if (!configName) {
            UIUtils.showAlert('Please select a configuration to clone', 'warning');
            return;
        }

        try {
            const config = this.configManager.getConfiguration(configName);
            if (!config) {
                UIUtils.showAlert('Configuration not found', 'danger');
                return;
            }

            // Create a copy with a new name
            const clonedConfig = { ...config };
            clonedConfig.name = `${config.name} (Copy)`;
            
            this.currentConfig = clonedConfig;
            this.updateFormFields();
            this.onConfigChange(this.currentConfig);
            UIUtils.showAlert(`Configuration cloned as "${clonedConfig.name}"`, 'success');
        } catch (error) {
            UIUtils.showAlert(`Failed to clone configuration: ${error.message}`, 'danger');
        }
    }

    deleteConfiguration() {
        const selector = UIUtils.getElementById('config-selector');
        const configName = selector?.value;
        
        if (!configName) {
            UIUtils.showAlert('Please select a configuration to delete', 'warning');
            return;
        }

        if (!confirm(`Are you sure you want to delete the configuration "${configName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            this.configManager.deleteConfiguration(configName);
            this.loadSavedConfigurations();
            UIUtils.getElementById('config-summary').innerHTML = '';
            UIUtils.showAlert(`Configuration "${configName}" deleted successfully`, 'success');
        } catch (error) {
            UIUtils.showAlert(`Failed to delete configuration: ${error.message}`, 'danger');
        }
    }

    testGeneration() {
        if (!this.validateConfiguration()) {
            UIUtils.showAlert('Configuration validation failed', 'danger');
            return;
        }

        // Emit event for parent to handle generation test
        this.onConfigChange(this.currentConfig, 'test-generation');
        UIUtils.showAlert('Testing generation with current configuration...', 'info');
    }

    clearConfiguration() {
        if (!confirm('Are you sure you want to clear the current configuration? This will remove all tiles and reset settings.')) {
            return;
        }

        this.currentConfig = this.createDefaultConfig();
        this.updateFormFields();
        this.onConfigChange(this.currentConfig);
        UIUtils.showAlert('Configuration cleared', 'success');
    }

    validateConfiguration() {
        const validators = {
            'config-name': (value) => {
                if (!value.trim()) return 'Configuration name is required';
                if (value.length < 3) return 'Configuration name must be at least 3 characters';
                return true;
            },
            'max-steps': (value) => {
                const num = parseInt(value);
                if (isNaN(num) || num < 100) return 'Max steps must be at least 100';
                if (num > 50000) return 'Max steps cannot exceed 50000';
                return true;
            },
            'timeout': (value) => {
                const num = parseInt(value);
                if (isNaN(num) || num < 5000) return 'Timeout must be at least 5000ms';
                if (num > 300000) return 'Timeout cannot exceed 300000ms (5 minutes)';
                return true;
            }
        };

        return UIUtils.validateForm(validators);
    }

    hasUnsavedChanges() {
        // Simple check - in a real app, you'd compare with last saved state
        const configName = this.currentConfig.name?.trim();
        if (!configName) return false;
        
        const saved = this.configManager.getConfiguration(configName);
        return !saved || JSON.stringify(saved) !== JSON.stringify(this.currentConfig);
    }

    updateFormFields() {
        const nameField = UIUtils.getElementById('config-name');
        const descField = UIUtils.getElementById('config-description');
        const centerSeedField = UIUtils.getElementById('center-seed');
        const maxStepsField = UIUtils.getElementById('max-steps');
        const timeoutField = UIUtils.getElementById('timeout');

        if (nameField) nameField.value = this.currentConfig.name || '';
        if (descField) descField.value = this.currentConfig.description || '';
        if (centerSeedField) centerSeedField.checked = this.currentConfig.globalSettings?.centerSeed || false;
        if (maxStepsField) maxStepsField.value = this.currentConfig.globalSettings?.maxSteps || 5000;
        if (timeoutField) timeoutField.value = this.currentConfig.globalSettings?.timeout || 60000;
    }

    // Update the current configuration
    setConfiguration(config) {
        this.currentConfig = config;
        this.updateFormFields();
    }

    // Get the current configuration
    getConfiguration() {
        return this.currentConfig;
    }
}