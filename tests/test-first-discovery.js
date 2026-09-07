const assert=require('assert');
(async()=>{
 const browser=await require('./browser').launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:8905/index.html');await page.waitForFunction(()=>window.Game);
 const started=Date.now();
 await page.evaluate(()=>{
  const p=Store.addProfile({name:'First explorer',grade:'2',setupConfirmed:true});Store.load(p);
  Store.family.assignments[p.id]=[{cid:'math-2',weight:1,enabled:true}];
  const present=Activities.present;Activities.present=function(ch,done,intro){window.testChallenge=ch;return present(ch,done,intro);};
  Game.start();
 });
 assert(await page.locator('#first-begin').isVisible());
 await page.screenshot({path:'/tmp/lumen-first-welcome.png'});
 await page.locator('#first-begin').click();
 assert(Date.now()-started<120000,'real activity appears within two minutes');
 const ch=await page.evaluate(()=>window.testChallenge);assert.equal(ch.kind,'math');assert.equal(ch.subject,'math');
 assert(await page.locator('#overlay-card').innerText().then(t=>t.includes(ch.q)));
 const wrong=await page.locator('#ch-grid button').allTextContents();
 await page.getByRole('button',{name:wrong.find(t=>t!==String(ch.answer)),exact:true}).click();
 assert(await page.evaluate(()=>!Store.data.firstDiscovery.done&&Store.data.player.sparks===0));
 await page.getByRole('button',{name:String(ch.answer),exact:true}).click();
 await page.waitForSelector('#first-explore');
 assert(await page.evaluate(()=>Store.data.firstDiscovery.done&&Store.data.player.sparks===5&&Store.data.stats.lifetime.challenges===1&&Object.values(Store.data.stats.challenges).some(c=>c.mistakes===1)));
 await page.screenshot({path:'/tmp/lumen-first-earned.png'});
 await page.locator('#first-explore').click();
 await page.reload();await page.waitForFunction(()=>window.Game);
 await page.evaluate(()=>{Store.load(Store.family.profiles[0]);Game.start();});
 assert.equal(await page.locator('#first-begin').count(),0);
 assert(await page.evaluate(()=>Store.data.player.sparks===5));
 // A sibling has their own introduction. No assignments must not fake success.
 await page.evaluate(()=>{Game.stop();const p=Store.addProfile({name:'Sibling',grade:'2',setupConfirmed:true});Store.load(p);Store.family.assignments[p.id]=[];Game.start();});
 assert(await page.locator('#first-begin').isVisible());await page.locator('#first-begin').click();
 assert((await page.locator('#overlay-card').innerText()).includes('no lessons ready'));
 assert(await page.evaluate(()=>!Store.data.firstDiscovery.done&&Store.data.player.sparks===0&&Store.data.stats.lifetime.challenges===0));
 await page.locator('#first-explore').click();await page.evaluate(()=>UI.showPause());
 assert(await page.locator('#pm-first').isVisible());
 await page.locator('#pm-isles').click();await page.locator('[data-isle="sunwake"]').click();
 assert(await page.evaluate(()=>Store.data.player.isle==='sunwake'));
 // Saves written before this release do not acquire onboarding on normalization.
 await page.evaluate(()=>{Game.stop();const p=Store.family.profiles[0];Store.load(p);delete Store.data.firstDiscovery;Store.saveNow();Store.load(p);Game.start();});
 assert.equal(await page.locator('#first-begin').count(),0);
 assert(await page.evaluate(()=>Store.data.player.sparks===5));
 assert.deepEqual(errors,[]);await browser.close();
 console.log('PASS first-session intro, real assigned activity, mistake/report, earned reward, reload, sibling isolation, no-lesson honesty, travel and legacy saves');
})().catch(e=>{console.error(e);process.exit(1);});
