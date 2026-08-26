"use strict";
/* ============================================================
   TERRAIN — sculpted floating islands.

   The world is a smooth heightfield (192x192m), not visible
   voxels: rolling meadows, irregular cliffs, sandy pond
   shores, and a carved rocky underside that tapers beneath
   each island so it reads as a true floating landmass.
   Each isle also has 1-2 small SATELLITE ISLETS drifting
   nearby (reached by building bridges), WITHERED ZONES of
   gray blighted land around dormant Lightsprings, and a
   crystal GROTTO beneath the surface.

   Grid data stays internally (height/mask arrays) for fast
   physics and procedural generation — the player never sees
   a cube.
   ============================================================ */

var ISLE_DEFS = [
  { id: "meadowmere", name: "Meadowmere", emoji: "🌼", level: 1,
    sky: 0x8ed1f2, fog: 0xc9e9f7, water: 10.2, base: 12, amp: 5.5, springs: 3,
    palette: { grass: 0x6fbc53, grass2: 0x8fd672, cliff: 0x8d7458, sand: 0xe8d9a8, under: 0x6b543d, rock: 0x878d94 } },
  { id: "ambershore", name: "Ambershore", emoji: "🏜️", level: 3,
    sky: 0xf7cf95, fog: 0xf6e3c2, water: 9.6, base: 11, amp: 4, springs: 3,
    palette: { grass: 0xe8cd8a, grass2: 0xf2dda3, cliff: 0xc09a62, sand: 0xf2e3b8, under: 0x8d6b43, rock: 0xcfa86e } },
  { id: "frostspire", name: "Frostspire", emoji: "🏔️", level: 5,
    sky: 0xcfe8f7, fog: 0xe8f4fb, water: -1, base: 13, amp: 8, springs: 3,
    palette: { grass: 0xeef4f8, grass2: 0xffffff, cliff: 0x8fa3b8, sand: 0xd8e4ee, under: 0x5c6e80, rock: 0xa8bcd0 } },
  { id: "mossveil", name: "Mossveil", emoji: "🍄", level: 7,
    sky: 0xa8d8b8, fog: 0xd0ecd8, water: 9.8, base: 11, amp: 5, springs: 3,
    palette: { grass: 0x4d9440, grass2: 0x6fb35a, cliff: 0x6b5a48, sand: 0xd9cfa0, under: 0x54432f, rock: 0x7d8a72 } },
  { id: "starfen", name: "Starfen", emoji: "🌌", level: 9,
    sky: 0x2e2352, fog: 0x4a3a7a, water: -1, base: 12, amp: 6.5, springs: 3,
    palette: { grass: 0x7a6fc4, grass2: 0x9488d6, cliff: 0x4a4062, sand: 0x8d82b8, under: 0x342b4d, rock: 0x5c5480 } },
  { id: "skydock", name: "Cloudhaven Skydock", emoji: "🎈", level: 1, needLegend: "skybadge",
    sky: 0x9bc8ec, fog: 0xd2e8f8, water: -1, base: 12, amp: 1.6, springs: 0,
    palette: { grass: 0x7cc75e, grass2: 0x97d97a, cliff: 0x8d7458, sand: 0xe8d9a8, under: 0x6b543d, rock: 0x9aa0a8 },
    spawn: { x: 96, z: 78, yaw: Math.PI } }
];

