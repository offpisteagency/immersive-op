# immersive-op

Immersive backgrounds with head-coupled perspective for Webflow integration.

## Available Backgrounds

This project includes two different interactive background effects:

### 1. 3D Logo Background (`immersive-bg.min.js`)
A 3D chrome logo that responds to user head movement, creating a "window into 3D space" effect.

### 2. Spotlight Background (`spotlight-bg.min.js`)
An interactive dot/cross pattern with a spotlight that follows user movement. The spotlight reveals a lighter area in a dark field of dots.

## Files for Webflow

- `dist/immersive-bg.min.js` - 3D logo background script
- `dist/spotlight-bg.min.js` - Spotlight dot pattern background script
- `public/OFF-PISTE.glb` - 3D model file (only needed for 3D logo)

## GitHub Pages Setup

1. Enable GitHub Pages in repository settings (Settings → Pages)
2. Select source: Deploy from a branch → main → / (root)
3. Use the GitHub Pages URL in Webflow

## Webflow Integration

### Step 1: Add the Container Div

In Webflow Designer, add this div where you want the 3D background to appear (typically in a hero section):

```html
<div id="hero-canvas"></div>
```

**Important CSS settings in Webflow:**
- Set the container to `position: relative` or `position: absolute`
- Ensure it has a width and height (or is inside a section with dimensions)
- Set z-index appropriately (background should be behind content)

### Step 2: Add the Scripts

In Webflow, go to **Project Settings → Custom Code → Footer Code** (or add to the page's Footer Code), and paste this:

```html
<!-- Immersive 3D Background Configuration -->
<script>
  window.IMMERSIVE_CONFIG = {
    logoPath: 'https://offpisteagency.github.io/immersive-op/public/OFF-PISTE.glb'
  };
</script>

<!-- Immersive 3D Background Script -->
<script>
  // Wait for Webflow to fully load
  window.addEventListener('load', function() {
    // Additional delay to ensure Webflow scripts are ready
    setTimeout(function() {
      var script = document.createElement('script');
      script.src = 'https://offpisteagency.github.io/immersive-op/dist/immersive-bg.min.js';
      script.onerror = function() {
        console.error('Failed to load immersive background script');
      };
      document.body.appendChild(script);
    }, 500);
  });
</script>
```

### Troubleshooting

If the 3D background doesn't appear:

1. **Check the browser console** (F12 → Console tab) for any errors
2. **Verify the container exists**: The script will create it automatically, but it's better to add it manually in Webflow
3. **Check file accessibility**: 
   - Script: https://offpisteagency.github.io/immersive-op/dist/immersive-bg.min.js
   - Model: https://offpisteagency.github.io/immersive-op/public/OFF-PISTE.glb
4. **Ensure WebGL is supported**: The script requires WebGL support (available in all modern browsers)
5. **Check z-index**: Make sure the canvas isn't hidden behind other elements
6. **Camera permissions**: On first load, the browser will ask for camera permission for face tracking

---

## Spotlight Background Integration

### Step 1: Add the Container Div

Same as 3D background - add a div with id `hero-canvas`:

```html
<div id="hero-canvas"></div>
```

### Step 2: Add the Scripts

```html
<!-- Spotlight Background Configuration (optional) -->
<script>
  window.IMMERSIVE_CONFIG = {
    // Spotlight settings
    spotlightRadius: 0.35,        // Size of spotlight (0-1)
    spotlightSoftness: 0.15,      // Edge softness
    dotDensity: 40,               // Dots per row
    dotSize: 0.4,                 // Relative dot size
    crossRatio: 0.3,              // Ratio of crosses vs dots
    
    // Colors (hex format)
    colorDark: '#0a0a0a',         // Dark area background
    colorLight: '#1a1a1a',        // Spotlight area background  
    dotColorDark: '#2a2a2a',      // Dots in dark area
    dotColorLight: '#0a0a0a'      // Dots in spotlight area
  };
</script>

<!-- Spotlight Background Script -->
<script>
  window.addEventListener('load', function() {
    setTimeout(function() {
      var script = document.createElement('script');
      script.src = 'https://offpisteagency.github.io/immersive-op/dist/spotlight-bg.min.js';
      document.body.appendChild(script);
    }, 500);
  });
</script>
```

### Tracking Modes

The spotlight background supports multiple tracking modes:

1. **Face Tracking (Desktop)** - Uses MediaPipe to track head position
2. **Gyroscope (Mobile)** - Uses device orientation sensors
3. **Mouse/Touch Fallback** - Falls back to cursor position if camera is denied

The camera preview is automatically hidden for the spotlight background.

---

## Development

### Build Commands

```bash
# Install dependencies
npm install

# Development server (serves index.html with 3D logo)
npm run dev

# Build both backgrounds
npm run build

# Build only 3D logo background
npm run build:immersive

# Build only spotlight background
npm run build:spotlight
```

### Test Pages

- `index.html` - 3D logo background demo
- `spotlight.html` - Spotlight background demo
