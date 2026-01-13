/**
 * GLSL Shaders for fluid halftone effect
 * Organic flowing shapes that respond to user movement
 */

export const vertexShader = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  
  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

export const fragmentShader = `
  precision highp float;
  
  varying vec2 v_uv;
  
  uniform vec2 u_resolution;
  uniform vec2 u_userPosition;
  uniform float u_time;
  
  // Settings
  uniform float u_spotlightRadius;
  uniform float u_spotlightSoftness;
  uniform float u_dotDensity;
  uniform float u_dotSize;
  uniform float u_crossRatio;
  
  // Colors
  uniform vec3 u_colorDark;
  uniform vec3 u_colorLight;
  uniform vec3 u_dotColorDark;
  uniform vec3 u_dotColorLight;
  
  // Simplex-like noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
  
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                        -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
  
  // Fractal noise with subtle flow and time
  float fluidNoise(vec2 p, vec2 flow, float time) {
    float value = 0.0;
    float amplitude = 0.55;
    float frequency = 1.0;
    
    // Very slow organic drift
    float drift = time * 0.08;
    
    for (int i = 0; i < 5; i++) {
      // Each octave flows slightly differently - subtle
      vec2 octaveFlow = flow * (1.0 + float(i) * 0.05);
      vec2 octaveDrift = vec2(
        sin(drift + float(i) * 0.5) * 0.15,
        cos(drift * 0.7 + float(i) * 0.3) * 0.15
      );
      
      value += amplitude * snoise(p * frequency + octaveFlow + octaveDrift);
      amplitude *= 0.55;
      frequency *= 1.9;
    }
    return value;
  }
  
  // Subtle coordinate warping for organic feel
  vec2 warpCoord(vec2 p, vec2 flow, float time) {
    float warpStrength = 0.08;  // More subtle
    float wx = snoise(p * 2.0 + flow * 0.3 + time * 0.05);
    float wy = snoise(p * 2.0 + flow * 0.3 + time * 0.05 + 100.0);
    return p + vec2(wx, wy) * warpStrength;
  }
  
  // Draw a perfect circle dot
  float drawDot(vec2 uv, vec2 center, float radius) {
    float dist = length(uv - center);
    // Sharp edge for perfect circle
    return 1.0 - smoothstep(radius - 0.02, radius, dist);
  }
  
  void main() {
    vec2 uv = v_uv;
    float aspect = u_resolution.x / u_resolution.y;
    
    // Aspect-corrected UV
    vec2 uvAspect = vec2(uv.x * aspect, uv.y);
    
    // User position creates SUBTLE flow
    vec2 userOffset = (u_userPosition - 0.5) * 2.0;
    vec2 flow = userOffset * 1.2;  // Much more subtle
    
    // Very slow time for subtle organic movement
    float time = u_time * 0.2;
    
    // Grid for dots
    float cellSize = 1.0 / u_dotDensity;
    vec2 gridUV = uv / cellSize;
    vec2 cellIndex = floor(gridUV);
    vec2 cellUV = fract(gridUV);
    
    // Cell center for noise sampling
    vec2 cellCenter = (cellIndex + 0.5) * cellSize;
    vec2 cellCenterAspect = vec2(cellCenter.x * aspect, cellCenter.y);
    
    // Subtle coordinate warping for organic blob shapes
    vec2 warpedCoord = warpCoord(cellCenterAspect, flow, time);
    
    // Sample fluid noise at multiple scales - subtle flow influence
    float n1 = fluidNoise(warpedCoord * 2.0, flow * 0.4, time);
    float n2 = fluidNoise(warpedCoord * 3.5 + 50.0, flow * 0.5, time * 1.1);
    float n3 = fluidNoise(warpedCoord * 1.2 + 25.0, flow * 0.3, time * 0.8);
    
    // Combine noise layers - creates organic flowing blobs
    float combined = n1 * 0.45 + n2 * 0.35 + n3 * 0.35;
    
    // Smooth threshold for soft blob edges
    float blob = smoothstep(-0.2, 0.5, combined);
    
    // Subtle detail layer
    float detail = snoise(warpedCoord * 6.0 + flow * 0.2 + time * 0.1) * 0.1;
    blob = clamp(blob + detail, 0.0, 1.0);
    
    // Smooth curve for more natural falloff
    float influence = blob * blob * (3.0 - 2.0 * blob); // smootherstep
    
    // DYNAMIC DOT SIZE based on influence
    // Min size when dark, max size when bright
    float minDotSize = 0.08;
    float maxDotSize = 0.48;
    float dynamicRadius = mix(minDotSize, maxDotSize, influence) * u_dotSize;
    
    // Draw dot with dynamic size
    vec2 center = vec2(0.5);
    float dot = drawDot(cellUV, center, dynamicRadius);
    
    // Background
    vec3 bgColor = u_colorDark;
    
    // Dot color - also varies slightly with size for depth
    float colorIntensity = mix(0.5, 1.0, influence);
    vec3 dotColor = u_colorLight * colorIntensity;
    
    // Final color
    vec3 finalColor = mix(bgColor, dotColor, dot);
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

/**
 * Convert hex color string to RGB array (0-1 range)
 * @param {string} hex - Hex color string (e.g., '#0a0a0a')
 * @returns {number[]} RGB values in 0-1 range
 */
export function hexToRGB(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return [0, 0, 0];
  }
  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  ];
}
