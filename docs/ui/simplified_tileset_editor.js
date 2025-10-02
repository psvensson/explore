/**
 * Simplified Tileset Editor - 2-tab interface for structure browsing and tileset building
 * Replaces complex 4-step hierarchical editor with streamlined approach
 */

import { TileStructures } from '../dungeon/tile_structures.js';
import { 
  SIMPLIFIED_TILESETS, 
  createCustomTileset, 
  listTilesets, 
  validateTileset,
  convertTilesetForWFC,
  registerTileset 
} from '../dungeon/simplified_tilesets.js';
import { VoxelCoordinateConverter } from '../utils/voxel-coordinates.js';
import { 
  LIGHTING_PROFILES, 
  applyLightingProfile, 
  getZoomConfig, 
  getCameraConfig 
} from '../renderer/lighting-profiles.js';
import { createAxisIndicatorsPreset } from '../renderer/scene_setup.js';

export class SimplifiedTilesetEditor {
  constructor(container) {
    this.container = container;
    this.currentView = 'library'; // 'library' or 'builder'
    this.selectedStructures = new Set();
    this.currentTileset = null;
    this.loadedTilesetData = null; // Stores data from loaded tilesets for form population
    
    this.views = {};
    this.setupEventListeners();
    
    // Initialize asynchronously to restore work in progress
    this.initializeAsync();
    this.ensureTile3DStyles();
    this.render();
  }

