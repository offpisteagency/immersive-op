/**
 * Immersive 3D Background with Head-Coupled Perspective
 * Main entry point and orchestration
 */

import * as THREE from 'three';
import { getConfig } from './config.js';
import { SceneManager } from './core/scene.js';
import { CameraController } from './core/camera.js';
import { ModelLoader } from './core/loader.js';
import { FaceTracker } from './tracking/face-tracker.js';
import { GyroscopeTracker } from './tracking/gyroscope.js';
import { FallbackAnimator } from './tracking/fallback.js';
import { TerminalOverlay } from './background/terminal-overlay.js';
import { 
  isMobile, 
  hasGyroscope, 
  supportsWebGL, 
  prefersReducedMotion,
  hasCameraAccess,
  getPixelRatio,
  gyroscopeNeedsPermission
} from './utils/device.js';

class ImmersiveBackground {
  constructor() {
    this.config = getConfig();
    this.container = null;
    this.canvas = null;
    this.renderer = null;
    this.sceneManager = null;
    this.cameraController = null;
    this.modelLoader = null;
    
    // Tracking systems
    this.faceTracker = null;
    this.gyroscopeTracker = null;
    this.fallbackAnimator = null;
    this.activeTracker = null;
    
    // Terminal overlay
    this.terminalOverlay = null;
    
    // Current tracking offset for passing to background layers
    this.currentTrackingOffset = { x: 0, y: 0, z: 0 };
    
    // Animation state
    this.isRunning = false;
    this.lastTime = 0;
    this.animationId = null;
    
    // Reduced motion mode
    this.reducedMotion = prefersReducedMotion();
    
    // Permission UI element
    this.permissionButton = null;
  }
  
