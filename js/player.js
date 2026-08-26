"use strict";
/* ============================================================
   PLAYER — first-person camera, walking physics, voxel
   collision, swimming, ladder climbing, and the gather/place
   raycast. Values proven with real kids in v1.
   ============================================================ */
var Player = (function () {
  var camera = null;
  var pos = new THREE.Vector3(64, 30, 64);   // feet position
  var vel = new THREE.Vector3();
  var yaw = 0, pitch = 0;
  var onGround = false;
  var WIDTH = 0.55, HEIGHT = 1.65, EYE = 1.5;

  var move = { x: 0, z: 0 };   // -1..1 strafe / forward (set by Controls)
  var wantJump = false;

  function init(cam) { camera = cam; }

  function spawnAt(x, z, facingYaw) {
    var g = World.groundNear(x, z);
    pos.set(g.x + 0.5, g.y + 1.05, g.z + 0.5);
    vel.set(0, 0, 0);
    yaw = facingYaw !== undefined ? facingYaw : Math.PI * 0.25;
    pitch = -0.1;
  }

  function look(dx, dy) {
    yaw -= dx;
    pitch -= dy;
    var lim = Math.PI / 2 - 0.05;
    pitch = Math.max(-lim, Math.min(lim, pitch));
  }

  function collide(axis, amount) {
    pos[axis] += amount;
    var minX = pos.x - WIDTH / 2, maxX = pos.x + WIDTH / 2;
    var minY = pos.y,             maxY = pos.y + HEIGHT;
    var minZ = pos.z - WIDTH / 2, maxZ = pos.z + WIDTH / 2;
    for (var bx = Math.floor(minX); bx <= Math.floor(maxX); bx++)
      for (var by = Math.floor(minY); by <= Math.floor(maxY); by++)
        for (var bz = Math.floor(minZ); bz <= Math.floor(maxZ); bz++) {
          if (!World.isSolid(bx, by, bz)) continue;
          if (axis === "y") {
            if (amount < 0) { pos.y = by + 1; vel.y = 0; onGround = true; }
            else { pos.y = by - HEIGHT - 0.001; vel.y = 0; }
          } else if (axis === "x") {
            pos.x = amount > 0 ? bx - WIDTH / 2 - 0.001 : bx + 1 + WIDTH / 2 + 0.001;
          } else {
            pos.z = amount > 0 ? bz - WIDTH / 2 - 0.001 : bz + 1 + WIDTH / 2 + 0.001;
          }
          return;
        }
  }

  var stepAccum = 0;
  function update(dt) {
    dt = Math.min(dt, 0.05);
    var M = CONFIG.MOVE;
    var inWater = World.isWaterAt(pos.x, pos.y + 0.5, pos.z);
    var onLadder = World.isLadderAt(pos.x, pos.y + 0.4, pos.z) ||
                   World.isLadderAt(pos.x, pos.y + 1.1, pos.z);

    var sin = Math.sin(yaw), cos = Math.cos(yaw);
    var speed = (inWater || onLadder) ? M.speed * M.waterSpeedMul : M.speed;
    var vx = (move.x * cos - move.z * sin) * speed;
    var vz = (-move.x * sin - move.z * cos) * speed;

    if (onLadder) {
      if (wantJump) vel.y = 4.6;
      else if (move.z !== 0 || move.x !== 0) vel.y = 3.1;
      else vel.y = -1.4;
    } else if (inWater) {
      vel.y -= M.gravity * 0.25 * dt;
      vel.y = Math.max(vel.y, -2.5);
      if (wantJump) vel.y = 3.2;
    } else {
      vel.y -= M.gravity * dt;
      if (wantJump && onGround) { vel.y = M.jump; onGround = false; GameAudio.sfx.pop(); }
    }

    onGround = false;
    collide("y", vel.y * dt);
    collide("x", vx * dt);
    collide("z", vz * dt);

    // soft walls at the very map border
    pos.x = Math.max(1, Math.min(World.SX - 1, pos.x));
    pos.z = Math.max(1, Math.min(World.SZ - 1, pos.z));

    // fell off the isle into the sky — float back to camp
    if (pos.y < World.MIN_Y - 10) {
      var camp = Store.data.player.camp;
      if (camp && camp.isle === Store.data.player.isle) {
        spawnAt(camp.x, camp.z);
        if (window.UI && UI.toast) UI.toast("🪂 A friendly wind carried you back to your bedroll!");
      } else {
        spawnAt(World.SX / 2, World.SZ / 2);
        if (window.UI && UI.toast) UI.toast("🪂 A friendly wind carried you back!");
      }
    }

    // footsteps
    var moving = (Math.abs(vx) + Math.abs(vz)) > 0.5;
    if (moving && onGround) {
      stepAccum += dt;
      if (stepAccum > 0.38) { stepAccum = 0; GameAudio.sfx.step(); }
    }

    // camera with a light head-bob while walking
    var bob = moving && onGround ? Math.sin(performance.now() / 130) * 0.04 : 0;
    camera.position.set(pos.x, pos.y + EYE + bob, pos.z);
    camera.rotation.set(0, 0, 0);
    camera.rotateY(yaw);
    camera.rotateX(pitch);
  }

  /* raycast from screen center into the voxel world */
  var raycaster = new THREE.Raycaster();
  function raycastBlock(maxDist) {
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    raycaster.far = maxDist || CONFIG.MOVE.reach;
    var hits = raycaster.intersectObjects(World.meshes, false);
    if (!hits.length) return null;
    var hit = hits[0];
    var p = hit.point;
    // step a hair along the ray: just past the surface = the block hit,
    // just before it = where a new block goes (works for cross-planes too)
    var d = raycaster.ray.direction;
    var e = 0.005;
    return {
      block: {
        x: Math.floor(p.x + d.x * e),
        y: Math.floor(p.y + d.y * e),
        z: Math.floor(p.z + d.z * e)
      },
      place: {
        x: Math.floor(p.x - d.x * e),
        y: Math.floor(p.y - d.y * e),
        z: Math.floor(p.z - d.z * e)
      },
      distance: hit.distance,
      point: p
    };
  }

  function wouldIntersectPlayer(bx, by, bz) {
    return bx + 1 > pos.x - WIDTH / 2 && bx < pos.x + WIDTH / 2 &&
           by + 1 > pos.y            && by < pos.y + HEIGHT &&
           bz + 1 > pos.z - WIDTH / 2 && bz < pos.z + WIDTH / 2;
  }

  return {
    init: init, spawnAt: spawnAt, look: look, update: update,
    raycastBlock: raycastBlock, wouldIntersectPlayer: wouldIntersectPlayer,
    move: move,
    set jump(v) { wantJump = v; },
    get position() { return pos; },
    get yaw() { return yaw; }
  };
})();