var Terrain = (function () {
  var SX = 192, SZ = 192;          // world extent (meters)
  var G = SX + 1;                  // height grid corners
  var CX = 96, CZ = 96;            // main island center
  var MAIN_R = 58;                 // main island nominal radius

  var scene = null;
  var currentDef = ISLE_DEFS[0];
  var H = new Float32Array(G * G);       // surface height
  var MASK = new Float32Array(G * G);    // island strength 0..1 (0 = open sky)
  var group = null;                       // all terrain meshes
  var groundMesh = null, colorAttr = null, groundVerts = null;
  var waterMeshes = [];
  var islets = [];                        // {id, x, z, r, top}
  var zones = [];                         // withered zones (lightsprings)
  var seedBase = 0;

  /* ---------------- noise ---------------- */
  function hash2(x, z) {
    var h = (x * 374761393 + z * 668265263 + seedBase * 1442695041) | 0;
    h = (h ^ (h >>> 13)) | 0; h = Math.imul(h, 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  function smoothT(t) { return t * t * (3 - 2 * t); }
  function noise2(x, z) {
    var x0 = Math.floor(x), z0 = Math.floor(z);
    var fx = smoothT(x - x0), fz = smoothT(z - z0);
    var a = hash2(x0, z0), b = hash2(x0 + 1, z0), c = hash2(x0, z0 + 1), d = hash2(x0 + 1, z0 + 1);
    return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
  }
  function fbm(x, z) {
    return noise2(x * 0.03, z * 0.03) * 0.55 + noise2(x * 0.08, z * 0.08) * 0.3 + noise2(x * 0.22, z * 0.22) * 0.15;
  }

  /* ---------------- island field ---------------- */
  function isletDefsFor(def) {
    if (def.id === "skydock") return [];
    // two islets, seeded positions on opposite sides beyond the rim
    var a1 = hash2(3, 7) * Math.PI * 2;
    var a2 = a1 + Math.PI * (0.8 + hash2(11, 5) * 0.5);
    function mk(i, ang, dist, r) {
      return { id: "islet" + i, x: CX + Math.cos(ang) * dist, z: CZ + Math.sin(ang) * dist, r: r };
    }
    return [mk(1, a1, 78, 13), mk(2, a2, 80, 11)];
  }

  // strength of land at (x,z): 1 deep inside, 0 in open sky
  function fieldAt(x, z) {
    var dx = (x - CX) / MAIN_R, dz = (z - CZ) / MAIN_R;
    var d = Math.sqrt(dx * dx + dz * dz);
    // wobble the coastline so the island outline is irregular
    var wob = 1 + (noise2(x * 0.045 + 40, z * 0.045 + 40) - 0.5) * 0.5;
    var f = Math.max(0, 1 - Math.pow(d * wob, 3) * 1.1);
    for (var i = 0; i < islets.length; i++) {
      var it = islets[i];
      var ix = (x - it.x) / it.r, iz = (z - it.z) / it.r;
      var idd = Math.sqrt(ix * ix + iz * iz);
      var iw = 1 + (noise2(x * 0.09 + 90, z * 0.09 + 90) - 0.5) * 0.4;
      f = Math.max(f, Math.max(0, 1 - Math.pow(idd * iw, 3) * 1.1));
    }
    return f;
  }

  function computeField(def) {
    var x, z;
    for (z = 0; z < G; z++) for (x = 0; x < G; x++) {
      var f = fieldAt(x, z);
      var i = z * G + x;
      MASK[i] = f;
      if (f < 0.05) { H[i] = -999; continue; }
      var h = (def.base + (fbm(x, z) - 0.4) * def.amp * 2) * (0.55 + 0.45 * Math.min(1, f * 1.6));
      // gentle plateau near lightsprings so they sit on open ground
      H[i] = Math.max(2.5, h);
    }
    // smooth pass to keep walking pleasant
    var H2 = new Float32Array(H);
    for (z = 1; z < G - 1; z++) for (x = 1; x < G - 1; x++) {
      var i2 = z * G + x;
      if (H[i2] < -100) continue;
      var sum = 0, n = 0;
      for (var dz = -1; dz <= 1; dz++) for (var dx = -1; dx <= 1; dx++) {
        var hh = H[(z + dz) * G + (x + dx)];
        if (hh > -100) { sum += hh; n++; }
      }
      H2[i2] = sum / n;
    }
    H.set(H2);
  }

  /* ---------------- queries ---------------- */
  var grottoMode = false;
  var GROTTO = { x: CX, z: CZ, r: 15, floor: -26 };

  function heightAt(x, z) {
    if (grottoMode) return grottoFloorAt(x, z);
    if (x < 0 || z < 0 || x >= SX || z >= SZ) return -Infinity;
    var x0 = Math.floor(x), z0 = Math.floor(z);
    var i00 = z0 * G + x0, i10 = i00 + 1, i01 = i00 + G, i11 = i01 + 1;
    var h00 = H[i00], h10 = H[i10], h01 = H[i01], h11 = H[i11];
    if (h00 < -100 && h10 < -100 && h01 < -100 && h11 < -100) return -Infinity;
    // treat missing corners as low so rims slope off rather than wall up
    var lo = Math.min(h00 > -100 ? h00 : 99, h10 > -100 ? h10 : 99, h01 > -100 ? h01 : 99, h11 > -100 ? h11 : 99) - 3;
    if (h00 < -100) h00 = lo; if (h10 < -100) h10 = lo;
    if (h01 < -100) h01 = lo; if (h11 < -100) h11 = lo;
    var fx = x - x0, fz = z - z0;
    var a = h00 + (h10 - h00) * fx;
    var b = h01 + (h11 - h01) * fx;
    var h = a + (b - a) * fz;
    // if we're really past the rim, it's open sky
    if (MASK[i00] < 0.045 && MASK[i10] < 0.045 && MASK[i01] < 0.045 && MASK[i11] < 0.045) return -Infinity;
    return h;
  }

  function grottoFloorAt(x, z) {
    var dx = x - GROTTO.x, dz = z - GROTTO.z;
    var d = Math.sqrt(dx * dx + dz * dz);
    if (d > GROTTO.r) return GROTTO.floor + 2.2;   // rises at edges (bowl)
    return GROTTO.floor + noise2(x * 0.3 + 500, z * 0.3 + 500) * 0.8 + Math.pow(d / GROTTO.r, 3) * 2.2;
  }

  function maskAt(x, z) {
    var xi = Math.max(0, Math.min(G - 1, Math.round(x)));
    var zi = Math.max(0, Math.min(G - 1, Math.round(z)));
    return MASK[zi * G + xi];
  }

  function isWater(x, z) {
    if (grottoMode) return false;
    if (currentDef.water < 0) return false;
    // only the inner pond basin holds water — low ground at the island's
    // outer rim is dry (the pond can't spill into the sky)
    if (maskAt(x, z) < 0.2) return false;
    var h = heightAt(x, z);
    return h > -100 && h < currentDef.water - 0.15;
  }

  function groundNear(x, z) {
    if (grottoMode) {
      // clamp inside the grotto bowl
      var gx = x - GROTTO.x, gz = z - GROTTO.z;
      var gd = Math.hypot(gx, gz);
      if (gd > GROTTO.r - 1.5) {
        x = GROTTO.x + (gx / gd) * (GROTTO.r - 1.5);
        z = GROTTO.z + (gz / gd) * (GROTTO.r - 1.5);
      }
      return { x: x, y: grottoFloorAt(x, z), z: z };
    }
    for (var r = 0; r < 40; r += 2) {
      for (var a = 0; a < Math.PI * 2; a += Math.PI / 6) {
        var px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
        var h = heightAt(px, pz);
        if (h > -100 && (currentDef.water < 0 || h > currentDef.water + 0.2)) {
          return { x: px, y: h, z: pz };
        }
      }
    }
    return { x: CX, y: Math.max(2, heightAt(CX, CZ)), z: CZ };
  }

  function slopeAt(x, z) {
    var h = heightAt(x, z);
    if (h < -100) return 99;
    var h1 = heightAt(x + 0.7, z), h2 = heightAt(x, z + 0.7);
    if (h1 < -100 || h2 < -100) return 0;
    return Math.max(Math.abs(h1 - h), Math.abs(h2 - h)) / 0.7;
  }

  /* ---------------- coloring ---------------- */
  function mixHex(c1, c2, t) {
    var r = ((c1 >> 16) & 255) * (1 - t) + ((c2 >> 16) & 255) * t;
    var g = ((c1 >> 8) & 255) * (1 - t) + ((c2 >> 8) & 255) * t;
    var b = (c1 & 255) * (1 - t) + (c2 & 255) * t;
    return [r / 255, g / 255, b / 255];
  }

  function zoneWitherAt(x, z) {
    // 0 = healthy, 1 = fully withered
    var w = 0;
    for (var i = 0; i < zones.length; i++) {
      var zn = zones[i];
      var d = Math.hypot(x - zn.x, z - zn.z);
      if (d < zn.r) {
        var edge = Math.min(1, (zn.r - d) / 5);
        w = Math.max(w, edge * (1 - zn.progress));
      }
    }
    return w;
  }

  function vertexColor(x, z, h) {
    var p = currentDef.palette;
    var slope = slopeAt(x, z);
    var n = noise2(x * 0.12 + 200, z * 0.12 + 200);
    var col;
    if (slope > 1.1) col = mixHex(p.cliff, p.rock, n * 0.6);
    else if (slope > 0.72) col = mixHex(p.cliff, p.grass, 0.25 + n * 0.2);
    else if (currentDef.water > 0 && h < currentDef.water + 0.7) col = mixHex(p.sand, p.grass, Math.max(0, (h - currentDef.water) * 0.8));
    else col = mixHex(p.grass, p.grass2, n);
    var w = zoneWitherAt(x, z);
    if (w > 0) {
      var gray = (col[0] + col[1] + col[2]) / 3 * 0.62 + 0.16;
      col = [col[0] + (gray * 0.98 - col[0]) * w, col[1] + (gray * 0.9 - col[1]) * w, col[2] + (gray * 0.82 - col[2]) * w];
    }
    return col;
  }

  /* ---------------- meshes ---------------- */
  function buildGround() {
    var b = { pos: [], col: [], idx: [] };
    var vidx = {};   // grid index -> vertex index
    groundVerts = [];
    function vert(x, z) {
      var key = z * G + x;
      if (vidx[key] !== undefined) return vidx[key];
      var h = H[key] > -100 ? H[key] : lowNeighbor(x, z);
      var i = b.pos.length / 3;
      b.pos.push(x, h, z);
      var c = vertexColor(x, z, h);
      b.col.push(c[0], c[1], c[2]);
      groundVerts.push({ x: x, z: z, h: h });
      vidx[key] = i;
      return i;
    }
    function lowNeighbor(x, z) {
      var best = 3;
      for (var dz = -1; dz <= 1; dz++) for (var dx = -1; dx <= 1; dx++) {
        var h = H[(z + dz) * G + (x + dx)];
        if (h > -100) best = Math.min(best === 3 ? h : best, h);
      }
      return (best === 3 ? 3 : best) - 2.2;   // rim dips down for a soft edge
    }
    for (var z = 0; z < G - 1; z++) for (var x = 0; x < G - 1; x++) {
      var m = Math.max(MASK[z * G + x], MASK[z * G + x + 1], MASK[(z + 1) * G + x], MASK[(z + 1) * G + x + 1]);
      if (m < 0.05) continue;
      var a = vert(x, z), bq = vert(x + 1, z), c = vert(x + 1, z + 1), d = vert(x, z + 1);
      b.idx.push(a, c, bq, a, d, c);
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(b.pos, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(b.col, 3));
    geo.setIndex(b.idx);
    geo.computeVertexNormals();
    colorAttr = geo.getAttribute("color");
    var mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
    return mesh;
  }

  function recolorGround() {
    if (!colorAttr) return;
    for (var i = 0; i < groundVerts.length; i++) {
      var v = groundVerts[i];
      var c = vertexColor(v.x, v.z, v.h);
      colorAttr.setXYZ(i, c[0], c[1], c[2]);
    }
    colorAttr.needsUpdate = true;
  }

  // carved rocky underside: same footprint, mirrored & deepened, faceted
  function buildUnderside() {
    var p = currentDef.palette;
    var g = new Geo.Builder();
    var step = 4;   // chunkier facets below (cheap + craggy)
    function bottomAt(x, z) {
      var f = fieldAt(x, z);
      var n = noise2(x * 0.07 + 300, z * 0.07 + 300);
      return -(2 + Math.pow(f, 0.85) * (16 + n * 9));
    }
    // lowest surface height within a step-radius — the underside must
    // always stay safely below it, or crags poke up through hillsides
    function lowSurface(px, pz) {
      var lo = Infinity;
      for (var dz = -step; dz <= step; dz += step) for (var dx = -step; dx <= step; dx += step) {
        var h = heightAt(Math.max(0, Math.min(SX - 0.01, px + dx)), Math.max(0, Math.min(SZ - 0.01, pz + dz)));
        if (h > -100 && h < lo) lo = h;
      }
      return lo === Infinity ? 3 : lo;
    }
    for (var z = 0; z < SZ; z += step) for (var x = 0; x < SX; x += step) {
      var f00 = fieldAt(x, z), f10 = fieldAt(x + step, z), f01 = fieldAt(x, z + step), f11 = fieldAt(x + step, z + step);
      var fmax = Math.max(f00, f10, f01, f11);
      if (fmax < 0.05) continue;
      function pt(px, pz) {
        var f = fieldAt(px, pz);
        var lo = lowSurface(px, pz);
        var y = Math.min(lo - 0.7, f < 0.06 ? lo - 1.2 : bottomAt(px, pz));
        return [px, y, pz];
      }
      // reversed winding so faces point down/outward
      g.tri(pt(x, z), pt(x + step, z), pt(x + step, z + step), p.under, 0.45);
      g.tri(pt(x, z), pt(x + step, z + step), pt(x, z + step), p.under, 0.45);
    }
    var mesh = g.build();
    mesh.material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    return mesh;
  }

  function buildWater() {
    waterMeshes.forEach(function (m) { group.remove(m); });
    waterMeshes = [];
    if (currentDef.water < 0) return;
    // cover only the actual pond cells so water never pokes into the sky
    var x0 = G, x1 = 0, z0 = G, z1 = 0, found = false;
    for (var z = 0; z < G; z++) for (var x = 0; x < G; x++) {
      var i = z * G + x;
      if (H[i] > -100 && MASK[i] > 0.2 && H[i] < currentDef.water) {
        found = true;
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (z < z0) z0 = z; if (z > z1) z1 = z;
      }
    }
    if (!found) return;
    x0 -= 1; z0 -= 1; x1 += 2; z1 += 2;
    var geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0, 1, 1);
    geo.rotateX(-Math.PI / 2);
    var mat = new THREE.MeshLambertMaterial({ color: 0x54a2e8, transparent: true, opacity: 0.66 });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.position.set((x0 + x1) / 2, currentDef.water, (z0 + z1) / 2);
    group.add(mesh);
    waterMeshes.push(mesh);
  }

  /* ---------------- the grotto ---------------- */
  var grottoGroup = null;
  function buildGrotto() {
    var g = new Geo.Builder();
    var p = currentDef.palette;
    var R = GROTTO.r + 1.5, fy = GROTTO.floor;
    // bumpy floor disc
    var seg = 18;
    for (var i = 0; i < seg; i++) {
      var a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      for (var rr = 0; rr < 3; rr++) {
        var r0 = R * rr / 3, r1 = R * (rr + 1) / 3;
        function fp(a, r) {
          var x = GROTTO.x + Math.cos(a) * r, z = GROTTO.z + Math.sin(a) * r;
          return [x, grottoFloorAt(x, z) - 0.05, z];
        }
        g.quad(fp(a0, r0), fp(a0, r1), fp(a1, r1), fp(a1, r0), 0x3c3750, 0.5);
      }
    }
    // cave walls + ceiling dome (inward faces)
    var H2 = 9;
    for (var j = 0; j < seg; j++) {
      var b0 = (j / seg) * Math.PI * 2, b1 = ((j + 1) / seg) * Math.PI * 2;
      var w0 = 1 + (Geo.hash(j * 7.3) - 0.5) * 0.25;
      var w1 = 1 + (Geo.hash((j + 1) * 7.3) - 0.5) * 0.25;
      function wp(a, w, y, rmul) {
        return [GROTTO.x + Math.cos(a) * R * w * (rmul || 1), y, GROTTO.z + Math.sin(a) * R * w * (rmul || 1)];
      }
      g.quad(wp(b0, w0, fy - 0.5), wp(b0, w0, fy + H2 * 0.6), wp(b1, w1, fy + H2 * 0.6), wp(b1, w1, fy - 0.5), 0x342e48, 0.5);
      g.quad(wp(b0, w0, fy + H2 * 0.6), wp(b0, w0, fy + H2, 0.45), wp(b1, w1, fy + H2, 0.45), wp(b1, w1, fy + H2 * 0.6), 0x2a2540, 0.5);
      g.tri(wp(b0, w0, fy + H2, 0.45), [GROTTO.x, fy + H2 + 1.5, GROTTO.z], wp(b1, w1, fy + H2, 0.45), 0x241f38, 0.5);
    }
    grottoGroup = new THREE.Group();
    grottoGroup.add(g.build());
    grottoGroup.visible = false;
    group.add(grottoGroup);
  }

  function enterGrotto() { grottoMode = true; if (grottoGroup) grottoGroup.visible = true; }
  function exitGrotto() { grottoMode = false; if (grottoGroup) grottoGroup.visible = false; }

  /* ---------------- lightspring zones ---------------- */
  function computeZones(def, isleState) {
    zones = [];
    if (!def.springs) return;
    var placed = 0, guard = 0;
    while (placed < def.springs && guard++ < 300) {
      var a = hash2(guard * 13, placed * 71) * Math.PI * 2;
      var d = 20 + hash2(placed * 31, guard * 7) * 26;
      var x = CX + Math.cos(a) * d, z = CZ + Math.sin(a) * d;
      var h = heightAt(x, z);
      if (h < -100 || (def.water > 0 && h < def.water + 0.6)) continue;
      if (zones.some(function (zn) { return Math.hypot(zn.x - x, zn.z - z) < 30; })) continue;
      var id = "spring" + placed;
      var restored = !!(isleState.springs && isleState.springs.indexOf(id) >= 0);
      zones.push({ id: id, x: x, z: z, r: 14, restored: restored, progress: restored ? 1 : 0 });
      placed++;
    }
  }

  function zoneAt(x, z) {
    for (var i = 0; i < zones.length; i++) {
      if (Math.hypot(x - zones[i].x, z - zones[i].z) < zones[i].r) return zones[i];
    }
    return null;
  }

  /* ---------------- public ---------------- */
  function init(sc) { scene = sc; }

  function loadIsle(isleId, isleState) {
    currentDef = ISLE_DEFS.find(function (w) { return w.id === isleId; }) || ISLE_DEFS[0];
    seedBase = 0;
    for (var i = 0; i < currentDef.id.length; i++) seedBase = (seedBase * 31 + currentDef.id.charCodeAt(i)) | 0;
    islets = isletDefsFor(currentDef);
    grottoMode = false;

    if (group) scene.remove(group);
    group = new THREE.Group();
    scene.add(group);

    computeField(currentDef);
    computeZones(currentDef, isleState || {});
    groundMesh = buildGround();
    group.add(groundMesh);
    group.add(buildUnderside());
    buildWater();
    buildGrotto();
    return currentDef;
  }

  // find a scenic cliff-adjacent spot for the grotto door
  function grottoDoorSpot() {
    var best = null;
    for (var a = 0; a < Math.PI * 2; a += 0.3) {
      for (var d = 26; d < 48; d += 3) {
        var x = CX + Math.cos(a) * d, z = CZ + Math.sin(a) * d;
        var s = slopeAt(x, z);
        var h = heightAt(x, z);
        if (h < -100) continue;
        if (currentDef.water > 0 && h < currentDef.water + 0.6) continue;   // stay above the pond line
        if (s > 0.7 && s < 2.2 && (!best || s > best.s)) best = { x: x, z: z, y: h, s: s };
      }
    }
    return best || { x: CX + 20, z: CZ, y: heightAt(CX + 20, CZ), s: 1 };
  }

  return {
    init: init, loadIsle: loadIsle,
    heightAt: heightAt, isWater: isWater, groundNear: groundNear, slopeAt: slopeAt,
    recolorGround: recolorGround, zoneAt: zoneAt, grottoDoorSpot: grottoDoorSpot,
    enterGrotto: enterGrotto, exitGrotto: exitGrotto,
    get inGrotto() { return grottoMode; },
    get grotto() { return GROTTO; },
    get zones() { return zones; },
    get islets() { return islets; },
    get def() { return currentDef; },
    get groundMesh() { return groundMesh; },
    get worldGroup() { return group; },
    SX: SX, SZ: SZ, CX: CX, CZ: CZ
  };
})();
