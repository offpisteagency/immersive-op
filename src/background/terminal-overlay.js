/**
 * Terminal Overlay
 * Creates DOM-based terminal UI elements with parallax response
 */

export class TerminalOverlay {
  constructor(config) {
    this.config = config;
    this.container = null;
    this.elements = {};
    
    // Parallax state
    this.currentOffset = { x: 0, y: 0 };
    this.targetOffset = { x: 0, y: 0 };
    
    // Initialize if enabled
    if (config.terminalOverlay) {
      this.create();
    }
  }
  
  create() {
    // Create main container
    this.container = document.createElement('div');
    this.container.className = 'terminal-overlay';
    this.container.id = 'terminal-overlay';
    
    // Create corner brackets
    if (this.config.showCornerBrackets) {
      this.createCornerBrackets();
    }
    
    // Create system text blocks
    if (this.config.showSystemText) {
      this.createSystemText();
    }
    
    // Add scan line effect overlay
    this.createScanLineOverlay();
    
    // Append to body
    document.body.appendChild(this.container);
    
    // Trigger entrance animation
    requestAnimationFrame(() => {
      this.container.classList.add('active');
    });
  }
  
  createCornerBrackets() {
    const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    
    corners.forEach((corner, index) => {
      const bracket = document.createElement('div');
      bracket.className = `terminal-bracket terminal-bracket--${corner}`;
      bracket.innerHTML = this.getBracketSVG(corner);
      bracket.style.animationDelay = `${index * 0.1}s`;
      
      this.elements[`bracket-${corner}`] = bracket;
      this.container.appendChild(bracket);
    });
  }
  
