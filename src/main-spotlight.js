/**
 * Interactive Spotlight Background
 * Main entry point for the dot/cross pattern with user-tracking spotlight
 */

import { getConfig } from './config.js';
import { SpotlightScene } from './scenes/spotlight/spotlight-scene.js';
import { FaceTracker } from './tracking/face-tracker.js';
import { GyroscopeTracker } from './tracking/gyroscope.js';
import { FallbackAnimator } from './tracking/fallback.js';
import { 
  isMobile, 
  hasGyroscope, 
  supportsWebGL, 
  prefersReducedMotion,
  hasCameraAccess,
  gyroscopeNeedsPermission
} from './utils/device.js';

class SpotlightBackground {
  constructor() {
    this.config = getConfig();
    this.container = null;
    this.scene = null;
    
    // Tracking systems
    this.faceTracker = null;
    this.gyroscopeTracker = null;
    this.fallbackAnimator = null;
    this.activeTracker = null;
    
    // Mouse tracking as additional fallback
    this.mousePosition = { x: 0, y: 0 };
    this.isMouseTracking = false;
    
    // Animation state
    this.isRunning = false;
    this.animationId = null;
    
    // Reduced motion mode
    this.reducedMotion = prefersReducedMotion();
    
    // Permission UI element
    this.permissionButton = null;
  }
  
  /**
   * Initialize the spotlight background
   */
  async init() {
    // Check WebGL support
    if (!supportsWebGL()) {
      console.warn('WebGL not supported');
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
      // Create spotlight scene
      this.scene = new SpotlightScene(this.config);
      const success = this.scene.init(this.container);
      
      if (!success) {
        console.error('Failed to initialize spotlight scene');
        return false;
      }
      
      // Setup tracking based on device
      await this.setupTracking();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Start animation loop
      this.start();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize spotlight background:', error);
      this.cleanup();
      return false;
    }
  }
  
  /**
   * Setup tracking based on device capabilities
   */
  async setupTracking() {
    // Callback for all trackers
    const onTrackingUpdate = (x, y, z) => {
      if (this.scene) {
        this.scene.setUserPosition(x, y);
      }
    };
    
    // Always create fallback animator
    this.fallbackAnimator = new FallbackAnimator(this.config, onTrackingUpdate);
    
    // If reduced motion is preferred, use minimal fallback
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
      console.log('Gyroscope not available - using mouse/touch fallback');
      this.enableMouseTracking();
      return;
    }
    
    this.gyroscopeTracker = new GyroscopeTracker(this.config, onUpdate);
    
