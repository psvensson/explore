/**
 * TilesetConfigManager - Manages saved tileset configurations
 * 
 * Handles localStorage persistence, import/export, and configuration management
 * for the tileset editor UI.
 */

export class TilesetConfigManager {
    constructor() {
        this.storageKey = 'explore_tileset_configs';
        this.currentConfig = null;
    }

    /**
     * Load all saved configurations from localStorage
     */
    loadConfigurations() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Failed to load configurations:', error);
            return {};
        }
    }

    /**
     * Save configuration to localStorage
     */
    saveConfiguration(name, config) {
        const configs = this.loadConfigurations();
        configs[name] = {
            ...config,
            lastModified: new Date().toISOString(),
            version: '1.0'
        };
        
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(configs));
            return true;
        } catch (error) {
            console.error('Failed to save configuration:', error);
            return false;
        }
    }

    /**
     * Delete configuration
     */
    deleteConfiguration(name) {
        const configs = this.loadConfigurations();
        if (configs[name]) {
            delete configs[name];
            localStorage.setItem(this.storageKey, JSON.stringify(configs));
            return true;
        }
        return false;
    }

    /**
     * Export configuration as JSON file
     */
    exportConfiguration(name) {
        const configs = this.loadConfigurations();
        const config = configs[name];
        if (!config) throw new Error(`Configuration '${name}' not found`);

        // Add export metadata
        const exportData = {
            ...config,
            exportedAt: new Date().toISOString(),
            exportedBy: 'Explore Dungeon Generator'
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `${name.replace(/[^a-z0-9]/gi, '_')}_tileset_config.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }

    /**
     * Import configuration from JSON file
     */
    async importConfiguration(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const config = JSON.parse(e.target.result);
                    
                    // Basic validation
                    if (!config.name || !config.tiles || !Array.isArray(config.tiles)) {
                        throw new Error('Invalid configuration format');
                    }
                    
                    resolve(config);
                } catch (error) {
                    reject(new Error('Invalid JSON file: ' + error.message));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /**
     * Validate configuration structure
     */
    validateConfiguration(config) {
        const errors = [];
        
        if (!config.name || typeof config.name !== 'string') {
            errors.push('Configuration must have a name');
        }
        
        if (!config.tiles || !Array.isArray(config.tiles)) {
            errors.push('Configuration must have a tiles array');
        } else {
            config.tiles.forEach((tile, index) => {
                if (!tile.tileId || typeof tile.tileId !== 'number') {
                    errors.push(`Tile ${index}: missing or invalid tileId`);
                }
                if (!tile.structure_name || typeof tile.structure_name !== 'string') {
                    errors.push(`Tile ${index}: missing or invalid structure_name`);
                }
                if (tile.custom_weight !== undefined && 
                    (typeof tile.custom_weight !== 'number' || tile.custom_weight < 0)) {
                    errors.push(`Tile ${index}: invalid custom_weight`);
                }
            });
        }
        
        if (!config.globalSettings || typeof config.globalSettings !== 'object') {
            errors.push('Configuration must have globalSettings object');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * List all configurations with their metadata
     */
    listConfigs() {
        const configs = this.loadConfigurations();
        return Object.entries(configs)
            .sort(([,a], [,b]) => new Date(b.lastModified) - new Date(a.lastModified))
            .map(([name, config]) => ({
                name,
                description: config.description || '',
                tileCount: config.tiles ? config.tiles.length : 0,
                lastModified: config.lastModified,
                version: config.version || '1.0'
            }));
    }

    /**
     * Get configuration names sorted by last modified
     */
    getConfigurationNames() {
        const configs = this.loadConfigurations();
        return Object.entries(configs)
            .sort(([,a], [,b]) => new Date(b.lastModified) - new Date(a.lastModified))
            .map(([name]) => name);
    }

    /**
     * Get configuration summary for display
     */
    getConfigurationSummary(name) {
        const configs = this.loadConfigurations();
        const config = configs[name];
        if (!config) return null;

        return {
            name: config.name,
            description: config.description || '',
            tileCount: config.tiles ? config.tiles.length : 0,
            lastModified: config.lastModified,
            version: config.version || '1.0'
        };
    }

    /**
     * Clone configuration with new name
     */
    cloneConfiguration(sourceName, newName) {
        const configs = this.loadConfigurations();
        const sourceConfig = configs[sourceName];
        if (!sourceConfig) {
            throw new Error(`Source configuration '${sourceName}' not found`);
        }

        const clonedConfig = {
            ...sourceConfig,
            name: newName,
            description: (sourceConfig.description || '') + ' (Copy)'
        };

        return this.saveConfiguration(newName, clonedConfig);
    }
}