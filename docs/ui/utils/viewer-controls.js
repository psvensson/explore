// viewer-controls.js
// Reusable mouse controls for 3D viewers

import { getZoomConfig } from '../../renderer/lighting-profiles.js';

/**
 * Manages mouse controls (rotation and zoom) for 3D viewers
 */
export class ViewerControls {
  /**
   * @param {HTMLCanvasElement} canvas - Canvas element to attach controls to
   * @param {Voxel3DViewer} viewer - The 3D viewer instance
   * @param {Object} options - Configuration options
   * @param {number} options.rotationSpeed - Mouse rotation sensitivity
   * @param {boolean} options.enableRotation - Enable rotation controls
   * @param {boolean} options.enableZoom - Enable zoom controls
   * @param {boolean} options.clampRotation - Clamp X rotation to prevent flipping
   */
  constructor(canvas, viewer, options = {}) {
    this.canvas = canvas;
    this.viewer = viewer;
    this.rotationSpeed = options.rotationSpeed || 0.01;
    this.enableRotation = options.enableRotation !== false;
    this.enableZoom = options.enableZoom !== false;
    this.clampRotation = options.clampRotation !== false;
    
    // State
    this.isRotating = false;
    this.isEnabled = false;
    
    // Bound event handlers (for cleanup)
    this._onMouseDown = this.onMouseDown.bind(this);
    this._onMouseUp = this.onMouseUp.bind(this);
    this._onMouseLeave = this.onMouseLeave.bind(this);
    this._onMouseMove = this.onMouseMove.bind(this);
    this._onWheel = this.onWheel.bind(this);
    
    console.log('[ViewerControls] Controls created');
  }
  
  /**
   * Attach event listeners and enable controls
   */
  enable() {
    if (this.isEnabled) return;
    
    if (this.enableRotation) {
      this.canvas.addEventListener('mousedown', this._onMouseDown);
      this.canvas.addEventListener('mouseup', this._onMouseUp);
      this.canvas.addEventListener('mouseleave', this._onMouseLeave);
      this.canvas.addEventListener('mousemove', this._onMouseMove);
    }
    
    if (this.enableZoom) {
      this.canvas.addEventListener('wheel', this._onWheel, { passive: false });
    }
    
    this.isEnabled = true;
    console.log('[ViewerControls] Controls enabled');
  }
  
  /**
   * Remove event listeners and disable controls
   */
  disable() {
    if (!this.isEnabled) return;
    
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    this.canvas.removeEventListener('mouseup', this._onMouseUp);
    this.canvas.removeEventListener('mouseleave', this._onMouseLeave);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    this.canvas.removeEventListener('wheel', this._onWheel);
    
    this.isRotating = false;
    this.isEnabled = false;
    console.log('[ViewerControls] Controls disabled');
  }
  
  /**
   * Mouse down handler - start rotation
   * @private
   */
  onMouseDown(event) {
    this.isRotating = true;
    event.preventDefault();
  }
  
  /**
   * Mouse up handler - stop rotation
   * @private
   */
  onMouseUp() {
    this.isRotating = false;
  }
  
  /**
   * Mouse leave handler - stop rotation
   * @private
   */
  onMouseLeave() {
    this.isRotating = false;
  }
  
  /**
   * Mouse move handler - apply rotation
   * @private
   */
  onMouseMove(event) {
    if (!this.isRotating) return;
    
    const mesh = this.viewer.getMesh();
    const axisGroup = this.viewer.getAxisGroup();
    
    if (!mesh) return;
    
    const deltaX = event.movementX * this.rotationSpeed;
    const deltaY = event.movementY * this.rotationSpeed;
    
    // Rotate around Y-axis (horizontal mouse movement)
    mesh.rotation.y += deltaX;
    if (axisGroup) {
      axisGroup.rotation.y += deltaX;
    }
    
    // Rotate around X-axis (vertical mouse movement)
    mesh.rotation.x += deltaY;
    if (axisGroup) {
      axisGroup.rotation.x += deltaY;
    }
    
    // Clamp X rotation to prevent flipping
    if (this.clampRotation) {
      const maxXRotation = Math.PI / 2;
      const minXRotation = -Math.PI / 2;
      
      mesh.rotation.x = Math.max(minXRotation, Math.min(maxXRotation, mesh.rotation.x));
      if (axisGroup) {
        axisGroup.rotation.x = Math.max(minXRotation, Math.min(maxXRotation, axisGroup.rotation.x));
      }
    }
  }
  
  /**
   * Mouse wheel handler - apply zoom
   * @private
   */
  onWheel(event) {
    event.preventDefault();
    
    const camera = this.viewer.getCamera();
    const cameraConfig = this.viewer.getCameraConfig();
    const THREERef = this.viewer.getTHREE();
    const zoomConfig = getZoomConfig(this.viewer.viewerType);
    
    if (!camera || !cameraConfig || !THREERef) return;
    
    // Calculate zoom direction
    const zoomDelta = event.deltaY > 0 ? zoomConfig.speed : -zoomConfig.speed;
    
    // Move camera closer/further from center point
    const centerPoint = new THREERef.Vector3(
      cameraConfig.lookAt[0],
      cameraConfig.lookAt[1],
      cameraConfig.lookAt[2]
    );
    
    const direction = camera.position.clone().sub(centerPoint).normalize();
    const currentDistance = camera.position.distanceTo(centerPoint);
    const newDistance = Math.max(
      zoomConfig.minDistance,
      Math.min(zoomConfig.maxDistance, currentDistance + zoomDelta)
    );
    
    camera.position.copy(direction.multiplyScalar(newDistance).add(centerPoint));
    camera.lookAt(centerPoint.x, centerPoint.y, centerPoint.z);
  }
  
  /**
   * Set rotation speed
   * @param {number} speed - New rotation speed
   */
  setRotationSpeed(speed) {
    this.rotationSpeed = speed;
  }
  
  /**
   * Reset mesh rotation to default
   */
  resetRotation() {
    const mesh = this.viewer.getMesh();
    const axisGroup = this.viewer.getAxisGroup();
    
    if (mesh) {
      mesh.rotation.set(0, 0, 0);
    }
    if (axisGroup) {
      axisGroup.rotation.set(0, 0, 0);
    }
  }
  
  /**
   * Cleanup and destroy controls
   */
  destroy() {
    this.disable();
    this.viewer = null;
    this.canvas = null;
    console.log('[ViewerControls] Controls destroyed');
  }
}

// Node.js compatibility guard
if (typeof window !== 'undefined') {
  console.log('[ViewerControls] Viewer controls class loaded');
}
