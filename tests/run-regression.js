const {spawnSync}=require('child_process');
const tests=process.argv.length>2?process.argv.slice(2):['audio-tts.test.js','test-migration.js','test-setup.js','test-editor.js','test-glider.js','test-nudge.js','test-balloon.js','test-letters.js','test-spell-live.js'];
let failed=0;
for(const test of tests){
  const r=spawnSync(process.execPath,['tests/'+test],{encoding:'utf8',env:process.env,timeout:180000});
  const summary=(r.stdout||'').split('\n').filter(l=>/FAIL|ALL |page errors:|PASS|CHECKS/.test(l));
  console.log(test+': '+(r.status===0?'PASS':'FAIL'));
  console.log(summary.slice(-4).join('\n'));
  if(r.status!==0){failed++;console.log((r.stderr||'').slice(-2000));}
}
process.exit(failed?1:0);
