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

  function mat(color) { return new THREE.MeshLambertMaterial({ color: color }); }

  function box(group, w, h, d, m, x, y, z) {
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  }

  function buildCreature(type) {
    var g = new THREE.Group();
    var extra = {};
    if (type === "tuftle") {
      var body = mat(0xd9b88a), moss = mat(0x6fbc53), eye = mat(0x2b2b2b);
      box(g, 0.42, 0.3, 0.5, body, 0, 0.28, 0);
      box(g, 0.4, 0.16, 0.44, moss, 0, 0.48, -0.02);     // mossy tuft back
      box(g, 0.16, 0.12, 0.14, moss, 0, 0.58, 0.02);
      box(g, 0.2, 0.18, 0.18, body, 0, 0.34, 0.32);      // head
      box(g, 0.04, 0.04, 0.02, eye, -0.06, 0.38, 0.42);
      box(g, 0.04, 0.04, 0.02, eye, 0.06, 0.38, 0.42);
      [[-0.13, 0.17], [0.13, 0.17], [-0.13, -0.17], [0.13, -0.17]].forEach(function (p) {
        box(g, 0.1, 0.16, 0.1, body, p[0], 0.08, p[1]);
      });
      extra.tuft = true;
    } else if (type === "puffbird") {
      var puff = mat(0xf2c9d8), belly = mat(0xfbeff4), beak = mat(0xe8a23a), eye2 = mat(0x2b2b2b);
      box(g, 0.3, 0.3, 0.34, puff, 0, 0.32, 0);
      box(g, 0.22, 0.18, 0.2, belly, 0, 0.26, 0.1);
      box(g, 0.2, 0.2, 0.18, puff, 0, 0.54, 0.12);
      box(g, 0.06, 0.05, 0.1, beak, 0, 0.53, 0.26);
      box(g, 0.04, 0.04, 0.02, eye2, -0.06, 0.58, 0.2);
      box(g, 0.04, 0.04, 0.02, eye2, 0.06, 0.58, 0.2);
      box(g, 0.1, 0.16, 0.06, puff, -0.2, 0.34, -0.04);  // wings
      box(g, 0.1, 0.16, 0.06, puff, 0.2, 0.34, -0.04);
      box(g, 0.05, 0.1, 0.05, beak, -0.06, 0.1, 0);
      box(g, 0.05, 0.1, 0.05, beak, 0.06, 0.1, 0);
    } else if (type === "shellhopper") {
      var shell = mat(0x7ac0d9), swirl = mat(0xd9f2fb), body2 = mat(0xe8cfa5), eye3 = mat(0x2b2b2b);
      box(g, 0.4, 0.34, 0.4, shell, 0, 0.4, -0.04);
      box(g, 0.2, 0.12, 0.2, swirl, 0, 0.6, -0.04);
      box(g, 0.3, 0.2, 0.24, body2, 0, 0.2, 0.2);
      box(g, 0.04, 0.04, 0.02, eye3, -0.06, 0.26, 0.32);
      box(g, 0.04, 0.04, 0.02, eye3, 0.06, 0.26, 0.32);
      [[-0.1, 0.14], [0.1, 0.14]].forEach(function (p) {
        box(g, 0.08, 0.12, 0.08, body2, p[0], 0.06, p[1]);
      });
    } else { // glowmoth
      var wing = mat(0xd9c2f2), glow = mat(0xfff3c4), body3 = mat(0x8a7ae8);
      box(g, 0.12, 0.26, 0.12, body3, 0, 0.4, 0);
      box(g, 0.26, 0.2, 0.04, wing, -0.18, 0.46, 0);
      box(g, 0.26, 0.2, 0.04, wing, 0.18, 0.46, 0);
      box(g, 0.08, 0.08, 0.08, glow, 0, 0.24, 0);
      extra.flies = true;
      extra.wingL = g.children[1];
      extra.wingR = g.children[2];
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
    var y = World.surfaceY(Math.floor(x), Math.floor(z));
    return y > 0 ? y + 1 : -1;
  }

  function isGoodSpot(x, z) {
    var y = World.surfaceY(Math.floor(x), Math.floor(z));
    if (y <= 0) return false;
    return World.getBlock(Math.floor(x), y + 1, Math.floor(z)) !== B.WATER &&
           World.getBlock(Math.floor(x), y, Math.floor(z)) !== B.WATER;
  }

  var spawnCounter = 0;
  function spawnOne() {
    var names = Object.keys(TYPES);
    var type = names[spawnCounter++ % names.length];
    var x, z, tries = 0;
    do {
      x = 20 + Math.random() * 88;
      z = 20 + Math.random() * 88;
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
          x: Math.max(3, Math.min(125, a.home.x + (Math.random() * 10 - 5))),
          z: Math.max(3, Math.min(125, a.home.z + (Math.random() * 10 - 5)))
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
      x: Math.max(3, Math.min(125, a.group.position.x + (dx / len) * 9 + (Math.random() * 4 - 2))),
      z: Math.max(3, Math.min(125, a.group.position.z + (dz / len) * 9 + (Math.random() * 4 - 2)))
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