  ensureTile3DStyles() {
    if (document.getElementById('tile-3d-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'tile-3d-styles';
    styles.textContent = `
      .structure-preview-3d {
        margin: 10px 0;
        display: flex;
        justify-content: center;
      }
      
      .tile-3d-canvas {
        width: 160px;
        height: 160px;
        border: 2px solid #444;
        border-radius: 6px;
        background: #2a2a2a;
        cursor: grab;
        transition: border-color 0.2s;
      }
      
      .tile-3d-canvas:hover {
        border-color: #666;
      }
      
      .tile-3d-canvas:active {
        cursor: grabbing;
        border-color: #888;
      }
      
      .structure-card {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      
      /* Structure Editor Modal Styles */
      .editor-main-content {
        display: flex;
        gap: 20px;
        margin-top: 20px;
      }
      
      .editor-3d-preview {
        flex: 1;
        min-width: 300px;
      }
      
      .editor-3d-preview h4 {
        margin-bottom: 10px;
        color: #fff;
      }
      
      .structure-editor-canvas {
        width: 300px;
        height: 300px;
        border: 2px solid #555;
        border-radius: 8px;
        background: #1a1a1a;
        cursor: grab;
        display: block;
      }
      
      .structure-editor-canvas:active {
        cursor: grabbing;
      }
      
      .preview-controls {
        margin-top: 8px;
        text-align: center;
      }
      
      .preview-controls small {
        color: #aaa;
        font-size: 12px;
      }
      
      .voxel-editor {
        flex: 1;
        min-width: 350px;
      }
      
      /* Make modal wider to accommodate both views */
      .structure-editor-modal .modal-content {
        max-width: 800px;
        width: 90vw;
      }
    `;
    document.head.appendChild(styles);
  }

  async initializeAsync() {
    try {
      // Wait for persistence system to be ready
      if (window.dataMerger && !window.dataMerger.initialized) {
        await window.dataMerger.initialize();
      }

      // Check if there's work in progress to restore
      const workInProgress = this.getWorkInProgressTileset();
      if (workInProgress) {
        console.log('[TilesetEditor] Restoring work in progress:', 
                    workInProgress.isModification ? 'modified existing tileset' : 'new tileset');
        
        this.selectedStructures = new Set(workInProgress.selectedStructures || []);
        this.loadedTilesetData = workInProgress.loadedTilesetData;
        this.currentView = workInProgress.currentView || 'builder';
        
        // Re-render with restored state
        this.render();
      }
    } catch (error) {
      console.warn('[TilesetEditor] Failed to initialize async features:', error);
    }
  }

  /**
   * Get all available structures from the appropriate source
   * @returns {object} All structures (built-in + user)
   */
  getAllStructures() {
    if (window.dataMerger && window.dataMerger.initialized) {
      return window.dataMerger.getAllStructures();
    } else {
      return TileStructures.structures;
    }
  }

  getAllTilesets() {
    if (window.dataMerger && window.dataMerger.initialized) {
      return window.dataMerger.getAllTilesets();
    } else {
      return window.SIMPLIFIED_TILESETS || {};
    }
  }

  // Update live preview when in builder view
  updateLivePreview() {
    if (this.currentView === 'builder') {
      // Find and update the preview section
      const previewContainer = this.container.querySelector('.tileset-preview');
      if (previewContainer) {
        const newPreviewHtml = this.renderTilesetPreview();
        if (newPreviewHtml) {
          previewContainer.outerHTML = newPreviewHtml;
        } else {
          previewContainer.remove();
        }
      } else if (this.selectedStructures.size > 0) {
        // Add preview if it doesn't exist but we have selections
        const builderForm = this.container.querySelector('.tileset-builder');
        if (builderForm) {
          const newPreviewHtml = this.renderTilesetPreview();
          if (newPreviewHtml) {
            builderForm.insertAdjacentHTML('beforeend', newPreviewHtml);
          }
        }
      }
    }
  }

  // Auto-save work in progress to prevent data loss
  saveWorkInProgress() {
    if (this.selectedStructures.size > 0) {
      const workData = {
        selectedStructures: Array.from(this.selectedStructures),
        loadedTilesetData: this.loadedTilesetData,
        currentView: this.currentView,
        timestamp: Date.now(),
        // Flag to indicate if this is a modification of an existing tileset
        isModification: !!this.loadedTilesetData
      };
      
      try {
        localStorage.setItem('tileset_editor_wip', JSON.stringify(workData));
        console.log('[TilesetEditor] Work in progress saved', workData.isModification ? '(modification)' : '(new)');
      } catch (error) {
        console.warn('[TilesetEditor] Failed to save work in progress:', error);
      }
    }
  }

  // Restore work in progress from previous session
  getWorkInProgressTileset() {
    try {
      const stored = localStorage.getItem('tileset_editor_wip');
      if (stored) {
        const data = JSON.parse(stored);
        // Only restore if recent (within 1 hour)
        if (Date.now() - data.timestamp < 3600000) {
          return data;
        }
      }
    } catch (error) {
      console.warn('[TilesetEditor] Failed to load work in progress:', error);
    }
    return null;
  }

  // Clear work in progress (called after successful save)
  clearWorkInProgress() {
    try {
      localStorage.removeItem('tileset_editor_wip');
      console.log('[TilesetEditor] Work in progress cleared');
    } catch (error) {
      console.warn('[TilesetEditor] Failed to clear work in progress:', error);
    }
  }

  // Check if a tileset is user-created (not built-in)
  isUserTileset(tilesetId) {
    if (window.dataMerger && window.dataMerger.initialized) {
      return window.dataMerger.userTilesets && window.dataMerger.userTilesets[tilesetId];
    }
    // Fallback - assume user tileset if not in original SIMPLIFIED_TILESETS
    const originalTilesets = window.SIMPLIFIED_TILESETS || {};
    return !originalTilesets[tilesetId];
  }

  // Render tilesets list showing both built-in and user tilesets
  renderTilesetsList() {
    const allTilesets = this.getAllTilesets();
    const builtInTilesets = Object.entries(allTilesets).filter(([id]) => 
      !this.isUserTileset(id)
    );
    const userTilesets = Object.entries(allTilesets).filter(([id]) => 
      this.isUserTileset(id)
    );

    return `
      ${builtInTilesets.length > 0 ? `
        <div class="tilesets-section">
          <h4>Built-in Tilesets</h4>
          ${builtInTilesets.map(([id, tileset]) => this.renderTilesetCard(id, tileset, false)).join('')}
        </div>
      ` : ''}
      
      ${userTilesets.length > 0 ? `
        <div class="tilesets-section">
          <h4>My Tilesets</h4>
          ${userTilesets.map(([id, tileset]) => this.renderTilesetCard(id, tileset, true)).join('')}
        </div>
      ` : ''}
      
      ${builtInTilesets.length === 0 && userTilesets.length === 0 ? `
        <div class="no-tilesets">
          <p>No tilesets available. Create your first tileset in the Builder tab!</p>
        </div>
      ` : ''}
    `;
  }

  // Render individual tileset card
  renderTilesetCard(id, tileset, isUserTileset) {
    const tileCount = tileset.tiles ? tileset.tiles.length : 0;
    const description = tileset.description || 'No description';
    
    return `
      <div class="tileset-item ${isUserTileset ? 'user-tileset' : 'built-in-tileset'}">
        <div class="tileset-info">
          <strong>${tileset.name}</strong>
          ${isUserTileset ? '<span class="user-badge">Mine</span>' : ''}
          <div class="tileset-meta">
            ${tileCount} tiles • ${description}
          </div>
        </div>
        <div class="tileset-actions">
          <button data-action="load-tileset" data-tileset-id="${id}">
            Load
          </button>
          <button data-action="inspect-tileset" data-tileset-id="${id}">
            Inspect
          </button>
          ${isUserTileset ? `
            <button data-action="delete-tileset" data-tileset-id="${id}" class="danger-button">
              Delete
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    // Handle tab switching via event delegation
    this.container.addEventListener('click', (event) => {
      if (event.target.matches('[data-tab]')) {
        const newView = event.target.dataset.tab;
        this.switchToView(newView);
      }
      
      if (event.target.matches('[data-action]')) {
        const action = event.target.dataset.action;
        this.handleAction(action, event);
      }
    });

    // Handle form submissions
    this.container.addEventListener('submit', (event) => {
      event.preventDefault();
      if (event.target.matches('#build-tileset-form')) {
        this.handleBuildTileset(event);
      }
    });

    // Handle structure selection changes
    this.container.addEventListener('change', (event) => {
      if (event.target.matches('[data-structure-select]')) {
        const structureId = event.target.dataset.structureSelect;
        if (event.target.checked) {
          this.selectedStructures.add(structureId);
        } else {
          this.selectedStructures.delete(structureId);
        }
        this.updateBuilderPreview();
        this.saveWorkInProgress(); // Auto-save when selections change
        this.updateLivePreview(); // Update live preview when selections change
      }
      
      // Handle filter changes
      if (event.target.matches('#structure-search') || 
          event.target.matches('#type-filter') ||
          event.target.matches('[data-filter]')) {
        this.applyFilters();
      }
    });
    
    // Handle search input
    this.container.addEventListener('input', (event) => {
      if (event.target.matches('#structure-search')) {
        this.applyFilters();
      }
    });
  }

  switchToView(viewName) {
    this.cleanup3DViewers(); // Clean up existing viewers before switching
    this.currentView = viewName;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="simplified-tileset-editor">
        <div class="editor-tabs">
          <button class="tab-button ${this.currentView === 'library' ? 'active' : ''}" 
                  data-tab="library">
            Structure Library
          </button>
          <button class="tab-button ${this.currentView === 'builder' ? 'active' : ''}" 
                  data-tab="builder">
            Tileset Builder  
          </button>
        </div>
        
        <div class="editor-content">
          ${this.currentView === 'library' ? this.renderLibraryView() : this.renderBuilderView()}
        </div>
      </div>
    `;
    
    // Initialize 3D viewers after DOM update
    setTimeout(() => this.initializeTile3DViewers(), 100);
  }

  renderLibraryView() {
    const structures = Object.entries(this.getAllStructures());
    const existingTilesets = this.renderTilesetsList();

    return `
      <div class="structure-library">
        <div class="library-section">
          <div class="library-header">
            <h3>Available Tile Structures</h3>
            <div class="structure-actions">
              <button data-action="create-structure" class="primary-button">
                + Create New Structure
              </button>
              <button data-action="import-structures" class="secondary-button">
                Import
              </button>
            </div>
          </div>
          
          <div class="library-filters">
            <input type="text" class="search-input" placeholder="Search structures..." 
                   data-action="filter-structures" id="structure-search">
            <select class="type-filter" data-action="filter-by-type" id="type-filter">
              <option value="">All types</option>
              ${[...new Set(structures.map(([id, struct]) => struct.type))].map(type => 
                `<option value="${type}">${type}</option>`
              ).join('')}
            </select>
            <div class="filter-checkboxes">
              <label class="filter-checkbox">
                <input type="checkbox" data-filter="built-in" id="filter-built-in"> Built-in only
              </label>
              <label class="filter-checkbox">
                <input type="checkbox" data-filter="selected" id="filter-selected"> Selected only
              </label>
            </div>
          </div>
          
          <div class="library-stats">
            <span class="stat">Total: <strong id="total-structures">${structures.length}</strong></span>
            <span class="stat">Selected: <strong id="selected-count">${this.selectedStructures.size}</strong></span>
            <span class="stat">Showing: <strong id="showing-count">${structures.length}</strong></span>
          </div>
          
          <div class="structure-grid" id="structure-library-grid">
            ${structures.map(([id, structure]) => this.renderEnhancedStructureCard(id, structure)).join('')}
          </div>
          
          <div class="bulk-actions">
            <button data-action="select-all-visible" class="secondary-button">Select All Visible</button>
            <button data-action="deselect-all" class="secondary-button">Deselect All</button>
            <button data-action="export-selected" class="secondary-button">Export Selected</button>
          </div>
        </div>

        <div class="library-section">
          <h3>Existing Tilesets</h3>
          <p class="section-help">Load and inspect predefined tilesets.</p>
          
          <div class="tileset-list">
            ${existingTilesets}
          </div>
        </div>
      </div>
    `;
  }

  renderBuilderView() {
    const selectedCount = this.selectedStructures.size;
    
    return `
      <div class="tileset-builder">
        <div class="builder-header">
          <div class="builder-title">
            <h3>Build New Tileset</h3>
            <div class="tile-count-badge">
              <span class="count-number">${selectedCount}</span>
              <span class="count-label">tiles</span>
            </div>
          </div>
          <p class="section-help">
            Create a custom tileset by combining selected structures with weights and rotations.
            ${selectedCount === 0 ? 'No structures selected yet.' : `${selectedCount} structures ready for configuration.`}
          </p>
        </div>

        ${selectedCount === 0 ? `
          <div class="builder-empty">
            <p>No structures selected. Go to Structure Library to select tiles.</p>
            <button data-tab="library" class="action-button">
              Go to Structure Library
            </button>
          </div>
        ` : `
          <form id="build-tileset-form" class="builder-form">
            <div class="form-section">
              <label>
                Tileset Name:
                <input type="text" name="tileset-name" placeholder="My Custom Tileset" 
                       value="${this.loadedTilesetData?.name || ''}" required>
              </label>
              
              <label>
                Description:
                <textarea name="tileset-description" placeholder="Description of this tileset..." rows="2">${this.loadedTilesetData?.description || ''}</textarea>
              </label>
            </div>

            <div class="form-section">
              <div class="section-header">
                <h4>Configure Selected Structures</h4>
                <button type="button" data-action="add-more-tiles" class="secondary-button">
                  + Add More Tiles
                </button>
              </div>
              <div class="structure-configs">
                ${Array.from(this.selectedStructures).map(structureId => this.renderStructureConfig(structureId)).join('')}
              </div>
            </div>

            <div class="form-actions">
              <button type="submit" class="primary-button">Build Tileset</button>
              <button type="button" data-action="preview-tileset" class="secondary-button">Preview</button>
              <button type="button" data-action="clear-selection" class="danger-button">Remove All Tiles</button>
            </div>
          </form>

          ${this.currentTileset ? this.renderTilesetPreview() : ''}
        `}
      </div>
    `;
  }

  renderStructureConfig(structureId) {
    const allStructures = this.getAllStructures();
    const structure = allStructures[structureId];
    if (!structure) return '';
    
    // Use loaded tileset data if available, otherwise use smart defaults
    let configData = this.getSmartDefaults(structureId);
    
    if (this.loadedTilesetData?.tiles) {
      const loadedTile = this.loadedTilesetData.tiles.find(t => t.structure === structureId);
      if (loadedTile) {
        configData = {
          weight: loadedTile.weight,
          rotations: loadedTile.rotations
        };
      }
    }
    
    const rotationOptions = configData.rotations.join(',');
    
    return `
      <div class="structure-config" data-structure="${structureId}">
        <div class="config-header">
          <div class="config-title">
            <strong>${structureId}</strong>
            <span class="structure-type type-${structure.type}">${structure.type}</span>
          </div>
          <button data-action="remove-from-selection" data-structure-id="${structureId}" 
                  class="remove-button small" title="Remove from selection">×</button>
        </div>
        
        <div class="config-controls">
          <label class="control-group">
            Weight:
            <input type="number" name="weight-${structureId}" value="${configData.weight}" 
                   min="1" max="20" class="weight-input">
            <span class="control-hint">Higher = more frequent</span>
          </label>
          
          <label class="control-group">
            Rotations:
            <select name="rotations-${structureId}" class="rotations-select">
              <option value="0" ${rotationOptions === '0' ? 'selected' : ''}>0° only</option>
              <option value="0,90" ${rotationOptions === '0,90' ? 'selected' : ''}>0°, 90°</option>
              <option value="0,180" ${rotationOptions === '0,180' ? 'selected' : ''}>0°, 180°</option>
              <option value="0,90,180,270" ${rotationOptions === '0,90,180,270' ? 'selected' : ''}>All rotations</option>
              <option value="custom">Custom...</option>
            </select>
            <span class="control-hint">Recommended: ${this.getSmartDefaults(structureId).rotations.join(', ')}°</span>
          </label>
        </div>
        
        <div class="config-preview">
          <div class="mini-preview">
            ${this.renderVoxelPreview(structure.structure)}
          </div>
          <div class="config-stats">
            <div class="stat-item">Variants: <strong>${configData.rotations.length}</strong></div>
            <div class="stat-item">Weight: <strong>${configData.weight}</strong></div>
          </div>
        </div>
      </div>
    `;
  }

  renderVoxelPreview(structureData) {
    // Convert existing TileStructures format to flat array for consistent handling
    const voxelData = this.convertStructureToFlat(structureData);
    
    // Enhanced 3D representation showing all 3 layers of 3x3x3 voxel data
    const layers = [
      voxelData.slice(0, 9),   // y=0 (bottom)
      voxelData.slice(9, 18),  // y=1 (middle) 
      voxelData.slice(18, 27)  // y=2 (top)
    ];
    
    return `
      <div class="voxel-3d-preview">
        ${layers.map((layer, layerIndex) => `
          <div class="voxel-layer" data-layer="${layerIndex}">
            <div class="layer-label">Y=${layerIndex}</div>
            <div class="voxel-grid-3x3">
              ${layer.map((voxel, i) => `
                <div class="voxel ${voxel === 1 ? 'solid' : 'empty'}" 
                     title="[${i%3},${layerIndex},${Math.floor(i/3)}]: ${voxel}"
                     data-coord="${i%3},${layerIndex},${Math.floor(i/3)}">
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  convertStructureToFlat(structureData) {
    // Handle different structure formats
    if (Array.isArray(structureData) && structureData.length === 27) {
      // Already flat array format
      return structureData;
    }
    
    if (Array.isArray(structureData) && Array.isArray(structureData[0])) {
      // Handle nested format like [[[0,1,0],[1,1,1],[0,1,0]]]
      const flatArray = new Array(27).fill(0);
      
      if (structureData[0] && Array.isArray(structureData[0][0])) {
        // Format: [[[row1],[row2],[row3]]] - single layer
        const layer = structureData[0];
        for (let z = 0; z < 3; z++) {
          for (let x = 0; x < 3; x++) {
            if (layer[z] && layer[z][x] !== undefined) {
              // Map to middle layer (y=1) of our 3D structure
              const index = 1 * 9 + z * 3 + x;
              flatArray[index] = layer[z][x];
            }
          }
        }
      }
      
      return flatArray;
    }
    
    // Fallback: empty structure
    return new Array(27).fill(0);
  }

  convertFlatToStructure(flatArray) {
    // Convert flat array back to TileStructures format
    // Extract middle layer (y=1) as the main structure
    const middleLayer = [];
    for (let z = 0; z < 3; z++) {
      const row = [];
      for (let x = 0; x < 3; x++) {
        const index = 1 * 9 + z * 3 + x; // y=1 layer
        row.push(flatArray[index] || 0);
      }
      middleLayer.push(row);
    }
    
    return [middleLayer];
  }

  // Generate a live preview tileset based on current selectedStructures
  generatePreviewTileset() {
    if (this.selectedStructures.size === 0) return null;

    // Use loaded tileset data for name/description if available
    const baseName = this.loadedTilesetData?.name || 'New Tileset';
    const baseDescription = this.loadedTilesetData?.description || '';

    return {
      id: baseName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      name: baseName,
      description: baseDescription,
      tiles: Array.from(this.selectedStructures).map(structureId => {
        const defaults = this.getSmartDefaults(structureId);
        
        // If we have loaded tileset data, try to use existing tile config
        let tileConfig = defaults;
        if (this.loadedTilesetData?.tiles) {
          const existingTile = this.loadedTilesetData.tiles.find(t => t.structure === structureId);
          if (existingTile) {
            tileConfig = {
              weight: existingTile.weight,
              rotations: existingTile.rotations
            };
          }
        }

        return {
          structure: structureId,
          weight: tileConfig.weight,
          rotations: tileConfig.rotations,
          constraints: {}
        };
      })
    };
  }

  renderTilesetPreview() {
    // Generate live preview based on current selectedStructures
    const previewTileset = this.generatePreviewTileset();
    if (!previewTileset) return '';

    const validation = validateTileset(previewTileset);
    
    return `
      <div class="tileset-preview">
        <h4>Tileset Preview: ${previewTileset.name}</h4>
        
        <div class="preview-stats">
          <div class="stat">Tiles: ${previewTileset.tiles.length}</div>
          <div class="stat">Total Weight: ${previewTileset.tiles.reduce((sum, tile) => sum + tile.weight, 0)}</div>
          <div class="stat">Valid: ${validation.success ? '✓' : '✗'}</div>
        </div>

        ${validation.errors.length > 0 ? `
          <div class="validation-errors">
            <h5>Validation Errors:</h5>
            <ul>
              ${validation.errors.map(error => `<li>${error}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <div class="tile-list">
          ${previewTileset.tiles.map((tile, index) => `
            <div class="tile-item">
              <strong>${tile.structure}</strong>
              <span>Weight: ${tile.weight}</span>
              <span>Rotations: ${tile.rotations.join(', ')}°</span>
            </div>
          `).join('')}
        </div>

        <div class="preview-actions">
          <button data-action="export-tileset" class="primary-button">Export Tileset</button>
          <button data-action="test-generation" class="secondary-button">Test Generation</button>
        </div>
      </div>
    `;
  }

  async handleAction(action, event) {
    switch (action) {
      case 'load-tileset':
        this.loadExistingTileset(event.target.dataset.tilesetId);
        break;
      case 'inspect-tileset':
        this.inspectTileset(event.target.dataset.tilesetId);
        break;
      case 'delete-tileset':
        this.deleteTileset(event.target.dataset.tilesetId);
        break;
      case 'clear-selection':
        this.clearSelection();
        break;
      case 'preview-tileset':
        this.previewCurrentConfiguration();
        break;
      case 'export-tileset':
        this.exportTileset();
        break;
      case 'test-generation':
        this.testTilesetGeneration();
        break;
      case 'create-structure':
        this.openStructureEditor();
        break;
      case 'edit-structure':
        this.openStructureEditor(event.target.dataset.structureId);
        break;
      case 'duplicate-structure':
        await this.duplicateStructure(event.target.dataset.structureId);
        break;
      case 'delete-structure':
        this.deleteStructure(event.target.dataset.structureId);
        break;

      case 'remove-from-selection':
        this.removeTileFromTileset(event.target.dataset.structureId);
        break;
      case 'select-all-visible':
        this.selectAllVisible();
        break;
      case 'deselect-all':
        this.selectedStructures.clear();
        this.render();
        break;
      case 'export-selected':
        this.exportSelectedStructures();
        break;
      case 'import-structures':
        this.showImportDialog();
        break;
      case 'goto-structure-editor':
        this.openStructureEditor();
        break;
      case 'add-more-tiles':
        this.showTileSelector();
        break;
      case 'quick-add-to-tileset':
        this.quickAddToTileset(event.target.dataset.structureId);
        break;
      case 'quick-remove-from-tileset':
        this.quickRemoveFromTileset(event.target.dataset.structureId);
        break;
    }
  }

  async handleBuildTileset(event) {
    const formData = new FormData(event.target);
    const name = formData.get('tileset-name');
    const description = formData.get('tileset-description');

    if (!name) {
      alert('Please enter a tileset name');
      return;
    }

    // Collect tile configurations
    const tiles = Array.from(this.selectedStructures).map(structureId => {
      const weight = parseInt(formData.get(`weight-${structureId}`)) || 3;
      const rotationsValue = formData.get(`rotations-${structureId}`) || '0,90,180,270';
      const rotations = rotationsValue.split(',').map(r => parseInt(r.trim()));

      return {
        structure: structureId,
        weight,
        rotations
      };
    });

    try {
      // Create tileset object
      const tileset = {
        id: name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        name: name,
        description: description || '',
        created: new Date().toISOString(),
        tiles: tiles.map(tile => ({
          structure: tile.structure,
          weight: Math.max(1, tile.weight || 1),
          rotations: tile.rotations || [0, 90, 180, 270],
          constraints: {}
        }))
      };

      // Use DataMerger for persistence if available
      if (typeof window !== 'undefined' && window.dataMerger) {
        await window.dataMerger.initialize();
        
        const result = await window.dataMerger.saveUserTileset(tileset.id, tileset);
        if (!result.success) {
          throw new Error(result.error);
        }
        
        console.log('[SimplifiedTilesetEditor] Saved user tileset:', tileset.name);
        
      } else {
        // Fallback to old system
        console.warn('[SimplifiedTilesetEditor] DataMerger not available, using fallback registration');
        if (typeof window !== 'undefined' && window.registerTileset) {
          window.registerTileset(tileset);
        }
      }
      
      this.currentTileset = tileset;
      this.loadedTilesetData = null; // Clear loaded data since we created new
      
      // Clear work in progress since we successfully saved
      this.clearWorkInProgress();
      
      console.log('[SimplifiedTilesetEditor] Created tileset:', this.currentTileset);
      this.render(); // Re-render to show preview
      
      alert(`Tileset "${name}" created successfully and saved!`);
      
    } catch (error) {
      console.error('[SimplifiedTilesetEditor] Failed to create tileset:', error);
      alert(`Failed to create tileset: ${error.message}`);
    }
  }

  loadExistingTileset(tilesetId) {
    console.log('[SimplifiedTilesetEditor] Loading existing tileset:', tilesetId);
    
    try {
      // Get tileset from merged data (both default and user tilesets)
      const allTilesets = this.getAllTilesets();
      const tileset = allTilesets[tilesetId];
      
      if (!tileset) {
        console.error('[SimplifiedTilesetEditor] Tileset not found:', tilesetId);
        return;
      }

      // Store loaded tileset data
      this.loadedTilesetData = {
        id: tilesetId,
        name: tileset.name,
        description: tileset.description || '',
        tiles: [...tileset.tiles]
      };

      // CRITICAL FIX: Restore selectedStructures from tileset tiles
      this.selectedStructures.clear();
      tileset.tiles.forEach(tile => {
        // Extract structure ID from tile
        if (tile.structure) {
          this.selectedStructures.add(tile.structure);
        } else if (tile.prototypeId) {
          // Fallback for different tile format
          this.selectedStructures.add(tile.prototypeId);
        }
      });

      this.currentTileset = tileset;
      this.switchToView('builder');
      
      console.log('[SimplifiedTilesetEditor] Tileset loaded with structures:', 
                  Array.from(this.selectedStructures));
      
    } catch (error) {
      console.error('[SimplifiedTilesetEditor] Failed to load tileset:', error);
      alert(`Failed to load tileset: ${error.message}`);
    }
  }

  inspectTileset(tilesetId) {
    const allTilesets = this.getAllTilesets();
    const tileset = allTilesets[tilesetId];
    if (!tileset) return;

    const wfcData = convertTilesetForWFC(tileset);
    
    // Show inspection modal or log details
    console.log('[SimplifiedTilesetEditor] Tileset inspection:', {
      tileset,
      wfcCompatible: wfcData,
      validation: validateTileset(tileset)
    });

    // Could show a modal here in the future
    alert(`Tileset: ${tileset.name}\nTiles: ${tileset.tiles.length}\nWFC Prototypes: ${wfcData.totalPrototypes}\nTotal Weight: ${wfcData.totalWeight}`);
  }

  async deleteTileset(tilesetId) {
    if (!this.isUserTileset(tilesetId)) {
      alert('Cannot delete built-in tilesets. Only user-created tilesets can be deleted.');
      return;
    }

    const allTilesets = this.getAllTilesets();
    const tileset = allTilesets[tilesetId];
    if (!tileset) {
      alert('Tileset not found');
      return;
    }

    if (!confirm(`Are you sure you want to delete the tileset "${tileset.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      if (window.dataMerger && window.dataMerger.initialized) {
        const result = await window.dataMerger.deleteUserTileset(tilesetId);
        if (!result.success) {
          throw new Error(result.error);
        }
        console.log('[TilesetEditor] Deleted user tileset:', tilesetId);
      } else {
        console.warn('[TilesetEditor] DataMerger not available, cannot delete tileset');
        alert('Delete functionality requires the persistence system to be available.');
        return;
      }

      // Clear current tileset if we just deleted it
      if (this.currentTileset && this.currentTileset.id === tilesetId) {
        this.currentTileset = null;
        this.loadedTilesetData = null;
      }

      // Re-render to update the list
      this.render();
      
      alert(`Tileset "${tileset.name}" deleted successfully.`);
      
    } catch (error) {
      console.error('[TilesetEditor] Failed to delete tileset:', error);
      alert(`Failed to delete tileset: ${error.message}`);
    }
  }

  clearSelection() {
    if (this.selectedStructures.size === 0) {
      alert('No tiles selected to remove.');
      return;
    }
    
    const tileCount = this.selectedStructures.size;
    if (!confirm(`Remove all ${tileCount} tiles from this tileset?\n\nThis will clear the entire selection and configuration.`)) {
      return;
    }
    
    this.selectedStructures.clear();
    this.currentTileset = null;
    this.loadedTilesetData = null;
    this.saveWorkInProgress(); // Auto-save cleared state
    this.updateLivePreview(); // Update live preview after clearing
    this.render();
    
    console.log(`[TilesetEditor] Cleared ${tileCount} tiles from selection`);
  }

  previewCurrentConfiguration() {
    if (this.selectedStructures.size === 0) {
      alert('Please select some structures first.');
      return;
    }

    // Create temporary tileset from current form state
    const form = this.container.querySelector('#build-tileset-form');
    if (!form) return;

    const formData = new FormData(form);
    const name = formData.get('tileset-name') || 'Preview Tileset';
    
    const tiles = Array.from(this.selectedStructures).map(structureId => {
      const weight = parseInt(formData.get(`weight-${structureId}`)) || 3;
      const rotationsValue = formData.get(`rotations-${structureId}`) || '0,90,180,270';
      const rotations = rotationsValue.split(',').map(r => parseInt(r.trim()));

      return { structure: structureId, weight, rotations };
    });

    try {
      this.currentTileset = createCustomTileset(name, tiles);
      this.render(); // Show preview
    } catch (error) {
      alert(`Preview failed: ${error.message}`);
    }
  }

  exportTileset() {
    if (!this.currentTileset) return;

    const exportData = {
      ...this.currentTileset,
      exported: new Date().toISOString(),
      format: 'simplified-tileset-v1'
    };

    // Create download
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.currentTileset.id}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    console.log('[SimplifiedTilesetEditor] Exported tileset:', this.currentTileset.name);
  }

  testTilesetGeneration() {
    if (!this.currentTileset) {
      alert('No tileset selected for testing.');
      return;
    }

    try {
      // Validate tileset first
      const validation = validateTileset(this.currentTileset);
      if (!validation.success) {
        alert(`Cannot test invalid tileset:\n${validation.errors.join('\n')}`);
        return;
      }
      
      // Use existing WFC generation system
      if (typeof window !== 'undefined' && window.generateWFCDungeon) {
        console.log('[SimplifiedTilesetEditor] Testing generation with tileset:', this.currentTileset.name);
        
        // The generateWFCDungeon function executes directly and doesn't return a promise
        // Pass the tileset ID so it can be resolved by the generation system
        window.generateWFCDungeon({
          x: 4, 
          y: 2, 
          z: 4,
          tileset: this.currentTileset.id,
          yieldEvery: 100,
          maxSteps: 1000,
          centerSeed: true
        });
        
        // Show message after a brief delay to let generation start
        setTimeout(() => {
          alert(`Test generation started!\n\nTileset: ${this.currentTileset.name}\nDimensions: 4×2×4\n\nCheck the 3D view for results.`);
        }, 200);
        
      } else {
        alert('WFC generation system not available.\n\nMake sure you are on the 3D View tab and the application has fully loaded.');
      }
    } catch (error) {
      console.error('[SimplifiedTilesetEditor] Test generation error:', error);
      alert(`Test generation failed:\n${error.message}\n\nCheck browser console for details.`);
    }
  }

  updateBuilderPreview() {
    // Update builder view if currently showing
    if (this.currentView === 'builder') {
      this.render();
    }
  }

  openStructureEditor(structureId = null) {
    // Create modal for structure editing
    const isEditing = structureId !== null;
    const allStructures = this.getAllStructures();
    const existingStructure = isEditing ? allStructures[structureId] : null;
    
    // Initialize voxel data
    let voxelData = new Array(27).fill(0); // 3x3x3 = 27 voxels
    let structureName = '';
    let structureType = 'corridor';
    let edges = ['0', '0', '0', '0']; // N, E, S, W
    
    if (existingStructure) {
      // Use the same data processing as the inline viewer
      const structureData = existingStructure.structure[0];
      console.log('[StructureEditor] Processing structure data:', existingStructure.structure);
      console.log('[StructureEditor] Structure data layers:', structureData);
      
      // Flatten structure data same way as inline viewer
      const flatVoxelData = [];
      for (let layer = 0; layer < structureData.length; layer++) {
        if (Array.isArray(structureData[layer])) {
          flatVoxelData.push(...structureData[layer]);
        }
      }
      voxelData = flatVoxelData;
      
      structureName = structureId;
      structureType = existingStructure.type || 'corridor';
      edges = [...existingStructure.edges];
    }
    
    const modal = document.createElement('div');
    modal.className = 'structure-editor-modal';
    modal.innerHTML = `
      <div class="modal-backdrop" data-action="close-modal"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>${isEditing ? 'Edit Structure: ' + structureId : 'Create New Structure'}</h3>
          <button data-action="close-modal" class="modal-close">×</button>
        </div>
        
        <div class="modal-body">
          <div class="structure-editor-form">
            <div class="form-row">
              <label>
                Structure Name:
                <input type="text" id="structure-name" value="${structureName}" 
                       placeholder="e.g., corridor_custom" ${isEditing && this.isBuiltInStructure(structureId) ? 'readonly' : ''}>
              </label>
              
              <label>
                Type:
                <select id="structure-type">
                  <option value="corridor" ${structureType === 'corridor' ? 'selected' : ''}>Corridor</option>
                  <option value="room" ${structureType === 'room' ? 'selected' : ''}>Room</option>
                  <option value="junction" ${structureType === 'junction' ? 'selected' : ''}>Junction</option>
                  <option value="special" ${structureType === 'special' ? 'selected' : ''}>Special</option>
                </select>
              </label>
            </div>
            
            <div class="form-row">
              <label>
                Edges (N-E-S-W):
                <div class="edge-inputs">
                  <input type="text" id="edge-n" value="${edges[0]}" placeholder="N" maxlength="3">
                  <input type="text" id="edge-e" value="${edges[1]}" placeholder="E" maxlength="3">
                  <input type="text" id="edge-s" value="${edges[2]}" placeholder="S" maxlength="3">
                  <input type="text" id="edge-w" value="${edges[3]}" placeholder="W" maxlength="3">
                </div>
              </label>
            </div>
            
            <div class="editor-main-content">
              <div class="editor-3d-preview">
                <h4>Live 3D Preview</h4>
                <canvas id="structure-editor-3d" width="300" height="300" class="structure-editor-canvas"></canvas>
                <div class="preview-controls">
                  <small>Drag to rotate • Scroll to zoom • Updates live as you edit</small>
                </div>
              </div>
              
              <div class="voxel-editor">
              <h4>3D Voxel Editor (3×3×3)</h4>
              <div class="editor-layers">
                ${[0, 1, 2].map(y => `
                  <div class="editor-layer">
                    <div class="layer-title">Layer Y=${y} ${y === 0 ? '(Bottom)' : y === 1 ? '(Middle)' : '(Top)'}</div>
                    <div class="voxel-editor-grid">
                      ${Array.from({length: 9}, (_, i) => {
                        const voxelIndex = y * 9 + i;
                        const x = i % 3;
                        const z = Math.floor(i / 3);
                        return `
                          <div class="voxel-editor-cell ${voxelData[voxelIndex] ? 'solid' : 'empty'}"
                               data-voxel-index="${voxelIndex}"
                               data-coord="${x},${y},${z}"
                               title="[${x},${y},${z}]: ${voxelData[voxelIndex] ? 'Solid' : 'Empty'}">
                            ${voxelData[voxelIndex] ? '█' : '·'}
                          </div>
                        `;
                      }).join('')}
                    </div>
                  </div>
                `).join('')}
              </div>
              
              <div class="editor-tools">
                <button data-action="clear-all" class="secondary-button">Clear All</button>
                <button data-action="fill-all" class="secondary-button">Fill All</button>
                <button data-action="fill-center" class="secondary-button">Center Column</button>
              </div>
            </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button data-action="save-structure" class="primary-button">
            ${isEditing ? 'Update Structure' : 'Create Structure'}
          </button>
          <button data-action="close-modal" class="secondary-button">Cancel</button>
        </div>
      </div>
    `;
    
    // Add modal to DOM
    document.body.appendChild(modal);
    
    // Set up modal event listeners
    this.setupStructureEditorEvents(modal, voxelData, isEditing, structureId);
    
    // Initialize 3D preview
    setTimeout(() => this.setupStructureEditor3D(modal, voxelData), 100);
  }

  setupStructureEditorEvents(modal, voxelData, isEditing, structureId) {
    modal.addEventListener('click', (event) => {
      const action = event.target.dataset.action;
      
      switch (action) {
        case 'close-modal':
          document.body.removeChild(modal);
          break;
          
        case 'save-structure':
          this.saveStructure(modal, voxelData, isEditing, structureId);
          break;
          
        case 'clear-all':
          voxelData.fill(0);
          this.updateVoxelEditor(modal, voxelData);
          this.updateStructureEditor3D(modal, voxelData);
          break;
          
        case 'fill-all':
          voxelData.fill(1);
          this.updateVoxelEditor(modal, voxelData);
          this.updateStructureEditor3D(modal, voxelData);
          break;
          
        case 'fill-center':
          // Fill center column (x=1 for all y and z)
          for (let y = 0; y < 3; y++) {
            for (let z = 0; z < 3; z++) {
              const index = y * 9 + z * 3 + 1; // x=1
              voxelData[index] = 1;
            }
          }
          this.updateVoxelEditor(modal, voxelData);
          this.updateStructureEditor3D(modal, voxelData);
          break;
      }
      
      // Handle voxel cell clicks
      if (event.target.matches('.voxel-editor-cell')) {
        const voxelIndex = parseInt(event.target.dataset.voxelIndex);
        voxelData[voxelIndex] = voxelData[voxelIndex] ? 0 : 1; // Toggle
        this.updateVoxelEditor(modal, voxelData);
        this.updateStructureEditor3D(modal, voxelData); // Update 3D view
      }
    });
  }

  updateVoxelEditor(modal, voxelData) {
    const cells = modal.querySelectorAll('.voxel-editor-cell');
    cells.forEach((cell, index) => {
      const isActive = voxelData[index] === 1;
      cell.className = `voxel-editor-cell ${isActive ? 'solid' : 'empty'}`;
      cell.textContent = isActive ? '█' : '·';
      
      const coord = cell.dataset.coord;
      cell.title = `[${coord}]: ${isActive ? 'Solid' : 'Empty'}`;
    });
  }

  async saveStructure(modal, voxelData, isEditing, structureId) {
    try {
      const name = modal.querySelector('#structure-name').value.trim();
      const type = modal.querySelector('#structure-type').value;
      const edges = [
        modal.querySelector('#edge-n').value.trim() || '0',
        modal.querySelector('#edge-e').value.trim() || '0', 
        modal.querySelector('#edge-s').value.trim() || '0',
        modal.querySelector('#edge-w').value.trim() || '0'
      ];
      
      if (!name) {
        alert('Please enter a structure name');
        return;
      }
      
      // Create structure object in TileStructures format
      const newStructure = {
        structure: this.convertFlatToStructure(voxelData),
        edges: edges,
        type: type
      };
      
      // Use DataMerger for persistence if available
      if (typeof window !== 'undefined' && window.dataMerger) {
        await window.dataMerger.initialize();
        
        // Handle validation and conflicts through DataMerger
        if (!isEditing) {
          // Creating new structure
          const existingStructures = window.dataMerger.getAllStructures();
          if (existingStructures[name]) {
            alert('Structure name already exists. Choose a different name.');
            return;
          }
          
          const result = await window.dataMerger.saveUserStructure(name, newStructure);
          if (!result.success) {
            throw new Error(result.error);
          }
          
          console.log(`[StructureEditor] Created structure: ${name}`);
          
        } else {
          // Editing existing structure
          if (name !== structureId) {
            // Renaming structure
            if (this.isBuiltInStructure(structureId)) {
              alert('Cannot rename built-in structures. Only custom structures can be renamed.');
              return;
            }
            
            const existingStructures = window.dataMerger.getAllStructures();
            if (existingStructures[name]) {
              alert('Structure name already exists. Choose a different name.');
              return;
            }
            
            // Try to delete old structure if it exists in user data
            // (it might not exist if it was a built-in structure that was duplicated)
            const deleteResult = await window.dataMerger.deleteUserStructure(structureId);
            if (!deleteResult.success && deleteResult.error !== 'Structure not found in user data') {
              // Only error if it's not a "not found" error
              throw new Error(`Failed to delete old structure: ${deleteResult.error}`);
            }
            
            // Also clean up from legacy TileStructures if it exists there
            if (TileStructures.structures[structureId] && !this.isBuiltInStructure(structureId)) {
              delete TileStructures.structures[structureId];
            }
            
            const saveResult = await window.dataMerger.saveUserStructure(name, newStructure);
            if (!saveResult.success) {
              throw new Error(`Failed to save renamed structure: ${saveResult.error}`);
            }
            
            // Update selected structures if old name was selected
            if (this.selectedStructures.has(structureId)) {
              this.selectedStructures.delete(structureId);
              this.selectedStructures.add(name);
            }
            
            console.log(`[StructureEditor] Renamed structure: ${structureId} → ${name}`);
            
          } else {
            // Just update existing structure
            if (this.isBuiltInStructure(name)) {
              alert('Cannot modify built-in structures. Only custom structures can be edited.');
              return;
            }
            
            const result = await window.dataMerger.saveUserStructure(name, newStructure);
            if (!result.success) {
              throw new Error(result.error);
            }
            
            console.log(`[StructureEditor] Updated structure: ${name}`);
          }
        }
        
      } else {
        // Fallback to old system if DataMerger not available
        console.warn('[StructureEditor] DataMerger not available, using fallback storage');
        
        if (!isEditing && TileStructures.structures[name]) {
          alert('Structure name already exists. Choose a different name.');
          return;
        }
        
        if (isEditing && name !== structureId) {
          if (TileStructures.structures[name]) {
            alert('Structure name already exists. Choose a different name.');
            return;
          }
          
          if (this.isBuiltInStructure(structureId)) {
            alert('Cannot rename built-in structures. Only custom structures can be renamed.');
            return;
          }
        }
        
        // Handle structure creation or update (fallback)
        if (isEditing) {
          if (name !== structureId) {
            delete TileStructures.structures[structureId];
            TileStructures.structures[name] = newStructure;
            
            if (this.selectedStructures.has(structureId)) {
              this.selectedStructures.delete(structureId);
              this.selectedStructures.add(name);
            }
          } else {
            TileStructures.structures[name] = newStructure;
          }
        } else {
          TileStructures.structures[name] = newStructure;
        }
      }
      
      // Close modal
      document.body.removeChild(modal);
      
      // Save work in progress and update live preview after structure save
      this.saveWorkInProgress(true); // true indicates this is a modification
      this.updateLivePreview();
      
      // Refresh the library view
      this.render();
      
      // Show success message
      alert(`Structure "${name}" ${isEditing ? 'updated' : 'created'} successfully!`);
      
    } catch (error) {
      console.error('[StructureEditor] Failed to save structure:', error);
      alert(`Failed to save structure: ${error.message}`);
    }
  }

  async duplicateStructure(structureId) {
    const allStructures = this.getAllStructures();
    const original = allStructures[structureId];
    if (!original) {
      alert('Structure not found');
      return;
    }
    
    // Create copy with new name
    const copyName = `${structureId}_copy`;
    let finalName = copyName;
    let counter = 1;
    
    // Find unique name
    while (allStructures[finalName]) {
      finalName = `${copyName}_${counter}`;
      counter++;
    }
    
    // Create duplicate (deep copy of nested structure)
    const duplicatedStructure = {
      structure: JSON.parse(JSON.stringify(original.structure)),
      edges: [...original.edges],
      type: original.type
    };
    
    // Save using DataMerger when available
    if (window.dataMerger && window.dataMerger.initialized) {
      try {
        await window.dataMerger.initialize();
        const result = await window.dataMerger.saveUserStructure(finalName, duplicatedStructure);
        if (!result.success) {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('[StructureEditor] Failed to save duplicated structure via DataMerger:', error);
        // Fallback to old system
        TileStructures.structures[finalName] = duplicatedStructure;
      }
    } else {
      // Fallback for when DataMerger isn't available
      TileStructures.structures[finalName] = duplicatedStructure;
    }
    
    console.log('[StructureEditor] Duplicated structure:', structureId, '→', finalName);
    
    // Refresh view
    this.render();
    
    alert(`Structure duplicated as "${finalName}"`);
  }

  async deleteStructure(structureId) {
    // Prevent deletion of built-in structures
    if (this.isBuiltInStructure(structureId)) {
      alert('Cannot delete built-in structures. Only custom structures can be deleted.');
      return;
    }
    
    const allStructures = this.getAllStructures();
    const structure = allStructures[structureId];
    if (!structure) {
      alert('Structure not found');
      return;
    }
    
    // Confirm deletion
    if (!confirm(`Are you sure you want to delete the structure "${structureId}"?\n\nThis action cannot be undone.`)) {
      return;
    }
    
    try {
      // Use DataMerger for persistence if available
      if (typeof window !== 'undefined' && window.dataMerger) {
        await window.dataMerger.initialize();
        
        const result = await window.dataMerger.deleteUserStructure(structureId);
        
        if (!result.success) {
          throw new Error(result.error);
        }
        
        console.log('[StructureEditor] Deleted structure via DataMerger:', structureId);
        
      } else {
        // Fallback to old system
        console.warn('[StructureEditor] DataMerger not available, using fallback deletion');
        delete TileStructures.structures[structureId];
        console.log('[StructureEditor] Deleted structure (fallback):', structureId);
      }
      
      // Remove from selected structures if selected
      this.selectedStructures.delete(structureId);
      
      // Save work in progress and update live preview after structure deletion
      this.saveWorkInProgress(true); // true indicates this is a modification
      this.updateLivePreview();
      
      // Refresh view
      this.render();
      
      alert(`Structure "${structureId}" has been deleted.`);
      
    } catch (error) {
      console.error('[StructureEditor] Failed to delete structure:', error);
      alert(`Failed to delete structure: ${error.message}`);
    }
  }

  // === STRUCTURE ANALYSIS METHODS ===

  isBuiltInStructure(structureId) {
    // Use DataMerger if available, otherwise fallback to local check
    if (typeof window !== 'undefined' && window.dataMerger) {
      return window.dataMerger.isBuiltInStructure(structureId);
    }
    
    // Fallback for when DataMerger isn't initialized yet
    const builtInStructures = [
      'corridor_nsew', 'corridor_ns', 'corridor_ew', 'corner_ne', 
      'corridor_nse', 'dead_end_n', 'room_3x3', 'stair_up', 'stair_down', 'multi_level_open'
    ];
    return builtInStructures.includes(structureId);
  }

  analyzeStructureConnectivity(structureId) {
    const allStructures = this.getAllStructures();
    const structure = allStructures[structureId];
    if (!structure) return { compatibleWith: [], warnings: [], connectivityScore: 0 };

    const compatibleWith = [];
    const warnings = [];
    
    // Check compatibility with other structures based on edge patterns
    for (const [otherId, otherStructure] of Object.entries(allStructures)) {
      if (otherId === structureId) continue;
      
      // Check if structures can connect (simplified compatibility check)
      const canConnect = this.checkEdgeCompatibility(structure.edges, otherStructure.edges);
      if (canConnect) {
        compatibleWith.push(otherId);
      }
    }

    // Generate warnings
    if (compatibleWith.length === 0) {
      warnings.push('No compatible connections found - structure may create isolated areas');
    }
    
    if (structure.edges.every(edge => edge === '000')) {
      warnings.push('All edges are closed - structure cannot connect to anything');
    }

    const connectivityScore = Math.min(compatibleWith.length / 5, 1); // Normalize to 0-1
    
    return { compatibleWith, warnings, connectivityScore };
  }

  checkEdgeCompatibility(edges1, edges2) {
    // Simplified compatibility check - opposite edges should match
    // North of structure1 should match South of structure2, etc.
    const opposites = [[0, 2], [1, 3], [2, 0], [3, 1]]; // N-S, E-W, S-N, W-E
    
    for (let i = 0; i < 4; i++) {
      const edge1 = edges1[i];
      const oppositeIndex = opposites[i][1];
      const edge2 = edges2[oppositeIndex];
      
      // If either structure has an opening ('0' in pattern), they can potentially connect
      if (edge1.includes('0') && edge2.includes('0')) {
        return true;
      }
    }
    
    return false;
  }

  getSmartDefaults(structureId) {
    const allStructures = this.getAllStructures();
    const structure = allStructures[structureId];
    if (!structure) return { weight: 3, rotations: [0, 90, 180, 270] };
    
    const type = structure.type;
    
    const presets = {
      corridor: { weight: 5, rotations: [0, 90, 180, 270] },
      room: { weight: 2, rotations: [0, 90, 180, 270] },
      junction: { weight: 1, rotations: [0] },
      special: { weight: 1, rotations: [0, 90, 180, 270] }
    };
    
    return presets[type] || { weight: 3, rotations: [0, 90, 180, 270] };
  }

  renderEnhancedStructureCard(id, structure) {
    const connectivity = this.analyzeStructureConnectivity(id);
    const isCustom = !this.isBuiltInStructure(id);
    const isSelected = this.selectedStructures.has(id);
    
    return `
      <div class="structure-card ${isSelected ? 'selected' : ''}" data-structure-id="${id}">
        <div class="structure-header">
          <div class="structure-title">
            <strong>${id}</strong>
            ${isCustom ? '<span class="custom-badge">Custom</span>' : '<span class="builtin-badge">Built-in</span>'}
          </div>
          
          <div class="structure-selector">
            <label class="checkbox-container">
              <input type="checkbox" 
                     data-structure-select="${id}"
                     ${isSelected ? 'checked' : ''}>
              <span class="checkmark"></span>
            </label>
          </div>
        </div>
        
        <div class="structure-preview">
          ${this.renderVoxelPreview(structure.structure)}
        </div>
        
        <div class="structure-metadata">
          <div class="meta-row">
            <div class="meta-item">
              <label>Type:</label>
              <span class="type-badge type-${structure.type}">${structure.type || 'unknown'}</span>
            </div>
          </div>
          
          <div class="meta-row">
            <div class="meta-item">
              <label>Edges:</label>
              <span class="edges-display">${structure.edges.join('-')}</span>
            </div>
          </div>
          
          <div class="meta-row">
            <div class="meta-item">
              <label>Connects to:</label>
              <span class="connectivity-count ${connectivity.compatibleWith.length > 3 ? 'good' : connectivity.compatibleWith.length > 0 ? 'medium' : 'poor'}">
                ${connectivity.compatibleWith.length} structures
              </span>
            </div>
          </div>
          
          ${connectivity.warnings.length > 0 ? `
            <div class="structure-warnings">
              ${connectivity.warnings.map(warning => `
                <div class="warning-item">⚠️ ${warning}</div>
              `).join('')}
            </div>
          ` : ''}
        </div>
        
        <div class="structure-preview-3d">
          <canvas id="tile-3d-${id}" class="tile-3d-canvas" 
                  data-structure-id="${id}" 
                  width="120" height="120"></canvas>
        </div>
        
        <div class="structure-actions">
          <button data-action="edit-structure" data-structure-id="${id}" 
                  class="action-button small" title="Edit structure">
            ✏️
          </button>
          <button data-action="duplicate-structure" data-structure-id="${id}" 
                  class="action-button small" title="Duplicate structure">
            📋
          </button>
          ${isCustom ? `
            <button data-action="delete-structure" data-structure-id="${id}" 
                    class="action-button small danger" title="Delete structure">
              🗑️
            </button>
          ` : ''}
          ${!isSelected ? `
            <button data-action="quick-add-to-tileset" data-structure-id="${id}" 
                    class="action-button small primary" title="Quick add to current tileset">
              ➕
            </button>
          ` : `
            <button data-action="quick-remove-from-tileset" data-structure-id="${id}" 
                    class="action-button small danger" title="Remove from current tileset">
              ➖
            </button>
          `}
        </div>
      </div>
    `;
  }

  // Initialize 3D viewers for all visible tiles
  async initializeTile3DViewers() {
    console.log('[SimplifiedTilesetEditor] Initializing inline 3D viewers');
    
    // Find all 3D canvases that need initialization
    const canvases = this.container.querySelectorAll('.tile-3d-canvas');
    
    for (const canvas of canvases) {
      const structureId = canvas.dataset.structureId;
      if (!structureId || canvas._initialized) continue;
      
      await this.setupInline3DViewer(canvas, structureId);
      canvas._initialized = true;
    }
  }

  // Setup a compact 3D viewer for an individual tile using refactored viewer class
  async setupInline3DViewer(canvas, structureId) {
    try {
      console.log('[TileViewer] Setting up 3D viewer for:', structureId);
      const allStructures = this.getAllStructures();
      const structure = allStructures[structureId];
      if (!structure) {
        console.error('[TileViewer] Structure not found:', structureId);
        return;
      }
      console.log('[TileViewer] Structure data:', structure);

      // Get THREE using the exact same pattern as the main renderer
      const THREERef = (window.dungeonRenderer && window.dungeonRenderer.THREE) || window.THREE;
      if (!THREERef) {
        console.error('[TileViewer] No THREE.js reference available for:', structureId);
        return;
      }
      console.log('[TileViewer] Using THREE.js reference from main renderer');

      // Import viewer classes and utilities
      const { Voxel3DViewer } = await import('./utils/voxel-3d-viewer.js');
      const { ViewerControls } = await import('./utils/viewer-controls.js');
      const { StructureMeshPipeline } = await import('./utils/structure-mesh-pipeline.js');
      const { makeMaterialFactory } = await import('../renderer/mesh_factories.js');

      // Create viewer using new class (handles scene, camera, renderer, lighting, axes)
      const viewer = new Voxel3DViewer(canvas, {
        viewerType: 'inline',
        width: 160,
        height: 160,
        backgroundColor: 0x2a2a2a,
        includeAxisIndicators: true
      });
      
      // Initialize viewer
      const success = await viewer.initialize(THREERef);
      if (!success) {
        console.error('[TileViewer] Failed to initialize viewer');
        return;
      }
      
      // Create authentic tile mesh using pipeline
      console.log('[TileViewer] Processing structure data:', structure.structure);
      const materialFactory = makeMaterialFactory(THREERef);
      const tileMesh = await StructureMeshPipeline.createMeshFromStructureObject(THREERef, structure, { materialFactory });
      console.log('[TileViewer] Created authentic WFC tile mesh using pipeline');
      
      // Add mesh to viewer
      viewer.setMesh(tileMesh);
      
      // Setup mouse controls using new class
      const controls = new ViewerControls(canvas, viewer, {
        rotationSpeed: 0.01,
        enableRotation: true,
        enableZoom: true,
        clampRotation: true
      });
      controls.enable();
      
      // Store viewer and controls on canvas for cleanup
      canvas._viewerData = viewer.getViewerData();
      canvas._viewerData.controls = controls;
      
      // Start render loop
      viewer.startRenderLoop();
      
      console.log('[TileViewer] Initialized 3D viewer for:', structureId);
      
    } catch (error) {
      console.error('[TileViewer] Failed to setup 3D viewer for', structureId, ':', error);
    }
  }

  // Cleanup 3D viewers when needed
  cleanup3DViewers() {
    const canvases = this.container.querySelectorAll('.tile-3d-canvas');
    
    for (const canvas of canvases) {
      if (canvas._viewerData) {
        const { renderer, scene } = canvas._viewerData;
        canvas._viewerData = null;
        
        if (renderer) renderer.dispose();
        if (scene) scene.clear();
      }
    }
  }

  renderEnhancedVoxelPreview(structure) {
    const layers = structure[0]; // Get the 3D structure
    
    return `
      <div class="enhanced-voxel-display">
        <div class="layer-stack">
          ${[0, 1, 2].map(y => `
            <div class="voxel-layer" data-layer="${y}">
              <div class="layer-label">Y=${y} ${y === 0 ? '(Bottom)' : y === 1 ? '(Middle)' : '(Top)'}</div>
              <div class="layer-grid">
                ${[0, 1, 2].map(z => `
                  <div class="layer-row">
                    ${[0, 1, 2].map(x => `
                      <div class="voxel-cell ${layers[z] && layers[z][x] !== undefined && layers[z][x] === 1 ? 'solid' : 'empty'}"
                           data-coord="${x},${y},${z}">
                        ${layers[z] && layers[z][x] === 1 ? '█' : '·'}
                      </div>
                    `).join('')}
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  // Filter and search functionality
  applyFilters() {
    const searchTerm = (this.container.querySelector('#structure-search')?.value || '').toLowerCase();
    const typeFilter = this.container.querySelector('#type-filter')?.value || '';
    const builtInOnly = this.container.querySelector('#filter-built-in')?.checked || false;
    const selectedOnly = this.container.querySelector('#filter-selected')?.checked || false;
    
    const structureCards = this.container.querySelectorAll('#structure-library-grid .structure-card');
    let visibleCount = 0;
    
    structureCards.forEach(card => {
      const structureId = card.dataset.structureId;
      const allStructures = this.getAllStructures();
      const structure = allStructures[structureId];
      if (!structure) return;
      
      // Apply filters
      let visible = true;
      
      // Search filter
      if (searchTerm && !structureId.toLowerCase().includes(searchTerm)) {
        visible = false;
      }
      
      // Type filter
      if (typeFilter && structure.type !== typeFilter) {
        visible = false;
      }
      
      // Built-in filter
      if (builtInOnly && !this.isBuiltInStructure(structureId)) {
        visible = false;
      }
      
      // Selected filter
      if (selectedOnly && !this.selectedStructures.has(structureId)) {
        visible = false;
      }
      
      card.style.display = visible ? 'block' : 'none';
      if (visible) visibleCount++;
    });
    
    // Update stats
    const showingElement = this.container.querySelector('#showing-count');
    if (showingElement) {
      showingElement.textContent = visibleCount;
    }
  }
  
  selectAllVisible() {
    const visibleCards = this.container.querySelectorAll('#structure-library-grid .structure-card:not([style*="display: none"])');
    visibleCards.forEach(card => {
      const structureId = card.dataset.structureId;
      this.selectedStructures.add(structureId);
    });
    
    // Save work in progress and update live preview after selecting all
    this.saveWorkInProgress(true); // true indicates this is a modification
    this.updateLivePreview();
    
    this.render();
  }
  
  exportSelectedStructures() {
    if (this.selectedStructures.size === 0) {
      alert('No structures selected for export');
      return;
    }
    
    const exportData = {
      version: '1.0',
      exported: new Date().toISOString(),
      structures: {}
    };
    
    this.selectedStructures.forEach(structureId => {
      const allStructures = this.getAllStructures();
      const structure = allStructures[structureId];
      if (structure) {
        exportData.structures[structureId] = structure;
      }
    });
    
    const jsonData = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `structures_export_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('[StructureEditor] Exported', this.selectedStructures.size, 'structures');
  }
  
  showImportDialog() {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal-content import-dialog">
        <div class="modal-header">
          <h3>Import Structures</h3>
          <button class="close-button" data-action="close-modal">×</button>
        </div>
        
        <div class="modal-body">
          <div class="import-methods">
            <div class="import-method">
              <h4>Upload JSON File</h4>
              <input type="file" accept=".json" id="import-file" class="file-input">
              <button data-action="import-from-file" class="primary-button">Import from File</button>
            </div>
            
            <div class="import-method">
              <h4>Paste JSON Data</h4>
              <textarea id="import-json" placeholder="Paste structure JSON data here..." rows="8" class="json-input"></textarea>
              <button data-action="import-from-text" class="primary-button">Import from Text</button>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button data-action="close-modal" class="secondary-button">Cancel</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle import actions
    modal.addEventListener('click', (event) => {
      switch (event.target.dataset.action) {
        case 'close-modal':
          document.body.removeChild(modal);
          break;
        case 'import-from-file':
          this.importFromFile(modal);
          break;
        case 'import-from-text':
          this.importFromText(modal);
          break;
      }
    });
    
    modal.querySelector('.modal-backdrop').addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }
  
  importFromFile(modal) {
    const fileInput = modal.querySelector('#import-file');
    const file = fileInput.files[0];
    
    if (!file) {
      alert('Please select a file to import');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        this.processImportData(data, modal);
      } catch (error) {
        alert(`Failed to parse JSON file: ${error.message}`);
      }
    };
    reader.readAsText(file);
  }
  
  importFromText(modal) {
    const textInput = modal.querySelector('#import-json');
    const jsonText = textInput.value.trim();
    
    if (!jsonText) {
      alert('Please paste JSON data to import');
      return;
    }
    
    try {
      const data = JSON.parse(jsonText);
      this.processImportData(data, modal);
    } catch (error) {
      alert(`Failed to parse JSON data: ${error.message}`);
    }
  }
  
  processImportData(data, modal) {
    if (!data.structures || typeof data.structures !== 'object') {
      alert('Invalid import data: missing structures object');
      return;
    }
    
    let importCount = 0;
    let skipCount = 0;
    
    Object.entries(data.structures).forEach(([id, structure]) => {
      const allStructures = this.getAllStructures();
      if (allStructures[id]) {
        skipCount++;
        console.warn(`[Import] Skipping existing structure: ${id}`);
      } else {
        if (window.dataMerger && window.dataMerger.initialized) {
          window.dataMerger.saveUserStructure(id, structure);
        } else {
          TileStructures.structures[id] = structure;
        }
        importCount++;
        console.log(`[Import] Added structure: ${id}`);
      }
    });
    
    document.body.removeChild(modal);
    this.render();
    
    alert(`Import complete!\nImported: ${importCount} structures\nSkipped: ${skipCount} existing structures`);
  }
  
  showTileSelector() {
    const structures = Object.entries(this.getAllStructures());
    const availableStructures = structures.filter(([id]) => !this.selectedStructures.has(id));
    
    if (availableStructures.length === 0) {
      alert('All available structures are already added to this tileset.');
      return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal-content tile-selector-modal">
        <div class="modal-header">
          <h3>Add Tiles to Tileset</h3>
          <button class="close-button" data-action="close-tile-selector">×</button>
        </div>
        
        <div class="modal-body">
          <div class="selector-info">
            <p>Select additional structures to add to your tileset. Currently selected: <strong>${this.selectedStructures.size}</strong> tiles.</p>
          </div>
          
          <div class="selector-filters">
            <input type="text" class="search-input" placeholder="Search available structures..." 
                   id="tile-selector-search">
            <select class="type-filter" id="tile-selector-type-filter">
              <option value="">All types</option>
              ${[...new Set(availableStructures.map(([id, struct]) => struct.type))].map(type => 
                `<option value="${type}">${type}</option>`
              ).join('')}
            </select>
          </div>
          
          <div class="available-structures" id="available-structures-grid">
            ${availableStructures.map(([id, structure]) => `
              <div class="structure-card selectable" data-structure-id="${id}" data-type="${structure.type}">
                <div class="structure-header">
                  <div class="structure-title">
                    <strong>${id}</strong>
                    <span class="structure-type type-${structure.type}">${structure.type}</span>
                  </div>
                  <div class="structure-selector">
                    <label class="checkbox-container">
                      <input type="checkbox" data-tile-select="${id}" class="tile-checkbox">
                      <span class="checkmark"></span>
                    </label>
                  </div>
                </div>
                
                <div class="structure-preview">
                  ${this.renderVoxelPreview(structure.structure)}
                </div>
                
                <div class="structure-metadata">
                  <div class="meta-item">
                    <label>Edges:</label>
                    <span class="edges-display">${structure.edges.join('-')}</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
          
          <div class="selector-stats">
            <span id="tiles-to-add-count">0</span> tiles selected to add
          </div>
        </div>
        
        <div class="modal-footer">
          <button data-action="add-selected-tiles" class="primary-button">Add Selected Tiles</button>
          <button data-action="close-tile-selector" class="secondary-button">Cancel</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Track selected tiles to add
    const tilesToAdd = new Set();
    
    // Handle tile selection
    modal.addEventListener('change', (event) => {
      if (event.target.matches('.tile-checkbox')) {
        const tileId = event.target.dataset.tileSelect;
        if (event.target.checked) {
          tilesToAdd.add(tileId);
        } else {
          tilesToAdd.delete(tileId);
        }
        
        // Update count
        modal.querySelector('#tiles-to-add-count').textContent = tilesToAdd.size;
      }
    });
    
    // Handle search and filtering
    modal.addEventListener('input', (event) => {
      if (event.target.matches('#tile-selector-search')) {
        this.filterTileSelector(modal, event.target.value);
      }
    });
    
    modal.addEventListener('change', (event) => {
      if (event.target.matches('#tile-selector-type-filter')) {
        this.filterTileSelector(modal, modal.querySelector('#tile-selector-search').value, event.target.value);
      }
    });
    
    // Handle modal actions
    modal.addEventListener('click', (event) => {
      switch (event.target.dataset.action) {
        case 'close-tile-selector':
          document.body.removeChild(modal);
          break;
        case 'add-selected-tiles':
          this.addSelectedTiles(tilesToAdd, modal);
          break;
      }
    });
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }
  
  filterTileSelector(modal, searchTerm = '', typeFilter = '') {
    const searchLower = searchTerm.toLowerCase();
    const cards = modal.querySelectorAll('#available-structures-grid .structure-card');
    
    cards.forEach(card => {
      const structureId = card.dataset.structureId;
      const structureType = card.dataset.type;
      
      let visible = true;
      
      // Search filter
      if (searchLower && !structureId.toLowerCase().includes(searchLower)) {
        visible = false;
      }
      
      // Type filter
      if (typeFilter && structureType !== typeFilter) {
        visible = false;
      }
      
      card.style.display = visible ? 'block' : 'none';
    });
  }
  
  addSelectedTiles(tilesToAdd, modal) {
    if (tilesToAdd.size === 0) {
      alert('Please select at least one tile to add.');
      return;
    }
    
    // Add tiles to selected structures
    tilesToAdd.forEach(tileId => {
      this.selectedStructures.add(tileId);
    });
    
    // Clear loaded tileset data since we're modifying the selection
    this.loadedTilesetData = null;
    
    // Close modal
    document.body.removeChild(modal);
    
    // Re-render to show new tiles
    this.render();
    
    console.log(`[TilesetEditor] Added ${tilesToAdd.size} tiles:`, Array.from(tilesToAdd));
    
    // Show success message
    const tileNames = Array.from(tilesToAdd).join(', ');
    alert(`Successfully added ${tilesToAdd.size} tiles to the tileset:\n${tileNames}`);
  }
  
  removeTileFromTileset(structureId) {
    if (!this.selectedStructures.has(structureId)) {
      return;
    }
    
    // Confirm removal
    if (!confirm(`Remove "${structureId}" from this tileset?\n\nThis will remove the tile and its configuration.`)) {
      return;
    }
    
    // Remove from selected structures
    this.selectedStructures.delete(structureId);
    
    // Clear loaded tileset data since we're modifying the selection
    this.loadedTilesetData = null;
    
    // Re-render to update the view
    this.render();
    
    console.log(`[TilesetEditor] Removed tile: ${structureId}`);
  }
  
  quickAddToTileset(structureId) {
    if (this.selectedStructures.has(structureId)) {
      return; // Already added
    }
    
    const allStructures = this.getAllStructures();
    const structure = allStructures[structureId];
    if (!structure) {
      alert('Structure not found');
      return;
    }
    
    // Add to selected structures
    this.selectedStructures.add(structureId);
    
    // Don't clear loaded tileset data - keep it for context but mark as modified
    // this.loadedTilesetData = null;
    
    // Auto-save and update live preview
    this.saveWorkInProgress();
    this.updateLivePreview();
    
    // Re-render to update the view
    this.render();
    
    console.log(`[TilesetEditor] Quick added tile: ${structureId}`);
    
    // Show brief success feedback
    const notification = document.createElement('div');
    notification.className = 'quick-notification success';
    notification.textContent = `Added "${structureId}" to tileset`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #d4edda;
      color: #155724;
      padding: 10px 15px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      z-index: 10000;
      font-size: 14px;
      animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }
  
  quickRemoveFromTileset(structureId) {
    if (!this.selectedStructures.has(structureId)) {
      return; // Not selected
    }
    
    // Remove from selected structures
    this.selectedStructures.delete(structureId);
    
    // Preserve loaded tileset data for context (don't clear like quickAddToTileset)
    // Keep loadedTilesetData so we know which tileset is being modified
    
    // Save work in progress and update live preview
    this.saveWorkInProgress(true); // true indicates this is a modification
    this.updateLivePreview();
    
    // Re-render to update the view
    this.render();
    
    console.log(`[TilesetEditor] Quick removed tile: ${structureId}`);
    
    // Show brief success feedback
    const notification = document.createElement('div');
    notification.className = 'quick-notification warning';
    notification.textContent = `Removed "${structureId}" from tileset`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #fff3cd;
      color: #856404;
      padding: 10px 15px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      z-index: 10000;
      font-size: 14px;
      animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  // Setup 3D viewer in structure editor using refactored viewer class
  async setupStructureEditor3D(modal, voxelData) {
    const canvas = modal.querySelector('#structure-editor-3d');
    if (!canvas) return;

    // Get THREE using the same pattern as main renderer (fail-fast)
    const THREERef = (window.dungeonRenderer && window.dungeonRenderer.THREE) || window.THREE;
    if (!THREERef) {
      throw new Error('THREE.js reference not available - main renderer must be loaded first');
    }

    // Import viewer classes and utilities
    const { Voxel3DViewer } = await import('./utils/voxel-3d-viewer.js');
    const { ViewerControls } = await import('./utils/viewer-controls.js');
    const { StructureMeshPipeline } = await import('./utils/structure-mesh-pipeline.js');
    const { makeMaterialFactory } = await import('../renderer/mesh_factories.js');

    // Create viewer using new class (handles scene, camera, renderer, lighting, axes)
    const viewer = new Voxel3DViewer(canvas, {
      viewerType: 'dialog',
      width: 300,
      height: 300,
      backgroundColor: 0x1a1a1a,
      includeAxisIndicators: true
    });
    
    // Initialize viewer
    const success = await viewer.initialize(THREERef);
    if (!success) {
      throw new Error('Failed to initialize dialog viewer');
    }

    // Create authentic structure mesh using pipeline
    const materialFactory = makeMaterialFactory(THREERef);
    const group = await StructureMeshPipeline.createMeshFromStructure(THREERef, voxelData, { materialFactory });
    
    // Add mesh to viewer
    viewer.setMesh(group);

    // Setup mouse controls using new class
    const controls = new ViewerControls(canvas, viewer, {
      rotationSpeed: 0.01,
      enableRotation: true,
      enableZoom: true,
      clampRotation: true
    });
    controls.enable();

    // Store data for updates (including material factory and controls)
    canvas._editorData = viewer.getViewerData();
    canvas._editorData.controls = controls;
    canvas._editorData.materialFactory = materialFactory;

    // Start render loop
    viewer.startRenderLoop();

    console.log('[StructureEditor3D] Authentic WFC 3D viewer initialized');
  }

  // Update the 3D view when voxel data changes - using pipeline
  async updateStructureEditor3D(modal, voxelData) {
    const canvas = modal.querySelector('#structure-editor-3d');
    if (!canvas || !canvas._editorData) return;

    const { viewer, materialFactory } = canvas._editorData;
    
    // Import pipeline
    const { StructureMeshPipeline } = await import('./utils/structure-mesh-pipeline.js');
    
    try {
      // Update viewer using pipeline utility
      await StructureMeshPipeline.updateViewerWithStructure(viewer, voxelData, materialFactory);
      console.log('[StructureEditor3D] Updated with authentic WFC mesh using pipeline');
    } catch (error) {
      throw new Error(`[StructureEditor3D] Failed to update mesh: ${error.message}`);
    }
  }

  // Note: createStructureMeshDirect and convertToPrototypeFormat methods
  // have been replaced by StructureMeshPipeline utility class
}

// Node.js compatibility guard
if (typeof window !== 'undefined') {
  window.SimplifiedTilesetEditor = SimplifiedTilesetEditor;
  
  console.log('[SimplifiedTilesetEditor] Loaded simplified tileset editor');
}