// voxel-3d-viewer.js
// Reusable 3D viewer class for voxel structures

import { getCameraConfig, applyLightingProfile, getZoomConfig } from '../../renderer/lighting-profiles.js';
import { makeScene, makePerspective, setVec3 } from '../../renderer/scene_setup.js';
import { createAxisIndicatorsPreset } from '../../renderer/scene_setup.js';

/**
 * Manages a 3D viewer for voxel structures
 * Handles scene setup, camera, renderer, and mesh lifecycle
 */
export class Voxel3DViewer {
  /**
   * @param {HTMLCanvasElement} canvas - Canvas element to render into
   * @param {Object} options - Configuration options
   * @param {string} options.viewerType - 'inline' or 'dialog'
   * @param {number} options.width - Canvas width in pixels
   * @param {number} options.height - Canvas height in pixels
   * @param {number} options.backgroundColor - Background color (hex)
   * @param {boolean} options.includeAxisIndicators - Whether to show XYZ axes
   */
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.viewerType = options.viewerType || 'inline';
    this.width = options.width || 160;
    this.height = options.height || 160;
    this.backgroundColor = options.backgroundColor || 0x2a2a2a;
    this.includeAxisIndicators = options.includeAxisIndicators !== false;
    
    // THREE.js references
    this.THREERef = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.mainMesh = null;
    this.axisGroup = null;
    this.materialFactory = null;
    
    // Animation state
    this.animationId = null;
    this.isDestroyed = false;
    
