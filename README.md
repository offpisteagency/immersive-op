# immersive-op

Immersive 3D background with head-coupled perspective for Webflow integration.

## Files for Webflow

- `dist/immersive-bg.min.js` - Bundled script
- `public/OFF-PISTE.glb` - 3D model file

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
