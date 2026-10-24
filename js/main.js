// App: WebXR session, placement, two-point alignment, controls, lighting, and the frame loop.
(function(){
  const TW = window.TW, $ = (id) => document.getElementById(id);

  // ---------- Renderer and scene ----------
  const renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.xr.enabled = true;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  document.body.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(65, innerWidth/innerHeight, 0.01, 800);
  TW.Sound.init(camera); scene.add(camera);

  const hemi = new THREE.HemisphereLight(0xfff3dd, 0x6b5a40, 0.75); scene.add(hemi);
  const envProbe = new THREE.LightProbe(); envProbe.intensity = 0; scene.add(envProbe);
  const sun = new THREE.DirectionalLight(0xffe2b0, 1.0);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005;
  scene.add(sun); scene.add(sun.target);
  const SUN_DIR = new THREE.Vector3(-.45, .8, .35).normalize();

  // ---------- The site: reconstruction + life ----------
  const site = new THREE.Group(); site.visible = false; scene.add(site);
  const fort = TW.buildFort(); site.add(fort.group);
  const life = TW.buildLife(site, fort.anchors);
  const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(140,140), new THREE.ShadowMaterial({opacity:.32}));
  shadowPlane.rotation.x = -Math.PI/2; shadowPlane.position.set(0,.005,-18); shadowPlane.receiveShadow = true; site.add(shadowPlane);

  // Optional real model: models/site.glb (metres, front facing +Z, front wall centred on the origin)
  let MODEL_SPAN = 54;
  if (THREE.GLTFLoader){
    fetch('models/site.glb', {method:'HEAD'}).then(r => { if (!r.ok) return;
      new THREE.GLTFLoader().load('models/site.glb', (gltf) => {
        const obj = gltf.scene;
        obj.traverse(o => { if (o.isMesh){ o.castShadow = o.receiveShadow = true; (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.transparent = true; TW.addSafety(m); m.userData.baseOpacity = 1; TW.mats.push(m); }); } });
        fort.group.visible = false; site.add(obj); $('modelChip').hidden = false;
        const size = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3()); if (size.x > .5) MODEL_SPAN = size.x;
      });
    }).catch(() => {});
  }

  // ---------- Reticle and alignment markers ----------
  const reticle = new THREE.Mesh(new THREE.RingGeometry(.12,.16,40).rotateX(-Math.PI/2), new THREE.MeshBasicMaterial({color:0xE3A857}));
  reticle.matrixAutoUpdate = false; reticle.visible = false; scene.add(reticle);
  const markers = [0,1].map(() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,1,12), new THREE.MeshBasicMaterial({color:0xE3A857})); m.geometry.translate(0,.5,0); m.visible = false; scene.add(m); return m; });

  // ---------- State ----------
  const SCALES = {model: 1/40, real: 1};
  let scaleKey = 'model', customScale = 1, fitScale = true, placed = false, alignMode = false, alignPts = [];
  let hitSource = null, hitReq = false, session = null, lightProbeXR = null, lightLive = false, preview = false;
  const curScale = () => scaleKey === 'fit' ? customScale : SCALES[scaleKey];
  const isLifeSize = () => curScale() > .2;
  const status = (t, live) => { $('status').textContent = t; $('dot').style.background = live ? 'var(--ok)' : 'var(--accent)'; };
  let msgTimer = 0;
  const msg = (t, ms) => { const m = $('msg'); clearTimeout(msgTimer); if (t){ m.textContent = t; m.hidden = false; if (ms) msgTimer = setTimeout(() => m.hidden = true, ms); } else m.hidden = true; };
  const camPos = () => { const c = new THREE.Vector3(); (session ? renderer.xr.getCamera(camera) : camera).getWorldPosition(c); return c; };

  function applyScale(){
    const s = curScale(); site.scale.setScalar(s);
    sun.target.position.copy(site.position);
    if (!lightLive) sun.position.copy(site.position).addScaledVector(SUN_DIR, 70*s);
    const e = 48*s; Object.assign(sun.shadow.camera, {left:-e, right:e, top:e, bottom:-e, near:.01, far:160*Math.max(s,.05)}); sun.shadow.camera.updateProjectionMatrix();
    fort.anchors.groundOnly.forEach(m => m.visible = preview || !isLifeSize());
    TW.Sound.setScale(s);
    $('sModel').setAttribute('aria-pressed', String(scaleKey==='model')); $('sReal').setAttribute('aria-pressed', String(scaleKey==='real'));
  }

  // ---------- Free placement ----------
  function place(){
    if (!reticle.visible) return;
    const p = new THREE.Vector3().setFromMatrixPosition(reticle.matrix), c = camPos();
    site.position.copy(p); site.rotation.set(0, Math.atan2(c.x - p.x, c.z - p.z), 0);
    showPlaced();
    msg(scaleKey === 'real' ? 'השער מולך. אפשר ללכת פנימה.' : 'הקף את הדגם. "גודל אמיתי" מעמיד אותך מול השער.', 4000);
  }
  function showPlaced(){
    site.visible = true; placed = true; alignMode = false; reticle.visible = false; markers.forEach(m => m.visible = false);
    applyScale(); $('startBtns').hidden = true; $('alignPanel').hidden = true; $('controls').hidden = false;
    TW.Sound.start(site);
  }
  function resetPlacement(){
    placed = false; alignMode = false; alignPts = []; site.visible = false; markers.forEach(m => m.visible = false);
    $('startBtns').hidden = false; $('alignPanel').hidden = true; $('controls').hidden = true;
    if (scaleKey === 'fit') scaleKey = 'model';
    applyScale(); TW.Sound.setMuted(TW.Sound.isMuted());
  }

  // ---------- Two-point alignment to real ruins ----------
  const STEP = ['נקודה 1: כוון את הטבעת לבסיס פינה אחת של הקיר הקדמי, היכן שהקיר פוגש את הקרקע.', 'נקודה 2: עכשיו לבסיס הפינה השנייה של אותו קיר.'];
  function startAlign(){
    alignMode = true; alignPts = []; placed = false; site.visible = false; markers.forEach(m => m.visible = false);
    $('startBtns').hidden = true; $('controls').hidden = true; $('alignPanel').hidden = false;
    $('alignStep').textContent = STEP[0]; $('mark').textContent = 'סמן נקודה 1'; msg(null);
  }
  function markPoint(){
    if (!alignMode || !reticle.visible) return;
    const p = new THREE.Vector3().setFromMatrixPosition(reticle.matrix);
    markers[alignPts.length].position.copy(p); markers[alignPts.length].visible = true; alignPts.push(p);
    if (alignPts.length === 1){ $('alignStep').textContent = STEP[1]; $('mark').textContent = 'סמן נקודה 2'; return; }
    let [p1, p2] = alignPts.map(v => v.clone());
    const theta = (a, b) => Math.atan2(-(b.z - a.z), b.x - a.x);
    let th = theta(p1, p2);
    const mid = p1.clone().add(p2).multiplyScalar(.5);
    if (camPos().sub(mid).dot(new THREE.Vector3(Math.sin(th), 0, Math.cos(th))) < 0){ [p1, p2] = [p2, p1]; th = theta(p1, p2); }
    const len = Math.hypot(p2.x - p1.x, p2.z - p1.z);
    if (len < .3){ msg('הנקודות קרובות מדי. סמן את שתי הפינות של הקיר.', 3500); startAlign(); return; }
    customScale = fitScale ? len / MODEL_SPAN : 1; scaleKey = 'fit';
    site.position.set(mid.x, (p1.y + p2.y)/2, mid.z); site.rotation.set(0, th, 0);
    showPlaced();
    msg('השחזור מותאם לקיר. אם הוא לא יושב בדיוק, השתמש ב"כיוונון עדין".', 4500);
  }

  // ---------- Controls ----------
  $('place').addEventListener('click', place);
  $('alignBtn').addEventListener('click', startAlign);
  $('mark').addEventListener('click', markPoint);
  $('alignCancel').addEventListener('click', resetPlacement);
  $('again').addEventListener('click', () => { resetPlacement(); msg('כוון אל הקרקע ובחר שוב', 3000); });
  $('fitOn').addEventListener('click', () => { fitScale = true; $('fitOn').setAttribute('aria-pressed','true'); $('fitOff').setAttribute('aria-pressed','false'); });
  $('fitOff').addEventListener('click', () => { fitScale = false; $('fitOn').setAttribute('aria-pressed','false'); $('fitOff').setAttribute('aria-pressed','true'); });
  $('sModel').addEventListener('click', () => { scaleKey = 'model'; applyScale(); });
  $('sReal').addEventListener('click', () => { scaleKey = 'real'; applyScale(); msg('השער בנקודה שבחרת. המבצר נמשך כ־40 מטר לאחור.', 3500); });
  $('rotR').addEventListener('click', () => site.rotation.y -= Math.PI/12);
  $('rotL').addEventListener('click', () => site.rotation.y += Math.PI/12);
  $('op').addEventListener('input', (e) => TW.setOpacity(e.target.value/100));
  $('fineToggle').addEventListener('click', () => { const on = $('fine').hidden; $('fine').hidden = !on; $('fineToggle').setAttribute('aria-pressed', String(on)); });
  document.querySelectorAll('[data-n]').forEach(b => b.addEventListener('click', () => {
    const f = new THREE.Vector3(); renderer.xr.getCamera(camera).getWorldDirection(f); f.y = 0; if (f.lengthSq() < 1e-6) f.set(0,0,-1); f.normalize();
    const r = new THREE.Vector3(-f.z, 0, f.x), step = .1, deg = Math.PI/180;
    ({fwd: () => site.position.addScaledVector(f, step), back: () => site.position.addScaledVector(f, -step),
      right: () => site.position.addScaledVector(r, step), left: () => site.position.addScaledVector(r, -step),
      up: () => site.position.y += .05, down: () => site.position.y -= .05,
      rcw: () => site.rotation.y -= deg, rccw: () => site.rotation.y += deg})[b.dataset.n]();
    applyScale();
  }));
  $('mute').addEventListener('click', () => { const m = !TW.Sound.isMuted(); TW.Sound.setMuted(m); $('mute').setAttribute('aria-pressed', String(m)); $('mute').textContent = m ? 'הפעל קולות' : 'השתק קולות'; });
  $('narrate').addEventListener('click', () => {
    TW.Sound.start(site);
    const ok = TW.Sound.narrate(TW.NARRATION, () => $('narrate').textContent = 'ספר לי על המקום');
    if (ok) $('narrate').textContent = speechSynthesis.speaking || speechSynthesis.pending ? 'עצור קריינות' : 'ספר לי על המקום';
    else msg('הקראה בקול לא נתמכת בטלפון הזה.', 3000);
  });
  $('overlay').addEventListener('beforexrselect', (e) => e.preventDefault());

  TW.Safety.bind({
    warn: (text, level) => { const w = $('warn'); if (!text){ w.hidden = true; return; } w.textContent = text; w.className = 'warn ' + level; w.hidden = false; },
    chip: (text) => { const c = $('safeChip'); if (c.textContent !== text) c.textContent = text; c.hidden = false; }
  });

  // ---------- Session ----------
  $('next').addEventListener('click', () => { $('intro').hidden = true; $('safety').hidden = false; });
  async function startAR(){
    const init = {requiredFeatures:['hit-test'], optionalFeatures:['dom-overlay','local-floor','light-estimation', ...TW.Safety.FEATURES.optionalFeatures], domOverlay:{root:$('overlay')}, depthSensing: TW.Safety.FEATURES.depthSensing};
    try { session = await navigator.xr.requestSession('immersive-ar', init); }
    catch(err){
      try { delete init.depthSensing; init.optionalFeatures = init.optionalFeatures.filter(f => f !== 'depth-sensing'); session = await navigator.xr.requestSession('immersive-ar', init); }
      catch(err2){ $('intro').hidden = false; $('safety').hidden = true; $('unsupported').textContent = 'לא הצלחתי לפתוח מציאות רבודה: ' + (err2.message || err2) + '. ודא ש־"Google Play Services for AR" מותקן ומעודכן, ושהדף נפתח ב־Chrome.'; $('unsupported').hidden = false; return; }
    }
    renderer.xr.setReferenceSpaceType('local');
    lightProbeXR = null; lightLive = false;
    if (session.requestLightProbe) session.requestLightProbe().then(p => lightProbeXR = p).catch(() => {});
    await renderer.xr.setSession(session);
    TW.Sound.start(site); TW.Safety.reset();
    $('sheet').hidden = true; $('dock').hidden = false; $('exit').hidden = false; resetPlacement();
    status('מחפש קרקע', false); msg('הזז את הטלפון לאט מצד לצד, עם המצלמה אל הקרקע');
    session.addEventListener('end', () => { session = null; hitSource = null; hitReq = false; resetPlacement(); reticle.visible = false; speechSynthesis.cancel();
      $('sheet').hidden = false; $('intro').hidden = false; $('safety').hidden = true; $('dock').hidden = true; $('exit').hidden = true; $('warn').hidden = true; msg(null); status('מוכן', false); });
    session.addEventListener('select', () => { if (alignMode) markPoint(); else if (!placed) place(); });
  }
  $('exit').addEventListener('click', () => session && session.end());
  $('start').addEventListener('click', startAR);

  (async () => {
    const ok = navigator.xr && await navigator.xr.isSessionSupported('immersive-ar').catch(() => false);
    if (!ok){
      $('next').textContent = 'צפה בתצוגה מקדימה';
      $('unsupported').textContent = 'הדפדפן הזה לא תומך במציאות רבודה. בטלפון אנדרואיד, פתח את הקישור ב־Chrome והתקן את "Google Play Services for AR". בינתיים אפשר לראות תצוגה מקדימה: גרור כדי להסתובב סביב המבצר.';
      $('unsupported').hidden = false;
      $('next').onclick = (e) => { e.stopImmediatePropagation(); $('sheet').hidden = true; TW.Sound.start(site); };
      previewMode();
    }
  })();

  // ---------- Preview without AR: orbit by dragging ----------
  let orbit = null;
  function previewMode(){
    preview = true; site.visible = true; scaleKey = 'real'; applyScale();
    scene.background = new THREE.Color(0x9fb8c8); scene.fog = new THREE.Fog(0x9fb8c8, 90, 260);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(300,48), new THREE.MeshStandardMaterial({color:0xb59a6e, roughness:1})); ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; scene.add(ground);
    orbit = {az: .55, el: .32, dist: 68, drag: null};
    const cv = renderer.domElement;
    cv.addEventListener('pointerdown', e => orbit.drag = {x:e.clientX, y:e.clientY, az:orbit.az, el:orbit.el});
    addEventListener('pointerup', () => orbit.drag = null);
    addEventListener('pointermove', e => { if (!orbit.drag) return; orbit.az = orbit.drag.az - (e.clientX-orbit.drag.x)*.006; orbit.el = Math.max(.04, Math.min(1.3, orbit.drag.el + (e.clientY-orbit.drag.y)*.004)); });
    cv.addEventListener('wheel', e => { orbit.dist = Math.max(8, Math.min(140, orbit.dist * (1 + Math.sign(e.deltaY)*.1))); });
  }
  TW.debugView = (az, el, dist, tx, ty, tz) => { if (!orbit) return; Object.assign(orbit, {az, el, dist}); orbit.target = new THREE.Vector3(tx, ty, tz); };

  // ---------- Frame loop ----------
  const clock = new THREE.Clock();
  renderer.setAnimationLoop((t, frame) => {
    const dt = Math.min(clock.getDelta(), .1);
    if (orbit && !session){ const c = orbit.target || new THREE.Vector3(0,4,-16); camera.position.set(c.x + orbit.dist*Math.sin(orbit.az)*Math.cos(orbit.el), c.y + orbit.dist*Math.sin(orbit.el), c.z + orbit.dist*Math.cos(orbit.az)*Math.cos(orbit.el)); camera.lookAt(c); }

    if (frame){
      const ref = renderer.xr.getReferenceSpace();
      if (lightProbeXR && frame.getLightEstimate){
        const est = frame.getLightEstimate(lightProbeXR);
        if (est){
          envProbe.sh.fromArray(est.sphericalHarmonicsCoefficients); envProbe.intensity = 1; hemi.intensity = .15;
          const d = est.primaryLightDirection, i = est.primaryLightIntensity, s = curScale(), mx = Math.max(i.x, i.y, i.z, 1e-3);
          sun.position.set(site.position.x + d.x*70*s, site.position.y + Math.max(d.y, .2)*70*s, site.position.z + d.z*70*s);
          sun.intensity = Math.min(3, Math.max(.25, mx)); sun.color.setRGB(i.x/mx, i.y/mx, i.z/mx);
          if (!lightLive){ lightLive = true; $('light').hidden = false; }
        }
      }
      if (!hitReq){ hitReq = true; session.requestReferenceSpace('viewer').then(vs => session.requestHitTestSource({space:vs})).then(src => hitSource = src).catch(() => {}); }
      if (hitSource && (!placed || alignMode)){
        const hits = frame.getHitTestResults(hitSource), ok = hits.length > 0;
        if (ok){ reticle.visible = true; reticle.matrix.fromArray(hits[0].getPose(ref).transform.matrix); status('קרקע זוהתה', true);
          if (!$('msg').hidden && $('msg').textContent.startsWith('הזז')) msg('בחר "הצב כאן" או "התאם לשרידים"'); }
        else reticle.visible = false;
        $('place').disabled = !ok; $('alignBtn').disabled = !ok; $('mark').disabled = !ok;
      }
      TW.Safety.update(frame, ref, camPos(), dt, placed && isLifeSize());
    } else if (preview){
      TW.uniforms.uCam.value.copy(camera.position);
    }
    if (site.visible) life.update(dt, curScale());
    renderer.render(scene, camera);
  });

  addEventListener('resize', () => { camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
  applyScale();
})();
