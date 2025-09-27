/**
 * Generation Actions Widget - Generate and cancel buttons
 */

import { getWidget } from '../widget-base.js';

export class GenerationActionsWidget extends getWidget() {
    constructor() {
        super({
            name: 'generation-actions',
            template: `
                <div class="generation-actions">
                    <button type="button" 
                            class="generate-button {{#if isGenerating}}generating{{/if}}"
                            data-action="generate"
                            {{#if isGenerating}}disabled{{/if}}>
                        {{#if isGenerating}}
                            <span class="spinner"></span>
                            Generating...
                        {{else}}
                            Generate Dungeon
                        {{/if}}
                    </button>
                    
                    {{#if isGenerating}}
                    <button type="button" 
                            class="cancel-button"
                            data-action="cancel">
                        Cancel
                    </button>
                    {{/if}}
                    
                    {{#if lastGenerationTime}}
                    <div class="generation-info">
                        Last generated in {{lastGenerationTime}}ms
                    </div>
                    {{/if}}
                </div>
            `,
            style: `
                .generation-actions {
                    margin-top: 12px;
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    flex-wrap: wrap;
                }
                
                .generate-button {
                    background: #4a90e2;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                
                .generate-button:hover:not(:disabled) {
                    background: #357abd;
                    transform: translateY(-1px);
                }
                
                .generate-button:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                    transform: none;
                }
                
                .generate-button.generating {
                    background: #28a745;
                }
                
                .cancel-button {
                    background: #dc3545;
                    color: white;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 4px;
                    font-size: 12px;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                
                .cancel-button:hover {
                    background: #c82333;
                }
                
                .generation-info {
                    font-size: 11px;
                    color: #666;
                    margin-left: 8px;
                }
                
                .spinner {
                    width: 12px;
                    height: 12px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-top: 2px solid white;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `
        });
        
        this.state = { 
            isGenerating: false,
            lastGenerationTime: null
        };
    }

    onRender() {
        // Handle button clicks
        this.element.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="generate"]') || 
                e.target.closest('[data-action="generate"]')) {
                this.handleGenerate();
            } else if (e.target.matches('[data-action="cancel"]') || 
                       e.target.closest('[data-action="cancel"]')) {
                this.handleCancel();
            }
        });
    }

    handleGenerate() {
        if (this.state.isGenerating) return;
        
        this.setState({ isGenerating: true, lastGenerationTime: null });
        const startTime = Date.now();
        
        // Emit generate event with callback for completion
        this.emit('generate-requested', {
            onComplete: (success) => {
                const duration = Date.now() - startTime;
                this.setState({ 
                    isGenerating: false,
                    lastGenerationTime: success ? duration : null
                });
            }
        });
    }

    handleCancel() {
        if (!this.state.isGenerating) return;
        
        this.setState({ isGenerating: false });
        this.emit('cancel-requested');
    }

    // Set generation state externally
    setGenerating(isGenerating) {
        this.setState({ isGenerating });
    }

    // Mark generation as completed
    completeGeneration(success = true, duration = null) {
        this.setState({ 
            isGenerating: false,
            lastGenerationTime: success && duration ? duration : null
        });
    }
}

// Register widget
if (typeof window !== 'undefined') {
    getWidget().define('generation-actions', GenerationActionsWidget);
}