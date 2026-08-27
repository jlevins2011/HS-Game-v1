"use strict";
/* ============================================================
   NPCs — the friendly folk of the isles.
   - Elder Alder: gray-bearded keeper with a glowing lantern.
     His SUPER CHALLENGES earn legendary tools.
   - Wren the Tinker: goggles and a tool belt. Her SUPER
     CHALLENGES unlock the kiln and the lantern kit.
   - Finch (scout) and Poppy (gardener): quest friends.
   - Pip the fox: pettable, playful... and a sneaky little
     thief when a challenge goes really badly.
   ============================================================ */
var NPC_DEFS = {
  ELDER: { name: "Elder Alder", elder: true, hair: "#d8d3c8", shirt: "#6b5a9e" },
  WREN:  { name: "Wren",  tinker: true, hair: "#a8502e", shirt: "#c9843a" },
  FINCH: { name: "Finch", quests: true, boy: true, hair: "#5a3a1e", shirt: "#3fae5f" },
  POPPY: { name: "Poppy", quests: true, hair: "#e8b23a", shirt: "#d95f8a" },
  PIP:   { name: "Pip",   fox: true }
};

var NPCs = (function () {
  var npcs = [];
  var scene = null;

  function makeFaceTexture(hair, opts) {
    opts = opts || {};
    var c = document.createElement("canvas");
    c.width = c.height = 16;
    var g = c.getContext("2d");
    g.fillStyle = "#f2c9a0"; g.fillRect(0, 0, 16, 16);            // skin
    g.fillStyle = hair; g.fillRect(0, 0, 16, 4);                  // bangs
    g.fillRect(0, 4, 2, 4); g.fillRect(14, 4, 2, 4);
    g.fillStyle = "#ffffff"; g.fillRect(3, 7, 4, 3); g.fillRect(9, 7, 4, 3);
    g.fillStyle = "#3a66c9"; g.fillRect(4, 8, 2, 2); g.fillRect(10, 8, 2, 2);
    if (opts.goggles) {
      g.strokeStyle = "#8a5a2b";
      g.strokeRect(2.5, 6.5, 5, 4); g.strokeRect(8.5, 6.5, 5, 4);
      g.fillStyle = "#8a5a2b"; g.fillRect(7, 7, 2, 1);
    }
    if (opts.beard) {
      g.fillStyle = hair;
      g.fillRect(2, 11, 12, 5); g.fillRect(4, 10, 8, 2);
      g.fillStyle = "#d98a7a"; g.fillRect(6, 11, 4, 1);            // mouth peeks out
    } else {
      g.fillStyle = "#d98a7a"; g.fillRect(6, 12, 4, 2);            // smile
    }
    var t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
    return t;
  }

  function makeNameSprite(name) {
    var c = document.createElement("canvas");
    c.width = 256; c.height = 64;
    var g = c.getContext("2d");
    g.fillStyle = "rgba(20,30,50,0.5)";
    g.fillRect(0, 0, 256, 64);
    g.fillStyle = "#ffffff";
    g.font = "bold 30px sans-serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(name, 128, 34);
    var t = new THREE.CanvasTexture(c);
    var mat = new THREE.SpriteMaterial({ map: t, depthTest: false });
    var s = new THREE.Sprite(mat);
    s.scale.set(1.6, 0.4, 1);
    return s;
  }

  // Pip: a little orange fox with a white chest and black paws
  // Pip: a little fox of soft rounded shapes
  function buildFox(def) {
    var group = new THREE.Group();
    var g = new Geo.Builder();
    var ORANGE = 0xe8813a, WHITE = 0xf7f2e8, DARK = 0x2b2b2b;
    g.blob(0.3, ORANGE, { y: 0.12, sz: 1.5, sy: 0.8 }, 0.15, 0.15);          // body
    g.blob(0.17, WHITE, { y: 0.1, z: 0.28, sy: 0.8 }, 0.1, 0.1);            // chest
    g.blob(0.19, ORANGE, { y: 0.48, z: 0.34 }, 0.15, 0.1);                   // head
    g.blob(0.07, WHITE, { y: 0.42, z: 0.5 }, 0.1, 0);                        // muzzle
    g.blob(0.035, DARK, { y: 0.44, z: 0.56 }, 0, 0);                         // nose
    g.blob(0.028, DARK, { x: -0.07, y: 0.53, z: 0.48 }, 0, 0);               // eyes
    g.blob(0.028, DARK, { x: 0.07, y: 0.53, z: 0.48 }, 0, 0);
    g.cone(0.07, 0.16, 4, ORANGE, { x: -0.09, y: 0.6, z: 0.32 }, 0.1, 0);    // ears
    g.cone(0.07, 0.16, 4, ORANGE, { x: 0.09, y: 0.6, z: 0.32 }, 0.1, 0);
    g.blob(0.11, ORANGE, { y: 0.2, z: -0.42, sz: 1.9, sy: 0.7 }, 0.15, 0.1); // fluffy tail
    g.blob(0.08, WHITE, { y: 0.22, z: -0.62 }, 0.1, 0);                      // tail tip
    for (var i = 0; i < 4; i++) {
      g.cyl(0.045, 0.04, 0.14, 4, DARK, { x: (i % 2 ? 0.1 : -0.1), z: (i < 2 ? 0.16 : -0.16) }, 0, 0);
    }
    group.add(g.build());

    var label = makeNameSprite(def.name);
    label.scale.set(1.1, 0.28, 1);
    label.position.set(0, 1.0, 0);
    group.add(label);

    var hit = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1.0, 1.0),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.position.set(0, 0.4, 0);
    group.add(hit);
    return { group: group, hitbox: hit };
  }

  // people: soft rounded figures — bell-shaped bodies, round heads
  function buildModel(def) {
    if (def.fox) return buildFox(def);
    var group = new THREE.Group();
    var g = new Geo.Builder();
    var SKIN = 0xf2c9a0, DARKEYE = 0x33302c;
    var shirt = parseInt(def.shirt.slice(1), 16);
    var hair = parseInt(def.hair.slice(1), 16);
    var tall = def.elder ? 1.25 : (def.tinker ? 1.1 : 1.0);

    // bell body (robe/tunic)
    g.cyl(0.42 * tall, 0.2 * tall, 1.05 * tall, 7, shirt, {}, 0.12, 0.12);
    // arms: soft stubs
    g.blob(0.11 * tall, shirt, { x: -0.4 * tall, y: 0.78 * tall, sy: 1.6 }, 0.1, 0.1);
    g.blob(0.11 * tall, shirt, { x: 0.4 * tall, y: 0.78 * tall, sy: 1.6 }, 0.1, 0.1);
    g.blob(0.07 * tall, SKIN, { x: -0.42 * tall, y: 0.62 * tall }, 0.05, 0);
    g.blob(0.07 * tall, SKIN, { x: 0.42 * tall, y: 0.62 * tall }, 0.05, 0);
    // head
    var headY = 1.08 * tall;
    g.blob(0.26 * tall, SKIN, { y: headY }, 0.08, 0.05);
    // eyes on +z face
    g.blob(0.032, DARKEYE, { x: -0.09 * tall, y: headY + 0.28 * tall, z: 0.21 * tall }, 0, 0);
    g.blob(0.032, DARKEYE, { x: 0.09 * tall, y: headY + 0.28 * tall, z: 0.21 * tall }, 0, 0);
    // rosy cheeks
    g.blob(0.035, 0xe8a68a, { x: -0.15 * tall, y: headY + 0.2 * tall, z: 0.18 * tall }, 0, 0);
    g.blob(0.035, 0xe8a68a, { x: 0.15 * tall, y: headY + 0.2 * tall, z: 0.18 * tall }, 0, 0);
    // hair cap
    g.blob(0.27 * tall, hair, { y: headY + 0.12 * tall, sy: 0.75 }, 0.1, 0.12);
    if (!def.boy && !def.elder) {
      g.blob(0.2 * tall, hair, { y: headY + 0.05, z: -0.2 * tall, sy: 1.5 }, 0.1, 0.12);   // long hair
    }
    if (def.elder) {
      // long silver beard + staff with a glowing lantern
      g.blob(0.2 * tall, hair, { y: headY - 0.02, z: 0.14 * tall, sy: 1.5, sx: 0.8 }, 0.1, 0.1);
      g.cyl(0.045, 0.035, 1.9, 5, 0x6e5033, { x: 0.55, z: 0.1 }, 0.1, 0);
      g.blob(0.12, 0xffe08a, { x: 0.55, y: 1.95, z: 0.1 }, 0, 0);
      g.cone(0.16, 0.12, 5, 0x8a6540, { x: 0.55, y: 2.05, z: 0.1 }, 0.1, 0);
    }
    if (def.tinker) {
      // leather apron + goggles pushed up
      g.cyl(0.34 * tall, 0.24 * tall, 0.6 * tall, 6, 0x8a6540, { y: 0.28 * tall, z: 0.06 }, 0.1, 0);
      g.cyl(0.26 * tall, 0.26 * tall, 0.09, 7, 0xd9b23a, { y: headY + 0.34 * tall }, 0.05, 0);
      g.blob(0.07, 0x9aa2ad, { x: 0.45 * tall, y: 0.68 * tall, z: 0.15 }, 0, 0);   // wrench in hand
    }
    group.add(g.build());

    var label = makeNameSprite(def.name);
    label.position.set(0, (def.elder ? 2.45 : 2.05), 0);
    group.add(label);

    var hit = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 2.1 * tall, 1.0),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.position.set(0, 1.0 * tall, 0);
    group.add(hit);

    return { group: group, hitbox: hit };
  }

  function init(sc) { scene = sc; }

  function placeAll(spawnX, spawnZ) {
    npcs.forEach(function (n) { scene.remove(n.group); });
    npcs = [];
    var cast = [NPC_DEFS.FINCH, NPC_DEFS.POPPY, NPC_DEFS.ELDER, NPC_DEFS.WREN, NPC_DEFS.PIP];
    cast.forEach(function (def, i) {
      var model = buildModel(def);
      var hx = spawnX + [4, -4, 0, 5, -2][i];
      var hz = spawnZ + [3, 4, -5, -3, -2][i];
      var n = {
        def: def, group: model.group, hitbox: model.hitbox,
        home: { x: hx, z: hz }, target: null, moveT: 0, faceYaw: 0,
        speed: def.elder ? 0.45 : (def.fox ? 1.8 : 1.1)
      };
      model.hitbox.userData.npc = n;
      positionOnGround(n, hx, hz);
      scene.add(model.group);
      npcs.push(n);
    });
  }

  function positionOnGround(n, x, z) {
    var y = Terrain.heightAt(x, z);
    if (y < -100 || (Terrain.def.water > 0 && y < Terrain.def.water)) {
      var g = Terrain.groundNear(x, z);
      x = g.x; z = g.z; y = g.y;
    }
    n.group.position.set(x, y, z);
  }

  function update(dt, playerPos) {
    var t = performance.now() / 1000;
    npcs.forEach(function (n, i) {
      var g = n.group;
      var d = playerPos.distanceTo(g.position);
      if (d < 6) {
        var dx = playerPos.x - g.position.x, dz = playerPos.z - g.position.z;
        n.faceYaw = Math.atan2(dx, dz);
      } else {
        n.moveT -= dt;
        if (n.moveT <= 0) {
          n.moveT = n.def.fox ? 2 + Math.random() * 3 : 4 + Math.random() * 5;
          var r = n.def.fox ? 7 : 3;
          n.target = {
            x: n.home.x + (Math.random() * 2 - 1) * r,
            z: n.home.z + (Math.random() * 2 - 1) * r
          };
        }
        if (n.target) {
          var tx = n.target.x - g.position.x, tz = n.target.z - g.position.z;
          var dist = Math.hypot(tx, tz);
          if (dist > 0.3) {
            var step = Math.min(dist, dt * (n.speed || 1.1));
            var nx = g.position.x + (tx / dist) * step;
            var nz = g.position.z + (tz / dist) * step;
            positionOnGround(n, nx, nz);
            n.faceYaw = Math.atan2(tx, tz);
          }
        }
      }
      // never stand inside the player — a friend's face filling the screen
      // is disorienting, so they politely step back
      var sepX = g.position.x - playerPos.x, sepZ = g.position.z - playerPos.z;
      var sep = Math.hypot(sepX, sepZ);
      if (sep < 1.1) {
        var push = (1.1 - sep) * Math.min(1, dt * 6);
        if (sep < 0.001) { sepX = 1; sepZ = 0; sep = 1; }
        positionOnGround(n, g.position.x + (sepX / sep) * push, g.position.z + (sepZ / sep) * push);
      }
      g.rotation.y += (n.faceYaw - g.rotation.y) * Math.min(1, dt * 6);
      g.position.y += Math.sin(t * 2 + i * 2) * 0.0015;
    });
  }

  function hitboxes() { return npcs.map(function (n) { return n.hitbox; }); }

  function getFox() {
    for (var i = 0; i < npcs.length; i++) {
      if (npcs[i].def.fox) return npcs[i];
    }
    return null;
  }

  function positionFoxNear(x, z) {
    var n = getFox();
    if (n) positionOnGround(n, x, z);
    return n;
  }

  return { init: init, placeAll: placeAll, update: update, hitboxes: hitboxes,
           getFox: getFox, positionFoxNear: positionFoxNear };
})();


