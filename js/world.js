"use strict";
/* ============================================================
   THE ISLES — block registry, floating-island terrain
   generation, chunk meshing, and block edits.

   Each isle is a 128x128 floating island: the terrain tapers
   at the edges and ends in open sky (clouds drift below).
   Under the heart of the isle lies THE HOLLOW — glowing
   caverns sealed by rootstone until the Rootbreaker Drill is
   earned from Elder Alder.
   ============================================================ */

/* ---------------- block registry ---------------- */
var B = {
  AIR: 0, MEADOW: 1, EARTH: 2, STONE: 3, CLOUDSAND: 4, TIMBER: 5, LEAF: 6, PLANKS: 7,
  WATER: 8, SNOW: 9, EMBERSTONE: 10, SKYSTEEL: 11, STARSTONE: 12, WONDERSTONE: 13, CHEST: 14,
  ROOTSTONE: 15, SPINELEAF: 16, BELLCAP_STEM: 17, BELLCAP_TOP: 18, GLIMMER: 19, GLOWMOSS: 20,
  ICE: 21, SUNPETAL: 22, BELLBLOOM: 23, SPRITECAP: 24, DUNESTONE: 25, STARMOSS: 26,
  LEAF_ROSE: 27, CLAYBRICK: 28, DUSKSTONE: 29, MOONPEARL: 30, AURORIUM: 31, VOIDGLASS: 32,
  FLUFF: 33, GLASS: 34, LANTERN: 35, DOOR: 36, DOOR_OPEN: 37, LADDER: 38, FENCE: 39,
  BEDROLL: 40, TINKER_BENCH: 41, GARDEN_SOIL: 42, CROP_SPROUT: 43, CROP_MID: 44,
  CROP_SUNFRUIT: 45, CROP_MOONMELON: 46, BERRY_FULL: 47, BERRY_EMPTY: 48,
  BALLOON: 49, DOCKWOOD: 50, FLUFF_ROSE: 51
};

