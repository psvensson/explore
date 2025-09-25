/**
 * TilesetEditor - Main hierarchical editor coordinator
 * 
 * Provides a step-by-step workflow for creating tileset configurations:
 * 1. Design Structures (3D voxel geometry)
 * 2. Create Metadata Packages (weights, roles, properties)
 * 3. Combine into Tile Packages
 * 4. Build Complete Configurations
 */

import { UIUtils } from './ui_utils.js';
import { StructureEditor } from './structure_editor.js';
import { MetadataEditor } from './metadata_editor.js';
import { TilePackageEditor } from './package_editor.js';
import { ConfigurationEditor } from './configuration_editor.js';
import { TilesetConfigManager } from './tileset_config_manager.js';

export class TilesetEditor {
    constructor(container) {
        this.container = container;
        this.configManager = new TilesetConfigManager();
        this.currentView = 'overview';
        this.editors = {};
        this.views = {}; // Cache for preserving view content
        
        this.initializeUI();
        this.showOverview();
    }

    initializeUI() {
        this.container.innerHTML = `
            <div class="tileset-editor">
                <!-- Navigation Breadcrumb -->
                <div class="editor-navigation">
                    <div class="breadcrumb">
                        <span class="breadcrumb-item active" id="nav-overview">Tileset Editor</span>
                        <span class="breadcrumb-separator" style="display: none;"> / </span>
                        <span class="breadcrumb-item" id="nav-current" style="display: none;"></span>
                    </div>
                    <button id="back-button" class="btn btn-secondary" style="display: none;">← Back to Overview</button>
                </div>

                <!-- Main Content Area -->
                <div id="editor-content">
                    <!-- Will be populated by different views -->
                </div>
            </div>
        `;

        this.bindNavigationEvents();
    }

    bindNavigationEvents() {
        document.getElementById('nav-overview').onclick = () => this.showOverview();
        document.getElementById('back-button').onclick = () => this.showOverview();
        
        // Bind step card navigation - using event delegation since cards are created dynamically
        this.container.addEventListener('click', (e) => {
            const stepCard = e.target.closest('.step-card');
            if (stepCard) {
                const step = stepCard.getAttribute('data-step');
                switch (step) {
                    case 'structure':
                        this.showStructureEditor();
                        break;
                    case 'metadata':
                        this.showMetadataEditor();
                        break;
                    case 'package':
                        this.showTilePackageEditor();
                        break;
                    case 'configuration':
                        this.showConfigurationEditor();
                        break;
                }
            }
        });
    }

    showOverview() {
        this.currentView = 'overview';
        this.updateNavigation('Tileset Editor');
        
        const content = document.getElementById('editor-content');
        
        // Hide all editor views
        Object.values(this.views).forEach(view => {
            if (view && view.style) {
                view.style.display = 'none';
            }
        });
        
        // Show or create overview
        if (!this.views.overview) {
            this.views.overview = document.createElement('div');
            this.views.overview.className = 'editor-overview';
            this.views.overview.innerHTML = `
                <div class="overview-header">
                    <h2>🎯 Tileset Configuration System</h2>
                    <p>Build your tileset step by step, from basic structures to complete configurations</p>
                </div>

                <div class="workflow-steps">
                    <div class="step-card" data-step="structure">
                        <div class="step-number">1</div>
                        <div class="step-content">
                            <h3>🏗️ Design Structures</h3>
                            <p>Create the basic 3D geometry and shape of your tiles</p>
                            <div class="step-details">
                                <small>Define voxel patterns, rotations, and categories</small>
                            </div>
                        </div>
                    </div>

                    <div class="step-card" data-step="metadata">
                        <div class="step-number">2</div>
                        <div class="step-content">
                            <h3>⚙️ Create Metadata Packages</h3>
                            <p>Define weight and role packages for different dungeon behaviors</p>
                            <div class="step-details">
                                <small>Set probability weights, functional roles, and properties</small>
                            </div>
                        </div>
                    </div>

                    <div class="step-card" data-step="package">
                        <div class="step-number">3</div>
                        <div class="step-content">
                            <h3>🎲 Combine into Tile Packages</h3>
                            <p>Combine structures with metadata to create complete tile sets</p>
                            <div class="step-details">
                                <small>Assign IDs, apply rotations, and organize into packages</small>
                            </div>
                        </div>
                    </div>

                    <div class="step-card" data-step="configuration">
                        <div class="step-number">4</div>
                        <div class="step-content">
                            <h3>📋 Build Configurations</h3>
                            <p>Create complete tileset configurations ready for WFC generation</p>
                            <div class="step-details">
                                <small>Test generation, save configs, and export/import settings</small>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="quick-stats">
                    <h3>Current System Status</h3>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-number" id="structure-count">Loading...</div>
                            <div class="stat-label">Structures</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number" id="weight-package-count">Loading...</div>
                            <div class="stat-label">Weight Packages</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number" id="role-package-count">Loading...</div>
                            <div class="stat-label">Role Packages</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number" id="config-count">Loading...</div>
                            <div class="stat-label">Saved Configs</div>
                        </div>
                    </div>
                </div>

                <div class="quick-actions">
                    <h3>Quick Actions</h3>
                    <div class="action-buttons">
                        <button class="btn btn-primary" onclick="window.mainTilesetEditor.createQuickConfig()">
                            🚀 Quick Start - Create Basic Configuration
                        </button>
                        <button class="btn btn-secondary" onclick="window.mainTilesetEditor.importConfiguration()">
                            📁 Import Configuration from JSON
                        </button>
                        <button class="btn btn-info" onclick="window.mainTilesetEditor.showTutorial()">
                            📚 Show Tutorial
                        </button>
                    </div>
                </div>
            `;
            content.appendChild(this.views.overview);
            this.updateStats();
        }
        
        this.views.overview.style.display = 'block';
    }

