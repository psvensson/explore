// scene_setup.js
export const makeScene = (THREE) => new THREE.Scene();
export const makePerspective = (THREE, fov, aspect, near, far) => new THREE.PerspectiveCamera(fov, aspect, near, far);
export const setVec3 = (obj, x, y, z) => { obj.position && obj.position.set(x,y,z); return obj; };
export function configureFPSCamera(cam){ if (cam.rotation) cam.rotation.order='YXZ'; cam.userData = cam.userData||{}; cam.userData.keep=true; return cam; }
export function addBasicLights(THREE, scene){
  if (THREE.DirectionalLight){ const d=new THREE.DirectionalLight(0xffffff,1.1); setVec3(d,25,40,20); d.userData={keep:true}; scene.add(d); }
  if (THREE.HemisphereLight){ const h=new THREE.HemisphereLight(0x99bbff,0x223344,0.6); h.userData={keep:true}; scene.add(h); }
  if (THREE.AmbientLight){ const a=new THREE.AmbientLight(0xffffff,0.35); a.userData={keep:true}; scene.add(a); }
  if (THREE.GridHelper){ const g=new THREE.GridHelper(150,60,0x336699,0x224455); g.userData={keep:true,type:'grid'}; scene.add(g); if((typeof window!=='undefined')&&(window.__RENDER_DEBUG__||window.__WFC_DEBUG__)) console.debug('[Render] added GridHelper'); }
}

/**
 * Create XYZ axis indicator helpers for 3D viewers
 * Configurable for different unit scales and visual styles
 * 
 * @param {Object} THREERef - Reference to THREE.js library
 * @param {Object} options - Configuration options
 * @param {number} options.unit - Unit scale for tile mesh (default: 3)
 * @param {number} options.arrowRadius - Radius of arrow cylinders (default: auto-scaled)
 * @param {number} options.arrowLength - Length of arrow shafts (default: auto-scaled)
 * @param {number} options.headLength - Length of arrow heads (default: auto-scaled)
 * @param {number} options.headRadius - Radius of arrow heads (default: auto-scaled)
 * @param {Object} options.colors - Custom colors for axes {x, y, z}
 * @returns {THREE.Group} Group containing X, Y, Z axis arrows
 */
export function createAxisIndicators(THREERef, options = {}) {
  const {
    unit = 3,
    arrowRadius = unit * 0.02,      // Scale with unit size
    arrowLength = unit * 1.5,       // Scale with unit size
    headLength = unit * 0.3,        // Scale with unit size
    headRadius = unit * 0.04,       // Scale with unit size
    colors = {
      x: 0xff0000,  // Red
      y: 0x00ff00,  // Green
      z: 0x0000ff   // Blue
    }
  } = options;
  
  const axisGroup = new THREERef.Group();
  
  // Helper function to create a single arrow
  const createArrow = (color, direction) => {
    const arrowGroup = new THREERef.Group();
    
    // Create shaft (cylinder)
    const shaftGeometry = new THREERef.CylinderGeometry(
      arrowRadius, 
      arrowRadius, 
      arrowLength, 
      8
    );
    const shaftMaterial = new THREERef.MeshBasicMaterial({ color });
    const shaft = new THREERef.Mesh(shaftGeometry, shaftMaterial);
    
    // Position shaft halfway along its length
    shaft.position.y = arrowLength / 2;
    
    // Create head (cone)
    const headGeometry = new THREERef.ConeGeometry(
      headRadius, 
      headLength, 
      8
    );
    const headMaterial = new THREERef.MeshBasicMaterial({ color });
    const head = new THREERef.Mesh(headGeometry, headMaterial);
    
    // Position head at end of shaft
    head.position.y = arrowLength + headLength / 2;
    
    arrowGroup.add(shaft);
    arrowGroup.add(head);
    
    // Rotate arrow to point in correct direction
    if (direction === 'x') {
      arrowGroup.rotation.z = -Math.PI / 2;
    } else if (direction === 'z') {
      arrowGroup.rotation.x = Math.PI / 2;
    }
    // Y axis needs no rotation (default upward)
    
    return arrowGroup;
  };
  
  // Create axes
  const xAxis = createArrow(colors.x, 'x');
  const yAxis = createArrow(colors.y, 'y');
  const zAxis = createArrow(colors.z, 'z');
  
  axisGroup.add(xAxis);
  axisGroup.add(yAxis);
  axisGroup.add(zAxis);
  
  // Mark as persistent helper
  axisGroup.userData = { keep: true, type: 'axis-indicator' };
  
  return axisGroup;
}

/**
 * Create axis indicators with preset configurations for different viewer types
 * 
 * @param {Object} THREERef - Reference to THREE.js library
 * @param {string} viewerType - Type of viewer ('inline', 'dialog', 'custom')
 * @param {Object} customOptions - Override options for custom viewer type
 * @returns {THREE.Group} Group containing axis indicators
 */
export function createAxisIndicatorsPreset(THREERef, viewerType = 'inline', customOptions = {}) {
  const presets = {
    inline: {
      unit: 3,
      arrowRadius: 0.06,
      arrowLength: 4.5,
      headLength: 0.9,
      headRadius: 0.12
    },
    dialog: {
      unit: 3,
      arrowRadius: 0.06,
      arrowLength: 4.5,
      headLength: 0.9,
      headRadius: 0.12
    },
    custom: customOptions
  };
  
  const options = presets[viewerType] || presets.inline;
  return createAxisIndicators(THREERef, options);
}
