/**
 * Gyroscope Handler for Mobile Devices
 * Uses DeviceOrientation API for head-coupled perspective on mobile
 */

import { mapRange, clamp } from '../utils/math.js';

export class GyroscopeTracker {
  constructor(config, onUpdate) {
    this.config = config;
    this.onUpdate = onUpdate;
    
    this.isRunning = false;
    this.hasPermission = false;
    this.needsPermission = this.checkNeedsPermission();
    
    // Current orientation values
    this.currentOrientation = { alpha: 0, beta: 0, gamma: 0 };
    
    // Bound handler for event listener
    this.handleOrientation = this.handleOrientation.bind(this);
  }
  
  /**
   * Check if device orientation requires permission (iOS 13+)
   * @returns {boolean}
   */
  checkNeedsPermission() {
    return typeof DeviceOrientationEvent !== 'undefined' && 
           typeof DeviceOrientationEvent.requestPermission === 'function';
  }
  
  /**
   * Request permission on iOS devices
   * Must be called from a user gesture
   * @returns {Promise<boolean>}
   */
  async requestPermission() {
    if (!this.needsPermission) {
      this.hasPermission = true;
      return true;
    }
    
    try {
      const permission = await DeviceOrientationEvent.requestPermission();
      this.hasPermission = permission === 'granted';
      return this.hasPermission;
    } catch (error) {
      console.warn('Gyroscope permission denied:', error);
      this.hasPermission = false;
      return false;
    }
  }
  
  /**
   * Check if device orientation is available
   * @returns {boolean}
   */
  isAvailable() {
    return 'DeviceOrientationEvent' in window;
  }
  
  /**
   * Start listening to device orientation
   * @returns {Promise<boolean>}
   */
  async start() {
    if (!this.isAvailable()) {
      console.warn('DeviceOrientation API not available');
      return false;
    }
    
    // Request permission if needed (should already be done via user gesture)
    if (this.needsPermission && !this.hasPermission) {
      const granted = await this.requestPermission();
      if (!granted) {
        return false;
      }
    }
    
    window.addEventListener('deviceorientation', this.handleOrientation);
    this.isRunning = true;
    
    return true;
  }
  
  /**
   * Handle device orientation event
   * @param {DeviceOrientationEvent} event
   */
  handleOrientation(event) {
    // beta: front-to-back tilt (-180 to 180, 0 is flat)
    // gamma: left-to-right tilt (-90 to 90)
    // alpha: compass direction (0 to 360) - we ignore this
    
    const { beta, gamma } = event;
    const { gyroMaxTilt, gyroSensitivity } = this.config;
    
    if (beta === null || gamma === null) {
      return;
    }
    
    this.currentOrientation = {
      alpha: event.alpha || 0,
      beta: beta,
      gamma: gamma
    };
    
    // Assume user holds phone roughly upright (beta around 45-90 degrees)
    // Map deviation from neutral to -1 to 1
    // Neutral: beta ~ 45 (holding phone at comfortable angle)
    const neutralBeta = 45;
    const betaOffset = beta - neutralBeta;
    
    // Clamp to max tilt range
    const clampedBeta = clamp(betaOffset, -gyroMaxTilt, gyroMaxTilt);
    const clampedGamma = clamp(gamma, -gyroMaxTilt, gyroMaxTilt);
    
    // Normalize to -1 to 1
    // Positive gamma (tilt right) should move camera right
    // Positive beta offset (tilt forward) should move camera down
    const normalizedX = mapRange(clampedGamma, -gyroMaxTilt, gyroMaxTilt, -1, 1) * gyroSensitivity;
    const normalizedY = mapRange(-clampedBeta, -gyroMaxTilt, gyroMaxTilt, -1, 1) * gyroSensitivity;
    
    if (this.onUpdate) {
      this.onUpdate(normalizedX, normalizedY, 0);
    }
  }
  
  /**
   * Stop listening to device orientation
   */
  stop() {
    window.removeEventListener('deviceorientation', this.handleOrientation);
    this.isRunning = false;
  }
  
  /**
   * Check if gyroscope is currently active
   * @returns {boolean}
   */
  isActive() {
    return this.isRunning;
  }
  
  /**
   * Check if permission is needed (iOS)
   * @returns {boolean}
   */
  requiresUserGesture() {
    return this.needsPermission && !this.hasPermission;
  }
  
  /**
   * Get current orientation values
   * @returns {{alpha: number, beta: number, gamma: number}}
   */
  getCurrentOrientation() {
    return { ...this.currentOrientation };
  }
}

