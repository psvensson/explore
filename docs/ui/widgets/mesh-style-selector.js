/**
 * Mesh Style Selector Widget - Dropdown for selecting visual mesh styles
 * 
 * Allows runtime switching between different mesh generators (voxel cube, low-poly, etc.)
 * with automatic scene regeneration.
 */

import { getWidget } from '../widget-base.js';

export class MeshStyleSelectorWidget extends getWidget() {
  constructor() {
    super({
      name: 'mesh-style-selector',
      template: `
        <div class="mesh-style-selector">
          <label for="mesh-style-dropdown" class="mesh-style-label">
            Visual Style:
          </label>
          <div class="mesh-style-controls">
            <select id="mesh-style-dropdown" 
                    class="mesh-style-dropdown"
                    data-action="select-mesh-style">
              {{#each generators}}
              <option value="{{id}}" {{#if (eq id ../selectedGenerator)}}selected{{/if}}>
                {{name}}
              </option>
              {{/each}}
            </select>
            <button type="button" 
                    class="apply-style-button"
                    data-action="apply-mesh-style"
                    title="Apply selected style and regenerate scene">
              Apply
            </button>
          </div>
          
          {{#if selectedGeneratorInfo}}
          <div class="mesh-style-info">
            <small>{{selectedGeneratorInfo.description}}</small>
          </div>
          {{/if}}
        </div>
      `,
      style: `
        .mesh-style-selector {
          margin-top: 12px;
          padding: 10px;
          background: rgba(11, 21, 34, 0.6);
          border-radius: 6px;
          border: 1px solid #2d4a6b;
        }
        
        .mesh-style-label {
          display: block;
          margin-bottom: 6px;
          font-weight: 500;
          font-size: 13px;
          color: #cfe6ff;
        }
        
        .mesh-style-controls {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        
        .mesh-style-dropdown {
          flex: 1;
          padding: 6px 8px;
          border: 1px solid #2d4a6b;
          border-radius: 4px;
          font-size: 13px;
          background: rgba(11, 21, 34, 0.8);
          color: #cfe6ff;
          cursor: pointer;
        }
        
        .mesh-style-dropdown:focus {
          outline: none;
          border-color: #60A5FA;
          box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2);
        }
        
        .apply-style-button {
          padding: 6px 12px;
          border: 1px solid #2d4a6b;
          border-radius: 4px;
          font-size: 13px;
          background: rgba(37, 99, 235, 0.8);
          color: white;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }
        
        .apply-style-button:hover {
          background: rgba(59, 130, 246, 0.9);
          border-color: #60A5FA;
        }
        
        .apply-style-button:active {
          transform: scale(0.98);
        }
        
        .mesh-style-info {
          margin-top: 6px;
          padding: 6px 8px;
          background: rgba(11, 21, 34, 0.5);
          border-radius: 4px;
          font-size: 12px;
          color: #9ca3af;
        }
      `
    });
    
    this._selectedGenerator = null;
    this._onApplyCallback = null;
  }
  
  /**
   * Initialize widget with generator registry
   * Awaits the global bootstrap promise - no retries, no fallbacks
   */
  async init() {
    console.log('[MeshStyleSelector] init() called');
    
    // Wait for mesh generators to be initialized (part of bootstrap chain)
    if (typeof window !== 'undefined' && window.__meshGeneratorsReady) {
      console.log('[MeshStyleSelector] Awaiting __meshGeneratorsReady promise');
      await window.__meshGeneratorsReady;
      console.log('[MeshStyleSelector] Promise resolved');
    } else {
      console.warn('[MeshStyleSelector] No __meshGeneratorsReady promise found');
    }
    
    // Generators are now guaranteed to be ready
    const { getGeneratorRegistry } = await import('../../renderer/mesh-generators/index.js');
    this._registry = getGeneratorRegistry();
    console.log('[MeshStyleSelector] Registry acquired:', {
      hasRegistry: !!this._registry,
      generatorIds: this._registry ? this._registry.getGeneratorIds() : [],
      activeId: this._registry ? this._registry.getActiveGeneratorId() : null
    });
    
    // Listen for generator changes
    if (typeof window !== 'undefined') {
      window.addEventListener('meshGeneratorChanged', (event) => {
        this._selectedGenerator = event.detail.currentId;
        this.update(this.getData());
      });
    }
    
    // Set initial selected generator
    this._selectedGenerator = this._registry.getActiveGeneratorId();
    console.log('[MeshStyleSelector] Selected generator:', this._selectedGenerator);
  }
  
  /**
   * Get data for template rendering
   */
  getData() {
    console.log('[MeshStyleSelector] getData() called');
    
    const allGens = this._registry.getAllGenerators();
    console.log('[MeshStyleSelector] getAllGenerators() returned:', allGens);
    
    const generators = allGens.map(g => ({
      id: g.id,
      name: g.name,
      description: g.description
    }));
    console.log('[MeshStyleSelector] Mapped generators:', generators);
    
    const selectedId = this._selectedGenerator || this._registry.getActiveGeneratorId();
    const selectedGen = this._registry.getGenerator(selectedId);
    
    const data = {
      generators,
      selectedGenerator: selectedId,
      selectedGeneratorInfo: selectedGen ? {
        description: selectedGen.getDescription()
      } : null
    };
    
    console.log('[MeshStyleSelector] Returning data:', data);
    return data;
  }
  
  /**
   * Handle user actions
   */
  onAction(action, event) {
    switch (action) {
      case 'select-mesh-style':
        this._selectedGenerator = event.target.value;
        this.update(this.getData());
        break;
        
      case 'apply-mesh-style':
        this.applyMeshStyle();
        break;
    }
  }
  
  /**
   * Apply the selected mesh style
   */
  async applyMeshStyle() {
    if (!this._registry || !this._selectedGenerator) {
      console.warn('[MeshStyleSelector] Cannot apply style: registry or selection missing');
      return;
    }
    
    try {
      // Update active generator
      this._registry.setActiveGenerator(this._selectedGenerator);
      
      // Notify callback (e.g., to regenerate scene)
      if (this._onApplyCallback) {
        await this._onApplyCallback(this._selectedGenerator);
      }
      
      // Show success notification
      this.showNotification('Style applied successfully', 'success');
    } catch (err) {
      console.error('[MeshStyleSelector] Failed to apply style:', err);
      this.showNotification('Failed to apply style: ' + err.message, 'error');
    }
  }
  
  /**
   * Set callback for when style is applied
   */
  onApply(callback) {
    this._onApplyCallback = callback;
  }
  
  /**
   * Show a temporary notification
   */
  showNotification(message, type = 'info') {
    const container = this.getRoot();
    if (!container) return;
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `mesh-style-notification mesh-style-notification-${type}`;
    notification.textContent = message;
    
    // Add styles
    notification.style.cssText = `
      position: absolute;
      top: -40px;
      left: 50%;
      transform: translateX(-50%);
      padding: 8px 16px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.3s, top 0.3s;
    `;
    
    container.style.position = 'relative';
    container.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.top = '-50px';
    }, 10);
    
    // Remove after 2.5 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, 2500);
  }
  
  /**
   * Get the currently selected generator ID
   */
  getSelectedGenerator() {
    return this._selectedGenerator;
  }
}

// Node.js compatibility guard
if (typeof window !== 'undefined') {
  // Auto-register widget if in browser
  window.MeshStyleSelectorWidget = MeshStyleSelectorWidget;
}
