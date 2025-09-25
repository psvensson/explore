/**
 * ImportExportManager - Handles JSON import/export functionality
 * 
 * Provides reusable functionality for importing and exporting configurations,
 * with validation and error handling.
 */

import { UIUtils } from './ui_utils.js';
import { TilesetConfigManager } from './tileset_config_manager.js';

export class ImportExportManager {
    constructor(options = {}) {
        this.configManager = options.configManager || new TilesetConfigManager();
        this.onConfigImport = options.onConfigImport || (() => {});
        this.onConfigExport = options.onConfigExport || (() => {});
        this.validator = options.validator || this.configManager.validateConfiguration.bind(this.configManager);
    }

    /**
     * Create import/export UI elements
     * @param {HTMLElement} container - Container to append UI to
     * @return {Object} Object with import and export elements
     */
    createUI(container) {
        const wrapper = document.createElement('div');
        wrapper.className = 'import-export-controls';
        wrapper.innerHTML = `
            <div class="import-export-section">
                <h4>Import/Export</h4>
                <div class="form-row">
                    <div class="col-md-6">
                        <input type="file" id="import-config" accept=".json" style="display: none;">
                        <button id="import-btn" class="btn btn-secondary btn-block">
                            📁 Import JSON
                        </button>
                    </div>
                    <div class="col-md-6">
                        <button id="export-config" class="btn btn-secondary btn-block">
                            💾 Export JSON
                        </button>
                    </div>
                </div>
                <div class="import-export-info">
                    <small class="text-muted">
                        Import/export tileset configurations as JSON files for backup or sharing.
                    </small>
                </div>
            </div>
        `;

        container.appendChild(wrapper);

        // Get elements
        const importInput = wrapper.querySelector('#import-config');
        const importBtn = wrapper.querySelector('#import-btn');
        const exportBtn = wrapper.querySelector('#export-config');

        // Bind events
        if (importBtn && importInput) {
            importBtn.onclick = () => importInput.click();
            importInput.onchange = (event) => this.importConfiguration(event);
        }

        if (exportBtn) {
            exportBtn.onclick = () => this.exportConfiguration();
        }

        return {
            wrapper,
            importInput,
            importBtn,
            exportBtn
        };
    }

    /**
     * Export a configuration to JSON file
     * @param {Object} config - Configuration to export
     * @param {string} filename - Optional filename (defaults to config name)
     */
    exportConfiguration(config = null, filename = null) {
        if (!config) {
            // If no config provided, trigger callback to get current config
            const result = this.onConfigExport('get-config');
            if (!result || !result.config) {
                UIUtils.showAlert('No configuration available to export', 'warning');
                return;
            }
            config = result.config;
        }

        if (!config.name || !config.name.trim()) {
            UIUtils.showAlert('Please enter a configuration name before exporting', 'warning');
            return;
        }

        try {
            // Validate configuration before export
            if (!this.validator(config)) {
                throw new Error('Configuration validation failed');
            }

            // Use configManager's export functionality
            this.configManager.exportConfiguration(config.name, config, filename);
            
            // Trigger callback
            this.onConfigExport('export-success', { config, filename });
            
            UIUtils.showAlert(`Configuration "${config.name}" exported successfully`, 'success');
        } catch (error) {
            UIUtils.showAlert(`Failed to export configuration: ${error.message}`, 'danger');
            this.onConfigExport('export-error', { error, config });
        }
    }

    /**
     * Import a configuration from JSON file
     * @param {Event} event - File input change event
     */
    importConfiguration(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Check file type
        if (!file.name.toLowerCase().endsWith('.json')) {
            UIUtils.showAlert('Please select a JSON file', 'warning');
            event.target.value = '';
            return;
        }

        // Check file size (limit to 10MB)
        if (file.size > 10 * 1024 * 1024) {
            UIUtils.showAlert('File is too large. Maximum size is 10MB.', 'warning');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const config = JSON.parse(e.target.result);
                
                // Validate configuration
                if (!this.validator(config)) {
                    throw new Error('Invalid configuration format. Please check the JSON structure.');
                }

                // Additional validation
                this.validateImportedConfig(config);
                
                // Trigger callback with imported config
                this.onConfigImport('import-success', { config, filename: file.name });
                
                UIUtils.showAlert(`Configuration "${config.name}" imported successfully`, 'success');
            } catch (error) {
                UIUtils.showAlert(`Failed to import configuration: ${error.message}`, 'danger');
                this.onConfigImport('import-error', { error, filename: file.name });
            }
        };

        reader.onerror = () => {
            UIUtils.showAlert('Failed to read file', 'danger');
            this.onConfigImport('import-error', { error: new Error('File read error'), filename: file.name });
        };

