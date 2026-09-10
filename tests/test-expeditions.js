const assert=require('assert');
(async()=>{
 const browser=await require('./browser').launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
   const s={speaking:false,pending:false,getVoices:()=>[],speak(u){window.__spoken=(window.__spoken||[]).concat(u.text);setTimeout(()=>u.onend&&u.onend(),5);},cancel(){},pause(){},resume(){}};
   Object.defineProperty(window,'speechSynthesis',{value:s,configurable:true});window.SpeechSynthesisUtterance=function(t){this.text=t;};
 });
 await page.goto('http://127.0.0.1:8905/index.html');await page.waitForFunction(()=>window.Game&&window.Expeditions);
 await page.evaluate(()=>{const p=Store.addProfile({name:'Nova',emoji:'🦊',grade:'2',setupConfirmed:true});Store.load(p);Store.data.firstDiscovery={done:true};Store.family.assignments[p.id]=[{cid:'math-2',enabled:true,weight:1}];Store.saveFamily();Game.start();});
 assert(await page.locator('#expedition-hud').isVisible());await page.locator('#expedition-hud').click();
 assert.equal(await page.locator('[data-exp-start]').count(),3);assert(await page.locator('#screen-read').isVisible());
 await page.locator('#screen-read').click();await page.waitForTimeout(20);
 assert(await page.evaluate(()=>window.__spoken.some(t=>/Choose the kind of adventure/.test(t))));
 await page.locator('[data-exp-start="wild"]').click();
 assert(await page.evaluate(()=>Expeditions.record('gather',3)&&Expeditions.record('creature',1)));
 assert((await page.locator('#expedition-hud').innerText()).includes('learning discovery'));
 await page.locator('#expedition-hud').click();
 const startedSparks=await page.evaluate(()=>Store.data.player.sparks);
 await page.locator('#exp-learn').click();
 const answer=await page.evaluate(()=>{const buttons=[...document.querySelectorAll('#ch-grid button')];return buttons.find(b=>!b.disabled&&b.textContent);});
 // Try choices until the activity completes; the correct option is guaranteed present.
 for(const b of await page.locator('#ch-grid button').all()){if(!(await page.locator('#ch-grid').count()))break;await b.click();await page.waitForTimeout(30);}
 await page.waitForSelector('#exp-journal');
 assert((await page.locator('#overlay-card').innerText()).includes('Expedition complete'));
 assert(await page.evaluate(s=>Store.data.player.sparks===s+10&&Store.data.expeditions.completed===1&&Store.data.expeditions.relics[0]==='mosswing',startedSparks));
 await page.locator('#exp-journal').click();
 assert.equal(await page.locator('.journal-relic:not(.locked)').count(),1);assert(await page.locator('#exp-postcard').isVisible());
 assert(await page.evaluate(()=>{const d=Expeditions.postcardData();return /^data:image\/png;base64,/.test(d)&&d.length>10000;}));
 await page.screenshot({path:'/tmp/lumen-journal.png'});
 // A second run of the same trail guarantees the second discovery, then no duplicates.
 await page.evaluate(()=>{UI.closeOverlay();Expeditions._defs[0].stages.forEach(s=>{});});
 await page.locator('#expedition-hud').click();await page.locator('[data-exp-start="wild"]').click();
 await page.evaluate(()=>{Expeditions.record('gather',3);Expeditions.record('creature',1);});await page.locator('#expedition-hud').click();await page.locator('#exp-learn').click();
 for(const b of await page.locator('#ch-grid button').all()){if(!(await page.locator('#ch-grid').count()))break;await b.click();await page.waitForTimeout(30);}
 await page.waitForSelector('#exp-journal');assert(await page.evaluate(()=>Store.data.expeditions.relics.join(',')==='mosswing,glowglass'));
 await page.evaluate(()=>{UI.closeOverlay();Game.travelTo('sunwake');Game.travelTo('meadowmere');Store.saveNow();});
 assert(await page.evaluate(()=>!!Objects.byId('keeper-expedition-mark')),'completed isle gains a trail marker on revisit');
 await page.reload();await page.waitForFunction(()=>window.Game&&window.Expeditions);await page.evaluate(()=>{Store.load(Store.family.profiles[0]);Game.start();});
 assert(await page.evaluate(()=>Store.data.expeditions.completed===2&&Store.data.expeditions.relics.length===2));
 // Screen reading gives instructions without revealing a decode-the-word answer.
 await page.evaluate(()=>{window.__spoken=[];Activities.present({kind:'read',word:'quasar',pictures:[{emoji:'🌟'}],answer:'🌟'},()=>{},'Read this word');});
 await page.locator('#screen-read').click();await page.waitForTimeout(20);
 assert(await page.evaluate(()=>window.__spoken.some(t=>/Read it all by yourself/.test(t))&&!window.__spoken.some(t=>/quasar/i.test(t))));
 await page.evaluate(()=>{UI.closeOverlay();Game.stop();const p=Store.addProfile({name:'Sol',grade:'2',setupConfirmed:true});Store.load(p);Store.data.firstDiscovery={done:true};Game.start();});
 assert(await page.evaluate(()=>Expeditions.summary(Store.data).completed===0&&Store.data.expeditions.relics.length===0));
 await page.evaluate(()=>Game.stop());assert(await page.evaluate(()=>Store.data.stats.sessions.count===1));
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS choices, staged action loop, real lesson, rewards, unique journal finds, postcard, world marker, reload, read-aloud safety, session metric and profile isolation');
})().catch(e=>{console.error(e);process.exit(1);});
