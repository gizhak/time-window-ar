// The reconstruction: a Herodian-style fortified palace.
// Local frame: front wall outer face on z = 0, from x = -27 to x = +27; interior toward -Z; ground y = 0.
(function(){
  const TW = window.TW;

  TW.buildFort = function(){
    const g = new THREE.Group();
    const A = {torches:[], banners:[], flags:[], awnings:[], smoke:[], groundOnly:[]};
    const T = {
      stone: TW.M({map: TW.tex(TW.ashlar('#d9c49b'), 4), roughness:.92}),
      stoneDark: TW.M({map: TW.tex(TW.ashlar('#c2a77b'), 4), roughness:.95}),
      fine: TW.M({map: TW.tex(TW.ashlar('#e6d6b3', 12), 2), roughness:.85}),
      plaster: TW.M({map: TW.tex(TW.plaster('#ece2cc'), 3), roughness:.8, bump:false}),
      marble: TW.M({map: TW.tex(TW.plaster('#f3ede0'), 3), roughness:.4, bump:false}),
      roof: TW.M({map: TW.tex(TW.tiles(), 2), roughness:.8}),
      wood: TW.M({map: TW.tex(TW.wood(), 2), roughness:.85}),
      dark: TW.M({color:0x241a12, roughness:1}),
      iron: TW.M({color:0x3a3a3e, roughness:.5, metalness:.6}),
      paving: TW.M({map: TW.tex(TW.paving(), 3), roughness:1}),
      earth: TW.M({color:0xa88b62, roughness:1}),
      clay: TW.M({color:0xb5673e, roughness:.8}),
      clayLight: TW.M({color:0xcf9a6a, roughness:.8}),
      basket: TW.M({color:0x9b7a45, roughness:1}),
      fruitO: TW.M({color:0xe08a2e, roughness:.6}),
      fruitG: TW.M({color:0x6f8f3a, roughness:.6}),
      fruitP: TW.M({color:0x5b2b4a, roughness:.6}),
      palm: TW.M({color:0x7a6248, roughness:1}),
      frond: TW.M({map: (() => { const t = TW.tex(TW.frond(), 1); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; })(), alphaTest:.3, side:THREE.DoubleSide, bump:false, roughness:.8}),
      banner: TW.M({map: TW.tex(TW.cloth('#7a1f2b', '#8d2733'), 2), side:THREE.DoubleSide, roughness:1, bump:false}),
      bannerGold: TW.M({color:0xc9a24a, side:THREE.DoubleSide, roughness:.7})
    };
    const awningMats = [['#c9b48a','#a5452f'], ['#d8cfb8','#2f5a7a'], ['#cdb98f','#6b7a35'], ['#e1d4b5','#8a3a5a']]
      .map(([a,b]) => TW.M({map: TW.tex(TW.cloth(a,b), 2), side:THREE.DoubleSide, roughness:1, bump:false}));

    const add = (mesh, cast=true) => { mesh.castShadow = cast; mesh.receiveShadow = true; g.add(mesh); return mesh; };
    const box = (w,h,d,m,x,y,z,mpt) => { const me = new THREE.Mesh(TW.boxGeo(w,h,d, m.map ? (mpt || m.map.userData.m) : 0), m); me.position.set(x,y,z); return add(me); };
    const cyl = (rt,rb,h,m,x,y,z,seg=16) => { const me = new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg), m); me.position.set(x,y,z); return add(me); };

    // ---------- Front wall with plinth, string course, battlements ----------
    const H = 9, T2 = 2.2;
    [[-27,-9.8],[9.8,27]].forEach(([a,b]) => {
      const w = b-a, cx = (a+b)/2;
      box(w, H, T2, T.stone, cx, H/2, -T2/2);
      box(w, 1.3, .35, T.stoneDark, cx, .65, .17);
      box(w, .3, .25, T.fine, cx, H-.15, .12);
      for(let x=a+.5; x<b-.3; x+=1.6) box(.9, 1.1, .5, T.stone, x, H+.55, -.25);
      box(w, .9, .35, T.stone, cx, H+.45, -T2+.17);
    });
    // Side and back walls
    [-26, 26].forEach(x => {
      box(T2, H, 39, T.stone, x, H/2, -T2-19.5);
      for(let z=-3; z>-41; z-=1.6) box(.5, 1.1, .9, T.stone, x + Math.sign(x)*.85, H+.55, z);
    });
    box(54.2, H, T2, T.stone, 0, H/2, -41.8);

    // ---------- Gatehouse: wall with a real arched opening ----------
    const s = new THREE.Shape();
    s.moveTo(-4.2,0); s.lineTo(-2.6,0); s.lineTo(-2.6,3.5); s.absarc(0,3.5,2.6,Math.PI,0,true); s.lineTo(2.6,0); s.lineTo(4.2,0); s.lineTo(4.2,H+1.2); s.lineTo(-4.2,H+1.2); s.lineTo(-4.2,0);
    const gateGeo = new THREE.ExtrudeGeometry(s, {depth:T2, bevelEnabled:false, curveSegments:24});
    const uv = gateGeo.attributes.uv; for(let i=0;i<uv.count;i++) uv.setXY(i, uv.getX(i)/4, uv.getY(i)/4);
    const gate = add(new THREE.Mesh(gateGeo, T.stone)); gate.position.z = -T2;
    // Voussoirs around the arch, alternating tone, keystone proud
    const nV = 13;
    for(let i=0;i<nV;i++){
      const a = Math.PI * (i+.5)/nV, r = 3.05;
      const v = box(.55, i===6 ? 1.15 : .9, .3, i%2 ? T.fine : T.stoneDark, Math.cos(a)*r, 3.5+Math.sin(a)*r, .1);
      v.rotation.z = a - Math.PI/2;
    }
    box(9.4, .45, .5, T.fine, 0, 7.1, .2);                 // cornice over the gate
    for(let x=-3.6; x<=3.7; x+=1.2) box(.8, 1.1, .5, T.stone, x, H+1.75, -.25);
    // Door leaves, opened inward
    [-1, 1].forEach(side => {
      const leaf = new THREE.Group(); leaf.position.set(side*2.55, 0, -.6); g.add(leaf);
      const d = new THREE.Mesh(TW.boxGeo(2.5, 3.4, .16, 2), T.wood); d.position.set(-side*1.25, 1.7, 0); d.castShadow = d.receiveShadow = true; leaf.add(d);
      [0.7, 1.9, 3.0].forEach(y => { const b = new THREE.Mesh(new THREE.BoxGeometry(2.5,.12,.2), T.iron); b.position.set(-side*1.25, y, 0); leaf.add(b); });
      leaf.rotation.y = side * -1.25;
    });
    // Passage floor through the gate (part of the walking surface)
    A.groundOnly.push(box(5.2, .06, T2+.2, T.paving, 0, .03, -T2/2));

    // ---------- Towers ----------
    [-7, 7].forEach(x => {
      box(5.6, 14, 5.6, T.stoneDark, x, 7, -1.1);
      box(6.0, 1.4, 6.0, T.stone, x, .7, -1.1);
      box(6.0, .35, 6.0, T.fine, x, 9.2, -1.1);
      box(6.0, .35, 6.0, T.fine, x, 13.8, -1.1);
      for(let k=-2;k<=2;k++){ box(.9,1.1,.6, T.stoneDark, x+k*1.2, 14.55, 1.6); box(.9,1.1,.6, T.stoneDark, x+k*1.2, 14.55, -3.8); box(.6,1.1,.9, T.stoneDark, x-2.5, 14.55, -1.1+k*1.2); box(.6,1.1,.9, T.stoneDark, x+2.5, 14.55, -1.1+k*1.2); }
      // arrow slits on the front and outer side
      [5.2, 11.2].forEach(y => { box(.22, 1.3, .1, T.dark, x, y, 1.72); box(.1, 1.3, .22, T.dark, x + Math.sign(x)*2.82, y, -1.1); });
      // small window on the upper storey
      box(.8, 1.0, .1, T.dark, x, 11.6, 1.72); box(1.1, .15, .2, T.wood, x, 11.05, 1.78);
      // banner hanging on the tower face
      const bg = new THREE.PlaneGeometry(1.5, 3, 6, 12); bg.translate(0, -1.5, 0);
      const banner = new THREE.Mesh(bg, T.banner); banner.position.set(x, 10.6, 1.78); banner.castShadow = true; g.add(banner);
      banner.userData.base = bg.attributes.position.array.slice(); A.banners.push(banner);
      box(1.8, .12, .12, T.bannerGold, x, 10.65, 1.8);
      // flag pole and flag on top
      cyl(.05, .06, 3.4, T.wood, x+1.8, 16.8, .4, 6);
      const fg = new THREE.PlaneGeometry(2.2, 1.2, 12, 4); fg.translate(1.1, 0, 0);
      const flag = new THREE.Mesh(fg, T.banner); flag.position.set(x+1.8, 17.8, .4); flag.castShadow = true; g.add(flag);
      flag.userData.base = fg.attributes.position.array.slice(); A.flags.push(flag);
      // torch beside the gate
      const tx = Math.sign(x) * 3.45;
      box(.12, .5, .5, T.iron, tx, 3.1, .3); cyl(.06, .04, .55, T.wood, tx, 3.45, .5, 6);
      A.torches.push(new THREE.Vector3(tx, 3.85, .52));
    });

    // ---------- Wall walk: stairs from the courtyard and inner parapet ----------
    for(let i=0;i<18;i++){ const h = (i+1)*.5; box(.62, h, 1.4, T.stone, -24+i*.6, h/2, -T2-.7); }
    for(let i=0;i<18;i++){ const h = (i+1)*.5; box(.62, h, 1.4, T.stone, 24-i*.6, h/2, -T2-.7); }

    // ---------- Courtyard surface (hidden at real scale so the real ground stays visible) ----------
    const court = new THREE.Mesh(new THREE.PlaneGeometry(50, 38), T.paving);
    court.geometry.attributes.uv.array.forEach((v,i,arr) => { arr[i] = v * (i%2 ? 38/3 : 50/3); });
    court.rotation.x = -Math.PI/2; court.position.set(0, .02, -21.1); court.receiveShadow = true; g.add(court); A.groundOnly.push(court);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(6, 18), T.earth); road.rotation.x = -Math.PI/2; road.position.set(0, .015, 9); road.receiveShadow = true; g.add(road); A.groundOnly.push(road);

    // ---------- Market stalls ----------
    const lathe = (pts, m, x, y, z, sc=1) => { const me = new THREE.Mesh(new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0]*sc, p[1]*sc)), 14), m); me.position.set(x,y,z); return add(me); };
    const amphora = [[0,0],[.06,.02],[.12,.15],[.2,.45],[.21,.6],[.17,.75],[.07,.85],[.06,.98],[.09,1.0],[0,1.0]];
    const jar = [[0,0],[.15,.02],[.22,.2],[.22,.35],[.14,.48],[.12,.5],[0,.5]];
    const stalls = [[-17,-9],[-10,-11],[10,-11],[17,-9]];
    stalls.forEach(([x,z], i) => {
      const w = 4, d = 2.6;
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b]) => cyl(.07,.08, b<0 ? 2.6 : 2.2, T.wood, x+a*w/2, (b<0?2.6:2.2)/2, z+b*d/2, 6));
      box(w-.3, .08, 1.0, T.wood, x, .9, z+.6); [-1,1].forEach(a => box(.08, .9, .9, T.wood, x+a*(w/2-.3), .45, z+.6));
      const ag = new THREE.PlaneGeometry(w+.4, d+.6, 8, 4);
      const aw = new THREE.Mesh(ag, awningMats[i]); aw.rotation.x = -Math.PI/2 + .18; aw.position.set(x, 2.45, z); aw.castShadow = true; g.add(aw);
      aw.userData.base = ag.attributes.position.array.slice(); A.awnings.push(aw);
      // goods
      for(let k=0;k<3;k++) lathe(amphora, k%2 ? T.clay : T.clayLight, x-1.4+k*.5, 0, z-.7, .9);
      for(let k=0;k<3;k++){ const bx = x-1+k*1.0, bz = z+.6; cyl(.32,.26,.22, T.basket, bx, 1.05, bz, 12);
        const fm = [T.fruitO, T.fruitG, T.fruitP][(i+k)%3];
        for(let f=0; f<7; f++){ const sp = new THREE.Mesh(new THREE.SphereGeometry(.07,8,6), fm); sp.position.set(bx+(Math.random()-.5)*.35, 1.2+Math.random()*.06, bz+(Math.random()-.5)*.35); g.add(sp); } }
      lathe(jar, T.clay, x+1.6, 0, z-.6); lathe(jar, T.clayLight, x+1.6, .5, z-.6, .7);
    });

    // ---------- Well ----------
    lathe([[.75,0],[.85,0],[.85,.85],[.75,.85]], T.stone, 6, 0, -17);
    cyl(.07,.07,2.1, T.wood, 5.1, 1.05, -17, 6); cyl(.07,.07,2.1, T.wood, 6.9, 1.05, -17, 6);
    const bar = cyl(.06,.06,2.0, T.wood, 6, 2.0, -17, 6); bar.rotation.z = Math.PI/2;
    cyl(.16,.13,.25, T.wood, 6, 1.2, -17, 10);

    // ---------- Bread oven with smoke ----------
    const oven = new THREE.Mesh(new THREE.SphereGeometry(1.1, 18, 10, 0, Math.PI*2, 0, Math.PI/2), T.plaster); oven.position.set(-18, 0, -23); add(oven);
    box(.7,.6,.2, T.dark, -18, .3, -21.95);
    A.smoke.push(new THREE.Vector3(-18, 1.2, -23));

    // ---------- Colonnade (stoa) ----------
    for(let i=0;i<8;i++){
      const x = -14+i*4, z = -15;
      cyl(.62,.66,.35, T.marble, x, .18, z, 18);
      cyl(.42,.48,6.0, T.marble, x, 3.35, z, 20);
      cyl(.56,.42,.35, T.marble, x, 6.5, z, 18);
      box(1.25,.28,1.25, T.marble, x, 6.8, z);
    }
    box(31, .9, 1.6, T.marble, 0, 7.4, -15);
    box(31.6, .25, 1.9, T.fine, 0, 7.95, -15);
    box(31, .25, 6, T.roof, 0, 8.3, -17.6).rotation.x = -.12;

    // ---------- Palace ----------
    const pz = -33;
    box(26, 5, 14, T.plaster, 0, 2.5, pz);
    box(26.6, .45, 14.6, T.fine, 0, 5.1, pz);
    box(26, 4.6, 14, T.plaster, 0, 7.6, pz);
    box(27.2, .6, 15.2, T.fine, 0, 10.2, pz);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0, 9, 4, 4, 1), T.roof); roof.rotation.y = Math.PI/4; roof.scale.set(1.55, 1, .85); roof.position.set(0, 12.5, pz); add(roof);
    // entrance with pilasters and pediment
    box(3, 3.6, .3, T.dark, 0, 1.8, pz+7.05);
    [-2, 2].forEach(x => box(.5, 4.4, .4, T.marble, x, 2.2, pz+7.15));
    const tri = new THREE.Shape(); tri.moveTo(-2.7,0); tri.lineTo(2.7,0); tri.lineTo(0,1.1); tri.lineTo(-2.7,0);
    const ped = add(new THREE.Mesh(new THREE.ExtrudeGeometry(tri, {depth:.45, bevelEnabled:false}), T.marble)); ped.position.set(0, 4.4, pz+6.95);
    // windows on both storeys
    for(let i=0;i<6;i++){ const x = -10+i*4; if (Math.abs(x) < 2) continue;
      [[2.6, 1.5],[7.6, 1.8]].forEach(([y, hh]) => { box(1.1, hh, .12, T.dark, x, y, pz+7.02); box(1.4, .14, .3, T.fine, x, y-hh/2-.05, pz+7.1); box(1.3, .12, .2, T.wood, x, y+hh/2+.05, pz+7.08); });
    }
    // balcony
    box(8, .2, 1.4, T.wood, 0, 5.4, pz+7.7); for(let x=-3.8; x<=3.9; x+=.5) cyl(.04,.04,.9, T.wood, x, 5.95, pz+8.35, 5); box(8, .08, .08, T.wood, 0, 6.4, pz+8.35);

    // ---------- Palm trees outside the walls ----------
    [[-33,4,.1],[-37,-7,-.08],[31,5,-.12],[35,-11,.1],[-31,-20,0]].forEach(([x,z,lean]) => {
      const tr = new THREE.Group(); tr.position.set(x,0,z); g.add(tr);
      const hgt = 9 + Math.random()*3, seg = 9;
      for(let i=0;i<seg;i++){ const y = i*hgt/seg, off = Math.pow(i/seg, 2)*lean*hgt;
        const c = new THREE.Mesh(new THREE.CylinderGeometry(.24-.012*i, .28-.012*i, hgt/seg+.05, 8), T.palm); c.position.set(off, y+hgt/seg/2, 0); c.castShadow = true; tr.add(c); }
      const top = new THREE.Vector3(lean*hgt, hgt, 0);
      for(let k=0;k<13;k++){
        const f = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 4.2, 1, 4), T.frond);
        const pos = f.geometry.attributes.position; for(let i=0;i<pos.count;i++){ const yy = pos.getY(i); pos.setZ(i, -Math.pow((yy+2.1)/4.2, 2)*1.6); }
        f.geometry.translate(0, 2.1, 0); f.position.copy(top);
        f.rotation.order = 'YXZ'; f.rotation.y = k/13*Math.PI*2; f.rotation.x = -Math.PI/2 + .35 + Math.random()*.3; f.castShadow = true; tr.add(f);
      }
    });

    return {group:g, anchors:A};
  };
})();
