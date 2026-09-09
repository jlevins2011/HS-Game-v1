"use strict";
/* A late-game expedition built from optional world hooks and existing lessons. */
var Asterfall = (function () {
  var LENSES = [
    {name:"Jade Lens",color:0x67efd0,x:73,z:95},
    {name:"Violet Lens",color:0xc9a0ff,x:119,z:95},
    {name:"Amber Lens",color:0xffd17e,x:96,z:123}
  ];
  var COST={glimmer:6,glass:4,starstone:2};
  Economy.registerUse("Asterfall Observatory · level 12",COST);
  function state(){return Store.isleState("asterfall");}
  function aligned(i){return !!(state().lenses || [])[i];}
  function count(){return LENSES.filter(function(_,i){return aligned(i);}).length;}
  var def={
    id:"asterfall",name:"Asterfall Observatory",emoji:"🪐",level:12,requireEarnedLevel:true,
    description:"Align three ancient lenses and awaken the celestial observatory.",
    arrivalHint:"Follow the gold waystones uphill to the observatory.",
    clearGround:function(x,z){
      return LENSES.concat([{x:96,z:76}]).some(function(l){
        var dx=l.x-96,dz=l.z-100,t=Math.max(0,Math.min(1,((x-96)*dx+(z-100)*dz)/(dx*dx+dz*dz)));
        return Math.hypot(x-96-dx*t,z-100-dz*t)<3;
      });
    },
    sky:0x777ba9,fog:0xa6abc8,water:15.5,waterColor:0x759fdb,base:18,amp:1.8,springs:2,
    spawn:{x:96,z:76,yaw:Math.PI},
    palette:{grass:0x849ea8,grass2:0xb5cad0,cliff:0x626680,sand:0xd9d4c4,under:0x444759,rock:0x9e9bb2},
    islets:[{id:"islet1",x:172,z:91,r:12},{id:"islet2",x:77,z:171,r:11}],
    shapeHeight:function(x,z,h){
      var r=Math.hypot(x-96,z-100);
      // Broad terraces joined by gentle slopes; a level summit for the instrument.
      if(r<40){var terrace=19+5*Math.max(0,1-Math.max(0,r-9)/17);var blend=Math.min(1,(40-r)/8);h=h*(1-blend)+terrace*blend;}
      return h;
    },
    populateExtras:function(add,scatter,rng){
      scatter("crystal",22,rng,{});scatter("glowmoss",16,rng,{});
      scatter("starstone",8,rng,{});
      add("astercore",96,100,{id:"aster-core"});
      LENSES.forEach(function(l,i){add("asterlens",l.x,l.z,{id:"aster-lens-"+i,variant:i});});
      // Low gold waystones lead from arrival to the summit and each lens.
      LENSES.concat([{x:96,z:76}]).forEach(function(l){
        for(var t=.25;t<1;t+=.25)add("asterway",96+(l.x-96)*t,100+(l.z-100)*t,{});
      });
    }
  };
  ISLE_DEFS.push(def);
  function ring(radius,color){return new THREE.Mesh(new THREE.TorusGeometry(radius,.1,6,48),new THREE.MeshBasicMaterial({color:color}));}
  function lens(o){
    var l=LENSES[o.variant],g=new Geo.Builder();
    g.cyl(1.2,1,.4,8,0x6b6a83,{},.1,0);
    g.cyl(.65,.4,2.4,6,0xd6cdb4,{y:.4},.1,0);
    var mesh=g.build();mesh.position.set(o.x,o.y,o.z);
    var halo=ring(1.2,l.color);halo.position.y=3.6;mesh.add(halo);
    var gem=new THREE.Mesh(new THREE.OctahedronGeometry(.6),new THREE.MeshBasicMaterial({color:l.color}));gem.position.y=3.6;mesh.add(gem);
    var beam=new THREE.Mesh(new THREE.CylinderGeometry(.06,.25,9,6),new THREE.MeshBasicMaterial({color:l.color,transparent:true,opacity:.45}));beam.position.y=8;mesh.add(beam);
    o.anim=function(t){gem.rotation.y=t*.35;beam.visible=aligned(o.variant);halo.rotation.z=aligned(o.variant)?t*.15:0;};
    return mesh;
  }
  function core(o){
    var g=new Geo.Builder();g.cyl(2.2,2,.4,12,0x696881,{},.1,0);
    g.cyl(1.1,.75,2.7,8,0xc7bd9f,{y:.4},.1,0);
    for(var i=0;i<6;i++){var a=i*Math.PI/3;g.cone(.65,1.1,6,0xc2a676,{x:Math.cos(a)*5,y:6,z:Math.sin(a)*5},.05,0);}
    var mesh=g.build();mesh.position.set(o.x,o.y,o.z);
    var rings=[];
    for(var j=0;j<3;j++){var r=ring(3.2+j*.6,LENSES[j].color);r.position.y=7;r.rotation.x=j*Math.PI/3;r.rotation.y=j*.7;mesh.add(r);rings.push(r);}
    var star=new THREE.Mesh(new THREE.IcosahedronGeometry(1.1,0),new THREE.MeshBasicMaterial({color:0xffe8a8}));star.position.y=7;mesh.add(star);
    o.anim=function(t){
      star.visible=!!state().observatoryRestored;
      rings.forEach(function(r,i){r.material.color.setHex(aligned(i)?LENSES[i].color:0x797d99);r.rotation.z=state().observatoryRestored?t*(.1+i*.04):0;});
      star.rotation.y=t*.25;
    };
    return mesh;
  }
  Objects.TYPES.asterway={name:"Observatory Waystone",build:function(g,o){g.cyl(.55,.45,.16,6,0xe7c988,{x:o.x,y:o.y+.05,z:o.z},0,0);}};
  Objects.TYPES.asterlens={name:"Ancient Lens",icon:"💠",dynamic:lens,rayR:1.4,rayY:1.5,special:"asterlens",solid:1.2,clearRadius:4};
  Objects.TYPES.astercore={name:"Celestial Observatory",icon:"🪐",dynamic:core,rayR:2,rayY:1.6,special:"astercore",solid:2,clearRadius:8};
  function valid(o){return Terrain.def.id===def.id && Store.data.player.level>=def.level && Objects.byId(o.id)===o;}
  function closeButton(){document.getElementById("aster-back").addEventListener("click",UI.closeOverlay);}
  function interact(o){
    if(!valid(o))return;
    var isLens=o.type==="asterlens",done=isLens?aligned(o.variant):state().observatoryRestored;
    var title=isLens?LENSES[o.variant].name:def.name;
    var text=isLens?(done?"This lens is aligned. Its light reaches toward the summit.":"A learning discovery will help you align this ancient lens. Take your time."):
      (done?"The observatory turns again. These terraces are yours to explore and build on.":"Follow the gold waystones to the Jade, Violet and Amber lenses. Align all three, then return here to restart the observatory.");
    UI.openOverlay("<div class='ch-title'>🪐 "+title+"</div><div class='ch-sub'>"+text+"</div>"+
      "<div class='sentence-text'>Lenses aligned: "+count()+" / 3</div>"+
      (!isLens&&!done?"<div class='ch-sub'>6 glimmer · 4 glass · 2 starstone<br>Reward: 40 sparks · 6 aurorium · 60 light<br>Gather crystals here; starstone needs a skysteel mallet. Make glass at a kiln or visit Trade & supplies.</div>":"")+
      (!done?"<button class='big-btn' id='aster-act' "+(!isLens&&(count()<3||!Economy.canAfford(COST))?"disabled":"")+">"+(isLens?"Align this lens":"Awaken the observatory")+"</button>":"")+
      "<button class='ghost-btn' id='aster-back'>Back to exploring</button>");
    closeButton();
    var b=document.getElementById("aster-act");if(!b)return;
    b.addEventListener("click",function(){
      if(!isLens){if(restore(o)){UI.closeOverlay();UI.toast("🪐 Observatory restored! +40 sparks and 6 aurorium",4500);}return;}
      var save=Store.data;
      UI.showChallenge("node",function(result){
        if(Store.data!==save||!valid(o))return;
        if(result.correct&&!result.skipped&&!result.nolesson&&!aligned(o.variant)){
          if(!state().lenses)state().lenses=[false,false,false];state().lenses[o.variant]=true;Store.saveNow();
          UI.toast("💠 "+LENSES[o.variant].name+" aligned! "+count()+" / 3",3500);
        }else if(result.nolesson)UI.toast("A parent can choose lessons in Parents → Assignments to align this lens.",4500);
      },"💠 Align the "+title);
    });
  }
  function restore(o){
    if(!valid(o)||o.type!=="astercore"||state().observatoryRestored||count()<3)return false;
    if(!Economy.exchange(COST,{aurorium:6},40,"Restored Asterfall Observatory"))return false;
    state().observatoryRestored=true;Game.grantXP(60);Store.saveNow();UI.updateHud();UI.updateHotbar();GameAudio.sfx.quest();return true;
  }
  return {def:def,interact:interact,restore:restore};
})();
