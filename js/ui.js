"use strict";
/* ============================================================
   UI — HUD, hotbar, pack, crafting, kiln, dialogue, menus,
   level-ups, home screen, and the challenge wrapper that ties
   the Learning engine to the Activities renderers.
   ============================================================ */
var UI = (function () {
  var $ = function (id) { return document.getElementById(id); };

  var RANKS = ["Firefly Friend", "Meadow Scout", "Brook Wanderer", "Fern Finder",
    "Hollow Hiker", "Star Gazer", "Isle Explorer", "Grove Guardian",
    "Crystal Seeker", "Cloud Skipper",
    "Storm Chaser", "Sky Sailor", "Beacon Bearer", "Wildwood Warden",
    "Aurora Ranger", "Moonpearl Diver", "Sunforge Smith", "Glimmer Sage",
    "Root Delver", "Skyrider", "Star Cartographer", "Isle Architect",
    "Lantern Master", "Horizon Keeper", "Twilight Warden", "Radiant Pathfinder",
    "Voyager of the Veil", "Master of the Isles", "Luminary", "KEEPER OF LIGHT"];

  function rankFor(level) {
    if (level <= RANKS.length) return RANKS[level - 1];
    return "Keeper of Light " + (level - RANKS.length + 1);
  }

  function xpNeeded(level) {
    var n = level - 1;
    var R = CONFIG.REWARDS;
    return R.xpBase + n * R.xpLinear + n * n * R.xpQuad;
  }

  /* ---------------- toast ---------------- */
  var toastTimer = null;
  function toast(msg, ms) {
    var t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, ms || 2600);
  }

  /* ---------------- HUD ---------------- */
  function updateHud() {
    var p = Store.data.player;
    $("level-label").textContent = "Lv " + p.level;
    $("rank-label").textContent = rankFor(p.level);
    $("sparks-label").textContent = CONFIG.BRAND.currencyIcon + " " + p.sparks;
    var need = xpNeeded(p.level);
    $("xp-fill").style.width = Math.min(100, (p.xp / need) * 100) + "%";
  }

  function updateQuestHud() {
    var q = Quests.active();
    var el = $("quest-hud");
    if (!q) { el.style.display = "none"; return; }
    el.style.display = "flex";
    var have = Math.min(Store.data.player.inventory[q.ask] || 0, q.count);
    $("quest-hud-text").textContent = q.icon + " " + have + "/" + q.count +
      (have >= q.count ? "  ✅ Go see " + q.giver + "!" : "");
  }

  /* ---------------- hotbar ---------------- */
  var selectedIndex = -1;
  function hotbarItems() {
    var inv = Store.data.player.inventory;
    var hand = ["bucket", "water bucket", "sunfruit seeds", "moonmelon seeds"].filter(function (k) { return (inv[k] || 0) > 0; });
    var placeable = Object.keys(inv).filter(function (k) {
      return inv[k] > 0 && ITEM_TO_BLOCK[k] !== undefined && hand.indexOf(k) < 0;
    });
    return hand.concat(placeable).slice(0, 8);
  }

  function updateHotbar() {
    var bar = $("hotbar");
    bar.innerHTML = "";
    var items = hotbarItems();
    var inv = Store.data.player.inventory;
    items.forEach(function (item, i) {
      var slot = document.createElement("div");
      slot.className = "slot" + (i === selectedIndex ? " selected" : "");
      slot.innerHTML = "<span class='slot-icon'>" + (ITEM_ICON[item] || "⬜") +
        "</span><span class='slot-count'>" + inv[item] + "</span>";
      slot.addEventListener("pointerdown", function (e) {
        e.stopPropagation();
        selectHotbar(i);
      });
      bar.appendChild(slot);
    });
    if (selectedIndex >= items.length) selectedIndex = -1;
    updateCraftButton();
  }

  function selectHotbar(i) {
    var items = hotbarItems();
    if (i < 0 || i >= items.length) return;
    selectedIndex = i;
    Game.selectedItem = items[i];
    var isSeed = items[i].indexOf("seeds") >= 0;
    if (Game.mode !== "build" && !isSeed && items[i] !== "bucket") Game.setMode("build");
    updateHotbar();
  }

  function selectedItem() {
    var items = hotbarItems();
    return selectedIndex >= 0 && selectedIndex < items.length ? items[selectedIndex] : null;
  }

  function updateModeButton() {
    $("btn-mode").textContent = Game.mode === "gather" ? "🔨" : "🧱";
    $("btn-mode").classList.toggle("build", Game.mode === "build");
  }

  /* ---------------- pack (inventory) screen ---------------- */
  function showInventory() {
    var p = Store.data.player;
    var inv = p.inventory;
    var items = Object.keys(inv).filter(function (k) { return inv[k] > 0; });

    var grid = items.length
      ? items.map(function (item) {
          var placeable = ITEM_TO_BLOCK[item] !== undefined;
          return "<button class='inv-slot" + (placeable ? "" : " inv-flat") + "' data-item='" + item + "'>" +
            "<span class='inv-icon'>" + (ITEM_ICON[item] || "⬜") + "</span>" +
            "<span class='inv-count'>" + inv[item] + "</span>" +
            "<span class='inv-name'>" + item + "</span></button>";
        }).join("")
      : "<div class='ch-sub'>Your pack is empty — go gather something!</div>";

    var malletNames = ["Timber Mallet", "Stone Mallet", "Skysteel Mallet", "Starstone Mallet"];
    var toolsHtml = "<div class='inv-tools'>" +
      "<span class='inv-tool'>🔨 " + malletNames[p.toolTier] + "</span>" +
      (p.tools.drill ? "<span class='inv-tool legendary'>🌀 Rootbreaker Drill</span>" : "") +
      (p.tools.skybadge ? "<span class='inv-tool legendary'>🎈 Skyrider Badge</span>" : "") +
      (p.tools.sunhammer ? "<span class='inv-tool legendary'>☀️ Sunforged Mallet</span>" : "") +
      (p.tools.spade ? "<span class='inv-tool'>🥄 Spade</span>" : "") +
      (p.tools.hatchet ? "<span class='inv-tool'>🪓 Hatchet</span>" : "") +
      (p.tools.brush ? "<span class='inv-tool'>🖌️ Brush</span>" : "") +
      (p.tools.kiln ? "<button class='inv-tool legendary inv-station'>🔥 Sky Kiln</button>" : "") +
      (p.tools.lanternkit ? "<button class='inv-tool legendary inv-station'>🏮 Lantern Kit</button>" : "") +
      "</div>";

    openOverlay(
      "<div class='ch-title'>🎒 " + Store.profile.name + "'s Pack</div>" +
      "<div class='ch-sub'>" + CONFIG.BRAND.currencyIcon + " " + p.sparks + " sparks · Lv " + p.level + " " + rankFor(p.level) + "</div>" +
      toolsHtml +
      "<div class='inv-grid'>" + grid + "</div>" +
      "<div class='ch-sub'>Tap a block to build with it!</div>" +
      "<button class='big-btn' id='inv-close'>BACK TO THE GAME</button>"
    );
    $("inv-close").addEventListener("pointerdown", closeOverlay);
    document.querySelectorAll(".inv-station").forEach(function (b) {
      b.addEventListener("pointerdown", function (e) {
        e.stopPropagation();
        closeOverlay();
        doKiln();
      });
    });
    document.querySelectorAll(".inv-slot").forEach(function (slot) {
      slot.addEventListener("pointerdown", function () {
        var item = slot.getAttribute("data-item");
        if (ITEM_TO_BLOCK[item] === undefined) {
          if (item === "bucket" || item === "water bucket") {
            closeOverlay();
            Game.selectedItem = item;
            var idxB = hotbarItems().indexOf(item);
            if (idxB >= 0) selectHotbar(idxB);
            toast(item === "bucket" ? "🪣 Tap a water block to fill it!" : "💧 Tap to pour a pool!");
            return;
          }
          if (item.indexOf("seeds") >= 0) {
            closeOverlay();
            Game.selectedItem = item;
            var idxS = hotbarItems().indexOf(item);
            if (idxS >= 0) selectHotbar(idxS);
            toast("🌱 Tap a garden bed to plant " + item + "!");
            return;
          }
          GameAudio.sfx.pop();
          toast(item === "berries" ? "🫐 Yummy berries! Someone might want these..." :
            item === "sunfruit" ? "🍊 Sweet sunfruit, fresh from the garden!" :
            item === "moonmelon" ? "🍈 A cool moonmelon — great trade goods!" :
            item === "skysteel ore" ? "🔩 Raw skysteel ore — smelt it in Wren's kiln!" :
            item === "skysteel" ? "⚙️ A skysteel ingot — craft a bucket or a better mallet!" :
            item === "rods" ? "🥢 Rods — craft ladders, fences, a spade, or a hatchet!" :
            item === "feather" ? "🪶 A soft puffbird feather." :
            item === "shell" ? "🐚 A shiny shellhopper shell." :
            item === "glowdust" ? "💫 Twinkling glowdust from a glowmoth." :
            item === "berry tart" ? "🥧 A warm berry tart. Mmm!" :
            "You can't place " + item + " — but it might be useful!");
          return;
        }
        closeOverlay();
        Game.selectedItem = item;
        Game.setMode("build");
        var idx = hotbarItems().indexOf(item);
        if (idx >= 0) selectHotbar(idx);
        toast("🧱 Building with " + item + "!");
      });
    });
  }

  function toggleInventory() {
    if ($("overlay").classList.contains("open")) closeOverlay();
    else if (Game.running) showInventory();
  }

  /* ---------------- crafting ---------------- */
  var CRAFTS = [
    { tier: 1, name: "stone mallet", level: 2, needs: { stone: 5, timber: 2 }, icon: "🔨" },
    { tier: 2, name: "skysteel mallet", level: 4, needs: { skysteel: 4, timber: 2 }, icon: "🔨" },
    { tier: 3, name: "starstone mallet", level: 6, needs: { starstone: 3, timber: 2 }, icon: "🔨" }
  ];

  var WORKSHOP = [
    { id: "planks", kind: "build", name: "4 planks", icon: "🟧", needs: { timber: 1 }, gives: { planks: 4 } },
    { id: "rods", kind: "build", name: "4 rods", icon: "🥢", needs: { planks: 2 }, gives: { rods: 4 } },
    { id: "door", kind: "build", name: "door", icon: "🚪", needs: { planks: 6 }, gives: { door: 1 } },
    { id: "ladder", kind: "build", name: "3 ladders", icon: "🪜", needs: { rods: 7 }, gives: { ladder: 3 } },
    { id: "fence", kind: "build", name: "3 fences", icon: "🚧", needs: { planks: 2, rods: 4 }, gives: { fence: 3 } },
    { id: "bedroll", kind: "build", name: "bedroll", icon: "🛏️", needs: { fluff: 3, planks: 3 }, gives: { bedroll: 1 } },
    { id: "bench", kind: "build", name: "tinker bench", icon: "🛠️", needs: { planks: 4 }, gives: { "tinker bench": 1 } },
    { id: "garden", kind: "build", name: "2 garden beds", icon: "🟫", needs: { earth: 2, timber: 1 }, gives: { "garden bed": 2 },
      blurb: "Plant seeds and grow sunfruit!" },
    { id: "spade", kind: "tool", tool: "spade", name: "spade", icon: "🥄",
      needs: { stone: 3, rods: 2 }, blurb: "Digs earth, sand, and snow extra fast!" },
    { id: "hatchet", kind: "tool", tool: "hatchet", name: "hatchet", icon: "🪓",
      needs: { stone: 3, rods: 2 }, blurb: "Chops timber and leaves extra fast!" },
    { id: "brush", kind: "tool", tool: "brush", name: "brush", icon: "🖌️",
      needs: { rods: 2, fluff: 1 }, blurb: "Brush tuftles for fluff — they love it!" },
    { id: "bucket", kind: "tool", name: "bucket", icon: "🪣",
      needs: { skysteel: 3 }, gives: { bucket: 1 }, blurb: "Scoop water, then pour a pool anywhere!" }
  ];

  function canAfford(needs) {
    var inv = Store.data.player.inventory;
    return Object.keys(needs).every(function (k) { return (inv[k] || 0) >= needs[k]; });
  }
  function takeNeeds(needs) {
    var inv = Store.data.player.inventory;
    Object.keys(needs).forEach(function (k) { inv[k] -= needs[k]; });
  }
  function giveItems(gives) {
    var inv = Store.data.player.inventory;
    Object.keys(gives).forEach(function (k) { inv[k] = (inv[k] || 0) + gives[k]; });
  }

  function availableCraft() {
    var p = Store.data.player;
    var next = CRAFTS[p.toolTier];
    if (!next || p.level < next.level) return null;
    return canAfford(next.needs) ? next : null;
  }
  function nextCraftInfo() { return CRAFTS[Store.data.player.toolTier] || null; }

  function availableWorkshop() {
    var p = Store.data.player;
    return WORKSHOP.filter(function (r) {
      if (r.tool && p.tools[r.tool]) return false;
      return canAfford(r.needs);
    });
  }
  function visibleWorkshop() {
    var p = Store.data.player;
    return WORKSHOP.filter(function (r) { return !(r.tool && p.tools[r.tool]); });
  }
  function costStr(needs) {
    return Object.keys(needs).map(function (k) { return needs[k] + " " + k; }).join(" + ");
  }

  function updateCraftButton() {
    var b = $("btn-craft");
    b.style.display = (availableCraft() || availableWorkshop().length) ? "block" : "none";
    var s = $("btn-kiln");
    if (s) s.style.display = availableKiln().length ? "block" : "none";
  }

  /* ---------------- Wren's kiln recipes ---------------- */
  var KILN = [
    { need: "kiln", needs: { "skysteel ore": 1, emberstone: 1 }, gives: { skysteel: 1 }, name: "skysteel ingot", icon: "⚙️" },
    { need: "kiln", needs: { cloudsand: 1, emberstone: 1 }, gives: { glass: 1 }, name: "glass", icon: "🪟" },
    { need: "kiln", needs: { berries: 2, emberstone: 1 }, gives: { "berry tart": 1 }, name: "berry tart", icon: "🥧" },
    { need: "lanternkit", needs: { timber: 1, emberstone: 1 }, gives: { lantern: 4 }, name: "4 lanterns", icon: "🏮" }
  ];

  function availableKiln() {
    var p = Store.data.player;
    var inv = p.inventory;
    return KILN.filter(function (r) {
      if (!p.tools[r.need]) return false;
      return Object.keys(r.needs).every(function (k) { return (inv[k] || 0) >= r.needs[k]; });
    });
  }

  function doKiln() {
    var recipes = availableKiln();
    if (!recipes.length) { toast("Need emberstone plus ore (or sand, berries, timber) for the kiln!"); return; }
    var html = "<div class='ch-title'>🔥 Sky Kiln</div>" +
      "<div class='ch-sub'>Wren's kiln glows and hums. What shall we make?</div>" +
      "<div class='world-list'>" + recipes.map(function (r, i) {
        var cost = Object.keys(r.needs).map(function (k) { return r.needs[k] + " " + k; }).join(" + ");
        return "<button class='world-card kiln-card' data-i='" + i + "'>" +
          "<span class='world-emoji'>" + r.icon + "</span>" +
          "<span class='world-name'>Make " + r.name + "</span>" +
          "<span class='world-req'>" + cost + "</span></button>";
      }).join("") + "</div>" +
      "<button class='ghost-btn' id='kiln-back'>⬅️ BACK</button>";
    openOverlay(html);
    $("kiln-back").addEventListener("pointerdown", closeOverlay);
    document.querySelectorAll(".kiln-card").forEach(function (card) {
      card.addEventListener("pointerdown", function () {
        var r = recipes[+card.getAttribute("data-i")];
        var inv = Store.data.player.inventory;
        if (!Object.keys(r.needs).every(function (k) { return (inv[k] || 0) >= r.needs[k]; })) return;
        Object.keys(r.needs).forEach(function (k) { inv[k] -= r.needs[k]; });
        Object.keys(r.gives).forEach(function (k) { inv[k] = (inv[k] || 0) + r.gives[k]; });
        Store.save();
        GameAudio.sfx.kiln();
        toast(r.icon + " You made " + r.name + "!", 2600);
        closeOverlay();
        updateHotbar();
      });
    });
  }

  /* ---------------- challenge wrapper ---------------- */
  // context: "node" | "chest" | "craft" | "starfall" | "super"
  function showChallenge(context, onDone, intro) {
    var ch = Learning.getChallenge(context);
    if (!ch) {
      // no curricula assigned — keep the game playable
      onDone({ correct: true, mistakes: 0, skipped: false, nolesson: true });
      return;
    }
    Activities.present(ch, function (result) {
      if (!result.skipped) Learning.report(ch, result);
      onDone(result);
    }, intro);
  }

  function startToolChallenge(kindName, onSuccess) {
    showChallenge("craft", function (result) {
      if (result.correct && !result.skipped) onSuccess();
      else if (result.nolesson) onSuccess();
    }, "🛠️ Craft your " + kindName + "!");
  }

  function doCraft() {
    var craft = availableCraft();
    if (!craft) return;
    startToolChallenge(craft.name, function () {
      takeNeeds(craft.needs);
      Store.data.player.toolTier = craft.tier;
      Store.save();
      GameAudio.sfx.levelup();
      GameAudio.say("You crafted a " + craft.name + "!");
      toast("🔨 You crafted a " + craft.name.toUpperCase() + "! You can gather faster now!", 3500);
      updateHotbar();
    });
  }

  function recipeCardHtml(icon, name, req, extraClass, dataAttrs) {
    return "<button class='world-card kiln-card" + (extraClass || "") + "' " + (dataAttrs || "") + ">" +
      "<span class='world-emoji'>" + icon + "</span>" +
      "<span class='world-name'>Make " + name + "</span>" +
      "<span class='world-req'>" + req + "</span></button>";
  }

  function showWorkshop() {
    var recipes = visibleWorkshop();
    var ready = recipes.filter(function (r) { return canAfford(r.needs); });
    var locked = recipes.filter(function (r) { return !canAfford(r.needs); });
    var mallet = availableCraft();
    var nextMallet = CRAFTS[Store.data.player.toolTier] || null;
    var malletReady = !!mallet;
    var malletLocked = nextMallet && !mallet && Store.data.player.level >= nextMallet.level;

    if (!ready.length && !malletReady && !locked.length && !malletLocked) {
      closeOverlay();
      toast("Gather more materials to tinker something up!");
      return;
    }

    var html = "<div class='ch-title'>🛠️ Tinker Bench</div>" +
      "<div class='ch-sub'>Build doors, bedrolls, garden beds, and tools!</div>";

    if (ready.length || malletReady) {
      html += "<div class='world-list'>";
      ready.forEach(function (r, i) {
        var extra = r.tool ? " · word challenge" : (r.blurb ? " · " + r.blurb : "");
        html += recipeCardHtml(r.icon, r.name, costStr(r.needs) + extra, "", "data-kind='ws' data-i='" + i + "'");
      });
      if (malletReady) {
        html += recipeCardHtml(mallet.icon, mallet.name, costStr(mallet.needs) + " · word challenge", "", "data-kind='mallet'");
      }
      html += "</div>";
    } else {
      html += "<div class='ch-sub'>Gather a little more, then these recipes light up!</div>";
    }

    if (locked.length || malletLocked) {
      html += "<div class='ch-sub'>Need more stuff for:</div><div class='world-list'>";
      locked.forEach(function (r) {
        html += recipeCardHtml(r.icon, r.name, "Need " + costStr(r.needs), " locked", "");
      });
      if (malletLocked) {
        html += recipeCardHtml(nextMallet.icon, nextMallet.name, "Need " + costStr(nextMallet.needs), " locked", "");
      }
      html += "</div>";
    }

    html += "<button class='ghost-btn' id='ws-back'>⬅️ BACK</button>";
    openOverlay(html);
    $("ws-back").addEventListener("pointerdown", closeOverlay);
    document.querySelectorAll(".kiln-card[data-kind]").forEach(function (card) {
      card.addEventListener("pointerdown", function () {
        var kind = card.getAttribute("data-kind");
        if (kind === "mallet") {
          closeOverlay();
          doCraft();
          return;
        }
        var r = ready[+card.getAttribute("data-i")];
        if (r) doWorkshop(r);
      });
    });
  }

  var gardenBonusGiven = false;
  function doWorkshop(r) {
    if (!canAfford(r.needs)) return;
    if (r.tool) {
      closeOverlay();
      startToolChallenge(r.name, function () {
        takeNeeds(r.needs);
        if (r.gives) giveItems(r.gives);
        Store.data.player.tools[r.tool] = true;
        Store.save();
        GameAudio.sfx.levelup();
        GameAudio.say("You crafted a " + r.name + "!");
        toast(r.icon + " You crafted a " + r.name + "! " + (r.blurb || ""), 3200);
        updateHotbar();
      });
      return;
    }
    takeNeeds(r.needs);
    if (r.gives) giveItems(r.gives);
    if (r.id === "garden" && !Store.data.player.seeds.starter) {
      Store.data.player.seeds.starter = true;
      giveItems({ "sunfruit seeds": 2 });
      toast("🟫 Garden beds ready — plus 2 starter sunfruit seeds! 🌱", 3200);
    } else {
      toast(r.icon + " Crafted " + r.name + "!", 2200);
    }
    Store.save();
    GameAudio.sfx.kiln();
    updateHotbar();
    showWorkshop();
  }

  /* ---------------- generic overlay ---------------- */
  function openOverlay(html) {
    Controls.setEnabled(false);
    $("overlay-card").innerHTML = html;
    $("overlay").classList.add("open");
  }
  function closeOverlay() {
    GameAudio.stopListen();
    $("overlay").classList.remove("open");
    if (Game.running) Controls.setEnabled(true);
  }

  /* ---------------- Elder Alder: super challenges & legendary tools ---------------- */
  var LEGENDS = [
    { key: "drill", name: "ROOTBREAKER DRILL", icon: "🌀", wins: 3,
      desc: "It can pierce ROOTSTONE! Dig beneath the isle into THE HOLLOW, where moonpearl and aurorium glimmer in the dark!" },
    { key: "skybadge", name: "SKYRIDER BADGE", icon: "🎈", wins: 5, isle: "skydock",
      desc: "Cleared for the skies! Elder Alder unlocked CLOUDHAVEN SKYDOCK — a floating harbor with a grand airship. Pause and tap TRAVEL to visit anytime!" },
    { key: "sunhammer", name: "SUNFORGED MALLET", icon: "☀️", wins: 8,
      desc: "Forged in sunlight — it gathers everything TWICE as fast!" }
  ];

  function nextLegend() {
    var tools = Store.data.player.tools;
    for (var i = 0; i < LEGENDS.length; i++) {
      if (!tools[LEGENDS[i].key]) return LEGENDS[i];
    }
    return null;
  }

  function showToolUnlock(tool) {
    var html =
      "<div class='levelup-burst'>" + tool.icon + "</div>" +
      "<div class='ch-title big'>" + (tool.isle ? "CLEARED FOR THE SKIES!" : "LEGENDARY TOOL!") + "</div>" +
      "<div class='rank-name'>" + tool.icon + " " + tool.name + "</div>" +
      "<div class='unlock-list'><div class='unlock-item'>" + tool.desc + "</div></div>" +
      "<button class='big-btn' id='tool-ok'>" + (tool.isle ? "🎈 LET'S FLY!" : "WHOA!") + "</button>";
    openOverlay(html);
    GameAudio.sfx.levelup();
    GameAudio.say("You earned the " + tool.name + "! " + tool.desc);
    Activities.celebrate();
    $("tool-ok").addEventListener("pointerdown", function () {
      closeOverlay();
      updateHotbar();
      if (tool.isle) Game.travelTo(tool.isle);
    });
  }

  function superChallenge(who, winsObj, nextFn, introIcon) {
    showChallenge("super", function (result) {
      if (!result.correct || result.skipped) return;
      Game.grantSparks(CONFIG.REWARDS.superSparks);
      Game.grantXP(CONFIG.REWARDS.superXP);
      if (result.mistakes <= 1) {
        winsObj.wins += 1;
        Store.save();
        var t = nextFn();
        if (t && winsObj.wins >= t.wins) {
          Store.data.player.tools[t.key] = true;
          Store.save();
          updateHotbar();
          setTimeout(function () { showToolUnlock(t); }, 400);
          return;
        }
        toast(t
          ? introIcon + " Super win! " + (t.wins - winsObj.wins) + " more for the next secret!"
          : introIcon + " Super win! +" + CONFIG.REWARDS.superSparks + " sparks, +" + CONFIG.REWARDS.superXP + " light!", 3000);
      } else {
        toast("💪 You got it! Perfect wins count toward the next secret!", 3000);
      }
    }, introIcon + " SUPER CHALLENGE!");
  }

  function showElder(npc) {
    var d = Store.data.elder;
    var tool = nextLegend();
    var greetings = [
      "Ah, young Keeper! The isles brighten when you learn.",
      "My lantern has watched these isles for a hundred years. Ready to shine?",
      "Every Keeper before you loved a good challenge. Shall we?"
    ];
    if (tool && tool.key === "skybadge") {
      greetings = [
        "I once sailed the sky-lanes myself! A few more wins and I'll show you the Skydock.",
        "The airship is moored and waiting, young Keeper. Earn your badge!",
        "Skyriders earn their wings with sharp minds. Shall we begin?"
      ];
    } else if (Store.data.player.tools.skybadge) {
      greetings = [
        "Cloudhaven Skydock is yours now! Pause and tap TRAVEL to visit the airship.",
        "The sky-lanes remember every Keeper who earns the badge. Well done.",
        "A fine day for flying, young Keeper!"
      ];
    }
    var progress = tool
      ? (tool.key === "skybadge"
        ? "Win " + (tool.wins - d.wins) + " more and I'll pin the SKYRIDER BADGE on you! 🎈"
        : "Win " + (tool.wins - d.wins) + " more and I'll give you a MYSTERY TOOL! 🎁")
      : "You hold all my treasures! But I still have sparks... ✨";
    var canFly = Store.data.player.tools.skybadge && Store.data.player.isle !== "skydock";
    var html =
      "<div class='npc-head elder' style='--hair:" + npc.def.hair + "'><span class='npc-prop'>🏮</span></div>" +
      "<div class='ch-title'>Elder Alder</div>" +
      "<div class='sentence-text'>" + greetings[Math.floor(Math.random() * greetings.length)] +
      " Ready for a SUPER CHALLENGE, " + Store.profile.name + "?<br><br>" + progress + "</div>" +
      "<button class='big-btn' id='elder-go'>🔥 SUPER CHALLENGE!</button>" +
      (canFly ? "<button class='big-btn' id='elder-fly'>🎈 VISIT THE SKYDOCK</button>" : "") +
      "<button class='ghost-btn' id='elder-later'>Maybe later</button>";
    openOverlay(html);
    GameAudio.sfx.quest();
    $("elder-later").addEventListener("pointerdown", closeOverlay);
    $("elder-go").addEventListener("pointerdown", function () {
      superChallenge("elder", Store.data.elder, nextLegend, "🔥");
    });
    var flyBtn = $("elder-fly");
    if (flyBtn) flyBtn.addEventListener("pointerdown", function () {
      closeOverlay();
      Game.travelTo("skydock");
    });
  }

  /* ---------------- Wren: super challenges & tinker secrets ---------------- */
  var WREN_TOOLS = [
    { key: "kiln", name: "SKY KILN", icon: "🔥", wins: 3,
      desc: "Now THAT'S tinkering! Smelt skysteel ore + emberstone into INGOTS, cloudsand into GLASS, and berries into warm TARTS!" },
    { key: "lanternkit", name: "LANTERN KIT", icon: "🏮", wins: 8,
      desc: "Turn timber and emberstone into LANTERNS that GLOW! Light up caves and The Hollow so treasure can't hide." }
  ];

  function nextWrenTool() {
    var tools = Store.data.player.tools;
    for (var i = 0; i < WREN_TOOLS.length; i++) {
      if (!tools[WREN_TOOLS[i].key]) return WREN_TOOLS[i];
    }
    return null;
  }

  function showWren(npc) {
    if (!Store.data.tinker) Store.data.tinker = { wins: 0 };
    var m = Store.data.tinker;
    var tool = nextWrenTool();
    var greetings = [
      "Wrench, goggles, spark of genius — check! Ready for a SUPER CHALLENGE?",
      "I've been tinkering all morning. Your brain is my favorite machine!",
      "A sharp mind builds marvelous things. Let's test yours!"
    ];
    var progress = tool
      ? "Win " + (tool.wins - m.wins) + " more and I'll teach you a SECRET tinker trick! 🎁"
      : "You know all my tricks! But I still have sparks... ✨";
    var html =
      "<div class='npc-head tinker' style='--hair:" + npc.def.hair + "'><span class='npc-prop'>🔧</span></div>" +
      "<div class='ch-title'>Wren the Tinker</div>" +
      "<div class='sentence-text'>" + greetings[Math.floor(Math.random() * greetings.length)] +
      " Ready, " + Store.profile.name + "?<br><br>" + progress + "</div>" +
      "<button class='big-btn' id='wren-go'>🔧 SUPER CHALLENGE!</button>" +
      "<button class='ghost-btn' id='wren-later'>Maybe later</button>";
    openOverlay(html);
    GameAudio.sfx.quest();
    $("wren-later").addEventListener("pointerdown", closeOverlay);
    $("wren-go").addEventListener("pointerdown", function () {
      superChallenge("wren", Store.data.tinker, nextWrenTool, "🔧");
    });
  }

  /* ---------------- dialogue ---------------- */
  function showDialogue(npc) {
    if (npc.def.fox) {
      GameAudio.sfx.fox();
      var pets = [
        "🦊 Pip chirps and wags his fluffy tail!",
        "🦊 Pip rolls over for belly rubs!",
        "🦊 Pip zooms in a happy circle around you!",
        "🦊 Pip boops your hand with his nose!"
      ];
      toast(pets[Math.floor(Math.random() * pets.length)], 2200);
      npc.group.rotation.y += 0.6;
      return;
    }
    if (npc.def.elder) { showElder(npc); return; }
    if (npc.def.tinker) { showWren(npc); return; }
    var name = npc.def.name;
    var q = Quests.active();

    if (q && q.giver === name && Quests.isComplete()) {
      var doneHtml =
        "<div class='npc-head' style='--hair:" + npc.def.hair + ";--shirt:" + npc.def.shirt + "'></div>" +
        "<div class='ch-title'>" + name + "</div>" +
        "<div class='sentence-text'>You did it! Thank you, " + Store.profile.name + "! 🎉</div>" +
        "<button class='big-btn' id='dlg-done'>✨ GET REWARD</button>";
      openOverlay(doneHtml);
      GameAudio.sfx.quest();
      GameAudio.say("You did it! Thank you " + Store.profile.name + "!");
      $("dlg-done").addEventListener("pointerdown", function () {
        Quests.finish();
        Activities.celebrate();
        setTimeout(closeOverlay, 700);
      });
      return;
    }

    if (q) {
      var remindHtml =
        "<div class='npc-head' style='--hair:" + npc.def.hair + ";--shirt:" + npc.def.shirt + "'></div>" +
        "<div class='ch-title'>" + name + "</div>" +
        "<div class='sentence-text'>" + (q.giver === name ? q.text : "Go help " + q.giver + " first! " + q.icon) + "</div>" +
        "<button type='button' class='speak-btn small' id='dlg-speak'>🔊</button>" +
        "<button class='big-btn' id='dlg-ok'>OK!</button>";
      openOverlay(remindHtml);
      Activities.bindSpeak("dlg-speak", function () {
        return q.giver === name ? q.text : "Go help " + q.giver + " first!";
      }, 0.8);
      $("dlg-ok").addEventListener("pointerdown", closeOverlay);
      return;
    }

    // offer a new quest with a quick comprehension check
    var quest = Quests.pickQuest();
    var choices = [quest.icon].concat(quest.decoys).sort(function () { return Math.random() - 0.5; });
    var html =
      "<div class='npc-head' style='--hair:" + npc.def.hair + ";--shirt:" + npc.def.shirt + "'></div>" +
      "<div class='ch-title'>" + name + "</div>" +
      "<div class='sentence-text'>Hi " + Store.profile.name + "! " + quest.text + "</div>" +
      "<button type='button' class='speak-btn small' id='dlg-speak'>🔊 Help me read it</button>" +
      "<div class='ch-sub'>What does " + name + " need?</div>" +
      "<div class='word-grid' id='dlg-grid'></div>" +
      "<button class='ghost-btn' id='dlg-later'>Maybe later</button>";
    openOverlay(html);
    GameAudio.sfx.quest();
    var mistakes = 0, answered = false;
    var grid = $("dlg-grid");
    choices.forEach(function (icon) {
      var b = document.createElement("button");
      b.className = "word-block emoji-block";
      b.textContent = icon;
      b.addEventListener("pointerdown", function (e) {
        e.stopPropagation();
        if (answered) return;
        if (icon === quest.icon) {
          answered = true;
          GameAudio.sfx.correct();
          Stats.recordChallenge({ subject: "reading", skill: "sentences" }, { correct: true, mistakes: mistakes });
          Game.notifyEdu();
          Quests.start(name, quest);
          GameAudio.say("Yes! " + quest.text);
          b.classList.add("right");
          setTimeout(function () {
            closeOverlay();
            toast(quest.icon + " New quest from " + name + "!");
          }, 800);
        } else {
          mistakes++;
          GameAudio.sfx.wrong();
          b.classList.add("wrong");
          setTimeout(function () { b.classList.remove("wrong"); }, 500);
        }
      });
      grid.appendChild(b);
    });
    Activities.bindSpeak("dlg-speak", quest.text, 0.8);
    $("dlg-later").addEventListener("pointerdown", closeOverlay);
  }

  /* ---------------- level up ---------------- */
  function showLevelUp(newLevel) {
    var unlocks = [];
    ISLE_DEFS.forEach(function (w) {
      if (!w.needLegend && w.level === newLevel) unlocks.push(w.emoji + " NEW ISLE: " + w.name + "!");
    });
    CRAFTS.forEach(function (c) {
      if (c.level === newLevel) unlocks.push("🔨 You can now craft a " + c.name + "!");
    });
    var html =
      "<div class='levelup-burst'>🎆</div>" +
      "<div class='ch-title big'>LEVEL " + newLevel + "!</div>" +
      "<div class='rank-name'>" + rankFor(newLevel) + "</div>" +
      (unlocks.length ? "<div class='unlock-list'>" + unlocks.map(function (u) {
        return "<div class='unlock-item'>" + u + "</div>";
      }).join("") + "</div>" : "") +
      "<button class='big-btn' id='lv-ok'>AWESOME!</button>";
    openOverlay(html);
    GameAudio.sfx.levelup();
    GameAudio.say("Level " + newLevel + "! You are now a " + rankFor(newLevel) + "!");
    Activities.celebrate();
    $("lv-ok").addEventListener("pointerdown", function () {
      closeOverlay();
      updateHud();
    });
  }

  /* ---------------- pause menu / isles ---------------- */
  function showPause() {
    var html =
      "<div class='ch-title'>PAUSED</div>" +
      "<button class='big-btn' id='pm-resume'>▶️ KEEP PLAYING</button>" +
      "<button class='big-btn' id='pm-isles'>🗺️ TRAVEL TO AN ISLE</button>" +
      "<button class='big-btn' id='pm-home'>🏠 SWITCH EXPLORER</button>" +
      "<button class='ghost-btn hold-btn' id='pm-parent'>🗝️ PARENTS (hold)</button>";
    openOverlay(html);
    $("pm-resume").addEventListener("pointerdown", closeOverlay);
    $("pm-isles").addEventListener("pointerdown", showIsles);
    $("pm-home").addEventListener("pointerdown", function () {
      closeOverlay();
      Game.stop();
      showHome();
    });
    holdToOpen($("pm-parent"), function () { Parent.show(); });
  }

  function holdToOpen(btn, fn) {
    var timer = null;
    btn.addEventListener("pointerdown", function () {
      btn.classList.add("holding");
      timer = setTimeout(function () { btn.classList.remove("holding"); fn(); }, 1500);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach(function (ev) {
      btn.addEventListener(ev, function () {
        btn.classList.remove("holding");
        clearTimeout(timer);
      });
    });
  }

  function isleLocked(w) {
    if (w.needLegend) return !Store.data.player.tools[w.needLegend];
    return Store.data.player.level < w.level;
  }
  function isleLockHint(w) {
    if (w.needLegend === "skybadge") return "Earn the Skyrider Badge from Elder Alder";
    if (w.needLegend) return "A special unlock";
    return "Level " + w.level;
  }

  function showIsles() {
    var html = "<div class='ch-title'>🗺️ THE ISLES</div><div class='world-list'>";
    ISLE_DEFS.forEach(function (w) {
      var locked = isleLocked(w);
      html += "<button class='world-card" + (locked ? " locked" : "") +
        (Store.data.player.isle === w.id ? " current" : "") + "' data-isle='" + w.id + "'>" +
        "<span class='world-emoji'>" + (locked ? "🔒" : w.emoji) + "</span>" +
        "<span class='world-name'>" + w.name + "</span>" +
        "<span class='world-req'>" + (locked ? isleLockHint(w) : (Store.data.player.isle === w.id ? "You are here!" : "Tap to travel")) + "</span>" +
        "</button>";
    });
    html += "</div><button class='ghost-btn' id='wl-back'>⬅️ BACK</button>";
    openOverlay(html);
    document.querySelectorAll(".world-card").forEach(function (card) {
      card.addEventListener("pointerdown", function () {
        var id = card.getAttribute("data-isle");
        var def = ISLE_DEFS.find(function (w) { return w.id === id; });
        if (isleLocked(def)) {
          GameAudio.sfx.wrong();
          toast("🔒 " + isleLockHint(def) + " to unlock " + def.name + "!");
          return;
        }
        closeOverlay();
        Game.travelTo(id);
      });
    });
    $("wl-back").addEventListener("pointerdown", showPause);
  }

  /* ---------------- home screen ---------------- */
  function showHome() {
    $("home").style.display = "flex";
    $("hud").style.display = "none";
    Controls.setEnabled(false);
    $("home-title").textContent = CONFIG.BRAND.icon + " " + CONFIG.BRAND.name;
    $("home-tag").textContent = CONFIG.BRAND.tagline;
    renderPlayerButtons();
  }
  function hideHome() {
    $("home").style.display = "none";
    $("hud").style.display = "block";
  }

  function selectProfile(profile) {
    try { localStorage.setItem("lumen_last_player", profile.id); } catch (e) {}
    Store.load(profile);
    GameAudio.unlock();
    GameAudio.say("Let's go, " + profile.name + "!");
    Game.start();
  }

  var AVATARS = ["🦊", "🦉", "🐢", "🐦", "🦋", "🐰", "🦁", "🐙", "🦄", "🐸", "🐼", "🚀"];
  var COLORS = ["#5fae6f", "#4a90d9", "#c9843a", "#9b59d0", "#d95f8a", "#3fada8"];

  function renderPlayerButtons() {
    var wrap = $("player-buttons");
    wrap.innerHTML = "";
    var profiles = Store.family.profiles;
    $("home-empty").style.display = profiles.length ? "none" : "block";
    profiles.forEach(function (p, i) {
      var pk = Store.peek(p);
      var b = document.createElement("button");
      b.className = "mc-btn player-btn";
      b.style.background = p.color || COLORS[i % COLORS.length];
      b.innerHTML = p.emoji + " " + p.name.toUpperCase() +
        "<span class='player-lvl'>" + (pk ? "Lv " + pk.level + " · " + rankFor(pk.level) : "New adventure!") + "</span>";
      b.addEventListener("pointerdown", function () { selectProfile(p); });
      wrap.appendChild(b);
    });
    var add = document.createElement("button");
    add.className = "mc-btn player-btn new-explorer";
    add.innerHTML = "➕ NEW EXPLORER";
    add.addEventListener("pointerdown", showNewExplorer);
    wrap.appendChild(add);
  }

  function showNewExplorer() {
    var html =
      "<div class='ch-title'>🌟 New Explorer</div>" +
      "<div class='ch-sub'>What's your explorer name? (a nickname is perfect)</div>" +
      "<input type='text' id='ne-name' class='pr-input big-input' maxlength='16' placeholder='Explorer name'>" +
      "<div class='ch-sub'>Pick your explorer badge:</div>" +
      "<div class='avatar-grid' id='ne-avatars'>" +
      AVATARS.map(function (a, i) {
        return "<button class='avatar-btn" + (i === 0 ? " picked" : "") + "' data-a='" + a + "'>" + a + "</button>";
      }).join("") + "</div>" +
      "<div class='ch-sub'>How old is this explorer?</div>" +
      "<div class='band-row'>" +
      "<button class='big-btn band-btn picked' data-band='younger'>🌱 About 6–9</button>" +
      "<button class='big-btn band-btn' data-band='older'>🌳 About 10–13</button>" +
      "</div>" +
      "<div class='ch-sub'>Starter lessons are picked automatically — grown-ups can change everything in the Parents area.</div>" +
      "<button class='big-btn' id='ne-go'>🚀 START EXPLORING!</button>" +
      "<button class='ghost-btn' id='ne-back'>⬅️ Back</button>";
    openOverlay(html);
    var picked = { emoji: AVATARS[0], band: "younger" };
    document.querySelectorAll(".avatar-btn").forEach(function (b) {
      b.addEventListener("pointerdown", function () {
        document.querySelectorAll(".avatar-btn").forEach(function (x) { x.classList.remove("picked"); });
        b.classList.add("picked");
        picked.emoji = b.getAttribute("data-a");
      });
    });
    document.querySelectorAll(".band-btn").forEach(function (b) {
      b.addEventListener("pointerdown", function () {
        document.querySelectorAll(".band-btn").forEach(function (x) { x.classList.remove("picked"); });
        b.classList.add("picked");
        picked.band = b.getAttribute("data-band");
      });
    });
    $("ne-back").addEventListener("pointerdown", function () { closeOverlay(); });
    $("ne-go").addEventListener("pointerdown", function () {
      var name = ($("ne-name").value || "").trim();
      if (!name) { $("ne-name").style.borderColor = "#c0392b"; $("ne-name").focus(); return; }
      var idx = Store.family.profiles.length;
      var p = Store.addProfile({ name: name, emoji: picked.emoji, band: picked.band,
                                 color: COLORS[idx % COLORS.length] });
      closeOverlay();
      selectProfile(p);
    });
  }

  function init() {
    document.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    document.addEventListener("pointerdown", function () { GameAudio.warm(); }, true);
    $("btn-pause").addEventListener("pointerdown", function (e) { e.stopPropagation(); showPause(); });
    $("btn-bag").addEventListener("pointerdown", function (e) { e.stopPropagation(); showInventory(); });
    $("btn-mode").addEventListener("pointerdown", function (e) { e.stopPropagation(); Game.toggleMode(); });
    $("btn-craft").addEventListener("pointerdown", function (e) { e.stopPropagation(); showWorkshop(); });
    $("btn-kiln").addEventListener("pointerdown", function (e) { e.stopPropagation(); doKiln(); });
    var jb = $("btn-jump");
    jb.addEventListener("pointerdown", function (e) { e.stopPropagation(); Player.jump = true; });
    ["pointerup", "pointerleave", "pointercancel"].forEach(function (ev) {
      jb.addEventListener(ev, function () { Player.jump = false; });
    });
    holdToOpen($("btn-home-parent"), function () { Parent.show(); });
  }

  return {
    init: init, toast: toast, updateHud: updateHud, updateHotbar: updateHotbar,
    updateQuestHud: updateQuestHud, updateModeButton: updateModeButton,
    selectHotbar: selectHotbar, selectedItem: selectedItem,
    showChallenge: showChallenge, showDialogue: showDialogue,
    showInventory: showInventory, toggleInventory: toggleInventory,
    showLevelUp: showLevelUp, showPause: showPause, showHome: showHome, hideHome: hideHome,
    rankFor: rankFor, xpNeeded: xpNeeded, nextCraftInfo: nextCraftInfo, showWorkshop: showWorkshop,
    openOverlay: openOverlay, closeOverlay: closeOverlay, holdToOpen: holdToOpen
  };
})();
