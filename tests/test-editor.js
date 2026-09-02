/* Bank viewer/editor: editing a built-in makes a household copy under the
   SAME id, mastery on untouched words survives, Restore original works,
   say: reaches the voice, and the Assignments on/off switch remembers weight. */
const pw = require('playwright-core');
(async () => {
  const browser = await pw.chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:true,
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{width:1180,height:820}, hasTouch:true, isMobile:true,
    userAgent:'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  const page = await ctx.newPage();
  const errs=[]; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(()=>{const heard=[];window.__heard=heard;const s={speaking:false,pending:false,getVoices:()=>[{name:'S',lang:'en-US'}],speak(u){heard.push(String(u.text||''));setTimeout(()=>u.onstart&&u.onstart(),5);setTimeout(()=>u.onend&&u.onend(),20);},cancel(){},pause(){},resume(){}};Object.defineProperty(window,'speechSynthesis',{value:s,configurable:true});window.SpeechSynthesisUtterance=function(t){this.text=t;};});
  const cdp = await ctx.newCDPSession(page);
  const T=async(t,p)=>cdp.send('Input.dispatchTouchEvent',{type:t,touchPoints:p});
  const tap=async(x,y)=>{await T('touchStart',[{x,y,id:1}]);await page.waitForTimeout(60);await T('touchEnd',[]);await page.waitForTimeout(180);};
  const tapSel=async s=>{const el=await page.$(s);if(!el){console.log('MISSING '+s);return false;}try{await el.scrollIntoViewIfNeeded();}catch(e){}await page.waitForTimeout(80);const b=await el.boundingBox();if(!b)return false;await tap(b.x+b.width/2,b.y+b.height/2);return true;};
  const R=[]; const ck=(n,ok,d)=>{R.push({n,ok});console.log((ok?'PASS  ':'FAIL  ')+n+'   '+(d===undefined?'':d));};

  await page.goto('http://localhost:8905/index.html',{waitUntil:'load'});
  await page.waitForTimeout(1200);
  const btns=await page.$$('#player-buttons button'); const nb=await btns[btns.length-1].boundingBox();
  await tap(nb.x+nb.width/2,nb.y+nb.height/2); await page.waitForTimeout(300);
  await page.fill('#ne-name','Edie'); await tapSel('#ne-go'); await page.waitForTimeout(350);
  await tapSel('#ho-adult'); await page.waitForTimeout(250);
  await tapSel("[data-grade='3']"); await tapSel('#setup-save'); await page.waitForTimeout(2800);

  // seed mastery on two Grade 3 spelling words, then open the editor
  await page.evaluate(()=>{ Store.data.learn.mastery['spelling-3'] = { rain: { spell: { box: 4, win: 5, miss: 0, last: 1 } }, sail: { spot: { box: 2, win: 2, miss: 1, last: 1 } } }; Store.saveNow(); });
  await page.evaluate(()=>{ Game.stop(); UI.closeOverlay(); UI.showHome(); Parent.show(); document.getElementById('overlay').dispatchEvent(new Event('pointerdown')); });
  await page.waitForTimeout(300);
  await tapSel(".pr-tab[data-tab='lessons']"); await page.waitForTimeout(250);
  ck('every set has a View / edit button', (await page.$$('[data-open]')).length>=20);
  await tapSel("[data-open='spelling-3']"); await page.waitForTimeout(300);
  ck('the bank opens with its tiers', /Vowel Team Trail/.test(await page.textContent('#overlay-card')));
  const before = await page.evaluate(()=>Store.curriculum('spelling-3').tiers[0].words.length);
  ck('built-in is not yet customized', !(await page.evaluate(()=>Store.isOverridden('spelling-3'))));

  /* ---- delete three words (double-tap each) ---- */
  for (const w of ['paint','tray','stay']) {
    const del = await page.evaluateHandle(word=>{ const li=Array.from(document.querySelectorAll('.bank-list li')).find(l=>l.querySelector('.bank-item').textContent===word); return li && li.querySelector('[data-del]'); }, w);
    const el = del.asElement(); await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(60);
    let b = await el.boundingBox(); await tap(b.x+b.width/2, b.y+b.height/2);
    b = await el.boundingBox(); await tap(b.x+b.width/2, b.y+b.height/2);
    await page.waitForTimeout(250);
  }
  const after = await page.evaluate(()=>Store.curriculum('spelling-3').tiers[0].words);
  ck('three words removed', after.length===before-3 && !after.includes('paint') && !after.includes('stay'), before+' → '+after.length);
  ck('the first edit created a household copy under the same id', await page.evaluate(()=>Store.isOverridden('spelling-3') && Store.family.overrides['spelling-3'].id==='spelling-3'));
  ck('the original built-in is untouched', await page.evaluate(()=>Store.baseCurriculum('spelling-3').tiers[0].words.includes('paint')));
  ck('the bank now says customized and offers Restore', /customized/.test(await page.textContent('#overlay-card')) && !!(await page.$('#bank-restore')));

  /* ---- add two words, one with a pronunciation ---- */
  await tapSel("[data-add='0|spelling']"); await page.waitForTimeout(250);
  await page.fill("[data-form] [data-f='word']", 'sleigh'); await tapSel('[data-fsave]'); await page.waitForTimeout(250);
  await tapSel("[data-add='0|spelling']"); await page.waitForTimeout(250);
  await page.fill("[data-form] [data-f='word']", 'read'); await page.fill("[data-form] [data-f='say']", 'reed'); await tapSel('[data-fsave]'); await page.waitForTimeout(250);
  const words = await page.evaluate(()=>Store.curriculum('spelling-3').tiers[0].words);
  ck('two words added, one carrying say:', words.includes('sleigh') && words.some(w=>w && w.word==='read' && w.say==='reed'), JSON.stringify(words.slice(-2)));
  ck('empty word is rejected with a message', await (async()=>{ await tapSel("[data-add='0|spelling']"); await page.waitForTimeout(200); await tapSel('[data-fsave]'); await page.waitForTimeout(150); return /can't be empty/.test(await page.textContent('[data-ferr]')); })());
  await tapSel('[data-fcancel]'); await page.waitForTimeout(200);

  /* ---- mastery preserved on untouched words ---- */
  const m = await page.evaluate(()=>Store.data.learn.mastery['spelling-3']);
  ck('mastery on untouched words is intact', m.rain.spell.win===5 && m.sail.spot.box===2, JSON.stringify(m.rain));
  await page.evaluate(()=>{ UI.closeOverlay(); UI.showHome(); const p=Store.family.profiles[0]; Store.load(p); Game.start(); });
  await page.waitForTimeout(2500);
  const seen = await page.evaluate(()=>{ Store.data.learn.tiers['spelling-3']={tier:0,tierWins:0,struggle:0}; CONFIG.LEARN.reviewChance=0; const s=new Set(); for(let i=0;i<300;i++){ const ch=Learning.getChallenge('node'); if(ch.cid==='spelling-3') s.add(ch.itemKey); } return Array.from(s); });
  ck('play never asks a deleted word and does ask a new one', !seen.includes('paint') && !seen.includes('stay') && seen.includes('sleigh'), 'saw '+seen.length+' distinct; sleigh='+seen.includes('sleigh'));

  /* ---- say: reaches the voice ---- */
  await page.evaluate(()=>{ window.__heard.length=0; Activities.present({kind:'spot', cid:'spelling-3', subject:'spelling', skill:'spot', itemKey:'read', word:'read', say:'reed', choices:['read','raed','reab']}, function(){}, 'T'); });
  await page.waitForTimeout(300);
  ck('a spot card speaks the say: respelling, not the written word', (await page.evaluate(()=>window.__heard)).includes('reed') && !(await page.evaluate(()=>window.__heard)).includes('read'));
  await page.evaluate(()=>{ window.__heard.length=0; UI.closeOverlay(); Activities.present({kind:'recall', cid:'latin1', subject:'vocab', skill:'recall', itemKey:'aqua', front:'aqua', back:'water', say:'ah-kwah', language:'Latin', choices:['water','land','moon']}, function(){}, 'T'); });
  await page.waitForTimeout(200);
  await tapSel('#ch-speak'); await page.waitForTimeout(300);
  ck('a Latin recall card speaks the classical respelling', (await page.evaluate(()=>window.__heard)).includes('ah-kwah'));
  ck('the built-in Latin set carries say: on its words', await page.evaluate(()=>Store.curriculum('latin1').tiers[0].pairs.some(p=>p.say==='sal-way')));
  await page.evaluate(()=>UI.closeOverlay());

  /* ---- Restore original ---- */
  await page.evaluate(()=>{ Game.stop(); UI.showHome(); Parent.show(); document.getElementById('overlay').dispatchEvent(new Event('pointerdown')); }); await page.waitForTimeout(300);
  await tapSel(".pr-tab[data-tab='lessons']"); await page.waitForTimeout(200);
  await tapSel("[data-open='spelling-3']"); await page.waitForTimeout(300);
  await tapSel('#bank-restore'); await tapSel('#bank-restore'); await page.waitForTimeout(300);
  ck('Restore original deletes the copy and the words are back', await page.evaluate(()=>!Store.isOverridden('spelling-3') && Store.curriculum('spelling-3').tiers[0].words.includes('paint')));
  ck('mastery still intact after restore', await page.evaluate(()=>Store.data.learn.mastery['spelling-3'].rain.spell.win===5));

  /* ---- custom sets edit in place; math is view-only ---- */
  await page.evaluate(()=>{ Store.addCustomCurriculum({ name:'Week 7', subject:'spelling', tiers:[{name:'Week 7', words:['beautiful','enough']}] }); });
  await tapSel('#bank-back'); await page.waitForTimeout(250);
  const cid = await page.evaluate(()=>Store.family.custom[0].id);
  ck('custom ids now carry a random component', /^c[0-9a-z]{8,}$/.test(cid), cid);
  await tapSel("[data-open='"+cid+"']"); await page.waitForTimeout(300);
  await tapSel("[data-add='0|spelling']"); await page.waitForTimeout(200);
  await page.fill("[data-form] [data-f='word']", 'February'); await tapSel('[data-fsave]'); await page.waitForTimeout(250);
  ck('a custom set edits in place (no override created)', await page.evaluate(c=>Store.family.custom[0].tiers[0].words.includes('February') && !Store.isOverridden(c), cid));
  await tapSel('#bank-back'); await page.waitForTimeout(250);
  await tapSel("[data-open='math-3']"); await page.waitForTimeout(300);
  ck('math shows its recipes read-only', /recipes/.test(await page.textContent('#overlay-card')) && !(await page.$('[data-add]')));
  await tapSel('#bank-back'); await page.waitForTimeout(250);

  /* ---- Assignments: on/off remembers weight ---- */
  await tapSel(".pr-tab[data-tab='assign']"); await page.waitForTimeout(250);
  await tapSel("[data-inc='reading-3']"); await tapSel("[data-inc='reading-3']");
  const w1 = await page.evaluate(()=>Store.assignmentsFor(Store.family.profiles[0].id).find(a=>a.cid==='reading-3').weight);
  await tapSel("[data-tog='reading-3']");
  const off = await page.evaluate(()=>Store.assignmentsFor(Store.family.profiles[0].id).find(a=>a.cid==='reading-3'));
  ck('switching a set off keeps its weight', off.enabled===false && off.weight===w1, JSON.stringify(off));
  await tapSel("[data-tog='reading-3']");
  ck('switching it back on resumes at the same weight', await page.evaluate(w=>{const a=Store.assignmentsFor(Store.family.profiles[0].id).find(a=>a.cid==='reading-3'); return a.enabled && a.weight===w;}, w1));
  ck('weight never drops below 1', await (async()=>{ for(let i=0;i<8;i++) await tapSel("[data-dec='reading-3']"); return await page.evaluate(()=>Store.assignmentsFor(Store.family.profiles[0].id).find(a=>a.cid==='reading-3').weight===1); })());
  ck('the mastery on the disabled/re-enabled set was never touched', await page.evaluate(()=>!!Store.data.learn.mastery['spelling-3'].rain));

  console.log('page errors:', errs.length?errs:'none');
  const bad=R.filter(r=>!r.ok);
  console.log('\n'+(bad.length?'FAILURES: '+bad.map(r=>r.n).join(' | '):'ALL '+R.length+' EDITOR CHECKS PASSED'));
  await browser.close();
  process.exit(bad.length||errs.length?1:0);
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
