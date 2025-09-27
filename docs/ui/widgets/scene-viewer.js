/**
 * Scene Viewer Widget - Three.js canvas container
 * Following Node.js compatibility and Three.js integration patterns
 */

import { getWidget } from '../widget-base.js';

const Widget = getWidget();

class SceneViewerWidget extends Widget {
    constructor() {
        super({
            name: 'scene-viewer',
            template: `
                <div class="scene-viewer">
                    <canvas id="threejs-canvas"></canvas>
                    <div class="scene-overlay">
                        <div class="fps-counter" id="fps-counter">FPS: --</div>
                    </div>
                </div>
            `,
            style: `
                .scene-viewer {
                    width: 100%;
                    height: 100%;
                    min-height: 600px;
                    background: #000;
                    position: relative;
                    display: block;
                }
                
                #threejs-canvas {
                    width: 100%;
                    height: 100%;
                    display: block;
                    background: #000;
                }
                
                .scene-overlay {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    position: absolute;
                    top: 0;
                    left: 0;
                    pointer-events: none;
                }
                
                .fps-counter {
                    position: absolute;
                    top: 10px;
                    left: 10px;
                    background: rgba(0, 0, 0, 0.7);
                    color: #00ff00;
                    padding: 5px 10px;
                    font-family: monospace;
                    font-size: 12px;
                    border-radius: 3px;
                    pointer-events: auto;
                }
                
                .scene-viewer h2 {
                    margin: 0 0 12px 0;
                    padding: 12px 20px;
                    background: #0f2740;
                    color: #cfe6ff;
                    font-size: 18px;
                    border-bottom: 1px solid #2d5aa0;
                }
                
                .canvas-container {
                    width: 100%;
                    height: 90vh;
                    min-height: 760px;
                    background: #000;
                }
                
                .ascii-section {
                    padding: 20px;
                    background: #f8f9fa;
                    border-top: 1px solid #dee2e6;
                }
                
                .ascii-mini-wrapper {
                    display: flex;
                    gap: 20px;
                    align-items: flex-start;
                }
                
                .ascii-panel {
                    flex: 1;
                }
                
                .ascii-map {
                    background: #000;
                    color: #0f0;
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                    padding: 10px;
                    border-radius: 4px;
                    overflow-x: auto;
                    line-height: 1.2;
                }
                
                .legend {
                    margin-top: 8px;
                    font-size: 12px;
                    color: #666;
                }
                
                .mini-panel {
                    width: 300px;
                    background: #fff;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    padding: 12px;
                }
                
                .mini-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }
                
                .mini-clear {
                    background: #dc3545;
                    color: white;
                    border: none;
                    padding: 4px 8px;
                    border-radius: 3px;
                    font-size: 11px;
                    cursor: pointer;
                }
                
                .mini-viewer {
                    width: 100%;
                    height: 200px;
                    background: #f8f9fa;
                    border: 1px solid #dee2e6;
                    border-radius: 4px;
                    margin-bottom: 8px;
                }
                
                .mini-hint {
                    font-size: 11px;
                    color: #666;
                    text-align: center;
                }
                
                .tile-block-browser {
                    margin-top: 20px;
                    min-height: 100px;
                    background: #fff;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    padding: 12px;
                }
            `
        });
    }

    ready() {
        if (typeof window === 'undefined') return;
        
        console.log('[Widget] SceneViewer ready');
        
        const canvas = this.el.querySelector('#threejs-canvas');
        console.log('[SceneViewer] Canvas in widget', {
            canvas: !!canvas,
            canvasId: canvas?.id,
            canvasWidth: canvas?.width,
            canvasHeight: canvas?.height,
            widgetEl: this.el?.tagName,
            widgetId: this.el?.id,
            parentContainer: this.el?.parentElement?.id,
            containerVisible: this.el?.offsetParent !== null
        });
        
        // Emit event for renderer following event-driven pattern
        this.el.dispatchEvent(new CustomEvent('threejs-canvas-ready', {
            detail: { canvas: canvas },
            bubbles: true
        }));

        // Initialize Three.js renderer if not already done
        this.initializeRenderer();
    }

    async initializeRenderer() {
        try {
            // Check if renderer already initialized
            if (window.__DUNGEON_RENDERER_BOOTSTRAPPED) {
                console.log('[Widget] Renderer already initialized');
                return;
            }

            // Lazy load renderer following coding instructions
            await import('../../renderer/renderer.js');
            console.log('[Widget] Renderer loaded');
        } catch (error) {
            console.error('[Widget] Failed to initialize renderer:', error);
        }
    }
}

// Register with Widget.js if available (browser environment)
if (typeof window !== 'undefined' && window.Widget && window.Widget.define) {
    window.Widget.define('scene-viewer', SceneViewerWidget);
}

export { SceneViewerWidget };