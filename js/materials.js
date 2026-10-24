// Procedural textures and the shared material factory.
// Every material made here gets the "safety bubble": fragments near the visitor fade out,
// and a global safety factor can fade the whole reconstruction when there is danger.
(function(){
  const TW = window.TW = window.TW || {};
  TW.mats = [];
  TW.uniforms = {
    uCam: {value: new THREE.Vector3(0, -999, 0)},
    uFadeNear: {value: -1.0},
    uFadeFar: {value: -0.5},
    uSafe: {value: 1.0}
  };

  function canvas(size, paint){ const c = document.createElement('canvas'); c.width = c.height = size; paint(c.getContext('2d'), size); return c; }
  function speckle(g, s, n, alpha){ for(let i=0;i<n;i++){ const v = Math.random()*255|0; g.fillStyle = `rgba(${v},${v},${v},${alpha*Math.random()})`; g.fillRect(Math.random()*s, Math.random()*s, 1+Math.random()*3, 1+Math.random()*3); } }
  function stains(g, s, n, rgb){ for(let i=0;i<n;i++){ g.fillStyle = `rgba(${rgb},${.04+Math.random()*.08})`; g.beginPath(); g.arc(Math.random()*s, Math.random()*s, 8+Math.random()*s/10, 0, 7); g.fill(); } }

  TW.ashlar = (base, rows=8) => canvas(512, (g,s) => {
    g.fillStyle = base; g.fillRect(0,0,s,s);
    const rh = s/rows;
    for(let r=0;r<rows;r++){ let x = (r%2)*-(s/6); while(x < s){ const w = s/4 + (Math.random()-.5)*s/8; const l = Math.random()-.5;
      g.fillStyle = l > 0 ? `rgba(255,240,210,${l*.35})` : `rgba(60,45,25,${-l*.35})`; g.fillRect(x+3, r*rh+3, w-6, rh-6);
      // drafted margin, typical of Herodian ashlars
      g.strokeStyle = 'rgba(255,248,230,.18)'; g.lineWidth = 6; g.strokeRect(x+7, r*rh+7, w-14, rh-14);
      g.strokeStyle = 'rgba(60,45,28,.6)'; g.lineWidth = 4; g.strokeRect(x, r*rh, w, rh);
      x += w; } }
    speckle(g, s, 12000, .2); stains(g, s, 50, '90,75,50');
  });
  TW.plaster = (base) => canvas(256, (g,s) => { g.fillStyle = base; g.fillRect(0,0,s,s); speckle(g, s, 6000, .12); stains(g, s, 20, '120,100,70'); });
  TW.wood = () => canvas(256, (g,s) => { g.fillStyle = '#6b4a2b'; g.fillRect(0,0,s,s); for(let y=0;y<s;y+=2){ g.fillStyle = `rgba(30,18,8,${Math.random()*.28})`; g.fillRect(0,y,s,1+Math.random()*2); } for(let x=0;x<s;x+=s/6){ g.fillStyle='rgba(20,12,5,.65)'; g.fillRect(x,0,3,s);} g.fillStyle='rgba(40,40,45,.8)'; g.fillRect(0,s*.18,s,8); g.fillRect(0,s*.78,s,8); });
  TW.tiles = () => canvas(256, (g,s) => { g.fillStyle = '#9c4b29'; g.fillRect(0,0,s,s); const n=8, h=s/n; for(let r=0;r<n;r++) for(let c=-1;c<n;c++){ const off=(r%2)*h/2; g.fillStyle = `rgb(${125+Math.random()*55|0},${52+Math.random()*28|0},${28+Math.random()*18|0})`; g.fillRect(c*h+off+2, r*h+2, h-4, h-6); g.fillStyle='rgba(0,0,0,.35)'; g.fillRect(c*h+off, r*h+h-5, h, 5);} });
  TW.cloth = (a, b) => canvas(128, (g,s) => { for(let i=0;i<8;i++){ g.fillStyle = i%2 ? a : b; g.fillRect(i*s/8,0,s/8,s); } speckle(g, s, 1500, .15); });
  TW.paving = () => canvas(512, (g,s) => { g.fillStyle = '#bda57c'; g.fillRect(0,0,s,s); const n = 6, w = s/n; for(let r=0;r<n;r++) for(let c=0;c<n;c++){ const l=Math.random()-.5; g.fillStyle = l>0?`rgba(255,240,210,${l*.3})`:`rgba(50,40,25,${-l*.3})`; g.fillRect(c*w+3,r*w+3,w-6,w-6); g.strokeStyle='rgba(60,48,30,.55)'; g.lineWidth=5; g.strokeRect(c*w,r*w,w,w);} speckle(g,s,9000,.18); stains(g,s,30,'80,65,40'); });
  TW.frond = () => canvas(128, (g,s) => { g.clearRect(0,0,s,s); g.strokeStyle = '#4f6b2a'; g.lineWidth = 3; g.beginPath(); g.moveTo(s/2,0); g.lineTo(s/2,s); g.stroke(); for(let y=4;y<s;y+=5){ const len = (s/2)*Math.sin(Math.PI*y/s); g.strokeStyle = `rgb(${70+Math.random()*30|0},${100+Math.random()*40|0},${35+Math.random()*20|0})`; g.lineWidth = 2; g.beginPath(); g.moveTo(s/2,y); g.lineTo(s/2-len,y+8); g.moveTo(s/2,y); g.lineTo(s/2+len,y+8); g.stroke(); } });
  TW.soft = (rgb) => canvas(64, (g,s) => { const gr = g.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2); gr.addColorStop(0,`rgba(${rgb},1)`); gr.addColorStop(1,`rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(0,0,s,s); });

  TW.tex = (c, metersPerTile=4) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; t.userData = {m: metersPerTile}; return t; };

  function addSafety(m){
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, TW.uniforms);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vTwWorld;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvTwWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vTwWorld; uniform vec3 uCam; uniform float uFadeNear; uniform float uFadeFar; uniform float uSafe;')
        .replace('#include <dithering_fragment>', '#include <dithering_fragment>\nfloat twD = distance(vTwWorld.xz, uCam.xz);\ngl_FragColor.a *= smoothstep(uFadeNear, uFadeFar, twD) * uSafe;\nif (gl_FragColor.a < 0.02) discard;');
    };
    m.customProgramCacheKey = () => 'tw-safety';
    return m;
  }
  TW.addSafety = addSafety;

  TW.M = (opts) => {
    const o = Object.assign({roughness:.9, transparent:true}, opts);
    if (o.map && o.bump !== false){ o.bumpMap = o.map; o.bumpScale = o.bumpScale || .04; }
    delete o.bump;
    const m = addSafety(new THREE.MeshStandardMaterial(o));
    m.userData.baseOpacity = o.opacity == null ? 1 : o.opacity;
    TW.mats.push(m); return m;
  };

  // Scale box UVs so a texture covers a fixed number of metres whatever the box size
  TW.boxGeo = (w, h, d, mpt) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    if (mpt){ const uv = geo.attributes.uv, dims = [[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];
      for(let f=0; f<6; f++) for(let k=0;k<4;k++){ const i=f*4+k; uv.setXY(i, uv.getX(i)*dims[f][0]/mpt, uv.getY(i)*dims[f][1]/mpt); }
      uv.needsUpdate = true; }
    return geo;
  };

  TW.setOpacity = (v) => TW.mats.forEach(m => { m.opacity = (m.userData.baseOpacity ?? 1) * v; m.depthWrite = v > .95 && (m.userData.baseOpacity ?? 1) > .95; });
})();
