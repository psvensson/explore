/**
 * grid-overlay.js
 * Canvas-based grid visualization and raycasting for map editor
 */

export class GridOverlay {
  constructor(canvas, camera, THREE, renderer = null) {
    console.log('[GridOverlay] Constructor called with:', {
      canvas: !!canvas,
      camera: !!camera,
      THREE: !!THREE,
      renderer: !!renderer,
      THREEtype: typeof THREE
    });
    
    this.canvas = canvas;
    this.camera = camera;
    this.THREE = THREE; // Store THREE reference (not scene)
    this.renderer = renderer; // Store renderer reference for rect alignment
    this.currentLayer = 0;
    this.highlightedCell = null;
    this.ghostTile = null; // { structureId, rotation }
    this.visible = false;
    // Debug marker for ray hit verification
    this._debugMarkerScreen = null;
    
    // Grid settings
    this.gridSize = 3; // match renderer tile unit (3 units per tile)
    this.gridExtent = 10; // Show ±10 tiles from origin
    
    // Raycasting plane
    this.raycastPlane = null;
    this.updateRaycastPlane();
    
    // Browser-only guard
    if (typeof window === 'undefined') return;
    
    // Canvas context
    this.ctx = canvas.getContext('2d');
  }

  /**
   * Update the raycasting plane to current layer
   */
  updateRaycastPlane() {
    if (typeof window === 'undefined' || !this.THREE) return;
    
    // Compute grid plane height for current layer and set a horizontal raycast plane at y = planeY
    const planeY = this.currentLayer * this.gridSize;
    const camDir = this.camera ? this.camera.getWorldDirection(new this.THREE.Vector3()) : new this.THREE.Vector3(0, -1, 0);
    const camPos = this.camera ? this.camera.position.clone() : new this.THREE.Vector3(0, 50, 0);

    // Horizontal plane: y = planeY -> normal (0,1,0), constant = -planeY (n·p + c = 0)
    this.raycastPlane = new this.THREE.Plane(new this.THREE.Vector3(0, 1, 0), -planeY);

    console.log('[GridOverlay] Raycast plane updated (horizontal):', {
      cameraPosition: camPos,
      cameraDirection: camDir,
      planeY,
      planeNormal: this.raycastPlane.normal,
      planeConstant: this.raycastPlane.constant
    });

    if (this.camera) {
      const camDir = this.camera.getWorldDirection(new this.THREE.Vector3());
      console.log('[GridOverlay] Camera orientation check:', {
        position: this.camera.position,
        direction: camDir,
        lookingDown: camDir.y < 0
      });

      // Force camera to look downward if not already
      if (camDir.y >= 0) {
        console.warn('[GridOverlay] Camera is not facing downward toward the grid plane. Adjusting orientation...');
        this.camera.lookAt(0, 0, 0);
      }

      // Ensure camera is positioned above the grid plane
      if (this.camera.position.y <= planeY + 1) {
        console.warn('[GridOverlay] Camera is too low or below the grid plane. Raising camera height...');
        this.camera.position.y = planeY + 50;
        this.camera.lookAt(0, planeY, 0);
      }

      // Log final camera state
      console.log('[GridOverlay] Final camera state after adjustment:', {
        position: this.camera.position,
        direction: this.camera.getWorldDirection(new this.THREE.Vector3())
      });
    }
  }

  /**
   * Set current layer
   */
  setLayer(y) {
    this.currentLayer = y;
    this.updateRaycastPlane();
  }

  /**
   * Set ghost tile preview
   */
  setGhostTile(structureId, rotation) {
    this.ghostTile = structureId ? { structureId, rotation } : null;
  }

