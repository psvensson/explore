/**
 * @file map_editor.js
 * Main controller for the interactive map editor.
 * Connects MapEditorState, GridOverlay, and the renderer to provide
 * a complete tile-by-tile dungeon construction interface.
 */

import { MapEditorState } from '../dungeon/map_editor_state.js';
import { GridOverlay } from './utils/grid-overlay.js';
import { highlightInGroup, clearInGroup } from '../renderer/selection_highlight.js';

/**
 * MapEditor - Orchestrates user interaction for manual tile placement
 * 
 * Architecture:
 * - MapEditorState: Data model with undo/redo
 * - GridOverlay: Visual feedback and mouse→grid conversion
 * - Renderer: 3D mesh rendering via editor APIs
 * 
 * Workflow:
 * 1. User clicks canvas → screenToGrid() → grid coordinates
 * 2. PlaceTileCommand created → state.execute()
 * 3. For each placed tile → renderer.renderEditorTile()
 * 4. Undo → state.undo() → renderer.removeEditorTile()
 */
export class MapEditor {
  /**
   * @param {HTMLElement} container - Parent element for UI controls
   * @param {Object} renderer - Dungeon renderer instance with editor APIs
   * @param {Object} THREE - Three.js library reference
   */
  constructor(container, renderer, THREE) {
    this.container = container;
    this.renderer = renderer;
    this.THREE = THREE;
    
    this.state = new MapEditorState();
    this.overlay = null;
    
    this.isActive = false;
    this.currentLayer = 0; // Y coordinate (0=floor, 1=mid, 2=ceiling)
    this.currentStructureId = null; // Selected tile from palette
    this.currentRotation = 0; // 0, 90, 180, 270
    
    // UI elements (created in createUI)
    this.canvas = null;
    this.controls = null;
    this.palette = null;
    
    // Mouse tracking
    this.mouseX = 0;
    this.mouseY = 0;
    this.hoveredGrid = null; // {x, z} or null
    
    // Bind event handlers
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseClick = this.handleMouseClick.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleScroll = this.handleScroll.bind(this);
  }
  
  /**
   * Initialize the editor UI and activate editor mode
   */
  async initialize() {
    console.log('[MapEditor] Starting initialization...');
    this.createUI();
    console.log('[MapEditor] UI created');
    this.setupEventListeners();
    console.log('[MapEditor] Event listeners set up');
    await this.loadDefaultStructures();
    console.log('[MapEditor] Default structures loaded');
    this.activate();
    console.log('[MapEditor] Editor activated');
  }
  
