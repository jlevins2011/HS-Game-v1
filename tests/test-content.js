/* Content lint: every built-in set × tier produces every challenge kind it
   should, every challenge is well-formed, picture emoji are unique within a
   tier, and the grade ladder is complete for K–5. */
const pw = require('playwright-core');
(async () => {
  const browser = await pw.chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:true,
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{width:1180,height:820}, hasTouch:true, isMobile:true });
  const page = await ctx.newPage();
  const errs=[]; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(()=>{const s={speaking:false,pending:false,getVoices:()=>[],speak(u){setTimeout(()=>u.onstart&&u.onstart(),5);setTimeout(()=>u.onend&&u.onend(),20);},cancel(){},pause(){},resume(){}};Object.defineProperty(window,'speechSynthesis',{value:s,configurable:true});window.SpeechSynthesisUtterance=function(t){this.text=t;};});
  const R=[]; const ck=(n,ok,d)=>{R.push({n,ok});console.log((ok?'PASS  ':'FAIL  ')+n+'   '+(d===undefined?'':d));};

  await page.goto('http://localhost:8905/index.html',{waitUntil:'load'});
  await page.waitForTimeout(1200);
  // a child with nothing assigned; each set is assigned in turn below
  await page.evaluate(()=>{ const p = Store.addProfile({ name:'Lint', grade:'3', setupConfirmed:true }); Store.load(p); CONFIG.LEARN.reviewChance = 0; });

  const ladder = await page.evaluate(()=>{
    const ids = Store.allCurricula().map(c=>c.id);
    const missing=[];
    ['reading','spelling','math'].forEach(s=>CONFIG.GRADES.forEach(g=>{ const id=Store.gradeSetId(s,g); if(!ids.includes(id)) missing.push(id); }));
    return { count: ids.length, missing };
  });
  ck('every graded subject has a set for every grade K–5', ladder.missing.length===0, ladder.count+' sets; missing: '+JSON.stringify(ladder.missing));

  const report = await page.evaluate(()=>{
    const out = [];
    const pid = Store.profile.id;
    function expectedKinds(cur, tier) {
      const s = cur.subject, k = new Set();
      const words = tier.words||[], pairs = tier.pairs||[];
      if (s==='reading') { k.add('hear'); if (words.some(w=>w&&w.emoji)) { k.add('read'); k.add('meaning'); } if (words.some(w=>w&&w.meaning)) k.add('meaningdef'); if ((tier.sentences||[]).length) k.add('sentence'); }
      if (s==='spelling') { k.add('spot'); k.add('spell'); }
      if (s==='vocab') { k.add('recognize'); k.add('recall'); k.add('spell'); if ((tier.sentences||[]).length) k.add('sentence'); }
      if (s==='bible'||s==='quiz') { if ((tier.verses||[]).length) { k.add('verseblank'); if (tier.verses.some(v=>v.text.split(/\s+/).length<=14)) k.add('versebuild'); } if ((tier.facts||[]).length) k.add('fact'); }
      if (s==='math') k.add('math');
      return k;
    }
    function wellFormed(ch) {
      const has = (arr, v) => Array.isArray(arr) && arr.some(x=>String(x)===String(v));
      const uniq = arr => new Set(arr.map(String)).size===arr.length;
      switch (ch.kind) {
        case 'hear': case 'spot': case 'meaning': case 'meaningdef': return has(ch.choices, ch.word) && uniq(ch.choices) && ch.choices.length>=3;
        case 'read': return ch.pictures.some(p=>p.emoji===ch.answer) && uniq(ch.pictures.map(p=>p.emoji)) && ch.pictures.length>=3;
        case 'sentence': return has(ch.choices, ch.answer) && uniq(ch.choices);
        case 'spell': { const L = ch.word.replace(/[^a-z]/g,''); const t = ch.tiles.slice(); return L.split('').every(c=>{ const i=t.indexOf(c); if(i<0) return false; t.splice(i,1); return true; }); }
        case 'recognize': return has(ch.choices, ch.front) && uniq(ch.choices);
        case 'recall': return has(ch.choices, ch.back) && uniq(ch.choices);
        case 'verseblank': return has(ch.choices, ch.answer) && uniq(ch.choices);
        case 'versebuild': return ch.words.join(' ')===ch.text;
        case 'fact': return has(ch.choices, ch.answer) && uniq(ch.choices);
        case 'math': return has(ch.choices, ch.answer) && uniq(ch.choices) && ch.choices.length===4;
        case 'speak': return !!ch.word;
      }
      return false;
    }
    Store.allCurricula().forEach(cur => {
      Store.family.assignments[pid] = [ { cid: cur.id, weight: 3, enabled: true, autoGrade: false } ];
      (cur.tiers||[]).forEach((tier, ti) => {
        Store.data.learn.tiers[cur.id] = { tier: ti, tierWins: 0, struggle: 0 };
        const want = expectedKinds(cur, tier), seen = new Set(); const bad = [];
        for (let i=0;i<220;i++) {
          const ch = Learning.getChallenge('node');
          if (!ch) { bad.push('null'); break; }
          if (ch.tier!==ti) bad.push('tier '+ch.tier);
          seen.add(ch.kind);
          if (!wellFormed(ch)) bad.push(ch.kind+':'+JSON.stringify(ch).slice(0,80));
        }
        const missing = Array.from(want).filter(k=>!seen.has(k));
        // picture emoji must be unique within the tier (read decoys are pictures)
        const em = (tier.words||[]).filter(w=>w&&w.emoji).map(w=>w.emoji);
        const dupes = em.filter((e,i)=>em.indexOf(e)!==i);
        // every sentence's answer must be among its choices
        const badSent = (tier.sentences||[]).filter(s=>!s.choices.includes(s.answer)).map(s=>s.text);
        out.push({ id: cur.id, tier: ti, name: tier.name, missing, bad: bad.slice(0,3), dupes, badSent,
                   items: (tier.words||[]).length + (tier.pairs||[]).length + (tier.verses||[]).length + (tier.facts||[]).length });
      });
    });
    return out;
  });

  let tiers = 0, problems = 0;
  report.forEach(r => {
    tiers++;
    const ok = !r.missing.length && !r.bad.length && !r.dupes.length && !r.badSent.length;
    if (!ok) { problems++; console.log('  ✗ '+r.id+' / '+r.name+'  missing='+JSON.stringify(r.missing)+' bad='+JSON.stringify(r.bad)+' dupeEmoji='+JSON.stringify(r.dupes)+' badSentences='+JSON.stringify(r.badSent)); }
  });
  ck('every tier of every set produces every expected kind, all well-formed, no duplicate emoji', problems===0, tiers+' tiers checked, '+problems+' with problems');
  ck('no tier is thin', report.every(r=>r.items>=8 || /^math/.test(r.id)), JSON.stringify(report.filter(r=>r.items<8 && !/^math/.test(r.id)).map(r=>r.id+'/'+r.name)));

  // say: passthrough from real content through the real builder
  const saySeen = await page.evaluate(()=>{
    const pid = Store.profile.id;
    Store.family.assignments[pid] = [ { cid: 'reading-1', weight: 3, enabled: true, autoGrade: false } ];
    Store.data.learn.tiers['reading-1'] = { tier: 2, tierWins: 0, struggle: 0 };
    for (let i=0;i<400;i++) { const ch = Learning.getChallenge('node'); if (ch.itemKey==='live') return ch.say; }
    return null;
  });
  ck('the built-in "live" carries say: "liv" into its challenge', saySeen==='liv', JSON.stringify(saySeen));

  // K–1 words display in their own case
  await page.evaluate(()=>Activities.present({kind:'read', cid:'reading-k', subject:'reading', skill:'read', itemKey:'cat', word:'cat', answer:'🐱', pictures:[{word:'cat',emoji:'🐱'},{word:'dog',emoji:'🐶'},{word:'sun',emoji:'☀️'}]}, function(){}, 'T'));
  await page.waitForTimeout(150);
  ck('the read card shows the word as written (lowercase for beginners)', (await page.textContent('.read-word')).trim()==='cat');
  await page.evaluate(()=>{ UI.closeOverlay(); Activities.present({kind:'read', cid:'reading-k', subject:'reading', skill:'read', itemKey:'i', word:'I', answer:'👀', pictures:[{word:'I',emoji:'👀'},{word:'dog',emoji:'🐶'},{word:'sun',emoji:'☀️'}]}, function(){}, 'T'); });
  await page.waitForTimeout(150);
  ck('… and "I" stays capitalized', (await page.textContent('.read-word')).trim()==='I');

  console.log('page errors:', errs.length?errs:'none');
  const bad=R.filter(r=>!r.ok);
  console.log('\n'+(bad.length?'FAILURES: '+bad.map(r=>r.n).join(' | '):'ALL '+R.length+' CONTENT CHECKS PASSED'));
  await browser.close();
  process.exit(bad.length||errs.length?1:0);
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
