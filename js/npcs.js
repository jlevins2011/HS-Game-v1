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
  function buildFox(def) {
    var group = new THREE.Group();
    var orange = new THREE.MeshLambertMaterial({ color: 0xe8813a });
    var white = new THREE.MeshLambertMaterial({ color: 0xf7f2e8 });
    var black = new THREE.MeshLambertMaterial({ color: 0x2b2b2b });

    function box(w, h, d, mat, x, y, z) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      group.add(m);
      return m;
    }
    // legs (black socks)
    box(0.09, 0.2, 0.09, black, -0.1, 0.1, 0.16);
    box(0.09, 0.2, 0.09, black, 0.1, 0.1, 0.16);
    box(0.09, 0.2, 0.09, black, -0.1, 0.1, -0.16);
    box(0.09, 0.2, 0.09, black, 0.1, 0.1, -0.16);
    // body + white chest
    box(0.26, 0.24, 0.54, orange, 0, 0.32, 0);
    box(0.2, 0.16, 0.16, white, 0, 0.3, 0.26);
    // head + snout + ears
    box(0.22, 0.2, 0.2, orange, 0, 0.5, 0.32);
    box(0.1, 0.08, 0.1, white, 0, 0.46, 0.46);
    box(0.04, 0.04, 0.03, black, 0, 0.49, 0.52);
    box(0.07, 0.1, 0.04, orange, -0.08, 0.64, 0.3);
    box(0.07, 0.1, 0.04, orange, 0.08, 0.64, 0.3);
    // big fluffy tail with white tip
    box(0.1, 0.1, 0.26, orange, 0, 0.36, -0.4);
    box(0.08, 0.08, 0.1, white, 0, 0.36, -0.56);

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

  function buildModel(def) {
    if (def.fox) return buildFox(def);
    var group = new THREE.Group();
    var skin = new THREE.MeshLambertMaterial({ color: 0xf2c9a0 });
    var shirt = new THREE.MeshLambertMaterial({ color: def.shirt });
    var pants = new THREE.MeshLambertMaterial({ color: 0x3a4a6b });
    var hair = new THREE.MeshLambertMaterial({ color: def.hair });
    var face = new THREE.MeshLambertMaterial({
      map: makeFaceTexture(def.hair, { beard: def.elder, goggles: def.tinker })
    });

    function box(w, h, d, mats, x, y, z) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
      m.position.set(x, y, z);
      group.add(m);
      return m;
    }

    if (def.elder) {
      // Elder Alder: tall, long robe, staff with a glowing lantern
      var robe = new THREE.MeshLambertMaterial({ color: def.shirt });
      box(0.6, 1.3, 0.34, robe, 0, 0.65, 0);                     // long robe
      box(0.17, 0.6, 0.17, robe, -0.4, 1.05, 0);                 // sleeves
      box(0.17, 0.6, 0.17, robe, 0.4, 1.05, 0);
      var headMatsE = [hair, hair, hair, hair, face, hair];
      box(0.46, 0.46, 0.46, headMatsE, 0, 1.68, 0);
      box(0.5, 0.12, 0.5, hair, 0, 1.94, 0);                     // silver hair
      // staff + lantern
      var staff = new THREE.MeshLambertMaterial({ color: 0x6e5033 });
      var glow = new THREE.MeshLambertMaterial({ color: 0xffe08a, emissive: 0xcc9a3a });
      box(0.07, 1.7, 0.07, staff, 0.52, 0.9, 0.12);
      box(0.16, 0.16, 0.16, glow, 0.52, 1.82, 0.12);
      var labelE = makeNameSprite(def.name);
      labelE.position.set(0, 2.35, 0);
      group.add(labelE);
      var hitE = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 2.4, 1.1),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitE.position.set(0, 1.2, 0);
      group.add(hitE);
      return { group: group, hitbox: hitE };
    }

    if (def.tinker) {
      // Wren: apron, tool belt, goggles pushed onto her forehead
      box(0.22, 0.6, 0.22, pants, -0.14, 0.3, 0);
      box(0.22, 0.6, 0.22, pants, 0.14, 0.3, 0);
      box(0.5, 0.65, 0.28, shirt, 0, 0.92, 0);
      var apron = new THREE.MeshLambertMaterial({ color: 0x8a6540 });
      box(0.42, 0.5, 0.06, apron, 0, 0.85, 0.16);
      var belt = new THREE.MeshLambertMaterial({ color: 0x5e4429 });
      box(0.54, 0.1, 0.32, belt, 0, 0.62, 0);
      box(0.16, 0.58, 0.16, skin, -0.34, 0.9, 0);
      box(0.16, 0.5, 0.16, skin, 0.36, 0.95, 0.12);              // arm forward with wrench
      var tool = new THREE.MeshLambertMaterial({ color: 0x9aa2ad });
      box(0.06, 0.22, 0.06, tool, 0.42, 1.2, 0.28);
      var headMatsW = [hair, hair, hair, hair, face, hair];
      box(0.45, 0.45, 0.45, headMatsW, 0, 1.5, 0);
      box(0.49, 0.12, 0.49, hair, 0, 1.76, 0);
      var gog = new THREE.MeshLambertMaterial({ color: 0xd9b23a });
      box(0.47, 0.08, 0.1, gog, 0, 1.68, 0.2);                   // goggles on forehead
      var labelW = makeNameSprite(def.name);
      labelW.position.set(0, 2.15, 0);
      group.add(labelW);
      var hitW = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 2.3, 1.1),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitW.position.set(0, 1.1, 0);
      group.add(hitW);
      return { group: group, hitbox: hitW };
    }

    // quest kids
    box(0.22, 0.55, 0.22, pants, -0.14, 0.275, 0);
    box(0.22, 0.55, 0.22, pants, 0.14, 0.275, 0);
    box(0.5, 0.6, 0.28, shirt, 0, 0.85, 0);
    box(0.16, 0.55, 0.16, skin, -0.34, 0.85, 0);
    box(0.16, 0.55, 0.16, skin, 0.34, 0.85, 0);
    var headMats = [hair, hair, hair, hair, face, hair];
    box(0.45, 0.45, 0.45, headMats, 0, 1.4, 0);
    box(0.49, 0.12, 0.49, hair, 0, 1.66, 0);
    if (!def.boy) box(0.45, 0.5, 0.1, hair, 0, 1.3, -0.24);

    var label = makeNameSprite(def.name);
    label.position.set(0, 2.05, 0);
    group.add(label);

    var hit = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 2.1, 1.0),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.position.set(0, 1.0, 0);
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
    var g = World.groundNear(x, z);
    n.group.position.set(x, g.y + 1, z);
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
  { tier: 0, text: "Please dig up 3 earth for me.",         ask: "earth",     count: 3, icon: "🟫", decoys: ["🌼", "⬜"] },
  { tier: 1, text: "I need 4 stone to build a step.",       ask: "stone",     count: 4, icon: "🪨", decoys: ["🪵", "🟫"] },
  { tier: 1, text: "Can you find 3 cloudsand by the pond?", ask: "cloudsand", count: 3, icon: "🟨", decoys: ["🪨", "🌼"] },
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
