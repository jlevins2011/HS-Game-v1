"use strict";
/* ============================================================
   BUILD — modular construction. Children compose real
   structures from meaningful pieces — floors, walls, doors,
   windows, roofs, stairs, fences, bridges, tents, planters,
   lanterns — with generous snapping on a 2m grid. A ghost
   preview shows exactly where the piece will land; tap to
   place. Bridges can span open sky between isles.
   ============================================================ */
var Build = (function () {
  var CELL = 2;
  var WALL_H = 2.4;
  var DOOR_HALF = 0.6;      // the doorway opening is DOOR_HALF*2 wide

  var scene = null;
  var isleState = null;
  var pieces = [];            // { t, x, y, z, r, mesh, tops:[], solids:[] }
  var group = null;
  var ghostMesh = null, ghostValid = false, ghostPose = null;
  var mode = false, removeMode = false;
  var activePiece = "floor";
  var rotIdx = 0;
  var roofLift = 0;
  var ghostKey = "";
  var FLOOR_H = 0.22, ROOF_H = 1.3, STAIR_H = (WALL_H + FLOOR_H) / 2;
  var lanternLights = [];

  /* ---------------- piece catalog ---------------- */
  var WOOD = 0xc59a63, WOOD_D = 0x8a6540, WOOD_L = 0xd9b078;
  var CANVAS = 0xf2eee2, ACCENT = 0xd95f5f, GLASSC = 0xbfe4f4, SOIL = 0x6d4f37;

  var PIECES = [
    { id: "floor", name: "Floor", icon: "▦", cost: { timber: 2 },
      desc: "A sturdy platform. Stack walls on it, or aim at a wall top for an upper story." },
    { id: "wall", name: "Wall", icon: "▮", cost: { timber: 2 }, desc: "Plank wall on a cell edge. Rotate to face it." },
    { id: "window", name: "Window Wall", icon: "⊞", cost: { timber: 2, glass: 1 }, desc: "A wall with a bright window." },
    { id: "door", name: "Door", icon: "🚪", cost: { timber: 3 }, desc: "A real door — tap it to swing it open and shut." },
    { id: "roof", name: "Roof", icon: "⌂", cost: { timber: 2 }, desc: "A narrow gable roof. Extend along its ridge; use slopes for wider rooms." },
    { id: "stairs", name: "Stairs", icon: "𝍖", cost: { timber: 2 }, desc: "Two flights reach one story. Aim at the top step to continue upward." },
    { id: "fence", name: "Fence", icon: "🚧", cost: { timber: 1 }, desc: "Keeps tuftles out. Or in." },
    { id: "bridge", name: "Bridge", icon: "🌉", cost: { timber: 2, fluff: 1 },
      desc: "A rope-and-plank span. Chain them across open sky between anchors!" },
    { id: "tent", name: "Camp Tent", icon: "⛺", cost: { timber: 2, fluff: 2 },
      desc: "Your camp. If you fall off the isle, you wake up here." },
    { id: "planter", name: "Planter", icon: "🌱", cost: { timber: 2 },
      desc: "Rich soil for seeds. Tap it to plant, tap again to harvest." },
    { id: "lantern", name: "Lantern Post", icon: "🏮", cost: { timber: 1, emberstone: 1 },
      desc: "Warm light for paths, camps, and the Hollow.", needs: "lanternkit" },
    { id: "roof_slope", name: "Roof Slope", icon: "◩", cost: { timber: 2, leaves: 1 }, desc: "Rises toward the arrow. Rotate the opposite slope to meet at the ridge." },
    { id: "roof_corner", name: "Roof Corner", icon: "◭", cost: { timber: 2, leaves: 1 }, desc: "Outside hip corner. Rotate to join two slopes." },
    { id: "roof_inner", name: "Roof Valley", icon: "◪", cost: { timber: 2, leaves: 1 }, desc: "Inside corner where two roof wings meet." },
    { id: "stonefloor", name: "Stone Foundation", icon: "▦", cost: { stone: 3 }, desc: "A level foundation. Adjacent foundations share a height." },
    { id: "brickwall", name: "Brick Wall", icon: "▤", cost: { claybrick: 2 }, desc: "Fits the same grid as wooden walls and doors." },
    { id: "bench", name: "Workshop Table", icon: "🛠️", cost: { timber: 3, skysteel: 1 }, desc: "A working table: tap to craft tools and supplies." },
    { id: "bed", name: "Feather Bed", icon: "🛏️", cost: { timber: 3, fluff: 3, feather: 2 }, desc: "A soft bed that becomes your respawn camp." },
    { id: "shellpath", name: "Shell Path", icon: "🐚", cost: { stone: 1, shell: 2 }, desc: "A pale mosaic path, flush with your floors." },
    { id: "flowerbox", name: "Flower Box", icon: "🌼", cost: { timber: 1, sunpetal: 2, bellbloom: 2 }, desc: "Bring flowers home in a bright window-height box." },
    { id: "crystallamp", name: "Crystal Lamp", icon: "🔮", cost: { glimmer: 1, glowdust: 2, glowmoss: 1 }, desc: "A glowing lamp for your home. No lantern kit needed." },
    { id: "moonlamp", name: "Moonpearl Lamp", icon: "🌙", cost: { moonpearl: 1, aurorium: 1, glowdust: 2 }, desc: "A rare blue light from the depths of the Hollow." }
  ];
  function isRoof(t) { return t === "roof" || t.indexOf("roof_") === 0; }
  function isFloor(t) { return ["floor", "stonefloor", "shellpath"].indexOf(t) >= 0; }
  function isFurniture(t) {return ["tent","planter","lantern","bench","bed","flowerbox","crystallamp","moonlamp"].indexOf(t)>=0;}
  function isWall(t) { return ["wall", "window", "door", "brickwall"].indexOf(t) >= 0; }
  function rise(p) { return p.v ? STAIR_H : 1.36; }
  function pieceDef(id) { return PIECES.find(function (p) { return p.id === id; }); }

  /* ---------------- geometry builders ---------------- */
  // built at origin facing +z (rot applied via t.ry), base at y=0
  function buildPieceGeo(g, t, pose) {
    // grid pieces rotate in 90° steps; bridges take a free angle (pose.ry)
    var T = { x: pose.x, y: pose.y, z: pose.z, ry: pose.ry !== undefined ? pose.ry : pose.r * Math.PI / 2 };
    function o(dx, dy, dz, extra) {
      var e = Object.assign({}, T, extra);
      var c = Math.cos(T.ry), s = Math.sin(T.ry);
      e.x = T.x + dx * c + dz * s;
      e.z = T.z - dx * s + dz * c;
      e.y = T.y + dy;
      if (extra && extra.ry !== undefined) e.ry = T.ry + extra.ry;
      return e;
    }
    if (isFloor(t)) {
      g.box(CELL, FLOOR_H, CELL, t === "stonefloor" ? 0x929aa6 : t === "shellpath" ? 0xe1d5bb : WOOD, o(0, 0, 0), 0.12);
      // Seams stay inside the deck; raised rails used to snag adjoining rooms.
      g.box(CELL, 0.01, 0.035, WOOD_D, o(0, FLOOR_H - 0.01, 0), 0);
    } else if (t === "brickwall") {
      g.box(CELL, WALL_H, 0.3, 0xab7867, o(0, 0, 0), 0.12);
      for (var row = 1; row < 6; row++) g.box(CELL, 0.025, 0.305, 0xdbcab6, o(0, row * 0.4, 0), 0);
    } else if (t === "wall" || t === "window" || t === "door") {
      // Boards butt flush against each other (no gaps to see daylight through)
      // and each is thicker than the collider is deep, so you never see the
      // world through a wall you are standing against.
      var boards = 5;
      var bw = CELL / boards;
      var TH = 0.26;
      for (var i = 0; i < boards; i++) {
        var bx = -CELL / 2 + (i + 0.5) * bw;
        var isOpen = i > 0 && i < 4 && (t === "door" || t === "window");
        if (!isOpen) {
          g.box(bw, WALL_H, TH, i % 2 ? WOOD : WOOD_L, o(bx, 0, 0), 0.12);
        } else if (t === "window") {
          g.box(bw, 0.7, TH, i % 2 ? WOOD : WOOD_L, o(bx, 0, 0), 0.12);
          g.box(bw, 0.5, TH, i % 2 ? WOOD : WOOD_L, o(bx, WALL_H - 0.5, 0), 0.12);
          g.box(bw, WALL_H - 1.2, 0.08, GLASSC, o(bx, 0.7, 0), 0.05);
        } else {
          g.box(bw, WALL_H - 1.95, TH, i % 2 ? WOOD : WOOD_L, o(bx, 1.95, 0), 0.12);
        }
      }
      // top and bottom rails tie the boards together
      g.box(CELL, 0.16, TH + 0.06, WOOD_D, o(0, WALL_H - 0.16, 0), 0.1);
      g.box(CELL, 0.14, TH + 0.06, WOOD_D, o(0, 0, 0), 0.1);
      if (t === "door") {
        // lintel over the opening
        g.box(CELL * 0.62, 0.18, TH + 0.04, WOOD_D, o(0, 1.95, 0), 0.1);
        // the door leaf itself, hinged on the left post. Closed it fills the
        // opening; open it swings clear so you can walk through.
        var swing = pose.open ? -1.62 : 0;               // ~93 degrees
        var hx = -DOOR_HALF;                              // hinge, local x
        var lx = hx + DOOR_HALF * Math.cos(swing);
        var lz = -DOOR_HALF * Math.sin(swing);
        g.box(DOOR_HALF * 2 - 0.06, 1.92, 0.12, WOOD_L, o(lx, 0.02, lz, { ry: swing }), 0.1);
        // three plank lines + a round handle so it reads as a door
        g.box(DOOR_HALF * 2 - 0.12, 0.07, 0.15, WOOD_D, o(lx, 0.35, lz, { ry: swing }), 0.05);
        g.box(DOOR_HALF * 2 - 0.12, 0.07, 0.15, WOOD_D, o(lx, 1.5, lz, { ry: swing }), 0.05);
        var handleLocal = DOOR_HALF * 2 - 0.28;
        g.blob(0.09, 0xf2ca55, o(lx + (handleLocal - DOOR_HALF) * Math.cos(swing),
                                 1.0,
                                 lz - (handleLocal - DOOR_HALF) * Math.sin(swing)), 0, 0);
      }
    } else if (isRoof(t)) {
      // A tiled height field with a real underside. All roof modules meet at
      // cell boundaries; no overlapping 0.5m overhang on every internal seam.
      var steps = t === "roof" ? 2 : 1;
      function rp(x, z, lower) { var q = o(x, roofHeight(t, x, z) - (lower ? 0.12 : 0), z); return [q.x, q.y, q.z]; }
      for (var iz = 0; iz < steps; iz++) for (var ix = 0; ix < steps; ix++) {
        var x0 = -1 + ix * 2 / steps, x1 = x0 + 2 / steps;
        var z0 = -1 + iz * 2 / steps, z1 = z0 + 2 / steps;
        // Diagonal from low/low to high/high matches min/max corner slopes.
        g.tri(rp(x0,z0), rp(x1,z1), rp(x1,z0), ACCENT, 0.08);
        g.tri(rp(x0,z0), rp(x0,z1), rp(x1,z1), ACCENT, 0.08);
        g.tri(rp(x0,z0,true), rp(x1,z0,true), rp(x1,z1,true), WOOD_D, 0);
        g.tri(rp(x0,z0,true), rp(x1,z1,true), rp(x0,z1,true), WOOD_D, 0);
      }
      var border = [[-1,-1],[1,-1],[1,1],[-1,1]];
      border.forEach(function (a, i) {
        var b = border[(i+1)%4];
        for (var j=0; j<steps; j++) {
          var ax=a[0]+(b[0]-a[0])*j/steps, az=a[1]+(b[1]-a[1])*j/steps;
          var bx=a[0]+(b[0]-a[0])*(j+1)/steps, bz=a[1]+(b[1]-a[1])*(j+1)/steps;
          g.quad(rp(ax,az),rp(bx,bz),rp(bx,bz,true),rp(ax,az,true),WOOD_D,0);
        }
      });
    } else if (t === "stairs") {
      for (var s = 0; s < 4; s++) {
        var sh = rise(pose) / 4;
        g.box(CELL, (s + 1) * sh, CELL / 4, s % 2 ? WOOD : WOOD_L, o(0, 0, -CELL / 2 + (s + 0.5) * CELL / 4), 0.12);
      }
    } else if (t === "fence") {
      g.box(0.12, 1.0, 0.12, WOOD_D, o(-CELL / 2 + 0.1, 0, 0), 0.1);
      g.box(0.12, 1.0, 0.12, WOOD_D, o(CELL / 2 - 0.1, 0, 0), 0.1);
      g.box(CELL, 0.1, 0.08, WOOD, o(0, 0.75, 0), 0.1);
      g.box(CELL, 0.1, 0.08, WOOD, o(0, 0.35, 0), 0.1);
    } else if (t === "bridge") {
      for (var b = 0; b < 6; b++) {
        g.box(1.6, 0.12, 0.55, b % 2 ? WOOD : WOOD_L, o(0, 0, -CELL + (b + 0.5) * (CELL * 2 / 6)), 0.15);
      }
      g.box(0.1, 0.1, CELL * 2, WOOD_D, o(-0.8, -0.08, 0), 0.1);
      g.box(0.1, 0.1, CELL * 2, WOOD_D, o(0.8, -0.08, 0), 0.1);
      // rope rails
      g.box(0.07, 0.07, CELL * 2, 0xa89060, o(-0.85, 0.85, 0), 0);
      g.box(0.07, 0.07, CELL * 2, 0xa89060, o(0.85, 0.85, 0), 0);
      g.box(0.07, 0.95, 0.07, WOOD_D, o(-0.85, 0, -CELL + 0.1), 0);
      g.box(0.07, 0.95, 0.07, WOOD_D, o(0.85, 0, -CELL + 0.1), 0);
      g.box(0.07, 0.95, 0.07, WOOD_D, o(-0.85, 0, CELL - 0.1), 0);
      g.box(0.07, 0.95, 0.07, WOOD_D, o(0.85, 0, CELL - 0.1), 0);
    } else if (t === "tent") {
      var tw = CELL + 0.4, th = 1.7, td = CELL + 0.6;
      var TA = o(-tw / 2, 0, -td / 2), TB = o(tw / 2, 0, -td / 2), TC = o(tw / 2, 0, td / 2), TD = o(-tw / 2, 0, td / 2);
      var TR1 = o(0, th, -td / 2), TR2 = o(0, th, td / 2);
      function tp(e) { return [e.x, e.y, e.z]; }
      g.quad(tp(TA), tp(TR1), tp(TR2), tp(TD), CANVAS, 0.12);
      g.quad(tp(TR1), tp(TB), tp(TC), tp(TR2), ACCENT, 0.12);
      g.tri(tp(TD), tp(TR2), tp(TC), CANVAS, 0.1);
      g.box(0.1, th, 0.1, WOOD_D, o(0, 0, -td / 2), 0.1);
      g.box(0.1, th, 0.1, WOOD_D, o(0, 0, td / 2), 0.1);
      g.box(1.2, 0.28, 0.8, 0x5e8fd0, o(0.4, 0.02, 0), 0.1);   // bedroll inside
    } else if (t === "planter") {
      g.box(1.7, 0.45, 1.7, WOOD_D, o(0, 0, 0), 0.12);
      g.box(1.45, 0.14, 1.45, SOIL, o(0, 0.42, 0), 0.2);
    } else if (t === "bench" || t === "bed" || t === "flowerbox") {
      var h = t === "bench" ? 0.8 : 0.4;
      g.box(1.65, 0.18, 1.25, WOOD, o(0,h,0),0.1);
      [-0.65,0.65].forEach(function(x){ [-0.45,0.45].forEach(function(z){g.box(0.16,h,0.16,WOOD_D,o(x,0,z),0);}); });
      if(t === "bed") { g.box(1.5,0.18,1.18,0x487c9d,o(0,h+0.18,0),0.05); g.box(1.4,0.12,0.35,CANVAS,o(0,h+0.36,-0.35),0); }
      if(t === "flowerbox") { [-0.5,0,0.5].forEach(function(x){g.cyl(0.04,0.03,0.4,4,0x4b8855,o(x,0.58,0),0);g.blob(0.17,x ? 0xf2c957 : 0xbc84cb,o(x,0.9,0),0,0);}); }
    } else if (t === "crystallamp" || t === "moonlamp") {
      g.box(0.55,0.2,0.55,WOOD_D,o(0,0,0),0);
      g.cyl(0.24,0.1,0.8,5,t === "moonlamp" ? 0xbadfff : 0x9be4ba,o(0,0.2,0),0.1,0);
    } else if (t === "lantern") {
      g.cyl(0.09, 0.07, 2.1, 5, WOOD_D, o(0, 0, 0), 0.1, 0);
      g.box(0.42, 0.5, 0.42, 0x4a3a2c, o(0, 2.1, 0), 0.1);
      g.box(0.3, 0.34, 0.3, 0xffdf8a, o(0, 2.16, 0), 0);
      g.cone(0.34, 0.3, 4, ACCENT, o(0, 2.6, 0), 0.1, 0);
    }
  }

  /* ---------------- colliders per piece ---------------- */
  function computePhysics(p) {
    var tops = [], solids = [];
    var r = p.r * Math.PI / 2;
    var c = Math.cos(r), s = Math.sin(r);
    function rectFor(dx, dz, w, d) {
      // rotated rectangle approximated by aligned box (fine at 90° steps)
      var cx = p.x + dx * c + dz * s, cz = p.z - dx * s + dz * c;
      var W = (p.r % 2 === 0) ? w : d, D = (p.r % 2 === 0) ? d : w;
      return { x0: cx - W / 2, z0: cz - D / 2, x1: cx + W / 2, z1: cz + D / 2 };
    }
    if (isFloor(p.t)) {
      var rf = rectFor(0, 0, CELL, CELL);
      tops.push({ x0: rf.x0, z0: rf.z0, x1: rf.x1, z1: rf.z1, top: p.y + 0.22 });
    } else if (p.t === "bridge") {
      // free-angle plank: walkable circles along its axis
      var ry = p.ry || 0;
      var ax = Math.sin(ry), az = Math.cos(ry);
      [-1.5, -0.75, 0, 0.75, 1.5].forEach(function (tt) {
        tops.push({ cx: p.x + ax * tt, cz: p.z + az * tt, cr: 1.05, top: p.y + 0.12 });
      });
    } else if (p.t === "stairs") {
      for (var i = 0; i < 4; i++) {
        var rs = rectFor(0, -CELL / 2 + (i + 0.5) * CELL / 4, CELL, CELL / 4 + 0.05);
        tops.push({ x0: rs.x0, z0: rs.z0, x1: rs.x1, z1: rs.z1, top: p.y + (i + 1) * rise(p) / 4 });
      }
    } else if (p.t === "wall" || p.t === "window" || p.t === "brickwall") {
      var rw = rectFor(0, 0, CELL, 0.3);
      solids.push({ x0: rw.x0, y0: p.y, z0: rw.z0, x1: rw.x1, y1: p.y + WALL_H, z1: rw.z1 });
      tops.push({ x0: rw.x0, z0: rw.z0, x1: rw.x1, z1: rw.z1, top: p.y + WALL_H });
    } else if (p.t === "door") {
      // posts match the two solid boards, so the gap you can SEE is the gap
      // you can walk through (1.2m — roomy for a 0.68m-wide explorer)
      var rl = rectFor(-0.8, 0, 0.4, 0.3), rr = rectFor(0.8, 0, 0.4, 0.3);
      solids.push({ x0: rl.x0, y0: p.y, z0: rl.z0, x1: rl.x1, y1: p.y + WALL_H, z1: rl.z1 });
      solids.push({ x0: rr.x0, y0: p.y, z0: rr.z0, x1: rr.x1, y1: p.y + WALL_H, z1: rr.z1 });
      // a shut door blocks the opening; an open one leaves it clear
      if (!p.open) {
        var rd = rectFor(0, 0, DOOR_HALF * 2, 0.3);
        solids.push({ x0: rd.x0, y0: p.y, z0: rd.z0, x1: rd.x1, y1: p.y + 1.94, z1: rd.z1 });
      }
      var rt = rectFor(0, 0, CELL, 0.3);
      tops.push({ x0: rt.x0, z0: rt.z0, x1: rt.x1, z1: rt.z1, top: p.y + WALL_H });
    } else if (p.t === "fence") {
      var rfc = rectFor(0, 0, CELL, 0.24);
      solids.push({ x0: rfc.x0, y0: p.y, z0: rfc.z0, x1: rfc.x1, y1: p.y + 1.0, z1: rfc.z1 });
    } else if (isRoof(p.t)) {
      // Query the actual sloping surface, not an invisible flat floor.
      tops.push({ x0:p.x-1, z0:p.z-1, x1:p.x+1, z1:p.z+1, roof:p });
    } else if (p.t === "bench" || p.t === "bed" || p.t === "flowerbox" || p.t === "crystallamp" || p.t === "moonlamp") {
      var size = /lamp/.test(p.t) ? 0.55 : 1.65;
      var rfurn = rectFor(0,0,size,/lamp/.test(p.t) ? 0.55 : 1.25);
      solids.push({x0:rfurn.x0,z0:rfurn.z0,x1:rfurn.x1,z1:rfurn.z1,y0:p.y,y1:p.y+(/lamp/.test(p.t)?1:0.75)});
    } else if (p.t === "tent" || p.t === "planter") {
      var rt2 = rectFor(0, 0, p.t === "tent" ? 1.6 : 1.7, p.t === "tent" ? 1.8 : 1.7);
      solids.push({ x0: rt2.x0, y0: p.y, z0: rt2.z0, x1: rt2.x1, y1: p.y + (p.t === "tent" ? 1.2 : 0.5), z1: rt2.z1 });
    } else if (p.t === "lantern") {
      solids.push({ x0: p.x - 0.14, y0: p.y, z0: p.z - 0.14, x1: p.x + 0.14, y1: p.y + 2.0, z1: p.z + 0.14 });
    }
    p.tops = tops;
    p.solids = solids;
  }

  function roofHeight(t,x,z) {
    if(t === "roof") return ROOF_H * (1 - Math.abs(x));
    if(t === "roof_corner") return ROOF_H * (Math.min(x,z)+1)/2;
    if(t === "roof_inner") return ROOF_H * (Math.max(x,z)+1)/2;
    return ROOF_H * (z+1)/2;
  }
  function topHeight(t,x,z) {
    if(!t.roof) return t.top;
    var p=t.roof,c=Math.cos(p.r*Math.PI/2),s=Math.sin(p.r*Math.PI/2);
    return p.y+roofHeight(p.t,(x-p.x)*c-(z-p.z)*s,(x-p.x)*s+(z-p.z)*c);
  }
  function ceilingAt(x,z,feetY,height) {
    var best=Infinity;
    pieces.forEach(function(p){
      if(isFloor(p.t) && Math.abs(x-p.x)<1.3 && Math.abs(z-p.z)<1.3 && p.y >= feetY+height-0.02) best=Math.min(best,p.y);
      if(isRoof(p.t) && Math.abs(x-p.x)<1 && Math.abs(z-p.z)<1) {
        var y=topHeight(p.tops[0],x,z)-0.12;
        if(y>=feetY+height-0.02) best=Math.min(best,y);
      }
    });
    return best;
  }
  /* ---------------- physics queries ---------------- */
  function topContains(t, x, z, pad) {
    pad = pad || 0;
    if (t.cr !== undefined) return Math.hypot(x - t.cx, z - t.cz) <= t.cr + pad;
    return x >= t.x0 - pad && x <= t.x1 + pad && z >= t.z0 - pad && z <= t.z1 + pad;
  }

  function floorTopAt(x, z, maxY) {
    var best = -Infinity;
    for (var i = 0; i < pieces.length; i++) {
      var tops = pieces[i].tops;
      for (var j = 0; j < tops.length; j++) {
        var t = tops[j];
        var h = topHeight(t,x,z);
        if (topContains(t, x, z, 0) && h <= maxY && h > best) best = h;
      }
    }
    return best;
  }

  // Would a body of this size at (x,z,feetY) be inside a solid piece?
  // Used to STOP movement before it happens, so walls feel like walls
  // instead of shoving you out after you have already stepped inside.
  function blocksAt(x, z, feetY, radius, height) {
    for (var i = 0; i < pieces.length; i++) {
      var piece=pieces[i];
      if ((isRoof(piece.t)||isFloor(piece.t)) && Math.abs(x-piece.x)<1 && Math.abs(z-piece.z)<1) {
        var top=isRoof(piece.t)?topHeight(piece.tops[0],x,z):piece.y+FLOOR_H;
        var bottom=isRoof(piece.t)?top-0.12:piece.y;
        if(feetY<top-0.2 && feetY+height>bottom+0.01)return true;
      }
      var solids = pieces[i].solids;
      for (var j = 0; j < solids.length; j++) {
        var b = solids[j];
        if (feetY + height * 0.9 < b.y0 || feetY + 0.35 > b.y1) continue;
        var cx = Math.max(b.x0, Math.min(x, b.x1));
        var cz = Math.max(b.z0, Math.min(z, b.z1));
        if (Math.hypot(x - cx, z - cz) < radius) return true;
      }
    }
    return false;
  }

  // does this pending piece overlap the player right now?
  function wouldTrapPlayer(pose) {
    var probe = { t: pose.t, x: pose.x, y: pose.y, z: pose.z, r: pose.r, ry: pose.ry, v:pose.v };
    computePhysics(probe);
    var p = Player.position;
    if((isFloor(pose.t) || isRoof(pose.t)) && Math.abs(p.x-pose.x)<1.3 && Math.abs(p.z-pose.z)<1.3) {
      var surf=isRoof(pose.t)?topHeight(probe.tops[0],p.x,p.z):pose.y+FLOOR_H;
      if(surf>p.y+0.25 && surf-0.15<p.y+1.65) return true;
    }
    for (var j = 0; j < probe.solids.length; j++) {
      var b = probe.solids[j];
      if (p.y + 1.5 < b.y0 || p.y + 0.35 > b.y1) continue;
      var cx = Math.max(b.x0, Math.min(p.x, b.x1));
      var cz = Math.max(b.z0, Math.min(p.z, b.z1));
      if (Math.hypot(p.x - cx, p.z - cz) < 0.45) return true;
    }
    return false;
  }

  function collideCircle(pos, radius, height) {
    for (var i = 0; i < pieces.length; i++) {
      var solids = pieces[i].solids;
      for (var j = 0; j < solids.length; j++) {
        var b = solids[j];
        if (pos.y + height * 0.9 < b.y0 || pos.y + 0.35 > b.y1) continue;
        // closest point on box to circle center
        var cx = Math.max(b.x0, Math.min(pos.x, b.x1));
        var cz = Math.max(b.z0, Math.min(pos.z, b.z1));
        var dx = pos.x - cx, dz = pos.z - cz;
        var d = Math.hypot(dx, dz);
        if (d < radius) {
          if (d < 0.001) {
            // inside: push out along smallest axis
            var pushW = Math.min(pos.x - b.x0 + radius, b.x1 - pos.x + radius);
            var pushD = Math.min(pos.z - b.z0 + radius, b.z1 - pos.z + radius);
            if (pushW < pushD) pos.x = (pos.x - b.x0 < b.x1 - pos.x) ? b.x0 - radius : b.x1 + radius;
            else pos.z = (pos.z - b.z0 < b.z1 - pos.z) ? b.z0 - radius : b.z1 + radius;
          } else {
            pos.x = cx + (dx / d) * radius;
            pos.z = cz + (dz / d) * radius;
          }
        }
      }
    }
  }

  /* ---------------- supports & snapping ---------------- */
  function snapCell(x, z) {
    return { x: Math.floor(x / CELL) * CELL + CELL / 2, z: Math.floor(z / CELL) * CELL + CELL / 2 };
  }

  function supportsAt(x, z) {
    var list = [];
    var t = Terrain.heightAt(x, z);
    if (t > -100) list.push(t);
    for (var i = 0; i < pieces.length; i++) {
      var tops = pieces[i].tops;
      for (var j = 0; j < tops.length; j++) {
        if (topContains(tops[j], x, z, 0.3)) list.push(topHeight(tops[j],x,z));
      }
    }
    return list;
  }

  // Prefer the HIGHEST surface at (or just below) where the child is pointing.
  // Aiming at a floor's edge then puts the wall on the floor rather than on the
  // dirt underneath it, so a room's walls all line up at the same height.
  // A roof caps the WALLS around a tile, and walls sit on the tile's edges —
  // so look at the four edges as well as the middle, otherwise the roof drops
  // to floor level inside the room instead of sitting on top of the house.
  function roofSupportsAt(cx, cz) {
    var list = supportsAt(cx, cz);
    var edges = [[CELL / 2, 0], [-CELL / 2, 0], [0, CELL / 2], [0, -CELL / 2]];
    for (var i = 0; i < edges.length; i++) {
      var s = supportsAt(cx + edges[i][0], cz + edges[i][1]);
      for (var j = 0; j < s.length; j++) list.push(s[j]);
    }
    return list;
  }

  function nearestSupport(x, z, aimY) {
    var list = supportsAt(x, z);
    if (!list.length) return null;
    var best = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i] <= aimY + 0.5 && (best === null || list[i] > best)) best = list[i];
    }
    if (best !== null) return best;
    var lo = list[0];
    for (var j = 1; j < list.length; j++) if (list[j] < lo) lo = list[j];
    return lo;
  }

  /* ---------------- ghost ---------------- */
  // Where is the player looking? Tests the terrain AND everything already
  // built, taking whichever is nearer — otherwise the ray sails straight
  // through your own floor and you end up editing the tile behind it.
  function aimPoint() {
    var rc = Player.ray();
    rc.far = 16;
    var best = null;
    if (Terrain.groundMesh) {
      var th = rc.intersectObject(Terrain.groundMesh, false);
      if (th.length) best = th[0];
    }
    var meshes = [];
    for (var i = 0; i < pieces.length; i++) if (pieces[i].mesh) meshes.push(pieces[i].mesh);
    if (meshes.length) {
      var ph = rc.intersectObjects(meshes, false);
      if (ph.length && (!best || ph[0].distance < best.distance)) best = ph[0];
    }
    if (best) return { point: best.point, piece: best.object.userData.piece || null };
    // nothing under the cursor (open sky) — project a point ahead
    return { point: rc.ray.origin.clone().add(rc.ray.direction.clone().multiplyScalar(9)), sky: true };
  }

  // Pure aim-to-pose resolution is also exercised by the construction tests.
  function currentPose(target) {
    target = target || aimPoint();
    var aim = target.point, hit = target.piece;
    var cell = snapCell(aim.x, aim.z);
    if (hit && (isWall(hit.t) || hit.t === "fence")) {
      // An edge belongs to two cells. Pick the side the explorer stands on.
      var nx = hit.r % 2 ? 1 : 0, nz = hit.r % 2 ? 0 : 1;
      var side = ((Player.position.x-hit.x)*nx+(Player.position.z-hit.z)*nz) >= 0 ? 1 : -1;
      cell = snapCell(hit.x + nx*side*0.1, hit.z + nz*side*0.1);
    }
    if (target.sky && isRoof(activePiece)) cell = snapCell(Player.position.x,Player.position.z);
    var pose = { t:activePiece, x:cell.x, z:cell.z, r:rotIdx, v:1, valid:true, reason:"" };
    var def = pieceDef(activePiece);
    if (!def) { pose.valid=false; pose.reason="Choose a piece"; return pose; }
    var sup;
    if (isWall(activePiece) || activePiece === "fence") {
      var lx=aim.x-cell.x,lz=aim.z-cell.z;
      var edge=Math.abs(lx)>Math.abs(lz)?(lx<0?1:3):(lz<0?0:2);
      var r=(edge+rotIdx)%4;
      pose.r=r;
      var off=[[0,-1],[-1,0],[0,1],[1,0]][r];
      pose.x=cell.x+off[0]; pose.z=cell.z+off[1];
      sup=nearestSupport(cell.x,cell.z,aim.y);
      if(hit && isFloor(hit.t)) sup=hit.y+FLOOR_H;
      if(hit && isWall(hit.t)) sup=aim.y>hit.y+WALL_H-0.18 ? hit.y+WALL_H : hit.y;
      pose.y=sup;
    } else if (activePiece === "bridge") {
      var fy=Player.yaw,fx=-Math.sin(fy),fz=-Math.cos(fy),p0=Player.position;
      sup=nearestSupport(p0.x,p0.z,p0.y);
      pose.x=p0.x+fx*3.1; pose.z=p0.z+fz*3.1; pose.ry=Math.atan2(fx,fz);
      pose.y=sup === null ? null : sup-0.12;
      if(sup === null || p0.y-sup>2.5) {pose.valid=false;pose.reason="Stand on solid ground or a bridge end first";}
    } else if (isRoof(activePiece)) {
      // Roofs use wall headers or neighbouring roof BASES. The old resolver
      // used the tallest roof surface and made every adjacent tile climb.
      var supports=pieces.filter(function(p){
        return (isWall(p.t) || isRoof(p.t)) && Math.abs(p.x-cell.x)<=2.05 && Math.abs(p.z-cell.z)<=2.05;
      });
      var desired=hit && isWall(hit.t)?hit.y+WALL_H:hit && isRoof(hit.t)?hit.y:Player.position.y+WALL_H;
      supports.sort(function(a,b){return Math.abs((isWall(a.t)?a.y+WALL_H:a.y)-desired)-Math.abs((isWall(b.t)?b.y+WALL_H:b.y)-desired);});
      pose.y=supports.length?(isWall(supports[0].t)?supports[0].y+WALL_H:supports[0].y)+roofLift*ROOF_H:null;
      if(pose.y===null) {pose.valid=false;pose.reason="Build walls first, then aim at their top";}
    } else if(isFloor(activePiece)) {
      var neighbours=pieces.filter(function(p){return isFloor(p.t) && Math.abs(p.x-cell.x)<=2.01 && Math.abs(p.z-cell.z)<=2.01 && Math.abs(p.y-aim.y)<0.9;});
      neighbours.sort(function(a,b){return Math.hypot(a.x-cell.x,a.z-cell.z)-Math.hypot(b.x-cell.x,b.z-cell.z);});
      if(hit && isWall(hit.t)) pose.y=hit.y+WALL_H;
      else if(hit && hit.t === "stairs") {
        pose.y=hit.y+rise(hit)-FLOOR_H;
        pose.x=hit.x+Math.sin(hit.r*Math.PI/2)*CELL;
        pose.z=hit.z+Math.cos(hit.r*Math.PI/2)*CELL;
      }
      else if(neighbours.length) pose.y=neighbours[0].y;
      else pose.y=nearestSupport(cell.x,cell.z,aim.y);
    } else {
      pose.y=nearestSupport(cell.x,cell.z,aim.y);
      if(hit && hit.t === "stairs") {
        pose.y=hit.y+rise(hit);
        if(activePiece === "stairs") {
          pose.x=hit.x+Math.sin(hit.r*Math.PI/2)*CELL;
          pose.z=hit.z+Math.cos(hit.r*Math.PI/2)*CELL;
          pose.r=(hit.r+rotIdx)%4;
        }
      }
      if(hit && isFloor(hit.t)) pose.y=hit.y+FLOOR_H;
    }
    if(pose.y === null || !Number.isFinite(pose.y)) {pose.valid=false;if(!pose.reason)pose.reason="Aim at ground or a supported floor";}
    if(pose.valid) {
      if(def.needs && !Store.data.player.tools[def.needs]) {pose.valid=false;pose.reason="Wren's lantern kit unlocks this";}
      else if(!canAfford(def.cost)) {pose.valid=false;pose.reason="Need "+costStr(def.cost);}
      else if(duplicateAt(pose)) {pose.valid=false;pose.reason="This space is occupied — remove the old piece first";}
      else if(tooFar(pose)) {pose.valid=false;pose.reason="Move closer to build here";}
      else if(wouldTrapPlayer(pose)) {pose.valid=false;pose.reason="Step back — you're standing there";}
      else if(pose.x<1 || pose.z<1 || pose.x>Terrain.SX-1 || pose.z>Terrain.SZ-1) {pose.valid=false;pose.reason="Outside the buildable world";}
    }
    return pose;
  }

  function duplicateAt(pose) {
    return pieces.some(function(p){
      if(pose.t === "bridge" && p.t === "bridge") return Math.hypot(p.x-pose.x,p.z-pose.z)<2.2 && Math.abs(p.y-pose.y)<0.6;
      var same = p.t === pose.t || (isWall(p.t)&&isWall(pose.t)) || (isRoof(p.t)&&isRoof(pose.t)) || (isFloor(p.t)&&isFloor(pose.t)) || (isFurniture(p.t)&&isFurniture(pose.t));
      return same && Math.abs(p.x-pose.x)<0.4 && Math.abs(p.z-pose.z)<0.4 && Math.abs(p.y-pose.y)<0.4;
    });
  }
  function tooFar(pose) {
    return Math.hypot(pose.x - Player.position.x, pose.z - Player.position.z) > 14;
  }

  function canAfford(cost) {
    var inv = Store.data.player.inventory;
    return Object.keys(cost).every(function (k) { return (inv[k] || 0) >= cost[k]; });
  }
  function costStr(cost) {
    return Object.keys(cost).map(function (k) { return cost[k] + " " + (ITEM_ICON[k] || "") + " " + k; }).join(" + ");
  }

  function clearGhost() {
    if(ghostMesh) { group.remove(ghostMesh); ghostMesh.geometry.dispose(); ghostMesh.material.dispose(); ghostMesh=null; }
    ghostKey="";
  }
  function updateGhost() {
    if (!mode || removeMode) { if(ghostMesh) ghostMesh.visible=false; return; }
    var pose=currentPose(); ghostPose=pose; ghostValid=pose.valid;
    var key=[pose.t,pose.x,pose.y,pose.z,pose.r,pose.ry,pose.valid].join("|");
    if(key===ghostKey && ghostMesh) {ghostMesh.visible=true;return;}
    clearGhost(); ghostKey=key;
    if(!Number.isFinite(pose.y)) return;
    var g=new Geo.Builder(); buildPieceGeo(g,pose.t,pose);
    if(pose.t === "roof_slope" || pose.t === "stairs") {
      var a=pose.r*Math.PI/2,c=Math.cos(a),s=Math.sin(a);
      function arrow(x,z){return [pose.x+x*c+z*s,pose.y+(pose.t === "stairs"?rise(pose):ROOF_H)+0.15,pose.z-x*s+z*c];}
      g.quad(arrow(-0.05,-0.5),arrow(-0.05,0.2),arrow(0.05,0.2),arrow(0.05,-0.5),0xffe297,0);
      g.tri(arrow(-0.23,0.15),arrow(0,0.65),arrow(0.23,0.15),0xffe297,0);
    }
    var mat=Geo.ghostMaterial().clone(); mat.color.setHex(pose.valid?0xbfffcf:0xff9a9a);
    ghostMesh=g.build(mat); group.add(ghostMesh);
  }

  /* ---------------- placing / removing ---------------- */
  function place() {
    if (!mode || removeMode) return false;
    // Recompute from the live camera: a tap must build what the child is
    // aiming at right now, not whatever the last rendered frame cached.
    updateGhost();
    if (!ghostPose || !ghostPose.valid) {
      if (ghostPose && ghostPose.reason) UI.toast(ghostPose.reason, 1800);
      return false;
    }
    var def = pieceDef(activePiece);
    var inv = Store.data.player.inventory;
    Object.keys(def.cost).forEach(function (k) { inv[k] -= def.cost[k]; });
    var rec = { t: activePiece, x: ghostPose.x, y: ghostPose.y, z: ghostPose.z, r: ghostPose.r, v:1, paid: Object.assign({},def.cost) };
    if (ghostPose.ry !== undefined) rec.ry = ghostPose.ry;
    addPiece(rec);
    isleState.pieces.push(rec);
    Store.save();
    Stats.recordBuild();
    if (window.Expeditions) Expeditions.record("build", 1, { piece: rec.t });
    GameAudio.sfx.place();
    if (rec.t === "tent" || rec.t === "bed") UI.toast("⛺ Camp set! If you fall, you'll wake up here.", 2600);
    Game.checkBridges();
    UI.updateBuildSheet();
    return true;
  }

  function addPiece(rec) {
    if (!pieceDef(rec.t)) return null;
    var p = { t: rec.t, x: rec.x, y: rec.y, z: rec.z, r: rec.r, ry: rec.ry, open: !!rec.open, v:rec.v };
    p.rec = rec;                       // so state changes (a door swinging) persist
    var g = new Geo.Builder();
    buildPieceGeo(g, p.t, p);
    p.mesh = g.build();
    p.mesh.userData.piece = p;
    group.add(p.mesh);
    computePhysics(p);
    pieces.push(p);
    if (p.t === "lantern" || /lamp/.test(p.t)) addLanternLight(p);
    if (p.t === "planter" && window.Garden) Garden.registerPlanter(p);
    return p;
  }

  // redraw one piece in place (used when a door swings)
  function rebuildPiece(p) {
    group.remove(p.mesh);
    p.mesh.geometry.dispose();
    var g = new Geo.Builder();
    buildPieceGeo(g, p.t, p);
    p.mesh = g.build();
    p.mesh.userData.piece = p;
    group.add(p.mesh);
    computePhysics(p);
  }

  // A generous tap target for doors. Once a door is open the child is aiming
  // through an empty gap, so a plain mesh ray would sail past it — this gives
  // the doorway itself a soft hit sphere when you are standing right at it.
  function doorRaycast(origin, dir, maxDist) {
    var best = null;
    for (var i = 0; i < pieces.length; i++) {
      var p = pieces[i];
      if (p.t !== "door") continue;
      var cx = p.x - origin.x, cy = (p.y + 1.0) - origin.y, cz = p.z - origin.z;
      var t = cx * dir.x + cy * dir.y + cz * dir.z;
      if (t < 0 || t > Math.min(maxDist, 3.5)) continue;
      var px = origin.x + dir.x * t, py = origin.y + dir.y * t, pz = origin.z + dir.z * t;
      if (Math.hypot(px - p.x, py - (p.y + 1.0), pz - p.z) < 0.75) {
        if (!best || t < best.dist) best = { piece: p, dist: t };
      }
    }
    return best;
  }

  function toggleDoor(p) {
    if (p.t !== "door") return false;
    p.open = !p.open;
    if (p.rec) p.rec.open = p.open;
    // never shut a door on top of the player
    if (!p.open && Player && Player.position) {
      var pos = Player.position;
      computePhysics(p);
      for (var i = 0; i < p.solids.length; i++) {
        var b = p.solids[i];
        if (pos.y + 1.5 < b.y0 || pos.y + 0.35 > b.y1) continue;
        var cx = Math.max(b.x0, Math.min(pos.x, b.x1));
        var cz = Math.max(b.z0, Math.min(pos.z, b.z1));
        if (Math.hypot(pos.x - cx, pos.z - cz) < 0.4) {
          p.open = true;
          if (p.rec) p.rec.open = true;
          UI.toast("🚪 Step out of the doorway first!", 1600);
          computePhysics(p);
          return false;
        }
      }
    }
    rebuildPiece(p);
    Store.save();
    GameAudio.sfx.place();
    UI.toast(p.open ? "🚪 Creeeak... open!" : "🚪 Shut tight.", 1400);
    return true;
  }

  function removeAim() {
    var rc = Player.ray();
    rc.far = 14;
    var meshes = pieces.map(function (p) { return p.mesh; });
    var hits = rc.intersectObjects(meshes, false);
    if (!hits.length) return false;
    var p = hits[0].object.userData.piece;
    removePiece(p, true);
    return true;
  }

  function removePiece(p, refund) {
    if(pieces.indexOf(p)<0)return false;
    group.remove(p.mesh);
    p.mesh.geometry.dispose();
    pieces.splice(pieces.indexOf(p), 1);
    var idx = p.rec ? isleState.pieces.indexOf(p.rec) : isleState.pieces.findIndex(function (r) {
      return r.t === p.t && Math.abs(r.x - p.x) < 0.01 && Math.abs(r.z - p.z) < 0.01 && Math.abs(r.y - p.y) < 0.01;
    });
    if (idx >= 0) isleState.pieces.splice(idx, 1);
    if (p.light) { scene.remove(p.light); lanternLights.splice(lanternLights.indexOf(p.light), 1); }
    if (p.t === "planter" && window.Garden) Garden.unregisterPlanter(p);
    if (refund) {
      var def = pieceDef(p.t);
      var inv = Store.data.player.inventory;
      var paid = (p.rec && p.rec.paid) || def.cost;
      Object.keys(paid).forEach(function (k) { inv[k] = (inv[k] || 0) + paid[k]; });
      UI.toast("↩️ " + def.name + " taken back (materials returned)");
    }
    Store.save();
    GameAudio.sfx.pop();
    UI.updateBuildSheet();
  }

  function addLanternLight(p) {
    if (lanternLights.length >= 20) return;
    var light = new THREE.PointLight(p.t === "moonlamp" ? 0xaed4ff : p.t === "crystallamp" ? 0xb7ffcf : 0xffcc66, 1.4, 11, 1.8);
    light.position.set(p.x, p.y + (p.t === "lantern" ? 2.3 : 0.9), p.z);
    scene.add(light);
    p.light = light;
    lanternLights.push(light);
  }

  /* ---------------- mode / api ---------------- */
  function enterMode() { mode = true; removeMode = false; }
  function exitMode() {
    mode = false; removeMode = false;
    clearGhost();
  }
  function setPiece(id) { if(!pieceDef(id)) return; activePiece = id; removeMode = false; roofLift=0; rotIdx=0; }
  function rotate() { rotIdx = (rotIdx + 1) % 4; UI.toast("Rotated "+(rotIdx*90)+"°",1000); }
  function liftRoof(n) {roofLift=Math.max(-3,Math.min(3,roofLift+n));UI.toast("Roof height: "+(roofLift===0?"wall tops":(roofLift>0?"+":"")+roofLift+" slope rises"),1400);}
  function toggleRemove() { removeMode = !removeMode; }

  function campSpot() {
    for (var i = pieces.length - 1; i >= 0; i--) {
      if (pieces[i].t === "tent" || pieces[i].t === "bed") {
        var p=pieces[i],offsets=[[1.4,0],[-1.4,0],[0,1.4],[0,-1.4]];
        for(var j=0;j<offsets.length;j++) {
          var x=p.x+offsets[j][0],z=p.z+offsets[j][1];
          var y=Math.max(Terrain.heightAt(x,z),floorTopAt(x,z,p.y+0.75));
          if(Number.isFinite(y) && Math.abs(y-p.y)<0.75 && !blocksAt(x,z,y,0.34,1.65))return {x:x,y:y,z:z};
        }
      }
    }
    return null;
  }

  function bridgePiecesNear(ax, az, bx, bz) {
    // pieces whose center lies within the corridor between two anchors
    var dx = bx - ax, dz = bz - az;
    var len = Math.hypot(dx, dz);
    var nx = dx / len, nz = dz / len;
    var count = 0;
    pieces.forEach(function (p) {
      if (p.t !== "bridge") return;
      var px = p.x - ax, pz = p.z - az;
      var t = px * nx + pz * nz;
      if (t < -2 || t > len + 2) return;
      var off = Math.abs(px * nz - pz * nx);
      if (off < 5) count++;
    });
    return count;
  }

  function load(sc, state) {
    scene = sc;
    isleState = state;
    if (!isleState.pieces) isleState.pieces = [];
    if (group) { clearGhost(); pieces.forEach(function(p){p.mesh.geometry.dispose();}); scene.remove(group); }
    lanternLights.forEach(function (l) { scene.remove(l); });
    lanternLights = [];
    group = new THREE.Group();
    scene.add(group);
    pieces = [];
    exitMode();
    isleState.pieces.forEach(addPiece);
  }

  return {
    PIECES: PIECES, pieceDef: pieceDef, canAfford: canAfford, costStr: costStr,
    load: load, updateGhost: updateGhost, place: place, removeAim: removeAim,
    enterMode: enterMode, exitMode: exitMode, setPiece: setPiece, rotate: rotate,
    toggleRemove: toggleRemove, liftRoof:liftRoof, currentPose:currentPose, ceilingAt:ceilingAt, isRoof:isRoof,
    floorTopAt: floorTopAt, collideCircle: collideCircle, blocksAt: blocksAt,
    removePiece: removePiece, toggleDoor: toggleDoor, doorRaycast: doorRaycast,
    campSpot: campSpot, bridgePiecesNear: bridgePiecesNear,
    get mode() { return mode; },
    get removeMode() { return removeMode; },
    get activePiece() { return activePiece; },
    get ghostPose() { return ghostPose; },
    get pieces() { return pieces; }
  };
})();