    console.log(`[Voxel3DViewer] Creating ${this.viewerType} viewer (${this.width}x${this.height})`);
  }
  
  /**
   * Initialize the viewer with THREE.js reference
   * @param {THREE} THREERef - THREE.js reference from main renderer
   * @returns {Promise<boolean>} Success status
   */
  async initialize(THREERef) {
    if (!THREERef) {
      console.error('[Voxel3DViewer] No THREE.js reference provided');
      return false;
    }
    
    this.THREERef = THREERef;
    
    try {
      // Setup scene
      await this._setupScene();
      
      // Setup camera
      await this._setupCamera();
      
      // Setup renderer
      await this._setupRenderer();
      
      // Setup lighting
      await this._setupLighting();
      
      // Setup axis indicators if requested
      if (this.includeAxisIndicators) {
        await this._setupAxisIndicators();
      }
      
      console.log(`[Voxel3DViewer] ${this.viewerType} viewer initialized successfully`);
      return true;
      
    } catch (error) {
      console.error('[Voxel3DViewer] Initialization failed:', error);
      return false;
    }
  }
  
  /**
   * Setup the THREE.js scene
   * @private
   */
  async _setupScene() {
    this.scene = makeScene(this.THREERef);
    this.scene.background = new this.THREERef.Color(this.backgroundColor);
  }
  
  /**
   * Setup the camera using configuration from lighting profiles
   * @private
   */
  async _setupCamera() {
    const cameraConfig = getCameraConfig(this.viewerType);
    const aspect = this.width / this.height;
    
    this.camera = makePerspective(
      this.THREERef, 
      cameraConfig.fov, 
      aspect, 
      cameraConfig.near, 
      cameraConfig.far
    );
    
    // Set camera position and look-at using array indexing
    setVec3(this.camera, cameraConfig.position[0], cameraConfig.position[1], cameraConfig.position[2]);
    this.camera.lookAt(cameraConfig.lookAt[0], cameraConfig.lookAt[1], cameraConfig.lookAt[2]);
    
    // Store camera config for controls
    this.cameraConfig = cameraConfig;
  }
  
  /**
   * Setup the WebGL renderer
   * @private
   */
  async _setupRenderer() {
    this.renderer = new this.THREERef.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: this.viewerType === 'inline'
    });
    
    this.renderer.setSize(this.width, this.height);
    this.renderer.setClearColor(this.backgroundColor, 1);
    
    // THREE.js r155+ compatibility
    if (this.renderer.outputColorSpace !== undefined) {
      this.renderer.outputColorSpace = this.THREERef.SRGBColorSpace;
    }
    if (this.renderer.useLegacyLights !== undefined) {
      this.renderer.useLegacyLights = false;
    }
  }
  
  /**
   * Setup lighting using profiles
   * @private
   */
  async _setupLighting() {
    const { addBasicLights } = await import('../../renderer/scene_setup.js');
    applyLightingProfile(this.THREERef, this.scene, this.viewerType, addBasicLights);
  }
  
  /**
   * Setup XYZ axis indicators
   * @private
   */
  async _setupAxisIndicators() {
    this.axisGroup = createAxisIndicatorsPreset(this.THREERef, this.viewerType);
    this.axisGroup.position.set(-1.5, -1.5, -1.5);
    this.scene.add(this.axisGroup);
  }
  
  /**
   * Set or update the main mesh in the scene
   * @param {THREE.Object3D} mesh - The mesh to display
   * @param {boolean} preserveRotation - Whether to preserve existing rotation
   */
  setMesh(mesh, preserveRotation = false) {
    // Remove old mesh if exists
    if (this.mainMesh) {
      // Preserve rotation if requested and axis group exists
      if (preserveRotation && this.axisGroup) {
        mesh.rotation.copy(this.axisGroup.rotation);
      }
      this.scene.remove(this.mainMesh);
    }
    
    this.mainMesh = mesh;
    this.scene.add(this.mainMesh);
    
    console.log('[Voxel3DViewer] Mesh updated');
  }
  
  /**
   * Get the current main mesh
   * @returns {THREE.Object3D|null}
   */
  getMesh() {
    return this.mainMesh;
  }
  
  /**
   * Get the axis group for synchronized rotation
   * @returns {THREE.Object3D|null}
   */
  getAxisGroup() {
    return this.axisGroup;
  }
  
  /**
   * Get the camera for controls
   * @returns {THREE.Camera}
   */
  getCamera() {
    return this.camera;
  }
  
  /**
   * Get the camera configuration
   * @returns {Object}
   */
  getCameraConfig() {
    return this.cameraConfig;
  }
  
  /**
   * Get THREE.js reference
   * @returns {THREE}
   */
  getTHREE() {
    return this.THREERef;
  }
  
  /**
   * Start the render loop
   */
  startRenderLoop() {
    if (this.isDestroyed) return;
    
    const animate = () => {
      if (this.isDestroyed || !document.contains(this.canvas)) {
        this.destroy();
        return;
      }
      
      this.animationId = requestAnimationFrame(animate);
      this.renderer.render(this.scene, this.camera);
    };
    
    animate();
  }
  
  /**
   * Stop the render loop
   */
  stopRenderLoop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
  
  /**
   * Render a single frame (for manual rendering)
   */
  render() {
    if (!this.isDestroyed && this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
  
  /**
   * Cleanup and destroy the viewer
   */
  destroy() {
    console.log('[Voxel3DViewer] Destroying viewer');
    
    this.isDestroyed = true;
    this.stopRenderLoop();
    
    // Cleanup THREE.js resources
    if (this.mainMesh) {
      this.scene.remove(this.mainMesh);
      this.mainMesh = null;
    }
    
    if (this.axisGroup) {
      this.scene.remove(this.axisGroup);
      this.axisGroup = null;
    }
    
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    
    this.scene = null;
    this.camera = null;
    this.THREERef = null;
  }
  
  /**
   * Get viewer data for storage on canvas
   * @returns {Object}
   */
  getViewerData() {
    return {
      viewer: this,
      renderer: this.renderer,
      scene: this.scene,
      camera: this.camera,
      mainMesh: this.mainMesh,
      axisGroup: this.axisGroup
    };
  }
}

// Node.js compatibility guard
if (typeof window !== 'undefined') {
  console.log('[Voxel3DViewer] 3D viewer class loaded');
}
