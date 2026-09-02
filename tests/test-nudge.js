/* The question timer: a child is never held back from a question, and if they
   go the parent-set time without one, a wishing star brings one — rewarded.
   Also: an older "pacing" setting carries over as the timer. */
const pw = require('playwright-core');
(async () => {
  const browser = await pw.chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:true,
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{width:1180,height:820}, hasTouch:true, isMobile:true });
  const page = await ctx.newPage();
  const errs=[]; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(()=>{
    const s={speaking:false,pending:false,getVoices:()=>[],speak(u){setTimeout(()=>u.onstart&&u.onstart(),5);setTimeout(()=>u.onend&&u.onend(),20);},cancel(){},pause(){},resume(){}};
    Object.defineProperty(window,'speechSynthesis',{value:s,configurable:true}); window.SpeechSynthesisUtterance=function(t){this.text=t;};
    // a fake clock the test can push forward
    const realNow = Date.now; window.__skew = 0; Date.now = () => realNow() + window.__skew;
    // an older household that had "pacing" (a minimum gap) set to 3
    if (!localStorage.getItem('lumen_family_v1')) {
      localStorage.setItem('lumen_family_v1', JSON.stringify({ version: 2,
        profiles: [ { id:'p1', name:'Spencer', emoji:'🦊', color:'#5fae6f', grade:'2', setupConfirmed:true, createdAt:1 } ],
        custom: [], overrides: {}, assignments: { p1: [ {cid:'reading-2',weight:3,enabled:true,autoGrade:true} ] },
        settings: { pin:null, emails:[], reportDays:7, paceMinutes: 3, paceByChild: {} } }));
    }
  });
  const cdp = await ctx.newCDPSession(page);
  const T=async(t,p)=>cdp.send('Input.dispatchTouchEvent',{type:t,touchPoints:p});
  const tap=async(x,y)=>{await T('touchStart',[{x,y,id:1}]);await page.waitForTimeout(60);await T('touchEnd',[]);await page.waitForTimeout(180);};
  const R=[]; const ck=(n,ok,d)=>{R.push({n,ok});console.log((ok?'PASS  ':'FAIL  ')+n+'   '+(d===undefined?'':d));};
  const overlayOpen = () => page.evaluate(()=>document.getElementById('overlay').classList.contains('open'));
  const skew = ms => page.evaluate(m=>{ window.__skew += m; }, ms);

  await page.goto('http://localhost:8905/index.html',{waitUntil:'load'});
  await page.waitForTimeout(1200);
  ck('an old "pacing 3" setting carries over as a 3-minute question timer',
     await page.evaluate(()=>Store.nudgeMinutes('p1')===3 && Store.family.settings.paceMinutes===undefined));
  const pb=(await page.$$('#player-buttons button'))[0]; const b=await pb.boundingBox(); await tap(b.x+b.width/2,b.y+b.height/2);
  await page.waitForTimeout(2800);

  /* ---- never held back ---- */
  await page.evaluate(()=>{ Store.data.stats.lastChallengeAt = Date.now(); });
  const r = await page.evaluate(()=>new Promise(res=>{ UI.showChallenge('node', function(x){ res(x); }, 'T'); setTimeout(()=>res({opened:document.getElementById('overlay').classList.contains('open')}),250); }));
  ck('a wonderstone opens immediately even seconds after the last question', r.opened===true, JSON.stringify(r));
  await page.evaluate(()=>UI.closeOverlay());

  /* ---- the timer brings a star ---- */
  await page.evaluate(()=>{ Store.setNudgeMinutes('p1', 2); });
  ck('no star within the first minute after opening the game', !(await page.evaluate(()=>!!document.querySelector('#overlay.open'))));
  await skew(2.5*60*1000);          // 2½ minutes pass with no question
  await page.waitForTimeout(2600);  // the star takes ~1.5s to fall, then the card opens
  const title = await page.evaluate(()=>{ const t=document.querySelector('#overlay-card .ch-title'); return t ? t.textContent : ''; });
  ck('after the timer runs out a wishing star brings a challenge', (await overlayOpen()) && /STARFALL/i.test(title), JSON.stringify(title));
  ck('the star\'s challenge is a real one from the child\'s sets', await page.evaluate(()=>!!document.querySelector('#overlay-card .word-grid, #overlay-card .tile-grid')));
  const sparks0 = await page.evaluate(()=>Store.data.player.sparks);
  // answer it correctly, whatever it is
  const answered = await page.evaluate(()=>{
    const grid = document.querySelector('#overlay-card .word-grid');
    if (!grid) return 'no-grid';
    const btns = Array.from(grid.querySelectorAll('button'));
    // try each until the card closes; the right one is among them
    return btns.length;
  });
  for (let i=0;i<6 && await overlayOpen();i++) {
    const btns = await page.$$('#overlay-card .word-grid button');
    if (!btns.length) break;
    const bb = await btns[i % btns.length].boundingBox(); await tap(bb.x+bb.width/2, bb.y+bb.height/2);
    await page.waitForTimeout(1100);
  }
  await page.waitForTimeout(500);
  const sparks1 = await page.evaluate(()=>Store.data.player.sparks);
  ck('answering the star\'s question is rewarded', sparks1 > sparks0, sparks0+' → '+sparks1+' sparks');
  ck('answering resets the clock (no second star right away)', await (async()=>{ await page.waitForTimeout(2200); return !(await overlayOpen()); })());

  /* ---- Off means free play ---- */
  await page.evaluate(()=>{ Store.setNudgeMinutes('p1', 0); });
  await skew(30*60*1000);
  await page.waitForTimeout(2600);
  ck('with the timer off, half an hour passes and no star falls', !(await overlayOpen()));

  /* ---- the clock survives a reload; a fresh open gets a minute of grace ---- */
  await page.evaluate(()=>{ Store.setNudgeMinutes('p1', 1); Store.data.stats.lastChallengeAt = Date.now() - 45*60*1000; Store.saveNow(); });
  await page.waitForTimeout(400);   // the family save is debounced
  await page.reload({waitUntil:'load'}); await page.waitForTimeout(1200);
  const pb2=(await page.$$('#player-buttons button'))[0]; const b2=await pb2.boundingBox(); await tap(b2.x+b2.width/2,b2.y+b2.height/2);
  await page.waitForTimeout(2800);
  ck('a child who is long overdue does not get a star the instant the game opens', !(await overlayOpen()));
  await skew(70*1000); await page.waitForTimeout(2600);
  ck('… but does get one about a minute in', (await overlayOpen()) && /STARFALL/i.test(await page.evaluate(()=>document.querySelector('#overlay-card .ch-title').textContent)));
  await page.evaluate(()=>UI.closeOverlay());

  /* ---- pause menu says when the next star is due ---- */
  await page.evaluate(()=>{ Store.data.stats.lastChallengeAt = Date.now(); UI.showPause(); });
  await page.waitForTimeout(200);
  ck('the pause menu shows when the next wishing star is due', /wishing star in about a minute/i.test(await page.textContent('#overlay-card')));
  await page.evaluate(()=>UI.closeOverlay());
  ck('no timer control on any child-facing screen', await page.evaluate(()=>{ UI.showPause(); const a=!!document.querySelector('#overlay-card [data-pace]'); UI.closeOverlay(); UI.showInventory(); const b=!!document.querySelector('#overlay-card [data-pace]'); UI.closeOverlay(); return !a && !b; }));

  console.log('page errors:', errs.length?errs:'none');
  const bad=R.filter(r=>!r.ok);
  console.log('\n'+(bad.length?'FAILURES: '+bad.map(r=>r.n).join(' | '):'ALL '+R.length+' QUESTION-TIMER CHECKS PASSED'));
  await browser.close();
  process.exit(bad.length||errs.length?1:0);
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
