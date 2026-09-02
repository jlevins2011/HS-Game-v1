/* New Explorer: kid half → hand-off → grown-up setup (grade auto-sync,
   per-subject override, on/off), Skip defaults, PIN gate, Edit setup. */
const pw = require('playwright-core');
(async () => {
  const browser = await pw.chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:true,
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{width:1180,height:820}, hasTouch:true, isMobile:true,
    userAgent:'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  const page = await ctx.newPage();
  const errs=[]; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(()=>{const s={speaking:false,pending:false,getVoices:()=>[{name:'S',lang:'en-US'}],speak(u){setTimeout(()=>u.onstart&&u.onstart(),5);setTimeout(()=>u.onend&&u.onend(),20);},cancel(){},pause(){},resume(){}};Object.defineProperty(window,'speechSynthesis',{value:s,configurable:true});window.SpeechSynthesisUtterance=function(t){this.text=t;};});
  const cdp = await ctx.newCDPSession(page);
  const T=async(t,p)=>cdp.send('Input.dispatchTouchEvent',{type:t,touchPoints:p});
  const tap=async(x,y)=>{await T('touchStart',[{x,y,id:1}]);await page.waitForTimeout(60);await T('touchEnd',[]);await page.waitForTimeout(180);};
  const tapSel=async s=>{const el=await page.$(s);if(!el){console.log('MISSING '+s);return false;}try{await el.scrollIntoViewIfNeeded();}catch(e){}await page.waitForTimeout(80);const b=await el.boundingBox();if(!b)return false;await tap(b.x+b.width/2,b.y+b.height/2);return true;};
  const R=[]; const ck=(n,ok,d)=>{R.push({n,ok});console.log((ok?'PASS  ':'FAIL  ')+n+'   '+(d===undefined?'':d));};
  const newExplorer = async name => { const btns=await page.$$('#player-buttons button'); const nb=await btns[btns.length-1].boundingBox();
    await tap(nb.x+nb.width/2,nb.y+nb.height/2); await page.waitForTimeout(300); await page.fill('#ne-name',name); await tapSel('#ne-go'); await page.waitForTimeout(350); };
  const plan = () => page.evaluate(()=>Store.gradePlanFor(Store.family.profiles[Store.family.profiles.length-1].id));
  const rows = () => page.evaluate(()=>Store.assignmentsFor(Store.family.profiles[Store.family.profiles.length-1].id));

  await page.goto('http://localhost:8905/index.html',{waitUntil:'load'});
  await page.waitForTimeout(1200);

  /* ---- 1. the full grown-up path ---- */
  await newExplorer('Ada');
  ck('after the kid half comes the hand-off screen', /Hand this to a grown-up/.test(await page.textContent('#overlay-card')));
  ck('the kid is not already playing', !(await page.evaluate(()=>Game.running)));
  await tapSel('#ho-adult'); await page.waitForTimeout(300);
  ck('no PIN set → straight to the setup screen', /Ada's lessons/.test(await page.textContent('#overlay-card')));
  ck('defaults: grade 2, reading/spelling/math/bible on, latin off',
     await page.evaluate(()=>{ const on=Array.from(document.querySelectorAll('.setup-row.on')).map(e=>e.getAttribute('data-setup-row')); return on.join(',')==='reading,spelling,math,bible' && document.querySelector("[data-grade='2']").classList.contains('active'); }));

  await tapSel("[data-grade='3']");
  ck('picking 3rd grade sets every graded subject to 3',
     await page.evaluate(()=>['reading','spelling','math'].every(s=>document.querySelector("[data-sg='"+s+"'][data-g='3']").classList.contains('active'))));
  await tapSel("[data-sg='spelling'][data-g='2']");
  ck('spelling can be dropped to 2 on its own',
     await page.evaluate(()=>document.querySelector("[data-sg='spelling'][data-g='2']").classList.contains('active') && document.querySelector("[data-sg='reading'][data-g='3']").classList.contains('active')));
  await tapSel("[data-grade='4']");
  ck('changing the grade to 4 moves reading and math but leaves the overridden spelling at 2',
     await page.evaluate(()=>document.querySelector("[data-sg='reading'][data-g='4']").classList.contains('active') && document.querySelector("[data-sg='math'][data-g='4']").classList.contains('active') && document.querySelector("[data-sg='spelling'][data-g='2']").classList.contains('active')));
  await tapSel("[data-sg='spelling'][data-g='4']");
  await tapSel("[data-grade='3']");
  ck('putting spelling back in step makes it follow the grade again',
     await page.evaluate(()=>document.querySelector("[data-sg='spelling'][data-g='3']").classList.contains('active')));
  await tapSel("[data-sg='spelling'][data-g='2']");
  await tapSel("[data-tog-sub='latin']");
  await tapSel("[data-tog-sub='math']");
  ck('subjects toggle on and off',
     await page.evaluate(()=>document.querySelector("[data-setup-row='latin']").classList.contains('on') && !document.querySelector("[data-setup-row='math']").classList.contains('on')));
  await tapSel('#setup-save'); await page.waitForTimeout(3000);
  ck('SAVE starts the game', await page.evaluate(()=>Game.running && Store.profile.name==='Ada'));
  const r1 = await rows();
  const byId = Object.fromEntries(r1.map(a=>[a.cid,a]));
  ck('assignments match the screen: reading-3, spelling-2 (override), math-3 off, bible on, latin on',
     byId['reading-3'] && byId['reading-3'].enabled && byId['reading-3'].autoGrade===true &&
     byId['spelling-2'] && byId['spelling-2'].autoGrade===false &&
     byId['math-3'] && byId['math-3'].enabled===false &&
     byId['bible1'] && byId['bible1'].enabled && byId['latin1'] && byId['latin1'].enabled,
     JSON.stringify(r1));
  ck('profile carries the grade and is marked set up', await page.evaluate(()=>Store.profile.grade==='3' && Store.profile.setupConfirmed===true));
  const kinds = await page.evaluate(()=>{ const s=new Set(); for(let i=0;i<40;i++) s.add(Learning.getChallenge('node').cid); return Array.from(s); });
  ck('play draws only from the enabled sets (no math)', kinds.every(c=>['reading-3','spelling-2','bible1','latin1'].includes(c)), JSON.stringify(kinds));

  /* ---- 2. Skip ---- */
  await page.evaluate(()=>{ Game.stop(); UI.closeOverlay(); UI.showHome(); }); await page.waitForTimeout(400);
  await newExplorer('Ben');
  await tapSel('#ho-skip'); await page.waitForTimeout(3000);
  ck('Skip starts the game on defaults', await page.evaluate(()=>Game.running && Store.profile.name==='Ben'));
  const p2 = await plan();
  ck('defaults are the default grade with the default subjects', p2.grade==='2' && p2.subjects.reading.enabled && p2.subjects.reading.grade==='2' && !p2.subjects.latin.enabled, JSON.stringify(p2.subjects.reading));
  ck('the profile is flagged as not set up', await page.evaluate(()=>Store.profile.setupConfirmed===false));

  /* ---- 3. Explorers tab: badge + Edit setup ---- */
  await page.evaluate(()=>{ Game.stop(); UI.closeOverlay(); UI.showHome(); Parent.show(); document.getElementById('overlay').dispatchEvent(new Event('pointerdown')); });
  await page.waitForTimeout(300);
  const ex = await page.textContent('#overlay-card');
  ck('Explorers tab flags the skipped child', /needs a grown-up's setup/.test(ex));
  ck('Explorers tab shows grades and the subject plan', /3rd grade/.test(ex) && /Gr 2/.test(ex));
  const setups = await page.$$('[data-setup]');
  const last = setups[setups.length-1]; await last.scrollIntoViewIfNeeded(); await page.waitForTimeout(100);
  const sb = await last.boundingBox(); await tap(sb.x+sb.width/2, sb.y+sb.height/2); await page.waitForTimeout(300);
  ck('Edit setup opens the same screen', /Ben's lessons/.test(await page.textContent('#overlay-card')));
  await tapSel("[data-grade='K']"); await tapSel('#setup-save'); await page.waitForTimeout(300);
  ck('saving from Edit setup applies and returns to the Parents area',
     await page.evaluate(()=>Store.family.profiles[1].grade==='K' && Store.family.profiles[1].setupConfirmed===true && /Parents Area/.test(document.querySelector('#overlay-card .ch-title').textContent)));
  ck('K maps to the -k sets', await page.evaluate(()=>Store.assignmentsFor(Store.family.profiles[1].id).some(a=>a.cid==='reading-k')));

  /* ---- 4. PIN gates the grown-up step ---- */
  await page.evaluate(()=>{ Store.family.settings.pin='2468'; Store.saveFamily(); UI.closeOverlay(); UI.showHome(); }); await page.waitForTimeout(300);
  await newExplorer('Cy');
  await tapSel('#ho-adult'); await page.waitForTimeout(300);
  ck('with a PIN set, "I\'m a grown-up" asks for it', !!(await page.$('#pin-pad')));
  await tapSel('#pin-cancel'); await page.waitForTimeout(250);
  ck('cancelling the PIN returns to the hand-off, not the game', /Hand this to a grown-up/.test(await page.textContent('#overlay-card')) && !(await page.evaluate(()=>Game.running)));
  await tapSel('#ho-adult'); await page.waitForTimeout(250);
  for (const dgt of ['2','4','6','8']) {
    const key = await page.evaluateHandle(dd=>Array.from(document.querySelectorAll('.pin-key')).find(k=>k.textContent===dd), dgt);
    const kb = await key.asElement().boundingBox(); await tap(kb.x+kb.width/2, kb.y+kb.height/2);
  }
  await page.waitForTimeout(300);
  ck('the right PIN opens the setup screen', /Cy's lessons/.test(await page.textContent('#overlay-card')));
  await tapSel('#setup-skip'); await page.waitForTimeout(2500);
  ck('Skip is still available past the PIN and starts the game', await page.evaluate(()=>Game.running && Store.profile.name==='Cy'));

  console.log('page errors:', errs.length?errs:'none');
  const bad=R.filter(r=>!r.ok);
  console.log('\n'+(bad.length?'FAILURES: '+bad.map(r=>r.n).join(' | '):'ALL '+R.length+' SETUP CHECKS PASSED'));
  await browser.close();
  process.exit(bad.length||errs.length?1:0);
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
