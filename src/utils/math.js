/**
 * Math utility functions for smooth animations and value mapping
 */

/**
 * Linear interpolation between two values
 * @param {number} start - Start value
 * @param {number} end - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number}
 */
export function lerp(start, end, t) {
  return start + (end - start) * t;
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Normalize a value from one range to 0-1
 * @param {number} value - Value to normalize
 * @param {number} min - Minimum of input range
 * @param {number} max - Maximum of input range
 * @returns {number}
 */
export function normalize(value, min, max) {
  if (max === min) return 0;
  return (value - min) / (max - min);
}

/**
 * Map a value from one range to another
 * @param {number} value - Value to map
 * @param {number} inMin - Input range minimum
 * @param {number} inMax - Input range maximum
 * @param {number} outMin - Output range minimum
 * @param {number} outMax - Output range maximum
 * @returns {number}
 */
export function mapRange(value, inMin, inMax, outMin, outMax) {
  return outMin + (outMax - outMin) * normalize(value, inMin, inMax);
}

/**
 * Smooth step function (cubic Hermite interpolation)
 * @param {number} edge0 - Lower edge
 * @param {number} edge1 - Upper edge
 * @param {number} x - Input value
 * @returns {number}
 */
export function smoothstep(edge0, edge1, x) {
  const t = clamp(normalize(x, edge0, edge1), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Convert degrees to radians
 * @param {number} degrees
 * @returns {number}
 */
export function degToRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 * @param {number} radians
 * @returns {number}
 */
export function radToDeg(radians) {
  return radians * (180 / Math.PI);
}

/**
 * Exponential decay for smooth following
 * @param {number} current - Current value
 * @param {number} target - Target value
 * @param {number} decay - Decay factor (higher = faster)
 * @param {number} deltaTime - Time since last update
 * @returns {number}
 */
export function expDecay(current, target, decay, deltaTime) {
  return target + (current - target) * Math.exp(-decay * deltaTime);
}

/**
 * 3D vector lerp
 * @param {{x: number, y: number, z: number}} current
 * @param {{x: number, y: number, z: number}} target
 * @param {number} t
 * @returns {{x: number, y: number, z: number}}
 */
export function lerpVector3(current, target, t) {
  return {
    x: lerp(current.x, target.x, t),
    y: lerp(current.y, target.y, t),
    z: lerp(current.z, target.z, t)
  };
}

