"use strict";
/* ============================================================
   OBJECTS — the living things of the world. Not blocks:
   trees you chop, rock formations you quarry, ruins you
   salvage, flowers you pick, wonderstones that float and
   glow, dormant Lightsprings, grotto doors, bridge anchors.

   Static objects (trees, rocks, plants, ruins) are merged
   into one mesh per 24m region — hundreds of objects, a
   handful of draw calls. Dynamic objects (wonderstones,
   chests, springs, doors, anchors) get individual meshes so
   they can bob, glow, and change state.

   Everything regrows on a timer, so the world never runs dry
   and saves stay small.
   ============================================================ */

var ITEM_ICON = {
  timber: "🪵", leaves: "🍃", stone: "🪨", emberstone: "🔥",
  "skysteel ore": "🔩", skysteel: "⚙️", starstone: "🌟", glimmer: "🔮",
  glowmoss: "✨", moonpearl: "🌙", aurorium: "🌈", claybrick: "🧱", glass: "🪟",
  fluff: "☁️", feather: "🪶", shell: "🐚", glowdust: "💫",
  berries: "🫐", sunfruit: "🍊", moonmelon: "🍈", "berry tart": "🥧",
  sunpetal: "🌼", bellbloom: "🔔", spritecap: "🍄",
  "sunfruit seeds": "🌱", "moonmelon seeds": "🌱",
  bucket: "🪣", "water bucket": "💧", lantern: "🏮", rope: "🪢"
};

