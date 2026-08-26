"use strict";
/* ============================================================
   TEXTURE ATLAS — every block texture painted onto one canvas
   at load time (16px tiles, 8x8 grid). The style is soft and
   painterly: rounded dabs, gentle top-light gradients, low
   contrast — a storybook look, not a pixel-grid look.
   ============================================================ */
var Textures = (function () {
  var TILE = 16, GRID = 8;
  var canvas = document.createElement("canvas");
  canvas.width = canvas.height = TILE * GRID;
  var g = canvas.getContext("2d");

  var rngSeed = 24601;
  function rnd() { rngSeed = (rngSeed * 16807) % 2147483647; return (rngSeed - 1) / 2147483646; }

  function px(tx, ty, x, y, color) {
    g.fillStyle = color;
    g.fillRect(tx * TILE + x, ty * TILE + y, 1, 1);
  }

  // soft painterly base: vertical light gradient + rounded dabs
  function paint(tx, ty, top, bottom, dabs, nDabs) {
    for (var y = 0; y < TILE; y++) {
      var t = y / (TILE - 1);
      g.fillStyle = mix(top, bottom, t);
      g.fillRect(tx * TILE, ty * TILE + y, TILE, 1);
    }
    if (dabs && dabs.length) {
      // translucent rounded dabs: reads as soft paint, not pixel confetti
      g.globalAlpha = 0.4;
      for (var i = 0; i < (nDabs || 9); i++) {
        var c = dabs[Math.floor(rnd() * dabs.length)];
        var cx = 1 + Math.floor(rnd() * (TILE - 3));
        var cy = 1 + Math.floor(rnd() * (TILE - 3));
        g.fillStyle = c;
        g.fillRect(tx * TILE + cx, ty * TILE + cy, 2, 1);
        g.fillRect(tx * TILE + cx, ty * TILE + cy + 1, 1, 1);
      }
      g.globalAlpha = 1;
    }
  }

  function mix(a, b, t) {
    var pa = hex(a), pb = hex(b);
    return "rgb(" + Math.round(pa[0] + (pb[0] - pa[0]) * t) + "," +
      Math.round(pa[1] + (pb[1] - pa[1]) * t) + "," +
      Math.round(pa[2] + (pb[2] - pa[2]) * t) + ")";
  }
  function hex(h) {
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  }

  function spots(tx, ty, color, n, size, glow) {
    for (var i = 0; i < n; i++) {
      var cx = 2 + Math.floor(rnd() * (TILE - 5));
      var cy = 2 + Math.floor(rnd() * (TILE - 5));
      g.fillStyle = color;
      g.fillRect(tx * TILE + cx, ty * TILE + cy, size, size);
      if (glow) {
        g.fillStyle = glow;
        g.fillRect(tx * TILE + cx, ty * TILE + cy, 1, 1);
      }
    }
  }

  function clearTile(tx, ty) { g.clearRect(tx * TILE, ty * TILE, TILE, TILE); }

  /* ---------- tile ids ---------- */
  var names = [
    "MEADOW_TOP", "MEADOW_SIDE", "EARTH", "STONE", "CLOUDSAND", "TIMBER_SIDE", "TIMBER_TOP", "LEAF",
    "LEAF_ROSE", "PLANKS", "WATER", "SNOW_TOP", "SNOW_SIDE", "EMBERSTONE", "SKYSTEEL", "STARSTONE",
    "WONDERSTONE", "CHEST_TOP", "CHEST_SIDE", "ROOTSTONE", "DUSKSTONE", "MOONPEARL", "AURORIUM", "VOIDGLASS",
    "FLUFF", "GLASS", "LANTERN", "SUNPETAL", "BELLBLOOM", "BERRY_FULL", "BERRY_EMPTY", "SPRITECAP",
    "GLOWMOSS", "ICE", "SPINE_SIDE", "SPINE_TOP", "DUNESTONE", "STARMOSS", "BELLCAP_STEM", "BELLCAP_TOP",
    "CLAYBRICK", "DOOR", "LADDER", "FENCE", "BEDROLL", "BENCH_TOP", "BENCH_SIDE", "GARDEN_SOIL",
    "CROP_SPROUT", "CROP_MID", "CROP_SUNFRUIT", "CROP_MOONMELON", "BALLOON", "DOCKWOOD", "GLIMMER", "FLUFF_ROSE"
  ];
  var T = {};
  names.forEach(function (n, i) { T[n] = i; });

  function paintAll() {
    // meadow: fresh spring green with tuft dabs
    paint(0, 0, "#7cc75e", "#5da844", ["#8fd672", "#4f9c3c", "#a3e18a"], 12);
    // meadow side: earth with a mossy fringe
    paint(1, 0, "#9a7150", "#7c5a3e", ["#8a644a", "#a87c58"], 8);
    for (var x = 0; x < TILE; x++) for (var y = 0; y < 4; y++) {
      if (y < 2 || rnd() < 0.55) px(1, 0, x, y, rnd() < 0.4 ? "#6fbc53" : "#7cc75e");
    }
    paint(2, 0, "#966e4d", "#7a583d", ["#8a644a", "#a87c58", "#6d4f37"], 10);          // earth
    paint(3, 0, "#a3a7ad", "#84888f", ["#b3b7bd", "#75797f", "#989ca3"], 10);          // stone
    paint(4, 0, "#f2e2b8", "#e0cd9d", ["#f9edcb", "#d6c390"], 9);                      // cloudsand
    paint(5, 0, "#8a6540", "#6e5033", ["#7c5a39", "#96714a"], 8);                      // timber side
    for (var yy = 0; yy < TILE; yy++) { px(5, 0, 4, yy, "#5e4429"); px(5, 0, 11, yy, "#5e4429"); }
    paint(6, 0, "#b08c5c", "#997749", ["#a5824f"], 6);                                 // timber top rings
    g.strokeStyle = "#7c5a39";
    g.strokeRect(6 * TILE + 3.5, 0 * TILE + 3.5, 9, 9);
    g.strokeRect(6 * TILE + 6.5, 0 * TILE + 6.5, 3, 3);
    paint(7, 0, "#59a848", "#3f8c33", ["#6cbf58", "#357a2b", "#7fd06a"], 12);          // leafcrown

    paint(0, 1, "#e88ac2", "#cf6ba8", ["#f2a3d2", "#c05b98"], 11);                     // rose leaf (Starfen)
    paint(1, 1, "#c59a63", "#ab8250", ["#b98f58", "#d1a76e"], 8);                      // planks
    for (var xx = 0; xx < TILE; xx++) { px(1, 1, xx, 5, "#96714a"); px(1, 1, xx, 11, "#96714a"); }
    paint(2, 1, "#54a2e8", "#3c86cc", ["#68b2f2", "#3579b8"], 8);                      // water
    paint(3, 1, "#f4f8fc", "#dfe9f2", ["#ffffff", "#d2e0ec"], 8);                      // snow top
    paint(4, 1, "#966e4d", "#7a583d", ["#8a644a"], 6);                                 // snow side
    for (var x2 = 0; x2 < TILE; x2++) for (var y2 = 0; y2 < 4; y2++) px(4, 1, x2, y2, "#f4f8fc");
    paint(5, 1, "#8d9198", "#75797f", null);                                           // emberstone
    spots(5, 1, "#3a3a3a", 5, 2); spots(5, 1, "#e8863a", 3, 1, "#ffc46b");
    paint(6, 1, "#8d9198", "#75797f", null);                                           // skysteel ore
    spots(6, 1, "#9fc3e8", 5, 2, "#d9ecfc");
    paint(7, 1, "#8d9198", "#75797f", null);                                           // starstone ore
    spots(7, 1, "#ffd75e", 4, 2, "#fff3c4");

    // wonderstone: teal glow with a bright rune
    paint(0, 2, "#3fa8a0", "#2c847e", ["#54c2b9", "#25716c"], 8);
    g.fillStyle = "#eafff9"; g.font = "bold 11px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("✦", 0 * TILE + 8, 2 * TILE + 9);
    paint(1, 2, "#9a6b3d", "#7e5530", ["#8d6136"], 6);                                 // chest top
    g.strokeStyle = "#5e3f22"; g.strokeRect(1 * TILE + 0.5, 2 * TILE + 0.5, 15, 15);
    paint(2, 2, "#9a6b3d", "#7e5530", ["#8d6136"], 6);                                 // chest side
    g.strokeStyle = "#5e3f22"; g.strokeRect(2 * TILE + 0.5, 2 * TILE + 0.5, 15, 15);
    g.fillStyle = "#f2ca55";
    g.fillRect(2 * TILE + 6, 2 * TILE + 6, 4, 4);
    for (var cx = 0; cx < TILE; cx++) px(2, 2, cx, 8, "#f2ca55");
    // rootstone: dark tangled roots
    paint(3, 2, "#4a3a2c", "#332720", ["#5c4936", "#241a14"], 12);
    for (var r = 0; r < 4; r++) {
      var ry = 2 + Math.floor(rnd() * 12);
      for (var rx = 0; rx < TILE; rx++) if (rnd() < 0.7) px(3, 2, rx, (ry + Math.floor(rx / 5)) % TILE, "#6b543d");
    }
    paint(4, 2, "#3c3750", "#2a2640", ["#484260", "#211d33"], 10);                     // duskstone
    paint(5, 2, "#3c3750", "#2a2640", null);                                           // moonpearl ore
    spots(5, 2, "#e8d9f2", 4, 2, "#ffffff");
    paint(6, 2, "#3c3750", "#2a2640", null);                                           // aurorium ore
    spots(6, 2, "#5ee8c4", 2, 2, "#c4ffe8"); spots(6, 2, "#e85ec4", 2, 2, "#ffc4ee");
    paint(7, 2, "#161226", "#0c0a18", ["#241d3d"], 6);                                 // voidglass

    paint(0, 3, "#f4efe2", "#e2dcc9", ["#fbf7ec", "#d8d1bc"], 8);                      // fluff
    paint(1, 3, "#cfeef8", "#b8e2f2", ["#e2f6fc", "#ffffff"], 6);                      // glass
    g.strokeStyle = "#8ec4d0"; g.strokeRect(1 * TILE + 0.5, 3 * TILE + 0.5, 15, 15);
    clearTile(2, 3);                                                                   // lantern (cross)
    for (var ly = 6; ly < 15; ly++) { px(2, 3, 7, ly, "#6e5033"); px(2, 3, 8, ly, "#5e4429"); }
    [[6,2],[9,2],[6,3],[9,3],[6,4],[9,4],[6,5],[9,5]].forEach(function (p) { px(2, 3, p[0], p[1], "#8a6540"); });
    [[7,2],[8,2],[7,3],[8,3],[7,4],[8,4],[7,5],[8,5]].forEach(function (p) { px(2, 3, p[0], p[1], p[1] < 4 ? "#fff3c4" : "#ffb85e"); });
    clearTile(3, 3);                                                                   // sunpetal flower
    for (var fy = 8; fy < 16; fy++) px(3, 3, 7, fy, "#4f9c3c");
    [[6,4],[8,4],[7,3],[5,5],[9,5],[6,6],[8,6],[7,7]].forEach(function (p) { px(3, 3, p[0], p[1], "#ffd430"); });
    px(3, 3, 7, 5, "#e88a1a");
    clearTile(4, 3);                                                                   // bellbloom flower
    for (var fy2 = 8; fy2 < 16; fy2++) px(4, 3, 8, fy2, "#4f9c3c");
    [[7,4],[9,4],[8,3],[6,5],[10,5],[7,6],[9,6],[8,7]].forEach(function (p) { px(4, 3, p[0], p[1], "#8a7ae8"); });
    px(4, 3, 8, 5, "#f2f2ff");
    // berry bush full / picked
    paint(5, 3, "#4d9440", "#387a2e", ["#5ca84e", "#2e6b26"], 10);
    spots(5, 3, "#e0393f", 5, 2, "#ff7a80");
    paint(6, 3, "#4d9440", "#387a2e", ["#5ca84e", "#2e6b26"], 10);
    clearTile(7, 3);                                                                   // spritecap mushroom
    for (var fy3 = 9; fy3 < 16; fy3++) { px(7, 3, 7, fy3, "#eee6d2"); px(7, 3, 8, fy3, "#e0d6be"); }
    for (var mx = 4; mx < 12; mx++) for (var my = 6; my < 9; my++) px(7, 3, mx, my, "#5ec2d6");
    for (var mx2 = 5; mx2 < 11; mx2++) px(7, 3, mx2, 5, "#5ec2d6");
    px(7, 3, 6, 7, "#eafcff"); px(7, 3, 9, 6, "#eafcff");

    paint(0, 4, "#c6e86b", "#a5cc4b", ["#daf78c", "#8fb83c"], 12);                     // glowmoss
    spots(0, 4, "#f4ffca", 4, 1);
    paint(1, 4, "#bfe4f4", "#a3d4ea", ["#d5eef8", "#ffffff"], 6);                      // ice
    paint(2, 4, "#5c9e4c", "#47883a", ["#6db05c", "#3a762f"], 8);                      // spineleaf side
    for (var cy2 = 0; cy2 < TILE; cy2 += 3) { px(2, 4, 2, cy2, "#2e5c24"); px(2, 4, 13, cy2, "#2e5c24"); }
    paint(3, 4, "#6db05c", "#5c9e4c", null);                                           // spineleaf top
    paint(4, 4, "#e3cf96", "#cdb87c", ["#d8c488", "#eedaa2"], 8);                      // dunestone
    for (var sx = 0; sx < TILE; sx++) { px(4, 4, sx, 5, "#c2ac70"); px(4, 4, sx, 11, "#c2ac70"); }
    paint(5, 4, "#7a6fc4", "#5f54a8", ["#8d82d6", "#514694"], 12);                     // starmoss
    spots(5, 4, "#cfc9f2", 3, 1);
    paint(6, 4, "#eee6d2", "#dcd2ba", ["#e6dcc6"], 6);                                 // bellcap stem
    paint(7, 4, "#5ec2d6", "#48a8bc", ["#79d2e2", "#3d95a8"], 9);                      // bellcap top
    spots(7, 4, "#eafcff", 4, 2);

    paint(0, 5, "#c26a4a", "#a85539", ["#b25e40", "#cf7a56"], 8);                      // claybrick
    for (var bx = 0; bx < TILE; bx++) { px(0, 5, bx, 5, "#8d4630"); px(0, 5, bx, 11, "#8d4630"); }
    for (var by = 0; by < 5; by++) px(0, 5, 8, by, "#8d4630");
    for (var by2 = 6; by2 < 11; by2++) { px(0, 5, 3, by2, "#8d4630"); px(0, 5, 12, by2, "#8d4630"); }
    paint(1, 5, "#8a6540", "#6e5033", ["#7c5a39"], 6);                                 // door
    g.fillStyle = "#bfe4f4"; g.fillRect(1 * TILE + 9, 5 * TILE + 3, 5, 6);
    g.fillStyle = "#f2ca55"; g.fillRect(1 * TILE + 3, 5 * TILE + 8, 2, 2);
    g.strokeStyle = "#4c3620"; g.strokeRect(1 * TILE + 0.5, 5 * TILE + 0.5, 15, 15);
    clearTile(2, 5);                                                                   // ladder (cross)
    for (var ly2 = 0; ly2 < TILE; ly2++) { px(2, 5, 3, ly2, "#8a6540"); px(2, 5, 12, ly2, "#8a6540"); }
    for (var lr = 2; lr < 16; lr += 4) for (var lx = 3; lx <= 12; lx++) px(2, 5, lx, lr, "#a5824f");
    paint(3, 5, "#c59a63", "#ab8250", null);                                           // fence
    for (var fy4 = 0; fy4 < TILE; fy4++) { px(3, 5, 3, fy4, "#8a6540"); px(3, 5, 12, fy4, "#8a6540"); }
    for (var fr = 4; fr <= 10; fr += 6) for (var fx = 3; fx <= 12; fx++) px(3, 5, fx, fr, "#8a6540");
    paint(4, 5, "#5e8fd0", "#4a76b5", ["#6f9cd9"], 6);                                 // bedroll
    for (var bex = 0; bex < TILE; bex++) for (var bey = 0; bey < 6; bey++) px(4, 5, bex, bey, "#f4efe2");
    paint(5, 5, "#c59a63", "#ab8250", null);                                           // tinker bench top
    for (var ctx2 = 0; ctx2 < TILE; ctx2++) { px(5, 5, ctx2, 7, "#8a6540"); px(5, 5, 7, ctx2, "#8a6540"); }
    g.strokeStyle = "#6e5033"; g.strokeRect(5 * TILE + 0.5, 5 * TILE + 0.5, 15, 15);
    paint(6, 5, "#96714a", "#7c5a39", null);                                           // tinker bench side
    g.fillStyle = "#d9d0c0"; g.fillRect(6 * TILE + 4, 5 * TILE + 5, 8, 6);
    g.fillStyle = "#5e4429"; g.fillRect(6 * TILE + 6, 5 * TILE + 7, 4, 2);
    paint(7, 5, "#6d4f37", "#553d2a", ["#7c5a3e", "#48331f"], 10);                     // garden soil
    for (var gx = 0; gx < TILE; gx++) { px(7, 5, gx, 4, "#48331f"); px(7, 5, gx, 9, "#48331f"); px(7, 5, gx, 14, "#48331f"); }

    clearTile(0, 6);                                                                   // crop sprout
    [[7,12],[8,12],[7,13],[8,13],[7,14],[8,14],[6,11],[9,11]].forEach(function (p) { px(0, 6, p[0], p[1], "#6cbf58"); });
    clearTile(1, 6);                                                                   // crop mid
    for (var cy3 = 7; cy3 < 16; cy3++) px(1, 6, 8, cy3, "#4f9c3c");
    [[6,8],[10,9],[7,6],[9,7],[5,10],[11,11]].forEach(function (p) { px(1, 6, p[0], p[1], "#6cbf58"); });
    clearTile(2, 6);                                                                   // sunfruit mature
    for (var cy4 = 6; cy4 < 16; cy4++) px(2, 6, 8, cy4, "#4f9c3c");
    for (var ox = 4; ox < 8; ox++) for (var oy = 8; oy < 12; oy++) px(2, 6, ox, oy, "#ffb32e");
    for (var ox2 = 9; ox2 < 13; ox2++) for (var oy2 = 10; oy2 < 14; oy2++) px(2, 6, ox2, oy2, "#ffb32e");
    px(2, 6, 5, 9, "#ffe08a"); px(2, 6, 10, 11, "#ffe08a");
    clearTile(3, 6);                                                                   // moonmelon mature
    for (var cy5 = 6; cy5 < 16; cy5++) px(3, 6, 8, cy5, "#4f9c3c");
    for (var mx3 = 4; mx3 < 12; mx3++) for (var my3 = 9; my3 < 15; my3++) px(3, 6, mx3, my3, "#7ae0cf");
    for (var mx4 = 5; mx4 < 11; mx4 += 2) for (var my4 = 9; my4 < 15; my4++) px(3, 6, mx4, my4, "#57c2b0");
    paint(4, 6, "#e05e5e", "#c24848", ["#ef7a7a"], 6);                                 // balloon fabric
    for (var vy = 0; vy < TILE; vy++) { px(4, 6, 4, vy, "#f2eee2"); px(4, 6, 10, vy, "#f2eee2"); }
    paint(5, 6, "#a8815a", "#8d6b48", ["#9c7852", "#b58c62"], 8);                      // dockwood
    for (var dx = 0; dx < TILE; dx++) { px(5, 6, dx, 3, "#7c5a39"); px(5, 6, dx, 8, "#7c5a39"); px(5, 6, dx, 13, "#7c5a39"); }
    paint(6, 6, "#b57ae0", "#9760c4", ["#c78ff0", "#8550b0"], 10);                     // glimmer crystal
    spots(6, 6, "#ecd9ff", 4, 2);
    paint(7, 6, "#f2c9d8", "#e0aec2", ["#f9dbe6"], 8);                                 // fluff rose
  }

  var TILE_POS = {};
  names.forEach(function (n) { TILE_POS[T[n]] = [T[n] % GRID, Math.floor(T[n] / GRID)]; });

  function uv(tileId) {
    var p = TILE_POS[tileId];
    var s = 1 / GRID;
    var e = 0.02 * s;
    var u0 = p[0] * s + e, v1 = 1 - p[1] * s - e;
    var u1 = (p[0] + 1) * s - e, v0 = 1 - (p[1] + 1) * s + e;
    return { u0: u0, v0: v0, u1: u1, v1: v1 };
  }

  var texture = null;
  function build() {
    paintAll();
    texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    return texture;
  }

  return { T: T, uv: uv, build: build, canvas: canvas, get texture() { return texture; } };
})();
