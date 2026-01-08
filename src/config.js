/**
 * Configuration for the Immersive 3D Background
 * These values can be overridden via window.IMMERSIVE_CONFIG
 */

const DEFAULT_CONFIG = {
  // Logo / Model
  logoPath: '/OFF-PISTE.glb', // Path to GLTF file, null uses placeholder cube
  logoScale: 1,
  logoRotation: { x: 0, y: 0, z: 0 },

  // Camera
  cameraFOV: 50,
  cameraDistance: 6,
  maxCameraOffset: { x: 2.5, y: 1.4, z: 1.5 },
  cameraNear: 0.1,
  cameraFar: 1000,

  // Tracking
  trackingSensitivity: 0.8,
  smoothingFactor: 0.06,
  faceDetectionFPS: 20,
  cameraRequestDelay: 1000, // ms before requesting camera permission

  // Fallback animation
  fallbackAnimationSpeed: 0.0003,
  fallbackAnimationRadius: { x: 0.4, y: 0.25 },

  // Background & Scene
  backgroundColor: 0x0a0a0f,
  showGrid: true,
  gridSize: 50,
  gridDivisions: 40,
  gridColor: 0x2a2a4e,
  gridCenterColor: 0x4a4a7e,

  // Particles
  showParticles: true,
  particleCount: 200,
  particleSize: 0.04,
  particleColor: 0x6a6a9e,
  particleSpread: 25,
  particleDrift: 0.0003,

  // Lighting
  ambientLightColor: 0x606080,
  ambientLightIntensity: 0.6,
  mainLightColor: 0xffffff,
  mainLightIntensity: 1.5,
  mainLightPosition: { x: 5, y: 5, z: 5 },
  rimLightColor: 0x6080ff,
  rimLightIntensity: 0.8,
  rimLightPosition: { x: -5, y: 0, z: -5 },

  // Performance
  maxPixelRatio: 2,
  antialias: true,

  // Gyroscope (mobile)
  gyroMaxTilt: 30, // degrees
  gyroSensitivity: 1,

  // Container
  containerId: 'hero-canvas'
};

/**
 * Merge user config with defaults
 */
export function getConfig() {
  const userConfig = typeof window !== 'undefined' 
    ? window.IMMERSIVE_CONFIG || {} 
    : {};
  
  return deepMerge(DEFAULT_CONFIG, userConfig);
}

/**
 * Deep merge utility for config objects
 */
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

export default DEFAULT_CONFIG;