var Objects = (function () {
  var scene = null;
  var objects = [];          // all records
  var byId = {};
  var regions = {};          // "rx,rz" -> { list: [], mesh }
  var dynamics = [];         // records with own meshes
  var regionGroup = null, dynamicGroup = null;
  var isleState = null;      // Store slice: { removed: {id:{at}}, springs: [...] }
  var REG = 24;
  var idCounter = 0;

  function rkey(x, z) { return Math.floor(x / REG) + "," + Math.floor(z / REG); }

  /* ============ visual builders (Geo merged geometry) ============ */
  var P = function () { return Terrain.def.palette; };

  function buildTree(g, o) {
    var s = o.scale, x = o.x, y = o.y, z = o.z;
    var trunk = 0x8a6540, isle = Terrain.def.id;
    if (isle === "frostspire") {
      g.cyl(0.32 * s, 0.22 * s, 1.2 * s, 5, trunk, { x: x, y: y, z: z }, 0.2, 0.3);
      g.cone(1.7 * s, 2.6 * s, 6, 0x3f7a4a, { x: x, y: y + 0.9 * s, z: z }, 0.25, 0.35);
      g.cone(1.35 * s, 2.2 * s, 6, 0x4d8a58, { x: x, y: y + 2.2 * s, z: z }, 0.25, 0.35);
      g.cone(0.95 * s, 1.8 * s, 5, 0x5c9c66, { x: x, y: y + 3.5 * s, z: z }, 0.25, 0.35);
      // snow dusting
      g.cone(0.55 * s, 0.8 * s, 5, 0xf4f8fc, { x: x, y: y + 4.6 * s, z: z }, 0.15, 0.3);
    } else if (isle === "ambershore") {
      // leaning palm with frond cones
      var lean = (Geo.hash(x * 3 + z) - 0.5) * 0.5;
      g.cyl(0.3 * s, 0.18 * s, 3.4 * s, 5, 0xa8815a, { x: x, y: y, z: z, rz: lean }, 0.2, 0.4);
      var tx = x - Math.sin(lean) * 3.2 * s, ty = y + Math.cos(lean) * 3.3 * s;
      for (var i = 0; i < 5; i++) {
        var a = (i / 5) * Math.PI * 2;
        g.cone(0.34 * s, 2.1 * s, 4, 0x5c9c50, { x: tx, y: ty, z: z, rz: Math.PI / 2.4 * Math.cos(a), rx: Math.PI / 2.4 * Math.sin(a) }, 0.3, 0);
      }
    } else if (isle === "mossveil" && o.variant === 1) {
      // giant bellcap fungus
      g.cyl(0.5 * s, 0.42 * s, 2.6 * s, 6, 0xeee6d2, { x: x, y: y, z: z }, 0.15, 0.25);
      g.blob(1.9 * s, 0x5ec2d6, { x: x, y: y + 2.2 * s, z: z, sy: 0.55 }, 0.25, 0.3);
      g.blob(0.35 * s, 0xeafcff, { x: x + 0.8 * s, y: y + 3.0 * s, z: z + 0.4 * s }, 0.1, 0.2);
    } else {
      // classic puff tree (meadow, mossveil, starfen rose)
      var leaf = isle === "starfen" ? 0xe07ab8 : (isle === "mossveil" ? 0x4d9440 : 0x59a848);
      var leaf2 = isle === "starfen" ? 0xf2a3d2 : (isle === "mossveil" ? 0x6fb35a : 0x6cbf58);
      g.cyl(0.36 * s, 0.24 * s, 2.1 * s, 5, isle === "starfen" ? 0x5c4a66 : trunk, { x: x, y: y, z: z }, 0.2, 0.35);
      g.blob(1.5 * s, leaf, { x: x, y: y + 1.9 * s, z: z }, 0.3, 0.4, 0.9);
      g.blob(1.0 * s, leaf2, { x: x + 0.9 * s, y: y + 2.5 * s, z: z + 0.3 * s }, 0.3, 0.4, 0.9);
      g.blob(0.85 * s, leaf2, { x: x - 0.8 * s, y: y + 2.7 * s, z: z - 0.4 * s }, 0.3, 0.4, 0.9);
    }
  }

  function buildDeadTree(g, o) {
    var x = o.x, y = o.y, z = o.z, s = o.scale;
    g.cyl(0.3 * s, 0.16 * s, 2.4 * s, 5, 0x6e6258, { x: x, y: y, z: z, rz: 0.12 }, 0.3, 0.5);
    g.cyl(0.1 * s, 0.04 * s, 1.3 * s, 4, 0x7d7268, { x: x + 0.2, y: y + 1.7 * s, z: z, rz: 0.9 }, 0.3, 0);
    g.cyl(0.1 * s, 0.04 * s, 1.1 * s, 4, 0x7d7268, { x: x - 0.15, y: y + 2.0 * s, z: z + 0.1, rz: -0.8 }, 0.3, 0);
  }

  function buildBramble(g, o) {
    var x = o.x, y = o.y, z = o.z, s = o.scale;
    for (var i = 0; i < 4; i++) {
      var a = i * 1.7 + x;
      g.cyl(0.08 * s, 0.02, 1.1 * s, 4, 0x5c5248, { x: x + Math.cos(a) * 0.4, y: y, z: z + Math.sin(a) * 0.4, rz: Math.cos(a) * 0.7, rx: Math.sin(a) * 0.7 }, 0.3, 0);
    }
    g.blob(0.55 * s, 0x4a4440, { x: x, y: y, z: z, sy: 0.6 }, 0.35, 0.6);
  }

  function buildRock(g, o) {
    var c = P().rock, x = o.x, y = o.y, z = o.z, s = o.scale;
    g.blob(1.1 * s, c, { x: x, y: y - 0.4 * s, z: z, sy: 0.75 }, 0.35, 0.55);
    g.blob(0.7 * s, c, { x: x + 0.8 * s, y: y - 0.2 * s, z: z + 0.3 * s, sy: 0.7 }, 0.35, 0.55);
    g.blob(0.5 * s, c, { x: x - 0.7 * s, y: y - 0.15 * s, z: z - 0.4 * s, sy: 0.8 }, 0.35, 0.55);
  }

  var ORE_COLORS = { emberstone: 0xe8863a, "skysteel ore": 0x9fc3e8, starstone: 0xffd75e };
  function buildOre(g, o) {
    buildRock(g, o);
    var c = ORE_COLORS[o.def.drops0] || 0xffffff;
    var x = o.x, y = o.y, z = o.z, s = o.scale;
    for (var i = 0; i < 4; i++) {
      var a = i * 1.9 + x * 0.7;
      g.cone(0.22 * s, 0.8 * s, 4, c,
        { x: x + Math.cos(a) * 0.7 * s, y: y + 0.25 * s, z: z + Math.sin(a) * 0.7 * s, rz: Math.cos(a) * 0.5, rx: Math.sin(a) * 0.5 }, 0.15, 0);
    }
  }

  function buildFlower(g, o) {
    var x = o.x, y = o.y, z = o.z;
    var col = o.variant === 1 ? 0x8a7ae8 : 0xffd430;
    var heart = o.variant === 1 ? 0xf2f2ff : 0xe88a1a;
    g.cyl(0.045, 0.03, 0.55, 4, 0x4f9c3c, { x: x, y: y, z: z }, 0.15, 0);
    g.blob(0.16, col, { x: x, y: y + 0.5, z: z, sy: 0.55 }, 0.2, 0.3);
    g.blob(0.06, heart, { x: x, y: y + 0.62, z: z }, 0.1, 0);
  }

  function buildBush(g, o) {
    var x = o.x, y = o.y, z = o.z, s = o.scale;
    g.blob(0.8 * s, 0x4d9440, { x: x, y: y - 0.15, z: z, sy: 0.75 }, 0.3, 0.4);
    g.blob(0.5 * s, 0x5ca84e, { x: x + 0.4 * s, y: y + 0.1, z: z + 0.2 * s, sy: 0.8 }, 0.3, 0.4);
    if (!o.picked) {
      for (var i = 0; i < 5; i++) {
        var a = i * 1.3 + x;
        g.blob(0.09, 0xe0393f, { x: x + Math.cos(a) * 0.55 * s, y: y + 0.35 + Math.sin(a * 2) * 0.2, z: z + Math.sin(a) * 0.5 * s }, 0.1, 0);
      }
    }
  }

  function buildCrystal(g, o) {
    var x = o.x, y = o.y, z = o.z, s = o.scale;
    var c = o.def.drops0 === "moonpearl" ? 0xe8d9f2 : (o.def.drops0 === "aurorium" ? 0x5ee8c4 : 0xb57ae0);
    g.cone(0.4 * s, 1.6 * s, 5, c, { x: x, y: y, z: z, rz: 0.1 }, 0.2, 0.2);
    g.cone(0.28 * s, 1.1 * s, 5, c, { x: x + 0.5 * s, y: y, z: z + 0.2 * s, rz: 0.35 }, 0.2, 0.2);
    g.cone(0.2 * s, 0.8 * s, 4, c, { x: x - 0.4 * s, y: y, z: z - 0.25 * s, rz: -0.3 }, 0.2, 0.2);
  }

  function buildGlowmoss(g, o) {
    g.blob(0.5 * o.scale, 0xc6e86b, { x: o.x, y: o.y - 0.15, z: o.z, sy: 0.35 }, 0.3, 0.4);
    g.blob(0.2, 0xf4ffca, { x: o.x + 0.2, y: o.y + 0.05, z: o.z, sy: 0.4 }, 0.2, 0);
  }

  function buildRuin(g, o) {
    var x = o.x, y = o.y, z = o.z, s = o.scale, c = 0xc0a284;
    g.cyl(0.5 * s, 0.42 * s, 2.2 * s, 6, c, { x: x, y: y, z: z, rz: 0.14 }, 0.3, 0.25);
    g.cyl(0.5 * s, 0.46 * s, 1.1 * s, 6, c, { x: x + 1.6 * s, y: y, z: z + 0.5 * s, rz: -0.1 }, 0.3, 0.25);
    g.box(1.4 * s, 0.35, 0.7, c, { x: x + 0.8 * s, y: y + 0.05, z: z - 0.9 * s, ry: 0.5 }, 0.3);
    g.blob(0.45 * s, 0x6fbc53, { x: x + 0.3, y: y + 2.1 * s, z: z, sy: 0.5 }, 0.3, 0.4);
  }

  function buildStump(g, o) {
    g.cyl(0.34 * o.scale, 0.3 * o.scale, 0.4, 5, 0x96714a, { x: o.x, y: o.y, z: o.z }, 0.2, 0.3);
  }

  function buildSpritecap(g, o) {
    g.cyl(0.09, 0.07, 0.4, 4, 0xeee6d2, { x: o.x, y: o.y, z: o.z }, 0.15, 0);
    g.blob(0.28, 0x5ec2d6, { x: o.x, y: o.y + 0.32, z: o.z, sy: 0.6 }, 0.2, 0.2);
  }

  /* ============ dynamic builders (individual meshes) ============ */
  function dynWonderstone(o) {
    var g = new Geo.Builder();
    g.box(0.9, 1.5, 0.42, 0x2c847e, { ry: 0.3 }, 0.15);
    g.box(0.55, 0.55, 0.1, 0x54c2b9, { x: 0, y: 0.5, z: 0.23, ry: 0.3 }, 0);
    g.blob(0.13, 0xeafff9, { x: 0, y: 0.72, z: 0.26 }, 0, 0);
    var mesh = g.build();
    var light = null;
    mesh.position.set(o.x, o.y + 0.35, o.z);
    o.anim = function (t) {
      mesh.position.y = o.y + 0.45 + Math.sin(t * 1.4 + o.x) * 0.15;
      mesh.rotation.y = t * 0.35 + o.x;
    };
    return mesh;
  }

  function dynChest(o) {
    var g = new Geo.Builder();
    g.box(1.1, 0.55, 0.75, 0x9a6b3d, {}, 0.2);
    g.box(1.14, 0.3, 0.79, 0x7e5530, { y: 0.55 }, 0.2);
    g.box(0.18, 0.34, 0.1, 0xf2ca55, { y: 0.34, z: 0.4 }, 0);
    g.box(1.14, 0.08, 0.83, 0xf2ca55, { y: 0.5 }, 0);
    var mesh = g.build();
    mesh.position.set(o.x, o.y, o.z);
    mesh.rotation.y = o.rot || 0;
    o.anim = function (t) { mesh.rotation.y = (o.rot || 0) + Math.sin(t * 0.8 + o.z) * 0.04; };
    return mesh;
  }

  function dynSpring(o) {
    var g = new Geo.Builder();
    var stone = o.zone.restored ? 0xd9e8f2 : 0x8a8078;
    // basin
    g.cyl(1.5, 1.7, 0.5, 8, stone, {}, 0.2, 0.15);
    g.cyl(1.2, 1.3, 0.22, 8, o.zone.restored ? 0x9fd9f2 : 0x6e685e, { y: 0.5 }, 0.15, 0);
    // central crystal
    g.cone(0.4, 1.8, 5, o.zone.restored ? 0xaef2ff : 0x77706a, { y: 0.55 }, 0.15, 0.1);
    var mesh = g.build();
    mesh.position.set(o.x, o.y, o.z);
    // light column when restored
    if (o.zone.restored) addSpringBeam(o, mesh);
    o.anim = function (t) {
      if (o.zone.restored && o.beam) {
        o.beam.material.opacity = 0.35 + Math.sin(t * 2.2) * 0.12;
        o.beam.rotation.y = t * 0.4;
      }
    };
    return mesh;
  }

  function addSpringBeam(o, mesh) {
    var geo = new THREE.CylinderGeometry(0.35, 0.6, 14, 8, 1, true);
    var mat = new THREE.MeshBasicMaterial({ color: 0xbff2ff, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false });
    o.beam = new THREE.Mesh(geo, mat);
    o.beam.position.y = 7.5;
    mesh.add(o.beam);
  }

  function dynDoor(o) {
    var g = new Geo.Builder();
    // rounded stone door in a rocky frame
    g.blob(2.1, P().rock, { sy: 0.9, y: -1.3 }, 0.35, 0.4);
    g.cyl(1.15, 1.0, 0.35, 8, 0x4a4052, { y: 0.15, rx: Math.PI / 2, z: 0.9 }, 0.2, 0);
    g.blob(0.2, 0x54c2b9, { y: 1.1, z: 1.05 }, 0, 0);
    var mesh = g.build();
    mesh.position.set(o.x, o.y, o.z);
    mesh.rotation.y = o.rot || 0;
    return mesh;
  }

  function dynExit(o) {
    var g = new Geo.Builder();
    g.cyl(1.1, 0.95, 0.3, 8, 0x8ed1f2, { rx: Math.PI / 2, z: 0 }, 0.1, 0);
    g.cyl(1.35, 1.2, 0.2, 8, 0x54c2b9, { rx: Math.PI / 2, z: -0.15 }, 0.15, 0);
    var mesh = g.build();
    mesh.position.set(o.x, o.y + 1.4, o.z);
    o.anim = function (t) { mesh.rotation.z = Math.sin(t) * 0.06; };
    return mesh;
  }

  function dynAnchor(o) {
    var g = new Geo.Builder();
    g.cyl(0.22, 0.16, 2.3, 6, 0x8a6540, {}, 0.2, 0.15);
    g.cyl(0.3, 0.3, 0.28, 6, 0xf2ca55, { y: 2.3 }, 0.1, 0);
    g.blob(0.18, 0xbff2ff, { y: 2.75 }, 0.1, 0);
    var mesh = g.build();
    mesh.position.set(o.x, o.y, o.z);
    o.anim = function (t) { mesh.children.length; };
    return mesh;
  }

  /* ============ the Skydock balloon ============
     A real basket you walk into up a ramp. Tap the balloon while aboard:
     with a Cloudcap it climbs high so the child can jump out and glide
     home; without one it does a little hop. It comes back down on its own
     as soon as the rider leaves. The deck is a moving platform the player
     stands on (see platformAt / riding). */
  var DECK_HW = 2.5, DECK_HL = 6.4;          // deck half-width / half-length
  var RAMP_Z0 = -10.6, RAMP_Z1 = -DECK_HL;   // ramp runs toward the dock (-z)

  function dynAirship(o) {
    var B = CONFIG.BALLOON;
    var g = new Geo.Builder();
    var deck = B.deck;
    // landing legs + hull under the deck
    g.cyl(2.4, 3.0, 1.2, 10, 0x96714a, { y: 0.35, sz: 2.2 }, 0.25, 0.1);
    g.cyl(3.0, 2.5, 0.9, 10, 0xa8815a, { y: 1.3, sz: 2.2 }, 0.25, 0.1);
    g.box(DECK_HW * 2 + 0.4, 0.3, DECK_HL * 2 + 0.2, 0xc59a63, { y: deck - 0.15 }, 0.2);
    // railings and the little cabin
    g.box(0.18, 0.8, DECK_HL * 2 - 0.4, 0x7c5a39, { x: -DECK_HW - 0.1, y: deck + 0.4 }, 0.2);
    g.box(0.18, 0.8, DECK_HL * 2 - 0.4, 0x7c5a39, { x: DECK_HW + 0.1, y: deck + 0.4 }, 0.2);
    g.box(DECK_HW * 2 + 0.4, 0.8, 0.18, 0x7c5a39, { y: deck + 0.4, z: DECK_HL + 0.05 }, 0.2);
    g.box(3.4, 2.2, 3.2, 0xb08c5c, { y: deck + 1.1, z: 3.2 }, 0.2);
    g.box(3.6, 0.5, 3.6, 0xe05e5e, { y: deck + 2.4, z: 3.2 }, 0.15);
    // the balloon
    g.blob(4.6, 0xe05e5e, { y: deck + 6.6, sz: 1.8, sy: 0.85 }, 0.2, 0.12);
    g.blob(4.62, 0xf2eee2, { y: deck + 6.55, sz: 1.75, sy: 0.8, sx: 0.35 }, 0.15, 0.1);
    for (var rr = -1; rr <= 1; rr += 2) {
      g.cyl(0.05, 0.05, 5.2, 3, 0x5e4429, { x: rr * 2.4, y: deck + 0.4, z: 4, rz: rr * 0.5 }, 0, 0);
      g.cyl(0.05, 0.05, 5.2, 3, 0x5e4429, { x: rr * 2.4, y: deck + 0.4, z: -1, rz: rr * 0.5 }, 0, 0);
    }
    var ship = g.build();
    // the boarding ramp is its own mesh: it stays on the ground when the ship flies
    var rg = new Geo.Builder();
    var rl = RAMP_Z1 - RAMP_Z0, rise = deck - 0.1;
    rg.box(2.6, 0.24, Math.hypot(rl, rise), 0xa8815a,
      { y: 0.1 + rise / 2, z: (RAMP_Z0 + RAMP_Z1) / 2, rx: -Math.atan2(rise, rl) }, 0.15);
    rg.cyl(0.14, 0.12, 0.9, 5, 0x7c5a39, { x: -1.4, y: 0, z: RAMP_Z0 + 0.6 }, 0.2, 0);
    rg.cyl(0.14, 0.12, 0.9, 5, 0x7c5a39, { x: 1.4, y: 0, z: RAMP_Z0 + 0.6 }, 0.2, 0);
    var ramp = rg.build();
    var mesh = new THREE.Group();
    mesh.add(ship, ramp);
    mesh.position.set(o.x, o.y, o.z);

    o.base = o.y;            // the ground it rests on
    o.lift = 0;              // how high it is right now
    o.dy = 0;                // this frame's vertical move (riders follow it)
    o.state = "docked";      // docked | rising | aloft | descending
    o.target = 0;
    o.away = 0;              // seconds the rider has been off the deck
    o.anim = function (t) {
      var bob = o.state === "aloft" ? Math.sin(t * 1.3) * 0.25 : 0;
      ship.position.y = o.lift + bob;
      ship.rotation.z = o.state === "docked" ? 0 : Math.sin(t * 0.9) * 0.02;
      ramp.position.y = -Math.min(o.lift, 0);
      ramp.visible = o.lift < 0.6;
    };
    o.update = function (dt) {
      dt = Math.min(dt, 0.05);   // same clamp as the player, or a stalled frame leaves the rider behind
      var prev = o.lift;
      var pos = window.Player ? Player.position : null;
      if (o.state === "rising") {
        o.lift = Math.min(o.target, o.lift + B.riseSpeed * dt);
        if (o.lift >= o.target) o.state = o.hop ? "descending" : "aloft";
      } else if (o.state === "descending") {
        o.lift = Math.max(0, o.lift - B.fallSpeed * dt);
        if (o.lift <= 0) { o.state = "docked"; o.hop = false; }
      }
      // the moment the rider leaves the basket, head home
      if ((o.state === "rising" || o.state === "aloft") && !o.hop) {
        if (pos && aboard(o, pos)) o.away = 0; else o.away += dt;
        if (o.away > 0.35) { o.state = "descending"; o.away = 0; }
      }
      o.dy = o.lift - prev;
      o.y = o.base + o.lift;   // raycast/prompt sphere follows the ship
    };
    return mesh;
  }

  function aboard(o, pos) {
    var dx = pos.x - o.x, dz = pos.z - o.z;
    var top = o.y + CONFIG.BALLOON.deck;
    // a little generous at the ramp lip: standing on the top step counts
    return Math.abs(dx) <= DECK_HW + 0.2 && Math.abs(dz) <= DECK_HL + 0.6 &&
           pos.y >= top - 0.6 && pos.y <= top + 2.2;
  }

  // deck (and, while docked, the ramp) as a walkable surface under (x, z)
  function airshipTop(o, x, z) {
    var dx = x - o.x, dz = z - o.z;
    var B = CONFIG.BALLOON;
    if (Math.abs(dx) <= DECK_HW + 0.15 && Math.abs(dz) <= DECK_HL + 0.15) return o.y + B.deck;
    if (o.lift < 0.6 && Math.abs(dx) <= 1.4 && dz >= RAMP_Z0 && dz < RAMP_Z1) {
      var t = (dz - RAMP_Z0) / (RAMP_Z1 - RAMP_Z0);
      return o.base + 0.1 + t * (B.deck - 0.1);
    }
    return -Infinity;
  }

  // tap on the balloon (from Game.handleSpecial)
  function airshipTap(o, pos, hasCloudcap) {
    var B = CONFIG.BALLOON;
    if (!aboard(o, pos)) {
      UI.toast("🎈 Walk up the ramp and hop into the basket first!");
      return;
    }
    if (o.state === "docked") {
      o.hop = !hasCloudcap;
      o.target = hasCloudcap ? B.height : B.hopHeight;
      o.state = "rising";
      o.away = 0;
      GameAudio.sfx.spark();
      if (hasCloudcap) {
        UI.toast("🎈 Up, up and away! At the top, jump out and hold ⬆️ to glide home!", 3800);
        GameAudio.say("Up, up and away!");
        var pl = Store.data.player;
        if (!pl.flownBalloon) {
          pl.flownBalloon = true;
          Game.grantXP(B.firstFlightXP);
          UI.gainPopup("🎈 First flight! +" + B.firstFlightXP + " light");
        }
      } else {
        UI.toast("🎈 The balloon bobs… With a 🪂 Cloudcap from the Tinker Bench it could carry you to the clouds!", 3800);
      }
      return;
    }
    if (o.state === "rising" || o.state === "aloft") {
      o.state = "descending";
      UI.toast("🎈 Coming back down…");
      return;
    }
    UI.toast("🎈 Landing…");
  }

  function airshipLabel(o, pos) {
    if (o.state === "docked") return aboard(o, pos) ? "tap the balloon to lift off!" : "climb the ramp and hop in!";
    if (o.state === "descending") return "coming in to land";
    return "jump and glide! (or tap to come down)";
  }

  /* ============ moving platforms (the balloon deck) ============ */
  function platformAt(x, z, maxTop) {
    var best = -Infinity, who = null;
    for (var i = 0; i < dynamics.length; i++) {
      var o = dynamics[i];
      if (o.gone || !o.def.platform) continue;
      var top = airshipTop(o, x, z);
      if (top > -Infinity && top <= maxTop && top > best) { best = top; who = o; }
    }
    return { top: best, obj: who };
  }
  // the platform a player at pos is standing on, if any
  function riding(pos) {
    var r = platformAt(pos.x, pos.z, pos.y + 0.3);
    if (!r.obj || pos.y - r.top > 0.3) return null;
    return r.obj;
  }

  /* ============ skydock showpiece ============ */
  function buildSkydock(g) {
    var cx = Terrain.CX, cz = Terrain.CZ;
    var deckY = Terrain.heightAt(cx, cz + 8) + 0.4;
    // long dock of planks
    for (var i = 0; i < 12; i++) {
      g.box(4.4, 0.28, 2.2, i % 2 ? 0xa8815a : 0x9c7852, { x: cx, y: deckY + 0.0, z: cz + 10 + i * 2.2 }, 0.15);
    }
    for (var pz = 0; pz < 12; pz += 3) {
      g.cyl(0.18, 0.14, 1.1, 5, 0x7c5a39, { x: cx - 2, y: deckY, z: cz + 10 + pz * 2.2 }, 0.2, 0);
      g.cyl(0.18, 0.14, 1.1, 5, 0x7c5a39, { x: cx + 2, y: deckY, z: cz + 10 + pz * 2.2 }, 0.2, 0);
    }
    // (the airship itself is a dynamic object — see dynAirship — so it can fly)
    // lookout tower by the dock
    var tx = cx + 10, tz = cz + 12, ty = Terrain.heightAt(tx, tz);
    g.cyl(1.4, 1.1, 7, 6, 0xc26a4a, { x: tx, y: ty, z: tz }, 0.25, 0.15);
    g.cyl(1.7, 1.5, 1.4, 6, 0xd9e8f2, { x: tx, y: ty + 7, z: tz }, 0.2, 0);
    g.cone(2.0, 1.8, 6, 0xe05e5e, { x: tx, y: ty + 8.4, z: tz }, 0.2, 0);
  }

  /* ============ type table ============ */
  var TYPES = {
    tree:      { name: "Puffwood Tree", icon: "🌳", taps: 3, drops: { timber: 2, leaves: 1 }, seedChance: 0.12,
                 solid: 0.55, rayR: 1.6, rayY: 2.2, regrow: 200, build: buildTree, tool: "hatchet", verb: "chop" },
    deadtree:  { name: "Withered Tree", icon: "🥀", taps: 2, drops: { timber: 1 }, solid: 0.4, rayR: 1.1, rayY: 1.6,
                 regrow: 240, build: buildDeadTree, tool: "hatchet", verb: "clear" },
    bramble:   { name: "Witherbramble", icon: "🕸️", taps: 2, drops: { timber: 1 }, rayR: 1.0, rayY: 0.6,
                 regrow: 240, build: buildBramble, verb: "clear" },
    rock:      { name: "Stone Outcrop", icon: "🪨", taps: 3, drops: { stone: 2 }, solid: 1.6, rayR: 1.6, rayY: 0.7,
                 regrow: 220, build: buildRock, tool: "mallet", verb: "quarry" },
    ember:     { name: "Emberstone Vein", icon: "🔥", taps: 3, drops: { emberstone: 2 }, drops0: "emberstone",
                 solid: 1.6, rayR: 1.6, rayY: 0.8, regrow: 260, build: buildOre, tool: "mallet", verb: "quarry" },
    skysteel:  { name: "Skysteel Vein", icon: "🔩", taps: 4, drops: { "skysteel ore": 2 }, drops0: "skysteel ore",
                 needTier: 1, solid: 1.6, rayR: 1.6, rayY: 0.8, regrow: 300, build: buildOre, tool: "mallet", verb: "quarry" },
    starstone: { name: "Starstone Vein", icon: "🌟", taps: 4, drops: { starstone: 1 }, drops0: "starstone",
                 needTier: 2, solid: 1.6, rayR: 1.6, rayY: 0.8, regrow: 340, build: buildOre, tool: "mallet", verb: "quarry" },
    flower:    { name: "Sunpetal", icon: "🌼", taps: 1, drops: { sunpetal: 1 }, rayR: 0.7, rayY: 0.4,
                 regrow: 150, build: buildFlower, verb: "pick" },
    flower2:   { name: "Bellbloom", icon: "🔔", taps: 1, drops: { bellbloom: 1 }, rayR: 0.7, rayY: 0.4,
                 regrow: 150, build: buildFlower, verb: "pick" },
    spritecap: { name: "Spritecap", icon: "🍄", taps: 1, drops: { spritecap: 1 }, rayR: 0.7, rayY: 0.3,
                 regrow: 150, build: buildSpritecap, verb: "pick" },
    bush:      { name: "Berry Bush", icon: "🫐", taps: 1, drops: { berries: 3 }, seedChance: 0.25,
                 rayR: 1.1, rayY: 0.5, regrow: 80, build: buildBush, verb: "pick", keepAsPicked: true },
    glowmoss:  { name: "Glowmoss", icon: "✨", taps: 1, drops: { glowmoss: 1 }, rayR: 0.8, rayY: 0.3,
                 regrow: 160, build: buildGlowmoss, verb: "gather" },
    crystal:   { name: "Glimmer Crystal", icon: "🔮", taps: 2, drops: { glimmer: 1 }, drops0: "glimmer",
                 needTier: 1, solid: 0.5, rayR: 1.2, rayY: 0.9, regrow: 280, build: buildCrystal, tool: "mallet", verb: "quarry" },
    moonpearl: { name: "Moonpearl Node", icon: "🌙", taps: 3, drops: { moonpearl: 1 }, drops0: "moonpearl",
                 needTier: 2, solid: 0.5, rayR: 1.2, rayY: 0.9, regrow: 300, build: buildCrystal, tool: "mallet", verb: "quarry" },
    aurorium:  { name: "Aurorium Node", icon: "🌈", taps: 4, drops: { aurorium: 1 }, drops0: "aurorium",
                 needTier: 2, solid: 0.5, rayR: 1.2, rayY: 0.9, regrow: 380, build: buildCrystal, tool: "mallet", verb: "quarry" },
    ruin:      { name: "Old Ruin", icon: "🏛️", taps: 4, drops: { claybrick: 3 }, glassChance: 0.4,
                 solid: 0.9, rayR: 1.9, rayY: 1.2, regrow: 320, build: buildRuin, verb: "salvage" },
    stump:     { name: "Stump", icon: "🪵", taps: 1, drops: { timber: 1 }, rayR: 0.7, rayY: 0.3,
                 regrow: 200, build: buildStump, verb: "clear" },

    /* dynamic types */
    wonderstone: { name: "Wonderstone", icon: "🔮", dynamic: dynWonderstone, rayR: 1.3, rayY: 1.0, special: "wonderstone", regrow: 240 },
    chest:       { name: "Curio Chest", icon: "🧰", dynamic: dynChest, rayR: 1.2, rayY: 0.5, special: "chest", regrow: 420 },
    spring:      { name: "Lightspring", icon: "⛲", dynamic: dynSpring, rayR: 2.2, rayY: 1.0, special: "spring", solid: 1.6 },
    grottodoor:  { name: "Sealed Grotto", icon: "🚪", dynamic: dynDoor, rayR: 2.0, rayY: 1.0, special: "grottodoor", solid: 1.4 },
    grottoexit:  { name: "Way Out", icon: "🌤️", dynamic: dynExit, rayR: 1.6, rayY: 1.4, special: "grottoexit" },
    anchor:      { name: "Bridge Anchor", icon: "🪢", dynamic: dynAnchor, rayR: 1.2, rayY: 1.5, special: "anchor" },
    airship:     { name: "Sky Balloon", icon: "🎈", dynamic: dynAirship, rayR: 6.0, rayY: 6.5, special: "airship", platform: true }
  };

  /* ============ placement ============ */
  function seededRng(tag) {
    var s = 0;
    var str = Terrain.def.id + tag;
    for (var i = 0; i < str.length; i++) s = (s * 31 + str.charCodeAt(i)) | 0;
    return function () {
      s = (s * 16807) % 2147483647;
      if (s <= 0) s += 2147483646;
      return (s - 1) / 2147483646;
    };
  }

  function add(type, x, z, opts) {
    opts = opts || {};
    var def = TYPES[type];
    var y = opts.y !== undefined ? opts.y : Terrain.heightAt(x, z);
    if (y < -100) return null;
    var o = {
      id: opts.id || ("o" + (idCounter++)),
      type: type, def: def, x: x, y: y, z: z,
      rot: opts.rot || 0, scale: opts.scale || (0.85 + Geo.hash(x * 7 + z * 3) * 0.4),
      hp: def.taps, gone: false, zone: opts.zone || null,
      variant: opts.variant || 0, grotto: !!opts.grotto
    };
    objects.push(o);
    byId[o.id] = o;
    if (def.dynamic) {
      o.mesh = def.dynamic(o);
      o.mesh.visible = !o.grotto;
      dynamicGroup.add(o.mesh);
      dynamics.push(o);
    } else {
      var key = rkey(x, z);
      if (!regions[key]) regions[key] = { list: [], mesh: null };
      regions[key].list.push(o);
      o.region = key;
    }
    return o;
  }

  function scatter(type, count, rng, opts) {
    opts = opts || {};
    var placed = 0, guard = 0;
    while (placed < count && guard++ < count * 30) {
      var x = 4 + rng() * (Terrain.SX - 8);
      var z = 4 + rng() * (Terrain.SZ - 8);
      var h = Terrain.heightAt(x, z);
      if (h < -100) continue;
      if (Terrain.def.water > 0 && h < Terrain.def.water + 0.5) continue;
      if (Terrain.slopeAt(x, z) > (opts.maxSlope || 0.8)) continue;
      var zone = Terrain.zoneAt(x, z);
      if (opts.avoidZones && zone && !zone.restored) continue;
      // keep the arrival meadow clear — nothing spawns on top of the player
      if (Math.hypot(x - Terrain.CX, z - Terrain.CZ) < 9) continue;
      // on the Skydock, keep the dock and the balloon's berth (deck + ramp) clear
      if (Terrain.def.id === "skydock") {
        var sx = x - Terrain.CX, sz = z - Terrain.CZ;
        if (Math.abs(sx) < 4 && sz > 7 && sz < 37) continue;          // the dock planks
        if (Math.abs(sx) < 6.5 && sz > 42 - 13 && sz < 42 + 9) continue; // the airship and its ramp
      }
      // keep some clear space between solid things
      if (TYPES[type].solid && tooClose(x, z, 2.4)) continue;
      var o = add(type, x, z, { zone: zone, variant: opts.variant !== undefined ? opts.variant : (rng() < 0.5 ? 1 : 0) });
      if (o && zone && !zone.restored && opts.witherInZone) {
        // convert to the withered counterpart
        o.type = opts.witherInZone; o.def = TYPES[o.type];
        o.hp = o.def.taps;
      }
      if (o) placed++;
    }
  }

  function tooClose(x, z, d) {
    var key = rkey(x, z);
    var r = regions[key];
    if (!r) return false;
    for (var i = 0; i < r.list.length; i++) {
      var o = r.list[i];
      if (!o.gone && o.def.solid && Math.hypot(o.x - x, o.z - z) < d) return true;
    }
    return false;
  }

  function populate(def, state) {
    isleState = state;
    // clear
    if (regionGroup) scene.remove(regionGroup);
    if (dynamicGroup) scene.remove(dynamicGroup);
    regionGroup = new THREE.Group();
    dynamicGroup = new THREE.Group();
    scene.add(regionGroup, dynamicGroup);
    objects = []; byId = {}; regions = {}; dynamics = [];
    idCounter = 0;

    var rng = seededRng("obj");
    var isle = def.id;

    if (isle === "skydock") {
      var g = new Geo.Builder();
      buildSkydock(g);
      regionGroup.add(g.build());
      add("airship", Terrain.CX, Terrain.CZ + 42, {});
      scatter("tree", 14, rng, {}); scatter("flower", 16, rng, { variant: 0 });
      scatter("rock", 6, rng, {});
      scatter("wonderstone", 2, rng, {}); scatter("chest", 1, rng, {});
    } else {
      scatter("tree", isle === "ambershore" ? 26 : 54, rng, { witherInZone: "deadtree" });
      scatter("rock", 24, rng, {});
      scatter("ember", 10, rng, {});
      scatter("skysteel", 7, rng, {});
      scatter("starstone", 4, rng, {});
      scatter("flower", isle === "starfen" ? 14 : 30, rng, { variant: 0, witherInZone: "bramble" });
      scatter("flower2", 14, rng, { variant: 1, witherInZone: "bramble" });
      if (isle === "mossveil") scatter("spritecap", 22, rng, {});
      if (isle !== "ambershore" && isle !== "starfen") scatter("bush", 12, rng, { avoidZones: true });
      scatter("ruin", isle === "ambershore" ? 9 : 4, rng, {});
      if (isle === "starfen") { scatter("crystal", 16, rng, {}); scatter("glowmoss", 14, rng, {}); }
      scatter("wonderstone", 8, rng, {});
      scatter("chest", 5, rng, {});

      // lightsprings
      Terrain.zones.forEach(function (zn) {
        add("spring", zn.x, zn.z, { id: zn.id, zone: zn });
      });

      // sealed grotto door on a cliff
      var spot = Terrain.grottoDoorSpot();
      add("grottodoor", spot.x, spot.z, { id: "grottodoor", rot: Math.atan2(Terrain.CX - spot.x, Terrain.CZ - spot.z) });

      // grotto interior objects
      var gr = Terrain.grotto;
      add("grottoexit", gr.x, gr.z - gr.r + 2.5, { id: "grottoexit", grotto: true, y: gr.floor });
      var grng = seededRng("grotto");
      for (var gi = 0; gi < 5; gi++) {
        var ga = grng() * Math.PI * 2, gd = 3 + grng() * (gr.r - 6);
        add(gi < 3 ? "moonpearl" : "aurorium", gr.x + Math.cos(ga) * gd, gr.z + Math.sin(ga) * gd,
          { grotto: true, y: null, zone: null, id: "gc" + gi, scale: 1 + grng() * 0.5 });
      }
      for (var gm = 0; gm < 6; gm++) {
        var gma = grng() * Math.PI * 2, gmd = 2 + grng() * (gr.r - 5);
        add("glowmoss", gr.x + Math.cos(gma) * gmd, gr.z + Math.sin(gma) * gmd, { grotto: true, id: "gm" + gm });
      }
      for (var gw = 0; gw < 3; gw++) {
        var gwa = grng() * Math.PI * 2, gwd = 4 + grng() * (gr.r - 7);
        add("wonderstone", gr.x + Math.cos(gwa) * gwd, gr.z + Math.sin(gwa) * gwd, { grotto: true, id: "gw" + gw });
      }
      add("chest", gr.x + 4, gr.z + 4, { grotto: true, id: "gchest" });

      // bridge anchors toward each islet
      Terrain.islets.forEach(function (it, idx) {
        var dx = it.x - Terrain.CX, dz = it.z - Terrain.CZ;
        var len = Math.hypot(dx, dz);
        // rim point on main island toward the islet
        for (var t = 0.95; t > 0.3; t -= 0.02) {
          var ax = Terrain.CX + dx * MAINRIMT(len) * t, az = Terrain.CZ + dz * MAINRIMT(len) * t;
          var hh = Terrain.heightAt(ax, az);
          if (hh > -100 && Terrain.slopeAt(ax, az) < 1.2) {
            var oA = add("anchor", ax, az, { id: "anchorA" + idx });
            if (oA) { oA.islet = it; break; }
          }
        }
        var g2 = Terrain.groundNear(it.x, it.z);
        var oB = add("anchor", g2.x, g2.z, { id: "anchorB" + idx });
        if (oB) oB.islet = it;
      });
    }
    function MAINRIMT(len) { return (MAIN_RADIUS() - 4) / len; }

    // keep the ground clear around doors and bridge anchors
    dynamics.forEach(function (d) {
      if (d.type !== "anchor" && d.type !== "grottodoor" && d.type !== "spring") return;
      Object.keys(regions).forEach(function (key) {
        regions[key].list.forEach(function (o) {
          if (!o.gone && o.def.solid && Math.hypot(o.x - d.x, o.z - d.z) < 4) o.gone = true;
        });
      });
    });

    // grotto interior objects need grotto heights
    objects.forEach(function (o) {
      if (o.grotto && o.y === null || (o.grotto && o.y < -900)) o.y = 0;
    });
    fixGrottoHeights();

    // apply saved removals (still-regrowing things stay gone)
    var removed = (state && state.removed) || {};
    var now = Date.now();
    Object.keys(removed).forEach(function (id) {
      var o = byId[id];
      if (!o) return;
      var rec = removed[id];
      var regrowMs = (o.def.regrow || 240) * 1000;
      if (now - rec.at < regrowMs) {
        o.gone = true;
        if (o.mesh) o.mesh.visible = false;
      } else {
        delete removed[id];
      }
    });

    rebuildAllRegions();
  }
  function MAIN_RADIUS() { return 54; }

  function fixGrottoHeights() {
    var gr = Terrain.grotto;
    objects.forEach(function (o) {
      if (!o.grotto) return;
      var dx = o.x - gr.x, dz = o.z - gr.z;
      var d = Math.sqrt(dx * dx + dz * dz);
      o.y = gr.floor + Math.pow(Math.min(1, d / gr.r), 3) * 2.2;
      if (o.mesh) o.mesh.position.y = o.type === "grottoexit" ? o.y + 1.4 : o.y;
    });
  }

  /* ============ region meshes ============ */
  function rebuildRegion(key) {
    var r = regions[key];
    if (!r) return;
    if (r.mesh) { regionGroup.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh = null; }
    var g = new Geo.Builder();
    var any = false;
    r.list.forEach(function (o) {
      if (o.gone || o.grotto) return;
      o.def.build(g, o);
      any = true;
    });
    // grotto statics get their own build pass into the same region mesh but
    // hidden/shown with the grotto — simpler: grotto statics are dynamic-lite,
    // rebuilt into grottoStaticMesh below.
    if (any) {
      r.mesh = g.build();
      regionGroup.add(r.mesh);
    }
  }

  var grottoStaticMesh = null;
  function rebuildGrottoStatics() {
    if (grottoStaticMesh) { dynamicGroup.remove(grottoStaticMesh); grottoStaticMesh.geometry.dispose(); grottoStaticMesh = null; }
    var g = new Geo.Builder();
    var any = false;
    objects.forEach(function (o) {
      if (!o.grotto || o.gone || o.def.dynamic) return;
      o.def.build(g, o);
      any = true;
    });
    if (any) {
      grottoStaticMesh = g.build();
      grottoStaticMesh.visible = Terrain.inGrotto;
      dynamicGroup.add(grottoStaticMesh);
    }
  }

  function rebuildAllRegions() {
    Object.keys(regions).forEach(rebuildRegion);
    rebuildGrottoStatics();
  }

  // called when entering/leaving the grotto: swap what is visible
  function setGrottoVisibility(inside) {
    if (regionGroup) regionGroup.visible = !inside;
    if (grottoStaticMesh) grottoStaticMesh.visible = inside;
    dynamics.forEach(function (o) {
      if (o.mesh) o.mesh.visible = o.gone ? false : (o.grotto === inside);
    });
  }

  /* ============ interaction ============ */
  var _o = new THREE.Vector3(), _d = new THREE.Vector3(), _c = new THREE.Vector3();
  function raycast(origin, dir, maxDist) {
    var best = null;
    var inside = Terrain.inGrotto;
    for (var i = 0; i < objects.length; i++) {
      var o = objects[i];
      if (o.gone || o.grotto !== inside) continue;
      _c.set(o.x - origin.x, o.y + o.def.rayY - origin.y, o.z - origin.z);
      var t = _c.dot(dir);
      if (t < 0 || t > maxDist) continue;
      var px = origin.x + dir.x * t, py = origin.y + dir.y * t, pz = origin.z + dir.z * t;
      var dd = Math.hypot(px - o.x, py - (o.y + o.def.rayY), pz - o.z);
      if (dd < o.def.rayR * Math.max(1, o.scale)) {
        if (!best || t < best.dist) best = { obj: o, dist: t };
      }
    }
    return best;
  }

  // one gather tap; returns { done, drops, blocked }
  function hit(o, ctx) {
    var def = o.def;
    if (def.needTier && ctx.toolTier < def.needTier) return { blocked: "tier" };
    var power = 1;
    if (def.tool === "hatchet" && ctx.tools.hatchet) power = 2;
    if (def.tool === "mallet") power = 1 + ctx.toolTier * 0.5 + (ctx.tools.sunhammer ? 1 : 0);
    o.hp -= power;
    if (o.hp > -0.01 && o.hp < 0.5) o.hp = 0;
    if (o.hp <= 0) {
      var drops = {};
      Object.keys(def.drops || {}).forEach(function (k) { drops[k] = def.drops[k]; });
      if (def.seedChance && Math.random() < def.seedChance) {
        drops[Math.random() < 0.6 ? "sunfruit seeds" : "moonmelon seeds"] = 1;
      }
      if (def.glassChance && Math.random() < def.glassChance) drops.glass = 1;
      remove(o);
      // trees leave a stump for a while
      if (o.type === "tree" && Math.random() < 0.7) {
        var st = add("stump", o.x, o.z, { zone: o.zone });
        if (st) rebuildRegion(st.region);
      }
      return { done: true, drops: drops };
    }
    return { done: false };
  }

  function remove(o) {
    o.gone = true;
    if (!isleState.removed) isleState.removed = {};
    isleState.removed[o.id] = { at: Date.now() };
    Store.save();
    if (o.mesh) o.mesh.visible = false;
    else if (o.grotto) rebuildGrottoStatics();
    else if (o.region) rebuildRegion(o.region);
  }

  /* ============ zone revival ============ */
  function reviveZone(zone) {
    var touched = {};
    objects.forEach(function (o) {
      if (!o.zone || o.zone.id !== zone.id) return;
      if (o.type === "deadtree") { o.type = "tree"; o.def = TYPES.tree; o.hp = o.def.taps; }
      if (o.type === "bramble") {
        o.type = Math.random() < 0.5 ? "flower" : "flower2";
        o.variant = o.type === "flower2" ? 1 : 0;
        o.def = TYPES[o.type]; o.hp = o.def.taps;
      }
      if (o.region) touched[o.region] = true;
    });
    // celebration flowers pop up around the spring
    for (var i = 0; i < 8; i++) {
      var a = (i / 8) * Math.PI * 2;
      var o2 = add(i % 2 ? "flower" : "flower2", zone.x + Math.cos(a) * (3 + i % 3), zone.z + Math.sin(a) * (3 + i % 3),
        { variant: i % 2, zone: zone });
      if (o2) touched[o2.region] = true;
    }
    Object.keys(touched).forEach(rebuildRegion);
    // relight the spring model
    var sp = byId[zone.id];
    if (sp && sp.mesh) {
      dynamicGroup.remove(sp.mesh);
      dynamics.splice(dynamics.indexOf(sp), 1);
      sp.mesh = TYPES.spring.dynamic(sp);
      dynamicGroup.add(sp.mesh);
      dynamics.push(sp);
    }
  }

  /* ============ regrow + animation ============ */
  var regrowTimer = 0;
  function tick(dt, tSec) {
    for (var i = 0; i < dynamics.length; i++) {
      if (dynamics[i].gone) continue;
      if (dynamics[i].update) dynamics[i].update(dt);
      if (dynamics[i].anim) dynamics[i].anim(tSec);
    }
    regrowTimer += dt;
    if (regrowTimer < 5) return;
    regrowTimer = 0;
    var removed = isleState.removed || {};
    var now = Date.now();
    var touched = {};
    Object.keys(removed).forEach(function (id) {
      var o = byId[id];
      if (!o) { delete removed[id]; return; }
      if (now - removed[id].at > (o.def.regrow || 240) * 1000) {
        delete removed[id];
        o.gone = false;
        o.hp = o.def.taps;
        if (o.mesh) o.mesh.visible = o.grotto === Terrain.inGrotto;
        else if (o.grotto) rebuildGrottoStatics();
        else if (o.region) touched[o.region] = true;
      }
    });
    Object.keys(touched).forEach(rebuildRegion);
  }

  /* ============ collision ============ */
  function collidersNear(x, z) {
    var out = [];
    var inside = Terrain.inGrotto;
    for (var rx = -1; rx <= 1; rx++) for (var rz = -1; rz <= 1; rz++) {
      var key = (Math.floor(x / REG) + rx) + "," + (Math.floor(z / REG) + rz);
      var r = regions[key];
      if (!r) continue;
      for (var i = 0; i < r.list.length; i++) {
        var o = r.list[i];
        if (o.gone || !o.def.solid || o.grotto !== inside) continue;
        out.push({ x: o.x, z: o.z, r: o.def.solid * Math.max(0.8, o.scale) });
      }
    }
    // solid dynamics (springs, doors)
    for (var d = 0; d < dynamics.length; d++) {
      var od = dynamics[d];
      if (od.gone || !od.def.solid || od.grotto !== inside) continue;
      if (Math.abs(od.x - x) < 6 && Math.abs(od.z - z) < 6) {
        out.push({ x: od.x, z: od.z, r: od.def.solid });
      }
    }
    return out;
  }

  function dynamicByType(type) {
    return dynamics.filter(function (o) { return o.type === type && !o.gone; });
  }

  function init(sc) { scene = sc; }

  return {
    init: init, populate: populate, tick: tick,
    raycast: raycast, hit: hit, remove: remove, reviveZone: reviveZone,
    collidersNear: collidersNear, dynamicByType: dynamicByType,
    platformAt: platformAt, riding: riding, aboard: aboard, airshipTap: airshipTap, airshipLabel: airshipLabel,
    setGrottoVisibility: setGrottoVisibility,
    byId: function (id) { return byId[id]; },
    TYPES: TYPES
  };
})();