  /**
   * Create HTML structure for editor controls
   */
  createUI() {
    this.container.innerHTML = `
      <div class="map-editor-layout" style="display: flex; height: 100%; width: 100%;">
        <div class="map-editor-palette" style="flex: 0 0 50%; overflow-y: auto; border-right: 1px solid #444; background: #1e1e1e; color: #fff;">
          <h3 style="margin: 10px; font-size: 16px;">Tile Palette</h3>
          <div id="tile-palette-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 8px; padding: 10px;"></div>
          <div style="padding: 10px; font-size: 14px; color: #ccc;">
            <h4 style="margin-top: 20px; color: #fff;">🧭 How to Use the Map Editor</h4>
            <ul style="line-height: 1.6;">
              <li>Select a tile from the palette on the left.</li>
              <li>Click on the 3D grid area to place the tile.</li>
              <li>Use <b>Shift+Click</b> or right-click to remove a tile.</li>
              <li>Use the <b>Layer</b> buttons to switch between floor, mid, and ceiling levels.</li>
              <li>Use the <b>Rotation</b> buttons or press <b>R</b> to rotate tiles.</li>
              <li>Use <b>Undo</b> / <b>Redo</b> to revert or reapply changes.</li>
              <li>Click <b>Save Map</b> to export your layout as JSON.</li>
              <li>Click <b>Load Map</b> to import a saved layout.</li>
            </ul>
          </div>
        </div>
        
        <div class="map-editor-viewport" style="flex: 0 0 50%; display: flex; flex-direction: column; background: #000; position: relative;">
          <div class="map-editor-3dview" style="flex: 1; position: relative; overflow: hidden;">
            <div id="scene-viewer-container" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; min-height: 400px; z-index: 0;"></div>
            <canvas id="grid-overlay-canvas" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 10; pointer-events: all;"></canvas>
          </div>

          <div class="map-editor-controls" style="flex: 0 0 auto; background: rgba(0,0,0,0.6); padding: 10px; border-radius: 6px; color: #fff; z-index: 20; display: flex; flex-wrap: wrap; gap: 8px; max-width: 95%; overflow-y: auto; margin: 10px;">
            <div class="control-group" style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px;">
              <label style="font-weight: bold;">Layer</label>
              <div>
                <button id="layer-down">↓</button>
                <span id="layer-display">1 (Floor)</span>
                <button id="layer-up">↑</button>
              </div>
            </div>

            <div class="control-group" style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px;">
              <label style="font-weight: bold;">Tile Rotation</label>
              <div>
                <button id="rotate-left">↶</button>
                <span id="rotation-display">0°</span>
                <button id="rotate-right">↷</button>
              </div>
            </div>

            <div class="control-group" style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px;">
              <label style="font-weight: bold;">Map Actions</label>
              <div>
                <button id="undo-btn">Undo (Ctrl+Z)</button>
                <button id="redo-btn">Redo (Ctrl+Y)</button>
                <button id="clear-btn">Clear All</button>
              </div>
            </div>

            <div class="control-group" style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px;">
              <label style="font-weight: bold;">File</label>
              <div>
                <button id="save-btn">Save Map</button>
                <button id="load-btn">Load Map</button>
              </div>
            </div>

            <div class="control-group" style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px;">
              <label style="font-weight: bold;">Map Rotation</label>
              <div>
                <button id="rotate-map-btn">Rotate Map ↻ (O)</button>
              </div>
            </div>

            <div class="control-group" style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px;">
              <label style="font-weight: bold;">Mode</label>
              <div>
                <button id="mode-toggle-btn">Switch to Rotate Mode (M)</button>
              </div>
            </div>
          </div>
          
          <div class="map-editor-status">
            <span id="cursor-position">Position: -</span>
            <span id="tile-count">Tiles: 0</span>
          </div>
        </div>
      </div>
    `;
    
    this.canvas = document.getElementById('grid-overlay-canvas');
    this.palette = document.getElementById('tile-palette-grid');
    this.controls = {
      layerDown: document.getElementById('layer-down'),
      layerUp: document.getElementById('layer-up'),
      layerDisplay: document.getElementById('layer-display'),
      rotateLeft: document.getElementById('rotate-left'),
      rotateRight: document.getElementById('rotate-right'),
      rotationDisplay: document.getElementById('rotation-display'),
      undo: document.getElementById('undo-btn'),
      redo: document.getElementById('redo-btn'),
      clear: document.getElementById('clear-btn'),
      save: document.getElementById('save-btn'),
      load: document.getElementById('load-btn'),
      cursorPosition: document.getElementById('cursor-position'),
      tileCount: document.getElementById('tile-count')
    };
    
    console.log('[MapEditor] DOM elements found:', {
      canvas: !!this.canvas,
      palette: !!this.palette,
      allControlsFound: Object.values(this.controls).every(c => !!c)
    });
    
    if (this.canvas) {
      const rect = this.canvas.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(this.canvas);
      console.log('[MapEditor] Canvas details:', {
        width: this.canvas.width,
        height: this.canvas.height,
        offsetWidth: this.canvas.offsetWidth,
        offsetHeight: this.canvas.offsetHeight,
        boundingRect: { width: rect.width, height: rect.height, top: rect.top, left: rect.left },
        display: computedStyle.display,
        position: computedStyle.position,
        zIndex: computedStyle.zIndex,
        pointerEvents: computedStyle.pointerEvents,
        visibility: computedStyle.visibility,
        opacity: computedStyle.opacity,
        parent: this.canvas.parentElement?.id
      });
    }
    
    // Initialize GridOverlay
    console.log('[MapEditor] Creating GridOverlay with:', {
      canvas: !!this.canvas,
      camera: !!this.renderer.camera,
      THREE: !!this.THREE
    });
    
    // Move overlay canvas inside the scene-viewer-container to share stacking context with renderer
    const sceneContainer = document.getElementById('scene-viewer-container');
    if (sceneContainer && this.canvas && !sceneContainer.contains(this.canvas)) {
      sceneContainer.appendChild(this.canvas);
      console.log('[MapEditor] Moved overlay canvas inside scene-viewer-container');
    }

    // Apply proper z-index and pointer settings
    this.canvas.style.zIndex = '10';
    this.canvas.style.pointerEvents = 'all';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';

    console.log('[MapEditor] Canvas parent after insertion:', this.canvas.parentElement?.id);

    // Ensure renderer DOM element is available before creating overlay
    const rendererDom = this.renderer?.domElement || this.renderer?.renderer?.domElement;
    if (!rendererDom) {
      console.warn('[MapEditor] ⚠️ Renderer DOM element not found — GridOverlay may misalign.');
    } else {
      console.log('[MapEditor] ✅ Renderer DOM element found:', rendererDom);
    }

    this.overlay = new GridOverlay(
      this.canvas,
      this.renderer.camera,
      this.THREE,
      { domElement: rendererDom }
    );
    console.log('[MapEditor] GridOverlay created with verified renderer reference for alignment');
    this.overlay.currentLayer = this.currentLayer;
    
    console.log('[MapEditor] GridOverlay created');
  }
  