  /**
   * Convert screen coordinates to grid position
   */
  screenToGrid(mouseX, mouseY) {
    if (!this._screenToGridCallCount) this._screenToGridCallCount = 0;
    const shouldLog = this._screenToGridCallCount < 3;
    
    if (typeof window === 'undefined' || !this.THREE) {
      if (shouldLog) console.warn('[GridOverlay] screenToGrid: THREE not available', {
        window: typeof window !== 'undefined',
        THREE: !!this.THREE
      });
      return null;
    }
    
    // mouseX and mouseY are ALREADY relative to canvas (calculated in handleMouseMove)
    // Don't subtract rect again!
    const x = mouseX;
    const y = mouseY;
    
    if (shouldLog) {
      console.log('[GridOverlay] screenToGrid called:', {
        mouseX, mouseY,
        canvasWidth: this.canvas.width,
        canvasHeight: this.canvas.height,
        camera: !!this.camera,
        raycastPlane: !!this.raycastPlane,
        currentLayer: this.currentLayer,
        gridSize: this.gridSize
      });
    }
    
    // Compute normalized device coordinates anchored to the renderer viewport (not the overlay)
    const overlayRect = this.canvas.getBoundingClientRect();
    // Convert overlay-relative coords to client coords
    const clientX = overlayRect.left + x;
    const clientY = overlayRect.top + y;
    // Prefer renderer DOM rect if available
    const rEl = (this.renderer && this.renderer.domElement) ? this.renderer.domElement : null;
    const targetRect = (rEl && rEl.getBoundingClientRect) ? rEl.getBoundingClientRect() : overlayRect;
    const ndcX = ((clientX - targetRect.left) / targetRect.width) * 2 - 1;
    const ndcY = -((clientY - targetRect.top) / targetRect.height) * 2 + 1;
    const mouse = new this.THREE.Vector2(ndcX, ndcY);

    console.log('[GridOverlay] 🧭 Simplified NDC computation:', {
      mouseX: x,
      mouseY: y,
      rectWidth: targetRect.width,
      rectHeight: targetRect.height,
      ndc: { x: ndcX.toFixed(3), y: ndcY.toFixed(3) }
    });

    // Ensure raycast plane exists; horizontal at current layer (y = planeY)
    if (!this.raycastPlane) {
      const planeY = this.currentLayer * this.gridSize;
      this.raycastPlane = new this.THREE.Plane(new this.THREE.Vector3(0, 1, 0), -planeY);
    }

    // Coordinate alignment debug
    console.log('[GridOverlay] 🧮 Coordinate alignment debug:', {
      canvasRect: { left: overlayRect.left, top: overlayRect.top, width: overlayRect.width, height: overlayRect.height },
      rendererRect: rEl ? { left: targetRect.left, top: targetRect.top, width: targetRect.width, height: targetRect.height } : null,
      ndc: { x: ndcX.toFixed(3), y: ndcY.toFixed(3) }
    });

    // Focused debug logging for placement accuracy
    console.log('[GridOverlay] 🧩 Mouse → NDC → Raycast:', {
      mouseInput: { x, y, clientX: window.event?.clientX, clientY: window.event?.clientY },
      rect: { width: targetRect.width, height: targetRect.height, left: targetRect.left, top: targetRect.top },
      ndc: { x: mouse.x.toFixed(3), y: mouse.y.toFixed(3) },
      cameraPos: this.camera?.position,
      cameraDir: this.camera?.getWorldDirection(new this.THREE.Vector3())
    });

    const raycaster = new this.THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    const intersection = new this.THREE.Vector3();
    const hit = raycaster.ray.intersectPlane(this.raycastPlane, intersection);

    if (!hit) {
      console.warn('[GridOverlay] ❌ No intersection with raycast plane', {
        rayOrigin: raycaster.ray.origin,
        rayDirection: raycaster.ray.direction,
        plane: { normal: this.raycastPlane.normal, constant: this.raycastPlane.constant }
      });
      return null;
    }

    // Log intersection and grid mapping
    const gridX = Math.floor(intersection.x / this.gridSize + 0.5);
    const gridZ = Math.floor(intersection.z / this.gridSize + 0.5);
    const result = { x: gridX, y: this.currentLayer, z: gridZ };
    
    // Debug: project intersection back to screen to verify alignment
    const debugScreen = this.worldToScreen({ x: intersection.x, y: intersection.y, z: intersection.z });
    this._debugMarkerScreen = debugScreen || null;

    console.log('[GridOverlay] ✅ Intersection → Grid:', {
      intersection: {
        x: intersection.x.toFixed(2),
        y: intersection.y.toFixed(2),
        z: intersection.z.toFixed(2)
      },
      grid: result,
      gridSize: this.gridSize
    });

    // Explicit numeric logging for debugging
    console.log(`[GridOverlay] Intersection coords: x=${intersection.x.toFixed(2)}, y=${intersection.y.toFixed(2)}, z=${intersection.z.toFixed(2)}`);
    console.log(`[GridOverlay] Grid coords: x=${gridX}, y=${this.currentLayer}, z=${gridZ}`);

    // Detect if intersection is near origin (potential misalignment)
    if (Math.abs(intersection.x) < 1 && Math.abs(intersection.z) < 1) {
      console.warn('[GridOverlay] Intersection near origin — possible camera/plane misalignment');
    }

    // Track last intersection for delta comparison
    if (!this._lastIntersection) this._lastIntersection = { x: intersection.x, z: intersection.z };
    const dx = intersection.x - this._lastIntersection.x;
    const dz = intersection.z - this._lastIntersection.z;
    console.log(`[GridOverlay] Δ from last click: dx=${dx.toFixed(2)}, dz=${dz.toFixed(2)}`);
    this._lastIntersection = { x: intersection.x, z: intersection.z };

    this._screenToGridCallCount++;
    return result;
  }

