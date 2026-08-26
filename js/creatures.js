"use strict";
/* ============================================================
   CREATURES — the friendly wildlife of the isles. Playing
   chase with a creature (a few taps) makes it happily drop a
   gift, then it scampers off to play elsewhere. Nothing is
   ever hurt. The brush tool collects fluff from tuftles
   without the chase.
   - tuftle:     round moss-backed hopper  -> fluff
   - puffbird:   plump little bird         -> feathers
   - shellhopper: skipping shell-backed pal -> shells
   - glowmoth:   drifting light-moth       -> glowdust
   ============================================================ */
var Creatures = (function () {
  var scene = null;
  var creatures = [];
  var respawnTimer = 0;

  var TYPES = {
    tuftle:     { taps: 2, gifts: { fluff: 2 },    emoji: "🐢", cheer: "The tuftle purrs and gifts you fluff!" },
    puffbird:   { taps: 1, gifts: { feather: 2 },  emoji: "🐦", cheer: "The puffbird shakes out two feathers for you!" },
    shellhopper: { taps: 3, gifts: { shell: 2, berries: 1 }, emoji: "🐚", cheer: "The shellhopper leaves shiny shells behind!" },
    glowmoth:   { taps: 2, gifts: { glowdust: 2 }, emoji: "✨", cheer: "The glowmoth sprinkles glowdust as it twirls!" }
  };

  function buildCreature(type) {
    var g = new THREE.Group();
    var b = new Geo.Builder();
    var extra = {};
    var DARK = 0x2b2b2b;
    if (type === "tuftle") {
      b.blob(0.26, 0xd9b88a, { y: 0.1, sz: 1.3, sy: 0.85 }, 0.12, 0.12);        // body
      b.blob(0.24, 0x6fbc53, { y: 0.28, sz: 1.1, sy: 0.6 }, 0.15, 0.25);        // mossy shell
      b.blob(0.07, 0x8fd672, { y: 0.42, x: 0.05 }, 0.1, 0.2);                    // sprout
      b.blob(0.12, 0xd9b88a, { y: 0.18, z: 0.32 }, 0.1, 0);                      // head
      b.blob(0.024, DARK, { x: -0.05, y: 0.22, z: 0.42 }, 0, 0);
      b.blob(0.024, DARK, { x: 0.05, y: 0.22, z: 0.42 }, 0, 0);
      for (var i = 0; i < 4; i++) {
        b.cyl(0.04, 0.035, 0.1, 4, 0xc0a274, { x: (i % 2 ? 0.11 : -0.11), z: (i < 2 ? 0.14 : -0.14) }, 0, 0);
      }
    } else if (type === "puffbird") {
      b.blob(0.2, 0xf2c9d8, { y: 0.22, sy: 1.1 }, 0.12, 0.15);                   // puffball body
      b.blob(0.13, 0xfbeff4, { y: 0.16, z: 0.1 }, 0.1, 0.1);                     // belly
      b.blob(0.12, 0xf2c9d8, { y: 0.47, z: 0.1 }, 0.1, 0.1);                     // head
      b.cone(0.045, 0.1, 4, 0xe8a23a, { y: 0.46, z: 0.22, rx: Math.PI / 2 }, 0, 0);
      b.blob(0.025, DARK, { x: -0.05, y: 0.51, z: 0.19 }, 0, 0);
      b.blob(0.025, DARK, { x: 0.05, y: 0.51, z: 0.19 }, 0, 0);
      b.blob(0.08, 0xe8b2c8, { x: -0.19, y: 0.26, sy: 1.4, sz: 0.7 }, 0.1, 0);   // wings
      b.blob(0.08, 0xe8b2c8, { x: 0.19, y: 0.26, sy: 1.4, sz: 0.7 }, 0.1, 0);
      b.cyl(0.02, 0.02, 0.1, 3, 0xe8a23a, { x: -0.05 }, 0, 0);
      b.cyl(0.02, 0.02, 0.1, 3, 0xe8a23a, { x: 0.05 }, 0, 0);
    } else if (type === "shellhopper") {
      b.blob(0.24, 0x7ac0d9, { y: 0.26, sy: 0.95 }, 0.12, 0.15);                 // shell
      b.blob(0.12, 0xd9f2fb, { y: 0.42, sy: 0.6 }, 0.1, 0.15);                   // swirl top
      b.blob(0.14, 0xe8cfa5, { y: 0.12, z: 0.22, sy: 0.8 }, 0.1, 0.1);           // body/head
      b.blob(0.024, DARK, { x: -0.05, y: 0.18, z: 0.33 }, 0, 0);
      b.blob(0.024, DARK, { x: 0.05, y: 0.18, z: 0.33 }, 0, 0);
      b.cyl(0.035, 0.03, 0.1, 4, 0xd9b88a, { x: -0.07, z: 0.14 }, 0, 0);
      b.cyl(0.035, 0.03, 0.1, 4, 0xd9b88a, { x: 0.07, z: 0.14 }, 0, 0);
    } else { // glowmoth
      b.blob(0.07, 0x8a7ae8, { y: 0.34, sy: 1.8 }, 0.1, 0.1);                    // body
      b.blob(0.06, 0xfff3c4, { y: 0.18 }, 0, 0);                                  // glow lamp
      b.blob(0.02, DARK, { x: -0.03, y: 0.48, z: 0.05 }, 0, 0);
      b.blob(0.02, DARK, { x: 0.03, y: 0.48, z: 0.05 }, 0, 0);
      extra.flies = true;
    }
    g.add(b.build());
    if (type === "glowmoth") {
      // wings as separate little meshes so they can flap
      function wing(sx) {
        var wb = new Geo.Builder();
        wb.blob(0.14, 0xd9c2f2, { x: sx * 0.13, sy: 0.5, sx: 1.6 }, 0.1, 0.1);
        var m = wb.build();
        m.position.set(0, 0.42, 0);
        g.add(m);
        return m;
      }
      extra.wingL = wing(-1);
      extra.wingR = wing(1);
    }
    var hit = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 1.1, 1.1),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.position.set(0, 0.45, 0);
    g.add(hit);
    return { group: g, hitbox: hit, extra: extra };
  }

  function groundY(x, z) {
    var y = Terrain.heightAt(x, z);
    return y > -100 ? y : -1;
  }

  function isGoodSpot(x, z) {
    var y = Terrain.heightAt(x, z);
    if (y < -100) return false;
    if (Terrain.def.water > 0 && y < Terrain.def.water + 0.3) return false;
    return Terrain.slopeAt(x, z) < 1.0;
  }

  var spawnCounter = 0;
  function spawnOne() {
    var names = Object.keys(TYPES);
    var type = names[spawnCounter++ % names.length];
    var x, z, tries = 0;
    do {
      x = 12 + Math.random() * (Terrain.SX - 24);
      z = 12 + Math.random() * (Terrain.SZ - 24);
      tries++;
    } while (!isGoodSpot(x, z) && tries < 20);
    if (!isGoodSpot(x, z)) return;
    var model = buildCreature(type);
    var a = {
      type: type, def: TYPES[type], group: model.group, hitbox: model.hitbox,
      extra: model.extra, tapsLeft: TYPES[type].taps,
      home: { x: x, z: z }, target: null, moveT: Math.random() * 3,
      faceYaw: Math.random() * Math.PI * 2, speed: 0.8, fleeUntil: 0, bobSeed: Math.random() * 10
    };
    model.hitbox.userData.creature = a;
    a.group.position.set(x, groundY(x, z), z);
    scene.add(a.group);
    creatures.push(a);
  }

  function init(sc) { scene = sc; }

  function populate() {
    creatures.forEach(function (a) { scene.remove(a.group); });
    creatures = [];
    for (var i = 0; i < CONFIG.WORLD.creatureMax; i++) spawnOne();
  }

  function update(dt, playerPos) {
    respawnTimer += dt;
    if (respawnTimer > CONFIG.WORLD.creatureRespawnSec && creatures.length < CONFIG.WORLD.creatureMax) {
      respawnTimer = 0;
      spawnOne();
    }
    var now = performance.now();
    var t = now / 1000;
    creatures.forEach(function (a) {
      var g = a.group;
      var fleeing = now < a.fleeUntil;
      a.moveT -= dt;
      if (a.moveT <= 0 && !fleeing) {
        a.moveT = 3 + Math.random() * 5;
        a.target = {
          x: Math.max(3, Math.min(Terrain.SX - 3, a.home.x + (Math.random() * 10 - 5))),
          z: Math.max(3, Math.min(Terrain.SX - 3, a.home.z + (Math.random() * 10 - 5)))
        };
      }
      if (a.target) {
        var tx = a.target.x - g.position.x, tz = a.target.z - g.position.z;
        var dist = Math.hypot(tx, tz);
        if (dist > 0.4) {
          var speed = fleeing ? 3.6 : a.speed;
          var step = Math.min(dist, dt * speed);
          var nx = g.position.x + (tx / dist) * step;
          var nz = g.position.z + (tz / dist) * step;
          if (isGoodSpot(nx, nz)) {
            var gy = groundY(nx, nz);
            g.position.set(nx, gy, nz);
          } else { a.target = null; }
          a.faceYaw = Math.atan2(tx, tz);
        }
      }
      // glowmoths hover and flutter
      if (a.extra.flies) {
        g.position.y = groundY(g.position.x, g.position.z) + 1.2 + Math.sin(t * 2 + a.bobSeed) * 0.4;
        var flap = Math.sin(t * 14 + a.bobSeed) * 0.6;
        if (a.extra.wingL) { a.extra.wingL.rotation.z = flap; a.extra.wingR.rotation.z = -flap; }
      } else if (a.type === "tuftle" || a.type === "shellhopper") {
        // little hops while moving
        var moving = a.target && Math.hypot(a.target.x - g.position.x, a.target.z - g.position.z) > 0.5;
        if (moving) g.position.y = groundY(g.position.x, g.position.z) + Math.abs(Math.sin(t * 6 + a.bobSeed)) * 0.18;
      }
      g.rotation.y += (a.faceYaw - g.rotation.y) * Math.min(1, dt * 8);
    });
  }

  // play with a creature: it scampers; after enough taps it leaves a gift
  function playWith(a, playerPos) {
    // the brush collects tuftle fluff instantly, no chase needed
    if (a.type === "tuftle" && Store.data.player.tools.brush && !a.brushed) {
      a.brushed = true;
      GameAudio.sfx.pop();
      Game.grantItem("fluff", 2);
      Game.grantXP(2);
      UI.toast("🖌️ Brush brush! +2 fluff — the tuftle loves it!", 2600);
      a.fleeUntil = performance.now() + 1400;
      setTimeout(function () { a.brushed = false; }, 45000);
      return;
    }

    a.tapsLeft -= 1;
    GameAudio.sfx.chirp();
    // scamper away from the player — the chase is the game
    var dx = a.group.position.x - playerPos.x, dz = a.group.position.z - playerPos.z;
    var len = Math.hypot(dx, dz) || 1;
    a.target = {
      x: Math.max(3, Math.min(Terrain.SX - 3, a.group.position.x + (dx / len) * 9 + (Math.random() * 4 - 2))),
      z: Math.max(3, Math.min(Terrain.SX - 3, a.group.position.z + (dz / len) * 9 + (Math.random() * 4 - 2)))
    };
    a.home = { x: a.target.x, z: a.target.z };
    a.fleeUntil = performance.now() + 2600;
    a.moveT = 5;

    if (a.tapsLeft <= 0) {
      scene.remove(a.group);
      creatures.splice(creatures.indexOf(a), 1);
      GameAudio.sfx.pop();
      var loot = [];
      Object.keys(a.def.gifts).forEach(function (item) {
        Game.grantItem(item, a.def.gifts[item]);
        loot.push("+" + a.def.gifts[item] + " " + (ITEM_ICON[item] || "") + " " + item);
      });
      Game.grantXP(CONFIG.REWARDS.creatureXP);
      UI.toast(a.def.emoji + " " + a.def.cheer + "  " + loot.join("  "), 2800);
      Stats.recordGather();
    }
  }

  function hitboxes() { return creatures.map(function (a) { return a.hitbox; }); }

  return { init: init, populate: populate, update: update, playWith: playWith, hitboxes: hitboxes };
})();
