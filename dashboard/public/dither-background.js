// =========================================================
// HIGH-PERFORMANCE WEBGL DITHER & CHROMATIC WAVE ENGINE
// =========================================================

(function() {
  const canvas = document.createElement('canvas');
  canvas.id = 'dither-canvas';
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.zIndex = '0';
  canvas.style.pointerEvents = 'none';
  document.body.prepend(canvas);

  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) {
    console.warn('WebGL not supported for Dither background, using CSS fallback');
    document.body.style.background = 'radial-gradient(circle at 50% 30%, #1e1b4b 0%, #090d16 60%, #030712 100%)';
    return;
  }

  // Vertex Shader
  const vsSource = `
    attribute vec2 position;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  // Fragment Shader (Smooth FBM Ambient Waves + Multi-Palette + 8x8 Bayer Dithering - NO MOUSE DISTORTION)
  const fsSource = `
    precision highp float;
    uniform vec2 resolution;
    uniform float time;
    uniform float waveSpeed;
    uniform float waveFrequency;
    uniform float waveAmplitude;
    uniform vec3 waveColor;
    uniform vec3 waveColor2;
    uniform float colorNum;
    uniform float pixelSize;
    uniform int colorMode; // 1: Chroma, 2: Acid Emerald, 3: Nebula Violet, 4: Solar Sunset, 5: Midnight Thunder, 6: Cyberpunk Neon, 7: Crimson Eclipse, 0: Cyber Indigo

    float getBayerValue(int x, int y) {
      int index = y * 8 + x;
      if (index == 0) return 0.0/64.0;
      if (index == 1) return 48.0/64.0;
      if (index == 2) return 12.0/64.0;
      if (index == 3) return 60.0/64.0;
      if (index == 4) return 3.0/64.0;
      if (index == 5) return 51.0/64.0;
      if (index == 6) return 15.0/64.0;
      if (index == 7) return 63.0/64.0;
      if (index == 8) return 32.0/64.0;
      if (index == 9) return 16.0/64.0;
      if (index == 10) return 44.0/64.0;
      if (index == 11) return 28.0/64.0;
      if (index == 12) return 35.0/64.0;
      if (index == 13) return 19.0/64.0;
      if (index == 14) return 47.0/64.0;
      if (index == 15) return 31.0/64.0;
      if (index == 16) return 8.0/64.0;
      if (index == 17) return 56.0/64.0;
      if (index == 18) return 4.0/64.0;
      if (index == 19) return 52.0/64.0;
      if (index == 20) return 11.0/64.0;
      if (index == 21) return 59.0/64.0;
      if (index == 22) return 7.0/64.0;
      if (index == 23) return 55.0/64.0;
      if (index == 24) return 40.0/64.0;
      if (index == 25) return 24.0/64.0;
      if (index == 26) return 36.0/64.0;
      if (index == 27) return 20.0/64.0;
      if (index == 28) return 43.0/64.0;
      if (index == 29) return 27.0/64.0;
      if (index == 30) return 39.0/64.0;
      if (index == 31) return 23.0/64.0;
      if (index == 32) return 2.0/64.0;
      if (index == 33) return 50.0/64.0;
      if (index == 34) return 14.0/64.0;
      if (index == 35) return 62.0/64.0;
      if (index == 36) return 1.0/64.0;
      if (index == 37) return 49.0/64.0;
      if (index == 38) return 13.0/64.0;
      if (index == 39) return 61.0/64.0;
      if (index == 40) return 34.0/64.0;
      if (index == 41) return 18.0/64.0;
      if (index == 42) return 46.0/64.0;
      if (index == 43) return 30.0/64.0;
      if (index == 44) return 33.0/64.0;
      if (index == 45) return 17.0/64.0;
      if (index == 46) return 45.0/64.0;
      if (index == 47) return 29.0/64.0;
      if (index == 48) return 10.0/64.0;
      if (index == 49) return 58.0/64.0;
      if (index == 50) return 6.0/64.0;
      if (index == 51) return 54.0/64.0;
      if (index == 52) return 9.0/64.0;
      if (index == 53) return 57.0/64.0;
      if (index == 54) return 5.0/64.0;
      if (index == 55) return 53.0/64.0;
      if (index == 56) return 42.0/64.0;
      if (index == 57) return 26.0/64.0;
      if (index == 58) return 38.0/64.0;
      if (index == 59) return 22.0/64.0;
      if (index == 60) return 41.0/64.0;
      if (index == 61) return 25.0/64.0;
      if (index == 62) return 37.0/64.0;
      return 21.0/64.0;
    }

    vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    vec2 fade(vec2 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

    float cnoise(vec2 P) {
      vec4 Pi = floor(P.xyxy) + vec4(0.0,0.0,1.0,1.0);
      vec4 Pf = fract(P.xyxy) - vec4(0.0,0.0,1.0,1.0);
      Pi = mod289(Pi);
      vec4 ix = Pi.xzxz;
      vec4 iy = Pi.yyww;
      vec4 fx = Pf.xzxz;
      vec4 fy = Pf.yyww;
      vec4 i = permute(permute(ix) + iy);
      vec4 gx = fract(i * (1.0/41.0)) * 2.0 - 1.0;
      vec4 gy = abs(gx) - 0.5;
      vec4 tx = floor(gx + 0.5);
      gx = gx - tx;
      vec2 g00 = vec2(gx.x, gy.x);
      vec2 g10 = vec2(gx.y, gy.y);
      vec2 g01 = vec2(gx.z, gy.z);
      vec2 g11 = vec2(gx.w, gy.w);
      vec4 norm = taylorInvSqrt(vec4(dot(g00,g00), dot(g01,g01), dot(g10,g10), dot(g11,g11)));
      g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
      float n00 = dot(g00, vec2(fx.x, fy.x));
      float n10 = dot(g10, vec2(fx.y, fy.y));
      float n01 = dot(g01, vec2(fx.z, fy.z));
      float n11 = dot(g11, vec2(fx.w, fy.w));
      vec2 fade_xy = fade(Pf.xy);
      vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
      return 2.3 * mix(n_x.x, n_x.y, fade_xy.y);
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amp = 1.0;
      float freq = waveFrequency;
      for (int i = 0; i < 4; i++) {
        value += amp * abs(cnoise(p));
        p *= freq;
        amp *= waveAmplitude;
      }
      return value;
    }

    float pattern(vec2 p) {
      vec2 p2 = p - time * waveSpeed;
      return fbm(p + fbm(p2)); 
    }

    vec3 rainbow(float t) {
      vec3 a = vec3(0.5, 0.5, 0.5);
      vec3 b = vec3(0.5, 0.5, 0.5);
      vec3 c = vec3(1.0, 1.0, 1.0);
      vec3 d = vec3(0.0, 0.33, 0.67);
      return a + b * cos(6.28318 * (c * t + d));
    }

    vec3 dither(vec2 coord, vec3 color) {
      vec2 scaledCoord = floor(coord / pixelSize);
      int x = int(mod(scaledCoord.x, 8.0));
      int y = int(mod(scaledCoord.y, 8.0));
      float threshold = getBayerValue(x, y) - 0.25;
      float stepVal = 1.0 / max(1.0, (colorNum - 1.0));
      color += threshold * stepVal;
      float bias = 0.15;
      color = clamp(color - bias, 0.0, 1.0);
      return floor(color * (colorNum - 1.0) + 0.5) / (colorNum - 1.0);
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / resolution.xy;
      vec2 centeredUV = uv - 0.5;
      centeredUV.x *= resolution.x / resolution.y;

      float f = pattern(centeredUV);
      vec3 rawColor;

      if (colorMode == 1) {
        // Chroma Rainbow Explosion
        float hue1 = fract(f * 1.4 + time * 0.12 + uv.x * 0.4);
        vec3 colA = rainbow(hue1);
        vec3 colB = rainbow(fract(hue1 + 0.35));
        rawColor = mix(colA, colB, sin(f * 3.1415) * 0.5 + 0.5);
        rawColor = mix(rawColor, vec3(1.0, 0.15, 0.75), pow(f, 2.2));
      } else if (colorMode == 2) {
        // Acid Lime & Cyber Emerald
        vec3 colDeep = vec3(0.02, 0.12, 0.06);
        vec3 colLime = vec3(0.12, 0.95, 0.22);
        vec3 colBlue = vec3(0.06, 0.32, 0.95);
        rawColor = mix(colDeep, colLime, f);
        rawColor = mix(rawColor, colBlue, sin(uv.x * 3.0 + time * 0.15) * 0.4 + 0.4);
      } else if (colorMode == 3) {
        // Nebula Violet Glow
        vec3 colDark = vec3(0.05, 0.02, 0.15);
        vec3 colMagenta = vec3(0.85, 0.18, 0.95);
        vec3 colCyan = vec3(0.06, 0.85, 0.95);
        rawColor = mix(colDark, colMagenta, f);
        rawColor = mix(rawColor, colCyan, pow(f, 2.0));
      } else if (colorMode == 4) {
        // Solar Sunset
        vec3 colDark = vec3(0.12, 0.02, 0.02);
        vec3 colOrange = vec3(1.0, 0.42, 0.05);
        vec3 colGold = vec3(1.0, 0.85, 0.12);
        rawColor = mix(colDark, colOrange, f);
        rawColor = mix(rawColor, colGold, pow(f, 2.2));
      } else if (colorMode == 5) {
        // Midnight Thunder (Céu Noturno com nuvens carregadas e relâmpagos azul elétrico)
        vec3 nightSky = vec3(0.015, 0.022, 0.055);
        vec3 darkCloud = vec3(0.045, 0.075, 0.16);
        vec3 stormEdge = vec3(0.10, 0.18, 0.36);
        vec3 electricCyan = vec3(0.0, 0.92, 1.0);
        vec3 lightningWhite = vec3(0.9, 0.96, 1.0);

        // Volumetric dense storm clouds
        vec3 clouds = mix(nightSky, darkCloud, f);
        clouds = mix(clouds, stormEdge, pow(f, 2.4));

        // Thunderstorm lightning strikes & rhythmic flashing
        float t = time * 2.6;
        float pulse1 = max(0.0, sin(t * 1.3) * sin(t * 2.7 + 0.8) * cos(t * 4.1 + 1.5));
        float flash = pow(pulse1, 5.0) * 3.6;

        // Micro strobe jitter for realistic lightning feel
        float jitter = step(0.93, fract(sin(floor(time * 16.0) * 78233.1337))) * 0.85;
        flash += jitter;

        // Spatial branch energy through the dither clouds
        float branchNoise = pow(abs(cnoise(centeredUV * 9.0 + vec2(time * 0.6, -time * 0.3))), 1.6);
        
        vec3 energized = mix(clouds, electricCyan, (flash * 0.7 + branchNoise * 0.4) * (f * 0.85 + 0.15));
        energized += lightningWhite * flash * branchNoise * 1.8;
        rawColor = energized;
      } else if (colorMode == 6) {
        // Cyberpunk Neon Dream (Hot Magenta & Cyber Cyan)
        vec3 colVoid = vec3(0.03, 0.01, 0.07);
        vec3 colMagenta = vec3(1.0, 0.06, 0.58);
        vec3 colCyan = vec3(0.0, 0.96, 0.92);
        vec3 colLaser = vec3(1.0, 0.92, 0.2);
        rawColor = mix(colVoid, colMagenta, f);
        rawColor = mix(rawColor, colCyan, sin(f * 3.1415 + uv.x * 2.2) * 0.5 + 0.5);
        rawColor = mix(rawColor, colLaser, pow(f, 3.2) * 0.7);
      } else if (colorMode == 7) {
        // Crimson Eclipse Fire (Blood Moon & Ruby Ember)
        vec3 colObsidian = vec3(0.04, 0.01, 0.02);
        vec3 colBlood = vec3(0.95, 0.06, 0.18);
        vec3 colHotOrange = vec3(1.0, 0.46, 0.02);
        vec3 colWhiteEmber = vec3(1.0, 0.92, 0.75);
        rawColor = mix(colObsidian, colBlood, f);
        rawColor = mix(rawColor, colHotOrange, pow(f, 1.8));
        rawColor = mix(rawColor, colWhiteEmber, pow(f, 3.4) * 0.8);
      } else {
        // Cyber Indigo
        rawColor = mix(waveColor2, waveColor, f);
      }

      rawColor = pow(rawColor, vec3(0.88));
      rawColor *= 1.2;

      vec3 finalColor = dither(gl_FragCoord.xy, rawColor);
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    return;
  }

  gl.useProgram(program);

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
    -1,  1,
     1, -1,
     1,  1,
  ]), gl.STATIC_DRAW);

  const positionLocation = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  const uResolution = gl.getUniformLocation(program, 'resolution');
  const uTime = gl.getUniformLocation(program, 'time');
  const uWaveSpeed = gl.getUniformLocation(program, 'waveSpeed');
  const uWaveFrequency = gl.getUniformLocation(program, 'waveFrequency');
  const uWaveAmplitude = gl.getUniformLocation(program, 'waveAmplitude');
  const uWaveColor = gl.getUniformLocation(program, 'waveColor');
  const uWaveColor2 = gl.getUniformLocation(program, 'waveColor2');
  const uColorNum = gl.getUniformLocation(program, 'colorNum');
  const uPixelSize = gl.getUniformLocation(program, 'pixelSize');
  const uColorMode = gl.getUniformLocation(program, 'colorMode');

  // Background Settings - Stored in localStorage for persistence
  const savedMode = localStorage.getItem('opencode_dither_mode');
  window.ditherSettings = {
    colorMode: savedMode !== null ? parseInt(savedMode, 10) : 0,
    waveSpeed: 0.05,
    waveFrequency: 2.4,
    waveAmplitude: 0.32,
    waveColor: [0.38, 0.4, 0.95],
    waveColor2: [0.03, 0.05, 0.12],
    colorNum: 8.0,
    pixelSize: 2.5
  };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  window.addEventListener('resize', resize);
  resize();

  let startTime = performance.now();

  function render() {
    const elapsed = (performance.now() - startTime) / 1000.0;
    const s = window.ditherSettings;

    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform1f(uTime, elapsed);
    gl.uniform1f(uWaveSpeed, s.waveSpeed);
    gl.uniform1f(uWaveFrequency, s.waveFrequency);
    gl.uniform1f(uWaveAmplitude, s.waveAmplitude);
    gl.uniform3f(uWaveColor, s.waveColor[0], s.waveColor[1], s.waveColor[2]);
    gl.uniform3f(uWaveColor2, s.waveColor2[0], s.waveColor2[1], s.waveColor2[2]);
    gl.uniform1f(uColorNum, s.colorNum);
    gl.uniform1f(uPixelSize, s.pixelSize);
    gl.uniform1i(uColorMode, s.colorMode);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