/* ============================================================
   QUESTS — gathering quests from Finch and Poppy.
   Flow: talk -> read the request (comprehension check) ->
   collect the items -> return for the reward.
   ============================================================ */
var QUEST_DEFS = [
  { tier: 0, text: "Can you get me 3 timber?",              ask: "timber",    count: 3, icon: "🪵", decoys: ["🪨", "🌼"] },
  { tier: 0, text: "I want 2 sunpetal flowers!",            ask: "sunpetal",  count: 2, icon: "🌼", decoys: ["🪵", "🐚"] },
  { tier: 0, text: "I need 2 stone for my firepit.",        ask: "stone",     count: 2, icon: "🪨", decoys: ["🌼", "🪵"] },
  { tier: 1, text: "I need 4 stone to build a step.",       ask: "stone",     count: 4, icon: "🪨", decoys: ["🪵", "🍃"] },
  { tier: 1, text: "Find 2 shiny shells from shellhoppers!", ask: "shell",    count: 2, icon: "🐚", decoys: ["🪨", "🌼"] },
  { tier: 1, text: "Bring me 4 leaves from a tree.",        ask: "leaves",    count: 4, icon: "🍃", decoys: ["🟨", "🪨"] },
  { tier: 1, text: "I am hungry! Please pick 3 berries.",   ask: "berries",   count: 3, icon: "🫐", decoys: ["🍃", "🌼"] },
  { tier: 2, text: "I would like 5 timber for my house.",   ask: "timber",    count: 5, icon: "🪵", decoys: ["🧱", "🍃"] },
  { tier: 2, text: "Please mine 2 emberstone to warm us.",  ask: "emberstone", count: 2, icon: "🔥", decoys: ["🌟", "🪵"] },
  { tier: 2, text: "I need 3 fluff to stuff my pillow.",    ask: "fluff",     count: 3, icon: "☁️", decoys: ["🫐", "🍃"] },
  { tier: 2, text: "Find 2 feathers for my new pen.",       ask: "feather",   count: 2, icon: "🪶", decoys: ["🐚", "🌼"] },
  { tier: 3, text: "Could you mine 1 shiny starstone?",     ask: "starstone", count: 1, icon: "🌟", decoys: ["🔥", "🪨"] },
  { tier: 3, text: "I am building a tower. I need 6 stone!", ask: "stone",    count: 6, icon: "🪨", decoys: ["🪵", "🟨"] },
  { tier: 3, text: "Gather 3 skysteel ore for a new bell.", ask: "skysteel ore", count: 3, icon: "🔩", decoys: ["🌟", "🔥"] },
  { tier: 3, text: "Grow me 2 sunfruit from the garden!",   ask: "sunfruit",  count: 2, icon: "🍊", decoys: ["🍈", "🫐"] }
];

