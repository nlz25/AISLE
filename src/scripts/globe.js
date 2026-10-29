/* A shaded, draggable sphere. NASA Blue Marble textures are hosted locally.
   No third-party runtime, telemetry, or live geographic data. */
(() => {
  const globe = document.querySelector('.portal-globe');
  if (!globe) return;
  const canvas = globe.querySelector('canvas');
  const portal = document.getElementById('entrance');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let gl;
  try {
    gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
      powerPreference: 'low-power'
    });
  } catch {
    /* Static image remains available. */ }
  const fallback = () => {
    globe.dataset.globeState = 'fallback';
    canvas.hidden = true;
  };
  if (!gl) {
    fallback();
    return;
  }

  const vertex = `attribute vec2 aPosition;
    varying vec2 vPosition;
    void main() { vPosition = aPosition; gl_Position = vec4(aPosition, 0., 1.); }`;
  const precision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT).precision ? 'highp' : 'mediump';
  const fragment = `precision ${precision} float;
    varying vec2 vPosition;
    uniform sampler2D uSurface;
    uniform sampler2D uClouds;
    uniform sampler2D uNight;
    uniform vec2 uView;
    uniform vec2 uCenter;
    uniform vec2 uSun;
    uniform float uRadius;
    uniform float uLongitude;
    uniform float uLatitude;
    uniform float uCloudDrift;
    const float PI = 3.14159265;
    vec2 coordinates(vec3 normal) {
      float c = cos(uLatitude), s = sin(uLatitude);
      vec3 tilted = vec3(normal.x, normal.y*c + normal.z*s, -normal.y*s + normal.z*c);
      return vec2(.5 + (atan(tilted.x, tilted.z) + uLongitude) / (2.*PI),
        .5 + asin(clamp(tilted.y, -1., 1.)) / PI);
    }
    void main() {
      vec2 pixel = (vec2(vPosition.x,-vPosition.y)*.5+.5)*uView;
      vec2 q = (pixel-uCenter)/uRadius;
      vec2 p = vec2(q.x,-q.y);
      float r = length(p);
      // A backlit dawn, with the sun anchored to the cropped horizon.
      vec2 sunNormal = (uSun-uCenter)/uRadius;
      vec3 light = normalize(vec3(sunNormal.x,-sunNormal.y,-1.05));
      vec2 delta = pixel-uSun;
      float distanceToSun = length(delta);
      float scale = clamp(uView.x/1200.,.65,1.4);
      float halo = exp(-distanceToSun/(65.*scale))*.34;
      float corona = exp(-distanceToSun/(16.*scale))*.8;
      float core = exp(-distanceToSun/(3.2*scale))*2.1;
      float streak = exp(-abs(delta.y)/(1.2*scale))*exp(-abs(delta.x)/(170.*scale))*.27;
      vec3 flare = vec3(1.,.61,.27)*halo + vec3(1.,.86,.61)*corona + vec3(1.,.98,.91)*core + vec3(.35,.53,.9)*streak;
      if (r > 1.) {
        float edgeDistance = (r-1.)*uRadius;
        float rim = exp(-edgeDistance/2.4)*.78 + exp(-edgeDistance/11.)*.15;
        float warmth = exp(-distanceToSun/(110.*scale));
        vec3 atmosphere = mix(vec3(.24,.57,.91),vec3(1.,.83,.53),warmth);
        float alpha = clamp(rim + max(flare.r,max(flare.g,flare.b)),0.,1.);
        gl_FragColor = vec4((atmosphere*rim+flare)/max(alpha,.0001),alpha);
        return;
      }
      vec3 n = vec3(p,sqrt(max(0.,1.-dot(p,p))));
      vec2 uv = coordinates(n);
      vec3 terrain = texture2D(uSurface,uv).rgb;
      vec3 night = texture2D(uNight,uv).rgb;
      float cloud = texture2D(uClouds,vec2(uv.x+uCloudDrift,uv.y)).r;
      cloud = smoothstep(.16,.88,cloud)*.82;
      float sea = 1.-smoothstep(-.025,.07,terrain.g-terrain.b);
      terrain = mix(terrain,vec3(.018,.057,.105),sea*.65);
      float incidence = dot(n,light);
      float day = smoothstep(-.12,.45,incidence);
      float daylight = max(incidence,0.);
      vec3 color = terrain*(.035+daylight*.69);
      color += vec3(.018,.031,.055)*(1.-day*.5);
      float lights = smoothstep(.18,.7,max(night.r,night.g));
      color += vec3(1.,.72,.35)*lights*(1.-day*.82)*(1.-cloud*.62)*1.45;
      color = mix(color,vec3(.50,.60,.73)*(.06+daylight*.95),cloud);
      float fresnel = pow(1.-n.z,3.);
      color += vec3(.09,.29,.53)*fresnel*(.28+daylight*.6);
      color += vec3(.40,.67,.93)*pow(1.-n.z,12.)*.55;
      color += flare;
      gl_FragColor = vec4(color,1.);
    }`;

  let program, uniforms, surfaceImage, cloudImage, nightImage;
  let geometry;
  let frame = 0,
    last = 0,
    ready = false,
    inView = true,
    dragging = false,
    paused = false;
  let longitude = 155 * Math.PI / 180,
    latitude = 10 * Math.PI / 180,
    cloudDrift = 0;
  let pointer = null,
    resumeAt = 0,
    inputFrame = 0;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      throw new Error('Globe shader unavailable');
    }
    return shader;
  }

  function texture(image, unit) {
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);
  }

  function initialize() {
    const vs = compile(gl.VERTEX_SHADER, vertex),
      fs = compile(gl.FRAGMENT_SHADER, fragment);
    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Globe program unavailable');
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    uniforms = Object.fromEntries(['uLongitude', 'uLatitude', 'uCloudDrift', 'uView', 'uCenter', 'uRadius', 'uSun'].map(name => [name, gl.getUniformLocation(program, name)]));
    texture(surfaceImage, 0);
    texture(cloudImage, 1);
    texture(nightImage, 2);
    gl.uniform1i(gl.getUniformLocation(program, 'uSurface'), 0);
    gl.uniform1i(gl.getUniformLocation(program, 'uClouds'), 1);
    gl.uniform1i(gl.getUniformLocation(program, 'uNight'), 2);
    canvas.hidden = false;
    ready = true;
    resize();
    globe.dataset.globeState = 'ready';
    syncAnimation();
  }

  function resize() {
    if (!ready || portal.hidden) return;
    const width = canvas.clientWidth,
      height = canvas.clientHeight;
    if (!width || !height) return;
    // Render only the viewport, even though most of the sphere lies outside it.
    const scale = Math.min(devicePixelRatio || 1, 1.25, 1280 / width, 900 / height);
    const renderWidth = Math.max(1, Math.round(width * scale));
    const renderHeight = Math.max(1, Math.round(height * scale));
    if (canvas.width !== renderWidth || canvas.height !== renderHeight) {
      canvas.width = renderWidth;
      canvas.height = renderHeight;
    }
    gl.viewport(0, 0, renderWidth, renderHeight);
    const mobile = width <= 500;
    const radius = width * (mobile ? 1.1 : .69);
    const center = [width * (mobile ? 1.58 : 1.2), height * (mobile ? .92 : 1.18)];
    const enterRect = portal.querySelector('.portal-enter').getBoundingClientRect();
    const touchY = enterRect.top + enterRect.height / 2 - canvas.getBoundingClientRect().top;
    const sunY = Math.max(height * .36, touchY - Math.min(92, width * .065));
    const dy = Math.max(-radius * .96, Math.min(radius * .96, sunY - center[1]));
    const sun = [center[0] - Math.sqrt(radius * radius - dy * dy), center[1] + dy];
    geometry = {
      width,
      height,
      radius,
      center,
      sun
    };
    gl.uniform2f(uniforms.uView, width, height);
    gl.uniform2f(uniforms.uCenter, ...center);
    gl.uniform2f(uniforms.uSun, ...sun);
    gl.uniform1f(uniforms.uRadius, radius);
    draw();
  }

  function draw() {
    if (!ready || !geometry || portal.hidden || document.hidden || gl.isContextLost()) return;
    gl.uniform1f(uniforms.uLongitude, longitude);
    gl.uniform1f(uniforms.uLatitude, latitude);
    gl.uniform1f(uniforms.uCloudDrift, cloudDrift);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function canAnimate() {
    return ready && inView && !portal.hidden && !document.hidden && !reduced.matches && !paused;
  }

  function tick(now) {
    frame = 0;
    if (!canAnimate()) return;
    if (now - last >= 1000 / (dragging ? 30 : 20)) {
      const dt = last ? Math.min((now - last) / 1000, .1) : 0;
      if (!dragging && now >= resumeAt) longitude = (longitude + dt * .024) % (Math.PI * 2);
      cloudDrift += dt * .00022;
      draw();
      last = now;
    }
    frame = requestAnimationFrame(tick);
  }

  function syncAnimation() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    globe.dataset.rotating = String(canAnimate() && !dragging);
    if (canAnimate()) frame = requestAnimationFrame(tick);
    else draw();
  }

  function updatePosition() {
    latitude = Math.max(-1.1, Math.min(1.1, latitude));
    longitude %= Math.PI * 2;
    globe.dataset.longitude = (longitude * 180 / Math.PI).toFixed(1);
    globe.dataset.latitude = (latitude * 180 / Math.PI).toFixed(1);
    resumeAt = performance.now() + 1800;
    if (!inputFrame) inputFrame = requestAnimationFrame(() => {
      inputFrame = 0;
      draw();
    });
  }
  canvas.addEventListener('pointerdown', event => {
    if (!ready || !geometry || event.button !== 0) return;
    const bounds = canvas.getBoundingClientRect();
    const x = event.clientX - bounds.left - geometry.center[0];
    const y = event.clientY - bounds.top - geometry.center[1];
    if (Math.hypot(x, y) > geometry.radius + 18) return;
    pointer = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY
    };
    dragging = true;
    globe.dataset.rotating = 'false';
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!pointer || pointer.id !== event.pointerId) return;
    const scale = 2.7 / Math.max(geometry.radius, 1);
    longitude -= (event.clientX - pointer.x) * scale;
    latitude += (event.clientY - pointer.y) * scale;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    updatePosition();
  });
  const release = () => {
    pointer = null;
    dragging = false;
    resumeAt = performance.now() + 1800;
    syncAnimation();
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('lostpointercapture', release);
  canvas.addEventListener('keydown', event => {
    if (!ready) return;
    const keys = {
      ArrowLeft: [.14, 0],
      ArrowRight: [-.14, 0],
      ArrowUp: [0, .1],
      ArrowDown: [0, -.1]
    };
    if (keys[event.key]) {
      event.preventDefault();
      longitude += keys[event.key][0];
      latitude += keys[event.key][1];
      updatePosition();
    } else if (event.code === 'Space') {
      event.preventDefault();
      paused = !paused;
      syncAnimation();
    }
  });
  new ResizeObserver(resize).observe(globe);
  new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    syncAnimation();
  }, {
    threshold: .05
  }).observe(globe);
  document.addEventListener('visibilitychange', syncAnimation);
  document.addEventListener('aisle:viewchange', () => {
    resize();
    syncAnimation();
  });
  reduced.addEventListener('change', syncAnimation);
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    ready = false;
    syncAnimation();
    fallback();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    try {
      initialize();
    } catch {
      fallback();
    }
  });
  const load = url => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
  Promise.all([load(globe.dataset.texture), load(globe.dataset.clouds), load(globe.dataset.night)]).then(images => {
    [surfaceImage, cloudImage, nightImage] = images;
    try {
      initialize();
    } catch {
      fallback();
    }
  }).catch(fallback);
})();
