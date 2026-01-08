/**
 * Face Tracker using MediaPipe Face Detection
 * Tracks user's face position for head-coupled perspective
 */

import { mapRange, clamp } from '../utils/math.js';

export class FaceTracker {
  constructor(config, onUpdate) {
    this.config = config;
    this.onUpdate = onUpdate;
    
    this.video = null;
    this.canvas = null;
    this.ctx = null;
    this.faceDetection = null;
    this.isRunning = false;
    this.isInitialized = false;
    this.detectionInterval = null;
    
    // Camera preview element
    this.previewContainer = null;
    
    // Last known face position (normalized -1 to 1)
    this.lastPosition = { x: 0, y: 0, z: 0 };
    
    // For depth estimation (based on face size)
    this.baseFaceSize = null;
    
    // Smoothed position
    this.smoothedPosition = { x: 0, y: 0, z: 0 };
  }
  
  /**
   * Initialize face detection
   * @returns {Promise<boolean>}
   */
  async initialize() {
    try {
      console.log('Initializing face tracker...');
      
      // Create video element for camera feed
      this.video = document.createElement('video');
      this.video.setAttribute('playsinline', '');
      this.video.setAttribute('autoplay', '');
      this.video.setAttribute('muted', '');
      this.video.style.cssText = 'position: absolute; opacity: 0; pointer-events: none;';
      document.body.appendChild(this.video);
      
      // Load MediaPipe Face Detection dynamically
      await this.loadMediaPipe();
      
      console.log('Face tracker initialized');
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.warn('Failed to initialize face detection:', error);
      return false;
    }
  }
  
  /**
   * Load MediaPipe library dynamically
   */
  async loadMediaPipe() {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.FaceDetection) {
        this.setupFaceDetection();
        resolve();
        return;
      }
      
      // Load the face detection script
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/face_detection.js';
      script.crossOrigin = 'anonymous';
      
      script.onload = () => {
        console.log('MediaPipe Face Detection loaded');
        this.setupFaceDetection();
        resolve();
      };
      
      script.onerror = (err) => {
        console.error('Failed to load MediaPipe:', err);
        reject(err);
      };
      