    if (gyroscopeNeedsPermission()) {
      this.showPermissionButton('motion');
    } else {
      const started = await this.gyroscopeTracker.start();
      if (started) {
        this.activeTracker = 'gyroscope';
        console.log('Gyroscope tracking active');
      } else {
        this.enableMouseTracking();
      }
    }
  }
  
  /**
   * Setup tracking for desktop devices
   */
  async setupDesktopTracking(onUpdate) {
    if (!hasCameraAccess()) {
      console.log('Camera access not available - using mouse fallback');
      this.enableMouseTracking();
      return;
    }
    
    this.faceTracker = new FaceTracker(this.config, onUpdate);
    
    // Start with mouse tracking initially while waiting for face tracking
    this.enableMouseTracking();
    
    // Delay camera request slightly
    setTimeout(async () => {
      console.log('Attempting to start face tracking...');
      const started = await this.faceTracker.start();
      
      if (started) {
        // Disable mouse tracking and hide camera preview
        this.disableMouseTracking();
        this.faceTracker.setPreviewVisible(false); // Hide camera preview
        this.activeTracker = 'face';
        console.log('Face tracking active');
      } else {
        console.log('Camera denied - continuing with mouse tracking');
        this.activeTracker = 'mouse';
      }
    }, this.config.cameraRequestDelay);
  }
  
  /**
   * Enable mouse/touch position tracking as fallback
   */
  enableMouseTracking() {
    if (this.isMouseTracking) return;
    
    this.isMouseTracking = true;
    this.activeTracker = 'mouse';
    
    // Mouse move handler
    this.handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -((e.clientY / window.innerHeight) * 2 - 1); // Invert Y
      
      if (this.scene && this.activeTracker === 'mouse') {
        this.scene.setUserPosition(x, y);
      }
    };
    
    // Touch move handler
    this.handleTouchMove = (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const x = (touch.clientX / window.innerWidth) * 2 - 1;
        const y = -((touch.clientY / window.innerHeight) * 2 - 1);
        
        if (this.scene && this.activeTracker === 'mouse') {
          this.scene.setUserPosition(x, y);
        }
      }
    };
    
    // Enable pointer events on container for mouse tracking
    if (this.scene && this.scene.canvas) {
      this.scene.canvas.style.pointerEvents = 'auto';
    }
    
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('touchmove', this.handleTouchMove, { passive: true });
    
    console.log('Mouse/touch tracking enabled');
  }
  
  /**
   * Disable mouse tracking
   */
  disableMouseTracking() {
    if (!this.isMouseTracking) return;
    
    this.isMouseTracking = false;
    
    if (this.handleMouseMove) {
      window.removeEventListener('mousemove', this.handleMouseMove);
    }
    if (this.handleTouchMove) {
      window.removeEventListener('touchmove', this.handleTouchMove);
    }
    
    // Disable pointer events on canvas
    if (this.scene && this.scene.canvas) {
      this.scene.canvas.style.pointerEvents = 'none';
    }
    
    console.log('Mouse/touch tracking disabled');
  }
  
  /**
   * Show permission button for iOS motion access
   */
  showPermissionButton(type) {
    this.permissionButton = document.getElementById('enable-motion');
    
    if (!this.permissionButton) {
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
    
    this.permissionButton.style.display = 'block';
    
    const handleClick = async () => {
      if (type === 'motion' && this.gyroscopeTracker) {
        const granted = await this.gyroscopeTracker.requestPermission();
        if (granted) {
          const started = await this.gyroscopeTracker.start();
          if (started) {
            this.disableMouseTracking();
            this.activeTracker = 'gyroscope';
            console.log('Gyroscope tracking active');
          }
        }
      }
      
      this.permissionButton.style.display = 'none';
      this.permissionButton.removeEventListener('click', handleClick);
    };
    
    this.permissionButton.addEventListener('click', handleClick);
    
    // Enable mouse tracking while waiting
    this.enableMouseTracking();
  }
  
  /**
   * Setup window event listeners
   */
  setupEventListeners() {
    // Resize handler
    window.addEventListener('resize', () => this.handleResize());
    
    // Visibility change
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
      if (this.reducedMotion && this.fallbackAnimator) {
        this.switchToFallback();
        this.fallbackAnimator.setSpeed(this.config.fallbackAnimationSpeed * 0.3);
      }
    });
  }
  
  /**
   * Handle window resize
   */
  handleResize() {
    if (this.scene) {
      this.scene.resize();
    }
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
    this.disableMouseTracking();
    this.fallbackAnimator.start();
    this.activeTracker = 'fallback';
  }
  
  /**
   * Start the animation loop
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
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
      this.animate();
    }
  }
  
  /**
   * Animation loop
   */
  animate() {
    if (!this.isRunning) return;
    
    this.animationId = requestAnimationFrame(() => this.animate());
    
    const currentTime = performance.now();
    
    // Update fallback animation if active
    if (this.activeTracker === 'fallback' && this.fallbackAnimator) {
      this.fallbackAnimator.update(currentTime);
    }
    
    // Render scene
    if (this.scene) {
      this.scene.render();
    }
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
    
    this.disableMouseTracking();
    
    if (this.scene) {
      this.scene.dispose();
    }
    
    if (this.permissionButton && this.permissionButton.parentNode) {
      this.permissionButton.parentNode.removeChild(this.permissionButton);
    }
  }
}

// Auto-initialize when DOM is ready
function initSpotlightBackground() {
  try {
    console.log('Initializing spotlight background...');
    const bg = new SpotlightBackground();
    bg.init().then((success) => {
      if (success) {
        console.log('Spotlight background initialized successfully');
      } else {
        console.warn('Spotlight background initialization returned false');
      }
    }).catch((error) => {
      console.error('Spotlight background initialization failed:', error);
    });
    
    // Expose for debugging
    window.__SPOTLIGHT_BG__ = bg;
  } catch (error) {
    console.error('Spotlight background error:', error);
  }
}

function safeInit() {
  setTimeout(initSpotlightBackground, 100);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', safeInit);
} else {
  safeInit();
}

export { SpotlightBackground };
