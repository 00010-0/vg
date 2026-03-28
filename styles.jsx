import { useState, useEffect, useRef, useCallback } from "react";

/* ─────────────────────────────────────────────
   DATA
───────────────────────────────────────────── */
const LABELS = ["Hero", "About", "Music", "Links", "Contact"];

const SLIDES = [
  {
    id: 0, num: "01", kicker: "Sonic Producer · Beatmaker",
    lines: [{ text: "V", accent: false, stroke: true }, { text: "G", accent: true }],
    sub: "West Coast · Type Beats · Production",
    links: [], hint: true,
  },
  {
    id: 1, num: "02", kicker: "About",
    lines: [{ text: "Sound" }, { text: "is my" }, { text: "craft.", accent: true }],
    sub: "Producing since day one. Every beat, a signature.",
    links: [],
  },
  {
    id: 2, num: "03", kicker: "Music",
    lines: [{ text: "Tracks", accent: true }],
    sub: null,
    links: [
      { label: "BigXthaPlug — Mmhmm (Remix)", tag: "SoundCloud ↗", href: "https://soundcloud.com/vg_the_producer/bigxthaplug-mmhmm-vgs-remix" },
      { label: "Type Beats Collection", tag: "YouTube ↗", href: "https://www.youtube.com/@typebeatVG" },
      { label: "West Coast Vibes", tag: "YouTube ↗", href: "https://www.youtube.com/@WestCoastVG" },
      { label: "Beat Store", tag: "BeatStars ↗", href: "https://www.beatstars.com/vgnx" },
    ],
  },
  {
    id: 3, num: "04", kicker: "Platforms",
    lines: [{ text: "Links", accent: true }],
    sub: null,
    links: [
      { label: "@WestCoastVG", tag: "YouTube ↗", href: "https://www.youtube.com/@WestCoastVG" },
      { label: "@typebeatVG", tag: "YouTube ↗", href: "https://www.youtube.com/@typebeatVG" },
      { label: "@vg_prodd", tag: "TikTok ↗", href: "https://www.tiktok.com/@vg_prodd" },
      { label: "@vg_prodd", tag: "Instagram ↗", href: "https://www.instagram.com/vg_prodd" },
      { label: "vgnx", tag: "BeatStars ↗", href: "https://www.beatstars.com/vgnx" },
      { label: "vg_the_producer", tag: "SoundCloud ↗", href: "https://soundcloud.com/vg_the_producer/bigxthaplug-mmhmm-vgs-remix" },
    ],
  },
  {
    id: 4, num: "05", kicker: "Contact",
    lines: [{ text: "Let's" }, { text: "make" }, { text: "it.", accent: true }],
    sub: null,
    links: [
      { label: "License a beat", tag: "BeatStars ↗", href: "https://www.beatstars.com/vgnx" },
      { label: "Collabs & features", tag: "Instagram ↗", href: "https://www.instagram.com/vg_prodd" },
    ],
  },
];

/* ─────────────────────────────────────────────
   GLSL  —  3× intensity: triple wave, twist, scanlines, flash
───────────────────────────────────────────── */
const VERT_SCENE = `
uniform float uTime;
uniform float uWave;
uniform float uDir;
uniform float uTwist;
varying vec2 vUv;
varying float vNoise;
varying float vDist;

float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p);
  f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
             mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}

void main(){
  vec3 p=position;
  float dist=length(uv-vec2(.5));
  vDist=dist;

  float w1=sin(dist*20.-uTime*5.5)*uWave*0.24*uDir;
  float w2=sin(dist* 9.+uTime*3.8+1.6)*uWave*0.14*uDir;
  float w3=cos(uv.x*14.-uTime*4.5)*uWave*0.09;
  p.z+=w1+w2+w3;

  float angle=uTwist*dist*2.5;
  float s=sin(angle),c=cos(angle);
  vec2 rot=vec2(
    (uv.x-.5)*c-(uv.y-.5)*s+.5,
    (uv.x-.5)*s+(uv.y-.5)*c+.5
  );
  vUv=mix(uv,rot,uWave*0.65);

  float n=noise(uv*9.+uTime*.9)*uWave;
  vNoise=n;
  p.z+=n*0.07;

  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
}`;

