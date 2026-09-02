/* The Skydock balloon: walk up the ramp into the basket, tap the balloon —
   with a Cloudcap it climbs high and carries you; jump out and it comes back
   down while you glide. Without a Cloudcap it just hops. */
const pw = require('playwright-core');
(async () => {
  const browser = await pw.chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:true,
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{width:1180,height:820}, hasTouch:true, isMobile:true });
  const page = await ctx.newPage();
  const errs=[]; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(()=>{const s={speaking:false,pending:false,getVoices:()=>[],speak(u){setTimeout(()=>u.onstart&&u.onstart(),5);setTimeout(()=>u.onend&&u.onend(),20);},cancel(){},pause(){},resume(){}};Object.defineProperty(window,'speechSynthesis',{value:s,configurable:true});window.SpeechSynthesisUtterance=function(t){this.text=t;};});
  const R=[]; const ck=(n,ok,d)=>{R.push({n,ok});console.log((ok?'PASS  ':'FAIL  ')+n+'   '+(d===undefined?'':d));};
  const ship = () => page.evaluate(()=>{ const o=Objects.dynamicByType('airship')[0]; return { state:o.state, lift:+o.lift.toFixed(2), y:+o.y.toFixed(2), base:o.base, x:o.x, z:o.z }; });
  const me = () => page.evaluate(()=>({ x:+Player.position.x.toFixed(2), y:+Player.position.y.toFixed(2), z:+Player.position.z.toFixed(2), ground:Player.grounded, gliding:Player.gliding, aboard: Objects.aboard(Objects.dynamicByType('airship')[0], Player.position) }));
  const tapShip = () => page.evaluate(()=>{ const o=Objects.dynamicByType('airship')[0]; Objects.airshipTap(o, Player.position, !!Store.data.player.tools.cloudcap); });

  await page.goto('http://localhost:8905/index.html',{waitUntil:'load'});
  await page.waitForTimeout(1200);
  await page.evaluate(()=>{ const p=Store.addProfile({name:'Pilot',grade:'2',setupConfirmed:true}); Store.load(p); Store.data.player.tools.skybadge=true; Game.start(); Game.travelTo('skydock'); });
  await page.waitForTimeout(2500);

  const s0 = await ship();
  ck('the balloon is a real object at the end of the dock', s0.state==='docked' && s0.lift===0 && s0.z===Terrain_CZ(s0)+42, JSON.stringify(s0));
  function Terrain_CZ(s){ return s.z-42; }

  /* ---- walk up the ramp into the basket ---- */
  await page.evaluate(()=>{ const o=Objects.dynamicByType('airship')[0]; Player.spawnAt(o.x, o.z-14, Math.PI); });   // yaw π faces +z, toward the ship
  await page.waitForTimeout(300);
  const before = await me();
  // walk forward until aboard (headless sim time runs slower than the wall clock)
  await page.evaluate(()=>{ Player.move.z = 1; });
  for (let i=0;i<40;i++){ await page.waitForTimeout(250); const m=await me(); if (m.aboard && m.z > s0.z - 5.5) break; }
  await page.evaluate(()=>{ Player.move.z = 0; });
  await page.waitForTimeout(300);
  const onDeck = await me();
  ck('walking forward climbs the ramp onto the deck (about 2 blocks up)', onDeck.aboard && onDeck.y > before.y + 1.5 && onDeck.ground, JSON.stringify({before, onDeck}));
  ck('the prompt says to tap the balloon', await page.evaluate(()=>{ const o=Objects.dynamicByType('airship')[0]; return /lift off/.test(Objects.airshipLabel(o, Player.position)); }));

  /* ---- no Cloudcap: just a hop ---- */
  await page.evaluate(()=>{ Store.data.player.tools.cloudcap = false; });
  await tapShip(); await page.waitForTimeout(1600);
  const hop = await ship(); const hopMe = await me();
  ck('without a Cloudcap the balloon only hops (a few blocks, not the sky)', hop.lift > 1 && hop.lift <= 4.5 && hopMe.y > onDeck.y + 0.8, JSON.stringify({hop, y: hopMe.y}));
  ck('the rider is lifted with it', hopMe.aboard && hopMe.ground, JSON.stringify(hopMe));
  ck('the hint mentions the Cloudcap', /Cloudcap/.test(await page.textContent('#toast')));
  await page.waitForTimeout(3500);
  const landed = await ship();
  ck('… and it settles back on the dock by itself', landed.state==='docked' && landed.lift===0, JSON.stringify(landed));

  /* ---- with a Cloudcap: up to the clouds ---- */
  await page.evaluate(()=>{ Store.data.player.tools.cloudcap = true; });
  const xp0 = await page.evaluate(()=>Store.data.player.xp + Store.data.player.level*1000);
  await tapShip(); await page.waitForTimeout(4000);
  const mid = await ship(); const midMe = await me();
  ck('with a Cloudcap it climbs (past the hop height, still going)', mid.state==='rising' && mid.lift > 4.5, JSON.stringify(mid));
  ck('the rider rises with the deck under their feet', midMe.aboard && midMe.ground && Math.abs(midMe.y - (mid.y + 2)) < 0.6, JSON.stringify({ship: mid.y+2, me: midMe.y}));
  ck('first flight is rewarded', (await page.evaluate(()=>Store.data.player.xp + Store.data.player.level*1000)) > xp0);
  // let it reach the top (48 blocks at 3.6/s ≈ 13s of sim time; the loop may run slow headless, so poll)
  let top = null;
  for (let i=0;i<40;i++){ await page.waitForTimeout(1000); top = await ship(); if (top.state==='aloft') break; }
  const topMe = await me();
  ck('it reaches the sky and hovers', top.state==='aloft' && top.lift >= 47, JSON.stringify(top));
  ck('the rider is still aboard at the top', topMe.aboard, JSON.stringify(topMe));
  ck('the prompt now says jump and glide', await page.evaluate(()=>{ const o=Objects.dynamicByType('airship')[0]; return /glide/.test(Objects.airshipLabel(o, Player.position)); }));

  /* ---- jump out: the balloon heads home, the child glides ---- */
  await page.evaluate(()=>{ Player.move.x = 1; Player.jump = true; });   // step sideways off the deck holding ⬆️
  await page.waitForTimeout(1800);
  await page.evaluate(()=>{ Player.move.x = 0; });
  const out = await me(); const shipAfter = await ship();
  ck('stepping off the deck leaves the basket', !out.aboard && !out.ground, JSON.stringify(out));
  ck('holding ⬆️ on the way out means gliding', out.gliding===true);
  ck('the balloon starts back down as soon as the rider is gone', shipAfter.state==='descending' && shipAfter.lift < top.lift, JSON.stringify(shipAfter));
  await page.evaluate(()=>{ Player.jump = false; });
  let home = null;
  for (let i=0;i<40;i++){ await page.waitForTimeout(1000); home = await ship(); if (home.state==='docked') break; }
  ck('… and lands back on the dock', home.state==='docked' && home.lift===0, JSON.stringify(home));
  const meHome = await me();
  ck('the child came down somewhere on the isle (not lost to the void)', meHome.y > 5 && meHome.y < 30, JSON.stringify(meHome));

  /* ---- tapping from the ground does nothing but hint ---- */
  await page.evaluate(()=>{ const o=Objects.dynamicByType('airship')[0]; Player.spawnAt(o.x+6, o.z, 0); });
  await page.waitForTimeout(300);
  await tapShip(); await page.waitForTimeout(300);
  ck('tapping from the ground says to climb aboard first', /hop into the basket/.test(await page.textContent('#toast')) && (await ship()).state==='docked');

  console.log('page errors:', errs.length?errs:'none');
  const bad=R.filter(r=>!r.ok);
  console.log('\n'+(bad.length?'FAILURES: '+bad.map(r=>r.n).join(' | '):'ALL '+R.length+' BALLOON CHECKS PASSED'));
  await browser.close();
  process.exit(bad.length||errs.length?1:0);
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
