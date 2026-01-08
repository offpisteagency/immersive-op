/**
 * Three.js Scene Setup
 * Creates the scene with lighting, grid, particle system, and parallax layers
 */

import * as THREE from 'three';
import { ParallaxLayers } from '../background/parallax-layers.js';

export class SceneManager {
  constructor(config) {
    this.config = config;
    this.scene = new THREE.Scene();
    this.particles = null;
    this.particlePositions = null;
    this.particleVelocities = null;
    this.parallaxLayers = null;
    this.elapsedTime = 0;
    
    this.setupScene();
    this.setupLighting();
    
    // Setup parallax background layers
    if (config.parallaxLayers) {
      this.setupParallaxLayers();
    }
    
    if (config.showGrid) {
      this.setupGrid();
    }
    
    if (config.showParticles) {
      this.setupParticles();
    }
  }
  
  setupParallaxLayers() {
    this.parallaxLayers = new ParallaxLayers(this.config);
    this.scene.add(this.parallaxLayers.getGroup());
  }
  
  setupScene() {
    this.scene.background = new THREE.Color(this.config.backgroundColor);
    
    // Add subtle fog for depth
    this.scene.fog = new THREE.FogExp2(this.config.backgroundColor, 0.015);
  }
  
  setupLighting() {
    const { config } = this;
    
    // Ambient light for base visibility
    const ambient = new THREE.AmbientLight(
      config.ambientLightColor,
      config.ambientLightIntensity
    );
    this.scene.add(ambient);
    
    // Main directional light
    const mainLight = new THREE.DirectionalLight(
      config.mainLightColor,
      config.mainLightIntensity
    );
    mainLight.position.set(
      config.mainLightPosition.x,
      config.mainLightPosition.y,
      config.mainLightPosition.z
    );
    mainLight.castShadow = false;
    this.scene.add(mainLight);
    
    // Rim light for that premium tech feel
    const rimLight = new THREE.PointLight(
      config.rimLightColor,
      config.rimLightIntensity,
      20
    );
    rimLight.position.set(
      config.rimLightPosition.x,
      config.rimLightPosition.y,
      config.rimLightPosition.z
    );
    this.scene.add(rimLight);
    
    // Secondary fill light from below
    const fillLight = new THREE.DirectionalLight(0x404080, 0.3);
    fillLight.position.set(0, -3, 2);
    this.scene.add(fillLight);
  }
  
