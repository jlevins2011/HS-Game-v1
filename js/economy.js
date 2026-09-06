"use strict";
/* Item uses, recipes and atomic local-economy transactions. No DOM or learning dependencies. */
var Economy = (function () {
var CRAFTS = [
    { tier: 1, name: "stone mallet", level: 2, needs: { stone: 5, timber: 2 }, icon: "🔨" },
    { tier: 2, name: "skysteel mallet", level: 4, needs: { skysteel: 4, timber: 2 }, icon: "🔨" },
    { tier: 3, name: "starstone mallet", level: 6, needs: { starstone: 3, timber: 2 }, icon: "🔨" }
  ];
var WORKSHOP = [
    { id: "hatchet", kind: "tool", tool: "hatchet", name: "hatchet", icon: "🪓",
      needs: { stone: 3, timber: 2 }, blurb: "Chops trees down in fewer swings!" },
    { id: "brush", kind: "tool", tool: "brush", name: "brush", icon: "🖌️",
      needs: { timber: 2, fluff: 1 }, blurb: "Brush tuftles for fluff — they love it!" },
    { id: "cloudcap", kind: "tool", tool: "cloudcap", name: "cloudcap", icon: "🪂",
      needs: { fluff: 4, feather: 2, timber: 2 }, blurb: "Hold ⬆️ while falling to GLIDE across the sky!" }
  ];
var KILN = [
    { need: "kiln", needs: { "skysteel ore": 1, emberstone: 1 }, gives: { skysteel: 1 }, name: "skysteel ingot", icon: "⚙️" },
    { need: "kiln", needs: { stone: 2, emberstone: 1 }, gives: { glass: 1 }, name: "glass", icon: "🪟" },
    { need: "kiln", needs: { berries: 2, emberstone: 1 }, gives: { "berry tart": 1 }, name: "berry tart", icon: "🥧" }
  ];
  WORKSHOP.push(
    {id:"compost",name:"2 sunfruit seeds",icon:"🌱",needs:{leaves:3,spritecap:1},gives:{"sunfruit seeds":2},blurb:"Turn forest finds into a renewable garden."},
    {id:"moonseeds",name:"2 moonmelon seeds",icon:"🌱",needs:{moonmelon:1},gives:{"moonmelon seeds":2},blurb:"Keep your harvest growing."},
    {id:"sunseeds",name:"2 sunfruit seeds",icon:"🌱",needs:{sunfruit:1},gives:{"sunfruit seeds":2},blurb:"Save seeds from ripe fruit."}
  );
  var VALUES = {timber:1,leaves:1,stone:1,emberstone:2,"skysteel ore":2,skysteel:4,
    starstone:5,glimmer:3,glowmoss:2,moonpearl:6,aurorium:8,claybrick:2,glass:3,
    fluff:2,feather:2,shell:2,glowdust:2,berries:1,sunfruit:2,moonmelon:3,"berry tart":6,
    sunpetal:1,bellbloom:1,spritecap:2,"sunfruit seeds":1,"moonmelon seeds":1};
  var SUPPLIES = [
    {id:"wood",name:"6 timber",price:10,gives:{timber:6}},
    {id:"glass",name:"2 glass",price:10,gives:{glass:2}},
    {id:"fluff",name:"3 fluff",price:10,gives:{fluff:3}},
    {id:"seeds",name:"2 moonmelon seeds",price:5,gives:{"moonmelon seeds":2}},
    {id:"brick",name:"4 claybrick",price:12,gives:{claybrick:4}}
  ];
  function validCount(n) {return Number.isSafeInteger(n) && n>=0;}
  function canAfford(needs) {
    var inv=Store.data.player.inventory;
    return Object.keys(needs).every(function(k){return validCount(needs[k]) && validCount(inv[k]||0) && (inv[k]||0)>=needs[k];});
  }
  // Validate everything before touching inventory; negative, partial, stale,
  // or overflowing exchanges cannot create currency or consume resources.
  function exchange(needs,gives,sparkDelta,reason) {
    var p=Store.data.player; sparkDelta=sparkDelta||0;
    if(!canAfford(needs) || !Number.isSafeInteger(sparkDelta) || !validCount(p.sparks+sparkDelta)) return false;
    var keys=Object.keys(needs).concat(Object.keys(gives));
    if(!keys.every(function(k){return (!Object.prototype.hasOwnProperty.call(gives,k)||validCount(gives[k])) && validCount((p.inventory[k]||0)-(needs[k]||0)+(gives[k]||0));})) return false;
    keys.filter(function(k,i){return keys.indexOf(k)===i;}).forEach(function(k){p.inventory[k]=(p.inventory[k]||0)-(needs[k]||0)+(gives[k]||0);});
    p.sparks+=sparkDelta;
    if(sparkDelta) {
      if(!p.sparkHistory) p.sparkHistory=[];
      p.sparkHistory.push({at:Date.now(),delta:sparkDelta,reason:reason||"exchange",balance:p.sparks});
      p.sparkHistory=p.sparkHistory.slice(-100);
    }
    Store.save();return true;
  }
  function sell(item,count) {
    if(!Object.prototype.hasOwnProperty.call(VALUES,item)||!validCount(count)||count<1)return false;
    var needs={};needs[item]=count;
    return exchange(needs,{},VALUES[item]*count,"Sold "+count+" "+item);
  }
  function buy(id) {var s=SUPPLIES.find(function(x){return x.id===id;});return !!s&&exchange({},s.gives,-s.price,"Bought "+s.name);}
  function uses(item) {
    var out=[];
    if(window.Build) Build.PIECES.forEach(function(p){if(p.cost[item])out.push(p.name);});
    CRAFTS.concat(WORKSHOP,KILN).forEach(function(r){if(r.needs[item])out.push(r.name);});
    if(item.indexOf("seeds")>=0)out.push("plant in a Planter");
    if(VALUES[item])out.push("trade for "+VALUES[item]+" sparks each");
    return out;
  }
  var PROJECTS=[
    {id:"foundation",name:"A place of your own",desc:"Lay a four-tile foundation. Aim beside a floor to keep the next one level.",reward:8,checks:[{name:"4 floor tiles",types:["floor","stonefloor","shellpath"],count:4}]},
    {id:"shelter",name:"Under one roof",desc:"Add walls, a doorway and a roof. Use opposite slopes for a wider room.",reward:12,checks:[{name:"6 wall sections",types:["wall","window","brickwall"],count:6},{name:"1 door",types:["door"],count:1},{name:"4 roof sections",types:["roof","roof_slope","roof_corner","roof_inner"],count:4}]},
    {id:"home",name:"Make it home",desc:"Settle in with a bed, a working table and a warm light.",reward:15,checks:[{name:"1 bed",types:["bed"],count:1},{name:"1 workshop table",types:["bench"],count:1},{name:"1 light",types:["lantern","crystallamp","moonlamp"],count:1}]},
    {id:"garden",name:"A growing garden",desc:"Plant seeds, harvest fruit, then trade your surplus or save seeds at the workshop.",reward:10,checks:[{name:"2 planters",types:["planter"],count:2},{name:"1 harvest",stat:"harvested",count:1}]}
  ];
  function projectProgress(project) {
    return project.checks.map(function(c){var n=c.stat?Store.data.stats.lifetime[c.stat]||0:Build.pieces.filter(function(p){return c.types.indexOf(p.t)>=0;}).length;return {name:c.name,have:Math.min(n,c.count),need:c.count};});
  }
  function claim(id) {
    var p=PROJECTS.find(function(x){return x.id===id;}),d=Store.data.player;
    if(!p || (d.projects||{})[id] || !projectProgress(p).every(function(c){return c.have>=c.need;}))return false;
    if(!exchange({},{},p.reward,"Project: "+p.name))return false;
    if(!d.projects)d.projects={};d.projects[id]=true;Store.save();return true;
  }
  return {CRAFTS:CRAFTS,WORKSHOP:WORKSHOP,KILN:KILN,VALUES:VALUES,SUPPLIES:SUPPLIES,
    canAfford:canAfford,exchange:exchange,sell:sell,buy:buy,uses:uses,PROJECTS:PROJECTS,projectProgress:projectProgress,claim:claim};
})();