var BLOCKS = (function () {
  var T = Textures.T;
  var d = {};
  function def(id, name, opts) {
    d[id] = Object.assign({
      id: id, name: name, solid: true, cross: false, water: false,
      tiles: null, drop: null, hard: 500, needTool: 0, special: null, icon: "⬜"
    }, opts);
  }
  def(B.MEADOW,     "meadow sod",  { tiles: { top: T.MEADOW_TOP, bottom: T.EARTH, side: T.MEADOW_SIDE }, drop: "earth", hard: 350, icon: "🟩" });
  def(B.EARTH,      "earth",       { tiles: { top: T.EARTH, bottom: T.EARTH, side: T.EARTH }, drop: "earth", hard: 300, icon: "🟫" });
  def(B.STONE,      "stone",       { tiles: { top: T.STONE, bottom: T.STONE, side: T.STONE }, drop: "stone", hard: 700, icon: "🪨" });
  def(B.CLOUDSAND,  "cloudsand",   { tiles: { top: T.CLOUDSAND, bottom: T.CLOUDSAND, side: T.CLOUDSAND }, drop: "cloudsand", hard: 300, icon: "🟨" });
  def(B.TIMBER,     "timber",      { tiles: { top: T.TIMBER_TOP, bottom: T.TIMBER_TOP, side: T.TIMBER_SIDE }, drop: "timber", hard: 450, icon: "🪵" });
  def(B.LEAF,       "leafcrown",   { tiles: { top: T.LEAF, bottom: T.LEAF, side: T.LEAF }, drop: "leaves", hard: 150, icon: "🍃" });
  def(B.PLANKS,     "planks",      { tiles: { top: T.PLANKS, bottom: T.PLANKS, side: T.PLANKS }, drop: "planks", hard: 400, icon: "🟧" });
  def(B.WATER,      "springwater", { tiles: { top: T.WATER, bottom: T.WATER, side: T.WATER }, solid: false, water: true });
  def(B.SNOW,       "snowcap",     { tiles: { top: T.SNOW_TOP, bottom: T.EARTH, side: T.SNOW_SIDE }, drop: "earth", hard: 300, icon: "⬜" });
  def(B.EMBERSTONE, "emberstone",  { tiles: { top: T.EMBERSTONE, bottom: T.EMBERSTONE, side: T.EMBERSTONE }, drop: "emberstone", hard: 800, icon: "🔥" });
  def(B.SKYSTEEL,   "skysteel ore", { tiles: { top: T.SKYSTEEL, bottom: T.SKYSTEEL, side: T.SKYSTEEL }, drop: "skysteel ore", hard: 900, needTool: 1, icon: "🔩" });
  def(B.STARSTONE,  "starstone",   { tiles: { top: T.STARSTONE, bottom: T.STARSTONE, side: T.STARSTONE }, drop: "starstone", hard: 1000, needTool: 2, icon: "🌟" });
  def(B.WONDERSTONE, "wonderstone", { tiles: { top: T.WONDERSTONE, bottom: T.WONDERSTONE, side: T.WONDERSTONE }, special: "wonderstone", hard: 1, icon: "🔮" });
  def(B.CHEST,      "curio chest", { tiles: { top: T.CHEST_TOP, bottom: T.CHEST_TOP, side: T.CHEST_SIDE }, special: "chest", hard: 1, icon: "🧰" });
  def(B.ROOTSTONE,  "rootstone",   { tiles: { top: T.ROOTSTONE, bottom: T.ROOTSTONE, side: T.ROOTSTONE }, hard: 1400, needLegend: "drill" });
  def(B.DUSKSTONE,  "duskstone",   { tiles: { top: T.DUSKSTONE, bottom: T.DUSKSTONE, side: T.DUSKSTONE }, drop: "duskstone", hard: 900, needTool: 1, icon: "⬛" });
  def(B.MOONPEARL,  "moonpearl ore", { tiles: { top: T.MOONPEARL, bottom: T.MOONPEARL, side: T.MOONPEARL }, drop: "moonpearl", hard: 1000, needTool: 2, icon: "🌙" });
  def(B.AURORIUM,   "aurorium ore", { tiles: { top: T.AURORIUM, bottom: T.AURORIUM, side: T.AURORIUM }, drop: "aurorium", hard: 1400, needTool: 2, icon: "🌈" });
  def(B.VOIDGLASS,  "voidglass",   { tiles: { top: T.VOIDGLASS, bottom: T.VOIDGLASS, side: T.VOIDGLASS }, hard: -1 });
  def(B.FLUFF,      "fluff",       { tiles: { top: T.FLUFF, bottom: T.FLUFF, side: T.FLUFF }, drop: "fluff", hard: 250, icon: "☁️" });
  def(B.FLUFF_ROSE, "rose fluff",  { tiles: { top: T.FLUFF_ROSE, bottom: T.FLUFF_ROSE, side: T.FLUFF_ROSE }, drop: "rose fluff", hard: 250, icon: "🌸" });
  def(B.GLASS,      "glass",       { tiles: { top: T.GLASS, bottom: T.GLASS, side: T.GLASS }, drop: "glass", hard: 200, icon: "🪟", opaque: false });
  def(B.LANTERN,    "lantern",     { tiles: { top: T.LANTERN }, cross: true, solid: false, drop: "lantern", hard: 60, icon: "🏮" });
  def(B.SPINELEAF,  "spineleaf",   { tiles: { top: T.SPINE_TOP, bottom: T.SPINE_TOP, side: T.SPINE_SIDE }, drop: "spineleaf", hard: 250, icon: "🌵" });
  def(B.BELLCAP_STEM, "bellcap stem", { tiles: { top: T.BELLCAP_STEM, bottom: T.BELLCAP_STEM, side: T.BELLCAP_STEM }, drop: "spritecap", hard: 300, icon: "🍄" });
  def(B.BELLCAP_TOP, "bellcap",    { tiles: { top: T.BELLCAP_TOP, bottom: T.BELLCAP_STEM, side: T.BELLCAP_TOP }, drop: "spritecap", hard: 300, icon: "🍄" });
  def(B.GLIMMER,    "glimmer crystal", { tiles: { top: T.GLIMMER, bottom: T.GLIMMER, side: T.GLIMMER }, drop: "glimmer", hard: 800, needTool: 1, icon: "🔮" });
  def(B.GLOWMOSS,   "glowmoss",    { tiles: { top: T.GLOWMOSS, bottom: T.GLOWMOSS, side: T.GLOWMOSS }, drop: "glowmoss", hard: 400, icon: "✨" });
  def(B.ICE,        "ice",         { tiles: { top: T.ICE, bottom: T.ICE, side: T.ICE }, drop: "ice", hard: 350, icon: "🧊" });
  def(B.SUNPETAL,   "sunpetal",    { tiles: { top: T.SUNPETAL }, cross: true, solid: false, drop: "sunpetal", hard: 60, icon: "🌼" });
  def(B.BELLBLOOM,  "bellbloom",   { tiles: { top: T.BELLBLOOM }, cross: true, solid: false, drop: "bellbloom", hard: 60, icon: "🔔" });
  def(B.SPRITECAP,  "spritecap",   { tiles: { top: T.SPRITECAP }, cross: true, solid: false, drop: "spritecap", hard: 60, icon: "🍄" });
  def(B.DUNESTONE,  "dunestone",   { tiles: { top: T.DUNESTONE, bottom: T.DUNESTONE, side: T.DUNESTONE }, drop: "dunestone", hard: 600, icon: "🧱" });
  def(B.STARMOSS,   "starmoss",    { tiles: { top: T.STARMOSS, bottom: T.EARTH, side: T.STARMOSS }, drop: "earth", hard: 350, icon: "🟪" });
  def(B.LEAF_ROSE,  "rose leaves", { tiles: { top: T.LEAF_ROSE, bottom: T.LEAF_ROSE, side: T.LEAF_ROSE }, drop: "rose leaves", hard: 150, icon: "🌸" });
  def(B.CLAYBRICK,  "claybrick",   { tiles: { top: T.CLAYBRICK, bottom: T.CLAYBRICK, side: T.CLAYBRICK }, drop: "claybrick", hard: 600, icon: "🧱" });
  def(B.DOOR,       "door",        { tiles: { top: T.DOOR, bottom: T.DOOR, side: T.DOOR }, drop: "door", hard: 350, icon: "🚪", special: "door" });
  def(B.DOOR_OPEN,  "door",        { tiles: { top: T.DOOR, bottom: T.DOOR, side: T.DOOR }, drop: "door", hard: 350, icon: "🚪", special: "door", solid: false, opaque: false });
  def(B.LADDER,     "ladder",      { tiles: { top: T.LADDER }, cross: true, solid: false, drop: "ladder", hard: 80, icon: "🪜" });
  def(B.FENCE,      "fence",       { tiles: { top: T.FENCE, bottom: T.FENCE, side: T.FENCE }, drop: "fence", hard: 300, icon: "🚧", opaque: false });
  def(B.BEDROLL,    "bedroll",     { tiles: { top: T.BEDROLL, bottom: T.PLANKS, side: T.BEDROLL }, drop: "bedroll", hard: 280, icon: "🛏️", special: "bedroll" });
  def(B.TINKER_BENCH, "tinker bench", { tiles: { top: T.BENCH_TOP, bottom: T.PLANKS, side: T.BENCH_SIDE }, drop: "tinker bench", hard: 350, icon: "🛠️", special: "bench" });
  def(B.GARDEN_SOIL, "garden bed", { tiles: { top: T.GARDEN_SOIL, bottom: T.EARTH, side: T.EARTH }, drop: "garden bed", hard: 300, icon: "🟫", special: "garden" });
  def(B.CROP_SPROUT, "sprout",     { tiles: { top: T.CROP_SPROUT }, cross: true, solid: false, hard: 60, special: "crop" });
  def(B.CROP_MID,    "young plant", { tiles: { top: T.CROP_MID }, cross: true, solid: false, hard: 60, special: "crop" });
  def(B.CROP_SUNFRUIT, "sunfruit plant", { tiles: { top: T.CROP_SUNFRUIT }, cross: true, solid: false, hard: 60, special: "crop" });
  def(B.CROP_MOONMELON, "moonmelon plant", { tiles: { top: T.CROP_MOONMELON }, cross: true, solid: false, hard: 60, special: "crop" });
  def(B.BERRY_FULL,  "berry bush", { tiles: { top: T.BERRY_FULL, bottom: T.BERRY_FULL, side: T.BERRY_FULL }, hard: 1, special: "berries", icon: "🫐" });
  def(B.BERRY_EMPTY, "berry bush", { tiles: { top: T.BERRY_EMPTY, bottom: T.BERRY_EMPTY, side: T.BERRY_EMPTY }, drop: "leaves", hard: 200, icon: "🌳" });
  def(B.BALLOON,    "balloon cloth", { tiles: { top: T.BALLOON, bottom: T.BALLOON, side: T.BALLOON }, drop: "balloon cloth", hard: 250, icon: "🎈" });
  def(B.DOCKWOOD,   "dockwood",    { tiles: { top: T.DOCKWOOD, bottom: T.DOCKWOOD, side: T.DOCKWOOD }, drop: "dockwood", hard: 500, icon: "🟫" });
  return d;
})();

