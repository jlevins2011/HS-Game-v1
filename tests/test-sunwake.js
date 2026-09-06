const assert=require('assert');
(async()=>{
 const browser=await require('./browser').launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:850}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:8905/index.html');await page.waitForFunction(()=>window.Game);
 const original=await page.evaluate(()=>{
  const p=Store.addProfile({name:'Atoll test',grade:'2',setupConfirmed:true});Store.load(p);Game.start();
  Store.isleState('meadowmere').pieces=[{t:'floor',x:95,y:Terrain.heightAt(95,95)+.4,z:95,r:0,v:1}];
  const h=Terrain.heightAt(100,100);UI.showPause();return h;
 });
 await page.locator('#pm-isles').click();await page.locator('[data-isle="sunwake"]').click();
 const initial=await page.evaluate(()=>{
  const o=Objects.byId('sunwake-beacon');
  const s=Objects.hit(Objects.byId('sunwake-shells'),{tools:{},toolTier:0});
  Objects.hit(Objects.byId('sunwake-coral'),{tools:{},toolTier:0});
  const c=Objects.hit(Objects.byId('sunwake-coral'),{tools:{},toolTier:0});
  Store.data.player.inventory={};Sunwake.interact(o);
  return {isle:Store.data.player.isle,spawnDry:!Terrain.isWater(96,80),beaconDry:!Terrain.isWater(o.x,o.z),lagoon:Terrain.isWater(110,107),islets:Terrain.islets.map(i=>({id:i.id,dry:!Terrain.isWater(i.x,i.z)})),shell:s.drops.shell,glowdust:c.drops.glowdust,denied:!Sunwake.restore(o)};
 });
 console.log(initial);
 assert.equal(initial.isle,'sunwake');assert(initial.spawnDry&&initial.beaconDry&&initial.lagoon);
 assert.equal(initial.islets.length,2);assert(initial.islets.every(i=>i.dry));assert.equal(initial.shell,2);assert.equal(initial.glowdust,2);assert(initial.denied);
 assert(await page.locator('#beacon-restore').isDisabled());
 const sparks=await page.evaluate(()=>{UI.closeOverlay();Store.data.player.inventory={shell:6,glass:2,glowdust:2};Sunwake.interact(Objects.byId('sunwake-beacon'));return Store.data.player.sparks;});
 await page.locator('#beacon-restore').click();
 assert(await page.evaluate(s=>{const p=Store.data.player;return Store.isleState('sunwake').beaconRestored&&p.sparks===s+12&&p.inventory.glimmer===3&&!p.inventory.shell&&!p.inventory.glass&&!p.inventory.glowdust&&!Sunwake.restore(Objects.byId('sunwake-beacon'));},sparks));
 assert(await page.evaluate(h=>{Game.travelTo('meadowmere');return Terrain.heightAt(100,100)===h&&Build.pieces.some(p=>p.t==='floor'&&p.x===95);},original));
 await page.evaluate(()=>{Game.travelTo('sunwake');Store.saveNow();});
 assert(await page.evaluate(()=>Objects.byId('sunwake-beacon').beaconLight.intensity===2&&Objects.byId('sunwake-shells').gone));
 await page.reload();await page.waitForFunction(()=>window.Game);
 await page.evaluate(()=>{Store.load(Store.family.profiles[0]);Game.start();});
 assert(await page.evaluate(()=>Store.data.player.isle==='sunwake'&&Objects.byId('sunwake-beacon').beaconLight.intensity===2));
 await page.evaluate(()=>{
  UI.closeOverlay();const x=103,z=72,tx=113,tz=99,ty=13;
  Player.position.set(x,Terrain.heightAt(x,z)+2,z);
  const yaw=Math.atan2(-(tx-x),-(tz-z)),pitch=Math.atan2(ty-(Player.position.y+1.5),Math.hypot(tx-x,tz-z));
  Player.look(Player.yaw-yaw,Player.pitch-pitch);Player.update(0);
 });
 await page.waitForTimeout(500);await page.screenshot({path:'/tmp/lumen-sunwake.png'});
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS Sunwake travel, dry arrival and islets, lagoon, harvest, restoration cost/reward, repeat protection, old world retention and reload');
})().catch(e=>{console.error(e);process.exit(1);});
