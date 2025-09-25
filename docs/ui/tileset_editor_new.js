/**
 * TilesetEditor - Main coordinator for tileset configuration editing
 * 
 * Coordinates multiple components to provide a complete tileset editing interface.
 * Acts as a controller that delegates functionality to specialized components.
 */

import { UIUtils } from './ui_utils.js';
import { ConfigurationPanel } from './configuration_panel.js';
import { TileEditor } from './tile_editor.js';
import { ImportExportManager } from './import_export_manager.js';
import { TilesetRenderer } from './tileset_renderer.js';
import { TilesetConfigManager } from './tileset_config_manager.js';
import { PackageResolver } from '../dungeon/package_resolver.js';

export class TilesetEditor {
    constructor(container) {
        this.container = container;
        this.configManager = new TilesetConfigManager();
        this.packageResolver = new PackageResolver();
        this.currentConfig = this.createDefaultConfig();
        this.nextTileId = 300; // Start custom tiles at 300
        
        this.initializeComponents();
        this.initializeUI();
        this.bindComponentEvents();
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

    initializeComponents() {
        // Create component containers
        this.components = {
            configPanel: null,
            tileEditor: null,
            importExport: null,
            renderer: null
        };
    }

    initializeUI() {
        // First, force the container style
        this.container.style.backgroundColor = '#0b1522';
        this.container.style.color = '#cfe6ff';
        
        this.container.innerHTML = `
            <div class="tileset-editor" style="background-color: #0b1522 !important; color: #cfe6ff !important;">
                <!-- Header -->
                <div class="editor-header">
                    <h2>Tileset Configuration Editor</h2>
                    <div class="editor-actions" id="import-export-container">
                        <!-- Import/Export controls will be added here -->
                    </div>
                </div>

                <!-- Main Content Grid -->
                <div class="editor-grid">
                    <!-- Configuration Panel -->
                    <div class="config-section" id="config-panel-container">
                        <!-- Configuration panel will be rendered here -->
                    </div>

                    <!-- Tile Editor -->
                    <div class="tile-editor-section" id="tile-editor-container">
                        <!-- Tile editor will be rendered here -->
                    </div>

                    <!-- Tileset Renderer -->
                    <div class="renderer-section" id="renderer-container">
                        <!-- Tileset renderer will be rendered here -->
                    </div>
                </div>
            </div>
        `;

        this.createComponents();
    }

    createComponents() {
        // Configuration Panel
        const configContainer = UIUtils.getElementById('config-panel-container');
        if (configContainer) {
            this.components.configPanel = new ConfigurationPanel(configContainer, {
                configManager: this.configManager,
                currentConfig: this.currentConfig,
                onConfigChange: (config, action) => this.handleConfigChange(config, action),
                onConfigLoad: (config) => this.handleConfigLoad(config)
            });
        }

        // Tile Editor
        const tileEditorContainer = UIUtils.getElementById('tile-editor-container');
        if (tileEditorContainer) {
            this.components.tileEditor = new TileEditor(tileEditorContainer, {
                currentConfig: this.currentConfig,
                nextTileId: this.nextTileId,
                onTileAdd: (tile) => this.handleTileAdd(tile),
                onTileRemove: (tile, index) => this.handleTileRemove(tile, index),
                onTileChange: () => this.handleTileChange()
            });
        }

        // Import/Export Manager
        const importExportContainer = UIUtils.getElementById('import-export-container');
        if (importExportContainer) {
            this.components.importExport = new ImportExportManager({
                configManager: this.configManager,
                onConfigImport: (action, data) => this.handleConfigImport(action, data),
                onConfigExport: (action, data) => this.handleConfigExport(action, data)
            });
            
            this.components.importExport.createUI(importExportContainer);
        }

        // Tileset Renderer
        const rendererContainer = UIUtils.getElementById('renderer-container');
        if (rendererContainer) {
            this.components.renderer = new TilesetRenderer(rendererContainer, {
                packageResolver: this.packageResolver,
                currentConfig: this.currentConfig,
                onTileRemove: (index) => this.handleRendererTileRemove(index),
                onTileEdit: (index) => this.handleTileEdit(index)
            });
            
            // Expose renderer globally for onclick handlers
            this.components.renderer.exposeGlobally();
        }
    }

    bindComponentEvents() {
        // Additional cross-component event binding can be done here
        // Most events are handled through the callback system
    }

    // Event Handlers

    handleConfigChange(config, action) {
        this.currentConfig = config;
        
        // Update all components with new config
        this.components.tileEditor?.setConfiguration(this.currentConfig);
        this.components.renderer?.setConfiguration(this.currentConfig);
        
        if (action === 'test-generation') {
            this.testGeneration();
        }
    }

    handleConfigLoad(config) {
        this.currentConfig = config;
        
        // Update all components
        this.components.tileEditor?.setConfiguration(this.currentConfig);
        this.components.renderer?.setConfiguration(this.currentConfig);
        
        // Update next tile ID
        if (this.currentConfig.tiles.length > 0) {
            const maxId = Math.max(...this.currentConfig.tiles.map(t => t.tileId));
            this.nextTileId = maxId + 1;
            this.components.tileEditor?.setNextTileId(this.nextTileId);
        }
    }

    handleTileAdd(tile) {
        // Update next tile ID
        this.nextTileId = Math.max(this.nextTileId + 1, tile.tileId + 1);
        this.components.tileEditor?.setNextTileId(this.nextTileId);
        
        // Update renderer
        this.components.renderer?.setConfiguration(this.currentConfig);
    }

    handleTileRemove(tile, index) {
        // Update renderer
        this.components.renderer?.setConfiguration(this.currentConfig);
    }

    handleTileChange() {
        // Update renderer when tiles change
        this.components.renderer?.setConfiguration(this.currentConfig);
    }

    handleRendererTileRemove(index) {
        if (index >= 0 && index < this.currentConfig.tiles.length) {
            this.currentConfig.tiles.splice(index, 1);
            
            // Update components
            this.components.tileEditor?.setConfiguration(this.currentConfig);
            this.components.renderer?.setConfiguration(this.currentConfig);
            
            UIUtils.showAlert('Tile removed', 'info');
        }
    }

    handleTileEdit(index) {
        // For now, just show an alert. In the future, this could open an edit modal
        UIUtils.showAlert('Tile editing not yet implemented', 'info');
    }

    handleConfigImport(action, data) {
        if (action === 'import-success') {
            this.currentConfig = data.config;
            
            // Update all components
            this.components.configPanel?.setConfiguration(this.currentConfig);
            this.components.tileEditor?.setConfiguration(this.currentConfig);
            this.components.renderer?.setConfiguration(this.currentConfig);
            
            // Update next tile ID
            if (this.currentConfig.tiles.length > 0) {
                const maxId = Math.max(...this.currentConfig.tiles.map(t => t.tileId));
                this.nextTileId = maxId + 1;
                this.components.tileEditor?.setNextTileId(this.nextTileId);
            }
        }
    }

    handleConfigExport(action, data) {
        if (action === 'get-config') {
            return { config: this.currentConfig };
        }
        // Other export actions are handled by the ImportExportManager
    }

    // Public API Methods

    testGeneration() {
        if (!this.validateConfiguration()) {
            UIUtils.showAlert('Configuration validation failed', 'danger');
            return;
        }

        try {
            // Resolve the configuration to test it
            const resolved = this.packageResolver.resolveCustomConfig(this.currentConfig);
            const stats = this.packageResolver.getStats(resolved);
            
            UIUtils.showAlert(
                `Generation test successful! Configuration resolves to ${stats.totalTiles} tiles with ${stats.totalWeight.toFixed(1)} total weight.`,
                'success'
            );
        } catch (error) {
            UIUtils.showAlert(`Generation test failed: ${error.message}`, 'danger');
        }
    }

    validateConfiguration() {
        // Validate using configuration panel
        return this.components.configPanel?.validateConfiguration() || true;
    }

    // Legacy API support (for backward compatibility)
    
    updateTilesList() {
        this.components.renderer?.updateDisplay();
    }

    updatePreview() {
        this.components.renderer?.updateDisplay();
    }

    showAlert(message, type) {
        UIUtils.showAlert(message, type);
    }

    removeTile(index) {
        this.handleRendererTileRemove(index);
    }
}