// item name -> block placed when building
var ITEM_TO_BLOCK = {
  earth: B.EARTH, stone: B.STONE, cloudsand: B.CLOUDSAND, timber: B.TIMBER,
  leaves: B.LEAF, planks: B.PLANKS, emberstone: B.EMBERSTONE, starstone: B.STARSTONE,
  spineleaf: B.SPINELEAF, spritecap: B.BELLCAP_TOP, glimmer: B.GLIMMER, glowmoss: B.GLOWMOSS,
  ice: B.ICE, sunpetal: B.SUNPETAL, bellbloom: B.BELLBLOOM, dunestone: B.DUNESTONE,
  "rose leaves": B.LEAF_ROSE, claybrick: B.CLAYBRICK, duskstone: B.DUSKSTONE,
  moonpearl: B.MOONPEARL, aurorium: B.AURORIUM, fluff: B.FLUFF, "rose fluff": B.FLUFF_ROSE,
  "skysteel ore": B.SKYSTEEL, glass: B.GLASS, lantern: B.LANTERN,
  door: B.DOOR, ladder: B.LADDER, fence: B.FENCE, bedroll: B.BEDROLL,
  "tinker bench": B.TINKER_BENCH, "garden bed": B.GARDEN_SOIL,
  "water bucket": B.WATER, dockwood: B.DOCKWOOD, "balloon cloth": B.BALLOON
};

var ITEM_ICON = {
  earth: "🟫", stone: "🪨", cloudsand: "🟨", timber: "🪵", leaves: "🍃", planks: "🟧",
  emberstone: "🔥", "skysteel ore": "🔩", skysteel: "⚙️", starstone: "🌟",
  spineleaf: "🌵", spritecap: "🍄", glimmer: "🔮", glowmoss: "✨", ice: "🧊",
  sunpetal: "🌼", bellbloom: "🔔", dunestone: "🧱", "rose leaves": "🌸",
  claybrick: "🧱", duskstone: "⬛", moonpearl: "🌙", aurorium: "🌈",
  fluff: "☁️", "rose fluff": "🌸", glass: "🪟", lantern: "🏮",
  rods: "🥢", door: "🚪", ladder: "🪜", fence: "🚧", bedroll: "🛏️",
  "tinker bench": "🛠️", "garden bed": "🟫", bucket: "🪣", "water bucket": "💧",
  berries: "🫐", sunfruit: "🍊", moonmelon: "🍈", "berry tart": "🥧",
  "sunfruit seeds": "🌱", "moonmelon seeds": "🌱",
  feather: "🪶", shell: "🐚", glowdust: "💫", dockwood: "🟫", "balloon cloth": "🎈"
};

