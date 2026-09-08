const assert=require('assert');
(async()=>{
 const browser=await require('./browser').launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:850}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:8905/index.html');await page.waitForFunction(()=>window.Game);
 await page.evaluate(()=>{const p=Store.addProfile({name:'Observatory test',grade:'2',setupConfirmed:true});Store.load(p);Store.data.firstDiscovery.done=true;Store.family.assignments[p.id]=[{cid:'math-2',enabled:true,weight:1}];Store.data.player.level=11;Game.start();UI.showPause();});
 await page.locator('#pm-isles').click();assert((await page.locator('[data-isle="asterfall"]').innerText()).includes('Level 12'));
 await page.locator('[data-isle="asterfall"]').click();
 assert(await page.evaluate(()=>Store.data.player.isle==='meadowmere'&&Game.travelTo('asterfall')===false));
 await page.evaluate(()=>{UI.closeOverlay();Game.grantXP(UI.xpNeeded(12)-Store.data.player.xp);UI.closeOverlay();UI.showPause();});
 await page.locator('#pm-isles').click();await page.locator('[data-isle="asterfall"]').click();
 assert(await page.evaluate(()=>Store.data.player.isle==='asterfall'));
 const land=await page.evaluate(()=>{
  let maxSlope=0;[[73,95],[119,95],[96,123],[96,76]].forEach(([x,z])=>{for(let t=0;t<=1;t+=.025){let ax=96+(x-96)*t,az=100+(z-100)*t;maxSlope=Math.max(maxSlope,Terrain.slopeAt(ax,az));}});
  return {maxSlope,dry:!Terrain.isWater(96,76),islets:Terrain.islets.every(i=>!Terrain.isWater(i.x,i.z)),anchors:Objects.dynamicByType('anchor').length};
 });console.log(land);assert(land.dry&&land.islets&&land.maxSlope<.8);assert.equal(land.anchors,4);
 await page.evaluate(()=>Asterfall.interact(Objects.byId('aster-core')));assert(await page.locator('#aster-act').isDisabled());await page.locator('#aster-back').click();
 await page.evaluate(()=>{Store.family.assignments[Store.profile.id]=[];Asterfall.interact(Objects.byId('aster-lens-0'));});
 await page.locator('#aster-act').click();
 assert(await page.evaluate(()=>!(Store.isleState('asterfall').lenses||[]).some(Boolean)&&Store.data.stats.lifetime.challenges===0));
 await page.evaluate(()=>{UI.closeOverlay();Store.family.assignments[Store.profile.id]=[{cid:'math-2',enabled:true,weight:1}];});
 await page.evaluate(()=>{const p=Activities.present;Activities.present=function(ch,done,intro){window.testChallenge=ch;return p(ch,done,intro);};});
 for(let i=0;i<3;i++){
  await page.evaluate(i=>Asterfall.interact(Objects.byId('aster-lens-'+i)),i);await page.locator('#aster-act').click();
  const ch=await page.evaluate(()=>window.testChallenge);assert.equal(ch.kind,'math');
  await page.getByRole('button',{name:String(ch.answer),exact:true}).click();
  await page.waitForFunction(i=>!!(Store.isleState('asterfall').lenses || [])[i],i);
  if(i===0){await page.evaluate(()=>{Game.travelTo('meadowmere');Game.travelTo('asterfall');});assert(await page.evaluate(()=>Store.isleState('asterfall').lenses[0]));}
 }
 assert(await page.evaluate(()=>Store.data.stats.lifetime.challenges===3));
 await page.evaluate(()=>{Store.data.player.inventory={};Asterfall.interact(Objects.byId('aster-core'));});assert(await page.locator('#aster-act').isDisabled());
 const sparks=await page.evaluate(()=>{UI.closeOverlay();Store.data.player.inventory={glimmer:6,glass:4,starstone:2};Asterfall.interact(Objects.byId('aster-core'));return Store.data.player.sparks;});
 await page.locator('#aster-act').click();
 assert(await page.evaluate(s=>{const p=Store.data.player;return Store.isleState('asterfall').observatoryRestored&&p.sparks===s+40&&p.inventory.aurorium===6&&!p.inventory.glimmer&&!p.inventory.glass&&!p.inventory.starstone&&!Asterfall.restore(Objects.byId('aster-core'));},sparks));
 await page.evaluate(()=>{Game.travelTo('sunwake');Game.travelTo('asterfall');Store.saveNow();});
 await page.reload();await page.waitForFunction(()=>window.Game);await page.evaluate(()=>{Store.load(Store.family.profiles[0]);Game.start();});
 assert(await page.evaluate(()=>Store.isleState('asterfall').lenses.every(Boolean)&&Store.isleState('asterfall').observatoryRestored));
 await page.evaluate(()=>{UI.closeOverlay();document.getElementById('toast').classList.remove('show');Player.position.set(96,Terrain.heightAt(96,80)+1,80);const yaw=Math.PI,pitch=.22;Player.look(Player.yaw-yaw,Player.pitch-pitch);Player.update(0);});
 await page.waitForTimeout(500);await page.screenshot({path:'/tmp/lumen-asterfall.png'});
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>Asterfall.interact(Objects.byId('aster-core')));await page.screenshot({path:'/tmp/lumen-asterfall-phone.png'});
 // Another explorer cannot inherit the unlock or the expedition.
 await page.evaluate(()=>{UI.closeOverlay();Game.stop();const p=Store.addProfile({name:'Young explorer',grade:'2',setupConfirmed:true});Store.load(p);Store.data.player.isle='asterfall';Game.start();});
 assert(await page.evaluate(()=>Store.data.player.isle==='meadowmere'&&!Store.isleState('asterfall').observatoryRestored));
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS level 11 lock, earned level 12 travel, walkable routes, islets, three real lessons, restoration cost/reward, persistence and profile isolation');
})().catch(e=>{console.error(e);process.exit(1);});
