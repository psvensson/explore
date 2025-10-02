// lighting-profiles.js
// Centralized lighting configuration for 3D viewers

/**
 * Predefined lighting profiles for different 3D viewer contexts
 * Each profile defines ambient and directional lights for optimal material visibility
 */
export const LIGHTING_PROFILES = {
  // Lighting for inline tile viewers (beside each tile in list)
  inline: {
    ambient: { 
      intensity: 1.2, 
      color: 0xffffff,
      description: 'Super bright ambient for small viewers'
    },
    directional: [
      { intensity: 1.5, position: [-8, 8, -5], name: 'primary' },
      { intensity: 1.0, position: [5, -3, 8], name: 'secondary' },
      { intensity: 0.8, position: [0, 0, -10], name: 'rim' }
    ]
  },
  
  // Lighting for structure editor dialog (larger 3D view)
  dialog: {
    ambient: { 
      intensity: 1.5, 
      color: 0xffffff,
      description: 'Ultra bright ambient for detailed editing'
    },
    directional: [
      { intensity: 2.0, position: [-10, 12, -5], name: 'main' },
      { intensity: 1.5, position: [8, -5, 12], name: 'fill' },
      { intensity: 1.0, position: [0, 5, -15], name: 'back' },
      { intensity: 0.8, position: [-15, 0, 0], name: 'side' }
    ]
  },
  
  // Standard lighting profile (matches main renderer baseline)
  standard: {
    ambient: { 
      intensity: 0.6, 
      color: 0xffffff,
      description: 'Standard ambient light'
    },
    directional: [
      { intensity: 0.8, position: [5, 5, 5], name: 'main' }
    ]
  }
};

/**
 * Apply a lighting profile to a THREE.js scene
 * @param {THREE} THREERef - THREE.js reference
 * @param {THREE.Scene} scene - Scene to add lights to
 * @param {string} profileName - Name of the lighting profile to apply
 * @param {Function} addBasicLights - Optional basic lights function from scene_setup.js
 */
export function applyLightingProfile(THREERef, scene, profileName, addBasicLights = null) {
  const profile = LIGHTING_PROFILES[profileName];
  
  if (!profile) {
    console.warn(`[LightingProfiles] Unknown profile '${profileName}', using 'standard'`);
    return applyLightingProfile(THREERef, scene, 'standard', addBasicLights);
  }
  
  console.log(`[LightingProfiles] Applying '${profileName}' lighting profile: ${profile.ambient.description}`);
  
  // Add basic lights first if provided (includes hemisphere, grid helper, etc.)
  if (addBasicLights && typeof addBasicLights === 'function') {
    addBasicLights(THREERef, scene);
  }
  
  // Add ambient light
  const ambient = new THREERef.AmbientLight(
    profile.ambient.color, 
    profile.ambient.intensity
  );
  ambient.userData = { type: 'profile_ambient', profile: profileName };
  scene.add(ambient);
  
  // Add directional lights
  profile.directional.forEach((lightConfig, index) => {
    const light = new THREERef.DirectionalLight(0xffffff, lightConfig.intensity);
    light.position.set(...lightConfig.position);
    light.userData = { 
      type: 'profile_directional', 
      profile: profileName,
      name: lightConfig.name || `light_${index}`
    };
    scene.add(light);
  });
  
  console.log(`[LightingProfiles] Added ${profile.directional.length} directional lights for '${profileName}' profile`);
}

/**
 * Get zoom configuration for a specific viewer type
 * @param {string} viewerType - 'inline' or 'dialog'
 * @returns {Object} Zoom configuration with minDistance, maxDistance, and speed
 */
export function getZoomConfig(viewerType) {
  const configs = {
    inline: {
      minDistance: 3,
      maxDistance: 80,
      speed: 0.4,
      description: 'Inline viewer zoom range'
    },
    dialog: {
      minDistance: 4,
      maxDistance: 120,
      speed: 0.8,
      description: 'Dialog viewer zoom range with more granular control'
    }
  };
  
  return configs[viewerType] || configs.inline;
}

/**
 * Get camera configuration for a specific viewer type
 * @param {string} viewerType - 'inline' or 'dialog'
 * @returns {Object} Camera configuration
 */
export function getCameraConfig(viewerType) {
  const configs = {
    inline: {
      fov: 60,
      near: 0.1,
      far: 200,
      position: [12, 12, 12],
      lookAt: [4.5, 4.5, 4.5],
      description: 'Inline viewer camera for unit:3 tiles'
    },
    dialog: {
      fov: 60,
      near: 0.1,
      far: 250,
      position: [15, 15, 15],
      lookAt: [4.5, 4.5, 4.5],
      description: 'Dialog viewer camera with extended far plane'
    }
  };
  
  return configs[viewerType] || configs.inline;
}

// Node.js compatibility guard
if (typeof window !== 'undefined') {
  console.log('[LightingProfiles] Lighting profiles module loaded');
}