/* ---------------- isle definitions ---------------- */
var ISLE_DEFS = [
  { id: "meadowmere", name: "Meadowmere",  emoji: "🌼", level: 1, sky: 0x8ed1f2, fog: 0xc9e9f7,
    surface: B.MEADOW, under: B.EARTH, base: 14, amp: 7, water: 12, trees: 0.010, flowers: 0.03,
    berries: 0.004, leaves: B.LEAF },
  { id: "ambershore", name: "Ambershore",  emoji: "🏜️", level: 3, sky: 0xf7cf95, fog: 0xf6e3c2,
    surface: B.CLOUDSAND, under: B.DUNESTONE, base: 13, amp: 5, water: -1, trees: 0,
    flowers: 0.008, spines: 0.006, leaves: B.LEAF },
  { id: "frostspire", name: "Frostspire",  emoji: "🏔️", level: 5, sky: 0xcfe8f7, fog: 0xe8f4fb,
    surface: B.SNOW, under: B.EARTH, base: 15, amp: 10, water: -1, trees: 0.006, flowers: 0,
    ice: 0.02, leaves: B.LEAF },
  { id: "mossveil",   name: "Mossveil",    emoji: "🍄", level: 7, sky: 0xa8d8b8, fog: 0xd0ecd8,
    surface: B.MEADOW, under: B.EARTH, base: 13, amp: 6, water: 11, trees: 0, flowers: 0.012,
    bellcaps: 0.008, berries: 0.003, leaves: B.LEAF },
  { id: "starfen",    name: "Starfen",     emoji: "🌌", level: 9, sky: 0x2e2352, fog: 0x4a3a7a,
    surface: B.STARMOSS, under: B.STONE, base: 14, amp: 8, water: -1, trees: 0.006,
    flowers: 0.015, glimmer: 0.008, glow: 0.004, leaves: B.LEAF_ROSE },
  { id: "skydock",    name: "Cloudhaven Skydock", emoji: "🎈", level: 1, needLegend: "skybadge",
    sky: 0x9bc8ec, fog: 0xd2e8f8,
    surface: B.MEADOW, under: B.EARTH, base: 14, amp: 2.2, water: -1, trees: 0.005, flowers: 0.02,
    leaves: B.LEAF, spawn: { x: 64, z: 44, yaw: Math.PI } }
];

