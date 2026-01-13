/**
 * Spotlight Scene Manager
 * Handles WebGL context, shader program, and render loop
 * for the interactive dot/cross pattern background
 */

import { vertexShader, fragmentShader, hexToRGB } from './dot-shader.js';
import { getPixelRatio } from '../../utils/device.js';

export class SpotlightScene {
  constructor(config) {
    this.config = config;
    this.canvas = null;
    this.gl = null;
    this.program = null;
    this.positionBuffer = null;
    this.uniforms = {};
    
    // User position (0-1 range, center is 0.5, 0.5)
    this.userPosition = { x: 0.5, y: 0.5 };
    this.targetPosition = { x: 0.5, y: 0.5 };
    
    // Animation state
    this.startTime = performance.now();
  }
  
  /**
   * Initialize the WebGL context and shader program
   * @param {HTMLElement} container - Container element for the canvas
   * @returns {boolean} Success status
   */
  init(container) {
    try {
      // Create canvas
      this.canvas = document.createElement('canvas');
      this.canvas.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 0;
        pointer-events: none;
      `;
      container.appendChild(this.canvas);
      
      // Get WebGL context
      this.gl = this.canvas.getContext('webgl', {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false
      });
      
      if (!this.gl) {
        console.error('WebGL not supported');
        return false;
      }
      
      // Setup viewport
      this.resize();
      
      // Create shader program
      if (!this.createProgram()) {
        return false;
      }
      
      // Create geometry (full-screen quad)
      this.createGeometry();
      
      // Get uniform locations
      this.getUniformLocations();
      
      // Set initial uniform values
      this.setUniforms();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize SpotlightScene:', error);
      return false;
    }
  }
  
  /**
   * Create and compile the shader program
   * @returns {boolean} Success status
   */
  createProgram() {
    const gl = this.gl;
    
    // Compile vertex shader
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vertexShader);
    gl.compileShader(vs);
    
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      console.error('Vertex shader compile error:', gl.getShaderInfoLog(vs));
      return false;
    }
    
    // Compile fragment shader
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fragmentShader);
    gl.compileShader(fs);
    
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error('Fragment shader compile error:', gl.getShaderInfoLog(fs));
      return false;
    }
    
    // Create program
    this.program = gl.createProgram();
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);
    
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error('Shader program link error:', gl.getProgramInfoLog(this.program));
      return false;
    }
    
    // Clean up individual shaders
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    
    return true;
  }
  
  /**
   * Create the full-screen quad geometry
   */
  createGeometry() {
    const gl = this.gl;
    
    // Full-screen quad (two triangles)
    const vertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1
    ]);
    
    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    
    // Setup attribute
    const positionLocation = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  }
  
  /**
   * Get all uniform locations
   */
  getUniformLocations() {
    const gl = this.gl;
    gl.useProgram(this.program);
    
    this.uniforms = {
      resolution: gl.getUniformLocation(this.program, 'u_resolution'),
      userPosition: gl.getUniformLocation(this.program, 'u_userPosition'),
      time: gl.getUniformLocation(this.program, 'u_time'),
      spotlightRadius: gl.getUniformLocation(this.program, 'u_spotlightRadius'),
      spotlightSoftness: gl.getUniformLocation(this.program, 'u_spotlightSoftness'),
      dotDensity: gl.getUniformLocation(this.program, 'u_dotDensity'),
      dotSize: gl.getUniformLocation(this.program, 'u_dotSize'),
      crossRatio: gl.getUniformLocation(this.program, 'u_crossRatio'),
      colorDark: gl.getUniformLocation(this.program, 'u_colorDark'),
      colorLight: gl.getUniformLocation(this.program, 'u_colorLight'),
      dotColorDark: gl.getUniformLocation(this.program, 'u_dotColorDark'),
      dotColorLight: gl.getUniformLocation(this.program, 'u_dotColorLight')
    };
  }
  
  /**
   * Set uniform values from config
   */
  setUniforms() {
    const gl = this.gl;
    const config = this.config;
    
    gl.useProgram(this.program);
    
    // Resolution
    gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
    
    // Spotlight settings
    gl.uniform1f(this.uniforms.spotlightRadius, config.spotlightRadius);
    gl.uniform1f(this.uniforms.spotlightSoftness, config.spotlightSoftness);
    
    // Pattern settings
    gl.uniform1f(this.uniforms.dotDensity, config.dotDensity);
    gl.uniform1f(this.uniforms.dotSize, config.dotSize);
    gl.uniform1f(this.uniforms.crossRatio, config.crossRatio);
    
    // Colors
    const colorDark = hexToRGB(config.colorDark);
    const colorLight = hexToRGB(config.colorLight);
    const dotColorDark = hexToRGB(config.dotColorDark);
    const dotColorLight = hexToRGB(config.dotColorLight);
    
    gl.uniform3fv(this.uniforms.colorDark, colorDark);
    gl.uniform3fv(this.uniforms.colorLight, colorLight);
    gl.uniform3fv(this.uniforms.dotColorDark, dotColorDark);
    gl.uniform3fv(this.uniforms.dotColorLight, dotColorLight);
  }
  
  /**
   * Set the target user position (will be smoothly interpolated)
   * @param {number} x - X position (-1 to 1, from tracking)
   * @param {number} y - Y position (-1 to 1, from tracking)
   */
  setUserPosition(x, y) {
    // Convert from -1,1 range to 0,1 range for shader
    this.targetPosition.x = (x + 1) * 0.5;
    this.targetPosition.y = (y + 1) * 0.5;
  }
  
  /**
   * Handle window resize
   */
  resize() {
    const pixelRatio = getPixelRatio(this.config.maxPixelRatio || 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.canvas.width = width * pixelRatio;
    this.canvas.height = height * pixelRatio;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    
    if (this.gl) {
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      
      // Update resolution uniform
      if (this.uniforms.resolution) {
        this.gl.useProgram(this.program);
        this.gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
      }
    }
  }
  
  /**
   * Render a single frame
   */
  render() {
    const gl = this.gl;
    if (!gl || !this.program) return;
    
    // Smooth interpolation of user position
    const smoothing = this.config.smoothingFactor || 0.08;
    this.userPosition.x += (this.targetPosition.x - this.userPosition.x) * smoothing;
    this.userPosition.y += (this.targetPosition.y - this.userPosition.y) * smoothing;
    
    gl.useProgram(this.program);
    
    // Update dynamic uniforms
    gl.uniform2f(this.uniforms.userPosition, this.userPosition.x, this.userPosition.y);
    
    const time = (performance.now() - this.startTime) / 1000;
    gl.uniform1f(this.uniforms.time, time);
    
    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  
  /**
   * Clean up resources
   */
  dispose() {
    const gl = this.gl;
    if (!gl) return;
    
    if (this.positionBuffer) {
      gl.deleteBuffer(this.positionBuffer);
    }
    
    if (this.program) {
      gl.deleteProgram(this.program);
    }
    
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    
    this.gl = null;
    this.canvas = null;
  }
}
