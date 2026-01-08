/**
 * Parallax Background Layers
 * Creates a 3D perspective grid that tilts with head tracking
 */

import * as THREE from 'three';

export class ParallaxLayers {
  constructor(config) {
    this.config = config;
    this.layers = [];
    this.group = new THREE.Group();
    
    // Current offset values for smooth updates
    this.currentOffset = { x: 0, y: 0 };
    this.targetOffset = { x: 0, y: 0 };
    
    // Store grid meshes for perspective updates
    this.gridPlane = null;
    
    if (config.parallaxLayers) {
      this.createLayers();
    }
  }
  
  createLayers() {
    // Main 3D cross grid - responds to tracking with perspective tilt
    this.createCrossGrid();
  }
  
  /**
   * Create a 3D grid of crosses that tilts with head tracking
   */
  createCrossGrid() {
    const { config } = this;
    
    // Create a large plane for the cross grid
    const geometry = new THREE.PlaneGeometry(200, 200, 1, 1);
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOffset: { value: new THREE.Vector2(0, 0) },
        uColor: { value: new THREE.Color(0x5a5a7a) },
        uOpacity: { value: 0.65 },
        uGridSize: { value: 50.0 },  // Very dense grid
        uCrossSize: { value: 0.12 }, // Smaller cross arms
        uCrossThickness: { value: 0.02 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        
        void main() {
          vUv = uv;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec2 uOffset;
        uniform vec3 uColor;
        uniform float uOpacity;
        uniform float uGridSize;
        uniform float uCrossSize;
        uniform float uCrossThickness;
        
        varying vec2 vUv;
        varying vec3 vWorldPos;
        
        float drawCross(vec2 uv, float size, float thickness) {
          vec2 centered = abs(uv - 0.5);
          
          // Horizontal bar of cross
          float horizontal = step(centered.y, thickness) * step(centered.x, size);
          
          // Vertical bar of cross
          float vertical = step(centered.x, thickness) * step(centered.y, size);
          
          return max(horizontal, vertical);
        }
        
        float drawGridLines(vec2 uv, float lineThickness) {
          // Distance to nearest grid line
          float distX = abs(uv.x - 0.5);
          float distY = abs(uv.y - 0.5);
          
          // Create thin lines at cell edges (0 and 1 in cell space = grid lines)
          float lineX = 1.0 - smoothstep(0.0, lineThickness, min(uv.x, 1.0 - uv.x));
          float lineY = 1.0 - smoothstep(0.0, lineThickness, min(uv.y, 1.0 - uv.y));
          
          return max(lineX, lineY);
        }
        
        void main() {
          // Grid coordinates
          vec2 grid = vUv * uGridSize;
          vec2 gridId = floor(grid);
          vec2 gridUv = fract(grid);
          
          // Draw cross at each grid cell center
          float cross = drawCross(gridUv, uCrossSize, uCrossThickness);
          
          // Draw thin connecting lines between crosses
          float lineThickness = 0.008; // Very thin lines
          float lines = drawGridLines(gridUv, lineThickness);
          
          // Combine crosses and lines (crosses are brighter)
          float pattern = max(cross, lines * 0.5);
          
          // Very gentle fade - keep grid visible across entire screen
          float distFromCenter = length(vUv - 0.5) * 2.0;
          float fade = 1.0 - smoothstep(0.85, 1.15, distFromCenter);
          
          // Subtle depth variation based on position
          float depthVar = 1.0 - abs(vWorldPos.z) * 0.01;
          
          float alpha = pattern * fade * uOpacity * depthVar;
          
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 0, -50);
    mesh.userData.layerType = 'crossgrid';
    mesh.userData.baseRotation = { x: 0, y: 0 };
    
    this.gridPlane = mesh;
    this.layers.push(mesh);
    this.group.add(mesh);
  }
  
  /**
   * Set target offset from tracking
   */
  setOffset(x, y) {
    this.targetOffset.x = x;
    this.targetOffset.y = y;
  }
  
  /**
   * Update layers each frame - applies perspective tilt to grid
   */
  update(deltaTime, elapsedTime) {
    // Smooth interpolation of offset
    const smoothing = 0.04;
    this.currentOffset.x += (this.targetOffset.x - this.currentOffset.x) * smoothing;
    this.currentOffset.y += (this.targetOffset.y - this.currentOffset.y) * smoothing;
    
    // Update grid plane perspective based on tracking
    if (this.gridPlane) {
      // Tilt the grid based on head position - creates 3D depth effect
      const tiltStrength = 0.25; // How much the grid tilts (increased for more dramatic effect)
      
      // Rotate grid based on tracking offset
      // X tracking = Y rotation (left/right tilt)
      // Y tracking = X rotation (up/down tilt)
      this.gridPlane.rotation.y = this.currentOffset.x * tiltStrength;
      this.gridPlane.rotation.x = -this.currentOffset.y * tiltStrength * 0.6;
      
      // Position shift for parallax depth
      this.gridPlane.position.x = this.currentOffset.x * 3;
      this.gridPlane.position.y = this.currentOffset.y * 2;
      
      // Update shader uniforms
      const material = this.gridPlane.material;
      if (material.uniforms.uTime) {
        material.uniforms.uTime.value = elapsedTime * 0.001;
      }
      if (material.uniforms.uOffset) {
        material.uniforms.uOffset.value.set(this.currentOffset.x, this.currentOffset.y);
      }
    }
  }
  
  /**
   * Get the group to add to scene
   */
  getGroup() {
    return this.group;
  }
  
  /**
   * Dispose of resources
   */
  dispose() {
    for (const layer of this.layers) {
      layer.geometry.dispose();
      layer.material.dispose();
    }
    this.layers = [];
    this.gridPlane = null;
  }
}
