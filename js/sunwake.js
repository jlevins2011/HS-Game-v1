"use strict";
/* A self-contained world definition. Its optional terrain and population hooks
   leave the seeds, object order and saved worlds of every older isle unchanged. */
var Sunwake = (function () {
  var def = {
    id:"sunwake", name:"Sunwake Atoll", emoji:"🐚", level:1,
    description:"Palm groves, a turquoise lagoon, and a beacon waiting for its keeper.",
    sky:0xf4c69c, fog:0xf6dbc2, water:12, waterColor:0x38cbbb, base:15, amp:2.4, springs:2,
    spawn:{x:96,z:80,yaw:Math.PI},
    palette:{grass:0x78bb73,grass2:0xb4d584,cliff:0xc08b76,sand:0xf0dab3,under:0x855a50,rock:0xd0ad91,palm:true},
    islets:[{id:"islet1",x:171,z:96,r:10},{id:"islet2",x:82,z:172,r:11}],
    shapeHeight:function(x,z,h) {
      // A shallow lagoon with smooth walkable shores, and a dry arrival lawn.
      var lagoon=Math.exp(-((x-110)*(x-110)+(z-107)*(z-107))/230);
      h-=6.8*lagoon;
      var arrival=Math.max(0,1-Math.hypot(x-96,z-80)/11);
      return h*(1-arrival)+15*arrival;
    },
    populateExtras:function(add,scatter,rng) {
      scatter("shellbed",20,rng,{});
      scatter("sunwakecoral",12,rng,{});
      scatter("crystal",8,rng,{});
      scatter("glowmoss",8,rng,{});
      add("sunwakebeacon",116,81,{id:"sunwake-beacon",scale:1});
      // Guaranteed starter discoveries off the clear arrival lawn.
      add("shellbed",107,83,{id:"sunwake-shells",scale:1});
      add("sunwakecoral",107,87,{id:"sunwake-coral",scale:1});
    }
  };
  ISLE_DEFS.push(def);
  function shellbed(g,o) {
    g.blob(.75,0xe9d5b3,{x:o.x,y:o.y-.18,z:o.z,sy:.22},.12,.15);
    [-.35,0,.35].forEach(function(dx,i){
      g.blob(.24,i%2?0xf1bfb0:0xffebda,{x:o.x+dx,y:o.y+.02,z:o.z+(i%2)*.2,sy:.4},.1,0);
    });
  }
  function coral(g,o) {
    g.cyl(.5,.4,.18,6,0xc49d85,{x:o.x,y:o.y,z:o.z},.1,0);
    [-.28,0,.28].forEach(function(dx,i){
      g.cyl(.11,.08,.6+i*.15,5,0x63cbbb,{x:o.x+dx,y:o.y+.12,z:o.z},.08,0);
      g.blob(.15,0xd2fff0,{x:o.x+dx,y:o.y+.65+i*.15,z:o.z},0,0);
    });
  }
  function beacon(o) {
    var g=new Geo.Builder();
    g.cyl(1.3,1.15,.45,8,0xc79c80,{},.1,0);
    g.cyl(.8,.6,3.2,8,0xf5e3c7,{y:.45},.12,0);
    g.cyl(.83,.76,.3,8,0xc16e57,{y:1.5},0,0);
    g.cyl(1.15,1.15,.2,8,0x805b4b,{y:3.65},0,0);
    for(var i=0;i<4;i++){var a=i*Math.PI/2;g.cyl(.08,.08,1.15,5,0x805b4b,{x:Math.cos(a)*.8,y:3.85,z:Math.sin(a)*.8},0,0);}
    g.cone(1.3,.8,8,0xbf715c,{y:5},.08,0);
    var mesh=g.build();mesh.position.set(o.x,o.y,o.z);
    var lit=!!Store.isleState("sunwake").beaconRestored;
    var orb=new THREE.Mesh(new THREE.IcosahedronGeometry(.48,0),new THREE.MeshBasicMaterial({color:lit?0xffe399:0x7b9a9b}));
    orb.position.y=4.35;mesh.add(orb);
    var light=new THREE.PointLight(0xffdc97,lit?2:0,24,1.5);light.position.y=4.4;mesh.add(light);
    o.beaconOrb=orb;o.beaconLight=light;o.anim=function(t){orb.rotation.y=t*.35;};
    return mesh;
  }
  Objects.TYPES.shellbed={name:"Shore Shells",icon:"🐚",taps:1,drops:{shell:2},rayR:1,rayY:.3,regrow:180,build:shellbed,verb:"collect"};
  Objects.TYPES.sunwakecoral={name:"Glowcoral",icon:"🪸",taps:2,drops:{glowdust:2},rayR:1,rayY:.6,regrow:240,build:coral,verb:"gather"};
  Objects.TYPES.sunwakebeacon={name:"Sunwake Beacon",icon:"☀️",dynamic:beacon,rayR:1.6,rayY:1.8,special:"sunwakebeacon",solid:1.3};
  var COST={shell:6,glass:2,glowdust:2};
  Economy.registerUse("Sunwake Beacon",COST);
  function restore(o) {
    if(Terrain.def.id!=="sunwake" || o.type!=="sunwakebeacon")return false;
    var state=Store.isleState("sunwake");
    if(state.beaconRestored)return false;
    if(!Economy.exchange(COST,{glimmer:3},12,"Restored Sunwake Beacon"))return false;
    state.beaconRestored=true;Store.saveNow();
    o.beaconOrb.material.color.setHex(0xffe399);o.beaconLight.intensity=2;
    Game.grantXP(30);UI.updateHud();UI.updateHotbar();
    GameAudio.sfx.quest();return true;
  }
  function interact(o) {
    var lit=Store.isleState("sunwake").beaconRestored;
    UI.openOverlay("<div class='ch-title'>☀️ Sunwake Beacon</div><div class='ch-sub'>"+
      (lit?"Your light watches over the lagoon. Bring its treasures home, or build a new home on the shore.":"Fit shell reflectors and glass around a glowcoral heart to guide explorers home.")+"</div>"+
      (!lit?"<div class='ch-sub'>6 shells · 2 glass · 2 glowdust<br>Reward: 12 sparks · 3 glimmer · 30 light</div><button class='big-btn' id='beacon-restore' "+(Economy.canAfford(COST)?"":"disabled")+">Restore the beacon</button>":"")+
      "<div class='ch-sub'>Shell beds and glowcoral grow around the isle. Glass comes from the kiln or Trade & supplies.</div><button class='ghost-btn' id='beacon-back'>Back to exploring</button>");
    document.getElementById("beacon-back").addEventListener("click",UI.closeOverlay);
    var b=document.getElementById("beacon-restore");
    if(b)b.addEventListener("click",function(){if(restore(o)){UI.closeOverlay();UI.toast("The Sunwake Beacon shines again! +12 sparks and 3 glimmer",4000);}});
  }
  return {def:def,interact:interact,restore:restore};
})();
