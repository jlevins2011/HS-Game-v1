const assert=require('assert');
(async()=>{
 const browser=await require('./browser').launch({headless:true});
 const page=await browser.newPage({viewport:{width:1180,height:820},hasTouch:true,isMobile:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:8905/index.html');
 await page.waitForFunction(()=>window.Game);
 const results=await page.evaluate(()=>{
   const p=Store.addProfile({name:'House test',grade:'2',setupConfirmed:true});Store.load(p);Game.start();
   const state=Store.isleState('meadowmere'),y=Terrain.heightAt(95,95)+0.4;
   const rec=(t,x,by,z,r=0)=>({t,x,y:by,z,r,v:1});
   state.pieces=[rec('floor',95,y,95),rec('floor',97,y,95),rec('floor',95,y,97),rec('floor',97,y,97),
     rec('door',95,y+.22,94),rec('window',97,y+.22,94),rec('wall',95,y+.22,98),rec('wall',97,y+.22,98),
     rec('wall',94,y+.22,95,1),rec('wall',94,y+.22,97,1),rec('brickwall',98,y+.22,95,1),rec('window',98,y+.22,97,1),
     rec('roof_slope',95,y+2.62,95),rec('roof_slope',97,y+2.62,95),rec('roof_slope',95,y+2.62,97,2),rec('roof_slope',97,y+2.62,97,2),
     rec('bed',95,y+.22,97),rec('bench',97,y+.22,97),rec('crystallamp',97,y+.22,95),rec('planter',93,y,99)];
   Build.load(window.__dbg.scene,state);
   Player.position.set(95,y+.22,95);Player.update(0);
   const floorY=Player.position.y;
   Player.jump=true;for(let i=0;i<70;i++)Player.update(.016);Player.jump=false;
   const maxUnderRoof=Player.position.y<y+2.0;
   Store.data.player.inventory={timber:100,leaves:20,"sunfruit seeds":2,"moonmelon seeds":2};
   Store.saveNow();
   const plant=Build.pieces.find(p=>p.t==='planter');Garden.tap(plant);
   return {y,floorY,maxUnderRoof};
 });
 assert(results.maxUnderRoof,'player remains below the roof while jumping');
 await page.locator('[data-crop="moonmelon"]').click();
 assert(await page.evaluate(()=>Object.values(Store.isleState('meadowmere').planters).some(p=>p.crop==='moonmelon')));
 await page.evaluate(()=>{let ps=Store.isleState('meadowmere').planters;Object.values(ps).forEach(p=>p.at=Date.now()-CONFIG.WORLD.cropGrowSec*2100);Garden.tick();Garden.tap(Build.pieces.find(p=>p.t==='planter'));});
 assert(await page.evaluate(()=>Store.data.player.inventory.moonmelon>=2));
 // Stairs are extended by the same resolver used by the live preview.
 assert(await page.evaluate(()=>{
   const st=Store.isleState('meadowmere'),first={t:'stairs',x:103,y:20,z:95,r:1,v:1};st.pieces.push(first);Build.load(window.__dbg.scene,st);Build.setPiece('stairs');
   Player.position.set(102,20,92);
   const pose=Build.currentPose({point:new THREE.Vector3(103.9,21.31,95),piece:Build.pieces.find(p=>p.t==='stairs')});
   return pose.x===105&&pose.z===95&&pose.r===1&&Math.abs(pose.y-21.31)<1e-6;
 }));
 await page.evaluate(y=>{
   UI.closeOverlay();Build.exitMode();UI.hideBuildSheet();
   const x=91,z=90,tx=96,tz=96,ty=y+1.5;
   Player.position.set(x,y+2,z);
   const yaw=Math.atan2(-(tx-x),-(tz-z)),pitch=Math.atan2(ty-(y+3.5),Math.hypot(tx-x,tz-z));
   Player.look(Player.yaw-yaw,Player.pitch-pitch);Player.update(0);
 },results.y);
 await page.waitForTimeout(400);
 await page.screenshot({path:'/tmp/lumen-house.png'});
 await page.evaluate(()=>{Build.enterMode();Build.setPiece('roof_slope');UI.showBuildSheet();});
 await page.waitForTimeout(400);
 assert(await page.locator('#build-pieces').isVisible());
 const box=await page.locator('#build-sheet').boundingBox();assert(box.y>=0&&box.y+box.height<=821);
 await page.screenshot({path:'/tmp/lumen-build-preview.png'});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(350);
 const mobile=await page.locator('#build-sheet').boundingBox();assert(mobile.x>=0&&mobile.x+mobile.width<=390&&mobile.y>=0);
 await page.screenshot({path:'/tmp/lumen-mobile.png'});
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS roofed furnished house, jumping, moonmelon growing/harvest, rotated stair extension, desktop and phone build tray');
})().catch(e=>{console.error(e);process.exit(1);});