        reader.readAsText(file);
        
        // Clear the input
        event.target.value = '';
    }

    /**
     * Validate imported configuration beyond basic structure
     * @param {Object} config - Configuration to validate
     * @throws {Error} If validation fails
     */
    validateImportedConfig(config) {
        // Check required fields
        if (!config.name || typeof config.name !== 'string') {
            throw new Error('Configuration must have a valid name');
        }

        if (!Array.isArray(config.tiles)) {
            throw new Error('Configuration must have a tiles array');
        }

        // Validate tiles
        config.tiles.forEach((tile, index) => {
            if (!tile.tileId || typeof tile.tileId !== 'number') {
                throw new Error(`Tile ${index + 1} has invalid tileId`);
            }

            if (!tile.structure_name || typeof tile.structure_name !== 'string') {
                throw new Error(`Tile ${index + 1} has invalid structure_name`);
            }

            // Check for duplicate tile IDs within the configuration
            const duplicates = config.tiles.filter(t => t.tileId === tile.tileId);
            if (duplicates.length > 1) {
                throw new Error(`Duplicate tile ID ${tile.tileId} found in configuration`);
            }
        });

        // Validate global settings
        if (config.globalSettings) {
            const settings = config.globalSettings;
            
            if (settings.maxSteps !== undefined) {
                if (!Number.isInteger(settings.maxSteps) || settings.maxSteps < 100 || settings.maxSteps > 50000) {
                    throw new Error('Global setting maxSteps must be an integer between 100 and 50000');
                }
            }

            if (settings.timeout !== undefined) {
                if (!Number.isInteger(settings.timeout) || settings.timeout < 5000 || settings.timeout > 300000) {
                    throw new Error('Global setting timeout must be an integer between 5000 and 300000');
                }
            }

            if (settings.centerSeed !== undefined && typeof settings.centerSeed !== 'boolean') {
                throw new Error('Global setting centerSeed must be a boolean');
            }
        }
    }

    /**
     * Bulk export multiple configurations
     * @param {Object} configs - Object with configuration names as keys
     * @param {string} archiveName - Name for the archive file
     */
    exportMultipleConfigurations(configs, archiveName = 'tileset_configurations') {
        try {
            const exportData = {
                exportDate: new Date().toISOString(),
                version: '1.0',
                configurations: configs
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `${archiveName}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            UIUtils.showAlert(`${Object.keys(configs).length} configurations exported successfully`, 'success');
        } catch (error) {
            UIUtils.showAlert(`Failed to export configurations: ${error.message}`, 'danger');
        }
    }

    /**
     * Import multiple configurations from bulk export
     * @param {Event} event - File input change event
     * @param {Function} onConfigsImported - Callback when configs are imported
     */
    importMultipleConfigurations(event, onConfigsImported) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // Check if it's a bulk export format
                if (data.configurations && typeof data.configurations === 'object') {
                    const configs = data.configurations;
                    const configNames = Object.keys(configs);
                    
                    // Validate each configuration
                    configNames.forEach(name => {
                        this.validateImportedConfig(configs[name]);
                    });
                    
                    // Import all configurations
                    let importedCount = 0;
                    configNames.forEach(name => {
                        try {
                            this.configManager.saveConfiguration(name, configs[name]);
                            importedCount++;
                        } catch (error) {
                            console.warn(`Failed to import configuration "${name}":`, error);
                        }
                    });
                    
                    if (onConfigsImported) {
                        onConfigsImported(configs, importedCount);
                    }
                    
                    UIUtils.showAlert(`Imported ${importedCount} of ${configNames.length} configurations`, 'success');
                } else {
                    // Single configuration format
                    this.importConfiguration(event);
                }
            } catch (error) {
                UIUtils.showAlert(`Failed to import configurations: ${error.message}`, 'danger');
            }
        };
        
        reader.readAsText(file);
        event.target.value = '';
    }

    /**
     * Create a configuration backup
     * @param {Object} config - Configuration to backup
     * @return {string} Backup data as JSON string
     */
    createBackup(config) {
        const backup = {
            timestamp: new Date().toISOString(),
            version: '1.0',
            config: config
        };
        
        return JSON.stringify(backup, null, 2);
    }

    /**
     * Restore configuration from backup
     * @param {string} backupData - JSON backup data
     * @return {Object} Restored configuration
     */
    restoreFromBackup(backupData) {
        try {
            const backup = JSON.parse(backupData);
            
            if (!backup.config) {
                throw new Error('Invalid backup format');
            }
            
            this.validateImportedConfig(backup.config);
            return backup.config;
        } catch (error) {
            throw new Error(`Failed to restore backup: ${error.message}`);
        }
    }
}