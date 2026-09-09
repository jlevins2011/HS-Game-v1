const assert=require('assert');
(async()=>{
 const browser=await require('./browser').launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:8905/index.html');await page.waitForFunction(()=>window.Game);
 await page.evaluate(()=>{const p=Store.addProfile({name:'Picnic test',grade:'2',setupConfirmed:true});Store.load(p);Store.data.firstDiscovery.done=true;Game.start();Store.data.player.inventory={'berry tart':2,bucket:1,'water bucket':1,rope:1,lantern:1,shell:6};UI.showInventory();});
 await page.locator('[data-item="berry tart"]').click();await page.locator('#item-eat').click();
 assert(await page.locator('#item-eat').isDisabled());
 assert(await page.evaluate(()=>Economy.picnicCharges()===10&&Store.data.player.inventory['berry tart']===1&&!Economy.eatTart()));
 await page.waitForTimeout(350);await page.screenshot({path:'/tmp/lumen-picnic.png'});
 // Route real gathering through Game.interact; only aim is controlled by the test.
 assert(await page.evaluate(()=>{
  UI.closeOverlay();Player.position.set(130,Terrain.heightAt(130,130),130);Player.update(0);
  const ray=Objects.raycast,nh=NPCs.hitboxes,ch=Creatures.hitboxes;NPCs.hitboxes=()=>[];Creatures.hitboxes=()=>[];
  function gather(type,hp){const o={id:'test-'+type,type,def:Objects.TYPES[type],hp,x:130,y:Terrain.heightAt(130,130),z:130,grotto:false};Objects.raycast=()=>({obj:o,dist:1});Game.interact();return o;}
  const o=gather('rock',3);const partial=Economy.picnicCharges()===10;Game.interact();Game.interact();
  const stone=Store.data.player.inventory.stone===3&&Economy.picnicCharges()===9;
  gather('flower',1);const flower=Economy.picnicCharges()===9;
  Objects.raycast=ray;NPCs.hitboxes=nh;Creatures.hitboxes=ch;return partial&&stone&&flower;
 }));
 await page.evaluate(()=>{Game.travelTo('sunwake');Store.saveNow();});await page.reload();await page.waitForFunction(()=>window.Game);
 await page.evaluate(()=>{Store.load(Store.family.profiles[0]);Game.start();UI.showInventory();});
 assert(await page.evaluate(()=>Economy.picnicCharges()===9));
 for(const item of ['bucket','water bucket','rope','lantern']){
  await page.locator('[data-item="'+item+'"]').click();await page.locator('#item-reclaim').click();
 }
 assert(await page.evaluate(()=>{const i=Store.data.player.inventory;return i.skysteel===2&&i.fluff===2&&i.glass===1&&i.emberstone===2&&['bucket','water bucket','rope','lantern'].every(k=>!i[k]&&!Economy.reclaim(k));}));
 await page.locator('[data-item="shell"]').click();
 assert((await page.locator('#overlay-card').innerText()).includes('Sunwake Beacon'));
 await page.locator('#item-sell-five').click();assert(await page.evaluate(()=>Store.data.player.inventory.shell===1&&Store.data.player.sparks===10));
 await page.locator('#item-build').click();assert(await page.evaluate(()=>Build.mode));assert(await page.locator('#build-pieces').isVisible());
 assert(await page.evaluate(()=>Object.keys(ITEM_ICON).every(k=>Economy.uses(k).length>0)),'every current or retained catalog item explains a use');
 assert(await page.evaluate(()=>Economy.uses('aurorium').some(u=>/Moonpearl/.test(u))&&Economy.uses('glimmer').some(u=>/Asterfall/.test(u))));
 // Finish the bonus and ensure the eleventh gather is normal; no stacking or timer.
 assert(await page.evaluate(()=>{for(let i=0;i<9;i++){let d={timber:2};if(!Economy.applyPicnic(d)||d.timber!==3)return false;}let d={timber:2};return !Economy.applyPicnic(d)&&d.timber===2&&Economy.eatTart()&&!Economy.eatTart();}));
 await page.evaluate(()=>{UI.closeOverlay();Game.stop();const p=Store.addProfile({name:'Sibling',grade:'2',setupConfirmed:true});Store.load(p);Game.start();});
 assert(await page.evaluate(()=>Economy.picnicCharges()===0));
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS tart consumption, real gathering bonus, partial/unrelated gathers, travel/reload, legacy reclamation, bulk trade, building shortcut, full catalog use coverage and profile isolation');
})().catch(e=>{console.error(e);process.exit(1);});