  getBracketSVG(corner) {
    const size = 40;
    const strokeWidth = 1;
    const color = '#4a4a7e';
    
    // Different path based on corner
    let path;
    switch (corner) {
      case 'top-left':
        path = `M${strokeWidth},${size} L${strokeWidth},${strokeWidth} L${size},${strokeWidth}`;
        break;
      case 'top-right':
        path = `M${size - strokeWidth},${size} L${size - strokeWidth},${strokeWidth} L0,${strokeWidth}`;
        break;
      case 'bottom-left':
        path = `M${strokeWidth},0 L${strokeWidth},${size - strokeWidth} L${size},${size - strokeWidth}`;
        break;
      case 'bottom-right':
        path = `M${size - strokeWidth},0 L${size - strokeWidth},${size - strokeWidth} L0,${size - strokeWidth}`;
        break;
    }
    
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none">
        <path d="${path}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="square"/>
      </svg>
    `;
  }
  
  createSystemText() {
    // Top-left: Brand identity
    this.createTextBlock('top-left', [
      { text: 'OFF PISTE', class: 'terminal-text--highlight' },
      { text: '――――――――――', class: 'terminal-text--divider' },
      { text: 'CREATIVE STUDIO', class: 'terminal-text--label' },
      { text: 'EST. 2024', class: 'terminal-text--muted' }
    ]);
    
    // Top-right: Date/System info
    const now = new Date();
    this.createTextBlock('top-right', [
      { text: 'SYS_STATUS', class: 'terminal-text--label' },
      { text: '― ― ― ― ― ―', class: 'terminal-text--divider' },
      { text: `DATE : ${this.formatDate(now)}`, class: 'terminal-text--data', id: 'sys-date' },
      { text: `TIME : ${this.formatTime(now)}`, class: 'terminal-text--data', id: 'sys-time' }
    ]);
    
    // Bottom-left: Services/capabilities
    this.createTextBlock('bottom-left', [
      { text: 'SERVICES', class: 'terminal-text--label' },
      { text: '――――――――――', class: 'terminal-text--divider' },
      { text: '[ STRATEGY ]', class: 'terminal-text--tag' },
      { text: '[ DESIGN ]', class: 'terminal-text--tag' },
      { text: '[ DEVELOPMENT ]', class: 'terminal-text--tag' }
    ]);
    
    // Bottom-right: Technical info
    this.createTextBlock('bottom-right', [
      { text: 'DISPLAY_INFO', class: 'terminal-text--label' },
      { text: '― ― ― ― ― ― ―', class: 'terminal-text--divider' },
      { text: `RES : ${window.innerWidth}×${window.innerHeight}`, class: 'terminal-text--data', id: 'display-res' },
      { text: `DPR : ${window.devicePixelRatio.toFixed(1)}`, class: 'terminal-text--data' },
      { text: `FPS : --`, class: 'terminal-text--data', id: 'display-fps' }
    ]);
    
    // Start time updater
    this.startTimeUpdater();
    
    // Start FPS counter
    this.startFPSCounter();
    
    // Listen for resize
    window.addEventListener('resize', () => this.updateDisplayInfo());
  }
  
  createTextBlock(position, lines) {
    const block = document.createElement('div');
    block.className = `terminal-text-block terminal-text-block--${position}`;
    
    lines.forEach((line, index) => {
      const lineEl = document.createElement('div');
      lineEl.className = `terminal-text ${line.class || ''}`;
      lineEl.textContent = line.text;
      lineEl.style.animationDelay = `${0.5 + index * 0.1}s`;
      
      if (line.id) {
        lineEl.id = line.id;
        this.elements[line.id] = lineEl;
      }
      
      block.appendChild(lineEl);
    });
    
    this.elements[`text-${position}`] = block;
    this.container.appendChild(block);
  }
  
  createScanLineOverlay() {
    if (this.config.scanLineOpacity <= 0) return;
    
    const scanLines = document.createElement('div');
    scanLines.className = 'terminal-scanlines';
    scanLines.style.opacity = this.config.scanLineOpacity;
    
    this.elements.scanlines = scanLines;
    this.container.appendChild(scanLines);
  }
  
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  }
  
  formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }
  
  startTimeUpdater() {
    setInterval(() => {
      const now = new Date();
      if (this.elements['sys-date']) {
        this.elements['sys-date'].textContent = `DATE : ${this.formatDate(now)}`;
      }
      if (this.elements['sys-time']) {
        this.elements['sys-time'].textContent = `TIME : ${this.formatTime(now)}`;
      }
    }, 1000);
  }
  
  startFPSCounter() {
    let frames = 0;
    let lastTime = performance.now();
    
    const countFrame = () => {
      frames++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        if (this.elements['display-fps']) {
          this.elements['display-fps'].textContent = `FPS : ${frames}`;
        }
        frames = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(countFrame);
    };
    
    requestAnimationFrame(countFrame);
  }
  
  updateDisplayInfo() {
    if (this.elements['display-res']) {
      this.elements['display-res'].textContent = `RES : ${window.innerWidth}×${window.innerHeight}`;
    }
  }
  
  /**
   * Set target offset from tracking
   */
  setOffset(x, y) {
    this.targetOffset.x = x;
    this.targetOffset.y = y;
  }
  
  /**
   * Update parallax position
   */
  update() {
    if (!this.container) return;
    
    // Smooth interpolation
    const smoothing = 0.08;
    this.currentOffset.x += (this.targetOffset.x - this.currentOffset.x) * smoothing;
    this.currentOffset.y += (this.targetOffset.y - this.currentOffset.y) * smoothing;
    
    const multiplier = this.config.parallaxMultipliers?.ui || 0.6;
    const offsetX = this.currentOffset.x * multiplier * 10; // Scale for pixels
    const offsetY = this.currentOffset.y * multiplier * 10;
    
    // Apply transform to container
    this.container.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    
    // Apply inverse/different transforms to individual elements for depth
    const brackets = this.container.querySelectorAll('.terminal-bracket');
    brackets.forEach((bracket) => {
      const bracketMultiplier = 0.4;
      bracket.style.transform = `translate(${-offsetX * bracketMultiplier}px, ${-offsetY * bracketMultiplier}px)`;
    });
  }
  
  /**
   * Show the overlay
   */
  show() {
    if (this.container) {
      this.container.classList.add('active');
    }
  }
  
  /**
   * Hide the overlay
   */
  hide() {
    if (this.container) {
      this.container.classList.remove('active');
    }
  }
  
  /**
   * Clean up
   */
  dispose() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.elements = {};
  }
}

