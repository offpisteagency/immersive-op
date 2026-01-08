/**
 * Camera Controller with Head-Coupled Perspective
 * Manages camera position based on tracking input
 */

import * as THREE from 'three';
import { lerp, clamp } from '../utils/math.js';

export class CameraController {
  constructor(config) {
    this.config = config;
    
    // Create the camera
    this.camera = new THREE.PerspectiveCamera(
      config.cameraFOV,
      window.innerWidth / window.innerHeight,
      config.cameraNear,
      config.cameraFar
    );
    
    // Base position (where camera sits at rest)
    this.basePosition = new THREE.Vector3(0, 0, config.cameraDistance);
    
    // Current offset from base position
    this.currentOffset = { x: 0, y: 0, z: 0 };
    
    // Target offset (what we're interpolating towards)
    this.targetOffset = { x: 0, y: 0, z: 0 };
    
    // Look-at target (center of scene where logo is)
    this.lookAtTarget = new THREE.Vector3(0, 0, 0);
    
    // Initialize camera position
    this.camera.position.copy(this.basePosition);
    this.camera.lookAt(this.lookAtTarget);
  }
  
  /**
   * Set the target offset from tracking input
   * Values should be normalized to -1 to 1 range
   * @param {number} x - Horizontal offset (-1 = left, 1 = right)
   * @param {number} y - Vertical offset (-1 = down, 1 = up)
   * @param {number} z - Depth offset (-1 = closer, 1 = further)
   */
  setTargetOffset(x, y, z = 0) {
    const { maxCameraOffset, trackingSensitivity } = this.config;
    
    // Apply sensitivity and clamp to max offset
    this.targetOffset.x = clamp(
      x * trackingSensitivity * maxCameraOffset.x,
      -maxCameraOffset.x,
      maxCameraOffset.x
    );
    
    this.targetOffset.y = clamp(
      y * trackingSensitivity * maxCameraOffset.y,
      -maxCameraOffset.y,
      maxCameraOffset.y
    );
    
    this.targetOffset.z = clamp(
      z * trackingSensitivity * maxCameraOffset.z,
      -maxCameraOffset.z,
      maxCameraOffset.z
    );
  }
  
  /**
   * Update camera position with smooth interpolation
   * @param {number} deltaTime - Time since last frame in ms
   */
  update(deltaTime) {
    const smoothing = this.config.smoothingFactor;
    
    // Adjust smoothing based on delta time for frame-rate independence
    // This ensures consistent smoothing regardless of frame rate
    const t = 1 - Math.pow(1 - smoothing, deltaTime / 16.67);
    
    // Lerp current offset towards target
    this.currentOffset.x = lerp(this.currentOffset.x, this.targetOffset.x, t);
    this.currentOffset.y = lerp(this.currentOffset.y, this.targetOffset.y, t);
    this.currentOffset.z = lerp(this.currentOffset.z, this.targetOffset.z, t);
    
    // Apply offset to camera position
    this.camera.position.x = this.basePosition.x + this.currentOffset.x;
    this.camera.position.y = this.basePosition.y + this.currentOffset.y;
    this.camera.position.z = this.basePosition.z + this.currentOffset.z;
    
    // Always look at the center
    this.camera.lookAt(this.lookAtTarget);
  }
  
  /**
   * Handle window resize
   * @param {number} width - New window width
   * @param {number} height - New window height
   */
  resize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
  
  /**
   * Reset camera to default position
   * @param {boolean} immediate - If true, skip interpolation
   */
  reset(immediate = false) {
    this.targetOffset.x = 0;
    this.targetOffset.y = 0;
    this.targetOffset.z = 0;
    
    if (immediate) {
      this.currentOffset.x = 0;
      this.currentOffset.y = 0;
      this.currentOffset.z = 0;
      this.camera.position.copy(this.basePosition);
      this.camera.lookAt(this.lookAtTarget);
    }
  }
  
  /**
   * Get current offset values (for debugging)
   * @returns {{x: number, y: number, z: number}}
   */
  getCurrentOffset() {
    return { ...this.currentOffset };
  }
  
  /**
   * Get target offset values (for debugging)
   * @returns {{x: number, y: number, z: number}}
   */
  getTargetOffset() {
    return { ...this.targetOffset };
  }
  
  /**
   * Get the Three.js camera
   * @returns {THREE.PerspectiveCamera}
   */
  getCamera() {
    return this.camera;
  }
  
  /**
   * Set the look-at target
   * @param {THREE.Vector3} target
   */
  setLookAtTarget(target) {
    this.lookAtTarget.copy(target);
  }
}

