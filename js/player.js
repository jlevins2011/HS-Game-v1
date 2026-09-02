"use strict";
/* ============================================================
   PLAYER — first-person camera and movement over sculpted
   terrain. The speeds, jump arc, and responsiveness are the
   proven v1 values; only the ground itself changed: smooth
   heightfield walking, cliff faces act as walls, structure
   floors are walkable, trees and rocks push back gently.
   ============================================================ */
var Player = (function () {
  var camera = null;
  var pos = new THREE.Vector3(96, 30, 96);   // feet position
  var vel = new THREE.Vector3();
  var yaw = 0, pitch = 0;
  var onGround = false;
  var RADIUS = 0.34, HEIGHT = 1.65, EYE = 1.5;
  var STEP = 0.75;                 // max walk-up ledge; steeper = wall

  var move = { x: 0, z: 0 };
  var wantJump = false;
  var gliding = false;             // Cloudcap: holding ⬆️ while falling

  function hasCloudcap() {
    return !!(window.Store && Store.data && Store.data.player && Store.data.player.tools.cloudcap);
  }

  function init(cam) { camera = cam; }

  function spawnAt(x, z, facingYaw) {
    var g = Terrain.groundNear(x, z);
    pos.set(g.x, g.y + 0.1, g.z);
    vel.set(0, 0, 0);
    yaw = facingYaw !== undefined ? facingYaw : Math.PI * 0.25;
    pitch = -0.08;
  }

  function look(dx, dy) {
    yaw -= dx;
    pitch -= dy;
    var lim = Math.PI / 2 - 0.05;
    pitch = Math.max(-lim, Math.min(lim, pitch));
  }

  // walkable ground at (x,z) considering terrain and structure floors
  function groundAt(x, z, refY) {
    var g = Terrain.heightAt(x, z);
    var b = (window.Build ? Build.floorTopAt(x, z, refY + STEP) : -Infinity);
    return Math.max(g, b);
  }

  function tryAxis(nx, nz) {
    // built walls stop you outright rather than letting you step in and
    // then shoving you back out (that read as "walking through" walls)
    if (window.Build && Build.blocksAt(nx, nz, pos.y, RADIUS, HEIGHT)) return false;
    var g = groundAt(nx, nz, pos.y);
    if (g === -Infinity) return true;                   // open sky: allowed, we'll fall
    if (g - pos.y > STEP) return false;                 // cliff face / wall
    return true;
  }

  var stepAccum = 0;
  function update(dt) {
    dt = Math.min(dt, 0.05);
    var M = CONFIG.MOVE;
    var water = Terrain.def.water;
    var inWater = !Terrain.inGrotto && water > 0 && Terrain.isWater(pos.x, pos.z) && pos.y < water - 0.15;

    var sin = Math.sin(yaw), cos = Math.cos(yaw);
    var speed = inWater ? M.speed * M.waterSpeedMul : (gliding ? M.speed * M.glideSpeedMul : M.speed);
    var mx = move.x, mz = move.z;
    // a glider with no stick input drifts forward — jump off a cliff, hold
    // ⬆️, and you sail; steer by looking
    if (gliding && !mx && !mz) mz = 0.6;
    var vx = (mx * cos - mz * sin) * speed;
    var vz = (-mx * sin - mz * cos) * speed;

    if (inWater) {
      vel.y -= M.gravity * 0.25 * dt;
      vel.y = Math.max(vel.y, -2.5);
      if (wantJump) vel.y = 3.2;
      gliding = false;
    } else {
      vel.y -= M.gravity * dt;
      if (wantJump && onGround) { vel.y = M.jump; onGround = false; GameAudio.sfx.pop(); }
      // Cloudcap glide: once the jump's rise is spent, holding ⬆️ turns the
      // fall into a float
      var canGlide = wantJump && !onGround && vel.y < 0 && hasCloudcap();
      if (canGlide) {
        vel.y = Math.max(vel.y, -M.glideFallSpeed);
        if (!gliding) startGlide();
      } else if (gliding) {
        gliding = false;
        if (window.UI && UI.setJumpGlyph) UI.setJumpGlyph("⬆️");
      }
    }

    // horizontal, axis-separated so we slide along walls
    var dx = vx * dt, dz = vz * dt;
    if (dx || dz) {
      if (tryAxis(pos.x + dx, pos.z + dz)) { pos.x += dx; pos.z += dz; }
      else if (tryAxis(pos.x + dx, pos.z)) { pos.x += dx; }
      else if (tryAxis(pos.x, pos.z + dz)) { pos.z += dz; }
    }

    // gentle push-out from solid objects and structure walls
    var cols = Objects.collidersNear(pos.x, pos.z);
    for (var i = 0; i < cols.length; i++) {
      var c = cols[i];
      var ox = pos.x - c.x, oz = pos.z - c.z;
      var d = Math.hypot(ox, oz);
      var min = c.r + RADIUS;
      if (d < min && d > 0.0001) {
        pos.x = c.x + (ox / d) * min;
        pos.z = c.z + (oz / d) * min;
      }
    }
    // resolve twice so inside corners can't squeeze you through
    if (window.Build) { Build.collideCircle(pos, RADIUS, HEIGHT); Build.collideCircle(pos, RADIUS, HEIGHT); }

    // grotto walls
    if (Terrain.inGrotto) {
      var gr = Terrain.grotto;
      var gx = pos.x - gr.x, gz = pos.z - gr.z;
      var gd = Math.hypot(gx, gz);
      var gmax = gr.r - 0.7;
      if (gd > gmax) { pos.x = gr.x + (gx / gd) * gmax; pos.z = gr.z + (gz / gd) * gmax; }
    }

    // world border
    pos.x = Math.max(1, Math.min(Terrain.SX - 1, pos.x));
    pos.z = Math.max(1, Math.min(Terrain.SZ - 1, pos.z));

    // vertical
    onGround = false;
    pos.y += vel.y * dt;
    var ground = groundAt(pos.x, pos.z, pos.y);
    if (ground > -Infinity && pos.y <= ground) {
      // smooth snap: never pop up more than a step at once
      if (ground - pos.y < 2) { pos.y = ground; vel.y = 0; onGround = true; }
      else { pos.y = ground; vel.y = 0; onGround = true; }
    }

    // fell off the isle — a friendly wind carries you home (a glider
    // floats slowly, so the wind comes for them sooner)
    if (pos.y < (gliding ? -28 : -70)) {
      var camp = (window.Build ? Build.campSpot() : null);
      if (camp) spawnAt(camp.x, camp.z);
      else spawnAt(Terrain.CX, Terrain.CZ);
      if (window.UI && UI.toast) UI.toast("🪂 A friendly wind carried you back!");
    }

    // footsteps
    var moving = (Math.abs(vx) + Math.abs(vz)) > 0.5;
    if (moving && onGround) {
      stepAccum += dt;
      if (stepAccum > 0.38) { stepAccum = 0; GameAudio.sfx.step(); }
    }

    var bob = moving && onGround ? Math.sin(performance.now() / 130) * 0.04 : 0;
    camera.position.set(pos.x, pos.y + EYE + bob, pos.z);
    camera.rotation.set(0, 0, 0);
    camera.rotateY(yaw);
    camera.rotateX(pitch);
    // Bake the transform now. Raycasts (build ghost, interaction prompt) run
    // BEFORE the renderer draws, and setFromCamera reads matrixWorld — without
    // this they aim with the previous frame's camera, which on a slower device
    // makes the build ghost lag behind where the child is actually pointing.
    camera.updateMatrixWorld();
  }

  function startGlide() {
    gliding = true;
    GameAudio.sfx.spark();
    if (window.UI && UI.setJumpGlyph) UI.setJumpGlyph("🪂");
    if (window.Store && Store.data && !Store.data.player.glided) {
      Store.data.player.glided = true;
      Store.save();
      if (window.UI && UI.toast) UI.toast("🪂 You're gliding! Hold ⬆️ to float, look to steer.", 3200);
    }
  }

  /* ray helpers for interaction / placement */
  var raycaster = new THREE.Raycaster();
  function ray() {
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    return raycaster;
  }

  function terrainHit(maxDist) {
    var rc = ray();
    rc.far = maxDist || 30;
    if (!Terrain.groundMesh) return null;
    var hits = rc.intersectObject(Terrain.groundMesh, false);
    return hits.length ? hits[0] : null;
  }

  function wouldIntersectPlayer(x0, y0, z0, x1, y1, z1) {
    return x1 > pos.x - RADIUS && x0 < pos.x + RADIUS &&
           y1 > pos.y && y0 < pos.y + HEIGHT &&
           z1 > pos.z - RADIUS && z0 < pos.z + RADIUS;
  }

  return {
    init: init, spawnAt: spawnAt, look: look, update: update,
    ray: ray, terrainHit: terrainHit, wouldIntersectPlayer: wouldIntersectPlayer,
    move: move,
    set jump(v) { wantJump = v; },
    get position() { return pos; },
    get yaw() { return yaw; },
    get pitch() { return pitch; },
    get grounded() { return onGround; },
    get gliding() { return gliding; }
  };
})();
