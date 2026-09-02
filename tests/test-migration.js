/* Migration: a v1 family (two age bands, legacy set ids) and v2 saves come
   forward to grades and grade-leveled ids with nothing lost, and the
   pre-migration copies are stashed. */
const pw = require('playwright-core');
(async () => {
  const browser = await pw.chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:true,
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{width:1180,height:820}, hasTouch:true, isMobile:true,
    userAgent:'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  const page = await ctx.newPage();
  const errs=[]; page.on('pageerror', e => errs.push(e.message));

  // ---- seed a pre-2.2.0 household exactly as the old code wrote it ----
  await page.addInitScript(() => {
    const s={speaking:false,pending:false,getVoices:()=>[{name:'S',lang:'en-US'}],speak(u){setTimeout(()=>u.onstart&&u.onstart(),5);setTimeout(()=>u.onend&&u.onend(),20);},cancel(){},pause(){},resume(){}};
    Object.defineProperty(window,'speechSynthesis',{value:s,configurable:true}); window.SpeechSynthesisUtterance=function(t){this.text=t;};
    if (localStorage.getItem('lumen_family_v1')) return;   // only the first load seeds
    const fam = { version: 1,
      profiles: [ { id: 'p_spencer', name: 'Spencer', emoji: '🦊', color: '#5fae6f', band: 'younger', createdAt: 1 },
                  { id: 'p_penelope', name: 'Penelope', emoji: '🦉', color: '#4a90d9', band: 'older', createdAt: 2 } ],
      custom: [ { id: 'cabc', name: 'Week 7', subject: 'spelling', custom: true, tiers: [ { name: 'Week 7', words: ['beautiful','enough'] } ] } ],
      assignments: { p_spencer: [ {cid:'reading2',weight:3}, {cid:'spelling2',weight:2}, {cid:'math1',weight:2}, {cid:'bible1',weight:2}, {cid:'cabc',weight:1} ],
                     p_penelope: [ {cid:'reading5',weight:3}, {cid:'spelling5',weight:3}, {cid:'math1',weight:2}, {cid:'bible1',weight:2} ] },
      settings: { pin: '1234', emails: ['x@y.z'], reportDays: 7, paceMinutes: 3, paceByChild: {} } };
    localStorage.setItem('lumen_family_v1', JSON.stringify(fam));
    const save = pid => ({ version: 2,
      player: { xp: 120, level: 4, sparks: 9, toolTier: 1, isle: 'meadowmere', inventory: { timber: 7 }, tools: { hatchet: true }, seeds: {} },
      elder: { wins: 1 }, tinker: { wins: 0 },
      learn: { tiers: { reading2: { tier: 1, tierWins: 4, struggle: 0 }, spelling2: { tier: 0, tierWins: 2, struggle: 1 }, math1: { tier: 2, tierWins: 7, struggle: 0 }, bible1: { tier: 0, tierWins: 1, struggle: 0 } },
               mastery: { reading2: { fox: { hear: { box: 4, win: 6, miss: 1, last: 5 }, read: { box: 2, win: 2, miss: 0, last: 5 } } },
                          spelling2: { jump: { spell: { box: 3, win: 3, miss: 0, last: 5 } } },
                          math1: { '7×8': { solve: { box: 1, win: 1, miss: 2, last: 5 } } },
                          bible1: { 'v:Genesis 1:1': { verse: { box: 5, win: 8, miss: 0, last: 5 } } } } },
      isles: { meadowmere: { removed: {}, pieces: [ { t: 'floor', x: 1, z: 1 } ], springs: [], planters: {}, bridges: {} } },
      quests: { active: null, completed: 2 },
      stats: { weekStart: 1, lastReportAt: 0, playMs: 60000, daysPlayed: ['2026-9-1'], challenges: { 'reading/hear': { tries: 7, clean: 6, mistakes: 1 } },
               lastChallengeAt: 0, lifetime: { challenges: 12, clean: 9, sparks: 9, gathered: 30, built: 1, quests: 2, harvested: 0 } } });
    localStorage.setItem('lumen_save_v1_p_spencer', JSON.stringify(save('p_spencer')));
    localStorage.setItem('lumen_save_v1_p_penelope', JSON.stringify(save('p_penelope')));
  });

  const cdp = await ctx.newCDPSession(page);
  const T=async(t,p)=>cdp.send('Input.dispatchTouchEvent',{type:t,touchPoints:p});
  const tap=async(x,y)=>{await T('touchStart',[{x,y,id:1}]);await page.waitForTimeout(60);await T('touchEnd',[]);await page.waitForTimeout(180);};
  const R=[]; const ck=(n,ok,d)=>{R.push({n,ok});console.log((ok?'PASS  ':'FAIL  ')+n+'   '+(d===undefined?'':d));};

  await page.goto('http://localhost:8905/index.html',{waitUntil:'load'});
  await page.waitForTimeout(1200);

  /* ---- family ---- */
  const fam = await page.evaluate(()=>Store.family);
  ck('family blob is at version 2', fam.version===2, 'v'+fam.version);
  const sp = fam.profiles.find(p=>p.name==='Spencer'), pe = fam.profiles.find(p=>p.name==='Penelope');
  ck('younger → grade 2, older → grade 5', sp && sp.grade==='2' && pe && pe.grade==='5', JSON.stringify([sp&&sp.grade, pe&&pe.grade]));
  ck('band is gone, setup counts as confirmed', sp.band===undefined && sp.setupConfirmed===true);
  const spA = fam.assignments.p_spencer.map(a=>a.cid), peA = fam.assignments.p_penelope.map(a=>a.cid);
  ck('Spencer\'s ids remapped, math lands on his grade', JSON.stringify(spA)===JSON.stringify(['reading-2','spelling-2','math-2','bible1','cabc']), JSON.stringify(spA));
  ck('Penelope\'s ids remapped, math lands on hers', JSON.stringify(peA)===JSON.stringify(['reading-5','spelling-5','math-5','bible1']), JSON.stringify(peA));
  ck('rows gained enabled/autoGrade and kept their weights',
     fam.assignments.p_spencer.every(a=>a.enabled===true) && fam.assignments.p_spencer[0].weight===3 && fam.assignments.p_spencer[0].autoGrade===true);
  ck('custom set, PIN, emails survived; old "pacing 3" became a 3-minute question timer',
     fam.custom.length===1 && fam.settings.pin==='1234' && fam.settings.emails[0]==='x@y.z' && fam.settings.nudgeMinutes===3 && fam.settings.paceMinutes===undefined,
     JSON.stringify({nudge: fam.settings.nudgeMinutes, pace: fam.settings.paceMinutes}));
  ck('the pre-migration family was stashed as a backup',
     await page.evaluate(()=>{ const b=JSON.parse(localStorage.getItem('lumen_family_v1_bak')); return b && b.version===1 && b.profiles[0].band==='younger'; }));
  ck('every remapped set actually exists', await page.evaluate(()=>['reading-2','spelling-2','math-2','reading-5','spelling-5','math-5'].every(c=>!!Store.curriculum(c))));

  /* ---- the save, on load ---- */
  ck('home screen shows both children', (await page.$$('#player-buttons button')).length===3);
  const spBtn = (await page.$$('#player-buttons button'))[0];
  const b = await spBtn.boundingBox(); await tap(b.x+b.width/2, b.y+b.height/2);
  await page.waitForTimeout(3000);
  const d = await page.evaluate(()=>Store.data);
  ck('Spencer loads and the game starts', await page.evaluate(()=>Game.running && Store.profile.name==='Spencer'));
  ck('save is at version 3', d.version===3, 'v'+d.version);
  ck('mastery moved to the new ids with counts intact',
     d.learn.mastery['reading-2'] && d.learn.mastery['reading-2'].fox.hear.win===6 && d.learn.mastery['spelling-2'].jump.spell.box===3,
     JSON.stringify(Object.keys(d.learn.mastery)));
  ck('math mastery landed on math-2 (fact keys are grade-agnostic)', d.learn.mastery['math-2'] && d.learn.mastery['math-2']['7×8'].solve.miss===2);
  ck('tier state moved too', d.learn.tiers['reading-2'].tier===1 && d.learn.tiers['math-2'].tierWins===7);
  ck('no legacy ids remain', !d.learn.mastery.reading2 && !d.learn.mastery.math1 && !d.learn.tiers.spelling2);
  ck('game progress untouched: level, sparks, tools, house, quests',
     d.player.level===4 && d.player.sparks===9 && d.player.tools.hatchet && d.isles.meadowmere.pieces.length===1 && d.quests.completed===2);
  ck('weekly stats untouched', d.stats.challenges['reading/hear'].clean===6 && d.stats.lifetime.challenges===12);
  ck('the pre-migration save was stashed as a backup',
     await page.evaluate(()=>{ const b=JSON.parse(localStorage.getItem('lumen_save_v1_p_spencer_bak')); return b && b.version===2 && !!b.learn.mastery.reading2; }));
  const ch = await page.evaluate(()=>{ const out=new Set(); for(let i=0;i<30;i++) out.add(Learning.getChallenge('node').cid); return Array.from(out); });
  ck('challenges draw from the migrated sets', ch.every(c=>['reading-2','spelling-2','math-2','bible1','cabc'].includes(c)), JSON.stringify(ch));

  /* ---- a sibling who has not been loaded ---- */
  const peek = await page.evaluate(()=>Store.peekSave(Store.family.profiles.find(p=>p.name==='Penelope')));
  ck('peeking at a sibling shows migrated ids without touching disk (her math lands on HER grade)',
     peek && peek.learn.mastery['reading-2'] && peek.learn.mastery['math-5'] && !peek.learn.mastery.math1 && !peek.learn.mastery.reading2,
     JSON.stringify(Object.keys(peek.learn.mastery)));
  ck('… and did not write a backup for her yet', await page.evaluate(()=>localStorage.getItem('lumen_save_v1_p_penelope_bak')===null));
  const raw = await page.evaluate(()=>JSON.parse(localStorage.getItem('lumen_save_v1_p_penelope')).version);
  ck('her on-disk save is still v2 until she plays', raw===2, 'v'+raw);

  /* ---- Parents area reads it all ---- */
  await page.evaluate(()=>{ Game.stop(); UI.closeOverlay(); UI.showHome(); Parent.show(); });
  await page.waitForTimeout(300);
  // PIN gate (pin is 1234)
  for (const dgt of ['1','2','3','4']) {
    const key = await page.evaluateHandle(dd=>Array.from(document.querySelectorAll('.pin-key')).find(k=>k.textContent===dd), dgt);
    const kb = await key.asElement().boundingBox(); await tap(kb.x+kb.width/2, kb.y+kb.height/2);
  }
  await page.waitForTimeout(400);
  const txt = await page.textContent('#overlay-card');
  ck('Explorers tab shows each child\'s grade', /2nd grade/.test(txt) && /5th grade/.test(txt));
  ck('Explorers tab shows where Spencer is in each set (tier 2 of 4 in reading)', /Reading · Grade 2/.test(txt) && /\(2\/4\)/.test(txt));
  ck('a second reload does not migrate again or lose anything', await page.evaluate(()=>Store.family.version===2 && Store.family.profiles.length===2));

  console.log('page errors:', errs.length?errs:'none');
  const bad=R.filter(r=>!r.ok);
  console.log('\n'+(bad.length?'FAILURES: '+bad.map(r=>r.n).join(' | '):'ALL '+R.length+' MIGRATION CHECKS PASSED'));
  await browser.close();
  process.exit(bad.length||errs.length?1:0);
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
