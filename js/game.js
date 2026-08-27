"use strict";
/* ============================================================
   GAME — scene setup, the main loop, and the moment-to-moment
   grammar of Lumen Isles:

   tap a TREE and chop it · tap an OUTCROP and quarry it ·
   tap a WONDERSTONE and answer it · relight LIGHTSPRINGS to
   heal withered land · build bridges to floating islets ·
   descend into the sealed grotto · catch falling stars.
   ============================================================ */
var Game = (function () {
  var scene, camera, renderer;
  var sun, ambient, hemi, keeperGlow;
  var clouds = [];
  var running = false;
  var npcRaycaster = new THREE.Raycaster();
  var currentIsleState = null;

  /* ---------------- setup ---------------- */
  function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 420);
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("game-canvas"), antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    ambient = new THREE.AmbientLight(0xffffff, 0.5);
    hemi = new THREE.HemisphereLight(0xbfd9ff, 0x8a7a5e, 0.45);
    sun = new THREE.DirectionalLight(0xfff2cc, 0.8);
    sun.position.set(60, 100, 40);
    scene.add(ambient, hemi, sun);

    keeperGlow = new THREE.PointLight(0xaed4ff, 0, 13, 1.6);
    scene.add(keeperGlow);

    // soft cloud puffs — rounded, never boxes
    for (var i = 0; i < 16; i++) {
      var g = new Geo.Builder();
      var w = 3 + Math.random() * 6;
      g.blob(w, 0xffffff, { sy: 0.45 }, 0.06, 0.25);
      g.blob(w * 0.6, 0xffffff, { x: w * 0.8, y: 0.4, sy: 0.5 }, 0.06, 0.25);
      g.blob(w * 0.5, 0xffffff, { x: -w * 0.7, y: 0.2, sy: 0.5 }, 0.06, 0.25);
      var mat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.82 });
      var cloud = g.build(mat);
      var below = i >= 8;
      cloud.position.set(Math.random() * 260 - 30, below ? -30 - Math.random() * 18 : 42 + Math.random() * 12, Math.random() * 260 - 30);
      cloud.userData.speed = 0.5 + Math.random() * 0.8;
      scene.add(cloud);
      clouds.push(cloud);
    }

    initParticles();

    window.__dbg = { scene: scene, camera: camera, renderer: renderer };

    Terrain.init(scene);
    Objects.init(scene);
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
    currentIsleState = Store.isleState(isleId);
    var def = Terrain.loadIsle(isleId, currentIsleState);
    Objects.populate(def, currentIsleState);
    Build.load(scene, currentIsleState);
    Garden.load(currentIsleState);
    scene.background = new THREE.Color(def.sky);
    scene.fog = new THREE.Fog(def.fog, 80, 320);
    var sx = (def.spawn && def.spawn.x) || Terrain.CX;
    var sz = (def.spawn && def.spawn.z) || Terrain.CZ;
    Player.spawnAt(sx, sz, def.spawn && def.spawn.yaw);
    NPCs.placeAll(sx, sz);
    Creatures.populate();
    UI.toast(def.emoji + " Welcome to " + def.name + "!");
    GameAudio.say("Welcome to " + def.name + "!");
    UI.updateHud();
  }

  function start() {
    UI.hideHome();
    running = true;
    Game.running = true;
    lastEdu = Date.now();
    travelTo(Store.data.player.isle || "meadowmere");
    Controls.setEnabled(true);
    UI.updateHud();
    UI.updateQuestHud();
    Reports.maybeAutoSend();
  }

  function stop() {
    running = false;
    Game.running = false;
    Controls.setEnabled(false);
    Build.exitMode();
    UI.hideBuildSheet();
    Stats.tickPlaytime();
    Store.saveNow();
  }

  /* ---------------- rewards ---------------- */
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
    UI.updateQuestHud();
    UI.updateBuildSheet();
  }

  /* ---------------- interaction ---------------- */
  function interact() {
    if (!running) return;

    if (Build.mode) {
      if (Build.removeMode) Build.removeAim();
      else Build.place();
      return;
    }

    // friends first
    npcRaycaster.setFromCamera({ x: 0, y: 0 }, camera);
    npcRaycaster.far = 5;
    var npcHits = npcRaycaster.intersectObjects(NPCs.hitboxes(), false);
    var objHit = Objects.raycast(npcRaycaster.ray.origin, npcRaycaster.ray.direction, CONFIG.MOVE.reach);
    if (npcHits.length && (!objHit || npcHits[0].distance < objHit.dist + 0.4)) {
      UI.showDialogue(npcHits[0].object.userData.npc);
      return;
    }
    var critterHits = npcRaycaster.intersectObjects(Creatures.hitboxes(), false);
    if (critterHits.length && (!objHit || critterHits[0].distance < objHit.dist + 0.4)) {
      Creatures.playWith(critterHits[0].object.userData.creature, Player.position);
      return;
    }

    // a door you're standing at is always tappable, open or shut
    var doorHit = Build.doorRaycast(npcRaycaster.ray.origin, npcRaycaster.ray.direction, CONFIG.MOVE.reach);
    if (doorHit && (!objHit || doorHit.dist < objHit.dist)) {
      Build.toggleDoor(doorHit.piece);
      return;
    }

    // built pieces (planters, doors, tents)
    npcRaycaster.far = CONFIG.MOVE.reach;
    var pieceMeshes = Build.pieces.map(function (p) { return p.mesh; });
    var pieceHits = npcRaycaster.intersectObjects(pieceMeshes, false);
    if (pieceHits.length && (!objHit || pieceHits[0].distance < objHit.dist)) {
      var piece = pieceHits[0].object.userData.piece;
      if (piece.t === "planter") { Garden.tap(piece); return; }
      if (piece.t === "door") { Build.toggleDoor(piece); return; }
      if (piece.t === "tent") { UI.toast("⛺ Your cozy camp. Sweet dreams guaranteed."); return; }
    }

    if (!objHit) return;
    var o = objHit.obj;
    var def = o.def;

    if (def.special) { handleSpecial(o); return; }

    // ---- gathering ----
    var p = Store.data.player;
    var res = Objects.hit(o, { toolTier: p.toolTier, tools: p.tools });
    if (res.blocked === "tier") {
      GameAudio.sfx.wrong();
      UI.toast("🔨 You need a better mallet for " + def.name.toLowerCase() + "!");
      return;
    }
    GameAudio.sfx.gather();
    burst(o.x, o.y + def.rayY, o.z, def.drops0 ? 0xffd75e : 0x9adb7a, 8);
    if (res.done) {
      Stats.recordGather();
      grantXP(CONFIG.REWARDS.gatherXP);
      var parts = [];
      Object.keys(res.drops).forEach(function (k) {
        grantItem(k, res.drops[k]);
        parts.push("+" + res.drops[k] + " " + (ITEM_ICON[k] || "") + " " + k);
      });
      UI.gainPopup(parts.join("   "));
      if (res.drops.aurorium) { grantSparks(2); grantXP(5); UI.toast("🌈 AURORIUM! Super rare!"); }
      else if (res.drops.moonpearl) { grantSparks(1); UI.toast("🌙 Moonpearl! +1 spark"); }
      if (res.drops["skysteel ore"] && !p.tools.kiln && (p.inventory["skysteel ore"] || 0) <= 2) {
        UI.toast("🔩 Raw skysteel ore! Wren the Tinker can teach you to SMELT this...", 3200);
      }
      if (Math.random() < 0.02) {
        var who = Math.random() < 0.5 ? "Finch" : "Poppy";
        UI.toast((who === "Finch" ? "👦 " : "👧 ") + who + ": Nice gathering, " + Store.profile.name + "!");
      }
    }
  }

  function handleSpecial(o) {
    var p = Store.data.player;
    if (o.type === "wonderstone") {
      UI.showChallenge("node", function (result) {
        if (result.correct && !result.skipped) {
          burst(o.x, o.y + 1, o.z, 0x54c2b9, 16);
          Objects.remove(o);
          grantSparks(CONFIG.REWARDS.wonderstoneSparks);
          grantXP(CONFIG.REWARDS.wonderstoneXP);
          GameAudio.sfx.gather();
          var bonus = ["stone", "timber", "berries"][Math.floor(Math.random() * 3)];
          grantItem(bonus, 2);
          UI.toast("✨ +" + CONFIG.REWARDS.wonderstoneSparks + " sparks!  🎒 +2 " + bonus);
        }
      }, "🔮 Wonderstone!");
      return;
    }
    if (o.type === "chest") {
      UI.showChallenge("chest", function (result) {
        if (result.correct && !result.skipped) {
          burst(o.x, o.y + 0.6, o.z, 0xf2ca55, 16);
          Objects.remove(o);
          grantSparks(CONFIG.REWARDS.chestSparks);
          grantXP(CONFIG.REWARDS.chestXP);
          var rolls = [["timber", 4], ["claybrick", 4], ["glowmoss", 2], ["glass", 2],
                       ["sunfruit seeds", 2], ["moonmelon seeds", 2], ["fluff", 3]];
          var loot = rolls[Math.floor(Math.random() * rolls.length)];
          grantItem(loot[0], loot[1]);
          UI.toast("🧰 Treasure! +" + CONFIG.REWARDS.chestSparks + " sparks and " + loot[1] + " " + loot[0] + "!");
        }
      }, "🧰 Curio Chest!");
      return;
    }
    if (o.type === "spring") { springFlow(o); return; }
    if (o.type === "grottodoor") {
      if (!p.tools.drill) {
        GameAudio.sfx.wrong();
        UI.toast("🌀 Sealed tight. Elder Alder's ROOTBREAKER DRILL could open this...", 3400);
        return;
      }
      fadeTo(function () {
        Terrain.enterGrotto();
        Objects.setGrottoVisibility(true);
        var gr = Terrain.grotto;
        Player.spawnAt(gr.x, gr.z + gr.r - 5, Math.PI);
        scene.background = new THREE.Color(0x0a0814);
        scene.fog = new THREE.Fog(0x0a0814, 6, 42);
        addGrottoLights();
        UI.toast("🌀 The Hollow Grotto... crystals hum in the dark.", 3000);
      });
      return;
    }
    if (o.type === "grottoexit") {
      fadeTo(function () {
        Terrain.exitGrotto();
        Objects.setGrottoVisibility(false);
        removeGrottoLights();
        var spot = Terrain.grottoDoorSpot();
        Player.spawnAt(spot.x, spot.z);
        scene.background = new THREE.Color(Terrain.def.sky);
        scene.fog = new THREE.Fog(Terrain.def.fog, 80, 320);
      });
      return;
    }
    if (o.type === "anchor") { anchorInfo(o); return; }
  }

  /* ---------------- Lightspring restoration ---------------- */
  function springCost() {
    var lvl = Store.data.player.level;
    return lvl >= 6 ? { timber: 8, stone: 6, glowmoss: 1 } :
           lvl >= 3 ? { timber: 6, stone: 4 } : { timber: 4, stone: 2 };
  }

  function springFlow(o) {
    var zone = o.zone;
    if (zone.restored) {
      burst(o.x, o.y + 2, o.z, 0xbff2ff, 10);
      GameAudio.sfx.spark();
      UI.toast("⛲ The Lightspring hums happily. This land is healed!");
      return;
    }
    var cost = springCost();
    var afford = Build.canAfford(cost);
    UI.openOverlay(
      "<div class='ch-title'>⛲ A dormant Lightspring</div>" +
      "<div class='sentence-text'>The land around it is gray and sleeping. Offer materials and answer the " +
      "<b>Rite of Light</b> — two challenges — to wake it!</div>" +
      "<div class='ch-sub'>Offering: " + Build.costStr(cost) + (afford ? " ✓" : " — keep gathering!") + "</div>" +
      (afford ? "<button class='big-btn' id='sp-go'>🕯️ BEGIN THE RITE</button>" : "") +
      "<button class='ghost-btn' id='sp-later'>Maybe later</button>"
    );
    GameAudio.sfx.quest();
    document.getElementById("sp-later").addEventListener("pointerdown", UI.closeOverlay);
    var go = document.getElementById("sp-go");
    if (go) go.addEventListener("pointerdown", function () {
      UI.showChallenge("super", function (r1) {
        if (!r1.correct || r1.skipped) { UI.toast("The spring stays quiet... try again soon!"); return; }
        UI.showChallenge("super", function (r2) {
          if (!r2.correct || r2.skipped) { UI.toast("So close! The spring flickered. Try again soon!"); return; }
          var inv = Store.data.player.inventory;
          Object.keys(cost).forEach(function (k) { inv[k] -= cost[k]; });
          restoreZone(o, zone);
        }, "🕯️ Rite of Light (2 of 2)");
      }, "🕯️ Rite of Light (1 of 2)");
    });
  }

  var restoreAnim = null;
  function restoreZone(o, zone) {
    zone.restored = true;
    if (!currentIsleState.springs) currentIsleState.springs = [];
    currentIsleState.springs.push(zone.id);
    Store.save();
    restoreAnim = { zone: zone, t: 0 };
    GameAudio.sfx.levelup();
    GameAudio.say("The Lightspring awakens! The land remembers how to bloom!");
    burst(o.x, o.y + 2, o.z, 0xbff2ff, 24);
    grantSparks(6);
    grantXP(40);
    var total = Terrain.zones.length;
    var done = Terrain.zones.filter(function (z) { return z.restored; }).length;
    setTimeout(function () {
      if (done >= total) {
        UI.toast("🌟 ALL LIGHTSPRINGS RESTORED! The bridge anchors to the sky islets are glowing!", 4200);
        GameAudio.say("You restored the whole isle! Now the sky islets await — build bridges from the glowing anchors!");
      } else {
        UI.toast("⛲ Lightspring restored! " + (total - done) + " more and the whole isle shines!", 3600);
      }
      UI.updateHud();
    }, 2600);
  }

  function tickRestore(dt) {
    if (!restoreAnim) return;
    restoreAnim.t += dt;
    var zone = restoreAnim.zone;
    zone.progress = Math.min(1, restoreAnim.t / 2.5);
    if (restoreAnim.recolorAccum === undefined) restoreAnim.recolorAccum = 0;
    restoreAnim.recolorAccum += dt;
    if (restoreAnim.recolorAccum > 0.12) {
      restoreAnim.recolorAccum = 0;
      Terrain.recolorGround();
    }
    if (zone.progress >= 1) {
      Terrain.recolorGround();
      Objects.reviveZone(zone);
      restoreAnim = null;
    }
  }

  /* ---------------- bridges & islets ---------------- */
  function anchorPair(idx) {
    var a = Objects.byId("anchorA" + idx), b = Objects.byId("anchorB" + idx);
    return a && b ? { a: a, b: b } : null;
  }

  function springsAllRestored() {
    return Terrain.zones.length > 0 && Terrain.zones.every(function (z) { return z.restored; });
  }

  function anchorInfo(o) {
    var idx = o.id.indexOf("anchorA") === 0 ? o.id.slice(7) : o.id.slice(7);
    var pair = anchorPair(idx);
    if (!springsAllRestored() && Terrain.zones.length) {
      UI.toast("🪢 This anchor sleeps until every Lightspring on the isle is restored...", 3400);
      return;
    }
    if (currentIsleState.bridges && currentIsleState.bridges[idx]) {
      UI.toast("🌉 Your bridge sings in the wind. The islet is yours!");
      return;
    }
    UI.toast("🪢 Build BRIDGE pieces (🛠️ build mode) from here toward the far islet!", 3600);
    GameAudio.sfx.quest();
  }

  function checkBridges() {
    if (!currentIsleState.bridges) currentIsleState.bridges = {};
    Terrain.islets.forEach(function (it, idx) {
      if (currentIsleState.bridges[idx]) return;
      var pair = anchorPair(idx);
      if (!pair) return;
      var dist = Math.hypot(pair.b.x - pair.a.x, pair.b.z - pair.a.z);
      var needed = Math.max(2, Math.ceil((dist - 6) / 4));
      var have = Build.bridgePiecesNear(pair.a.x, pair.a.z, pair.b.x, pair.b.z);
      if (have >= needed) {
        currentIsleState.bridges[idx] = true;
        Store.save();
        grantSparks(8);
        grantXP(60);
        GameAudio.sfx.levelup();
        GameAudio.say("You connected a sky islet! What an explorer!");
        UI.toast("🌉 SKY ISLET CONNECTED! +8 sparks — explore your new land!", 4200);
      }
    });
  }

  /* ---------------- grotto crystal glow ---------------- */
  var grottoLights = [];
  function addGrottoLights() {
    removeGrottoLights();
    var colors = { moonpearl: 0xd9c2f2, aurorium: 0x7af2d0, wonderstone: 0x54c2b9 };
    ["gc0", "gc1", "gc2", "gc3", "gc4", "gw0", "gw1", "gw2"].forEach(function (id) {
      if (grottoLights.length >= 5) return;
      var o = Objects.byId(id);
      if (!o || o.gone) return;
      var light = new THREE.PointLight(colors[o.type] || 0xb0a2e8, 1.6, 12, 1.8);
      light.position.set(o.x, o.y + 1.6, o.z);
      scene.add(light);
      grottoLights.push(light);
    });
  }
  function removeGrottoLights() {
    grottoLights.forEach(function (l) { scene.remove(l); });
    grottoLights = [];
  }

  /* ---------------- fade transition ---------------- */
  function fadeTo(fn) {
    var el = document.getElementById("fade");
    el.style.opacity = 1;
    setTimeout(function () {
      fn();
      setTimeout(function () { el.style.opacity = 0; }, 250);
    }, 320);
  }

  /* ---------------- particles ---------------- */
  var particles = null, pData = [];
  function initParticles() {
    var N = 90;
    var geo = new THREE.BufferGeometry();
    var pos = new Float32Array(N * 3);
    var col = new Float32Array(N * 3);
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    var mat = new THREE.PointsMaterial({ size: 0.34, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false });
    particles = new THREE.Points(geo, mat);
    particles.frustumCulled = false;
    scene.add(particles);
    for (var i = 0; i < N; i++) pData.push({ life: 0, vx: 0, vy: 0, vz: 0 });
  }

  function burst(x, y, z, colorHex, n) {
    var col = new THREE.Color(colorHex);
    var pos = particles.geometry.attributes.position;
    var colors = particles.geometry.attributes.color;
    var spawned = 0;
    for (var i = 0; i < pData.length && spawned < n; i++) {
      var pd = pData[i];
      if (pd.life > 0) continue;
      pd.life = 0.7 + Math.random() * 0.5;
      pd.vx = (Math.random() - 0.5) * 3.2;
      pd.vy = 2 + Math.random() * 2.6;
      pd.vz = (Math.random() - 0.5) * 3.2;
      pos.setXYZ(i, x + (Math.random() - 0.5) * 0.6, y, z + (Math.random() - 0.5) * 0.6);
      colors.setXYZ(i, col.r, col.g, col.b);
      spawned++;
    }
    pos.needsUpdate = true;
    colors.needsUpdate = true;
  }

  function tickParticles(dt) {
    var pos = particles.geometry.attributes.position;
    var any = false;
    for (var i = 0; i < pData.length; i++) {
      var pd = pData[i];
      if (pd.life <= 0) continue;
      any = true;
      pd.life -= dt;
      pd.vy -= 7 * dt;
      pos.setXYZ(i,
        pos.getX(i) + pd.vx * dt,
        pd.life <= 0 ? -999 : pos.getY(i) + pd.vy * dt,
        pos.getZ(i) + pd.vz * dt);
    }
    if (any) pos.needsUpdate = true;
  }

  /* ---------------- STARFALL ---------------- */
  var lastEdu = Date.now();
  function notifyEdu() { lastEdu = Date.now(); }

  var fallingStar = null;
  function maybeStarfall() {
    if (!running || fallingStar) return;
    if (document.getElementById("overlay").classList.contains("open")) return;
    if (Date.now() - lastEdu < CONFIG.LEARN.starfallMinutes * 60 * 1000) return;
    lastEdu = Date.now();
    // a glowing star tumbles from the sky ahead of the player
    var g = new Geo.Builder();
    g.blob(0.7, 0xfff3c4, {}, 0.1, 0.2);
    g.cone(0.25, 1.4, 4, 0xffd75e, { y: 0.5, rx: Math.PI }, 0, 0);
    var star = g.build(new THREE.MeshBasicMaterial({ vertexColors: true }));
    var p = Player.position, yaw = Player.yaw;
    star.position.set(p.x - Math.sin(yaw) * 10, p.y + 26, p.z - Math.cos(yaw) * 10);
    scene.add(star);
    fallingStar = { mesh: star, t: 0 };
    GameAudio.sfx.starfall();
    GameAudio.say("A star is falling! Catch it quick!");
  }

  function tickStarfall(dt) {
    if (!fallingStar) return;
    fallingStar.t += dt;
    fallingStar.mesh.position.y -= dt * 14;
    fallingStar.mesh.rotation.y += dt * 6;
    burst(fallingStar.mesh.position.x, fallingStar.mesh.position.y, fallingStar.mesh.position.z, 0xffe08a, 1);
    if (fallingStar.t > 1.5) {
      scene.remove(fallingStar.mesh);
      fallingStar = null;
      UI.showChallenge("starfall", function (result) {
        if (result.correct && !result.skipped) {
          grantSparks(CONFIG.REWARDS.starfallSparks);
          grantXP(CONFIG.REWARDS.starfallXP);
          UI.toast("🌠 You caught the wishing star! +" + CONFIG.REWARDS.starfallSparks + " sparks!", 3000);
        }
      }, "🌠 STARFALL! Catch the wishing star!");
    }
  }

  /* ---------------- Pip's heists ---------------- */
  var lastSteal = 0;
  var STEALABLE = ["leaves", "sunpetal", "bellbloom", "stone", "timber", "berries"];

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
          x: Math.max(3, Math.min(Terrain.SX - 3, p.x + (Math.random() * 40 - 20))),
          z: Math.max(3, Math.min(Terrain.SZ - 3, p.z + (Math.random() * 40 - 20)))
        };
        n.moveT = 12;
        n.speed = 4.5;
        setTimeout(function () { n.speed = 1.8; }, 6000);
      }
      GameAudio.sfx.fox();
      if (item) {
        inv[item] -= 1;
        Store.save();
        UI.updateQuestHud();
        UI.toast("🦊 PIP!! He snatched 1 " + item + " and zoomed away! Sneaky fox!", 3800);
      } else {
        UI.toast("🦊 Pip zoomed by chittering! Good thing your pockets were empty!", 3200);
      }
    }, 1600);
  }

  /* ---------------- build mode toggle ---------------- */
  function toggleMode() {
    if (Build.mode) {
      Build.exitMode();
      UI.hideBuildSheet();
      UI.toast("🔍 Explore mode", 1200);
    } else {
      Build.enterMode();
      UI.showBuildSheet();
      UI.toast("🛠️ Build mode — pick a piece, aim, tap to place!", 2200);
    }
    UI.updateModeButton();
  }

  /* ---------------- prompt (contextual interaction hint) ---------------- */
  var promptTimer = 0;
  function updatePrompt(dt) {
    promptTimer += dt;
    if (promptTimer < 0.12) return;
    promptTimer = 0;
    if (Build.mode) {
      var gp = Build.ghostPose;
      if (Build.removeMode) UI.setPrompt("🧹", "Tap a piece to take it back", null);
      else if (gp && !gp.valid && gp.reason) UI.setPrompt("🛠️", gp.reason, null);
      else UI.setPrompt("🛠️", "Tap to place " + Build.pieceDef(Build.activePiece).name.toLowerCase(), null);
      return;
    }
    npcRaycaster.setFromCamera({ x: 0, y: 0 }, camera);
    npcRaycaster.far = 5;
    var npcHits = npcRaycaster.intersectObjects(NPCs.hitboxes(), false);
    if (npcHits.length) {
      var n = npcHits[0].object.userData.npc;
      UI.setPrompt(n.def.fox ? "🦊" : "💬", n.def.name + " · tap to " + (n.def.fox ? "pet" : "talk"), null);
      return;
    }
    var critterHits = npcRaycaster.intersectObjects(Creatures.hitboxes(), false);
    if (critterHits.length) {
      var a = critterHits[0].object.userData.creature;
      UI.setPrompt(a.def.emoji, a.type + " · tap to play!", null);
      return;
    }
    var objHit = Objects.raycast(npcRaycaster.ray.origin, npcRaycaster.ray.direction, CONFIG.MOVE.reach);
    if (objHit) {
      var o = objHit.obj;
      if (o.def.special) {
        var labels = {
          wonderstone: "tap to answer!", chest: "tap to open!", spring: o.zone && o.zone.restored ? "healed & humming" : "tap to restore!",
          grottodoor: Store.data.player.tools.drill ? "tap to enter!" : "sealed — needs the drill",
          grottoexit: "tap to climb out", anchor: "tap to check"
        };
        UI.setPrompt(o.def.icon, o.def.name + " · " + (labels[o.type] || "tap!"), null);
      } else {
        var frac = o.hp / o.def.taps;
        UI.setPrompt(o.def.icon, o.def.name + " · tap to " + o.def.verb + "!", frac);
      }
      return;
    }
    var dh = Build.doorRaycast(npcRaycaster.ray.origin, npcRaycaster.ray.direction, CONFIG.MOVE.reach);
    if (dh) {
      UI.setPrompt("🚪", dh.piece.open ? "Door · tap to close" : "Door · tap to open", null);
      return;
    }
    var tappable = Build.pieces.filter(function (p) { return p.t === "planter" || p.t === "door"; })
                              .map(function (p) { return p.mesh; });
    if (tappable.length) {
      npcRaycaster.far = CONFIG.MOVE.reach;
      var ph = npcRaycaster.intersectObjects(tappable, false);
      if (ph.length) {
        var hp = ph[0].object.userData.piece;
        if (hp.t === "door") UI.setPrompt("🚪", hp.open ? "Door · tap to close" : "Door · tap to open", null);
        else UI.setPrompt("🌱", Garden.promptFor(hp), null);
        return;
      }
    }
    UI.setPrompt(null);
  }

  /* ---------------- day / night ---------------- */
  var skyDay = new THREE.Color(), skyCur = new THREE.Color();
  function updateDayNight() {
    var t = (Date.now() % 600000) / 600000;
    var daylight = 0.62 + 0.38 * Math.max(0.25, Math.sin(t * Math.PI * 2) * 0.5 + 0.5);
    sun.intensity = 0.85 * daylight;
    ambient.intensity = 0.4 + 0.25 * daylight;
    hemi.intensity = 0.45;
    var ang = t * Math.PI * 2;
    sun.position.set(Math.cos(ang) * 80, Math.abs(Math.sin(ang)) * 90 + 25, 40);
    if (Terrain.inGrotto) {
      ambient.intensity = 0.22;
      hemi.intensity = 0.1;
      sun.intensity = 0.03;
      keeperGlow.intensity = 2.2;
      keeperGlow.position.set(Player.position.x, Player.position.y + 1.7, Player.position.z);
    } else {
      keeperGlow.intensity = 0;
      skyDay.setHex(Terrain.def.sky);
      skyCur.copy(skyDay).multiplyScalar(0.45 + 0.55 * daylight);
      if (scene.background) scene.background.copy(skyCur);
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
    Objects.tick(dt, now / 1000);
    Build.updateGhost();
    updateDayNight();
    maybeStarfall();
    tickStarfall(dt);
    tickRestore(dt);
    tickParticles(dt);
    updatePrompt(dt);

    clouds.forEach(function (c) {
      c.position.x += dt * c.userData.speed;
      if (c.position.x > 240) c.position.x = -40;
    });

    gardenTimer += dt;
    if (gardenTimer > 4) { gardenTimer = 0; Garden.tick(); }

    statTimer += dt;
    if (statTimer > 5) { statTimer = 0; Stats.tickPlaytime(); Store.save(); }

    renderer.render(scene, camera);
  }

  return {
    init: init, start: start, stop: stop, interact: interact, travelTo: travelTo,
    grantXP: grantXP, grantSparks: grantSparks, grantItem: grantItem,
    toggleMode: toggleMode, pipSteal: pipSteal, notifyEdu: notifyEdu,
    checkBridges: checkBridges, springsAllRestored: springsAllRestored,
    burst: burst,
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
