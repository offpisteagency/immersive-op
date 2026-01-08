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
    this.envMap = null;
    this.chromeMaterial = null;
  }
  
  /**
   * Create a procedural environment map for chrome reflections
   * @param {THREE.WebGLRenderer} renderer
   * @returns {THREE.Texture}
   */
  createEnvMap(renderer) {
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    
    // Create gradient environment for polished chrome look (brighter for more visible reflections)
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    
    // Create vertical gradient - brighter studio environment for more visible chrome
    const gradient = ctx.createLinearGradient(0, 0, 0, 1024);
    gradient.addColorStop(0, '#606080');     // Top - bright for strong rim highlights
    gradient.addColorStop(0.15, '#404060');  // Upper bright zone
    gradient.addColorStop(0.35, '#202030');  // Upper mid
    gradient.addColorStop(0.5, '#101018');   // Center dark band (creates the contrast)
    gradient.addColorStop(0.65, '#202030');  // Lower mid
    gradient.addColorStop(0.85, '#404060');  // Lower bright zone
    gradient.addColorStop(1, '#606080');     // Bottom - bright for reflections
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 1024);
    
    // Add strong bright spots for specular highlights (simulates studio lights)
    // Main key light - top right (very bright)
    const gradient1 = ctx.createRadialGradient(750, 120, 0, 750, 120, 200);
    gradient1.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    gradient1.addColorStop(0.2, 'rgba(255, 255, 255, 0.6)');
    gradient1.addColorStop(0.5, 'rgba(200, 210, 255, 0.25)');
    gradient1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient1;
    ctx.fillRect(0, 0, 1024, 1024);
    
    // Secondary fill light - top left
    const gradient2 = ctx.createRadialGradient(250, 180, 0, 250, 180, 150);
    gradient2.addColorStop(0, 'rgba(220, 230, 255, 0.7)');
    gradient2.addColorStop(0.3, 'rgba(180, 195, 230, 0.35)');
    gradient2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient2;
    ctx.fillRect(0, 0, 1024, 1024);
    
    // Bottom fill light (bounced light)
    const gradient3 = ctx.createRadialGradient(512, 880, 0, 512, 880, 250);
    gradient3.addColorStop(0, 'rgba(180, 190, 220, 0.5)');
    gradient3.addColorStop(0.4, 'rgba(140, 150, 180, 0.2)');
    gradient3.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient3;
    ctx.fillRect(0, 0, 1024, 1024);
    
    // Add horizontal bright band for that characteristic chrome stripe reflection
    const bandGradient = ctx.createLinearGradient(0, 400, 0, 600);
    bandGradient.addColorStop(0, 'rgba(80, 90, 110, 0)');
    bandGradient.addColorStop(0.4, 'rgba(100, 110, 140, 0.3)');
    bandGradient.addColorStop(0.5, 'rgba(140, 150, 180, 0.4)');
    bandGradient.addColorStop(0.6, 'rgba(100, 110, 140, 0.3)');
    bandGradient.addColorStop(1, 'rgba(80, 90, 110, 0)');
    ctx.fillStyle = bandGradient;
    ctx.fillRect(0, 0, 1024, 1024);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    
    this.envMap = pmremGenerator.fromEquirectangular(texture).texture;
    pmremGenerator.dispose();
    texture.dispose();
    
    return this.envMap;
  }
  
  /**
   * Apply chrome material to loaded model
   * @param {THREE.Object3D} model
   * @param {THREE.Texture} envMap
   */
  applyChromeMaterial(model, envMap) {
    // Create the polished dark chrome material using MeshPhysicalMaterial for better reflections
    this.chromeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x222228,           // Dark base with slight warmth
      metalness: 1.0,            // Full metallic
      roughness: 0.02,           // Very smooth for mirror-like finish
      envMap: envMap,
      envMapIntensity: 2.5,      // Strong reflections
      clearcoat: 0.3,            // Adds an extra reflective layer
      clearcoatRoughness: 0.1,   // Smooth clearcoat
      reflectivity: 1.0,         // Maximum reflectivity
    });
    
    model.traverse((child) => {
      if (child.isMesh) {
        // Dispose old material
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
        child.material = this.chromeMaterial;
        child.material.needsUpdate = true;
      }
    });
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