  setupGrid() {
    const { config } = this;
    
    // Create grid helper
    const grid = new THREE.GridHelper(
      config.gridSize,
      config.gridDivisions,
      config.gridCenterColor,
      config.gridColor
    );
    
    // Position below the center
    grid.position.y = -2;
    
    // Make grid fade at edges using custom shader material
    const gridMaterial = new THREE.ShaderMaterial({
      uniforms: {
        color1: { value: new THREE.Color(config.gridColor) },
        color2: { value: new THREE.Color(config.gridCenterColor) },
        fogColor: { value: new THREE.Color(config.backgroundColor) },
        fogDensity: { value: 0.025 }
      },
      vertexShader: `
        varying vec3 vPosition;
        void main() {
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color1;
        uniform vec3 color2;
        uniform vec3 fogColor;
        uniform float fogDensity;
        varying vec3 vPosition;
        
        void main() {
          float dist = length(vPosition.xz);
          float fade = exp(-dist * fogDensity);
          // Gradient from center color to edge color
          vec3 gridColor = mix(color1, color2, smoothstep(20.0, 0.0, dist));
          vec3 color = mix(fogColor, gridColor, fade * 0.7);
          gl_FragColor = vec4(color, fade * 0.5);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    // Create custom grid geometry
    const gridGeometry = new THREE.BufferGeometry();
    const positions = [];
    const halfSize = config.gridSize / 2;
    const step = config.gridSize / config.gridDivisions;
    
    for (let i = -halfSize; i <= halfSize; i += step) {
      // Lines along X
      positions.push(-halfSize, 0, i, halfSize, 0, i);
      // Lines along Z
      positions.push(i, 0, -halfSize, i, 0, halfSize);
    }
    
    gridGeometry.setAttribute('position', 
      new THREE.Float32BufferAttribute(positions, 3)
    );
    
    const customGrid = new THREE.LineSegments(gridGeometry, gridMaterial);
    customGrid.position.y = -2;
    this.scene.add(customGrid);
  }
  
  setupParticles() {
    const { config } = this;
    const count = config.particleCount;
    
    // Create particle geometry
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    
    const spread = config.particleSpread;
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Random positions in a cube
      positions[i3] = (Math.random() - 0.5) * spread;
      positions[i3 + 1] = (Math.random() - 0.5) * spread;
      positions[i3 + 2] = (Math.random() - 0.5) * spread;
      
      // Random slow velocities
      velocities[i3] = (Math.random() - 0.5) * config.particleDrift;
      velocities[i3 + 1] = (Math.random() - 0.5) * config.particleDrift;
      velocities[i3 + 2] = (Math.random() - 0.5) * config.particleDrift;
      
      // Random sizes
      sizes[i] = Math.random() * config.particleSize + config.particleSize * 0.5;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    this.particlePositions = positions;
    this.particleVelocities = velocities;
    
    // Particle material with glow effect
    const material = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(config.particleColor) },
        pointSize: { value: config.particleSize * 100 }
      },
      vertexShader: `
        attribute float size;
        uniform float pointSize;
        varying float vAlpha;
        
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * pointSize * (350.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
          
          // Fade based on distance - more gradual fade
          float dist = length(position);
          vAlpha = smoothstep(18.0, 3.0, dist);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float vAlpha;
        
        void main() {
          // Circular point with soft glow edges
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          float alpha = smoothstep(0.5, 0.1, dist) * vAlpha * 0.8;
          
          // Add slight color boost at center
          vec3 finalColor = color * (1.0 + smoothstep(0.3, 0.0, dist) * 0.5);
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }
  
  /**
   * Set parallax offset from tracking
   * @param {number} x - X offset
   * @param {number} y - Y offset
   */
  setParallaxOffset(x, y) {
    if (this.parallaxLayers) {
      this.parallaxLayers.setOffset(x, y);
    }
  }
  
  /**
   * Update particles and parallax layers
   * @param {number} deltaTime - Time since last frame
   */
  update(deltaTime) {
    this.elapsedTime += deltaTime;
    
    // Update parallax layers
    if (this.parallaxLayers) {
      this.parallaxLayers.update(deltaTime, this.elapsedTime);
    }
    
    // Update particles
    if (!this.particles || !this.particlePositions || !this.particleVelocities) {
      return;
    }
    
    const positions = this.particlePositions;
    const velocities = this.particleVelocities;
    const spread = this.config.particleSpread;
    const halfSpread = spread / 2;
    
    for (let i = 0; i < positions.length; i += 3) {
      // Update positions
      positions[i] += velocities[i] * deltaTime;
      positions[i + 1] += velocities[i + 1] * deltaTime;
      positions[i + 2] += velocities[i + 2] * deltaTime;
      
      // Wrap around at boundaries
      if (positions[i] > halfSpread) positions[i] = -halfSpread;
      if (positions[i] < -halfSpread) positions[i] = halfSpread;
      if (positions[i + 1] > halfSpread) positions[i + 1] = -halfSpread;
      if (positions[i + 1] < -halfSpread) positions[i + 1] = halfSpread;
      if (positions[i + 2] > halfSpread) positions[i + 2] = -halfSpread;
      if (positions[i + 2] < -halfSpread) positions[i + 2] = halfSpread;
    }
    
    // Update the buffer
    this.particles.geometry.attributes.position.needsUpdate = true;
  }
  
  /**
   * Add an object to the scene
   * @param {THREE.Object3D} object
   */
  add(object) {
    this.scene.add(object);
  }
  
  /**
   * Remove an object from the scene
   * @param {THREE.Object3D} object
   */
  remove(object) {
    this.scene.remove(object);
  }
  
  /**
   * Dispose of all resources
   */
  dispose() {
    if (this.particles) {
      this.particles.geometry.dispose();
      this.particles.material.dispose();
    }
    
    if (this.parallaxLayers) {
      this.parallaxLayers.dispose();
    }
    
    // Traverse and dispose all objects
    this.scene.traverse((object) => {
      if (object.geometry) {
        object.geometry.dispose();
      }
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(mat => mat.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
  }
  
  /**
   * Get the Three.js scene
   * @returns {THREE.Scene}
   */
  getScene() {
    return this.scene;
  }
}

