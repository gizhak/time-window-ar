// Procedural soundscape (no audio files): sea and wind everywhere, a market crowd and a smith
// placed inside the fort so they get louder as you walk in, torch crackle at the gate, birds.
// Narration uses the phone's own Hebrew text to speech.
(function(){
  const TW = window.TW;
  let listener, ctx, master, started = false, muted = false, positional = [], timers = [];

  function noiseBuffer(seconds, brown){
    const b = ctx.createBuffer(1, ctx.sampleRate*seconds, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0; for(let i=0;i<d.length;i++){ const w = Math.random()*2-1; if (brown){ last = (last + .02*w)/1.02; d[i] = last*3.5; } else d[i] = w; }
    return b;
  }
  function loopSource(buf){ const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.loopStart = 0; s.start(0, Math.random()*buf.duration); return s; }
  function positionalAt(parent, x, y, z, node, ref=4){
    const pa = new THREE.PositionalAudio(listener); pa.position.set(x,y,z); parent.add(pa);
    pa.setRefDistance(ref); pa.setRolloffFactor(1.4); pa.setDistanceModel('inverse'); pa.setNodeSource(node);
    pa.userData.ref = ref; positional.push(pa); return pa;
  }
  const every = (minMs, maxMs, fn) => { let alive = true; const tick = () => { if (!alive) return; fn(); timers.push(setTimeout(tick, minMs + Math.random()*(maxMs-minMs))); }; tick(); return () => alive = false; };

  TW.Sound = {
    init(camera){ listener = new THREE.AudioListener(); camera.add(listener); ctx = listener.context; },
    start(site){
      if (started){ ctx.resume(); return; }
      started = true; ctx.resume();
      const white = noiseBuffer(4, false), brown = noiseBuffer(6, true);
      const out = listener.getInput();

      // Sea: brown noise, low-passed, swelling slowly like waves
      const sea = loopSource(brown), seaLp = ctx.createBiquadFilter(); seaLp.type = 'lowpass'; seaLp.frequency.value = 520;
      const seaGain = ctx.createGain(); seaGain.gain.value = .16;
      const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = .11; lfoG.gain.value = .1; lfo.connect(lfoG).connect(seaGain.gain); lfo.start();
      sea.connect(seaLp).connect(seaGain).connect(out);

      // Wind: band-passed white noise with drifting level
      const wind = loopSource(white), wBp = ctx.createBiquadFilter(); wBp.type = 'bandpass'; wBp.frequency.value = 420; wBp.Q.value = .6;
      const wG = ctx.createGain(); wG.gain.value = .02; wind.connect(wBp).connect(wG).connect(out);
      every(2500, 6000, () => wG.gain.setTargetAtTime(.01 + Math.random()*.045, ctx.currentTime, 1.5));

      // Market crowd: several "voices" of filtered noise with syllable-like envelopes
      const crowd = ctx.createGain(); crowd.gain.value = .9;
      for(let v=0; v<7; v++){
        const s = loopSource(white), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 280 + Math.random()*650; bp.Q.value = 4 + Math.random()*4;
        const env = ctx.createGain(); env.gain.value = 0; s.connect(bp).connect(env).connect(crowd);
        let talking = Math.random() < .5;
        every(90, 230, () => { if (Math.random() < .03) talking = !talking; const now = ctx.currentTime;
          env.gain.setTargetAtTime(talking ? .25 + Math.random()*.55 : 0, now, .03); bp.frequency.setTargetAtTime(250 + Math.random()*700, now, .05); });
      }
      positionalAt(site, 0, 1.6, -10, crowd, 5);

      // Smith hammering at a stall
      const smith = ctx.createGain(); smith.gain.value = .5;
      every(900, 1700, () => { const now = ctx.currentTime;
        [1840, 2610, 3920].forEach((f, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f*(1+Math.random()*.01); g.gain.setValueAtTime(.18/(i+1), now); g.gain.exponentialRampToValueAtTime(.0001, now + .55); o.connect(g).connect(smith); o.start(now); o.stop(now + .6); });
        const n = ctx.createBufferSource(); n.buffer = white; const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500; const ng = ctx.createGain(); ng.gain.setValueAtTime(.35, now); ng.gain.exponentialRampToValueAtTime(.0001, now + .06); n.connect(hp).connect(ng).connect(smith); n.start(now, Math.random()*3); n.stop(now + .08);
      });
      positionalAt(site, 17, 1.2, -9, smith, 3);

      // Torch crackle at the gate
      const crackle = ctx.createGain(); crackle.gain.value = .5;
      every(40, 260, () => { const now = ctx.currentTime, n = ctx.createBufferSource(); n.buffer = white; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500 + Math.random()*3000; const g = ctx.createGain(); g.gain.setValueAtTime(Math.random()*.25, now); g.gain.exponentialRampToValueAtTime(.0001, now + .03); n.connect(bp).connect(g).connect(crackle); n.start(now, Math.random()*3); n.stop(now + .04); });
      positionalAt(site, 0, 3.8, .6, crackle, 1.5);

      // Birds: short chirps from above
      every(1500, 5000, () => { const now = ctx.currentTime, count = 2 + (Math.random()*4|0), base = 2600 + Math.random()*1800;
        for(let i=0;i<count;i++){ const o = ctx.createOscillator(), g = ctx.createGain(), t0 = now + i*.11;
          o.frequency.setValueAtTime(base, t0); o.frequency.exponentialRampToValueAtTime(base*1.45, t0 + .07);
          g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.025, t0 + .01); g.gain.exponentialRampToValueAtTime(.0001, t0 + .09);
          o.connect(g).connect(out); o.start(t0); o.stop(t0 + .1); } });
    },
    setScale(s){ positional.forEach(p => p.setRefDistance(p.userData.ref * s)); },
    setMuted(m){ muted = m; if (listener) listener.setMasterVolume(m ? 0 : 1); if (m) speechSynthesis.cancel(); },
    isMuted: () => muted,
    narrate(text, onEnd){
      if (!('speechSynthesis' in window)) return false;
      if (speechSynthesis.speaking){ speechSynthesis.cancel(); onEnd && onEnd(); return true; }
      const u = new SpeechSynthesisUtterance(text); u.lang = 'he-IL'; u.rate = .95;
      const v = speechSynthesis.getVoices().find(v => /^he|iw/i.test(v.lang)); if (v) u.voice = v;
      u.onend = u.onerror = () => onEnd && onEnd();
      if (listener) listener.setMasterVolume(muted ? 0 : .45);
      const restore = () => { if (listener) listener.setMasterVolume(muted ? 0 : 1); };
      u.addEventListener('end', restore); u.addEventListener('error', restore);
      speechSynthesis.speak(u); return true;
    }
  };

  TW.NARRATION = 'אתה עומד מול שער מבצר מימי הורדוס, לפני כאלפיים שנה. ' +
    'החומות בנויות מאבני גזית גדולות, עם שוליים מסותתים סביב כל אבן, הסימן המובהק של הבנייה ההרודיאנית. ' +
    'משני צידי השער ניצבים מגדלים גבוהים. על החומה מסיירים שומרים עם חניתות ומגינים, ועוקבים אחרי כל מי שמתקרב בדרך. ' +
    'עבור בשער ותגיע לחצר. כאן הומה השוק: סוחרים מוכרים פירות, שמן ויין בכדים, ומהדוכן הקיצוני נשמעות מכות הפטיש של הנפח. ' +
    'מהתנור הסמוך עולה ריח של לחם, ונשים יורדות אל הבאר עם כדים על ראשן. ' +
    'מעבר לשדרת העמודים עומד הארמון, עם מרפסת המשקיפה על החצר. זה המקום שבו ישבו השליט ופקידיו. ' +
    'הסתובב בחופשיות, והתקרב לכל פינה. וזכור לשים לב לקרקע האמיתית תחת רגליך.';
})();
