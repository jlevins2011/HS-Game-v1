"use strict";
/* ============================================================
   GARDEN — plant seeds in garden beds, watch crops grow
   through real-time stages, harvest fruit (and get seeds
   back). Crops keep growing even while away — timestamps
   are saved and caught up on return.
   Crops: sunfruit 🍊 and moonmelon 🍈.
   ============================================================ */
var Garden = (function () {
  var CROPS = {
    sunfruit: { seed: "sunfruit seeds", fruit: "sunfruit", icon: "🍊", mature: function () { return B.CROP_SUNFRUIT; } },
    moonmelon: { seed: "moonmelon seeds", fruit: "moonmelon", icon: "🍈", mature: function () { return B.CROP_MOONMELON; } }
  };
  var STAGE_BLOCKS = function (crop, stage) {
    if (stage === 0) return B.CROP_SPROUT;
    if (stage === 1) return B.CROP_MID;
    return CROPS[crop].mature();
  };

  function plots() { return Store.gardenPlots(World.def.id); }

  // which seed does the player have? (prefers the selected item)
  function seedInHand() {
    var sel = Game.selectedItem;
    var inv = Store.data.player.inventory;
    if (sel && sel.indexOf("seeds") >= 0 && (inv[sel] || 0) > 0) return sel;
    var names = Object.keys(CROPS).map(function (c) { return CROPS[c].seed; });
    for (var i = 0; i < names.length; i++) {
      if ((inv[names[i]] || 0) > 0) return names[i];
    }
    return null;
  }

  function cropForSeed(seed) {
    var names = Object.keys(CROPS);
    for (var i = 0; i < names.length; i++) {
      if (CROPS[names[i]].seed === seed) return names[i];
    }
    return null;
  }

  // tap a garden bed: plant a seed if we have one
  function tryPlant(x, y, z) {
    var seed = seedInHand();
    if (!seed) {
      UI.toast("🌱 You need seeds! Curio chests and berry bushes hide them.");
      return true;
    }
    if (World.getBlock(x, y + 1, z) !== B.AIR) return true;
    var crop = cropForSeed(seed);
    var inv = Store.data.player.inventory;
    inv[seed] -= 1;
    World.setBlock(x, y + 1, z, B.CROP_SPROUT);
    plots()[x + "," + z] = { y: y, crop: crop, stage: 0, at: Date.now() };
    Store.save();
    GameAudio.sfx.grow();
    UI.toast("🌱 Planted " + seed + "! Watch it grow...");
    UI.updateHotbar();
    return true;
  }

  // tap a crop block: harvest if mature
  function tryHarvest(x, y, z) {
    var key = x + "," + z;
    var plot = plots()[key];
    if (!plot || plot.y !== y - 1) {
      // stray crop block without plot data — just clear it
      World.setBlock(x, y, z, B.AIR);
      return true;
    }
    if (plot.stage < 2) {
      UI.toast("🌿 Still growing! Come back in a little while.");
      return true;
    }
    var crop = CROPS[plot.crop] || CROPS.sunfruit;
    World.setBlock(x, y, z, B.AIR);
    delete plots()[key];
    var n = 2 + Math.floor(Math.random() * 2);
    Game.grantItem(crop.fruit, n);
    if (Math.random() < 0.7) Game.grantItem(crop.seed, 1 + Math.floor(Math.random() * 2));
    Game.grantXP(CONFIG.REWARDS.harvestXP);
    Stats.recordHarvest();
    GameAudio.sfx.grow();
    UI.toast(crop.icon + " Harvest! +" + n + " " + crop.fruit + "!", 2600);
    Store.save();
    return true;
  }

  // advance growth by wall-clock time (called every few seconds and on isle load)
  function tick() {
    var ps = plots();
    var changed = false;
    Object.keys(ps).forEach(function (key) {
      var plot = ps[key];
      var xz = key.split(",");
      var x = +xz[0], z = +xz[1];
      var stagesDue = Math.floor((Date.now() - plot.at) / (CONFIG.WORLD.cropGrowSec * 1000));
      if (stagesDue > 0 && plot.stage < 2) {
        var newStage = Math.min(2, plot.stage + stagesDue);
        plot.stage = newStage;
        plot.at = Date.now();
        // only swap the block if the world still has a crop there
        var cur = World.getBlock(x, plot.y + 1, z);
        if (cur === B.CROP_SPROUT || cur === B.CROP_MID) {
          World.setBlock(x, plot.y + 1, z, STAGE_BLOCKS(plot.crop, newStage));
          changed = true;
        } else if (cur === B.AIR) {
          delete ps[key];   // bed was cleared while away
        }
      }
    });
    if (changed) { GameAudio.sfx.grow(); Store.save(); }
  }

  // when arriving on an isle, make the world match saved plot stages
  function restore() {
    var ps = plots();
    Object.keys(ps).forEach(function (key) {
      var plot = ps[key];
      var xz = key.split(",");
      var x = +xz[0], z = +xz[1];
      if (World.getBlock(x, plot.y, z) !== B.GARDEN_SOIL) { delete ps[key]; return; }
      var want = STAGE_BLOCKS(plot.crop, plot.stage);
      if (World.getBlock(x, plot.y + 1, z) !== want) World.setBlock(x, plot.y + 1, z, want);
    });
    tick();
  }

  return { tryPlant: tryPlant, tryHarvest: tryHarvest, tick: tick, restore: restore, CROPS: CROPS };
})();