var Quests = (function () {
  function active() { return Store.data.quests.active; }

  function pickQuest() {
    var p = Store.data.player;
    var tier = Math.min(3, Math.floor((p.level - 1) / 2));
    var pool = QUEST_DEFS.filter(function (q) { return q.tier <= tier; });
    var current = pool.filter(function (q) { return q.tier === tier; });
    var from = (current.length && Math.random() < 0.7) ? current : pool;
    return from[Math.floor(Math.random() * from.length)];
  }

  function start(giverName, quest) {
    Store.data.quests.active = {
      giver: giverName, text: quest.text, ask: quest.ask,
      count: quest.count, icon: quest.icon, tier: quest.tier
    };
    Store.save();
    UI.updateQuestHud();
  }

  function isComplete() {
    var q = active();
    if (!q) return false;
    return (Store.data.player.inventory[q.ask] || 0) >= q.count;
  }

  function finish() {
    var q = active();
    if (!q) return;
    Store.data.player.inventory[q.ask] -= q.count;
    Store.data.quests.active = null;
    Store.data.quests.completed += 1;
    Stats.recordQuest();
    Game.grantSparks(CONFIG.REWARDS.questSparks);
    Game.grantXP(CONFIG.REWARDS.questXP);
    Store.save();
    UI.updateQuestHud();
    UI.updateHotbar();
  }

  return { active: active, pickQuest: pickQuest, start: start, isComplete: isComplete, finish: finish };
})();