const FRAG_SCENE = `
uniform sampler2D uTex;
uniform float uAlpha;
uniform float uWave;
uniform float uTime;
varying vec2 vUv;
varying float vNoise;
varying float vDist;

void main(){
  float ca=uWave*0.032;
  vec2 dir=normalize(vUv-vec2(.5)+.001);
  float r=texture2D(uTex,vUv+dir*ca*2.2).r;
  float g=texture2D(uTex,vUv).g;
  float b=texture2D(uTex,vUv-dir*ca*2.2).b;
  vec3 col=vec3(r,g,b);
  col+=vec3(uWave*0.22,0.,0.);
  col+=vNoise*0.10;
  float scan=sin(vUv.y*900.+uTime*3.)*0.5+0.5;
  col-=scan*uWave*0.07;
  gl_FragColor=vec4(col,uAlpha);
}`;

const VERT_POST = `
varying vec2 vUv;
void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;

const FRAG_POST = `
uniform sampler2D tDiffuse;
uniform float uDistort;
uniform float uTime;
uniform float uFlash;
varying vec2 vUv;
vec2 barrel(vec2 uv,float k){
  vec2 d=uv-.5;float r2=dot(d,d);
  return uv+d*r2*k;
}
void main(){
  float k=uDistort*3.2;
  float ca=uDistort*0.026;
  vec2 dir=normalize(vUv-vec2(.5)+.001);
  float r=texture2D(tDiffuse,barrel(vUv+dir*ca*2.4,k)).r;
  float g=texture2D(tDiffuse,barrel(vUv,k)).g;
  float b=texture2D(tDiffuse,barrel(vUv-dir*ca*2.4,k)).b;
  float a=texture2D(tDiffuse,barrel(vUv,k)).a;
  float vig=1.-dot(vUv-.5,vUv-.5)*2.8*uDistort;
  vec3 col=vec3(r,g,b)*max(vig,0.2);
  col=mix(col,vec3(1.,1.,1.),uFlash);
  gl_FragColor=vec4(col,a);
}`;

/* ─────────────────────────────────────────────
   CANVAS SCENE PAINTERS  (white + red)
───────────────────────────────────────────── */
function buildScenes(THREE, W, H, DPR) {
  function mkOC(drawFn) {
    const oc = document.createElement("canvas");
    oc.width = W * DPR; oc.height = H * DPR;
    const ctx = oc.getContext("2d");
    ctx.scale(DPR, DPR);
    const tex = new THREE.CanvasTexture(oc);
    const s = {};
    let running = false;
    function loop() {
      if (!running) return;
      drawFn(ctx, W, H, s);
      tex.needsUpdate = true;
      requestAnimationFrame(loop);
    }
    return { tex, start() { running = true; loop(); }, stop() { running = false; } };
  }

  /* 0 — Red rain on white */
  const sc0 = mkOC((ctx, W, H, s) => {
    s.drops = s.drops || Array.from({ length: 300 }, () => ({
      x: Math.random(), y: Math.random(),
      len: 0.024 + Math.random() * 0.062, sp: 0.004 + Math.random() * 0.009,
      o: 0.05 + Math.random() * 0.22, w: 0.4 + Math.random() * 0.8,
      ang: -0.055 + Math.random() * 0.04,
    }));
    s.rips = s.rips || [];
    s.rt = (s.rt || 0) + 1;
    ctx.fillStyle = "rgba(250,246,242,.56)"; ctx.fillRect(0, 0, W, H);
    s.drops.forEach(d => {
      d.y += d.sp; d.x += d.ang * .5;
      if (d.y > 1.05) {
        if (Math.random() < .18) s.rips.push({ x: d.x, y: .9 + Math.random() * .08, r: 0, a: .55, ew: .02 + Math.random() * .03, eh: .005 + Math.random() * .008 });
        d.y = -0.02; d.x = Math.random();
      }
      if (d.x > 1) d.x = 0; if (d.x < 0) d.x = 1;
      ctx.strokeStyle = `rgba(212,10,30,${d.o})`; ctx.lineWidth = d.w;
      ctx.beginPath();
      ctx.moveTo(d.x * W, d.y * H);
      ctx.lineTo(d.x * W + Math.sin(d.ang) * d.len * H * .5, d.y * H + d.len * H);
      ctx.stroke();
    });
    if (s.rt % 2 === 0 && Math.random() < .72)
      s.rips.push({ x: Math.random(), y: .88 + Math.random() * .09, r: 0, a: .5, ew: .016 + Math.random() * .026, eh: .005 + Math.random() * .007 });
    for (let i = s.rips.length - 1; i >= 0; i--) {
      const rp = s.rips[i]; rp.r += .002; rp.a *= .92;
      ctx.beginPath();
      ctx.ellipse(rp.x * W, rp.y * H, rp.ew * W * (1 + rp.r * 8), rp.eh * H * (1 + rp.r * 8), 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(212,10,30,${rp.a * .6})`; ctx.lineWidth = .8; ctx.stroke();
      if (rp.a < .014) s.rips.splice(i, 1);
    }
    const pg = ctx.createLinearGradient(0, H * .72, 0, H);
    pg.addColorStop(0, "transparent"); pg.addColorStop(1, "rgba(248,243,238,.72)");
    ctx.fillStyle = pg; ctx.fillRect(0, 0, W, H);
    const vg = ctx.createRadialGradient(W / 2, H * .35, H * .02, W / 2, H * .35, H * .9);
    vg.addColorStop(0, "transparent"); vg.addColorStop(1, "rgba(248,243,238,.74)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  });

  /* 1 — Ink flow: red on cream */
  const sc1 = mkOC((ctx, W, H, s) => {
    s.t = (s.t || 0) + 0.009; const t = s.t;
    const GW = 80, GH = 50;
    s.field = s.field || new Float32Array(GW * GH);
    s.pts = s.pts || Array.from({ length: 380 }, () => ({ x: Math.random() * GW, y: Math.random() * GH, life: Math.random() * 120 + 20, max: 145, sp: .12 + Math.random() * .26 }));
    ctx.fillStyle = "rgba(250,245,240,.065)"; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < GW * GH; i++) {
      const x = i % GW, y = Math.floor(i / GW);
      s.field[i] = Math.sin(x * .15 + t) * Math.cos(y * .1 - t * .7) * Math.PI + Math.sin(x * .07 - y * .09 + t * .5) * 1.6;
    }
    s.pts.forEach(p => {
      const ix = Math.max(0, Math.min(GW - 1, Math.floor(p.x))), iy = Math.max(0, Math.min(GH - 1, Math.floor(p.y)));
      const a = s.field[iy * GW + ix];
      p.x += Math.cos(a) * p.sp; p.y += Math.sin(a) * p.sp * .6; p.life--;
      if (p.life <= 0 || p.x < 0 || p.x > GW || p.y < 0 || p.y > GH) { p.x = Math.random() * GW; p.y = Math.random() * GH; p.life = p.max; }
      const alpha = Math.sin((p.life / p.max) * Math.PI) * .24;
      ctx.beginPath(); ctx.arc(p.x / GW * W, p.y / GH * H, 1.3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,8,28,${alpha})`; ctx.fill();
    });
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * .04, W / 2, H / 2, H * .88);
    vg.addColorStop(0, "transparent"); vg.addColorStop(1, "rgba(250,245,240,.9)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  });

  /* 2 — Waveform: red bars on white */
  const sc2 = mkOC((ctx, W, H, s) => {
    s.t = (s.t || 0) + .017; const t = s.t;
    ctx.fillStyle = "rgba(252,249,246,.9)"; ctx.fillRect(0, 0, W, H);
    const ROWS = 12, BARS = 74;
    for (let row = 0; row < ROWS; row++) {
      const d = (row + 1) / ROWS, yBase = H * (.2 + row * .056);
      const bw = W / BARS * .52 * d, gap = W / BARS * .48;
      for (let i = 0; i < BARS; i++) {
        const x = i * (bw / d + gap) + gap * .5;
        const n = Math.sin(i * .2 + t * 1.5 + row * .7) * Math.sin(i * .08 - t * .95 + row * .45);
        const amp = Math.abs(n) * (H * .29 * d) + H * .005;
        const rr = Math.round(215 - row * 3);
        ctx.fillStyle = `rgba(${rr},8,24,${d * (.1 + Math.abs(n) * .62)})`;
        ctx.fillRect(x, yBase - amp, bw, amp * 2);
      }
    }
    const vg = ctx.createRadialGradient(W / 2, H * .5, 0, W / 2, H * .5, W * .7);
    vg.addColorStop(0, "transparent"); vg.addColorStop(1, "rgba(252,249,246,.82)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  });

  /* 3 — Orbital rings: red on white */
  const sc3 = mkOC((ctx, W, H, s) => {
    s.t = (s.t || 0) + 1; const t = s.t;
    ctx.fillStyle = "rgba(251,247,244,.12)"; ctx.fillRect(0, 0, W, H);
    const cx = W * .5, cy = H * .46;
    [
      { n: 8, r: .26, spd: .00052, off: 0 },
      { n: 14, r: .41, spd: -.0003, off: 1.2 },
      { n: 6, r: .17, spd: .0009, off: 2.5 },
      { n: 20, r: .55, spd: -.00022, off: .6 },
    ].forEach((ring, ri) => {
      const pts = [];
      for (let i = 0; i < ring.n; i++) {
        const ang = ring.off + t * ring.spd * 1000 + i * (Math.PI * 2 / ring.n);
        pts.push({ x: cx + Math.cos(ang) * ring.r * W * .5, y: cy + Math.sin(ang) * ring.r * H * .4 });
      }
      pts.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, ri === 0 ? 2.2 : 1.6, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(212,10,30,.72)"; ctx.fill();
      });
      ctx.beginPath(); pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); });
      ctx.strokeStyle = "rgba(212,10,30,.09)"; ctx.lineWidth = .7; ctx.stroke();
    });
    const vg = ctx.createRadialGradient(cx, cy, H * .03, cx, cy, H * .9);
    vg.addColorStop(0, "transparent"); vg.addColorStop(1, "rgba(251,247,244,.86)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  });

  /* 4 — Sacred geometry: red on white */
  const sc4 = mkOC((ctx, W, H, s) => {
    s.t = (s.t || 0) + 1; s.pt = (s.pt || 0) + 1; const t = s.t;
    s.pulses = s.pulses || [];
    if (s.pt > 46) { s.pt = 0; s.pulses.push({ r: 2, a: .65, spd: 2.4 + Math.random() * 1.0 }); }
    ctx.fillStyle = "rgba(251,248,245,.1)"; ctx.fillRect(0, 0, W, H);
    const cx = W * .46, cy = H * .5;
    const br = Math.sin(t * .018) * .5 + .5;
    [.1, .18, .28, .4, .53].forEach((f, i) => {
      ctx.beginPath(); ctx.arc(cx, cy, f * Math.min(W, H) * (1 + br * .015 * (i + 1)), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(212,10,30,${.04 + br * .055})`; ctx.lineWidth = .6; ctx.stroke();
    });
    const hr = Math.min(W, H) * .1 * (1 + br * .03);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = i * (Math.PI / 3) - Math.PI / 6 + t * .00042; i === 0 ? ctx.moveTo(cx + Math.cos(a) * hr, cy + Math.sin(a) * hr) : ctx.lineTo(cx + Math.cos(a) * hr, cy + Math.sin(a) * hr); }
    ctx.closePath(); ctx.strokeStyle = `rgba(200,8,24,${.16 + br * .16})`; ctx.lineWidth = 1.1; ctx.stroke();
    const tr = hr * .6; ctx.beginPath();
    for (let i = 0; i < 3; i++) { const a = i * (Math.PI * 2 / 3) - Math.PI / 2 - t * .00064; i === 0 ? ctx.moveTo(cx + Math.cos(a) * tr, cy + Math.sin(a) * tr) : ctx.lineTo(cx + Math.cos(a) * tr, cy + Math.sin(a) * tr); }
    ctx.closePath(); ctx.strokeStyle = `rgba(200,8,24,${.1 + br * .12})`; ctx.lineWidth = .8; ctx.stroke();
    for (let i = s.pulses.length - 1; i >= 0; i--) {
      const p = s.pulses[i]; p.r += p.spd; p.a *= .963;
      ctx.beginPath(); ctx.arc(cx, cy, p.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(212,10,30,${p.a})`; ctx.lineWidth = .9; ctx.stroke();
      if (p.a < .005) s.pulses.splice(i, 1);
    }
    ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(212,10,30,${.75 + br * .25})`; ctx.fill();
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * .05, W / 2, H / 2, H * .84);
    vg.addColorStop(0, "transparent"); vg.addColorStop(1, "rgba(251,248,245,.9)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  });

  return [sc0, sc1, sc2, sc3, sc4];
}

/* ─────────────────────────────────────────────
   THREE HOOK
───────────────────────────────────────────── */
function useThree(canvasRef, curSlide) {
  const glRef = useRef(null);
  const prevRef = useRef(0);

  useEffect(() => {
    const THREE = window.THREE;
    if (!THREE || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const W = window.innerWidth, H = window.innerHeight;
    const DPR = Math.min(devicePixelRatio, 2);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(W, H); renderer.setPixelRatio(DPR);
    renderer.setClearColor(0xfaf6f2, 0);

    const threeScene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 10);
    camera.position.z = 1;

    const SCENES = buildScenes(THREE, W, H, DPR);
    SCENES.forEach(s => s.start());

    const geo = new THREE.PlaneGeometry(2, 2, 80, 80);

    function mkPanel(tex) {
      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT_SCENE, fragmentShader: FRAG_SCENE,
        uniforms: {
          uTex: { value: tex }, uTime: { value: 0 },
          uWave: { value: 0 }, uDir: { value: 1 },
          uAlpha: { value: 1 }, uTwist: { value: 0 },
        },
        transparent: true, depthWrite: false,
      });
      return new THREE.Mesh(geo, mat);
    }

    const panelA = mkPanel(SCENES[0].tex);
    const panelB = mkPanel(SCENES[0].tex);
    panelB.material.uniforms.uAlpha.value = 0;
    threeScene.add(panelA); threeScene.add(panelB);

    const rt = new THREE.WebGLRenderTarget(W * DPR, H * DPR);
    const postScene = new THREE.Scene();
    const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 10);
    postCam.position.z = 1;
    const postMat = new THREE.ShaderMaterial({
      vertexShader: VERT_POST, fragmentShader: FRAG_POST,
      uniforms: {
        tDiffuse: { value: rt.texture },
        uDistort: { value: 0 }, uTime: { value: 0 }, uFlash: { value: 0 },
      },
      transparent: true,
    });
    postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat));

    const TDur = 1.4;
    let trans = { active: false, t: 0, from: 0, to: 0 };

    function easeIO(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

    glRef.current = {
      startTransition(from, to) {
        panelA.material.uniforms.uTex.value = SCENES[from].tex;
        panelB.material.uniforms.uTex.value = SCENES[to].tex;
        panelA.material.uniforms.uAlpha.value = 1;
        panelB.material.uniforms.uAlpha.value = 0;
        panelA.material.uniforms.uDir.value = -1;
        panelB.material.uniforms.uDir.value = 1;
        trans = { active: true, t: 0, from, to };
      }
    };

    let last = performance.now(), raf;
    function loop() {
      raf = requestAnimationFrame(loop);
      const now = performance.now(), dt = (now - last) / 1000; last = now;
      const elapsed = now / 1000;

      if (trans.active) {
        trans.t = Math.min(trans.t + dt / TDur, 1);
        const wave = Math.sin(trans.t * Math.PI);
        const twist = wave * 2.0;
        panelA.material.uniforms.uAlpha.value = 1 - easeIO(trans.t);
        panelA.material.uniforms.uWave.value = wave;
        panelA.material.uniforms.uTwist.value = -twist;
        panelB.material.uniforms.uAlpha.value = easeIO(trans.t);
        panelB.material.uniforms.uWave.value = wave;
        panelB.material.uniforms.uTwist.value = twist;
        postMat.uniforms.uDistort.value = wave * 0.78;
        postMat.uniforms.uFlash.value = Math.max(0, wave - 0.62) * 0.6;

        if (trans.t >= 1) {
          trans.active = false;
          panelA.material.uniforms.uTex.value = SCENES[trans.to].tex;
          panelA.material.uniforms.uAlpha.value = 1;
          panelA.material.uniforms.uWave.value = 0;
          panelA.material.uniforms.uTwist.value = 0;
          panelB.material.uniforms.uAlpha.value = 0;
          panelB.material.uniforms.uWave.value = 0;
          postMat.uniforms.uDistort.value = 0;
          postMat.uniforms.uFlash.value = 0;
        }
      }

      [panelA, panelB].forEach(p => { p.material.uniforms.uTime.value = elapsed; });
      postMat.uniforms.uTime.value = elapsed;
      renderer.setRenderTarget(rt);
      renderer.render(threeScene, camera);
      renderer.setRenderTarget(null);
      renderer.render(postScene, postCam);
    }
    loop();

    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      rt.setSize(window.innerWidth * DPR, window.innerHeight * DPR);
    };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); SCENES.forEach(s => s.stop()); renderer.dispose(); window.removeEventListener("resize", onResize); };
  }, []);

  useEffect(() => {
    if (glRef.current && curSlide !== prevRef.current) {
      glRef.current.startTransition(prevRef.current, curSlide);
      prevRef.current = curSlide;
    }
  }, [curSlide]);
}

