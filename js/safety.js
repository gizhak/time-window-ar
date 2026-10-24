// Safety layer for walking around with the phone up.
// 1. Proximity bubble: the reconstruction fades within ~1.8 m of the visitor, so real obstacles stay visible.
// 2. Speed check: walking fast fades the reconstruction and asks the visitor to slow down.
// 3. Obstacle check (phones with a depth sensor or depth estimation): something close ahead while moving
//    fades everything, vibrates and shows a warning.
// The reconstruction never draws an opaque floor at real scale, so steps and holes in the real ground stay visible.
(function(){
  const TW = window.TW;
  const U = TW.uniforms;
  let last = null, speed = 0, fastFor = 0, obstacleUntil = 0, lastBuzz = 0, depthOk = null, safeTarget = 1, clearFor = 0;
  let ui = {warn: () => {}, chip: () => {}};

  TW.Safety = {
    FEATURES: {optionalFeatures: ['depth-sensing'], depthSensing: {usagePreference: ['cpu-optimized'], dataFormatPreference: ['luminance-alpha', 'float32']}},
    bind(callbacks){ ui = Object.assign(ui, callbacks); },
    reset(){ last = null; speed = 0; fastFor = 0; obstacleUntil = 0; depthOk = null; safeTarget = 1; U.uSafe.value = 1; ui.warn(null); },
    // realScale: true when the reconstruction is life size, so the bubble and checks apply
    update(frame, ref, camPos, dt, realScale){
      U.uCam.value.copy(camPos);
      if (realScale){ U.uFadeNear.value = .7; U.uFadeFar.value = 1.8; } else { U.uFadeNear.value = -1; U.uFadeFar.value = -.5; }
      if (dt <= 0 || dt > .5) { last = camPos.clone(); return; }

      // Walking speed, horizontal, smoothed
      if (last){ const v = Math.hypot(camPos.x - last.x, camPos.z - last.z) / dt; speed += (v - speed) * Math.min(1, dt*2.5); }
      last = camPos.clone();
      fastFor = speed > 1.45 ? fastFor + dt : 0;

      // Obstacle ahead from the depth map: sample the lower middle of the view
      let nearest = Infinity;
      if (frame && depthOk !== false){
        try{
          const pose = frame.getViewerPose(ref);
          const di = pose && frame.getDepthInformation ? frame.getDepthInformation(pose.views[0]) : null;
          if (di){ depthOk = true;
            for(let x=.3; x<=.71; x+=.1) for(let y=.45; y<=.86; y+=.1){ const d = di.getDepthInMeters(x, y); if (d > .05 && d < nearest) nearest = d; } }
          else if (depthOk === null && pose) depthOk = false;
        }catch(e){ depthOk = false; }
      }
      const now = performance.now();
      if (nearest < 1.0 && speed > .25) obstacleUntil = now + 1500;

      if (now < obstacleUntil){
        safeTarget = .08; clearFor = 0;
        ui.warn('זהירות, יש מכשול קרוב לפניך. עצור והסתכל מסביב.', 'danger');
        if (now - lastBuzz > 2500 && navigator.vibrate){ navigator.vibrate([120, 60, 120]); lastBuzz = now; }
      } else if (fastFor > .6){
        safeTarget = .3; clearFor = 0;
        ui.warn('האט. ההליכה מהירה מדי בזמן שאתה מסתכל במסך.', 'caution');
        if (now - lastBuzz > 4000 && navigator.vibrate){ navigator.vibrate(80); lastBuzz = now; }
      } else {
        clearFor += dt; if (clearFor > .8){ safeTarget = 1; ui.warn(null); }
      }
      U.uSafe.value += (safeTarget - U.uSafe.value) * Math.min(1, dt*4);
      ui.chip(depthOk === true ? 'בטיחות: חיישן מכשולים פעיל' : 'בטיחות: מעקב מהירות');
    }
  };
})();
