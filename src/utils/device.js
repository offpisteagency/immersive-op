/**
 * Device detection and capability checking utilities
 */

/**
 * Check if the device is mobile or tablet
 * @returns {boolean}
 */
export function isMobile() {
  // Check for touch capability and screen size
  const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.matchMedia('(max-width: 1024px)').matches;
  
  // Also check user agent as fallback
  const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  
  return (hasTouchScreen && isSmallScreen) || mobileUA;
}

/**
 * Check if device orientation API is available
 * @returns {boolean}
 */
export function hasGyroscope() {
  return 'DeviceOrientationEvent' in window;
}

/**
 * Check if gyroscope requires permission (iOS 13+)
 * @returns {boolean}
 */
export function gyroscopeNeedsPermission() {
  return typeof DeviceOrientationEvent !== 'undefined' && 
         typeof DeviceOrientationEvent.requestPermission === 'function';
}

/**
 * Request gyroscope permission on iOS
 * @returns {Promise<boolean>}
 */
export async function requestGyroscopePermission() {
  if (!gyroscopeNeedsPermission()) {
    return hasGyroscope();
  }
  
  try {
    const permission = await DeviceOrientationEvent.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.warn('Gyroscope permission denied:', error);
    return false;
  }
}

/**
 * Check if WebGL is supported
 * @returns {boolean}
 */
export function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch (e) {
    return false;
  }
}

/**
 * Check if WebGL2 is supported
 * @returns {boolean}
 */
export function supportsWebGL2() {
  try {
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('webgl2');
  } catch (e) {
    return false;
  }
}

/**
 * Check if user prefers reduced motion
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if getUserMedia (camera access) is available
 * @returns {boolean}
 */
export function hasCameraAccess() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Get the device pixel ratio, capped at max
 * @param {number} max - Maximum pixel ratio
 * @returns {number}
 */
export function getPixelRatio(max = 2) {
  return Math.min(window.devicePixelRatio || 1, max);
}

/**
 * Detect browser type
 * @returns {'chrome' | 'safari' | 'firefox' | 'edge' | 'other'}
 */
export function getBrowser() {
  const ua = navigator.userAgent.toLowerCase();
  
  if (ua.includes('edg/')) return 'edge';
  if (ua.includes('chrome') && !ua.includes('edg/')) return 'chrome';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'safari';
  if (ua.includes('firefox')) return 'firefox';
  
  return 'other';
}

/**
 * Check if running on iOS
 * @returns {boolean}
 */
export function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Get device capabilities summary
 * @returns {Object}
 */
export function getDeviceCapabilities() {
  return {
    isMobile: isMobile(),
    hasGyroscope: hasGyroscope(),
    gyroscopeNeedsPermission: gyroscopeNeedsPermission(),
    supportsWebGL: supportsWebGL(),
    supportsWebGL2: supportsWebGL2(),
    prefersReducedMotion: prefersReducedMotion(),
    hasCameraAccess: hasCameraAccess(),
    pixelRatio: window.devicePixelRatio || 1,
    browser: getBrowser(),
    isIOS: isIOS()
  };
}

