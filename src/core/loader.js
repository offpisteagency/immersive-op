/**
 * GLTF Loader with Placeholder Fallback
 * Loads 3D models or provides a placeholder cube
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class ModelLoader {
  constructor(config) {
    this.config = config;
    this.loader = new GLTFLoader();
    this.model = null;
  }
  
  /**
   * Load a GLTF model or create a placeholder
   * @returns {Promise<THREE.Object3D>}
   */
  async load() {
    const { logoPath, logoScale } = this.config;
    
    // If no path provided, use placeholder
    if (!logoPath) {
      return this.createPlaceholder();
    }
    
    try {
      const gltf = await this.loadGLTF(logoPath);
      const model = gltf.scene;
      
      // Center and scale the model
      this.centerModel(model);
      model.scale.setScalar(logoScale);
      
      // Apply rotation if specified
      const { logoRotation } = this.config;
      if (logoRotation) {
        model.rotation.set(logoRotation.x, logoRotation.y, logoRotation.z);
      }
      
      this.model = model;
      return model;
    } catch (error) {
      console.warn('Failed to load GLTF, using placeholder:', error);
      return this.createPlaceholder();
    }
  }
  
  /**
   * Load GLTF file
   * @param {string} path
   * @returns {Promise<GLTF>}
   */
  loadGLTF(path) {
    return new Promise((resolve, reject) => {
      this.loader.load(
        path,
        (gltf) => resolve(gltf),
        (progress) => {
          // Optional: emit loading progress
          const percent = (progress.loaded / progress.total) * 100;
          if (this.onProgress) {
            this.onProgress(percent);
          }
        },
        (error) => reject(error)
      );
    });
  }
  
  /**
   * Center a model based on its bounding box
   * @param {THREE.Object3D} model
   */
  centerModel(model) {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    
    model.position.sub(center);
  }
  
  /**
   * Create a placeholder cube with metallic material
   * @returns {THREE.Mesh}
   */
  createPlaceholder() {
    // Create a stylish placeholder geometry
    const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    
    // Create premium metallic material with better visibility
    const material = new THREE.MeshStandardMaterial({
      color: 0x4a4a6a,
      metalness: 0.7,
      roughness: 0.3,
      emissive: 0x1a1a2a,
      emissiveIntensity: 0.3
    });
    
    // Create mesh
    const cube = new THREE.Mesh(geometry, material);
    
    // Add edge highlighting with brighter glow
    const edges = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ 
      color: 0x8080ff,
      transparent: true,
      opacity: 0.8
    });
    const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
    cube.add(edgeLines);
    
    // Apply initial rotation for visual interest
    cube.rotation.x = Math.PI * 0.1;
    cube.rotation.y = Math.PI * 0.25;
    
    // Scale according to config
    cube.scale.setScalar(this.config.logoScale);
    
    this.model = cube;
    this.isPlaceholder = true;
    
    return cube;
  }
  
  /**
   * Update model (for animations)
   * @param {number} deltaTime
   * @param {number} time - Total elapsed time
   */
  update(deltaTime, time) {
    // Model stays static - no auto-rotation
    // The "window effect" comes from camera movement, not model rotation
  }
  
  /**
   * Set loading progress callback
   * @param {Function} callback
   */
  setProgressCallback(callback) {
    this.onProgress = callback;
  }
  
  /**
   * Get the loaded model
   * @returns {THREE.Object3D|null}
   */
  getModel() {
    return this.model;
  }
  
  /**
   * Dispose of model resources
   */
  dispose() {
    if (this.model) {
      this.model.traverse((child) => {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => {
              if (mat.map) mat.map.dispose();
              mat.dispose();
            });
          } else {
            if (child.material.map) child.material.map.dispose();
            child.material.dispose();
          }
        }
      });
    }
  }
}

