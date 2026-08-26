"use strict";
/* ============================================================
   GARDEN — planters built with the construction system hold
   real growing plants: tap with seeds to sow, watch sprouts
   rise through stages (they keep growing while away), tap
   again to harvest sunfruit and moonmelons.
   ============================================================ */
var Garden = (function () {
  var CROPS = {
    sunfruit: { seed: "sunfruit seeds", fruit: "sunfruit", icon: "🍊", color: 0xffb32e },
    moonmelon: { seed: "moonmelon seeds", fruit: "moonmelon", icon: "🍈", color: 0x7ae0cf }
  };

  var isleState = null;
  var cropMeshes = {};        // plotKey -> mesh

  function plotKey(piece) { return Math.round(piece.x) + "," + Math.round(piece.z); }
  function plots() {
    if (!isleState.planters) isleState.planters = {};
    return isleState.planters;
  }

  function load(state) {
    isleState = state;
    Object.keys(cropMeshes).forEach(function (k) {
      if (cropMeshes[k].parent) cropMeshes[k].parent.remove(cropMeshes[k]);
    });
    cropMeshes = {};
    // meshes for existing planters are attached as pieces load (registerPlanter)
  }

  function registerPlanter(piece) {
    var key = plotKey(piece);
    var plot = plots()[key];
    if (plot) refreshCropMesh(piece, plot);
  }

  function unregisterPlanter(piece) {
    var key = plotKey(piece);
    delete plots()[key];
    if (cropMeshes[key]) {
      if (cropMeshes[key].parent) cropMeshes[key].parent.remove(cropMeshes[key]);
      delete cropMeshes[key];
    }
    Store.save();
  }

  function refreshCropMesh(piece, plot) {
    var key = plotKey(piece);
    if (cropMeshes[key]) {
      if (cropMeshes[key].parent) cropMeshes[key].parent.remove(cropMeshes[key]);
      delete cropMeshes[key];
    }
    if (!plot) return;
    var g = new Geo.Builder();
    var crop = CROPS[plot.crop] || CROPS.sunfruit;
    if (plot.stage === 0) {
      g.cyl(0.04, 0.02, 0.35, 4, 0x6cbf58, { x: -0.3 }, 0.1, 0);
      g.cyl(0.04, 0.02, 0.3, 4, 0x6cbf58, { x: 0.3, z: 0.2 }, 0.1, 0);
      g.blob(0.09, 0x8fd672, { x: -0.3, y: 0.32 }, 0.1, 0);
      g.blob(0.08, 0x8fd672, { x: 0.3, y: 0.27, z: 0.2 }, 0.1, 0);
    } else if (plot.stage === 1) {
      g.cyl(0.06, 0.04, 0.8, 4, 0x4f9c3c, {}, 0.1, 0);
      g.blob(0.34, 0x6cbf58, { y: 0.75, sy: 0.7 }, 0.2, 0.3);
      g.blob(0.2, 0x8fd672, { x: 0.3, y: 0.55 }, 0.2, 0.3);
    } else {
      g.cyl(0.07, 0.05, 1.0, 4, 0x4f9c3c, {}, 0.1, 0);
      g.blob(0.4, 0x5ca84e, { y: 0.9, sy: 0.7 }, 0.2, 0.3);
      g.blob(0.22, crop.color, { x: 0.35, y: 0.5 }, 0.1, 0.1);
      g.blob(0.2, crop.color, { x: -0.3, y: 0.62, z: 0.2 }, 0.1, 0.1);
      g.blob(0.18, crop.color, { z: -0.32, y: 0.45 }, 0.1, 0.1);
    }
    var mesh = g.build();
    mesh.position.set(piece.x, piece.y + 0.5, piece.z);
    piece.mesh.parent.add(mesh);
    cropMeshes[key] = mesh;
  }

  function pieceForKey(key) {
    return Build.pieces.find(function (p) { return p.t === "planter" && plotKey(p) === key; });
  }

  function seedInHand() {
    var inv = Store.data.player.inventory;
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

  function promptFor(piece) {
    var plot = plots()[plotKey(piece)];
    if (!plot) return seedInHand() ? "Planter · tap to plant seeds!" : "Planter · find seeds in chests & bushes";
    if (plot.stage < 2) return "Planter · growing... 🌿";
    return "Planter · tap to harvest!";
  }

  function tap(piece) {
    var key = plotKey(piece);
    var plot = plots()[key];
    if (!plot) {
      var seed = seedInHand();
      if (!seed) { UI.toast("🌱 You need seeds! Curio chests and berry bushes hide them."); return; }
      var inv = Store.data.player.inventory;
      inv[seed] -= 1;
      plot = { crop: cropForSeed(seed), stage: 0, at: Date.now() };
      plots()[key] = plot;
      Store.save();
      refreshCropMesh(piece, plot);
      GameAudio.sfx.grow();
      UI.toast("🌱 Planted " + seed + "! Watch it grow...");
      return;
    }
    if (plot.stage < 2) {
      UI.toast("🌿 Still growing! Come back in a little while.");
      return;
    }
    var crop = CROPS[plot.crop] || CROPS.sunfruit;
    delete plots()[key];
    refreshCropMesh(piece, null);
    var n = 2 + Math.floor(Math.random() * 2);
    Game.grantItem(crop.fruit, n);
    if (Math.random() < 0.7) Game.grantItem(crop.seed, 1 + Math.floor(Math.random() * 2));
    Game.grantXP(CONFIG.REWARDS.harvestXP);
    Stats.recordHarvest();
    GameAudio.sfx.grow();
    Game.burst(piece.x, piece.y + 1, piece.z, crop.color, 12);
    UI.gainPopup("+" + n + " " + crop.icon + " " + crop.fruit);
    Store.save();
  }

  function tick() {
    if (!isleState) return;
    var ps = plots();
    var changed = false;
    Object.keys(ps).forEach(function (key) {
      var plot = ps[key];
      var stagesDue = Math.floor((Date.now() - plot.at) / (CONFIG.WORLD.cropGrowSec * 1000));
      if (stagesDue > 0 && plot.stage < 2) {
        plot.stage = Math.min(2, plot.stage + stagesDue);
        plot.at = Date.now();
        var piece = pieceForKey(key);
        if (piece) refreshCropMesh(piece, plot);
        changed = true;
      }
    });
    if (changed) { GameAudio.sfx.grow(); Store.save(); }
  }

  return {
    load: load, tap: tap, tick: tick, promptFor: promptFor,
    registerPlanter: registerPlanter, unregisterPlanter: unregisterPlanter,
    CROPS: CROPS
  };
})();