  /**
   * Convert grid position to world position
   */
  gridToWorld(gridX, gridY, gridZ) {
    return {
      x: gridX * this.gridSize,
      y: gridY * this.gridSize,
      z: gridZ * this.gridSize
    };
  }

  /**
   * Get all grid points for rendering
   */
  getGridPoints() {
    const points = [];
    const extent = this.gridExtent || 10;
    const y = this.currentLayer * this.gridSize;
    
    for (let x = -extent; x <= extent; x++) {
      for (let z = -extent; z <= extent; z++) {
        points.push({
          grid: { x, y: this.currentLayer, z },
          world: { x: x * this.gridSize, y, z: z * this.gridSize }
        });
      }
    }
    
    return points;
  }

  /**
   * Convert world position to screen coordinates (single definition)
   */
  worldToScreen(worldPos) {
    if (typeof window === 'undefined' || !this.THREE) return null;
    const vector = new this.THREE.Vector3(worldPos.x, worldPos.y, worldPos.z);
    vector.project(this.camera);
    if (vector.z > 1) return null;

    const overlayRect = this.canvas.getBoundingClientRect();
    const rEl = (this.renderer && this.renderer.domElement) ? this.renderer.domElement : null;
    const basisRect = (rEl && rEl.getBoundingClientRect) ? rEl.getBoundingClientRect() : overlayRect;

    // Client-space coordinates based on the renderer viewport
    const clientX = (vector.x + 1) * basisRect.width / 2 + basisRect.left;
    const clientY = (-vector.y + 1) * basisRect.height / 2 + basisRect.top;

    // Convert to overlay-canvas local coordinates for drawing
    const x = clientX - overlayRect.left;
    const y = clientY - overlayRect.top;
    return { x, y };
  }

