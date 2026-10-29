/* A shaded, draggable sphere. NASA Blue Marble textures are hosted locally.
   No third-party runtime, telemetry, or live geographic data. */
(() => {
  const globe = document.querySelector('.portal-globe');
  if (!globe) return;
  const canvas = globe.querySelector('canvas');
  const portal = document.getElementById('entrance');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let gl;
  try { gl = canvas.getContext('webgl', {alpha: true, antialias: false, premultipliedAlpha: false, powerPreference: 'low-power'}); } catch { /* Static image remains available. */ }
  const fallback = () => {
    globe.dataset.globeState = 'fallback';
    canvas.hidden = true;
  };
  if (!gl) { fallback(); return; }

  const vertex = `attribute vec2 aPosition;
    varying vec2 vPosition;
    void main() { vPosition = aPosition; gl_Position = vec4(aPosition, 0., 1.); }`;
  const precision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT).precision ? 'highp' : 'mediump';
  const fragment = `precision ${precision} float;
    varying vec2 vPosition;
    uniform sampler2D uSurface;
    uniform sampler2D uClouds;
    uniform float uLongitude;
    uniform float uLatitude;
    uniform float uCloudDrift;
    const float PI = 3.14159265;
    vec2 coordinates(vec3 normal) {
      float c = cos(uLatitude), s = sin(uLatitude);
      vec3 tilted = vec3(normal.x, normal.y*c + normal.z*s, -normal.y*s + normal.z*c);
      return vec2(fract(.5 + (atan(tilted.x, tilted.z) + uLongitude) / (2.*PI)),
        .5 + asin(clamp(tilted.y, -1., 1.)) / PI);
    }
    void main() {
      // Padding leaves space for a real atmospheric falloff rather than a cutout edge.
      vec2 p = vPosition / .835;
      float r = length(p);
      vec3 light = normalize(vec3(.85, .55, 1.2));
      if (r > 1.) {
        float rim = exp(-(r-1.)*80.)*.62 + exp(-(r-1.)*25.)*.11;
        float sun = pow(max(dot(normalize(vec3(p, .05)), normalize(vec3(.8,.6,.05))),0.), 20.);
        gl_FragColor = vec4(mix(vec3(.22,.6,1.),vec3(1.,.83,.56),sun*.8), rim);
        return;
      }
      vec3 n = vec3(p, sqrt(max(0.,1.-dot(p,p))));
      vec2 uv = coordinates(n);
      vec3 terrain = texture2D(uSurface, uv).rgb;
      float cloud = texture2D(uClouds, vec2(fract(uv.x+uCloudDrift),uv.y)).r;
      cloud = smoothstep(.14,.86,cloud)*.91;
      float sea = 1.-smoothstep(-.025,.07,terrain.g-terrain.b);
      vec3 ocean = mix(vec3(.016,.072,.19),vec3(.035,.22,.39),terrain.g*2.);
      terrain = mix(terrain*1.1, ocean, sea*.84);
      float daylight = max(dot(n,light),0.);
      vec3 color = terrain*(.20+daylight*.93);
      vec3 halfLight = normalize(light+vec3(0.,0.,1.));
      float specular = pow(max(dot(n,halfLight),0.),65.)*sea*(1.-cloud);
      color += vec3(.43,.69,1.)*specular*.36;
      color = mix(color,vec3(.90,.95,1.)*(.32+daylight*.8),cloud);
      float fresnel = pow(1.-n.z,3.);
      color = mix(color,vec3(.22,.59,.96),fresnel*(.32+.38*daylight));
      color += vec3(.35,.72,1.)*pow(1.-n.z,9.)*.45;
      gl_FragColor = vec4(color,1.);
    }`;

  let program, uniforms, surfaceImage, cloudImage;
  let frame = 0, last = 0, ready = false, inView = true, dragging = false, paused = false;
  let longitude = 112 * Math.PI / 180, latitude = 8 * Math.PI / 180, cloudDrift = 0;
  let pointer = null, resumeAt = 0;
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
    const vs = compile(gl.VERTEX_SHADER,vertex), fs = compile(gl.FRAGMENT_SHADER,fragment);
    program = gl.createProgram();
    gl.attachShader(program,vs); gl.attachShader(program,fs); gl.linkProgram(program);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Globe program unavailable');
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program,'aPosition');
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    uniforms = Object.fromEntries(['uLongitude','uLatitude','uCloudDrift'].map(name => [name,gl.getUniformLocation(program,name)]));
    texture(surfaceImage,0); texture(cloudImage,1);
    gl.uniform1i(gl.getUniformLocation(program,'uSurface'),0);
    gl.uniform1i(gl.getUniformLocation(program,'uClouds'),1);
    canvas.hidden = false;
    ready = true;
    resize();
    globe.dataset.globeState = 'ready';
    syncAnimation();
  }
  function resize() {
    if (!ready || portal.hidden) return;
    const size = Math.min(1200,Math.max(1,Math.round(canvas.clientWidth*Math.min(devicePixelRatio || 1,2))));
    if (canvas.width !== size || canvas.height !== size) canvas.width = canvas.height = size;
    gl.viewport(0,0,size,size);
    draw();
  }
  function draw() {
    if (!ready || portal.hidden || document.hidden || gl.isContextLost()) return;
    gl.uniform1f(uniforms.uLongitude,longitude);
    gl.uniform1f(uniforms.uLatitude,latitude);
    gl.uniform1f(uniforms.uCloudDrift,cloudDrift);
    gl.drawArrays(gl.TRIANGLES,0,6);
  }
  function canAnimate() { return ready && inView && !portal.hidden && !document.hidden && !reduced.matches && !paused; }
  function tick(now) {
    frame = 0;
    if (!canAnimate()) return;
    if (now-last >= 1000/30) {
      const dt = last ? Math.min((now-last)/1000,.1) : 0;
      if (!dragging && now >= resumeAt) longitude = (longitude + dt*.075) % (Math.PI*2);
      cloudDrift += dt*.00045;
      draw(); last = now;
    }
    frame = requestAnimationFrame(tick);
  }
  function syncAnimation() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; last = 0;
    globe.dataset.rotating = String(canAnimate() && !dragging);
    if (canAnimate()) frame = requestAnimationFrame(tick);
    else draw();
  }
  function updatePosition() {
    latitude = Math.max(-1.1,Math.min(1.1,latitude));
    longitude %= Math.PI*2;
    globe.dataset.longitude = (longitude*180/Math.PI).toFixed(1);
    globe.dataset.latitude = (latitude*180/Math.PI).toFixed(1);
    resumeAt = performance.now()+1800;
    draw();
  }
  canvas.addEventListener('pointerdown', event => {
    if (!ready || event.button !== 0) return;
    pointer = {id:event.pointerId,x:event.clientX,y:event.clientY};
    dragging = true;
    globe.dataset.rotating = 'false';
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!pointer || pointer.id !== event.pointerId) return;
    const scale = 3.5/Math.max(canvas.clientWidth,1);
    longitude -= (event.clientX-pointer.x)*scale;
    latitude += (event.clientY-pointer.y)*scale;
    pointer.x = event.clientX; pointer.y = event.clientY;
    updatePosition();
  });
  const release = () => { pointer = null; dragging = false; resumeAt = performance.now()+1800; syncAnimation(); };
  canvas.addEventListener('pointerup',release);
  canvas.addEventListener('pointercancel',release);
  canvas.addEventListener('lostpointercapture',release);
  canvas.addEventListener('keydown', event => {
    if (!ready) return;
    const keys = {ArrowLeft:[.14,0],ArrowRight:[-.14,0],ArrowUp:[0,.1],ArrowDown:[0,-.1]};
    if (keys[event.key]) {
      event.preventDefault(); longitude += keys[event.key][0]; latitude += keys[event.key][1]; updatePosition();
    } else if (event.code === 'Space') {
      event.preventDefault(); paused = !paused; syncAnimation();
    }
  });
  new ResizeObserver(resize).observe(globe);
  new IntersectionObserver(entries => { inView = entries[0].isIntersecting; syncAnimation(); },{threshold:.05}).observe(globe);
  document.addEventListener('visibilitychange',syncAnimation);
  document.addEventListener('aisle:viewchange',() => { resize(); syncAnimation(); });
  reduced.addEventListener('change',syncAnimation);
  canvas.addEventListener('webglcontextlost',event => {
    event.preventDefault(); ready = false; syncAnimation(); fallback();
  });
  canvas.addEventListener('webglcontextrestored',() => { try { initialize(); } catch { fallback(); } });
  const load = url => new Promise((resolve,reject) => {
    const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = url;
  });
  Promise.all([load(globe.dataset.texture),load(globe.dataset.clouds)]).then(images => {
    [surfaceImage,cloudImage] = images;
    try { initialize(); } catch { fallback(); }
  }).catch(fallback);
})();
