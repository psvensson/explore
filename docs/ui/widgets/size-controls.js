/**
 * Size Controls Widget - Dungeon dimensions input
 */

import { getWidget } from '../widget-base.js';

const Widget = getWidget();

class SizeControlsWidget extends Widget {
    constructor() {
        super({
            name: 'size-controls',
            template: `
                <div class="size-controls">
                    <div class="size-controls-title">Dungeon Size</div>
                    <div class="size-inputs">
                        <label class="size-input-group">
                            Width
                            <input type="number" 
                                   value="{{width}}" 
                                   min="1" 
                                   max="20"
                                   data-size="x"
                                   class="size-input" />
                        </label>
                        <label class="size-input-group">
                            Height
                            <input type="number" 
                                   value="{{height}}" 
                                   min="1" 
                                   max="10"
                                   data-size="y"
                                   class="size-input" />
                        </label>
                        <label class="size-input-group">
                            Length
                            <input type="number" 
                                   value="{{length}}" 
                                   min="1" 
                                   max="20"
                                   data-size="z"
                                   class="size-input" />
                        </label>
                    </div>
                </div>
            `,
            style: `
                .size-controls {
                    margin-top: 8px;
                }
                
                .size-controls-title {
                    font-weight: 600;
                    margin-bottom: 6px;
                    font-size: 14px;
                }
                
                .size-inputs {
                    display: flex;
                    gap: 12px;
                    flex-wrap: wrap;
                }
                
                .size-input-group {
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                    font-size: 12px;
                    font-weight: 500;
                }
                
                .size-input {
                    width: 60px;
                    padding: 4px 6px;
                    border: 1px solid #ddd;
                    border-radius: 3px;
                    font-size: 13px;
                }
                
                .size-input:focus {
                    outline: none;
                    border-color: #4a90e2;
                    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
                }
            `
        });
        
        this.state = { 
            width: 6, 
            height: 3, 
            length: 6 
        };
        
        console.log('[SizeControls] Widget initialized with defaults:', this.state);
    }
    
    ready() {
        console.log('[SizeControls] Widget ready, state:', this.state);
    }

    onRender() {
        // Set up change listeners for size inputs
        const inputs = this.el.querySelectorAll('.size-input');
        inputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const dimension = e.target.getAttribute('data-size');
                const value = parseInt(e.target.value, 10);
                
                if (value >= 1) {
                    if (dimension === 'x') this.update({ width: value });
                    else if (dimension === 'y') this.update({ height: value });
                    else if (dimension === 'z') this.update({ length: value });
                    
                    // Emit size change event for parent widgets
                    this.emit('size-changed', {
                        x: this.state.width,
                        y: this.state.height,
                        z: this.state.length
                    });
                }
            });
        });
    }

    // Get current size values
    getSize() {
        return {
            x: this.state.width,
            y: this.state.height,
            z: this.state.length
        };
    }

    // Set size values programmatically
    setSize(width, height, length) {
        this.update({ width, height, length });
    }
}

// Register with Widget.js if available (browser environment)
if (typeof window !== 'undefined' && window.Widget && window.Widget.define) {
    window.Widget.define('size-controls', SizeControlsWidget);
}

export { SizeControlsWidget };