    showStructureEditor() {
        this.currentView = 'structures';
        this.updateNavigation('Structure Editor');
        
        const content = document.getElementById('editor-content');
        
        // Hide all other views
        Object.entries(this.views).forEach(([key, view]) => {
            if (view && view.style) {
                view.style.display = key === 'structures' ? 'block' : 'none';
            }
        });
        
        // Create structure editor view if it doesn't exist
        if (!this.views.structures) {
            this.views.structures = document.createElement('div');
            this.views.structures.id = 'structure-editor-container';
            this.views.structures.style.display = 'block';
            content.appendChild(this.views.structures);
            
            // Initialize editor only once
            if (!this.editors.structure) {
                this.editors.structure = new StructureEditor(this.views.structures);
                window.structureEditor = this.editors.structure;
            }
        } else {
            this.views.structures.style.display = 'block';
        }
    }

    showMetadataEditor() {
        this.currentView = 'metadata';
        this.updateNavigation('Metadata Package Editor');
        
        const content = document.getElementById('editor-content');
        
        // Hide all other views
        Object.entries(this.views).forEach(([key, view]) => {
            if (view && view.style) {
                view.style.display = key === 'metadata' ? 'block' : 'none';
            }
        });
        
        // Create metadata editor view if it doesn't exist
        if (!this.views.metadata) {
            this.views.metadata = document.createElement('div');
            this.views.metadata.id = 'metadata-editor-container';
            this.views.metadata.style.display = 'block';
            content.appendChild(this.views.metadata);
            
            // Initialize editor only once
            if (!this.editors.metadata) {
                this.editors.metadata = new MetadataEditor(this.views.metadata);
                window.metadataEditor = this.editors.metadata;
            }
        } else {
            this.views.metadata.style.display = 'block';
        }
    }

    showTilePackageEditor() {
        this.currentView = 'packages';
        this.updateNavigation('Tile Package Editor');
        
        const content = document.getElementById('editor-content');
        
        // Hide all other views
        Object.entries(this.views).forEach(([key, view]) => {
            if (view && view.style) {
                view.style.display = key === 'packages' ? 'block' : 'none';
            }
        });
        
        // Create package editor view if it doesn't exist
        if (!this.views.packages) {
            this.views.packages = document.createElement('div');
            this.views.packages.id = 'package-editor-container';
            this.views.packages.style.display = 'block';
            content.appendChild(this.views.packages);
            
            // Initialize editor only once
            if (!this.editors.packages) {
                this.editors.packages = new TilePackageEditor(
                    this.views.packages,
                    () => this.updateStats()
                );
                window.tilePackageEditor = this.editors.packages;
            }
        } else {
            this.views.packages.style.display = 'block';
        }
        
        this.editors.packages.render();
    }

    showConfigurationEditor() {
        this.currentView = 'configurations';
        this.updateNavigation('Configuration Editor');
        
        const content = document.getElementById('editor-content');
        
        // Hide all other views
        Object.entries(this.views).forEach(([key, view]) => {
            if (view && view.style) {
                view.style.display = key === 'configurations' ? 'block' : 'none';
            }
        });
        
        // Create configuration editor view if it doesn't exist
        if (!this.views.configurations) {
            this.views.configurations = document.createElement('div');
            this.views.configurations.id = 'configuration-editor-container';
            this.views.configurations.style.display = 'block';
            content.appendChild(this.views.configurations);
            
            // Initialize editor only once
            if (!this.editors.configurations) {
                this.editors.configurations = new ConfigurationEditor(
                    this.views.configurations,
                    () => this.updateStats()
                );
                window.configurationEditor = this.editors.configurations;
            }
        } else {
            this.views.configurations.style.display = 'block';
        }
        
        this.editors.configurations.render();
    }

    updateNavigation(currentPageName) {
        const isOverview = this.currentView === 'overview';
        
        document.getElementById('nav-overview').classList.toggle('active', isOverview);
        document.getElementById('nav-current').style.display = isOverview ? 'none' : 'inline';
        document.querySelector('.breadcrumb-separator').style.display = isOverview ? 'none' : 'inline';
        document.getElementById('back-button').style.display = isOverview ? 'none' : 'inline';
        
        if (!isOverview) {
            document.getElementById('nav-current').textContent = currentPageName;
        }
    }

    async updateStats() {
        // Dynamically load stats to avoid circular imports
        try {
            const [{ TileStructures }, { TileMetadata }] = await Promise.all([
                import('../dungeon/tile_structures.js'),
                import('../dungeon/tile_metadata.js')
            ]);
            
            document.getElementById('structure-count').textContent = Object.keys(TileStructures.STRUCTURES || {}).length;
            document.getElementById('weight-package-count').textContent = Object.keys(TileMetadata.weightPackages || {}).length;
            document.getElementById('role-package-count').textContent = Object.keys(TileMetadata.rolePackages || {}).length;
            
            const configs = this.configManager.listConfigs();
            document.getElementById('config-count').textContent = configs.length;
        } catch (error) {
            console.warn('Could not load stats:', error);
            document.getElementById('structure-count').textContent = '?';
            document.getElementById('weight-package-count').textContent = '?';
            document.getElementById('role-package-count').textContent = '?';
            document.getElementById('config-count').textContent = '?';
        }
    }

    createQuickConfig() {
        UIUtils.showMessage('Quick configuration creation coming soon!', 'info');
    }

    importConfiguration() {
        UIUtils.showMessage('Configuration import coming soon!', 'info');
    }

    showTutorial() {
        UIUtils.showMessage('Tutorial coming soon!', 'info');
    }
}

// Global reference for onclick handlers
if (typeof window !== 'undefined') {
    window.tilesetEditor = null;
}