  /**
   * Attach event listeners to UI controls and canvas
   */
  setupEventListeners() {
    // Layer controls
    this.controls.layerDown.addEventListener('click', () => {
      if (this.currentLayer > 0) {
        this.currentLayer--;
        this.updateLayerDisplay();
        this.overlay.setLayer(this.currentLayer);
        this.overlay.render();
      }
    });
    
    this.controls.layerUp.addEventListener('click', () => {
      if (this.currentLayer < 2) {
        this.currentLayer++;
        this.updateLayerDisplay();
        this.overlay.setLayer(this.currentLayer);
        this.overlay.render();
      }
    });
    
    // Rotation controls
    this.controls.rotateLeft.addEventListener('click', () => {
      this.currentRotation = (this.currentRotation - 90 + 360) % 360;
      this.updateRotationDisplay();
    });
    
    this.controls.rotateRight.addEventListener('click', () => {
      this.currentRotation = (this.currentRotation + 90) % 360;
      this.updateRotationDisplay();
    });
    
    // Undo/Redo
    this.controls.undo.addEventListener('click', () => this.undo());
    this.controls.redo.addEventListener('click', () => this.redo());
    
    // Clear/Save/Load
    this.controls.clear.addEventListener('click', () => this.clearAll());
    this.controls.save.addEventListener('click', () => this.saveMap());
    this.controls.load.addEventListener('click', () => this.loadMap());
    
    // Canvas interaction
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('click', this.handleMouseClick);

    // Zoom controls (mouse wheel) - delegate to renderer camera controller
    this.canvas.addEventListener('wheel', (event) => {
      event.preventDefault();
      if (this.renderer && typeof this.renderer.zoomByWheel === 'function') {
        this.renderer.zoomByWheel(event, { step: 5 });
      } else {
        // Fallback: direct camera move along view direction
        const delta = Math.sign(event.deltaY);
        const zoomStep = 5;
        const camera = this.renderer && this.renderer.camera;
        if (camera) {
          const direction = new this.THREE.Vector3();
          camera.getWorldDirection(direction);
          camera.position.addScaledVector(direction, delta * zoomStep);
        }
      }
    });

    // Mode toggle: placement vs rotation
    this.mode = 'placement';
    const modeButton = document.createElement('button');
    modeButton.textContent = 'Switch to Rotate Mode';
    modeButton.style.position = 'absolute';
    modeButton.style.top = '10px';
    modeButton.style.right = '10px';
    modeButton.style.zIndex = '30';
    modeButton.style.padding = '8px 12px';
    modeButton.style.background = '#333';
    modeButton.style.color = '#fff';
    modeButton.style.border = '1px solid #666';
    modeButton.style.borderRadius = '4px';
    modeButton.style.cursor = 'pointer';
    this.container.appendChild(modeButton);

    // Add map rotation button
    const rotateMapButton = document.createElement('button');
    rotateMapButton.textContent = 'Rotate Map ↻';
    rotateMapButton.style.position = 'absolute';
    rotateMapButton.style.top = '50px';
    rotateMapButton.style.right = '10px';
    rotateMapButton.style.zIndex = '30';
    rotateMapButton.style.padding = '8px 12px';
    rotateMapButton.style.background = '#333';
    rotateMapButton.style.color = '#fff';
    rotateMapButton.style.border = '1px solid #666';
    rotateMapButton.style.borderRadius = '4px';
    rotateMapButton.style.cursor = 'pointer';
    this.container.appendChild(rotateMapButton);

    rotateMapButton.addEventListener('click', () => {
      this.rotateEntireMap();
    });

    modeButton.addEventListener('click', () => {
      this.mode = this.mode === 'placement' ? 'rotation' : 'placement';
      modeButton.textContent = this.mode === 'placement' ? 'Switch to Rotate Mode' : 'Switch to Placement Mode';
      console.log('[MapEditor] Mode switched:', this.mode);
    });

    // Keyboard shortcut for mode toggle (M)
    window.addEventListener('keydown', (event) => {
      if (event.key.toLowerCase() === 'm') {
        this.mode = this.mode === 'placement' ? 'rotation' : 'placement';
        modeButton.textContent = this.mode === 'placement' ? 'Switch to Rotate Mode' : 'Switch to Placement Mode';
        console.log('[MapEditor] Mode switched via shortcut:', this.mode);
      }
      if (event.key.toLowerCase() === 'o') {
        this.rotateEntireMap();
      }
    });

    // Tile selection for rotation or placement
    this.canvas.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      if (!this.hoveredGrid) return;
      const { x, z } = this.hoveredGrid;
      const y = this.currentLayer;
      const existingTile = this.state.getTile(x, y, z);

      if (this.mode === 'rotation' && existingTile) {
        this.currentStructureId = existingTile.structureId;
        this.currentRotation = (existingTile.rotation + 90) % 360;
        this.state.removeTile(x, y, z);
        this.renderer.removeEditorTile(existingTile.id);
        const rotatedTile = this.state.placeTile(x, y, z, this.currentStructureId, this.currentRotation);
        this.renderer.renderEditorTile(rotatedTile);
        this.updateRotationDisplay();
        console.log('[MapEditor] Rotated existing tile:', rotatedTile);
      } else if (this.mode === 'placement' && existingTile) {
        this.currentStructureId = existingTile.structureId;
        console.log('[MapEditor] Selected existing tile for placement:', existingTile);
      }
    });
    
    // Keyboard shortcuts
    window.addEventListener('keydown', this.handleKeyPress);
    
    // Resize and scroll handling
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('scroll', this.handleScroll);
  }
  
  /**
   * Load default tile structures into palette
   */
  async loadDefaultStructures() {
    // Load from single source of truth: DEFAULT_TILE_STRUCTURES
    const { DEFAULT_TILE_STRUCTURES } = await import('../dungeon/defaults/default_tile_structures.js');
    this.palette.innerHTML = '';

    // Convert structures into displayable entries
    const entries = Object.entries(DEFAULT_TILE_STRUCTURES);
    const validStructures = entries.map(([id, structure]) => ({
      id,
      name: structure.name || id,
      description: structure.type ? `Type: ${structure.type}` : 'No description'
    }));

    console.log('[MapEditor] Default structures loaded:', validStructures.length);

    if (validStructures.length === 0) {
      const msg = document.createElement('div');
      msg.textContent = '⚠️ No valid default tiles found.';
      msg.style.color = '#ccc';
      msg.style.padding = '10px';
      this.palette.appendChild(msg);
      return;
    }

    for (const structure of validStructures) {
      const button = document.createElement('button');
      button.className = 'palette-tile';
      button.dataset.structureId = structure.id;
      button.textContent = structure.name;
      button.title = `ID: ${structure.id}\n${structure.description}`;
      button.style.whiteSpace = 'normal';
      button.style.wordBreak = 'break-word';
      button.style.overflow = 'visible';
      button.style.textOverflow = 'unset';
      button.style.minHeight = '40px';
      button.style.fontSize = '13px';

      button.addEventListener('click', () => {
        this.selectStructure(structure.id);
        this.palette.querySelectorAll('.palette-tile').forEach(b => b.classList.remove('selected'));
        button.classList.add('selected');
        console.log('[MapEditor] Tile selected:', structure);
      });

      this.palette.appendChild(button);
    }

    // Auto-select first tile
    const firstButton = this.palette.querySelector('.palette-tile');
    if (firstButton) {
      firstButton.click();
    }
  }
  
  /**
   * Activate editor mode
   */
  activate() {
    if (this.isActive) {
      console.log('[MapEditor] Already active, skipping activation');
      return;
    }

    console.log('[MapEditor] Activating editor mode...');
    this.isActive = true;
    this.renderer.setEditorMode(true);
    console.log('[MapEditor] Renderer editor mode set to true');

    // Sync canvas size with renderer
    this.resizeCanvas();
    console.log('[MapEditor] Canvas resized');

    // Show and render overlay grid
    if (this.overlay) {
      this.overlay.show();
      this.overlay.render();
      console.log('[MapEditor] Overlay shown and rendered');
    }

    // Diagnostic logging for layout alignment
    const viewRect = this.container.querySelector('.map-editor-3dview')?.getBoundingClientRect();
    const sceneRect = document.getElementById('scene-viewer-container')?.getBoundingClientRect();
    const canvasRect = this.canvas?.getBoundingClientRect();
    console.log('[MapEditor] Layout diagnostics:', {
      viewRect,
      sceneRect,
      canvasRect
    });

    // Ensure pointer events only active when editor is active
    if (this.canvas) {
      this.canvas.style.pointerEvents = this.isActive ? 'all' : 'none';
    }

    // Re-render all existing tiles
    this.syncRendererWithState();
    console.log('[MapEditor] State synced with renderer');
  }
  
  /**
   * Deactivate editor mode and return to normal view
   */
  deactivate() {
    if (!this.isActive) return;

    console.log('[MapEditor] Deactivating editor mode...');
    this.isActive = false;
    this.renderer.setEditorMode(false);

    if (this.overlay) {
      if (typeof this.overlay.hide === 'function') {
        console.log('[MapEditor] Hiding overlay...');
        this.overlay.hide();
      } else {
        console.warn('[MapEditor] Overlay.hide() not found, attempting manual clear');
        if (this.overlay.ctx && this.overlay.canvas) {
          this.overlay.ctx.clearRect(0, 0, this.overlay.canvas.width, this.overlay.canvas.height);
        } else {
          console.error('[MapEditor] Overlay has no context or canvas');
        }
      }
    } else {
      console.error('[MapEditor] No overlay instance found during deactivate()');
    }

    console.log('[MapEditor] Editor mode deactivated');
  }
  
  /**
   * Select a structure from the palette
   */
  selectStructure(structureId) {
    this.currentStructureId = structureId;
  }
  
  /**
   * Handle mouse move over canvas
   */
  handleMouseMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = event.clientX - rect.left;
    this.mouseY = event.clientY - rect.top;
    
    // Log first few events only
    if (!this._mouseMoveCount) this._mouseMoveCount = 0;
    if (this._mouseMoveCount < 3) {
      console.log('[MapEditor] Mouse move event:', {
        clientX: event.clientX,
        clientY: event.clientY,
        rectLeft: rect.left,
        rectTop: rect.top,
        mouseX: this.mouseX,
        mouseY: this.mouseY,
        overlayExists: !!this.overlay,
        overlayScreenToGrid: typeof this.overlay.screenToGrid
      });
      this._mouseMoveCount++;
    }
    
    const gridPos = this.overlay.screenToGrid(this.mouseX, this.mouseY);
    this.hoveredGrid = gridPos;
    
    if (this._mouseMoveCount < 3) {
      console.log('[MapEditor] Grid position result:', gridPos);
    }
    
    if (gridPos) {
      this.controls.cursorPosition.textContent = `Position: (${gridPos.x}, ${this.currentLayer}, ${gridPos.z})`;
    } else {
      this.controls.cursorPosition.textContent = 'Position: -';
    }
    
    // Update overlay with hover feedback
    this.overlay.hoveredCell = gridPos;
    this.overlay.render();
  }
  
  /**
   * Clear any current highlight
   */
  clearHighlight() {
    if (this.selectedTileId && this.renderer && this.renderer.editorTiles) {
      clearInGroup(this.renderer.editorTiles, this.selectedTileId);
    }
    this.selectedTileId = null;
    this.selectedTile = null;
  }

  /**
   * Handle click to place/remove/select tile
   */
  handleMouseClick(event) {
    // Prevent clicks on UI elements (palette, controls) from placing tiles
    const clickedElement = document.elementFromPoint(event.clientX, event.clientY);
    if (clickedElement && (
      clickedElement.closest('.map-editor-palette') ||
      clickedElement.closest('.map-editor-controls')
    )) {
      console.log('[MapEditor] Click ignored (UI element detected):', clickedElement.className);
      return;
    }

    if (!this.hoveredGrid) return;
    const { x, z } = this.hoveredGrid;
    const y = this.currentLayer;
    const existingTile = this.state.getTile(x, y, z);

    if (existingTile) {
      // Selecting an existing tile
      this.highlightTile(existingTile);
      return;
    }

    // Clicking empty space or placing a new tile clears highlight
    this.clearHighlight();

    if (!this.currentStructureId) return;

    if (this.isRemoveAction(event)) {
      this.removeTileIfExists(existingTile, x, y, z);
    } else {
      this.placeOrReplaceTile(existingTile, x, y, z);
    }
  }

  isRemoveAction(event) {
    return event.shiftKey || event.button === 2;
  }

  removeTileIfExists(existingTile, x, y, z) {
    if (!existingTile) return;
    this.state.removeTile(x, y, z);
    this.renderer.removeEditorTile(existingTile.id);
    this.updateTileCount();
    // Clear highlight after removing a tile
    this.clearHighlight();
  }

  placeOrReplaceTile(existingTile, x, y, z) {
    // Prevent duplicate placement at same coordinates
    const duplicateTile = this.state.getTile(x, y, z);
    if (duplicateTile) {
      console.warn('[MapEditor] Tile already exists at this position, skipping placement:', { x, y, z, duplicateTile });
      return;
    }

    const tile = this.state.placeTile(x, y, z, this.currentStructureId, this.currentRotation);
    this.renderer.renderEditorTile(tile);
    this.updateTileCount();

    // Log all current tile positions for debugging
    const allTiles = this.state.getAllTiles();
    console.log('[MapEditor] Current tile positions:', allTiles.map(t => t.position));

    // Immediately highlight the newly placed tile
    this.highlightTile(tile);
  }

  /**
   * Remove duplicate tiles occupying the same grid position
   */
  removeDuplicateTiles() {
    const seen = new Set();
    const duplicates = [];
    for (const tile of this.state.getAllTiles()) {
      const key = `${tile.position.x},${tile.position.y},${tile.position.z}`;
      if (seen.has(key)) {
        duplicates.push(tile);
      } else {
        seen.add(key);
      }
    }
    duplicates.forEach(t => {
      this.renderer.removeEditorTile(t.id);
      console.log('[MapEditor] Removed duplicate tile:', t.id, t.position);
    });
    console.log('[MapEditor] Duplicate removal complete. Total removed:', duplicates.length);
  }
  
  /**
   * Enable interactive map rotation mode
   */
  rotateEntireMap() {
    console.log('[MapEditor] Entering interactive map rotation mode...');
    this.isRotatingMap = true;
    this.rotationStart = null;
    this.initialCameraRotation = this.renderer.camera.rotation.y;

    const onMouseMove = (event) => {
      if (!this.isRotatingMap || !this.rotationStart) return;
      const deltaX = event.clientX - this.rotationStart.x;
      const rotationSpeed = 0.005;
      this.renderer.camera.rotation.y = this.initialCameraRotation + deltaX * rotationSpeed;
      this.renderer.render();
    };

    const onMouseDown = (event) => {
      if (!this.isRotatingMap) return;
      this.rotationStart = { x: event.clientX, y: event.clientY };
    };

    const onMouseUp = () => {
      if (!this.isRotatingMap) return;
      this.isRotatingMap = false;
      this.rotationStart = null;
      console.log('[MapEditor] Exiting map rotation mode.');
      this.canvas.removeEventListener('mousemove', onMouseMove);
      this.canvas.removeEventListener('mousedown', onMouseDown);
      this.canvas.removeEventListener('mouseup', onMouseUp);
    };

    this.canvas.addEventListener('mousemove', onMouseMove);
    this.canvas.addEventListener('mousedown', onMouseDown);
    this.canvas.addEventListener('mouseup', onMouseUp);
  }

  /**
   * Highlight a selected tile
   */
  highlightTile(tile) {
    if (!tile) return;
    this.clearHighlight();
    if (this.renderer && this.renderer.editorTiles) {
      highlightInGroup(this.renderer.editorTiles, tile.id, { color: 0x00ff00 });
      this.selectedTileId = tile.id;
      this.selectedTile = tile;
    }
  }

  /**
   * Handle keyboard shortcuts
   */
  handleKeyPress(event) {
    if (!this.isActive) return;
    
    if (event.ctrlKey || event.metaKey) {
      if (event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        this.undo();
      } else if (event.key === 'y' || (event.key === 'z' && event.shiftKey)) {
        event.preventDefault();
        this.redo();
      }
    }
    
    // Layer shortcuts
    if (event.key === '[' && this.currentLayer > 0) {
      this.currentLayer--;
      this.updateLayerDisplay();
      this.overlay.setLayer(this.currentLayer);
      this.overlay.render();
    } else if (event.key === ']' && this.currentLayer < 2) {
      this.currentLayer++;
      this.updateLayerDisplay();
      this.overlay.setLayer(this.currentLayer);
      this.overlay.render();
    }
    
    // Rotation shortcuts
    if (event.key === 'r') {
      this.currentRotation = (this.currentRotation + 90) % 360;
      this.updateRotationDisplay();
    } else if (event.key === 'R' && event.shiftKey) {
      this.currentRotation = (this.currentRotation - 90 + 360) % 360;
      this.updateRotationDisplay();
    }
  }
  
  /**
   * Undo last operation
   */
  undo() {
    const undone = this.state.undo();
    if (undone) {
      this.syncRendererWithState();
    }
  }
  
  /**
   * Redo last undone operation
   */
  redo() {
    const redone = this.state.redo();
    if (redone) {
      this.syncRendererWithState();
    }
  }
  
  /**
   * Clear all tiles
   */
  clearAll() {
    if (confirm('Clear all placed tiles?')) {
      this.state.clearAll();
      this.renderer.clearEditorTiles();
      this.updateTileCount();
    }
  }
  
  /**
   * Save current map to JSON file
   */
  saveMap() {
    const json = this.state.serialize();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `dungeon-map-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }
  
  /**
   * Load map from JSON file
   */
  loadMap() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    
    input.addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      const text = await file.text();
      try {
        this.state.deserialize(text);
        this.syncRendererWithState();
        this.updateTileCount();
      } catch (err) {
        alert('Failed to load map: ' + err.message);
      }
    });
    
    input.click();
  }
  
  /**
   * Synchronize renderer with current state (after undo/redo/load)
   */
  async syncRendererWithState() {
    this.renderer.clearEditorTiles();
    
    const allTiles = this.state.getAllTiles();
    for (const tile of allTiles) {
      await this.renderer.renderEditorTile(tile);
    }
    
    this.updateTileCount();
  }
  
  /**
   * Update layer display text
   */
  updateLayerDisplay() {
    const layerNames = ['1 (Floor)', '2 (Mid)', '3 (Ceiling)'];
    this.controls.layerDisplay.textContent = layerNames[this.currentLayer] || this.currentLayer;
  }
  
  /**
   * Update rotation display text
   */
  updateRotationDisplay() {
    this.controls.rotationDisplay.textContent = `${this.currentRotation}°`;
  }
  
  /**
   * Update tile count display
   */
  updateTileCount() {
    const count = this.state.getAllTiles().length;
    this.controls.tileCount.textContent = `Tiles: ${count}`;
  }
  
  /**
   * Resize canvas to match renderer viewport
   */
  resizeCanvas() {
    // Deprecated: rely on CSS layout for automatic scaling
    console.log('[MapEditor] resizeCanvas() skipped — using CSS-based layout scaling');
  }
  
  /**
   * Handle window resize or scroll
   */
  handleResize() {
    if (this.isActive) {
      this.resizeCanvas();
    }
  }
  
  /**
   * Handle window scroll (to reposition fixed canvas)
   */
  handleScroll() {
    if (this.isActive) {
      this.resizeCanvas();
    }
  }
  
  /**
   * Cleanup resources
   */
  destroy() {
    this.deactivate();

    // Remove global listeners
    window.removeEventListener('keydown', this.handleKeyPress);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('scroll', this.handleScroll);

    // Remove canvas listeners
    if (this.canvas) {
      this.canvas.removeEventListener('mousemove', this.handleMouseMove);
      this.canvas.removeEventListener('click', this.handleMouseClick);
      this.canvas.removeEventListener('contextmenu', e => e.preventDefault());
    }

    // Remove control listeners
    if (this.controls) {
      Object.values(this.controls).forEach(ctrl => {
        if (ctrl && ctrl.removeEventListener) {
          const clone = ctrl.cloneNode(true);
          ctrl.parentNode.replaceChild(clone, ctrl);
        }
      });
    }

    // Remove palette listeners
    if (this.palette) {
      this.palette.querySelectorAll('.palette-tile').forEach(btn => {
        const clone = btn.cloneNode(true);
        btn.parentNode.replaceChild(clone, btn);
      });
    }

    if (this.overlay) {
      this.overlay.destroy();
    }
  }
}

// Browser check for direct usage
if (typeof window !== 'undefined') {
  window.MapEditor = MapEditor;
}
