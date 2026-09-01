/* Tap real letter tiles in a real spelling challenge and check what is said. */
const pw = require('playwright-core');
(async () => {
  const browser = await pw.chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:true,
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{width:1180,height:820}, hasTouch:true, isMobile:true,
    userAgent:'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  const page = await ctx.newPage();
  const errs=[]; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => {
    const heard=[]; window.__heard=heard;
    let q=[], timer=null;
    const synth={speaking:false,pending:false,paused:false,
      getVoices:()=>[{name:'Samantha',lang:'en-US'}],
      speak(u){q.push(u);synth.pending=q.length>1;pump();},
      cancel(){clearTimeout(timer);timer=null;q=[];synth.speaking=false;synth.pending=false;},
      pause(){},resume(){}};
    function pump(){ if(timer||!q.length)return; const u=q[0]; synth.speaking=true;
      timer=setTimeout(()=>{heard.push(String(u.text||''));if(u.onstart)u.onstart();
        timer=setTimeout(()=>{timer=null;q.shift();synth.pending=q.length>1;if(u.onend)u.onend();
          if(!q.length)synth.speaking=false;pump();},25);},5); }
    Object.defineProperty(window,'speechSynthesis',{value:synth,configurable:true});
    window.SpeechSynthesisUtterance=function(t){this.text=t;};
  });
  const cdp = await ctx.newCDPSession(page);
  const T=async(t,p)=>cdp.send('Input.dispatchTouchEvent',{type:t,touchPoints:p});
  const tap=async(x,y)=>{await T('touchStart',[{x,y,id:1}]);await page.waitForTimeout(50);await T('touchEnd',[]);await page.waitForTimeout(120);};
  const tapSel=async s=>{const el=await page.$(s);if(!el)return false;const b=await el.boundingBox();if(!b)return false;await tap(b.x+b.width/2,b.y+b.height/2);return true;};
  const R=[]; const ck=(n,ok,d)=>{R.push({n,ok});console.log((ok?'PASS  ':'FAIL  ')+n+'   '+(d===undefined?'':d));};

  await page.goto('http://localhost:8905/index.html',{waitUntil:'load'});
  await page.waitForTimeout(1200);
  const btns=await page.$$('#player-buttons button');
  const nb=await btns[btns.length-1].boundingBox();
  await tap(nb.x+nb.width/2,nb.y+nb.height/2); await page.waitForTimeout(300);
  await page.fill('#ne-name','Speller'); await tapSel('#ne-go'); await page.waitForTimeout(2800);

  // open a real spelling challenge through the real pipeline
  await page.evaluate(()=>{
    Activities.present({kind:'spell', cid:'spelling2', subject:'spelling', skill:'spell',
      itemKey:'bat', word:'bat', speakWord:'bat', tiles:['b','a','t','k','z']}, function(){}, 'Test');
  });
  await page.waitForTimeout(400);
  await page.evaluate(()=>{window.__heard.length=0;});

  // tap b, a, t as fast as a child would
  for (const L of ['B','A','T']) {
    const tile = await page.evaluateHandle(l=>{
      return Array.from(document.querySelectorAll('.letter-tile')).find(e=>e.textContent===l);
    }, L);
    const el = tile.asElement();
    const b = await el.boundingBox();
    await T('touchStart',[{x:b.x+b.width/2,y:b.y+b.height/2,id:1}]);
    await page.waitForTimeout(40);
    await T('touchEnd',[]);
    await page.waitForTimeout(90);
  }
  await page.waitForTimeout(900);
  const said = await page.evaluate(()=>window.__heard.slice());
  ck('all three tapped letters are spoken, as letter names',
     said.slice(0,3).join(' ')==='bee ay tee', JSON.stringify(said));
  ck('no raw single characters were sent to the engine',
     !said.some(t=>t.length===1), JSON.stringify(said.filter(t=>t.length===1)));

  console.log('page errors:', errs.length?errs:'none');
  const bad=R.filter(r=>!r.ok);
  console.log('\n'+(bad.length?'FAILURES: '+bad.map(r=>r.n).join(' | '):'ALL '+R.length+' CHECKS PASSED'));
  await browser.close();
  process.exit(bad.length||errs.length?1:0);
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
