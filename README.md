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

Add this code to your Webflow page (before `</body>`):

```html
<!-- Immersive 3D Background Configuration -->
<script>
  window.IMMERSIVE_CONFIG = {
    logoPath: 'https://offpisteagency.github.io/immersive-op/public/OFF-PISTE.glb'
  };
</script>

<!-- Immersive 3D Background Script -->
<script src="https://offpisteagency.github.io/immersive-op/dist/immersive-bg.min.js"></script>
```

Don't forget to add the container div in Webflow Designer:
```html
<div id="hero-canvas"></div>
```