    /**
   * Render the grid overlay on canvas
   */
  render() {
    if (!this.visible || !this.canvas || !this.ctx) return;
    if (this._renderScheduled) return;
    this._renderScheduled = true;
    requestAnimationFrame(() => {
      this._renderScheduled = false;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      const gridPoints = this.getGridPoints();
      this.ctx.strokeStyle = 'rgba(100, 150, 200, 0.3)';
      this.ctx.lineWidth = 1;
      for (const point of gridPoints) {
        const screen = this.worldToScreen(point.world);
        if (!screen) continue;
        const size = 5;
        this.ctx.beginPath();
        this.ctx.moveTo(screen.x - size, screen.y);
        this.ctx.lineTo(screen.x + size, screen.y);
        this.ctx.moveTo(screen.x, screen.y - size);
        this.ctx.lineTo(screen.x, screen.y + size);
        this.ctx.stroke();
      }
      if (this.hoveredCell) {
        const worldX = this.hoveredCell.x * this.gridSize;
        const worldZ = this.hoveredCell.z * this.gridSize;
        const worldY = this.currentLayer * this.gridSize;
        const center = this.worldToScreen({ x: worldX, y: worldY, z: worldZ });
        if (center) {
          this.ctx.fillStyle = 'rgba(100, 200, 255, 0.3)';
          this.ctx.strokeStyle = 'rgba(100, 200, 255, 0.8)';
          this.ctx.lineWidth = 2;
          const halfSize = 12;
          this.ctx.fillRect(center.x - halfSize, center.y - halfSize, halfSize * 2, halfSize * 2);
          this.ctx.strokeRect(center.x - halfSize, center.y - halfSize, halfSize * 2, halfSize * 2);
        }
      }
      
      // Draw debug marker for last ray-plane hit (small circle)
      if (this._debugMarkerScreen) {
        this.ctx.fillStyle = 'rgba(255, 80, 80, 0.9)';
        this.ctx.beginPath();
        this.ctx.arc(this._debugMarkerScreen.x, this._debugMarkerScreen.y, 4, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });
  }

  /**
   * Draw grid lines
   */
  drawGridLines(ctx) {
    if (typeof window === 'undefined' || !window.THREE) return;
    
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
    ctx.lineWidth = 1;
    
    const planeY = this.currentLayer * this.gridSize;
    
    // Draw horizontal lines (along X axis)
    for (let z = -this.gridExtent; z <= this.gridExtent; z++) {
      const start = new window.THREE.Vector3(
        -this.gridExtent * this.gridSize,
        planeY,
        z * this.gridSize
      );
      const end = new window.THREE.Vector3(
        this.gridExtent * this.gridSize,
        planeY,
        z * this.gridSize
      );
      
      this.drawLine3D(ctx, start, end);
    }
    
    // Draw vertical lines (along Z axis)
    for (let x = -this.gridExtent; x <= this.gridExtent; x++) {
      const start = new window.THREE.Vector3(
        x * this.gridSize,
        planeY,
        -this.gridExtent * this.gridSize
      );
      const end = new window.THREE.Vector3(
        x * this.gridSize,
        planeY,
        this.gridExtent * this.gridSize
      );
      
      this.drawLine3D(ctx, start, end);
    }
  }

  /**
   * Draw highlighted cell
   */
  drawHighlightedCell(ctx, gridPos) {
    if (typeof window === 'undefined' || !window.THREE) return;
    
    const worldPos = this.gridToWorld(gridPos.x, gridPos.y, gridPos.z);
    const halfSize = this.gridSize / 2;
    
    // Define cell corners
    const corners = [
      new window.THREE.Vector3(worldPos.x - halfSize, worldPos.y, worldPos.z - halfSize),
      new window.THREE.Vector3(worldPos.x + halfSize, worldPos.y, worldPos.z - halfSize),
      new window.THREE.Vector3(worldPos.x + halfSize, worldPos.y, worldPos.z + halfSize),
      new window.THREE.Vector3(worldPos.x - halfSize, worldPos.y, worldPos.z + halfSize)
    ];
    
    // Draw cell outline
    ctx.strokeStyle = 'rgba(76, 175, 80, 0.8)';
    ctx.lineWidth = 2;
    
    for (let i = 0; i < corners.length; i++) {
      const start = corners[i];
      const end = corners[(i + 1) % corners.length];
      this.drawLine3D(ctx, start, end);
    }
    
    // Fill cell
    ctx.fillStyle = 'rgba(76, 175, 80, 0.1)';
    const screenCorners = corners.map(c => this.worldToScreen(c));
    
    if (screenCorners.every(p => p !== null)) {
      ctx.beginPath();
      ctx.moveTo(screenCorners[0].x, screenCorners[0].y);
      for (let i = 1; i < screenCorners.length; i++) {
        ctx.lineTo(screenCorners[i].x, screenCorners[i].y);
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  /**
   * Draw a 3D line on 2D canvas
   */
  drawLine3D(ctx, start, end) {
    const screenStart = this.worldToScreen(start);
    const screenEnd = this.worldToScreen(end);
    
    if (!screenStart || !screenEnd) return;
    
    ctx.beginPath();
    ctx.moveTo(screenStart.x, screenStart.y);
    ctx.lineTo(screenEnd.x, screenEnd.y);
    ctx.stroke();
  }


  /**
   * Show overlay
   */
  show() {
    this.visible = true;
  }

  /**
   * Hide overlay
   */
  hide() {
    this.visible = false;
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  /**
   * Resize canvas
   */
  resize(width, height) {
    if (!this.canvas) return;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  /**
   * Cleanup
   */
  destroy() {
    this.hide();
    this.highlightedCell = null;
    this.ghostTile = null;
  }
}
