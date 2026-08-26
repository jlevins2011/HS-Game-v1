"use strict";
/* ============================================================
   CONTROLS — iPad-first touch controls plus keyboard/mouse.
   - Touch the left side of the screen: virtual walk joystick
   - Touch anywhere else and drag: look around
   - Quick tap: interact (gather / open / place / talk)
   Desktop: WASD + drag mouse to look + click to interact,
   SPACE jump, B toggles build mode, E opens the pack.
   These exact thresholds are proven with real kids in v1.
   ============================================================ */
var Controls = (function () {
  var el = null;
  var enabled = false;

  var joyId = null, joyStart = { x: 0, y: 0 };
  var lookId = null, lookLast = { x: 0, y: 0 }, lookMoved = 0, lookStartT = 0;

  var joyBase = null, joyKnob = null;

  function init(canvas) {
    el = canvas;
    joyBase = document.getElementById("joy-base");
    joyKnob = document.getElementById("joy-knob");

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    window.addEventListener("keydown", onKey(true));
    window.addEventListener("keyup", onKey(false));

    // stop iOS scroll/zoom gestures while playing
    document.addEventListener("touchmove", function (e) {
      if (enabled) e.preventDefault();
    }, { passive: false });
  }

  function setEnabled(v) {
    enabled = v;
    if (!v) {
      Player.move.x = 0; Player.move.z = 0; Player.jump = false;
      joyId = lookId = null;
      if (joyBase) joyBase.style.display = "none";
    }
  }

  function isTouch(e) { return e.pointerType === "touch"; }

  function onDown(e) {
    if (!enabled) return;
    GameAudio.unlock();
    var w = window.innerWidth;
    var R = CONFIG.MOVE.joyRadius;

    if (isTouch(e) && e.clientX < w * 0.42 && joyId === null) {
      joyId = e.pointerId;
      joyStart.x = e.clientX; joyStart.y = e.clientY;
      joyBase.style.display = "block";
      joyBase.style.left = (e.clientX - R) + "px";
      joyBase.style.top = (e.clientY - R) + "px";
      joyKnob.style.transform = "translate(0px,0px)";
      return;
    }
    if (lookId === null) {
      lookId = e.pointerId;
      lookLast.x = e.clientX; lookLast.y = e.clientY;
      lookMoved = 0; lookStartT = performance.now();
    }
  }

  function onMove(e) {
    if (!enabled) return;
    if (e.pointerId === joyId) {
      var R = CONFIG.MOVE.joyRadius;
      var dx = e.clientX - joyStart.x, dy = e.clientY - joyStart.y;
      var len = Math.hypot(dx, dy);
      var cap = Math.min(len, R);
      var nx = len ? dx / len : 0, ny = len ? dy / len : 0;
      joyKnob.style.transform = "translate(" + (nx * cap) + "px," + (ny * cap) + "px)";
      var mag = cap / R;
      Player.move.x = nx * mag;      // strafe
      Player.move.z = -ny * mag;     // forward
      return;
    }
    if (e.pointerId === lookId) {
      var mx = e.clientX - lookLast.x, my = e.clientY - lookLast.y;
      lookMoved += Math.abs(mx) + Math.abs(my);
      lookLast.x = e.clientX; lookLast.y = e.clientY;
      Player.look(mx * CONFIG.MOVE.lookSensitivity, my * CONFIG.MOVE.lookSensitivity);
    }
  }

  function onUp(e) {
    if (e.pointerId === joyId) {
      joyId = null;
      Player.move.x = 0; Player.move.z = 0;
      if (joyBase) joyBase.style.display = "none";
      return;
    }
    if (e.pointerId === lookId) {
      var wasTap = lookMoved < 14 && (performance.now() - lookStartT) < 400;
      lookId = null;
      if (wasTap && enabled) Game.interact();
    }
  }

  /* ---------- keyboard (desktop / testing) ---------- */
  var keys = {};
  var keysWereMoving = false;
  function onKey(down) {
    return function (e) {
      if (!enabled) return;
      if (e.repeat) return;
      keys[e.code] = down;
      if (down && e.code === "Space") { Player.jump = true; e.preventDefault(); }
      if (!down && e.code === "Space") Player.jump = false;
      if (down && e.code === "KeyB") Game.toggleMode();
      if (down && e.code === "KeyE") UI.toggleInventory();
      if (down && e.code === "KeyR" && Build.mode) Build.rotate();
      if (down && e.code >= "Digit1" && e.code <= "Digit9" && Build.mode) {
        var pi = parseInt(e.code.slice(5), 10) - 1;
        if (Build.PIECES[pi]) { Build.setPiece(Build.PIECES[pi].id); UI.updateBuildSheet(); }
      }
      updateKeyMove();
    };
  }
  function updateKeyMove() {
    var x = 0, z = 0;
    if (keys.KeyW || keys.ArrowUp) z += 1;
    if (keys.KeyS || keys.ArrowDown) z -= 1;
    if (keys.KeyA || keys.ArrowLeft) x -= 1;
    if (keys.KeyD || keys.ArrowRight) x += 1;
    if (x || z || keysWereMoving) { Player.move.x = x; Player.move.z = z; }
    keysWereMoving = !!(x || z);
  }

  return { init: init, setEnabled: setEnabled };
})();
