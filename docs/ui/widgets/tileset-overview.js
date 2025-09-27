/**
 * TilesetOverviewWidget - Overview dashboard showing the 4-step tileset creation workflow
 */

import { getWidget } from '../widget-base.js';

export class TilesetOverviewWidget extends getWidget() {
    constructor(element) {
        super(element, {
            template: `
                <div class="editor-overview">
                    <div class="overview-header">
                        <h2>🎯 Tileset Configuration System</h2>
                        <p>Build your tileset step by step, from basic structures to complete configurations</p>
                    </div>

                    <div class="workflow-steps">
                        <div class="step-card" onclick="{{ref}}.navigateToStep('structure')">
                            <div class="step-number">1</div>
                            <div class="step-content">
                                <h3>🏗️ Design Structures</h3>
                                <p>Create the basic 3D geometry and shape of your tiles</p>
                                <div class="step-details">
                                    <small>Define voxel patterns, rotations, and categories</small>
                                </div>
                            </div>
                            <div class="step-action">
                                <span class="action-arrow">→</span>
                            </div>
                        </div>

                        <div class="step-card" onclick="{{ref}}.navigateToStep('metadata')">
                            <div class="step-number">2</div>
                            <div class="step-content">
                                <h3>⚙️ Create Metadata Packages</h3>
                                <p>Define weight and role packages for different dungeon behaviors</p>
                                <div class="step-details">
                                    <small>Set probability weights, functional roles, and properties</small>
                                </div>
                            </div>
                            <div class="step-action">
                                <span class="action-arrow">→</span>
                            </div>
                        </div>

                        <div class="step-card" onclick="{{ref}}.navigateToStep('package')">
                            <div class="step-number">3</div>
                            <div class="step-content">
                                <h3>🎲 Combine into Tile Packages</h3>
                                <p>Combine structures with metadata to create complete tile sets</p>
                                <div class="step-details">
                                    <small>Assign IDs, apply rotations, and organize into packages</small>
                                </div>
                            </div>
                            <div class="step-action">
                                <span class="action-arrow">→</span>
                            </div>
                        </div>

                        <div class="step-card" onclick="{{ref}}.navigateToStep('configuration')">
                            <div class="step-number">4</div>
                            <div class="step-content">
                                <h3>📋 Build Configurations</h3>
                                <p>Create complete tileset configurations ready for WFC generation</p>
                                <div class="step-details">
                                    <small>Test generation, save configs, and export/import settings</small>
                                </div>
                            </div>
                            <div class="step-action">
                                <span class="action-arrow">→</span>
                            </div>
                        </div>
                    </div>

                    <div class="quick-stats">
                        <h3>Current System Status</h3>
                        <div class="stats-grid">
                            <div class="stat-item">
                                <div class="stat-number">{{stats.structures}}</div>
                                <div class="stat-label">Structures</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number">{{stats.metadata}}</div>
                                <div class="stat-label">Metadata Packages</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number">{{stats.packages}}</div>
                                <div class="stat-label">Tile Packages</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number">{{stats.configurations}}</div>
                                <div class="stat-label">Configurations</div>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            style: `
                .editor-overview {
                    padding: 24px;
                    max-width: 1200px;
                    margin: 0 auto;
                }
                
                .overview-header {
                    text-align: center;
                    margin-bottom: 32px;
                }
                
                .overview-header h2 {
                    margin: 0 0 8px 0;
                    font-size: 28px;
                    color: #cfe6ff;
                }
                
                .overview-header p {
                    margin: 0;
                    font-size: 16px;
                    color: #8bb3e8;
                }
                
                .workflow-steps {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 20px;
                    margin-bottom: 32px;
                }
                
                .step-card {
                    background: #2d2d2d;
                    border: 2px solid #3d3d3d;
                    border-radius: 8px;
                    padding: 20px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    position: relative;
                    overflow: hidden;
                }
                
                .step-card:hover {
                    border-color: #4a90e2;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(74, 144, 226, 0.2);
                }
                
                .step-number {
                    background: #4a90e2;
                    color: white;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 18px;
                    flex-shrink: 0;
                }
                
                .step-content {
                    flex: 1;
                }
                
                .step-content h3 {
                    margin: 0 0 8px 0;
                    font-size: 18px;
                    color: #cfe6ff;
                }
                
                .step-content p {
                    margin: 0 0 8px 0;
                    font-size: 14px;
                    color: #b8d4f2;
                    line-height: 1.4;
                }
                
                .step-details small {
                    color: #8bb3e8;
                    font-size: 12px;
                }
                
                .step-action {
                    opacity: 0.6;
                    transition: opacity 0.2s;
                }
                
                .step-card:hover .step-action {
                    opacity: 1;
                }
                
                .action-arrow {
                    font-size: 24px;
                    color: #4a90e2;
                }
                
                .quick-stats {
                    background: #2a2a2a;
                    border-radius: 8px;
                    padding: 24px;
                    border: 1px solid #3d3d3d;
                }
                
                .quick-stats h3 {
                    margin: 0 0 16px 0;
                    font-size: 20px;
                    color: #cfe6ff;
                    text-align: center;
                }
                
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                    gap: 16px;
                }
                
                .stat-item {
                    text-align: center;
                    padding: 16px;
                    background: #1a1a1a;
                    border-radius: 6px;
                    border: 1px solid #333;
                }
                
                .stat-number {
                    font-size: 24px;
                    font-weight: bold;
                    color: #4a90e2;
                    margin-bottom: 4px;
                }
                
                .stat-label {
                    font-size: 12px;
                    color: #8bb3e8;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
            `
        });
        
        this.state = { 
            stats: {
                structures: 0,
                metadata: 0,
                packages: 0,
                configurations: 0
            }
        };
    }

    ready() {
        console.log('[TilesetOverview] Widget ready');
        this.loadStats();
    }

    navigateToStep(step) {
        // Emit navigation event for parent tileset editor to handle
        this.element.dispatchEvent(new CustomEvent('navigate-to-step', {
            detail: { step },
            bubbles: true
        }));
    }

    async loadStats() {
        try {
            // TODO: Load actual stats from tileset configuration system
            // For now, simulate with placeholder data
            this.update({
                stats: {
                    structures: 12,
                    metadata: 5,
                    packages: 8,
                    configurations: 3
                }
            });
        } catch (error) {
            console.error('[TilesetOverview] Failed to load stats:', error);
        }
    }

    updateStats(newStats) {
        this.update({ stats: { ...this.state.stats, ...newStats } });
    }
}

// Register widget
if (typeof window !== 'undefined') {
    getWidget().define('tileset-overview', TilesetOverviewWidget);
}