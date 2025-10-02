/**
 * Advanced Options Widget - WFC algorithm parameters
 */

import { getWidget } from '../widget-base.js';

export class AdvancedOptionsWidget extends getWidget() {
    constructor() {
        super({
            name: 'advanced-options',
            template: `
                <div class="advanced-options">
                    <div class="advanced-options-header">
                        <span class="advanced-options-title">Advanced Options</span>
                        <button type="button" 
                                class="toggle-advanced" 
                                data-action="toggle-advanced">
                            {{#if showAdvanced}}▼{{else}}▶{{/if}}
                        </button>
                    </div>
                    
                    {{#if showAdvanced}}
                    <div class="advanced-options-content">
                        <div class="advanced-grid">
                            <label class="advanced-input-group">
                                yieldEvery
                                <input type="number" 
                                       value="{{yieldEvery}}" 
                                       min="1" 
                                       max="5000"
                                       data-param="yieldEvery"
                                       class="advanced-input" />
                            </label>
                            
                            <label class="advanced-input-group">
                                maxSteps
                                <input type="number" 
                                       value="{{maxSteps}}" 
                                       min="100" 
                                       max="100000"
                                       data-param="maxSteps"
                                       class="advanced-input" />
                            </label>
                            
                            <label class="advanced-input-group">
                                stallTimeoutMs
                                <input type="number" 
                                       value="{{stallTimeoutMs}}" 
                                       min="1000" 
                                       max="300000"
                                       data-param="stallTimeoutMs"
                                       class="advanced-input" />
                            </label>
                            
                            <label class="advanced-input-group">
                                maxYields
                                <input type="number" 
                                       value="{{maxYields}}" 
                                       min="1" 
                                       max="200"
                                       data-param="maxYields"
                                       class="advanced-input" />
                            </label>
                        </div>
                        
                        <div class="checkbox-options">
                            <label class="checkbox-group">
                                <input type="checkbox" 
                                       {{#if centerSeed}}checked{{/if}}
                                       data-param="centerSeed"
                                       class="advanced-checkbox" />
                                Center Seed
                            </label>
                            <span class="checkbox-hint">Grow from center</span>
                        </div>
                    </div>
                    {{/if}}
                </div>
            `,
            style: `
                .advanced-options {
                    margin-top: 12px;
                    padding: 8px;
                    background: rgba(15, 39, 64, 0.5);
                    border-radius: 4px;
                    border: 1px solid #2d4a6b;
                }
                
                .advanced-options-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: pointer;
                }
                
                .advanced-options-title {
                    font-weight: 500;
                    font-size: 13px;
                    color: #cfe6ff;
                }
                
                .toggle-advanced {
                    background: none;
                    border: none;
                    font-size: 12px;
                    cursor: pointer;
                    padding: 2px 4px;
                    color: #60A5FA;
                }
                
                .advanced-options-content {
                    margin-top: 8px;
                    animation: slideDown 0.2s ease-out;
                }
                
                .advanced-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 8px 12px;
                    margin-bottom: 8px;
                }
                
                .advanced-input-group {
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                    font-size: 11px;
                    font-weight: 500;
                    color: #cfe6ff;
                }
                
                .advanced-input {
                    width: 70px;
                    padding: 3px 5px;
                    border: 1px solid #2d4a6b;
                    border-radius: 3px;
                    font-size: 12px;
                    background: rgba(11, 21, 34, 0.8);
                    color: #cfe6ff;
                }
                
                .advanced-input:focus {
                    outline: none;
                    border-color: #60A5FA;
                    box-shadow: 0 0 0 1px rgba(96, 165, 250, 0.2);
                }
                
                .checkbox-options {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 12px;
                    color: #cfe6ff;
                }
                
                .checkbox-group {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    cursor: pointer;
                    color: #cfe6ff;
                }
                
                .advanced-checkbox {
                    accent-color: #60A5FA;
                }
                
                .checkbox-hint {
                    font-size: 10px;
                    color: rgba(207, 230, 255, 0.7);
                }
                
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        max-height: 0;
                    }
                    to {
                        opacity: 1;
                        max-height: 200px;
                    }
                }
            `
        });
        
        this.state = { 
            showAdvanced: false,
            yieldEvery: 500,
            maxSteps: 30000,
            stallTimeoutMs: 60000,
            maxYields: 50,
            centerSeed: true
        };
    }

    onRender() {
        // Handle toggle advanced options
        this.element.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="toggle-advanced"]') || 
                e.target.closest('.advanced-options-header')) {
                this.setState({ showAdvanced: !this.state.showAdvanced });
            }
        });

        // Handle parameter changes
        const inputs = this.element.querySelectorAll('.advanced-input, .advanced-checkbox');
        inputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const param = e.target.getAttribute('data-param');
                let value = e.target.type === 'checkbox' ? e.target.checked : 
                           parseInt(e.target.value, 10);
                
                if (param && (e.target.type === 'checkbox' || value >= parseInt(e.target.min || 0))) {
                    this.setState({ [param]: value });
                    
                    // Emit parameter change event
                    this.emit('advanced-changed', {
                        [param]: value,
                        all: this.getAdvancedOptions()
                    });
                }
            });
        });
    }

    // Get all advanced options
    getAdvancedOptions() {
        return {
            yieldEvery: this.state.yieldEvery,
            maxSteps: this.state.maxSteps,
            stallTimeoutMs: this.state.stallTimeoutMs,
            maxYields: this.state.maxYields,
            centerSeed: this.state.centerSeed
        };
    }

    // Set advanced options programmatically
    setAdvancedOptions(options) {
        this.setState({ ...options });
    }
}

// Register widget
if (typeof window !== 'undefined') {
    getWidget().define('advanced-options', AdvancedOptionsWidget);
}