  /**
   * Initialize the immersive background
   */
  async init() {
    // Check WebGL support
    if (!supportsWebGL()) {
      console.warn('WebGL not supported, hiding canvas');
      return false;
    }
    
    // Find or create container
    this.container = document.getElementById(this.config.containerId);
    if (!this.container) {
      console.log(`Container #${this.config.containerId} not found, creating it`);
      this.container = document.createElement('div');
      this.container.id = this.config.containerId;
      this.container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 0;
        pointer-events: none;
      `;
      document.body.insertBefore(this.container, document.body.firstChild);
    }
    
    try {
      // Create canvas and renderer
      this.setupRenderer();
      
      // Create scene
      this.sceneManager = new SceneManager(this.config);
      
      // Create camera
      this.cameraController = new CameraController(this.config);
      
      // Load model
      this.modelLoader = new ModelLoader(this.config);
      const model = await this.modelLoader.load();
      
      // Create environment map and apply chrome material for that liquid metal look
      const envMap = this.modelLoader.createEnvMap(this.renderer);
      this.sceneManager.setEnvironment(envMap);
      this.modelLoader.applyChromeMaterial(model, envMap);
      
      this.sceneManager.add(model);
      
      // Setup terminal overlay
      if (this.config.terminalOverlay) {
        this.terminalOverlay = new TerminalOverlay(this.config);
      }
      
      // Setup tracking based on device
      await this.setupTracking();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Start animation loop
      this.start();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize immersive background:', error);
      this.cleanup();
      return false;
    }
  }
  
  /**
   * Setup the WebGL renderer
   */
  setupRenderer() {
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
    this.container.appendChild(this.canvas);
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: this.config.antialias,
      alpha: true,
      powerPreference: 'high-performance'
    });
    
    const pixelRatio = getPixelRatio(this.config.maxPixelRatio);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;  // Slightly brighter for chrome visibility
  }
  
  /**
   * Setup tracking based on device capabilities
   */
  async setupTracking() {
    // Callback for all trackers - updates camera, parallax layers, and terminal overlay
    const onTrackingUpdate = (x, y, z) => {
      this.currentTrackingOffset = { x, y, z };
      this.cameraController.setTargetOffset(x, y, z);
      
      // Update parallax layers with tracking offset
      if (this.sceneManager) {
        this.sceneManager.setParallaxOffset(x, y);
      }
      
      // Update terminal overlay with tracking offset
      if (this.terminalOverlay) {
        this.terminalOverlay.setOffset(x, y);
      }
    };
    
    // Always create fallback animator
    this.fallbackAnimator = new FallbackAnimator(this.config, onTrackingUpdate);
    
    // If reduced motion is preferred, only use fallback with minimal animation
    if (this.reducedMotion) {
      console.log('Reduced motion preferred - using minimal fallback');
      this.fallbackAnimator.setSpeed(this.config.fallbackAnimationSpeed * 0.3);
      this.fallbackAnimator.setRadius({ x: 0.1, y: 0.05 });
      this.fallbackAnimator.start();
      this.activeTracker = 'fallback';
      return;
    }
    
    // Mobile: Use gyroscope
    if (isMobile()) {
      await this.setupMobileTracking(onTrackingUpdate);
    } else {
      // Desktop: Use face tracking
      await this.setupDesktopTracking(onTrackingUpdate);
    }
  }
  
  /**
   * Setup tracking for mobile devices
   */
  async setupMobileTracking(onUpdate) {
    if (!hasGyroscope()) {
      console.log('Gyroscope not available - using fallback');
      this.fallbackAnimator.start();
      this.activeTracker = 'fallback';
      return;
    }
    
    this.gyroscopeTracker = new GyroscopeTracker(this.config, onUpdate);
    
    // Check if permission is needed (iOS)
    if (gyroscopeNeedsPermission()) {
      this.showPermissionButton('motion');
    } else {
      // Android - start directly
      const started = await this.gyroscopeTracker.start();
      if (started) {
        this.activeTracker = 'gyroscope';
        console.log('Gyroscope tracking active');
      } else {
        this.fallbackAnimator.start();
        this.activeTracker = 'fallback';
      }
    }
  }
  
  /**
   * Setup tracking for desktop devices
   */
  async setupDesktopTracking(onUpdate) {
    if (!hasCameraAccess()) {
      console.log('Camera access not available - using fallback');
      this.fallbackAnimator.start();
      this.activeTracker = 'fallback';
      return;
    }
    
    this.faceTracker = new FaceTracker(this.config, onUpdate);
    
    // Start fallback initially while waiting for face tracking
    this.fallbackAnimator.start();
    this.activeTracker = 'fallback';
    
    // Delay camera request slightly to let page settle
    setTimeout(async () => {
      console.log('Attempting to start face tracking...');
      const started = await this.faceTracker.start();
      
      if (started) {
        // Stop fallback animation when face tracking starts
        this.fallbackAnimator.stop();
        this.activeTracker = 'face';
        console.log('Face tracking active - fallback stopped');
      } else {
        console.log('Camera denied - continuing with fallback');
      }
    }, this.config.cameraRequestDelay);
  }
  
  /**
   * Show permission button for iOS motion access
   */
  showPermissionButton(type) {
    // Check for existing button in page
    this.permissionButton = document.getElementById('enable-motion');
    
    if (!this.permissionButton) {
      // Create button if not exists
      this.permissionButton = document.createElement('button');
      this.permissionButton.id = 'enable-motion';
      this.permissionButton.className = 'enable-motion';
      this.permissionButton.textContent = 'Tap to enable motion tracking';
      this.permissionButton.style.cssText = `
        position: fixed;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%);
        padding: 0.75rem 1.5rem;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 2rem;
        color: white;
        font-size: 0.875rem;
        cursor: pointer;
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
        z-index: 100;
      `;
      document.body.appendChild(this.permissionButton);
    }
    
    this.permissionButton.classList.add('visible');
    this.permissionButton.style.display = 'block';
    
    const handleClick = async () => {
      if (type === 'motion' && this.gyroscopeTracker) {
        const granted = await this.gyroscopeTracker.requestPermission();
        if (granted) {
          const started = await this.gyroscopeTracker.start();
          if (started) {
            this.fallbackAnimator.stop();
            this.activeTracker = 'gyroscope';
            console.log('Gyroscope tracking active');
          }
        }
      }
      
      // Hide button
      this.permissionButton.style.display = 'none';
      this.permissionButton.classList.remove('visible');
      this.permissionButton.removeEventListener('click', handleClick);
    };
    
    this.permissionButton.addEventListener('click', handleClick);
    
    // Start fallback while waiting
    this.fallbackAnimator.start();
    this.activeTracker = 'fallback';
  }
  
  /**
   * Setup window event listeners
   */
  setupEventListeners() {
    // Resize handler
    window.addEventListener('resize', () => this.handleResize());
    
    // Visibility change (pause when hidden)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
      } else {
        this.resume();
      }
    });
    
    // Reduced motion preference change
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionQuery.addEventListener('change', (e) => {
      this.reducedMotion = e.matches;
      if (this.reducedMotion) {
        this.switchToFallback();
        this.fallbackAnimator.setSpeed(this.config.fallbackAnimationSpeed * 0.3);
      }
    });
  }
  
  /**
   * Handle window resize
   */
  handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.cameraController.resize(width, height);
    this.renderer.setSize(width, height);
  }
  
  /**
   * Switch to fallback animation
   */
  switchToFallback() {
    if (this.faceTracker) {
      this.faceTracker.stop();
    }
    if (this.gyroscopeTracker) {
      this.gyroscopeTracker.stop();
    }
    this.fallbackAnimator.start();
    this.activeTracker = 'fallback';
  }
  
  /**
   * Start the animation loop
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastTime = performance.now();
    this.animate();
  }
  
  /**
   * Pause the animation
   */
  pause() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
  
  /**
   * Resume the animation
   */
  resume() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.lastTime = performance.now();
      this.animate();
    }
  }
  
  /**
   * Animation loop
   */
  animate() {
    if (!this.isRunning) return;
    
    this.animationId = requestAnimationFrame((time) => this.animate());
    
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    // Update fallback animation if active
    if (this.activeTracker === 'fallback') {
      this.fallbackAnimator.update(currentTime);
    }
    
    // Update camera
    this.cameraController.update(deltaTime);
    
    // Update scene (particles, parallax layers, etc.)
    this.sceneManager.update(deltaTime);
    
    // Update terminal overlay
    if (this.terminalOverlay) {
      this.terminalOverlay.update();
    }
    
    // Update model
    if (this.modelLoader) {
      this.modelLoader.update(deltaTime, currentTime);
    }
    
    // Render
    this.renderer.render(
      this.sceneManager.getScene(),
      this.cameraController.getCamera()
    );
  }
  
  /**
   * Cleanup and dispose all resources
   */
  cleanup() {
    this.pause();
    
    if (this.faceTracker) {
      this.faceTracker.stop();
    }
    
    if (this.gyroscopeTracker) {
      this.gyroscopeTracker.stop();
    }
    
    if (this.terminalOverlay) {
      this.terminalOverlay.dispose();
    }
    
    if (this.sceneManager) {
      this.sceneManager.dispose();
    }
    
    if (this.modelLoader) {
      this.modelLoader.dispose();
    }
    
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}

// Auto-initialize when DOM is ready
function initImmersiveBackground() {
  try {
    console.log('Initializing immersive background...');
    const bg = new ImmersiveBackground();
    bg.init().then((success) => {
      if (success) {
        console.log('Immersive background initialized successfully');
      } else {
        console.warn('Immersive background initialization returned false');
      }
    }).catch((error) => {
      console.error('Immersive background initialization failed:', error);
    });
    
    // Expose for debugging
    window.__IMMERSIVE_BG__ = bg;
  } catch (error) {
    console.error('Immersive background error:', error);
  }
}

// Initialize on DOM ready with a small delay to ensure Webflow scripts are loaded
function safeInit() {
  // Small delay to ensure all Webflow elements are ready
  setTimeout(initImmersiveBackground, 100);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', safeInit);
} else {
  safeInit();
}

export { ImmersiveBackground };

