/**
 * screen_space_mapper.js
 * Shared utilities for converting between overlay-relative coordinates,
 * renderer viewport coordinates, NDC, rays, and world intersections.
 * Intended to be reused by GridOverlay and any future picking logic.
 */

export class ScreenSpaceMapper {
  /**
   * @param {Object} THREERef - THREE.js reference
   */
  constructor(THREERef) {
    this.THREE = THREERef;
  }

  /**
   * Compute NDC from overlay-relative mouse coordinates.
   * The overlay canvas may not match the renderer's DOM rect, so we anchor to the renderer
   * DOM element if provided. Otherwise we fall back to the overlay canvas rect.
   * @param {HTMLCanvasElement} overlayCanvas
   * @param {HTMLElement|null} rendererDomElement
   * @param {number} overlayX - x relative to overlayCanvas (not clientX)
   * @param {number} overlayY - y relative to overlayCanvas (not clientY)
   * @returns {THREE.Vector2} NDC vector
   */
  overlayToNDC(overlayCanvas, rendererDomElement, overlayX, overlayY) {
    const overlayRect = overlayCanvas.getBoundingClientRect();
    const clientX = overlayRect.left + overlayX;
    const clientY = overlayRect.top + overlayY;

    const basisRect = (rendererDomElement && rendererDomElement.getBoundingClientRect)
      ? rendererDomElement.getBoundingClientRect()
      : overlayRect;

    const ndcX = ((clientX - basisRect.left) / basisRect.width) * 2 - 1;
    const ndcY = -((clientY - basisRect.top) / basisRect.height) * 2 + 1;
    return new this.THREE.Vector2(ndcX, ndcY);
  }

  /**
   * Create a raycaster from NDC and a camera.
   * @param {THREE.Vector2} ndc
   * @param {THREE.Camera} camera
   * @returns {THREE.Raycaster}
   */
  rayFromNDC(ndc, camera) {
    const raycaster = new this.THREE.Raycaster();
    raycaster.setFromCamera(ndc, camera);
    return raycaster;
  }

  /**
   * Intersect a ray from overlay-relative coordinates with a horizontal plane y = planeY.
   * @param {THREE.Camera} camera
   * @param {HTMLCanvasElement} overlayCanvas
   * @param {HTMLElement|null} rendererDomElement
   * @param {number} overlayX
   * @param {number} overlayY
   * @param {number} planeY
   * @returns {THREE.Vector3|null} Intersection point in world coords or null if none
   */
  intersectPlaneY(camera, overlayCanvas, rendererDomElement, overlayX, overlayY, planeY) {
    const ndc = this.overlayToNDC(overlayCanvas, rendererDomElement, overlayX, overlayY);
    const raycaster = this.rayFromNDC(ndc, camera);
    const plane = new this.THREE.Plane(new this.THREE.Vector3(0, 1, 0), -planeY);
    const intersection = new this.THREE.Vector3();
    const hit = raycaster.ray.intersectPlane(plane, intersection);
    return hit ? intersection : null;
  }

  /**
   * Project a world position to overlay-canvas coordinates, anchored to renderer DOM if provided.
   * @param {THREE.Camera} camera
   * @param {HTMLCanvasElement} overlayCanvas
   * @param {HTMLElement|null} rendererDomElement
   * @param {{x:number,y:number,z:number}} worldPos
   * @returns {{x:number,y:number}|null} overlay-local pixel coords or null if behind camera
   */
  worldToOverlayXY(camera, overlayCanvas, rendererDomElement, worldPos) {
    const v = new this.THREE.Vector3(worldPos.x, worldPos.y, worldPos.z);
    v.project(camera);
    if (v.z > 1) return null;

    const overlayRect = overlayCanvas.getBoundingClientRect();
    const basisRect = (rendererDomElement && rendererDomElement.getBoundingClientRect)
      ? rendererDomElement.getBoundingClientRect()
      : overlayRect;

    const clientX = (v.x + 1) * basisRect.width / 2 + basisRect.left;
    const clientY = (-v.y + 1) * basisRect.height / 2 + basisRect.top;

    const x = clientX - overlayRect.left;
    const y = clientY - overlayRect.top;
    return { x, y };
  }
}
