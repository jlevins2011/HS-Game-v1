/* Cloudcap glider: appears at the Tinker Bench, holding ⬆️ while falling
   floats instead of drops, releasing stops it, and nothing changes for a
   child who hasn't crafted one. */
const pw = require('playwright-core');
(async () => {
  const browser = await pw.chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:true,
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{width:1180,height:820}, hasTouch:true, isMobile:true });
  const page = await ctx.newPage();
  const errs=[]; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(()=>{const s={speaking:false,pending:false,getVoices:()=>[],speak(u){setTimeout(()=>u.onstart&&u.onstart(),5);setTimeout(()=>u.onend&&u.onend(),20);},cancel(){},pause(){},resume(){}};Object.defineProperty(window,'speechSynthesis',{value:s,configurable:true});window.SpeechSynthesisUtterance=function(t){this.text=t;};});
  const cdp = await ctx.newCDPSession(page);
  const T=async(t,p)=>cdp.send('Input.dispatchTouchEvent',{type:t,touchPoints:p});
  const tap=async(x,y)=>{await T('touchStart',[{x,y,id:1}]);await page.waitForTimeout(60);await T('touchEnd',[]);await page.waitForTimeout(180);};
  const tapSel=async s=>{const el=await page.$(s);if(!el)return false;const b=await el.boundingBox();if(!b)return false;await tap(b.x+b.width/2,b.y+b.height/2);return true;};
  const R=[]; const ck=(n,ok,d)=>{R.push({n,ok});console.log((ok?'PASS  ':'FAIL  ')+n+'   '+(d===undefined?'':d));};

  await page.goto('http://localhost:8905/index.html',{waitUntil:'load'});
  await page.waitForTimeout(1200);
  const btns=await page.$$('#player-buttons button'); const nb=await btns[btns.length-1].boundingBox();
  await tap(nb.x+nb.width/2,nb.y+nb.height/2); await page.waitForTimeout(300);
  await page.fill('#ne-name','Sky'); await tapSel('#ne-go'); await page.waitForTimeout(350); await tapSel('#ho-skip'); await page.waitForTimeout(2800);

  // a fall from high up, measured over one second before the ground arrives, with and without the cap
  const drop = async (cap, hold) => {
    // lift them into the sky first, THEN press ⬆️ — pressing while still
    // flagged as standing would fire a jump and muddy the measurement
    await page.evaluate(o=>{ Store.data.player.tools.cloudcap = o.cap; Player.jump = false; Player.position.set(Player.position.x, 90, Player.position.z); }, { cap, hold });
    await page.waitForTimeout(150);
    await page.evaluate(o=>{ Player.jump = o.hold; }, { cap, hold });
    await page.waitForTimeout(500);
    const a = await page.evaluate(()=>Player.position.y); await page.waitForTimeout(1000);
    const b = await page.evaluate(()=>Player.position.y);
    const g = await page.evaluate(()=>Player.gliding);
    await page.evaluate(()=>{ Player.jump = false; });
    return { perSec: a-b, gliding: g };
  };
  // Physics time is clamped per frame (dt <= 0.05), so on a slow headless GPU
  // a wall-clock second is less than a simulated second. Compare the falls
  // to each other rather than to absolute numbers.
  const plain = await drop(false, true);
  const cap = await drop(true, true);
  const rel = await drop(true, false);
  ck('with a Cloudcap, holding ⬆️ while falling glides', cap.gliding===true && cap.perSec > 0.3, cap.perSec.toFixed(2)+' blocks/s');
  ck('without a Cloudcap, holding ⬆️ while falling just falls (at least 3× faster than the glide)', plain.gliding===false && plain.perSec > 3*cap.perSec, plain.perSec.toFixed(1)+' vs '+cap.perSec.toFixed(2)+' blocks/s');
  ck('with a Cloudcap but ⬆️ released, it is a normal fall', rel.gliding===false && rel.perSec > 3*cap.perSec, rel.perSec.toFixed(1)+' blocks/s');

  // live: hold the real jump button mid-air and watch the glyph
  await page.evaluate(()=>{ Store.data.player.tools.cloudcap = true; Player.position.set(Player.position.x, 34, Player.position.z); });
  const jb = await (await page.$('#btn-jump')).boundingBox();
  await T('touchStart',[{x:jb.x+jb.width/2,y:jb.y+jb.height/2,id:7}]);
  await page.waitForTimeout(900);
  const midGlyph = await page.textContent('#btn-jump'); const midGlide = await page.evaluate(()=>Player.gliding);
  await T('touchEnd',[]); await page.waitForTimeout(250);
  ck('holding the real ⬆️ button glides and swaps the glyph to 🪂', midGlide===true && midGlyph==='🪂', midGlyph);
  ck('releasing swaps it back', (await page.textContent('#btn-jump'))==='⬆️');
  ck('first glide shows the one-time hint', /gliding/i.test(await page.textContent('#toast')));
  await page.evaluate(()=>{ Player.position.set(Terrain.CX, 14, Terrain.CZ); }); await page.waitForTimeout(800);

  // the recipe lives at the Tinker Bench and needs a word challenge like every tool
  await page.evaluate(()=>{ Store.data.player.tools.cloudcap = false; Store.data.player.inventory.fluff = 4; Store.data.player.inventory.feather = 2; Store.data.player.inventory.timber = 5; UI.updateHotbar(); UI.showWorkshop(); });
  await page.waitForTimeout(300);
  const ws = await page.textContent('#overlay-card');
  ck('Cloudcap is offered at the Tinker Bench when you have fluff, feathers and timber', /cloudcap/i.test(ws) && /GLIDE/.test(ws));
  ck('it is listed as a tool that needs a word challenge', /cloudcap[^\n]*word challenge/i.test(ws));
  await page.evaluate(()=>UI.closeOverlay());
  ck('the satchel names it once earned', await page.evaluate(()=>{ Store.data.player.tools.cloudcap = true; UI.showInventory(); const t=/Cloudcap/.test(document.getElementById('overlay-card').textContent); UI.closeOverlay(); return t; }));

  // the bench must appear from gathering alone, and on a fresh load with materials already in the satchel
  await page.evaluate(()=>{ const p=Store.data.player; p.tools.cloudcap=false; p.toolTier=0; p.tools.hatchet=true; p.tools.brush=true; p.inventory={}; UI.updateHotbar(); });
  await page.evaluate(()=>{ Game.grantItem('fluff',4); Game.grantItem('feather',2); Game.grantItem('timber',2); });
  ck('gathering the last material lights up TINKER! without any other action',
     await page.evaluate(()=>getComputedStyle(document.getElementById('btn-craft')).display==='block' && document.getElementById('btn-craft').textContent==='🔧 TINKER!'));
  await page.evaluate(()=>{ Store.saveNow(); });
  await page.reload({waitUntil:'load'}); await page.waitForTimeout(1200);
  const pb=(await page.$$('#player-buttons button'))[0]; const pbb=await pb.boundingBox(); await tap(pbb.x+pbb.width/2,pbb.y+pbb.height/2); await page.waitForTimeout(2800);
  ck('after a reload the bench is visible immediately, before gathering anything',
     await page.evaluate(()=>getComputedStyle(document.getElementById('btn-craft')).display==='block'));

  console.log('page errors:', errs.length?errs:'none');
  const bad=R.filter(r=>!r.ok);
  console.log('\n'+(bad.length?'FAILURES: '+bad.map(r=>r.n).join(' | '):'ALL '+R.length+' GLIDER CHECKS PASSED'));
  await browser.close();
  process.exit(bad.length||errs.length?1:0);
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
