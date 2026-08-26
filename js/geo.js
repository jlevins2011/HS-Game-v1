"use strict";
/* ============================================================
   GEO — a tiny merged-geometry builder. Everything visual in
   the world (terrain aside) is composed from a few primitive
   shapes with per-vertex colors, merged into as few meshes as
   possible so hundreds of trees and rocks cost only a handful
   of draw calls. Flat-shaded low-poly: each face gets its own
   vertices, so lighting reads as crisp facets, not cubes.
   ============================================================ */
var Geo = (function () {

  function Builder() {
    this.pos = [];
    this.nor = [];
    this.col = [];
  }

  var _v = new THREE.Vector3();
  var _n = new THREE.Vector3();
  var _q = new THREE.Quaternion();
  var _e = new THREE.Euler();

  function shade(hex, mul) {
    var r = ((hex >> 16) & 255) / 255 * mul;
    var g = ((hex >> 8) & 255) / 255 * mul;
    var b = (hex & 255) / 255 * mul;
    return [Math.min(1, r), Math.min(1, g), Math.min(1, b)];
  }

  // push one triangle with a flat normal and a single color
  Builder.prototype.tri = function (a, b, c, color, jitter) {
    var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    var vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    var len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    nx /= len; ny /= len; nz /= len;
    // subtle per-face brightness variation gives the painterly look
    var mul = 1 + (jitter || 0) * (hash(a[0] * 13.1 + b[1] * 7.7 + c[2] * 3.3) - 0.5);
    var col = shade(color, mul);
    var pts = [a, b, c];
    for (var i = 0; i < 3; i++) {
      this.pos.push(pts[i][0], pts[i][1], pts[i][2]);
      this.nor.push(nx, ny, nz);
      this.col.push(col[0], col[1], col[2]);
    }
  };

  Builder.prototype.quad = function (a, b, c, d, color, jitter) {
    this.tri(a, b, c, color, jitter);
    this.tri(a, c, d, color, jitter);
  };

  function hash(x) {
    var s = Math.sin(x * 127.1) * 43758.5453;
    return s - Math.floor(s);
  }

  // transform helper: rotate (euler y,x,z simplified to yaw) then translate
  function xf(p, t) {
    _v.set(p[0] * (t.sx || t.s || 1), p[1] * (t.sy || t.s || 1), p[2] * (t.sz || t.s || 1));
    if (t.ry) _v.applyAxisAngle(AXIS_Y, t.ry);
    if (t.rx) _v.applyAxisAngle(AXIS_X, t.rx);
    if (t.rz) _v.applyAxisAngle(AXIS_Z, t.rz);
    return [_v.x + (t.x || 0), _v.y + (t.y || 0), _v.z + (t.z || 0)];
  }
  var AXIS_Y = new THREE.Vector3(0, 1, 0);
  var AXIS_X = new THREE.Vector3(1, 0, 0);
  var AXIS_Z = new THREE.Vector3(0, 0, 1);

  /* ---------- primitives (centered at origin unless noted) ---------- */

  // box: w,h,d — sits centered at y=h/2 (base on ground)
  Builder.prototype.box = function (w, h, d, color, t, jitter) {
    t = t || {};
    var x0 = -w / 2, x1 = w / 2, y0 = 0, y1 = h, z0 = -d / 2, z1 = d / 2;
    var P = function (x, y, z) { return xf([x, y, z], t); };
    this.quad(P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z0), P(x0, y1, z0), color, jitter);   // top
    this.quad(P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1), color, jitter);   // bottom
    this.quad(P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1), color, jitter);   // +z
    this.quad(P(x1, y0, z0), P(x0, y0, z0), P(x0, y1, z0), P(x1, y1, z0), color, jitter);   // -z
    this.quad(P(x1, y0, z1), P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), color, jitter);   // +x
    this.quad(P(x0, y0, z0), P(x0, y0, z1), P(x0, y1, z1), P(x0, y1, z0), color, jitter);   // -x
  };

  // cylinder-ish prism: n sides, base radius r0 at y=0, top radius r1 at y=h
  Builder.prototype.cyl = function (r0, r1, h, n, color, t, jitter, noise) {
    t = t || {};
    var P = function (x, y, z) { return xf([x, y, z], t); };
    var pts0 = [], pts1 = [];
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2;
      var w0 = noise ? 1 + (hash(i * 3.7 + (t.x || 0)) - 0.5) * noise : 1;
      var w1 = noise ? 1 + (hash(i * 9.1 + (t.z || 0)) - 0.5) * noise : 1;
      pts0.push([Math.cos(a) * r0 * w0, 0, Math.sin(a) * r0 * w0]);
      pts1.push([Math.cos(a) * r1 * w1, h, Math.sin(a) * r1 * w1]);
    }
    for (var j = 0; j < n; j++) {
      var k = (j + 1) % n;
      this.quad(P.apply(null, pts0[j]), P.apply(null, pts0[k]), P.apply(null, pts1[k]), P.apply(null, pts1[j]), color, jitter);
    }
    // top cap
    for (var m = 1; m < n - 1; m++) {
      this.tri(P.apply(null, pts1[0]), P.apply(null, pts1[m + 1]), P.apply(null, pts1[m]), color, jitter);
    }
    // bottom cap
    for (var m2 = 1; m2 < n - 1; m2++) {
      this.tri(P.apply(null, pts0[0]), P.apply(null, pts0[m2]), P.apply(null, pts0[m2 + 1]), color, jitter);
    }
  };

  // low-poly blob: icosphere-ish from stacked rings, radius r, vertical squash
  Builder.prototype.blob = function (r, color, t, jitter, noise, squash) {
    t = t || {};
    squash = squash || 1;
    var rings = 4, seg = 6;
    var P = function (x, y, z) { return xf([x, y, z], t); };
    var grid = [];
    for (var i = 0; i <= rings; i++) {
      var phi = (i / rings) * Math.PI;
      var row = [];
      for (var j = 0; j < seg; j++) {
        var th = (j / seg) * Math.PI * 2 + (i % 2) * 0.4;
        var w = noise ? 1 + (hash(i * 17.3 + j * 5.1 + (t.x || 0) + (t.z || 0)) - 0.5) * noise : 1;
        row.push([
          Math.sin(phi) * Math.cos(th) * r * w,
          Math.cos(phi) * r * squash * w + r * squash,
          Math.sin(phi) * Math.sin(th) * r * w
        ]);
      }
      grid.push(row);
    }
    for (var a = 0; a < rings; a++) {
      for (var b = 0; b < seg; b++) {
        var c = (b + 1) % seg;
        this.quad(
          P.apply(null, grid[a][b]), P.apply(null, grid[a][c]),
          P.apply(null, grid[a + 1][c]), P.apply(null, grid[a + 1][b]),
          color, jitter);
      }
    }
  };

  // cone: base r at y=0 to a tip at y=h
  Builder.prototype.cone = function (r, h, n, color, t, jitter, noise) {
    this.cyl(r, 0.02, h, n, color, t, jitter, noise);
  };

  Builder.prototype.merge = function (other) {
    this.pos = this.pos.concat(other.pos);
    this.nor = this.nor.concat(other.nor);
    this.col = this.col.concat(other.col);
  };

  Builder.prototype.build = function (material) {
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(this.nor, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(this.col, 3));
    return new THREE.Mesh(geo, material || Geo.material());
  };

  /* one shared lambert for everything merged */
  var mat = null;
  function material() {
    if (!mat) mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    return mat;
  }
  var matGhost = null;
  function ghostMaterial() {
    if (!matGhost) matGhost = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false });
    return matGhost;
  }

  return {
    Builder: Builder, material: material, ghostMaterial: ghostMaterial, hash: hash
  };
})();
