"use strict";
/* ============================================================
   GAME — three.js setup, the main loop, and interaction rules:
   what happens when a Keeper taps a block, a wonderstone, a
   curio chest, a creature, or a friend.
   ============================================================ */
var Game = (function () {
  var scene, camera, renderer;
  var sun, ambient, hemi, keeperGlow;
  var cloudsAbove = [], cloudsBelow = [];
  var running = false;
  var mode = "gather";          // "gather" | "build"
  var selectedItem = null;
  var highlightBox = null;
  var gathering = null;         // { x,y,z, until, total, def }
  var npcRaycaster = new THREE.Raycaster();

  /* ---------------- setup ---------------- */
  function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 300);
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("game-canvas"), antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    ambient = new THREE.AmbientLight(0xffffff, 0.45);
    hemi = new THREE.HemisphereLight(0xbfd9ff, 0x8a6a4a, 0.35);
    sun = new THREE.DirectionalLight(0xfff2cc, 0.85);
    sun.position.set(60, 100, 40);
    scene.add(ambient, hemi, sun);

    // the keeper's glow: a soft light that follows the player underground
    // so The Hollow is dim and mysterious but never unreadably black
    keeperGlow = new THREE.PointLight(0xaed4ff, 0, 12, 1.6);
    scene.add(keeperGlow);

    // block highlight outline
    var hlGeo = new THREE.BoxGeometry(1.002, 1.002, 1.002);
    var hlEdges = new THREE.EdgesGeometry(hlGeo);
    highlightBox = new THREE.LineSegments(hlEdges,
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }));
    highlightBox.visible = false;
    scene.add(highlightBox);

    // clouds above — and clouds BELOW the isle, so it truly floats
    var cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    var lowMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
    for (var i = 0; i < 10; i++) {
      var w = 6 + Math.random() * 10, d = 4 + Math.random() * 6;
      var cloud = new THREE.Mesh(new THREE.BoxGeometry(w, 1, d), cloudMat);
      cloud.position.set(Math.random() * 128, 46 + Math.random() * 5, Math.random() * 128);
      scene.add(cloud);
      cloudsAbove.push(cloud);
    }
    for (var j = 0; j < 14; j++) {
      var w2 = 10 + Math.random() * 18, d2 = 8 + Math.random() * 12;
      var below = new THREE.Mesh(new THREE.BoxGeometry(w2, 1.6, d2), lowMat);
      below.position.set(Math.random() * 180 - 26, -26 - Math.random() * 12, Math.random() * 180 - 26);
      scene.add(below);
      cloudsBelow.push(below);
    }

    window.__dbg = { scene: scene, camera: camera, renderer: renderer };

    World.init(scene);
    NPCs.init(scene);
    Creatures.init(scene);
    Player.init(camera);
    Controls.init(renderer.domElement);

    window.addEventListener("resize", function () {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    requestAnimationFrame(loop);
  }

  /* ---------------- isle travel / start ---------------- */
  function travelTo(isleId) {
    Store.data.player.isle = isleId;
    Store.save();
    var def = World.loadIsle(isleId);
    scene.background = new THREE.Color(def.sky);
    scene.fog = new THREE.Fog(def.fog, 70, 260);
    var sx = (def.spawn && def.spawn.x) || Math.floor(World.SX / 2);
    var sz = (def.spawn && def.spawn.z) || Math.floor(World.SZ / 2);
    Player.spawnAt(sx, sz, def.spawn && def.spawn.yaw);
    NPCs.placeAll(sx, sz);
    Creatures.populate();
    Garden.restore();
    rebuildLanternLights();
    UI.toast(def.emoji + " Welcome to " + def.name + "!");
    GameAudio.say("Welcome to " + def.name + "!");
  }

  function start() {
    UI.hideHome();
    running = true;
    Game.running = true;
    lastEdu = Date.now();
    travelTo(Store.data.player.isle || "meadowmere");
    Controls.setEnabled(true);
    UI.updateHud();
    UI.updateHotbar();
    UI.updateQuestHud();
    UI.updateModeButton();
    Reports.maybeAutoSend();
  }

  /* ---------------- rewards / leveling ---------------- */
  function grantXP(amount) {
    var p = Store.data.player;
    p.xp += amount;
    var need = UI.xpNeeded(p.level);
    if (p.xp >= need) {
      p.xp -= need;
      p.level += 1;
      Store.save();
      UI.showLevelUp(p.level);
    }
    Store.save();
    UI.updateHud();
  }

  function grantSparks(n) {
    Store.data.player.sparks += n;
    Stats.recordSparks(n);
    Store.save();
    GameAudio.sfx.spark();
    UI.updateHud();
  }

  function grantItem(item, count) {
    var inv = Store.data.player.inventory;
    inv[item] = (inv[item] || 0) + count;
    Store.save();
    UI.updateHotbar();
    UI.updateQuestHud();
  }

  /* ---------------- interaction ---------------- */
  var TOOL_SPEED = [1, 1.5, 2.1, 3.0];   // timber, stone, skysteel, sunforged mallets

  function interact() {
    if (!running || gathering) return;

    var hit = Player.raycastBlock(CONFIG.MOVE.reach);

    // friends take priority unless a block is clearly in front of them
    npcRaycaster.setFromCamera({ x: 0, y: 0 }, camera);
    npcRaycaster.far = 5;
    var npcHits = npcRaycaster.intersectObjects(NPCs.hitboxes(), false);
    if (npcHits.length && (!hit || npcHits[0].distance < hit.distance + 0.4)) {
      UI.showDialogue(npcHits[0].object.userData.npc);
      return;
    }

    // then creatures
    var critterHits = npcRaycaster.intersectObjects(Creatures.hitboxes(), false);
    if (critterHits.length && (!hit || critterHits[0].distance < hit.distance + 0.4)) {
      Creatures.playWith(critterHits[0].object.userData.creature, Player.position);
      return;
    }

    if (!hit) return;

    var held = selectedItem || UI.selectedItem();
    var lookB = World.getBlock(hit.block.x, hit.block.y, hit.block.z);

    // empty bucket scoops water
    if (held === "bucket" && lookB === B.WATER) {
      var invb = Store.data.player.inventory;
      if ((invb.bucket || 0) < 1) return;
      invb.bucket -= 1;
      invb["water bucket"] = (invb["water bucket"] || 0) + 1;
      World.setBlock(hit.block.x, hit.block.y, hit.block.z, B.AIR);
      Store.save();
      GameAudio.sfx.place();
      UI.toast("🪣 Scooped water! Tap somewhere to pour a pool.");
      UI.updateHotbar();
      selectedItem = "water bucket";
      Game.selectedItem = "water bucket";
      return;
    }
    if (held === "water bucket") { tryPlace(hit); return; }

    var def = lookB && BLOCKS[lookB];

    // special blocks always tap-to-use (even in build mode)
    if (def && def.special === "bench") { UI.showWorkshop(); return; }
    if (def && def.special === "door") {
      World.setBlock(hit.block.x, hit.block.y, hit.block.z, lookB === B.DOOR_OPEN ? B.DOOR : B.DOOR_OPEN);
      GameAudio.sfx.place();
      return;
    }
    if (def && def.special === "bedroll") {
      Store.data.player.camp = { isle: Store.data.player.isle, x: hit.block.x, z: hit.block.z };
      Store.save();
      GameAudio.sfx.quest();
      UI.toast("😴 Camp set! If you fall off the isle, you'll wake up here.", 3200);
      GameAudio.say("Camp set!");
      return;
    }
    if (def && def.special === "garden") { Garden.tryPlant(hit.block.x, hit.block.y, hit.block.z); return; }
    if (def && def.special === "crop") { Garden.tryHarvest(hit.block.x, hit.block.y, hit.block.z); return; }

    if (def && def.special === "berries") {
      // pick berries: instant, replant timer swaps the bush back later
      World.setBlock(hit.block.x, hit.block.y, hit.block.z, B.BERRY_EMPTY);
      var n = 2 + Math.floor(Math.random() * 2);
      grantItem("berries", n);
      if (Math.random() < 0.25) {
        var seed = Math.random() < 0.6 ? "sunfruit seeds" : "moonmelon seeds";
        grantItem(seed, 1);
        UI.toast("🫐 +" + n + " berries — and " + seed + "! 🌱", 2600);
      } else {
        UI.toast("🫐 +" + n + " berries!");
      }
      grantXP(2);
      GameAudio.sfx.pop();
      berryRegrow.push({ isle: World.def.id, x: hit.block.x, y: hit.block.y, z: hit.block.z, at: Date.now() });
      return;
    }

    if (mode === "build") { tryPlace(hit); return; }
    if (lookB === B.AIR || !def) return;

    if (def.special === "wonderstone") {
      UI.showChallenge("node", function (result) {
        if (result.correct && !result.skipped) {
          World.setBlock(hit.block.x, hit.block.y, hit.block.z, B.AIR);
          grantSparks(CONFIG.REWARDS.wonderstoneSparks);
          grantXP(CONFIG.REWARDS.wonderstoneXP);
          GameAudio.sfx.gather();
          var bonus = ["stone", "timber", "earth"][Math.floor(Math.random() * 3)];
          grantItem(bonus, 2);
          UI.toast("✨ +" + CONFIG.REWARDS.wonderstoneSparks + " sparks!  🎒 +2 " + bonus);
        }
      }, "🔮 Wonderstone!");
      return;
    }

    if (def.special === "chest") {
      UI.showChallenge("chest", function (result) {
        if (result.correct && !result.skipped) {
          World.setBlock(hit.block.x, hit.block.y, hit.block.z, B.AIR);
          grantSparks(CONFIG.REWARDS.chestSparks);
          grantXP(CONFIG.REWARDS.chestXP);
          var rolls = [["planks", 4], ["claybrick", 4], ["glowmoss", 2], ["timber", 3],
                       ["sunfruit seeds", 2], ["moonmelon seeds", 2]];
          var loot = rolls[Math.floor(Math.random() * rolls.length)];
          grantItem(loot[0], loot[1]);
          UI.toast("🧰 Treasure! +" + CONFIG.REWARDS.chestSparks + " sparks and " + loot[1] + " " + loot[0] + "!");
        }
      }, "🧰 Curio Chest!");
      return;
    }

    // regular gathering
    if (def.hard < 0) { UI.toast("That block is too strong... maybe forever!"); return; }
    var p = Store.data.player;
    if (def.needLegend && !p.tools[def.needLegend]) {
      GameAudio.sfx.wrong();
      UI.toast("🌀 Only a legendary tool can break " + def.name + "! Elder Alder's SUPER CHALLENGES might earn you one...", 3500);
      return;
    }
    if (def.needTool > p.toolTier) {
      GameAudio.sfx.wrong();
      UI.toast("🔨 You need a better mallet for " + def.name + "!");
      return;
    }
    var speed = TOOL_SPEED[p.toolTier] * (p.tools.sunhammer ? 2 : 1);
    var bid = def.id;
    if (p.tools.spade && (bid === B.EARTH || bid === B.MEADOW || bid === B.CLOUDSAND ||
        bid === B.SNOW || bid === B.STARMOSS)) speed *= 2.4;
    else if (p.tools.hatchet && (bid === B.TIMBER || bid === B.LEAF || bid === B.LEAF_ROSE ||
        bid === B.PLANKS || bid === B.FENCE || bid === B.DOOR || bid === B.DOOR_OPEN ||
        bid === B.SPINELEAF || bid === B.DOCKWOOD)) speed *= 2.4;
    var ms = Math.max(120, def.hard / speed);
    gathering = {
      x: hit.block.x, y: hit.block.y, z: hit.block.z,
      until: performance.now() + ms, total: ms, def: def
    };
    GameAudio.sfx.gather();
  }

  function finishGathering() {
    var m = gathering;
    gathering = null;
    document.getElementById("gather-progress").style.display = "none";
    var current = World.getBlock(m.x, m.y, m.z);
    if (current === B.AIR) return;
    World.setBlock(m.x, m.y, m.z, B.AIR);
    GameAudio.sfx.gather();
    Stats.recordGather();
    if (m.def.drop) {
      grantItem(m.def.drop, 1);
      grantXP(CONFIG.REWARDS.gatherXP);
      if (m.def.drop === "moonpearl") { grantSparks(1); UI.toast("🌙 Moonpearl! +1 spark"); }
      if (m.def.drop === "aurorium") { grantSparks(2); grantXP(5); UI.toast("🌈 AURORIUM! Super rare! +2 sparks"); }
      if (m.def.drop === "skysteel ore" && !Store.data.player.tools.kiln &&
          (Store.data.player.inventory["skysteel ore"] || 0) <= 2) {
        UI.toast("🔩 Raw skysteel ore! Wren the Tinker can teach you to SMELT this in a kiln...", 3200);
      }
    }
    if (m.def.id === B.LANTERN) removeLanternLight(m.x, m.y, m.z);
    if (m.def.id === B.ROOTSTONE) {
      UI.toast("🌀 You broke through the rootstone! THE HOLLOW glimmers below...", 3500);
    }
    // occasionally the quest friends cheer
    if (Math.random() < 0.02) {
      var who = Math.random() < 0.5 ? "Finch" : "Poppy";
      UI.toast((who === "Finch" ? "👦 " : "👧 ") + who + ": Nice gathering, " + Store.profile.name + "!");
    }
  }

  function tryPlace(hit) {
    var item = selectedItem || UI.selectedItem();
    if (!item) { UI.toast("Pick a block from your pack first!"); setMode("gather"); return; }
    var inv = Store.data.player.inventory;
    if (!inv[item] || inv[item] <= 0) { UI.toast("No more " + item + "! Gather some more."); UI.updateHotbar(); return; }
    var t = hit.place;
    if (t.y <= World.MIN_Y || t.y >= World.SY) return;
    if (World.getBlock(t.x, t.y, t.z) !== B.AIR) return;
    if (Player.wouldIntersectPlayer(t.x, t.y, t.z)) return;
    var blockId = ITEM_TO_BLOCK[item];
    if (blockId === undefined) return;
    if (blockId === B.LANTERN && !Store.data.player.tools.lanternkit) {
      UI.toast("🏮 Wren's lantern kit teaches you to hang lanterns that GLOW!");
      return;
    }
    World.setBlock(t.x, t.y, t.z, blockId);
    inv[item] -= 1;
    if (item === "water bucket") {
      inv.bucket = (inv.bucket || 0) + 1;
      selectedItem = (inv.bucket > 0) ? "bucket" : null;
      Game.selectedItem = selectedItem;
    }
    Store.save();
    Stats.recordBuild();
    GameAudio.sfx.place();
    UI.updateHotbar();
    if (blockId === B.LANTERN) addLanternLight(t.x, t.y, t.z);
  }

  /* ---------------- lantern lights ---------------- */
  var lanternLights = {};
  function addLanternLight(x, y, z) {
    var key = x + "," + y + "," + z;
    if (lanternLights[key]) return;
    if (Object.keys(lanternLights).length >= 48) return;
    var light = new THREE.PointLight(0xffcc66, 1.15, 9, 2);
    light.position.set(x + 0.5, y + 0.7, z + 0.5);
    scene.add(light);
    lanternLights[key] = light;
  }
  function removeLanternLight(x, y, z) {
    var key = x + "," + y + "," + z;
    if (!lanternLights[key]) return;
    scene.remove(lanternLights[key]);
    delete lanternLights[key];
  }
  function rebuildLanternLights() {
    Object.keys(lanternLights).forEach(function (k) { scene.remove(lanternLights[k]); });
    lanternLights = {};
    var edits = Store.worldEdits(World.def.id);
    Object.keys(edits).forEach(function (key) {
      if (edits[key] !== B.LANTERN) return;
      var p = key.split(",");
      addLanternLight(+p[0], +p[1], +p[2]);
    });
  }

  /* ---------------- berry regrowth ---------------- */
  var berryRegrow = [];
  function tickBerries() {
    var now = Date.now();
    for (var i = berryRegrow.length - 1; i >= 0; i--) {
      var b = berryRegrow[i];
      if (now - b.at < CONFIG.WORLD.berryRegrowSec * 1000) continue;
      berryRegrow.splice(i, 1);
      if (b.isle !== World.def.id) continue;
      if (World.getBlock(b.x, b.y, b.z) === B.BERRY_EMPTY) {
        World.setBlock(b.x, b.y, b.z, B.BERRY_FULL);
      }
    }
  }

  /* ---------------- STARFALL (the beloved storm mechanic) ---------------- */
  // Go quiet on learning for a while and a wishing star tumbles from the
  // sky — answer its riddle to catch the sparks before it fades!
  var lastEdu = Date.now();
  function notifyEdu() { lastEdu = Date.now(); }

  function maybeStarfall() {
    if (!running) return;
    if (document.getElementById("overlay").classList.contains("open")) return;
    if (Date.now() - lastEdu < CONFIG.LEARN.starfallMinutes * 60 * 1000) return;
    lastEdu = Date.now();   // set immediately so it can't double-fire
    GameAudio.sfx.starfall();
    GameAudio.say("A star is falling! Catch it quick!");
    UI.showChallenge("starfall", function (result) {
      if (result.correct && !result.skipped) {
        grantSparks(CONFIG.REWARDS.starfallSparks);
        grantXP(CONFIG.REWARDS.starfallXP);
        UI.toast("🌠 You caught the wishing star! +" + CONFIG.REWARDS.starfallSparks + " sparks!", 3000);
      }
    }, "🌠 STARFALL! Catch the wishing star!");
  }

  /* ---------------- Pip's heists ---------------- */
  var lastSteal = 0;
  var STEALABLE = ["earth", "leaves", "cloudsand", "sunpetal", "bellbloom", "stone", "planks", "timber"];

  function pipSteal() {
    if (!running) return;
    var now = Date.now();
    if (now - lastSteal < CONFIG.PIP.stealCooldownMs) return;
    lastSteal = now;

    setTimeout(function () {
      var inv = Store.data.player.inventory;
      var item = null;
      for (var i = 0; i < STEALABLE.length; i++) {
        if (inv[STEALABLE[i]] > 0) { item = STEALABLE[i]; break; }
      }
      var p = Player.position, yaw = Player.yaw;
      var n = NPCs.positionFoxNear(p.x - Math.sin(yaw) * 2.5, p.z - Math.cos(yaw) * 2.5);
      if (n) {
        n.target = {
          x: Math.max(3, Math.min(125, p.x + (Math.random() * 40 - 20))),
          z: Math.max(3, Math.min(125, p.z + (Math.random() * 40 - 20)))
        };
        n.moveT = 12;
        n.speed = 4.5;
        setTimeout(function () { n.speed = 1.8; }, 6000);
      }
      GameAudio.sfx.fox();
      if (item) {
        inv[item] -= 1;
        Store.save();
        UI.updateHotbar();
        UI.updateQuestHud();
        UI.toast("🦊 PIP!! He snatched 1 " + item + " and zoomed away! Sneaky fox!", 3800);
      } else {
        UI.toast("🦊 Pip zoomed by chittering! Good thing your pockets were empty!", 3200);
      }
    }, 1600);
  }

  function setMode(m) {
    mode = m;
    Game.mode = m;
    UI.updateModeButton();
    UI.toast(m === "build" ? "🧱 Build mode — tap to place blocks!" : "🔨 Gather mode — tap blocks to collect!", 1500);
  }
  function toggleMode() { setMode(mode === "gather" ? "build" : "gather"); }

  /* ---------------- day/night ---------------- */
  var skyDay = new THREE.Color(), skyCur = new THREE.Color();
  function updateDayNight() {
    // 10-minute gentle cycle; never fully dark
    var t = (Date.now() % 600000) / 600000;
    var daylight = 0.62 + 0.38 * Math.max(0.25, Math.sin(t * Math.PI * 2) * 0.5 + 0.5);
    sun.intensity = 0.9 * daylight;
    ambient.intensity = 0.35 + 0.25 * daylight;
    hemi.intensity = 0.35;
    var ang = t * Math.PI * 2;
    sun.position.set(Math.cos(ang) * 80, Math.abs(Math.sin(ang)) * 90 + 25, 40);
    skyDay.setHex(World.def.sky);
    skyCur.copy(skyDay).multiplyScalar(0.45 + 0.55 * daylight);
    if (scene.background) scene.background.copy(skyCur);
    // The Hollow (and deep holes) glow dim — lanterns shine here
    if (Player.position.y < 1) {
      ambient.intensity = 0.10;
      hemi.intensity = 0.06;
      sun.intensity = 0.04;
      if (scene.background) scene.background.setHex(0x0a0814);
      keeperGlow.intensity = 2.2;
      keeperGlow.position.set(Player.position.x, Player.position.y + 1.6, Player.position.z);
    } else {
      keeperGlow.intensity = 0;
    }
  }

  /* ---------------- main loop ---------------- */
  var lastT = performance.now();
  var statTimer = 0, gardenTimer = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    var dt = (now - lastT) / 1000;
    lastT = now;
    if (!running) return;

    Player.update(dt);
    NPCs.update(dt, Player.position);
    Creatures.update(dt, Player.position);
    updateDayNight();
    maybeStarfall();

    cloudsAbove.forEach(function (c) {
      c.position.x += dt * 0.6;
      if (c.position.x > 140) c.position.x = -12;
    });
    cloudsBelow.forEach(function (c) {
      c.position.x += dt * 1.1;
      if (c.position.x > 160) c.position.x = -32;
    });

    // block highlight + gather progress
    var hit = Player.raycastBlock(CONFIG.MOVE.reach);
    if (hit && !gathering) {
      highlightBox.visible = true;
      highlightBox.position.set(hit.block.x + 0.5, hit.block.y + 0.5, hit.block.z + 0.5);
    } else if (!gathering) {
      highlightBox.visible = false;
    }

    if (gathering) {
      var left = gathering.until - now;
      var bar = document.getElementById("gather-progress");
      bar.style.display = "block";
      document.getElementById("gather-progress-fill").style.width =
        (100 - (left / gathering.total) * 100) + "%";
      highlightBox.visible = true;
      highlightBox.position.set(gathering.x + 0.5, gathering.y + 0.5, gathering.z + 0.5);
      var s = 1 + Math.sin(now / 40) * 0.02;
      highlightBox.scale.set(s, s, s);
      if (left <= 0) { highlightBox.scale.set(1, 1, 1); finishGathering(); }
    }

    gardenTimer += dt;
    if (gardenTimer > 4) { gardenTimer = 0; Garden.tick(); tickBerries(); }

    statTimer += dt;
    if (statTimer > 5) { statTimer = 0; Stats.tickPlaytime(); Store.save(); }

    renderer.render(scene, camera);
  }

  function stop() {
    running = false;
    Game.running = false;
    Controls.setEnabled(false);
    Stats.tickPlaytime();
    Store.saveNow();
  }

  return {
    init: init, start: start, stop: stop, interact: interact, travelTo: travelTo,
    grantXP: grantXP, grantSparks: grantSparks, grantItem: grantItem,
    toggleMode: toggleMode, setMode: setMode, pipSteal: pipSteal,
    notifyEdu: notifyEdu,
    get mode() { return mode; }, set mode(v) { mode = v; },
    get selectedItem() { return selectedItem; }, set selectedItem(v) { selectedItem = v; },
    running: false
  };
})();

/* ---------------- boot ---------------- */
window.addEventListener("load", function () {
  UI.init();
  Game.init();
  UI.showHome();
  window.addEventListener("visibilitychange", function () {
    if (document.hidden) { Stats.tickPlaytime(); Store.saveNow(); }
  });
});
