/* Letter pronunciation table + the Voice check screen. */
const pw = require('playwright-core');
(async () => {
  const browser = await pw.chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:true,
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{width:1180,height:820}, hasTouch:true, isMobile:true,
    userAgent:'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  const page = await ctx.newPage();
  const errs=[]; page.on('pageerror', e => errs.push(e.message));
  // A faithful speech-engine model: utterances QUEUE and play one at a time,
  // and cancel() throws away everything queued (so a cancelled utterance is
  // never heard). Both matter for what this test is checking.
  await page.addInitScript(() => {
    const heard = []; window.__heard = heard;
    let q = [], timer = null;
    const synth = {
      speaking: false, pending: false, paused: false,
      getVoices: () => [{ name: 'Samantha', lang: 'en-US' }, { name: 'Daniel', lang: 'en-GB' }],
      speak(u) { q.push(u); synth.pending = q.length > 1; pump(); },
      cancel() { clearTimeout(timer); timer = null; q = []; synth.speaking = false; synth.pending = false; },
      pause() {}, resume() {}
    };
    function pump() {
      if (timer || !q.length) return;
      const u = q[0];
      synth.speaking = true;
      timer = setTimeout(() => {
        heard.push(String(u.text || ''));
        if (u.onstart) u.onstart();
        timer = setTimeout(() => {
          timer = null; q.shift();
          synth.pending = q.length > 1;
          if (u.onend) u.onend();
          if (!q.length) synth.speaking = false;
          pump();
        }, 25);
      }, 5);
    }
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  });

  const cdp = await ctx.newCDPSession(page);
  const T=async(t,p)=>cdp.send('Input.dispatchTouchEvent',{type:t,touchPoints:p});
  const tap=async(x,y)=>{await T('touchStart',[{x,y,id:1}]);await page.waitForTimeout(50);await T('touchEnd',[]);await page.waitForTimeout(140);};
  const tapSel=async s=>{const el=await page.$(s);if(!el){console.log('MISSING '+s);return false;}
    try{await el.scrollIntoViewIfNeeded();}catch(e){}await page.waitForTimeout(80);
    const b=await el.boundingBox();if(!b)return false;await tap(b.x+b.width/2,b.y+b.height/2);return true;};
  const R=[]; const ck=(n,ok,d)=>{R.push({n,ok});console.log((ok?'PASS  ':'FAIL  ')+n+'   '+(d===undefined?'':d));};
  const heard=()=>page.evaluate(()=>window.__heard.slice());
  const reset=()=>page.evaluate(()=>{window.__heard.length=0;});

  await page.goto('http://localhost:8905/index.html',{waitUntil:'load'});
  await page.waitForTimeout(1200);
  console.log('version:', (await page.textContent('#home-version')||'').trim());

  /* ---- the table itself, before any UI ---- */
  const table = await page.evaluate(()=>{
    const out={};
    "abcdefghijklmnopqrstuvwxyz".split("").forEach(c=>out[c]=GameAudio.letterSpelling(c));
    return out;
  });
  ck('every letter has an explicit spelling',
     Object.keys(table).length===26 && Object.values(table).every(v=>v && v.length>0),
     JSON.stringify(table.a)+' '+JSON.stringify(table.u)+' '+JSON.stringify(table.w));
  ck('no letter is left as a bare single character',
     !Object.entries(table).some(([k,v])=>v===k),
     Object.entries(table).filter(([k,v])=>v===k).map(([k])=>k).join(',')||'none bare');

  await reset();
  for (const c of "abcdefghijklmnopqrstuvwxyz") {
    await page.evaluate(ch=>GameAudio.sayLetter(ch), c);
    await page.waitForTimeout(45);
  }
  await page.waitForTimeout(500);
  const spoken = await heard();
  ck('sayLetter speaks the respelling for all 26 letters',
     spoken.length===26 && spoken[0]!=='a' && spoken[20]==='you' && spoken[24]==='why',
     spoken.length+' spoken · '+JSON.stringify(spoken.slice(0,4))+' … u='+JSON.stringify(spoken[20]));

  // a child tapping tiles fast must hear every letter, not just the last
  await reset();
  await page.evaluate(()=>{ ['b','a','t'].forEach(c=>GameAudio.sayLetter(c)); });
  await page.waitForTimeout(600);
  const fast = await heard();
  ck('rapid letter taps queue instead of cancelling each other',
     fast.length===3, JSON.stringify(fast));

  // the speaker button must still interrupt, not queue
  await reset();
  await page.evaluate(()=>{ GameAudio.say('first word'); GameAudio.say('second word'); });
  await page.waitForTimeout(600);
  // On iPad a silent priming utterance takes the slot WebKit eats after
  // cancel(), so ignore blank ones and look at the real words.
  const btn = (await heard()).filter(t=>t.trim());
  ck('a repeated 🔊 tap still interrupts rather than queueing',
     btn.length===1 && btn[0]==='second word', JSON.stringify(await heard()));

  /* ---- lone letters in content route through the table too ---- */
  await reset();
  await page.evaluate(()=>{ GameAudio.say('a'); });
  await page.waitForTimeout(300);
  const loneA = await heard();
  ck('a lone-letter sight word is spoken as a letter name, not the article',
     loneA.length===1 && loneA[0]!=='a', JSON.stringify(loneA));
  await reset();
  await page.evaluate(()=>{ GameAudio.say('apple'); });
  await page.waitForTimeout(300);
  ck('real words are untouched', (await heard())[0]==='apple');

  /* ---- overrides ---- */
  const applied = await page.evaluate(()=>{ GameAudio.setLetterSpelling('a','eigh'); return GameAudio.letterSpelling('a'); });
  ck('an override takes effect', applied==='eigh', applied);
  await reset(); await page.evaluate(()=>GameAudio.sayLetter('a')); await page.waitForTimeout(250);
  ck('the override is what actually gets spoken', (await heard())[0]==='eigh');
  ck('the override persists to this device only',
     await page.evaluate(()=>JSON.parse(localStorage.getItem('lumen_voice_v1')).letters.a==='eigh'));
  ck('it is NOT in the family backup (voices differ per device)',
     !(await page.evaluate(()=>Store.exportAll().indexOf('eigh')>=0)));
  const back = await page.evaluate(()=>{ GameAudio.resetLetterSpellings(); return GameAudio.letterSpelling('a'); });
  ck('reset restores the default', back===(await page.evaluate(()=>CONFIG.SPEECH.letters.a)), back);

  /* ---- the Voice check screen ---- */
  const btns=await page.$$('#player-buttons button');
  const nb=await btns[btns.length-1].boundingBox();
  await tap(nb.x+nb.width/2,nb.y+nb.height/2); await page.waitForTimeout(300);
  await page.fill('#ne-name','Voice'); await tapSel('#ne-go'); await page.waitForTimeout(2600);
  await page.evaluate(()=>{Game.stop();UI.closeOverlay();UI.showHome();}); await page.waitForTimeout(400);
  await page.evaluate(()=>{ Parent.show(); document.getElementById('overlay').dispatchEvent(new Event('pointerdown')); });
  await page.waitForTimeout(300);
  await tapSel(".pr-tab[data-tab='reports']"); await page.waitForTimeout(250);

  ck('Voice check section renders', !!(await page.$('[data-vcl="a"]')));
  const who = await page.textContent('#overlay-card');
  ck('it names the voice actually in use', /Samantha/.test(who), (who.match(/Using[^·]*/)||[''])[0].trim().slice(0,40));

  await reset();
  await tapSel('[data-vcl="a"]');
  await page.waitForTimeout(300);
  ck('tapping a letter speaks it', (await heard()).length>0, JSON.stringify(await heard()));
  ck('alternates appear for that letter', (await page.$$('[data-vca]')).length>1,
     JSON.stringify(await page.evaluate(()=>Array.from(document.querySelectorAll('[data-vca]')).map(e=>e.textContent))));

  const alts = await page.$$('[data-vca]');
  const ab = await alts[1].boundingBox();
  await reset();
  await tap(ab.x+ab.width/2, ab.y+ab.height/2);
  await page.waitForTimeout(300);
  const picked = await page.evaluate(()=>GameAudio.letterSpelling('a'));
  ck('picking an alternate saves it and speaks it',
     picked!==(await page.evaluate(()=>CONFIG.SPEECH.letters.a)) && (await heard()).indexOf(picked)>=0,
     picked+' heard='+JSON.stringify(await heard()));
  ck('the picked alternate shows as active',
     await page.evaluate(()=>{const e=document.querySelector('.vc-alt.active');return !!e;}));

  await reset();
  await tapSel('[data-vcw]'); await page.waitForTimeout(300);
  ck('tricky words are speakable', (await heard()).length>0, JSON.stringify(await heard()));

  const emailBefore = 'keep@me.test';
  await page.fill('#pr-email-input', emailBefore);
  await tapSel('[data-vcl="g"]'); await page.waitForTimeout(250);
  ck('using Voice check does not wipe what you typed above it',
     (await page.inputValue('#pr-email-input'))===emailBefore);

  await tapSel('#vc-reset');
  ck('one tap on reset does nothing', await page.evaluate(()=>GameAudio.letterSpelling('a'))!==
     (await page.evaluate(()=>CONFIG.SPEECH.letters.a)));
  await tapSel('#vc-reset'); await page.waitForTimeout(200);
  ck('two taps reset to defaults', await page.evaluate(()=>GameAudio.letterSpelling('a'))===
     (await page.evaluate(()=>CONFIG.SPEECH.letters.a)));

  console.log('page errors:', errs.length?errs:'none');
  const bad = R.filter(r=>!r.ok);
  console.log('\n'+(bad.length?'FAILURES: '+bad.map(r=>r.n).join(' | '):'ALL '+R.length+' CHECKS PASSED'));
  await browser.close();
  process.exit(bad.length||errs.length?1:0);
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