      document.head.appendChild(script);
    });
  }
  
  /**
   * Setup face detection instance
   */
  setupFaceDetection() {
    this.faceDetection = new window.FaceDetection({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`;
      }
    });
    
    this.faceDetection.setOptions({
      model: 'short',
      minDetectionConfidence: 0.5
    });
    
    this.faceDetection.onResults((results) => this.handleResults(results));
  }
  
  /**
   * Request camera access and start tracking
   * @returns {Promise<boolean>}
   */
  async start() {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }
    
    try {
      console.log('Requesting camera access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      
      console.log('Camera access granted');
      
      this.video.srcObject = stream;
      
      // Wait for video to be ready
      await new Promise((resolve, reject) => {
        this.video.onloadedmetadata = () => {
          this.video.play().then(resolve).catch(reject);
        };
        this.video.onerror = reject;
        
        // Timeout after 5 seconds
        setTimeout(() => reject(new Error('Video load timeout')), 5000);
      });
      
      console.log('Video stream ready:', this.video.videoWidth, 'x', this.video.videoHeight);
      
      // Create camera preview
      this.createPreview();
      
      this.isRunning = true;
      this.startDetectionLoop();
      
      console.log('Face tracking started');
      return true;
    } catch (error) {
      console.warn('Camera access denied or unavailable:', error);
      return false;
    }
  }
  
  /**
   * Create camera preview overlay (like reference site)
   */
  createPreview() {
    this.previewContainer = document.createElement('div');
    this.previewContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 200px;
      height: 150px;
      border-radius: 12px;
      overflow: hidden;
      border: 2px solid rgba(255, 255, 255, 0.2);
      z-index: 1000;
      background: #000;
    `;
    
    // Clone video for preview
    const previewVideo = document.createElement('video');
    previewVideo.srcObject = this.video.srcObject;
    previewVideo.setAttribute('playsinline', '');
    previewVideo.setAttribute('autoplay', '');
    previewVideo.setAttribute('muted', '');
    previewVideo.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scaleX(-1);
    `;
    previewVideo.play();
    
    this.previewContainer.appendChild(previewVideo);
    document.body.appendChild(this.previewContainer);
  }
  
  /**
   * Start the detection loop at configured FPS
   */
  startDetectionLoop() {
    const intervalMs = 1000 / this.config.faceDetectionFPS;
    
    const detectFace = async () => {
      if (!this.isRunning) return;
      
      if (this.video.readyState >= 2 && this.faceDetection) {
        try {
          await this.faceDetection.send({ image: this.video });
        } catch (error) {
          console.warn('Face detection error:', error);
        }
      }
      
      this.detectionInterval = setTimeout(detectFace, intervalMs);
    };
    
    detectFace();
  }
  
  /**
   * Handle face detection results
   * @param {Object} results
   */
  handleResults(results) {
    if (!results.detections || results.detections.length === 0) {
      // No face detected - gradually return to center
      this.smoothedPosition.x *= 0.92;
      this.smoothedPosition.y *= 0.92;
      this.smoothedPosition.z *= 0.92;
      
      if (this.onUpdate) {
        this.onUpdate(this.smoothedPosition.x, this.smoothedPosition.y, this.smoothedPosition.z);
      }
      return;
    }
    
    const detection = results.detections[0];
    const bbox = detection.boundingBox;
    
    // Get normalized center of face (0-1 range from video)
    const centerX = bbox.xCenter;
    const centerY = bbox.yCenter;
    
    // Calculate face size (for depth estimation)
    const faceSize = bbox.width * bbox.height;
    
    // Set base face size on first detection
    if (this.baseFaceSize === null) {
      this.baseFaceSize = faceSize;
    }
    
    // Map to -1 to 1 range
    // Video is mirrored, so camera moves WITH the user for window effect:
    // User moves RIGHT → face appears on LEFT of video → camera should move RIGHT
    // centerX 0 = face on left of video = user moved right = camera X positive
    const rawX = mapRange(centerX, 0, 1, 1, -1);
    
    // Y: face moves up in video → user moved down → camera should move down
    // centerY 0 = top of video = user moved up = camera Y positive
    const rawY = mapRange(centerY, 0, 1, 1, -1);
    
    // Z: based on face size relative to base
    // Larger face = user closer → camera moves closer (negative Z offset)
    // Smaller face = user further → camera moves back (positive Z offset)
    const sizeRatio = faceSize / this.baseFaceSize;
    // Invert: larger face (>1) = negative Z (closer), smaller face (<1) = positive Z (further)
    const rawZ = clamp(mapRange(sizeRatio, 0.6, 1.6, 1, -1), -1, 1);
    
    // Apply smoothing - lower = smoother but slower response
    const smooth = 0.15;
    this.smoothedPosition.x += (rawX - this.smoothedPosition.x) * smooth;
    this.smoothedPosition.y += (rawY - this.smoothedPosition.y) * smooth;
    this.smoothedPosition.z += (rawZ - this.smoothedPosition.z) * smooth;
    
    if (this.onUpdate) {
      this.onUpdate(this.smoothedPosition.x, this.smoothedPosition.y, this.smoothedPosition.z);
    }
  }
  
  /**
   * Stop tracking and release resources
   */
  stop() {
    this.isRunning = false;
    
    if (this.detectionInterval) {
      clearTimeout(this.detectionInterval);
      this.detectionInterval = null;
    }
    
    if (this.video && this.video.srcObject) {
      const tracks = this.video.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      this.video.srcObject = null;
    }
    
    if (this.video && this.video.parentNode) {
      this.video.parentNode.removeChild(this.video);
    }
    
    if (this.previewContainer && this.previewContainer.parentNode) {
      this.previewContainer.parentNode.removeChild(this.previewContainer);
    }
  }
  
  /**
   * Check if face tracking is currently active
   * @returns {boolean}
   */
  isActive() {
    return this.isRunning;
  }
  
  /**
   * Get last known position
   * @returns {{x: number, y: number, z: number}}
   */
  getLastPosition() {
    return { ...this.smoothedPosition };
  }
  
  /**
   * Reset the base face size (recalibrate depth)
   */
  recalibrate() {
    this.baseFaceSize = null;
  }
  
  /**
   * Show/hide the camera preview
   * @param {boolean} visible
   */
  setPreviewVisible(visible) {
    if (this.previewContainer) {
      this.previewContainer.style.display = visible ? 'block' : 'none';
    }
  }
}
