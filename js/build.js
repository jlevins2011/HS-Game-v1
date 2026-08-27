"use strict";
/* ============================================================
   BUILD — modular construction. Children compose real
   structures from meaningful pieces — floors, walls, doors,
   windows, roofs, stairs, fences, bridges, tents, planters,
   lanterns — with generous snapping on a 2m grid. A ghost
   preview shows exactly where the piece will land; tap to
   place. Bridges can span open sky between isles.
   ============================================================ */
var Build = (function () {
  var CELL = 2;
  var WALL_H = 2.4;

  var scene = null;
  var isleState = null;
  var pieces = [];            // { t, x, y, z, r, mesh, tops:[], solids:[] }
  var group = null;
  var ghostMesh = null, ghostValid = false, ghostPose = null;
  var mode = false, removeMode = false;
  var activePiece = "floor";
  var rotIdx = 0;
  var lanternLights = [];

  /* ---------------- piece catalog ---------------- */
  var WOOD = 0xc59a63, WOOD_D = 0x8a6540, WOOD_L = 0xd9b078;
  var CANVAS = 0xf2eee2, ACCENT = 0xd95f5f, GLASSC = 0xbfe4f4, SOIL = 0x6d4f37;

  var PIECES = [
    { id: "floor", name: "Floor", icon: "▦", cost: { timber: 2 },
      desc: "A sturdy platform. Stack walls on it, or aim at a wall top for an upper story." },
    { id: "wall", name: "Wall", icon: "▮", cost: { timber: 2 }, desc: "Plank wall on a cell edge. Rotate to face it." },
    { id: "window", name: "Window Wall", icon: "⊞", cost: { timber: 2, glass: 1 }, desc: "A wall with a bright window." },
    { id: "door", name: "Doorway", icon: "🚪", cost: { timber: 3 }, desc: "A wall with a doorway to walk through." },
    { id: "roof", name: "Roof", icon: "⌂", cost: { timber: 2 }, desc: "A cozy gable roof. Sits on wall tops." },
    { id: "stairs", name: "Stairs", icon: "𝍖", cost: { timber: 2 }, desc: "Chunky steps. Two flights reach a full story." },
    { id: "fence", name: "Fence", icon: "🚧", cost: { timber: 1 }, desc: "Keeps tuftles out. Or in." },
    { id: "bridge", name: "Bridge", icon: "🌉", cost: { timber: 2, fluff: 1 },
      desc: "A rope-and-plank span. Chain them across open sky between anchors!" },
    { id: "tent", name: "Camp Tent", icon: "⛺", cost: { timber: 2, fluff: 2 },
      desc: "Your camp. If you fall off the isle, you wake up here." },
    { id: "planter", name: "Planter", icon: "🌱", cost: { timber: 2 },
      desc: "Rich soil for seeds. Tap it to plant, tap again to harvest." },
    { id: "lantern", name: "Lantern Post", icon: "🏮", cost: { timber: 1, emberstone: 1 },
      desc: "Warm light for paths, camps, and the Hollow.", needs: "lanternkit" }
  ];
  function pieceDef(id) { return PIECES.find(function (p) { return p.id === id; }); }

  /* ---------------- geometry builders ---------------- */
  // built at origin facing +z (rot applied via t.ry), base at y=0
  function buildPieceGeo(g, t, pose) {
    // grid pieces rotate in 90° steps; bridges take a free angle (pose.ry)
    var T = { x: pose.x, y: pose.y, z: pose.z, ry: pose.ry !== undefined ? pose.ry : pose.r * Math.PI / 2 };
    function o(dx, dy, dz, extra) {
      var e = Object.assign({}, T, extra);
      var c = Math.cos(T.ry), s = Math.sin(T.ry);
      e.x = T.x + dx * c + dz * s;
      e.z = T.z - dx * s + dz * c;
      e.y = T.y + dy;
      if (extra && extra.ry !== undefined) e.ry = T.ry + extra.ry;
      return e;
    }
    if (t === "floor") {
      g.box(CELL, 0.22, CELL, WOOD, o(0, 0, 0), 0.15);
      g.box(CELL, 0.1, 0.16, WOOD_D, o(0, 0.22, CELL / 2 - 0.08), 0.1);
      g.box(CELL, 0.1, 0.16, WOOD_D, o(0, 0.22, -CELL / 2 + 0.08), 0.1);
    } else if (t === "wall" || t === "window" || t === "door") {
      // Boards butt flush against each other (no gaps to see daylight through)
      // and each is thicker than the collider is deep, so you never see the
      // world through a wall you are standing against.
      var boards = 5;
      var bw = CELL / boards;
      var TH = 0.26;
      for (var i = 0; i < boards; i++) {
        var bx = -CELL / 2 + (i + 0.5) * bw;
        var isOpen = i > 0 && i < 4 && (t === "door" || t === "window");
        if (!isOpen) {
          g.box(bw, WALL_H, TH, i % 2 ? WOOD : WOOD_L, o(bx, 0, 0), 0.12);
        } else if (t === "window") {
          g.box(bw, 0.7, TH, i % 2 ? WOOD : WOOD_L, o(bx, 0, 0), 0.12);
          g.box(bw, 0.5, TH, i % 2 ? WOOD : WOOD_L, o(bx, WALL_H - 0.5, 0), 0.12);
          g.box(bw, WALL_H - 1.2, 0.08, GLASSC, o(bx, 0.7, 0), 0.05);
        } else {
          g.box(bw, WALL_H - 1.95, TH, i % 2 ? WOOD : WOOD_L, o(bx, 1.95, 0), 0.12);
        }
      }
      // top and bottom rails tie the boards together
      g.box(CELL, 0.16, TH + 0.06, WOOD_D, o(0, WALL_H - 0.16, 0), 0.1);
      g.box(CELL, 0.14, TH + 0.06, WOOD_D, o(0, 0, 0), 0.1);
      if (t === "door") {
        // a lintel over the opening so the doorway reads as a doorway
        g.box(CELL * 0.62, 0.18, TH + 0.04, WOOD_D, o(0, 1.95, 0), 0.1);
      }
    } else if (t === "roof") {
      // gable prism with overhang
      var w = CELL + 0.5, d = CELL + 0.5, h = 1.15;
      var A = o(-w / 2, 0, -d / 2), B = o(w / 2, 0, -d / 2), C = o(w / 2, 0, d / 2), D = o(-w / 2, 0, d / 2);
      var R1 = o(0, h, -d / 2), R2 = o(0, h, d / 2);
      function pt(e) { return [e.x, e.y, e.z]; }
      g.quad(pt(A), pt(R1), pt(R2), pt(D), ACCENT, 0.15);
      g.quad(pt(R1), pt(B), pt(C), pt(R2), ACCENT, 0.15);
      g.tri(pt(A), pt(B), pt(R1), CANVAS, 0.1);
      g.tri(pt(D), pt(R2), pt(C), CANVAS, 0.1);
      g.box(w, 0.12, d, WOOD_D, o(0, -0.06, 0), 0.1);
      g.box(0.18, 0.18, d, WOOD_D, o(0, h - 0.05, 0), 0.1);
    } else if (t === "stairs") {
      for (var s = 0; s < 4; s++) {
        g.box(CELL, 0.34, CELL / 4, s % 2 ? WOOD : WOOD_L, o(0, s * 0.34, -CELL / 2 + (s + 0.5) * CELL / 4), 0.12);
      }
    } else if (t === "fence") {
      g.box(0.12, 1.0, 0.12, WOOD_D, o(-CELL / 2 + 0.1, 0, 0), 0.1);
      g.box(0.12, 1.0, 0.12, WOOD_D, o(CELL / 2 - 0.1, 0, 0), 0.1);
      g.box(CELL, 0.1, 0.08, WOOD, o(0, 0.75, 0), 0.1);
      g.box(CELL, 0.1, 0.08, WOOD, o(0, 0.35, 0), 0.1);
    } else if (t === "bridge") {
      for (var b = 0; b < 6; b++) {
        g.box(1.6, 0.12, 0.55, b % 2 ? WOOD : WOOD_L, o(0, 0, -CELL + (b + 0.5) * (CELL * 2 / 6)), 0.15);
      }
      g.box(0.1, 0.1, CELL * 2, WOOD_D, o(-0.8, -0.08, 0), 0.1);
      g.box(0.1, 0.1, CELL * 2, WOOD_D, o(0.8, -0.08, 0), 0.1);
      // rope rails
      g.box(0.07, 0.07, CELL * 2, 0xa89060, o(-0.85, 0.85, 0), 0);
      g.box(0.07, 0.07, CELL * 2, 0xa89060, o(0.85, 0.85, 0), 0);
      g.box(0.07, 0.95, 0.07, WOOD_D, o(-0.85, 0, -CELL + 0.1), 0);
      g.box(0.07, 0.95, 0.07, WOOD_D, o(0.85, 0, -CELL + 0.1), 0);
      g.box(0.07, 0.95, 0.07, WOOD_D, o(-0.85, 0, CELL - 0.1), 0);
      g.box(0.07, 0.95, 0.07, WOOD_D, o(0.85, 0, CELL - 0.1), 0);
    } else if (t === "tent") {
      var tw = CELL + 0.4, th = 1.7, td = CELL + 0.6;
      var TA = o(-tw / 2, 0, -td / 2), TB = o(tw / 2, 0, -td / 2), TC = o(tw / 2, 0, td / 2), TD = o(-tw / 2, 0, td / 2);
      var TR1 = o(0, th, -td / 2), TR2 = o(0, th, td / 2);
      function tp(e) { return [e.x, e.y, e.z]; }
      g.quad(tp(TA), tp(TR1), tp(TR2), tp(TD), CANVAS, 0.12);
      g.quad(tp(TR1), tp(TB), tp(TC), tp(TR2), ACCENT, 0.12);
      g.tri(tp(TD), tp(TR2), tp(TC), CANVAS, 0.1);
      g.box(0.1, th, 0.1, WOOD_D, o(0, 0, -td / 2), 0.1);
      g.box(0.1, th, 0.1, WOOD_D, o(0, 0, td / 2), 0.1);
      g.box(1.2, 0.28, 0.8, 0x5e8fd0, o(0.4, 0.02, 0), 0.1);   // bedroll inside
    } else if (t === "planter") {
      g.box(1.7, 0.45, 1.7, WOOD_D, o(0, 0, 0), 0.12);
      g.box(1.45, 0.14, 1.45, SOIL, o(0, 0.42, 0), 0.2);
    } else if (t === "lantern") {
      g.cyl(0.09, 0.07, 2.1, 5, WOOD_D, o(0, 0, 0), 0.1, 0);
      g.box(0.42, 0.5, 0.42, 0x4a3a2c, o(0, 2.1, 0), 0.1);
      g.box(0.3, 0.34, 0.3, 0xffdf8a, o(0, 2.16, 0), 0);
      g.cone(0.34, 0.3, 4, ACCENT, o(0, 2.6, 0), 0.1, 0);
    }
  }

  /* ---------------- colliders per piece ---------------- */
  function computePhysics(p) {
    var tops = [], solids = [];
    var r = p.r * Math.PI / 2;
    var c = Math.cos(r), s = Math.sin(r);
    function rectFor(dx, dz, w, d) {
      // rotated rectangle approximated by aligned box (fine at 90° steps)
      var cx = p.x + dx * c + dz * s, cz = p.z - dx * s + dz * c;
      var W = (p.r % 2 === 0) ? w : d, D = (p.r % 2 === 0) ? d : w;
      return { x0: cx - W / 2, z0: cz - D / 2, x1: cx + W / 2, z1: cz + D / 2 };
    }
    if (p.t === "floor") {
      var rf = rectFor(0, 0, CELL, CELL);
      tops.push({ x0: rf.x0, z0: rf.z0, x1: rf.x1, z1: rf.z1, top: p.y + 0.22 });
    } else if (p.t === "bridge") {
      // free-angle plank: walkable circles along its axis
      var ry = p.ry || 0;
      var ax = Math.sin(ry), az = Math.cos(ry);
      [-1.5, -0.75, 0, 0.75, 1.5].forEach(function (tt) {
        tops.push({ cx: p.x + ax * tt, cz: p.z + az * tt, cr: 1.05, top: p.y + 0.12 });
      });
    } else if (p.t === "stairs") {
      for (var i = 0; i < 4; i++) {
        var rs = rectFor(0, -CELL / 2 + (i + 0.5) * CELL / 4, CELL, CELL / 4 + 0.05);
        tops.push({ x0: rs.x0, z0: rs.z0, x1: rs.x1, z1: rs.z1, top: p.y + i * 0.34 + 0.34 });
      }
    } else if (p.t === "wall" || p.t === "window") {
      var rw = rectFor(0, 0, CELL, 0.3);
      solids.push({ x0: rw.x0, y0: p.y, z0: rw.z0, x1: rw.x1, y1: p.y + WALL_H, z1: rw.z1 });
      tops.push({ x0: rw.x0, z0: rw.z0, x1: rw.x1, z1: rw.z1, top: p.y + WALL_H });
    } else if (p.t === "door") {
      // posts match the two solid boards, so the gap you can SEE is the gap
      // you can walk through (1.2m — roomy for a 0.68m-wide explorer)
      var rl = rectFor(-0.8, 0, 0.4, 0.3), rr = rectFor(0.8, 0, 0.4, 0.3);
      solids.push({ x0: rl.x0, y0: p.y, z0: rl.z0, x1: rl.x1, y1: p.y + WALL_H, z1: rl.z1 });
      solids.push({ x0: rr.x0, y0: p.y, z0: rr.z0, x1: rr.x1, y1: p.y + WALL_H, z1: rr.z1 });
      var rt = rectFor(0, 0, CELL, 0.3);
      tops.push({ x0: rt.x0, z0: rt.z0, x1: rt.x1, z1: rt.z1, top: p.y + WALL_H });
    } else if (p.t === "fence") {
      var rfc = rectFor(0, 0, CELL, 0.24);
      solids.push({ x0: rfc.x0, y0: p.y, z0: rfc.z0, x1: rfc.x1, y1: p.y + 1.0, z1: rfc.z1 });
    } else if (p.t === "roof") {
      var rr2 = rectFor(0, 0, CELL + 0.5, CELL + 0.5);
      tops.push({ x0: rr2.x0, z0: rr2.z0, x1: rr2.x1, z1: rr2.z1, top: p.y + 0.6 });
    } else if (p.t === "tent" || p.t === "planter") {
      var rt2 = rectFor(0, 0, p.t === "tent" ? 1.6 : 1.7, p.t === "tent" ? 1.8 : 1.7);
      solids.push({ x0: rt2.x0, y0: p.y, z0: rt2.z0, x1: rt2.x1, y1: p.y + (p.t === "tent" ? 1.2 : 0.5), z1: rt2.z1 });
    } else if (p.t === "lantern") {
      solids.push({ x0: p.x - 0.14, y0: p.y, z0: p.z - 0.14, x1: p.x + 0.14, y1: p.y + 2.0, z1: p.z + 0.14 });
    }
    p.tops = tops;
    p.solids = solids;
  }

  /* ---------------- physics queries ---------------- */
  function topContains(t, x, z, pad) {
    pad = pad || 0;
    if (t.cr !== undefined) return Math.hypot(x - t.cx, z - t.cz) <= t.cr + pad;
    return x >= t.x0 - pad && x <= t.x1 + pad && z >= t.z0 - pad && z <= t.z1 + pad;
  }

  function floorTopAt(x, z, maxY) {
    var best = -Infinity;
    for (var i = 0; i < pieces.length; i++) {
      var tops = pieces[i].tops;
      for (var j = 0; j < tops.length; j++) {
        var t = tops[j];
        if (topContains(t, x, z, 0) && t.top <= maxY && t.top > best) best = t.top;
      }
    }
    return best;
  }

  // Would a body of this size at (x,z,feetY) be inside a solid piece?
  // Used to STOP movement before it happens, so walls feel like walls
  // instead of shoving you out after you have already stepped inside.
  function blocksAt(x, z, feetY, radius, height) {
    for (var i = 0; i < pieces.length; i++) {
      var solids = pieces[i].solids;
      for (var j = 0; j < solids.length; j++) {
        var b = solids[j];
        if (feetY + height * 0.9 < b.y0 || feetY + 0.35 > b.y1) continue;
        var cx = Math.max(b.x0, Math.min(x, b.x1));
        var cz = Math.max(b.z0, Math.min(z, b.z1));
        if (Math.hypot(x - cx, z - cz) < radius) return true;
      }
    }
    return false;
  }

  // does this pending piece overlap the player right now?
  function wouldTrapPlayer(pose) {
    var probe = { t: pose.t, x: pose.x, y: pose.y, z: pose.z, r: pose.r, ry: pose.ry };
    computePhysics(probe);
    var p = Player.position;
    for (var j = 0; j < probe.solids.length; j++) {
      var b = probe.solids[j];
      if (p.y + 1.5 < b.y0 || p.y + 0.35 > b.y1) continue;
      var cx = Math.max(b.x0, Math.min(p.x, b.x1));
      var cz = Math.max(b.z0, Math.min(p.z, b.z1));
      if (Math.hypot(p.x - cx, p.z - cz) < 0.45) return true;
    }
    return false;
  }

  function collideCircle(pos, radius, height) {
    for (var i = 0; i < pieces.length; i++) {
      var solids = pieces[i].solids;
      for (var j = 0; j < solids.length; j++) {
        var b = solids[j];
        if (pos.y + height * 0.9 < b.y0 || pos.y + 0.35 > b.y1) continue;
        // closest point on box to circle center
        var cx = Math.max(b.x0, Math.min(pos.x, b.x1));
        var cz = Math.max(b.z0, Math.min(pos.z, b.z1));
        var dx = pos.x - cx, dz = pos.z - cz;
        var d = Math.hypot(dx, dz);
        if (d < radius) {
          if (d < 0.001) {
            // inside: push out along smallest axis
            var pushW = Math.min(pos.x - b.x0 + radius, b.x1 - pos.x + radius);
            var pushD = Math.min(pos.z - b.z0 + radius, b.z1 - pos.z + radius);
            if (pushW < pushD) pos.x = (pos.x - b.x0 < b.x1 - pos.x) ? b.x0 - radius : b.x1 + radius;
            else pos.z = (pos.z - b.z0 < b.z1 - pos.z) ? b.z0 - radius : b.z1 + radius;
          } else {
            pos.x = cx + (dx / d) * radius;
            pos.z = cz + (dz / d) * radius;
          }
        }
      }
    }
  }

  /* ---------------- supports & snapping ---------------- */
  function snapCell(x, z) {
    return { x: Math.floor(x / CELL) * CELL + CELL / 2, z: Math.floor(z / CELL) * CELL + CELL / 2 };
  }

  function supportsAt(x, z) {
    var list = [];
    var t = Terrain.heightAt(x, z);
    if (t > -100) list.push(t);
    for (var i = 0; i < pieces.length; i++) {
      var tops = pieces[i].tops;
      for (var j = 0; j < tops.length; j++) {
        if (topContains(tops[j], x, z, 0.3)) list.push(tops[j].top);
      }
    }
    return list;
  }

  // Prefer the HIGHEST surface at (or just below) where the child is pointing.
  // Aiming at a floor's edge then puts the wall on the floor rather than on the
  // dirt underneath it, so a room's walls all line up at the same height.
  function nearestSupport(x, z, aimY) {
    var list = supportsAt(x, z);
    if (!list.length) return null;
    var best = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i] <= aimY + 0.5 && (best === null || list[i] > best)) best = list[i];
    }
    if (best !== null) return best;
    var lo = list[0];
    for (var j = 1; j < list.length; j++) if (list[j] < lo) lo = list[j];
    return lo;
  }

  /* ---------------- ghost ---------------- */
  // Where is the player looking? Tests the terrain AND everything already
  // built, taking whichever is nearer — otherwise the ray sails straight
  // through your own floor and you end up editing the tile behind it.
  function aimPoint() {
    var rc = Player.ray();
    rc.far = 16;
    var best = null;
    if (Terrain.groundMesh) {
      var th = rc.intersectObject(Terrain.groundMesh, false);
      if (th.length) best = th[0];
    }
    var meshes = [];
    for (var i = 0; i < pieces.length; i++) if (pieces[i].mesh) meshes.push(pieces[i].mesh);
    if (meshes.length) {
      var ph = rc.intersectObjects(meshes, false);
      if (ph.length && (!best || ph[0].distance < best.distance)) best = ph[0];
    }
    if (best) return best.point;
    // nothing under the cursor (open sky) — project a point ahead
    return rc.ray.origin.clone().add(rc.ray.direction.clone().multiplyScalar(9));
  }

  function currentPose() {
    var aim = aimPoint();
    var cell = snapCell(aim.x, aim.z);
    var def = pieceDef(activePiece);
    var pose = { t: activePiece, x: cell.x, z: cell.z, r: rotIdx, valid: true, reason: "" };

    if (activePiece === "wall" || activePiece === "window" || activePiece === "door" || activePiece === "fence") {
      // Point at the side of the tile you want the wall on and it goes there.
      // ⟳ steps to the next side, so every one of the four is reachable.
      var lx = aim.x - cell.x, lz = aim.z - cell.z;
      var edge = Math.abs(lx) > Math.abs(lz)
        ? (lx < 0 ? 1 : 3)          // west : east
        : (lz < 0 ? 0 : 2);         // north : south
      var r = (edge + rotIdx) % 4;
      pose.r = r;
      var off = [[0, -CELL / 2], [-CELL / 2, 0], [0, CELL / 2], [CELL / 2, 0]][r];
      pose.x = cell.x + off[0];
      pose.z = cell.z + off[1];
      var sup = nearestSupport(cell.x, cell.z, aim.y);
      if (sup === null) { pose.valid = false; pose.reason = "No ground here"; }
      else pose.y = sup;
    } else if (activePiece === "bridge") {
      // the bridge extends from where YOU stand, in the direction you face:
      // walk to an edge, look toward the far side, tap — then walk out and repeat
      var fy = Player.yaw;
      var fx = -Math.sin(fy), fz = -Math.cos(fy);
      var p0 = Player.position;
      var under = nearestSupport(p0.x, p0.z, p0.y);
      pose.x = p0.x + fx * 3.1;
      pose.z = p0.z + fz * 3.1;
      pose.ry = Math.atan2(fx, fz);
      if (under === null || p0.y - under > 2.5) {
        pose.valid = false;
        pose.reason = "Stand on solid ground (or a bridge end) first";
      } else {
        pose.y = under - 0.12;
      }
    } else {
      var sup4 = nearestSupport(pose.x, pose.z, aim.y);
      if (sup4 === null) { pose.valid = false; pose.reason = "No ground here"; }
      else pose.y = sup4;
      if (activePiece === "roof") {
        // a roof always caps whatever is on the tile — point anywhere at it
        var list = supportsAt(pose.x, pose.z);
        if (list.length) pose.y = Math.max.apply(null, list);
      }
    }

    if (pose.valid) {
      var def2 = pieceDef(activePiece);
      if (def2.needs && !Store.data.player.tools[def2.needs]) {
        pose.valid = false;
        pose.reason = "Wren's " + def2.needs + " unlocks this!";
      } else if (!canAfford(def2.cost)) {
        pose.valid = false;
        pose.reason = "Need " + costStr(def2.cost);
      } else if (duplicateAt(pose)) {
        pose.valid = false;
        pose.reason = "Already built here";
      } else if (tooFar(pose)) {
        pose.valid = false;
        pose.reason = "Too far away";
      } else if (wouldTrapPlayer(pose)) {
        pose.valid = false;
        pose.reason = "Step back — you're standing there!";
      }
    }
    return pose;
  }

  function duplicateAt(pose) {
    return pieces.some(function (p) {
      if (p.t !== pose.t) return false;
      if (pose.t === "bridge") {
        return Math.hypot(p.x - pose.x, p.z - pose.z) < 2.2 && Math.abs(p.y - pose.y) < 0.6;
      }
      return Math.abs(p.x - pose.x) < 0.4 && Math.abs(p.z - pose.z) < 0.4 &&
             Math.abs(p.y - pose.y) < 0.4 && (p.r % 2) === (pose.r % 2);
    });
  }
  function tooFar(pose) {
    return Math.hypot(pose.x - Player.position.x, pose.z - Player.position.z) > 14;
  }

  function canAfford(cost) {
    var inv = Store.data.player.inventory;
    return Object.keys(cost).every(function (k) { return (inv[k] || 0) >= cost[k]; });
  }
  function costStr(cost) {
    return Object.keys(cost).map(function (k) { return cost[k] + " " + (ITEM_ICON[k] || "") + " " + k; }).join(" + ");
  }

  function updateGhost() {
    if (!mode || removeMode) { if (ghostMesh) ghostMesh.visible = false; return; }
    var pose = currentPose();
    ghostPose = pose;
    ghostValid = pose.valid;
    if (ghostMesh) { group.remove(ghostMesh); ghostMesh.geometry.dispose(); ghostMesh = null; }
    if (pose.y === undefined) return;
    var g = new Geo.Builder();
    buildPieceGeo(g, pose.t, pose);
    ghostMesh = g.build(Geo.ghostMaterial());
    ghostMesh.material = ghostMesh.material.clone();
    ghostMesh.material.color.setHex(pose.valid ? 0xbfffcf : 0xff9a9a);
    group.add(ghostMesh);
  }

  /* ---------------- placing / removing ---------------- */
  function place() {
    if (!mode || removeMode || !ghostPose || !ghostPose.valid) {
      if (ghostPose && !ghostPose.valid && ghostPose.reason) UI.toast(ghostPose.reason, 1800);
      return false;
    }
    var def = pieceDef(activePiece);
    var inv = Store.data.player.inventory;
    Object.keys(def.cost).forEach(function (k) { inv[k] -= def.cost[k]; });
    var rec = { t: ghostPose.t, x: ghostPose.x, y: ghostPose.y, z: ghostPose.z, r: ghostPose.r };
    if (ghostPose.ry !== undefined) rec.ry = ghostPose.ry;
    addPiece(rec);
    isleState.pieces.push(rec);
    Store.save();
    Stats.recordBuild();
    GameAudio.sfx.place();
    if (rec.t === "tent") UI.toast("⛺ Camp set! If you fall, you'll wake up here.", 2600);
    Game.checkBridges();
    UI.updateBuildSheet();
    return true;
  }

  function addPiece(rec) {
    var p = { t: rec.t, x: rec.x, y: rec.y, z: rec.z, r: rec.r, ry: rec.ry };
    var g = new Geo.Builder();
    buildPieceGeo(g, p.t, p);
    p.mesh = g.build();
    p.mesh.userData.piece = p;
    group.add(p.mesh);
    computePhysics(p);
    pieces.push(p);
    if (p.t === "lantern") addLanternLight(p);
    if (p.t === "planter" && window.Garden) Garden.registerPlanter(p);
    return p;
  }

  function removeAim() {
    var rc = Player.ray();
    rc.far = 14;
    var meshes = pieces.map(function (p) { return p.mesh; });
    var hits = rc.intersectObjects(meshes, false);
    if (!hits.length) return false;
    var p = hits[0].object.userData.piece;
    removePiece(p, true);
    return true;
  }

  function removePiece(p, refund) {
    group.remove(p.mesh);
    p.mesh.geometry.dispose();
    pieces.splice(pieces.indexOf(p), 1);
    var idx = isleState.pieces.findIndex(function (r) {
      return r.t === p.t && Math.abs(r.x - p.x) < 0.01 && Math.abs(r.z - p.z) < 0.01 && Math.abs(r.y - p.y) < 0.01;
    });
    if (idx >= 0) isleState.pieces.splice(idx, 1);
    if (p.light) { scene.remove(p.light); lanternLights.splice(lanternLights.indexOf(p.light), 1); }
    if (p.t === "planter" && window.Garden) Garden.unregisterPlanter(p);
    if (refund) {
      var def = pieceDef(p.t);
      var inv = Store.data.player.inventory;
      Object.keys(def.cost).forEach(function (k) { inv[k] = (inv[k] || 0) + def.cost[k]; });
      UI.toast("↩️ " + def.name + " taken back (materials returned)");
    }
    Store.save();
    GameAudio.sfx.pop();
    UI.updateBuildSheet();
  }

  function addLanternLight(p) {
    if (lanternLights.length >= 20) return;
    var light = new THREE.PointLight(0xffcc66, 1.4, 11, 1.8);
    light.position.set(p.x, p.y + 2.3, p.z);
    scene.add(light);
    p.light = light;
    lanternLights.push(light);
  }

  /* ---------------- mode / api ---------------- */
  function enterMode() { mode = true; removeMode = false; }
  function exitMode() {
    mode = false; removeMode = false;
    if (ghostMesh) { group.remove(ghostMesh); ghostMesh.geometry.dispose(); ghostMesh = null; }
  }
  function setPiece(id) { activePiece = id; removeMode = false; }
  function rotate() { rotIdx = (rotIdx + 1) % 4; }
  function toggleRemove() { removeMode = !removeMode; }

  function campSpot() {
    for (var i = pieces.length - 1; i >= 0; i--) {
      if (pieces[i].t === "tent") return { x: pieces[i].x, z: pieces[i].z };
    }
    return null;
  }

  function bridgePiecesNear(ax, az, bx, bz) {
    // pieces whose center lies within the corridor between two anchors
    var dx = bx - ax, dz = bz - az;
    var len = Math.hypot(dx, dz);
    var nx = dx / len, nz = dz / len;
    var count = 0;
    pieces.forEach(function (p) {
      if (p.t !== "bridge") return;
      var px = p.x - ax, pz = p.z - az;
      var t = px * nx + pz * nz;
      if (t < -2 || t > len + 2) return;
      var off = Math.abs(px * nz - pz * nx);
      if (off < 5) count++;
    });
    return count;
  }

  function load(sc, state) {
    scene = sc;
    isleState = state;
    if (!isleState.pieces) isleState.pieces = [];
    if (group) scene.remove(group);
    lanternLights.forEach(function (l) { scene.remove(l); });
    lanternLights = [];
    group = new THREE.Group();
    scene.add(group);
    pieces = [];
    exitMode();
    isleState.pieces.forEach(addPiece);
  }

  return {
    PIECES: PIECES, pieceDef: pieceDef, canAfford: canAfford, costStr: costStr,
    load: load, updateGhost: updateGhost, place: place, removeAim: removeAim,
    enterMode: enterMode, exitMode: exitMode, setPiece: setPiece, rotate: rotate,
    toggleRemove: toggleRemove,
    floorTopAt: floorTopAt, collideCircle: collideCircle, blocksAt: blocksAt,
    removePiece: removePiece,
    campSpot: campSpot, bridgePiecesNear: bridgePiecesNear,
    get mode() { return mode; },
    get removeMode() { return removeMode; },
    get activePiece() { return activePiece; },
    get ghostPose() { return ghostPose; },
    get pieces() { return pieces; }
  };
})();