/* ─────────────────────────────────────────────
   CSS
───────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,900;1,900&family=Courier+Prime:ital,wght@0,400;0,700;1,400&family=Barlow+Condensed:wght@300;500;600&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#faf7f2;
  --red:#d40a1e;
  --red2:#ff2035;
  --red3:#8b0010;
  --ink:#160408;
  --muted:#b09898;
  --line:rgba(212,10,30,.14);
  --line2:rgba(212,10,30,.06);
}
html,body,#root{
  width:100%;height:100%;overflow:hidden;
  background:var(--bg);color:var(--ink);
  font-family:'Courier Prime',monospace;
  cursor:none;
}

.c-dot{
  width:8px;height:8px;background:var(--red);border-radius:50%;
  position:fixed;top:0;left:0;pointer-events:none;z-index:9999;
  mix-blend-mode:multiply;
  transition:transform .05s linear;
}
.c-ring{
  width:30px;height:30px;border:1.5px solid var(--red);border-radius:50%;
  position:fixed;top:0;left:0;pointer-events:none;z-index:9998;
  mix-blend-mode:multiply;
  transition:width .22s cubic-bezier(.34,1.56,.64,1),height .22s cubic-bezier(.34,1.56,.64,1);
}

#prog{
  position:fixed;top:0;left:0;height:2px;background:var(--red);
  z-index:600;transition:width 1.1s cubic-bezier(.65,0,.35,1);
  box-shadow:0 0 10px rgba(212,10,30,.5);
}

nav{
  position:fixed;top:0;left:0;right:0;z-index:500;
  padding:24px 52px;
  display:flex;justify-content:space-between;align-items:center;
  border-bottom:1px solid var(--line2);
}
.logo{
  font-family:'Playfair Display',serif;font-weight:900;font-style:italic;
  font-size:2rem;color:var(--red);cursor:pointer;
  letter-spacing:-.02em;transition:opacity .25s;
}
.logo:hover{opacity:.75}
.nav-r{display:flex;align-items:center;gap:20px}
.dots{display:flex;gap:9px;align-items:center}
.dot{
  width:5px;height:5px;border-radius:50%;background:var(--muted);
  border:none;cursor:pointer;padding:0;
  transition:all .38s cubic-bezier(.34,1.56,.64,1);
}
.dot.on{background:var(--red);transform:scale(2.1);box-shadow:0 0 0 3px rgba(212,10,30,.18)}
.lbl{
  font-family:'Barlow Condensed',sans-serif;font-weight:300;
  font-size:.58rem;letter-spacing:.36em;text-transform:uppercase;
  color:var(--red);min-width:64px;
}

#bg-canvas{position:fixed;inset:0;z-index:0;pointer-events:none}

#stage{position:fixed;inset:0;z-index:1}

.slide{
  position:absolute;inset:0;
  display:flex;align-items:flex-end;
  padding:52px 52px 90px;
  pointer-events:none;opacity:0;
}
.slide.on{opacity:1;pointer-events:all}

.overlay{position:relative;z-index:20;display:flex;flex-direction:column;max-width:720px}

.kicker{
  font-family:'Barlow Condensed',sans-serif;font-weight:500;
  font-size:.54rem;letter-spacing:.44em;text-transform:uppercase;
  color:var(--red);margin-bottom:16px;
  display:flex;align-items:center;gap:14px;
  opacity:0;transform:translateY(18px);
  transition:opacity .52s ease .26s,transform .52s cubic-bezier(.22,1,.36,1) .26s;
}
.kicker::before{content:'';width:30px;height:1px;background:var(--red);flex-shrink:0}
.slide.on .kicker{opacity:1;transform:translateY(0)}

.big{
  font-family:'Playfair Display',serif;font-weight:900;
  font-size:clamp(4.5rem,13vw,12rem);
  line-height:.82;color:var(--ink);
  opacity:0;
  transform:translateY(40px) skewY(2.5deg);
  transition:opacity .78s cubic-bezier(.22,1,.36,1) .08s,
             transform .78s cubic-bezier(.22,1,.36,1) .08s;
  letter-spacing:-.025em;
}
.slide.on .big{opacity:1;transform:translateY(0) skewY(0)}
.big .acc{font-style:italic;color:var(--red)}
.big .str{font-style:italic;-webkit-text-stroke:2px var(--red);color:transparent}

.sub{
  font-family:'Barlow Condensed',sans-serif;font-weight:300;
  font-size:.65rem;letter-spacing:.14em;text-transform:uppercase;
  color:var(--muted);margin-top:20px;
  opacity:0;transform:translateY(14px);
  transition:opacity .62s ease .46s,transform .62s ease .46s;
}
.slide.on .sub{opacity:1;transform:translateY(0)}

.links{display:flex;flex-direction:column;gap:5px;margin-top:26px}
.lk{
  display:flex;justify-content:space-between;align-items:center;
  padding:13px 20px;
  border:1px solid var(--line);
  text-decoration:none;color:var(--ink);
  font-size:.6rem;letter-spacing:.04em;
  font-family:'Courier Prime',monospace;
  opacity:0;transform:translateX(30px);
  transition:opacity .52s ease,transform .52s cubic-bezier(.22,1,.36,1),
    border-color .22s,background .22s,padding-left .22s,color .22s;
  background:rgba(250,247,242,.55);
  backdrop-filter:blur(10px);
  -webkit-backdrop-filter:blur(10px);
  position:relative;overflow:hidden;
}
.lk::before{
  content:'';position:absolute;left:0;top:0;bottom:0;width:3px;
  background:var(--red);
  transform:scaleY(0);transform-origin:bottom;
  transition:transform .35s cubic-bezier(.22,1,.36,1);
}
.lk:hover::before{transform:scaleY(1);transform-origin:top}
.lk:hover{border-color:rgba(212,10,30,.35);color:var(--red);padding-left:28px;background:rgba(212,10,30,.04)}
.lk span{font-size:.49rem;color:var(--muted);flex-shrink:0}
.slide.on .lk{opacity:1;transform:translateX(0)}
.slide.on .lk:nth-child(1){transition-delay:.18s}
.slide.on .lk:nth-child(2){transition-delay:.26s}
.slide.on .lk:nth-child(3){transition-delay:.34s}
.slide.on .lk:nth-child(4){transition-delay:.42s}
.slide.on .lk:nth-child(5){transition-delay:.50s}
.slide.on .lk:nth-child(6){transition-delay:.58s}

.snum{
  position:absolute;bottom:22px;right:52px;z-index:20;
  font-family:'Playfair Display',serif;font-style:italic;
  font-size:.82rem;color:var(--muted);
  opacity:0;transition:opacity .55s ease .62s;
}
.slide.on .snum{opacity:1}

.hint{
  display:flex;align-items:center;gap:12px;margin-top:28px;
  opacity:0;animation:vgFadeHint 1s ease 2.6s forwards;
}
.hint-line{width:48px;height:1px;background:linear-gradient(to right,var(--red),transparent);animation:vgPulse 2.8s ease infinite}
.hint-txt{font-family:'Barlow Condensed',sans-serif;font-weight:300;font-size:.5rem;letter-spacing:.32em;text-transform:uppercase;color:var(--muted)}

.arr{
  position:fixed;top:50%;transform:translateY(-50%);z-index:500;
  background:rgba(250,247,242,.7);border:1px solid var(--line);
  color:var(--red);font-size:.78rem;width:40px;height:40px;
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;backdrop-filter:blur(8px);
  transition:all .28s cubic-bezier(.22,1,.36,1);
}
.arr:hover{background:var(--red);color:#fff;border-color:var(--red);transform:translateY(-50%) scale(1.1)}
.arr-l{left:14px}.arr-r{right:14px}
.arr.gone{opacity:0;pointer-events:none}

@keyframes vgFadeHint{from{opacity:0}to{opacity:1}}
@keyframes vgPulse{0%,100%{opacity:.14}50%{opacity:.95}}

@media(max-width:680px){
  nav{padding:16px 20px}
  .slide{padding:36px 20px 72px}
  .snum{right:20px}
  .arr-l{left:4px}.arr-r{right:4px}
  .big{font-size:clamp(3.6rem,16vw,7rem)}
}
`;

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */
export default function VGPortfolio() {
  const [cur, setCur] = useState(0);
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef(null);
  const mRef = useRef({ mx: 0, my: 0, rx: 0, ry: 0 });
  const rafC = useRef(null);
  const N = SLIDES.length;

  useThree(canvasRef, cur);

  const go = useCallback((i) => {
    if (busy || i === cur || i < 0 || i >= N) return;
    setBusy(true);
    setCur(i);
    setTimeout(() => setBusy(false), 1550);
  }, [busy, cur, N]);

  const next = useCallback(() => go(cur + 1), [go, cur]);
  const prev = useCallback(() => go(cur - 1), [go, cur]);

  /* cursor */
  useEffect(() => {
    const dot = document.querySelector(".c-dot");
    const ring = document.querySelector(".c-ring");
    if (!dot || !ring) return;
    const onMove = (e) => {
      mRef.current.mx = e.clientX; mRef.current.my = e.clientY;
      dot.style.transform = `translate(${e.clientX - 4}px,${e.clientY - 4}px)`;
    };
    document.addEventListener("mousemove", onMove);
    const expand = () => { ring.style.width = "54px"; ring.style.height = "54px"; };
    const shrink = () => { ring.style.width = "30px"; ring.style.height = "30px"; };
    document.querySelectorAll("a,button").forEach(el => {
      el.addEventListener("mouseenter", expand); el.addEventListener("mouseleave", shrink);
    });
    function rl() {
      const m = mRef.current;
      m.rx += (m.mx - m.rx - 15) * .1; m.ry += (m.my - m.ry - 15) * .1;
      ring.style.transform = `translate(${m.rx}px,${m.ry}px)`;
      rafC.current = requestAnimationFrame(rl);
    }
    rl();
    return () => { document.removeEventListener("mousemove", onMove); cancelAnimationFrame(rafC.current); };
  }, []);

  /* wheel + keys + touch */
  useEffect(() => {
    let wc = false;
    const onW = (e) => {
      if (wc) return; wc = true;
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (d > 18) next(); else if (d < -18) prev();
      setTimeout(() => { wc = false; }, 1350);
    };
    const onK = (e) => {
      if (["ArrowRight", "ArrowDown"].includes(e.key)) next();
      if (["ArrowLeft", "ArrowUp"].includes(e.key)) prev();
    };
    let tx = null;
    const onTS = (e) => { tx = e.touches[0].clientX; };
    const onTE = (e) => {
      if (tx === null) return;
      if (Math.abs(tx - e.changedTouches[0].clientX) > 48) (tx > e.changedTouches[0].clientX ? next : prev)();
      tx = null;
    };
    window.addEventListener("wheel", onW, { passive: true });
    window.addEventListener("keydown", onK);
    window.addEventListener("touchstart", onTS, { passive: true });
    window.addEventListener("touchend", onTE);
    return () => {
      window.removeEventListener("wheel", onW);
      window.removeEventListener("keydown", onK);
      window.removeEventListener("touchstart", onTS);
      window.removeEventListener("touchend", onTE);
    };
  }, [next, prev]);

  const progress = N > 1 ? (cur / (N - 1)) * 100 : 0;

  return (
    <>
      <style>{CSS}</style>

      <div className="c-dot" />
      <div className="c-ring" />
      <div id="prog" style={{ width: `${progress}%` }} />
      <canvas id="bg-canvas" ref={canvasRef} />

      <nav>
        <span className="logo" onClick={() => go(0)}>VG</span>
        <div className="nav-r">
          <div className="dots">
            {LABELS.map((lbl, i) => (
              <button key={i} className={`dot${i === cur ? " on" : ""}`} onClick={() => go(i)} aria-label={lbl} />
            ))}
          </div>
          <span className="lbl">{LABELS[cur]}</span>
        </div>
      </nav>

      <button className={`arr arr-l${cur === 0 ? " gone" : ""}`} onClick={prev} aria-label="Prev">←</button>
      <button className={`arr arr-r${cur === N - 1 ? " gone" : ""}`} onClick={next} aria-label="Next">→</button>

      <div id="stage">
        {SLIDES.map((sl, idx) => (
          <div key={sl.id} className={`slide${idx === cur ? " on" : ""}`}>
            <div className="overlay">

              <div className="kicker">{sl.kicker}</div>

              <div className="big">
                {sl.lines.map((ln, li) => (
                  <span key={li} className={ln.accent ? "acc" : ln.stroke ? "str" : ""}>
                    {ln.text}
                    {li < sl.lines.length - 1 && <br />}
                  </span>
                ))}
              </div>

              {sl.sub && <p className="sub">{sl.sub}</p>}

              {sl.hint && idx === cur && (
                <div className="hint">
                  <div className="hint-line" />
                  <span className="hint-txt">scroll →</span>
                </div>
              )}

              {sl.links.length > 0 && (
                <div className="links">
                  {sl.links.map((lk, li) => (
                    <a key={li} href={lk.href} target="_blank" rel="noreferrer" className="lk">
                      {lk.label}
                      <span>{lk.tag}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="snum">{sl.num}</div>
          </div>
        ))}
      </div>
    </>
  );
}
