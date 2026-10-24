// Life inside the reconstruction: people walking set routes, guards, merchants, a donkey,
// waving banners and flags, torch flames, smoke from the bread oven and birds overhead.
(function(){
  const TW = window.TW;
  const matCache = {};
  const mat = (hex, extra) => { const k = hex + (extra ? JSON.stringify(extra) : ''); return matCache[k] || (matCache[k] = TW.M(Object.assign({color:hex, roughness:.95}, extra || {}))); };
  const SKIN = [0xb07d58, 0x9c6b48, 0xc48e66, 0x8a5c3c];
  const ROBE = [0xe8dcc4, 0xd9c49b, 0x8c6a3f, 0x6f5a8a, 0x7a2430, 0x4f6b6a, 0xb59a6e, 0xcfc3a6];
  const HEAD = [0x3a2a1c, 0xe8dcc4, 0x7a2430, 0x2f2a24, 0xd9c49b];
  const pick = (a) => a[Math.random()*a.length|0];
  const mesh = (geo, m, parent, x=0, y=0, z=0) => { const me = new THREE.Mesh(geo, m); me.position.set(x,y,z); me.castShadow = true; parent.add(me); return me; };

  // ---------- A person ----------
  function person(o={}){
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const robe = mat(o.robe ?? pick(ROBE)), skin = mat(o.skin ?? pick(SKIN)), head = mat(o.head ?? pick(HEAD));
    const s = o.scale ?? (0.92 + Math.random()*.14);
    body.scale.setScalar(s);
    const robeGeo = new THREE.LatheGeometry([[0,.12],[.29,.12],[.27,.55],[.21,.95],[.23,1.28],[.16,1.43],[0,1.45]].map(p => new THREE.Vector2(p[0],p[1])), 14);
    const robeMesh = mesh(robeGeo, robe, body);
    mesh(new THREE.TorusGeometry(.215,.03,6,16).rotateX(Math.PI/2), mat(0x5a3d22), body, 0, .97, 0);
    mesh(new THREE.CylinderGeometry(.05,.06,.12,8), skin, body, 0, 1.5, 0);
    const headG = new THREE.Group(); headG.position.y = 1.62; body.add(headG);
    mesh(new THREE.SphereGeometry(.11, 12, 10), skin, headG);
    if (o.helmet){ mesh(new THREE.SphereGeometry(.125, 12, 8, 0, Math.PI*2, 0, Math.PI/2), mat(0xb08a3e, {metalness:.7, roughness:.35}), headG, 0, .01, 0); mesh(new THREE.ConeGeometry(.02,.12,6), mat(0x7a2430), headG, 0, .17, 0); }
    else if (Math.random() < .6){ mesh(new THREE.SphereGeometry(.125, 12, 8, 0, Math.PI*2, 0, Math.PI*.55), head, headG, 0, .015, -.01); if (Math.random() < .5) mesh(new THREE.CylinderGeometry(.13,.2,.32,12,1,true), head, headG, 0, -.12, -.03); }
    else mesh(new THREE.SphereGeometry(.115, 12, 8, 0, Math.PI*2, 0, Math.PI*.45), mat(0x2a1d14), headG, 0, .02, -.01);
    const arm = (side) => { const p = new THREE.Group(); p.position.set(side*.22, 1.38, 0); body.add(p);
      mesh(new THREE.CylinderGeometry(.055,.07,.58,8), robe, p, 0, -.29, 0); mesh(new THREE.SphereGeometry(.05,8,6), skin, p, 0, -.6, 0); return p; };
    const leg = (side) => { const p = new THREE.Group(); p.position.set(side*.1, .55, 0); body.add(p);
      mesh(new THREE.CylinderGeometry(.045,.05,.5,8), skin, p, 0, -.25, 0); mesh(new THREE.BoxGeometry(.1,.05,.22), mat(0x4a3220), p, 0, -.52, .04); return p; };
    const armL = arm(1), armR = arm(-1), legL = leg(1), legR = leg(-1);
    if (o.spear){ const sp = new THREE.Group(); armR.add(sp); sp.position.set(0,-.6,.05); mesh(new THREE.CylinderGeometry(.018,.018,2.4,6), mat(0x6b4a2b), sp, 0, .6, 0); mesh(new THREE.ConeGeometry(.04,.22,6), mat(0x8a8a90, {metalness:.7, roughness:.3}), sp, 0, 1.9, 0); }
    if (o.shield){ const sh = mesh(new THREE.CylinderGeometry(.38,.38,.05,18), mat(0x7a2430), armL, .02, -.45, .12); sh.rotation.x = Math.PI/2; mesh(new THREE.SphereGeometry(.08,10,6), mat(0xb08a3e, {metalness:.7, roughness:.35}), armL, .02, -.45, .16); }
    if (o.jar){ mesh(new THREE.LatheGeometry([[0,0],[.1,.02],[.14,.15],[.1,.3],[.05,.33],[0,.33]].map(p => new THREE.Vector2(p[0],p[1])), 10), mat(0xb5673e), headG, 0, .1, 0); armL.rotation.z = Math.PI*.85; }
    const st = {phase: Math.random()*6.28, root, body, armL, armR, legL, legR, headG, robeMesh, carrying: !!o.jar};
    st.pose = (dt, speed) => {
      if (speed > .05){
        st.phase += dt * speed * 5.2;
        const a = Math.sin(st.phase);
        st.legL.rotation.x = a*.55; st.legR.rotation.x = -a*.55;
        if (!st.carrying) st.armL.rotation.x = -a*.45; st.armR.rotation.x = a*.45;
        st.body.position.y = Math.abs(Math.cos(st.phase))*.035;
        st.robeMesh.rotation.z = a*.03;
      } else {
        st.phase += dt;
        st.legL.rotation.x = st.legR.rotation.x = 0; st.body.position.y = 0;
        st.headG.rotation.y = Math.sin(st.phase*.6)*.6;
        if (o.gesture) st.armR.rotation.x = -.6 - Math.max(0, Math.sin(st.phase*1.7))*.8;
      }
    };
    return st;
  }

  // ---------- A donkey with saddle baskets ----------
  function donkey(){
    const root = new THREE.Group(), coat = mat(0x8a7a68), dark = mat(0x4a3f35);
    mesh(new THREE.BoxGeometry(.42,.45,1.0), coat, root, 0, .85, 0);
    const neck = mesh(new THREE.BoxGeometry(.22,.5,.25), coat, root, 0, 1.15, .5); neck.rotation.x = .6;
    const head = mesh(new THREE.BoxGeometry(.2,.22,.45), coat, root, 0, 1.33, .78); head.rotation.x = .3;
    [-1,1].forEach(s => { const e = mesh(new THREE.BoxGeometry(.05,.25,.06), dark, root, s*.07, 1.55, .66); e.rotation.z = s*.25; });
    mesh(new THREE.BoxGeometry(.04,.4,.04), dark, root, 0, .8, -.52).rotation.x = .3;
    [-1,1].forEach(s => mesh(new THREE.CylinderGeometry(.18,.15,.32,10), mat(0x9b7a45), root, s*.32, .95, 0));
    const legs = [[-.14,.4],[.14,.4],[-.14,-.4],[.14,-.4]].map(([x,z]) => { const p = new THREE.Group(); p.position.set(x,.65,z); root.add(p); mesh(new THREE.CylinderGeometry(.04,.035,.65,6), coat, p, 0, -.32, 0); return p; });
    let ph = 0;
    return {root, pose(dt, speed){ ph += dt*speed*6; const a = Math.sin(ph)*.45; legs[0].rotation.x = a; legs[3].rotation.x = a; legs[1].rotation.x = -a; legs[2].rotation.x = -a; }};
  }

  // ---------- Path following (ping-pong or loop) ----------
  function path(points, loop){
    const P = points.map(p => new THREE.Vector3(p[0], p[1] || 0, p[2]));
    if (loop) P.push(P[0].clone());
    const seg = []; let L = 0; for(let i=0;i<P.length-1;i++){ const l = P[i].distanceTo(P[i+1]); seg.push(l); L += l; }
    return { L, at(u){
      let d = loop ? ((u % L) + L) % L : (() => { const m = ((u % (2*L)) + 2*L) % (2*L); return m > L ? 2*L - m : m; })();
      const back = !loop && ((((u % (2*L)) + 2*L) % (2*L)) > L);
      for(let i=0;i<seg.length;i++){ if (d <= seg[i] || i === seg.length-1){ const t = seg[i] ? Math.min(1, d/seg[i]) : 0; const p = P[i].clone().lerp(P[i+1], t); const dir = P[i+1].clone().sub(P[i]); if (back) dir.negate(); return {p, dir}; } d -= seg[i]; }
    }};
  }

  TW.buildLife = function(parent, A){
    const g = new THREE.Group(); parent.add(g);
    const actors = [];
    const walker = (pts, loop, speed, opts, offset=0) => { const p = person(opts); g.add(p.root); const pa = path(pts, loop); actors.push({kind:'walk', p, pa, speed, u: offset}); return p; };
    const idle = (x, y, z, ry, opts) => { const p = person(opts); p.root.position.set(x,y,z); p.root.rotation.y = ry; g.add(p.root); actors.push({kind:'idle', p}); return p; };

    // Into the gate, across the courtyard, through the stoa to the palace door
    const main = [[0,0,16],[0,0,3],[0,0,-6],[-3,0,-12],[-2,0,-18],[0,0,-25.5]];
    walker(main, false, 1.15, {}, 0); walker(main, false, 1.0, {}, 22); walker(main, false, 1.25, {}, 41);
    // Market loop between the stalls
    const market = [[-14,0,-5.5],[-6,0,-6.5],[6,0,-6.5],[14,0,-5.5],[14,0,-13.5],[0,0,-14],[-14,0,-13.5]];
    for(let i=0;i<4;i++) walker(market, true, .9 + Math.random()*.35, {}, i*17);
    // To the well with a jar on the head
    walker([[-7,0,-19],[4.9,0,-16.4]], false, .8, {jar:true, robe:0x6f5a8a, head:0xe8dcc4}, 0);
    // Guards patrolling the wall walk
    walker([[-25,9,-1.1],[-10.6,9,-1.1]], false, .7, {helmet:true, spear:true, shield:true, robe:0x7a2430}, 0);
    walker([[10.6,9,-1.1],[25,9,-1.1]], false, .7, {helmet:true, spear:true, shield:true, robe:0x7a2430}, 7);
    // Guards at the gate
    idle(-2.1, 0, 1.3, 0, {helmet:true, spear:true, shield:true, robe:0x7a2430});
    idle(2.1, 0, 1.3, 0, {helmet:true, spear:true, shield:true, robe:0x7a2430});
    // Merchants behind their tables
    [[-17,-9],[-10,-11],[10,-11],[17,-9]].forEach(([x,z]) => idle(x + (Math.random()-.5), 0, z - .35, 0, {gesture:true}));
    // A man leading a donkey along the road and into the courtyard
    const roadPts = [[1.4,0,20],[1.4,0,2],[2.8,0,-5],[8,0,-7.5]];
    const leader = walker(roadPts, false, .85, {robe:0x8c6a3f}, 0);
    const don = donkey(); g.add(don.root); const donPath = path(roadPts, false);
    actors.push({kind:'donkey', d: don, pa: donPath, lead: actors[actors.length-1]});
    // People strolling outside the walls
    walker([[-24,0,4.5],[24,0,4.5]], false, 1.0, {}, 0); walker([[-24,0,6],[24,0,6]], false, .9, {}, 30);

    // ---------- Torches ----------
    const flameTex = new THREE.CanvasTexture(TW.soft('255,170,60'));
    const torches = A.torches.map(pos => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({map: flameTex, blending: THREE.AdditiveBlending, depthWrite:false, transparent:true}));
      sp.position.copy(pos); sp.scale.set(.45,.7,1); g.add(sp);
      const core = new THREE.Sprite(new THREE.SpriteMaterial({map: new THREE.CanvasTexture(TW.soft('255,240,190')), blending: THREE.AdditiveBlending, depthWrite:false, transparent:true}));
      core.position.copy(pos); core.scale.set(.2,.32,1); g.add(core);
      const light = new THREE.PointLight(0xffa040, 1.2, 9, 2); light.position.copy(pos).add(new THREE.Vector3(0,.1,.3)); g.add(light);
      return {sp, core, light, seed: Math.random()*10};
    });

    // ---------- Smoke ----------
    const smokeTex = new THREE.CanvasTexture(TW.soft('200,195,185'));
    const smoke = [];
    A.smoke.forEach(src => { for(let i=0;i<16;i++){ const sp = new THREE.Sprite(new THREE.SpriteMaterial({map: smokeTex, transparent:true, depthWrite:false, opacity:0})); g.add(sp); smoke.push({sp, src, age: i*.4, life: 6.4}); } });

    // ---------- Birds ----------
    const birdMat = mat(0x2a2622, {side: THREE.DoubleSide});
    const birds = [];
    for(let i=0;i<8;i++){
      const b = new THREE.Group(); g.add(b);
      const wingGeo = new THREE.BufferGeometry(); wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0,0,-.15, 0,0,.15, .55,0,0], 3)); wingGeo.computeVertexNormals();
      const wl = new THREE.Mesh(wingGeo, birdMat), wr = new THREE.Mesh(wingGeo, birdMat); wr.scale.x = -1; b.add(wl, wr);
      mesh(new THREE.BoxGeometry(.08,.06,.35), birdMat, b);
      birds.push({b, wl, wr, r: 14 + Math.random()*22, h: 18 + Math.random()*10, sp: (.15 + Math.random()*.12) * (Math.random()<.5?-1:1), a: Math.random()*6.28, ph: Math.random()*6.28});
    }

    // ---------- Cloth animation ----------
    function wave(m, t, fn){ const pos = m.geometry.attributes.position, base = m.userData.base; for(let i=0;i<pos.count;i++){ const x = base[i*3], y = base[i*3+1]; pos.setZ(i, base[i*3+2] + fn(x, y, t)); } pos.needsUpdate = true; m.geometry.computeVertexNormals(); }

    let t = 0;
    return {
      update(dt, scale){
        t += dt;
        actors.forEach(a => {
          if (a.kind === 'walk'){ a.u += dt*a.speed; const r = a.pa.at(a.u); a.p.root.position.copy(r.p); a.p.root.rotation.y = Math.atan2(r.dir.x, r.dir.z); a.p.pose(dt, a.speed); }
          else if (a.kind === 'idle') a.p.pose(dt, 0);
          else if (a.kind === 'donkey'){ const r = a.pa.at(a.lead.u - 1.7); a.d.root.position.copy(r.p); a.d.root.rotation.y = Math.atan2(r.dir.x, r.dir.z); a.d.pose(dt, a.lead.speed); }
        });
        A.flags.forEach(f => wave(f, t, (x,y,tt) => Math.sin(x*2.4 - tt*7)*.16*(x/2.2) + Math.sin(y*3 + tt*5)*.03*(x/2.2)));
        A.banners.forEach(b => wave(b, t, (x,y,tt) => Math.sin(y*1.6 + tt*2.2 + x)*.07*(-y/3)));
        A.awnings.forEach(w => wave(w, t, (x,y,tt) => Math.sin(x*1.5 + tt*2.6)*.04));
        const safe = TW.uniforms.uSafe.value, op = TW.mats.length ? (TW.mats[0].opacity / (TW.mats[0].userData.baseOpacity || 1)) : 1;
        torches.forEach(o => { const f = .8 + Math.sin(t*13 + o.seed)*.12 + Math.sin(t*23 + o.seed*2)*.08 + Math.random()*.06;
          o.sp.scale.set(.42*f, .72*f, 1); o.core.scale.set(.2*f, .3*f, 1); o.light.intensity = 1.3*f*safe*op; o.light.distance = 9*scale;
          o.sp.material.opacity = o.core.material.opacity = safe*op; });
        smoke.forEach(s => { s.age += dt; if (s.age > s.life) s.age -= s.life; const k = s.age/s.life;
          s.sp.position.set(s.src.x + Math.sin(k*4 + s.life)*.4 + k*1.5, s.src.y + k*7, s.src.z - k*.8);
          const sc = .6 + k*3.2; s.sp.scale.set(sc, sc, 1); s.sp.material.opacity = Math.sin(Math.PI*k)*.45*safe*op; });
        birds.forEach(o => { o.a += dt*o.sp; o.b.position.set(Math.cos(o.a)*o.r, o.h + Math.sin(o.a*2)*1.5, -15 + Math.sin(o.a)*o.r); o.b.rotation.y = -o.a + (o.sp > 0 ? Math.PI : 0); o.b.rotation.z = -Math.sign(o.sp)*.25;
          const w = Math.sin(t*9 + o.ph)*.6; o.wl.rotation.z = w; o.wr.rotation.z = -w; });
      }
    };
  };
})();