/* ---------------- the isle ---------------- */
var World = (function () {
  var SX = 128, SY = 42, SZ = 128;
  // THE HOLLOW: layers below y=0, sealed by rootstone until the
  // Rootbreaker Drill is earned. MIN_Y is unbreakable voidglass.
  var MIN_Y = -20;
  var OY = -MIN_Y;
  var CHUNK = 16;
  var CX = SX / CHUNK, CZ = SZ / CHUNK;

  var data = new Uint8Array(SX * (SY + OY) * SZ);
  var scene = null;
  var material = null, waterMaterial = null;
  var chunkMeshes = [];
  var waterMeshes = [];
  var chunkGroup = null;
  var currentDef = ISLE_DEFS[0];

  function idx(x, y, z) { return ((y + OY) * SZ + z) * SX + x; }
  function inBounds(x, y, z) { return x >= 0 && x < SX && y >= MIN_Y && y < SY && z >= 0 && z < SZ; }
  function getBlock(x, y, z) { return inBounds(x, y, z) ? data[idx(x, y, z)] : B.AIR; }

  /* ----- seeded noise ----- */
  var seedBase = 0;
  function hash2(x, z) {
    var h = (x * 374761393 + z * 668265263 + seedBase * 1442695041) | 0;
    h = (h ^ (h >>> 13)) | 0; h = Math.imul(h, 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function noise2(x, z) {
    var x0 = Math.floor(x), z0 = Math.floor(z);
    var fx = smooth(x - x0), fz = smooth(z - z0);
    var a = hash2(x0, z0), b = hash2(x0 + 1, z0), c = hash2(x0, z0 + 1), d2 = hash2(x0 + 1, z0 + 1);
    return a + (b - a) * fx + (c - a) * fz + (a - b - c + d2) * fx * fz;
  }
  function fbm(x, z) {
    return noise2(x * 0.03, z * 0.03) * 0.6 + noise2(x * 0.08, z * 0.08) * 0.3 + noise2(x * 0.2, z * 0.2) * 0.1;
  }

  // island falloff, 1 at center -> 0 at the rim
  function falloffAt(x, z) {
    var dx = (x - SX / 2) / (SX / 2), dz = (z - SZ / 2) / (SZ / 2);
    var dist = Math.sqrt(dx * dx + dz * dz);
    return Math.max(0, 1 - Math.pow(dist, 3) * 1.15);
  }

  function heightAt(x, z, def) {
    var f = falloffAt(x, z);
    if (f < 0.06) return -1;          // open sky beyond the rim
    var h = Math.floor((def.base + fbm(x, z) * def.amp * 2 - def.amp * 0.5) * f);
    return Math.max(3, Math.min(SY - 8, h));
  }

  /* ----- generation ----- */
  function generate(def) {
    data.fill(B.AIR);
    seedBase = 0;
    for (var i = 0; i < def.id.length; i++) seedBase = (seedBase * 31 + def.id.charCodeAt(i)) | 0;

    var x, y, z;
    for (x = 0; x < SX; x++) for (z = 0; z < SZ; z++) {
      var f = falloffAt(x, z);
      var h = heightAt(x, z, def);
      if (h < 0) continue;             // void column

      var core = f > 0.35;             // the Hollow only lives under the heart
      // tapered underside: near the rim the isle is a thin floating shelf
      var underBase = core ? 0 : Math.max(1, Math.min(h - 2, Math.floor((1 - f) * 11)));

      if (core) {
        data[idx(x, 0, z)] = B.ROOTSTONE;
        data[idx(x, MIN_Y, z)] = B.VOIDGLASS;
        for (y = MIN_Y + 1; y < 0; y++) {
          var db = B.DUSKSTONE;
          var dr = hash2(x * 17 + y * 91, z * 23 + y * 41);
          if (dr < 0.02 && y < -3) db = B.MOONPEARL;
          else if (dr < 0.028 && y < -11) db = B.AURORIUM;
          else if (dr < 0.043) db = B.STARSTONE;
          else if (dr < 0.055) db = B.GLOWMOSS;
          else if (dr < 0.068) db = B.WONDERSTONE;
          data[idx(x, y, z)] = db;
        }
      }

      for (y = Math.max(1, underBase); y <= h; y++) {
        var b;
        if (y >= h) b = def.surface;
        else if (y >= h - 3) b = def.under;
        else {
          b = B.STONE;
          var r = hash2(x * 7 + y * 131, z * 13 + y * 57);
          if (r < 0.015) b = B.EMBERSTONE;
          else if (r < 0.024 && y < 12) b = B.SKYSTEEL;
          else if (r < 0.030 && y < 8) b = B.STARSTONE;
          else if (r < 0.038 && y < 14) b = B.WONDERSTONE;
          else if (def.glow && r < 0.05 && y < 14) b = B.GLOWMOSS;
        }
        data[idx(x, y, z)] = b;
      }

      // ponds (only over the solid heart so water never spills into the sky)
      if (def.water > 0 && core) {
        if (h < def.water) {
          for (y = h + 1; y <= def.water; y++) data[idx(x, y, z)] = B.WATER;
          if (data[idx(x, h, z)] === def.surface) data[idx(x, h, z)] = B.CLOUDSAND;
        } else if (h <= def.water + 1 && data[idx(x, h, z)] === def.surface) {
          data[idx(x, h, z)] = B.CLOUDSAND;
        }
      }
    }

    // decorations (second pass)
    for (x = 2; x < SX - 2; x++) for (z = 2; z < SZ - 2; z++) {
      var h2 = heightAt(x, z, def);
      if (h2 < 0) continue;
      var top = data[idx(x, h2, z)];
      if (top !== def.surface && top !== B.CLOUDSAND) continue;
      if (top === B.CLOUDSAND && def.id !== "ambershore") continue;
      var r2 = hash2(x * 3 + 999, z * 5 + 777);
      var above = h2 + 1;
      if (data[idx(x, above, z)] !== B.AIR) continue;

      if (def.trees && r2 < def.trees && top === def.surface) {
        plantTree(x, above, z, def);
      } else if (def.spines && r2 < (def.trees || 0) + def.spines) {
        var ch = 2 + Math.floor(hash2(x, z * 3) * 2);
        for (y = 0; y < ch; y++) data[idx(x, above + y, z)] = B.SPINELEAF;
      } else if (def.bellcaps && r2 < def.bellcaps) {
        plantBellcap(x, above, z);
      } else if (def.glimmer && r2 < (def.trees || 0) + def.glimmer) {
        var sh = 2 + Math.floor(hash2(x * 5, z) * 3);
        for (y = 0; y < sh; y++) data[idx(x, above + y, z)] = B.GLIMMER;
      } else if (r2 < 0.9 && def.ice && hash2(x * 11, z * 17) < def.ice) {
        data[idx(x, h2, z)] = B.ICE;
      } else if (def.berries && r2 > 0.42 && r2 < 0.42 + def.berries) {
        data[idx(x, above, z)] = B.BERRY_FULL;
      } else if (def.flowers && r2 > 0.5 && r2 < 0.5 + def.flowers) {
        data[idx(x, above, z)] = def.id === "mossveil" ? B.SPRITECAP :
          (hash2(x, z) < 0.5 ? B.SUNPETAL : B.BELLBLOOM);
      } else if (r2 > 0.9915) {
        data[idx(x, above, z)] = B.WONDERSTONE;      // surface wonderstone
      } else if (r2 > 0.9855) {
        data[idx(x, above, z)] = B.CHEST;            // surface curio chest
      }
    }

    if (def.id === "skydock") stampSkydock();
  }

  function plantTree(x, y, z, def) {
    // rounded "puff" canopy: two stacked discs + a cap (not a box)
    var h = 3 + Math.floor(hash2(x, z) * 3);
    var leaves = def.leaves;
    var i, dx, dz;
    for (i = 0; i < h; i++) data[idx(x, y + i, z)] = B.TIMBER;
    var cy = y + h - 1;
    function puff(px2, py2, pz2, r) {
      for (var ax = -r; ax <= r; ax++) for (var az = -r; az <= r; az++) {
        if (ax * ax + az * az > r * r + 0.5) continue;
        var lx = px2 + ax, lz = pz2 + az;
        if (inBounds(lx, py2, lz) && data[idx(lx, py2, lz)] === B.AIR) data[idx(lx, py2, lz)] = leaves;
      }
    }
    puff(x, cy, z, 2);
    puff(x, cy + 1, z, 2);
    puff(x, cy + 2, z, 1);
    if (inBounds(x, cy + 3, z) && data[idx(x, cy + 3, z)] === B.AIR) data[idx(x, cy + 3, z)] = leaves;
  }

  function plantBellcap(x, y, z) {
    var h = 3 + Math.floor(hash2(x * 7, z) * 2);
    for (var i = 0; i < h; i++) data[idx(x, y + i, z)] = B.BELLCAP_STEM;
    for (var dx = -1; dx <= 1; dx++) for (var dz = -1; dz <= 1; dz++) {
      var cx = x + dx, cy = y + h, cz = z + dz;
      if (inBounds(cx, cy, cz)) data[idx(cx, cy, cz)] = B.BELLCAP_TOP;
    }
    if (inBounds(x, y + h + 1, z)) data[idx(x, y + h + 1, z)] = B.BELLCAP_TOP;
  }

  /* ----- Cloudhaven Skydock: docks, tower, and a grand airship ----- */
  function stampSkydock() {
    var Y = 14;
    function put(x, y, z, b) { if (inBounds(x, y, z)) data[idx(x, y, z)] = b; }
    function clearAbove(x, z, y0) { for (var y = y0 + 1; y < SY; y++) put(x, y, z, B.AIR); }
    function column(x, z, top) {
      for (var y = Math.max(1, 6); y < Y; y++) put(x, y, z, y >= Y - 3 ? B.EARTH : B.STONE);
      put(x, Y, z, top);
      clearAbove(x, z, Y);
    }
    function pad(x0, z0, x1, z1, top) {
      for (var x = x0; x <= x1; x++) for (var z = z0; z <= z1; z++) column(x, z, top);
    }
    function box(x0, y0, z0, x1, y1, z1, b) {
      for (var x = x0; x <= x1; x++) for (var y = y0; y <= y1; y++) for (var z = z0; z <= z1; z++) put(x, y, z, b);
    }

    // green staging field
    pad(30, 26, 100, 96, B.MEADOW);

    // long boarding dock reaching toward the open sky
    pad(58, 50, 70, 92, B.DOCKWOOD);
    for (var z = 50; z <= 92; z += 6) {
      put(57, Y + 1, z, B.FENCE); put(71, Y + 1, z, B.FENCE);
      if (z % 12 === 2) { put(57, Y + 2, z, B.LANTERN); put(71, Y + 2, z, B.LANTERN); }
    }

    // harbor house with a glass front
    var hx0 = 40, hx1 = 54, hz0 = 60, hz1 = 74;
    box(hx0, Y + 1, hz0, hx1, Y + 5, hz1, B.CLAYBRICK);
    box(hx0 + 1, Y + 1, hz0 + 1, hx1 - 1, Y + 4, hz1 - 1, B.AIR);
    for (var gz = hz0 + 2; gz <= hz1 - 2; gz++) { put(hx1, Y + 2, gz, B.GLASS); put(hx1, Y + 3, gz, B.GLASS); }
    put(hx1, Y + 1, 67, B.DOOR); put(hx1, Y + 2, 67, B.AIR);
    box(hx0 - 1, Y + 6, hz0 - 1, hx1 + 1, Y + 6, hz1 + 1, B.PLANKS);
    put(hx0 + 3, Y + 1, hz0 + 3, B.CHEST);
    put(hx0 + 5, Y + 1, hz0 + 3, B.WONDERSTONE);
    put(hx0 + 3, Y + 1, hz1 - 3, B.GLOWMOSS);

    // lookout tower with ladder + glass cab
    var twx = 76, twz = 60;
    box(twx, Y + 1, twz, twx + 3, Y + 10, twz + 3, B.CLAYBRICK);
    box(twx + 1, Y + 1, twz + 1, twx + 2, Y + 10, twz + 2, B.AIR);
    put(twx + 1, Y + 1, twz, B.DOOR); put(twx + 1, Y + 2, twz, B.AIR);
    for (var ly = Y + 1; ly <= Y + 10; ly++) put(twx + 1, ly, twz + 1, B.LADDER);
    box(twx, Y + 11, twz, twx + 3, Y + 13, twz + 3, B.GLASS);
    put(twx + 1, Y + 11, twz + 1, B.AIR);
    box(twx, Y + 14, twz, twx + 3, Y + 14, twz + 3, B.PLANKS);
    put(twx + 1, Y + 15, twz + 1, B.GLOWMOSS);

    // THE AIRSHIP — hull moored just off the dock's end, floating in the sky
    stampAirship(64, Y + 3, 100);
    // gangplank steps up onto the deck
    put(64, Y + 1, 91, B.DOCKWOOD);
    put(64, Y + 2, 92, B.DOCKWOOD);

    // a second little skiff by the west dock
    stampSkiff(46, Y + 2, 88);

    function stampAirship(cx, by, cz) {
      var k, s;
      // hull: 15 long, 5 wide, walls of planks with a dockwood keel
      for (k = -7; k <= 7; k++) {
        var w = Math.abs(k) > 5 ? 1 : 2;
        for (s = -w; s <= w; s++) {
          put(cx + s, by, cz + k, B.DOCKWOOD);                   // deck
          if (Math.abs(s) === w) put(cx + s, by + 1, cz + k, B.FENCE); // railing
        }
        put(cx, by - 1, cz + k, B.PLANKS);                       // keel
      }
      // little cabin at the stern
      box(cx - 1, by + 1, cz - 6, cx + 1, by + 2, cz - 4, B.PLANKS);
      box(cx, by + 1, cz - 5, cx, by + 2, cz - 5, B.AIR);
      put(cx, by + 1, cz - 4, B.DOOR); put(cx, by + 2, cz - 4, B.AIR);
      put(cx - 1, by + 2, cz - 5, B.GLASS); put(cx + 1, by + 2, cz - 5, B.GLASS);
      // lanterns fore and aft
      put(cx, by + 1, cz + 7, B.LANTERN);
      put(cx, by + 3, cz - 5, B.LANTERN);
      // balloon: a striped ellipsoid above the deck
      for (k = -6; k <= 6; k++) {
        var r = Math.abs(k) > 4 ? 1 : 2;
        for (var ax = -r; ax <= r; ax++) for (var ay = 0; ay <= r; ay++) {
          if (ax * ax + ay * ay > r * r + 0.5) continue;
          put(cx + ax, by + 6 + ay, cz + k, B.BALLOON);
          put(cx + ax, by + 6 - ay, cz + k, B.BALLOON);
        }
      }
      // rigging
      put(cx - 2, by + 1, cz + 4, B.FENCE); put(cx - 2, by + 2, cz + 4, B.FENCE);
      put(cx + 2, by + 1, cz + 4, B.FENCE); put(cx + 2, by + 2, cz + 4, B.FENCE);
      put(cx - 2, by + 3, cz + 4, B.FENCE); put(cx + 2, by + 3, cz + 4, B.FENCE);
      put(cx - 2, by + 4, cz + 4, B.FENCE); put(cx + 2, by + 4, cz + 4, B.FENCE);
      put(cx - 2, by + 1, cz - 2, B.FENCE); put(cx - 2, by + 2, cz - 2, B.FENCE);
      put(cx + 2, by + 1, cz - 2, B.FENCE); put(cx + 2, by + 2, cz - 2, B.FENCE);
      put(cx - 2, by + 3, cz - 2, B.FENCE); put(cx + 2, by + 3, cz - 2, B.FENCE);
      put(cx - 2, by + 4, cz - 2, B.FENCE); put(cx + 2, by + 4, cz - 2, B.FENCE);
    }

    function stampSkiff(cx, by, cz) {
      for (var k = -3; k <= 3; k++) {
        put(cx, by, cz + k, B.DOCKWOOD);
        put(cx - 1, by, cz + k, B.DOCKWOOD);
        put(cx + 1, by, cz + k, B.DOCKWOOD);
      }
      put(cx, by + 1, cz - 3, B.FENCE);
      put(cx, by + 1, cz + 3, B.LANTERN);
      for (var ax = -1; ax <= 1; ax++) for (var k2 = -2; k2 <= 2; k2++) {
        put(cx + ax, by + 4, cz + k2, B.BALLOON);
      }
      put(cx, by + 5, cz, B.BALLOON);
    }
  }

  /* ----- meshing ----- */
  var FACES = [
    { dir: [0, 1, 0],  corners: [[0,1,1],[1,1,1],[0,1,0],[1,1,0]], tile: "top",    shade: 1.0 },
    { dir: [0, -1, 0], corners: [[0,0,0],[1,0,0],[0,0,1],[1,0,1]], tile: "bottom", shade: 0.5 },
    { dir: [1, 0, 0],  corners: [[1,0,1],[1,0,0],[1,1,1],[1,1,0]], tile: "side",   shade: 0.8 },
    { dir: [-1, 0, 0], corners: [[0,0,0],[0,0,1],[0,1,0],[0,1,1]], tile: "side",   shade: 0.8 },
    { dir: [0, 0, 1],  corners: [[0,0,1],[1,0,1],[0,1,1],[1,1,1]], tile: "side",   shade: 0.7 },
    { dir: [0, 0, -1], corners: [[1,0,0],[0,0,0],[1,1,0],[0,1,0]], tile: "side",   shade: 0.7 }
  ];

  function isOpaque(b) {
    if (b === B.AIR || b === B.WATER) return false;
    var def = BLOCKS[b];
    if (!def) return false;
    if (def.opaque === false) return false;
    return !def.cross;
  }

  function buildChunk(cx, cz) {
    var pos = [], nor = [], uvs = [], col = [], ind = [];
    var wpos = [], wnor = [], wuvs = [], wind = [];
    var x0 = cx * CHUNK, z0 = cz * CHUNK;

    for (var x = x0; x < x0 + CHUNK; x++) for (var z = z0; z < z0 + CHUNK; z++) for (var y = MIN_Y; y < SY; y++) {
      var b = data[idx(x, y, z)];
      if (b === B.AIR) continue;
      var def = BLOCKS[b];

      if (def.cross) {
        addCross(pos, nor, uvs, col, ind, x, y, z, def);
        continue;
      }

      var isWater = def.water;
      for (var f = 0; f < FACES.length; f++) {
        var face = FACES[f];
        var nb = getBlock(x + face.dir[0], y + face.dir[1], z + face.dir[2]);
        if (isWater) {
          if (nb !== B.AIR) continue;
        } else {
          if (isOpaque(nb)) continue;
          if (nb === B.WATER && b === B.WATER) continue;
        }
        var P = isWater ? wpos : pos, N = isWater ? wnor : nor,
            U = isWater ? wuvs : uvs, I = isWater ? wind : ind;
        var vi = P.length / 3;
        var uv = Textures.uv(def.tiles[face.tile] !== undefined ? def.tiles[face.tile] : def.tiles.side);
        var uvC = [[uv.u0, uv.v0], [uv.u1, uv.v0], [uv.u0, uv.v1], [uv.u1, uv.v1]];
        for (var v = 0; v < 4; v++) {
          var c = face.corners[v];
          var yTop = (isWater && face.tile === "top") ? 0.88 : c[1];
          P.push(x + c[0], y + yTop, z + c[2]);
          N.push(face.dir[0], face.dir[1], face.dir[2]);
          U.push(uvC[v][0], uvC[v][1]);
          if (!isWater) col.push(face.shade, face.shade, face.shade);
        }
        I.push(vi, vi + 1, vi + 2, vi + 2, vi + 1, vi + 3);
      }
    }

    var out = { solid: null, water: null };
    if (ind.length) {
      var geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
      geo.setIndex(ind);
      out.solid = new THREE.Mesh(geo, material);
    }
    if (wind.length) {
      var wgeo = new THREE.BufferGeometry();
      wgeo.setAttribute("position", new THREE.Float32BufferAttribute(wpos, 3));
      wgeo.setAttribute("normal", new THREE.Float32BufferAttribute(wnor, 3));
      wgeo.setAttribute("uv", new THREE.Float32BufferAttribute(wuvs, 2));
      wgeo.setIndex(wind);
      out.water = new THREE.Mesh(wgeo, waterMaterial);
    }
    return out;
  }

  function addCross(pos, nor, uvs, col, ind, x, y, z, def) {
    var uv = Textures.uv(def.tiles.top);
    var quads = [
      [[0.15, 0, 0.15], [0.85, 0, 0.85], [0.15, 1, 0.15], [0.85, 1, 0.85]],
      [[0.85, 0, 0.15], [0.15, 0, 0.85], [0.85, 1, 0.15], [0.15, 1, 0.85]]
    ];
    quads.forEach(function (q) {
      var vi = pos.length / 3;
      var uvC = [[uv.u0, uv.v0], [uv.u1, uv.v0], [uv.u0, uv.v1], [uv.u1, uv.v1]];
      for (var v = 0; v < 4; v++) {
        pos.push(x + q[v][0], y + q[v][1], z + q[v][2]);
        nor.push(0, 1, 0);
        uvs.push(uvC[v][0], uvC[v][1]);
        col.push(1, 1, 1);
      }
      ind.push(vi, vi + 1, vi + 2, vi + 2, vi + 1, vi + 3);
      ind.push(vi + 2, vi + 1, vi, vi + 3, vi + 1, vi + 2);
    });
  }

  var chunkSlots = [];
  function rebuildChunk(cx, cz) {
    var i = cz * CX + cx;
    var slot = chunkSlots[i];
    if (slot) {
      if (slot.solid) { chunkGroup.remove(slot.solid); slot.solid.geometry.dispose(); chunkMeshes.splice(chunkMeshes.indexOf(slot.solid), 1); }
      if (slot.water) { chunkGroup.remove(slot.water); slot.water.geometry.dispose(); waterMeshes.splice(waterMeshes.indexOf(slot.water), 1); }
    }
    var built = buildChunk(cx, cz);
    chunkSlots[i] = built;
    if (built.solid) { chunkGroup.add(built.solid); chunkMeshes.push(built.solid); }
    if (built.water) { chunkGroup.add(built.water); waterMeshes.push(built.water); }
  }

  function rebuildAll() {
    if (chunkGroup) scene.remove(chunkGroup);
    chunkMeshes.length = 0; waterMeshes.length = 0;
    chunkSlots = new Array(CX * CZ).fill(null);
    chunkGroup = new THREE.Group();
    scene.add(chunkGroup);
    for (var cz = 0; cz < CZ; cz++) for (var cx = 0; cx < CX; cx++) rebuildChunk(cx, cz);
  }

  /* ----- public API ----- */
  function init(sc) {
    scene = sc;
    var tex = Textures.build();
    material = new THREE.MeshLambertMaterial({ map: tex, vertexColors: true, alphaTest: 0.5 });
    waterMaterial = new THREE.MeshLambertMaterial({ map: tex, transparent: true, opacity: 0.72, side: THREE.DoubleSide });
  }

  function loadIsle(isleId) {
    currentDef = ISLE_DEFS.find(function (w) { return w.id === isleId; }) || ISLE_DEFS[0];
    generate(currentDef);
    var edits = Store.worldEdits(currentDef.id);
    Object.keys(edits).forEach(function (key) {
      var p = key.split(",");
      var x = +p[0], y = +p[1], z = +p[2];
      if (inBounds(x, y, z)) data[idx(x, y, z)] = edits[key];
    });
    rebuildAll();
    return currentDef;
  }

  function setBlock(x, y, z, id) {
    if (!inBounds(x, y, z)) return;
    data[idx(x, y, z)] = id;
    Store.worldEdits(currentDef.id)[x + "," + y + "," + z] = id;
    Store.save();
    var cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    rebuildChunk(cx, cz);
    var lx = x % CHUNK, lz = z % CHUNK;
    if (lx === 0 && cx > 0) rebuildChunk(cx - 1, cz);
    if (lx === CHUNK - 1 && cx < CX - 1) rebuildChunk(cx + 1, cz);
    if (lz === 0 && cz > 0) rebuildChunk(cx, cz - 1);
    if (lz === CHUNK - 1 && cz < CZ - 1) rebuildChunk(cx, cz + 1);
  }

  function surfaceY(x, z) {
    for (var y = SY - 1; y > 0; y--) {
      var b = getBlock(x, y, z);
      if (b !== B.AIR && !BLOCKS[b].cross && b !== B.WATER) return y;
    }
    return -1;   // void column
  }

  // find solid ground near (x,z) — for spawning things safely
  function groundNear(x, z) {
    x = Math.floor(x); z = Math.floor(z);
    for (var r = 0; r < 24; r++) {
      for (var dx = -r; dx <= r; dx++) for (var dz = -r; dz <= r; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        var y = surfaceY(x + dx, z + dz);
        if (y > 0) return { x: x + dx, y: y, z: z + dz };
      }
    }
    return { x: Math.floor(SX / 2), y: surfaceY(Math.floor(SX / 2), Math.floor(SZ / 2)), z: Math.floor(SZ / 2) };
  }

  function isSolid(x, y, z) {
    var b = getBlock(Math.floor(x), Math.floor(y), Math.floor(z));
    return b !== B.AIR && BLOCKS[b] && BLOCKS[b].solid;
  }

  function isWaterAt(x, y, z) {
    return getBlock(Math.floor(x), Math.floor(y), Math.floor(z)) === B.WATER;
  }

  function isLadderAt(x, y, z) {
    return getBlock(Math.floor(x), Math.floor(y), Math.floor(z)) === B.LADDER;
  }

  return {
    init: init, loadIsle: loadIsle, getBlock: getBlock, setBlock: setBlock,
    surfaceY: surfaceY, groundNear: groundNear,
    isSolid: isSolid, isWaterAt: isWaterAt, isLadderAt: isLadderAt,
    get meshes() { return chunkMeshes; },
    get def() { return currentDef; },
    SX: SX, SY: SY, SZ: SZ, MIN_Y: MIN_Y
  };
})();
