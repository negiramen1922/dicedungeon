import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:430,height:1400},deviceScaleFactor:2});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
pg.on('console',m=>{if(m.type()==='error'&&!/404|Failed to load/.test(m.text()))errs.push(m.text());});
await pg.goto('http://localhost:8765/lab/fight.html');await pg.waitForTimeout(500);
const marks=()=>pg.evaluate(()=>[...document.querySelectorAll('.cell .dep')].map(e=>e.innerText.replace(/\s+/g,'')));
const acts=()=>pg.evaluate(()=>[...document.querySelectorAll('#acts .act')].map(b=>
  b.querySelector('.an').innerText.replace(/\s+/g,'')+' | '+b.querySelector('.ad').innerText.replace(/\s+/g,' ')+(b.disabled?' [×]':'')));
const thr=()=>pg.evaluate(()=>document.querySelector('#thrN').textContent+" / "+document.querySelector('#thrX').innerText.replace(/\s+/g,' '));
console.log("列 "+JSON.stringify(await marks()));
console.log("ねらい "+await pg.evaluate(()=>document.querySelector('#prompt').innerText.replace(/\s+/g,' ')));
console.log("閾値 "+await thr());
/* 3番目を狙う */
await pg.click('[data-f="2"]'); await pg.waitForTimeout(250);
console.log("\n3番目を狙った → 閾値 "+await thr());
(await acts()).forEach(x=>console.log("  "+x));
/* 奥ゆきの罰を切り替える */
for(const m of ['thr1','dice','pow','thr2']){
  await pg.click(`[data-d="${m}"]`); await pg.waitForTimeout(220);
  console.log(`\n奥ゆき「${m}」 → 閾値 ${await thr()}`);
  console.log("  列 "+JSON.stringify(await marks()));
  console.log("  "+(await acts())[2]);
}
console.log("\n目安 "+await pg.evaluate(()=>document.querySelector('#tips').innerText.replace(/\s+/g,' ')));
/* 超過の伸びを切り替え */
for(const x of ['x50c2','x50','none','x25']){
  await pg.click(`[data-x="${x}"]`); await pg.waitForTimeout(180);
  console.log(`超過「${x}」 ${await pg.evaluate(()=>document.querySelector('#xNote2').innerText.replace(/\s+/g,' '))}`);
}
/* 倒れないで試す ＋ ダイス増やして 実際に殴る */
await pg.click('#godBtn');
for(let i=0;i<3;i++)await pg.click('#dPlus');
await pg.waitForTimeout(250);
await pg.click('[data-f="0"]'); await pg.waitForTimeout(200);
console.log("\n■ ダイス5個・先頭ねらい"); (await acts()).forEach(x=>console.log("  "+x));
for(let i=0;i<10;i++){
  if(await pg.evaluate(()=>over))break;
  const el=await pg.$('[data-a="a2"]:not([disabled])')||await pg.$('[data-a="a1"]:not([disabled])');
  if(!el){await pg.waitForTimeout(400);continue;}
  await el.click(); await pg.waitForTimeout(1800+900*await pg.evaluate(()=>foes.filter(f=>f.hp>0).length));
}
console.log("\n■ ログ\n"+await pg.evaluate(()=>document.querySelector('#log').innerText));
console.log("列 "+JSON.stringify(await marks()));
console.log("決着 "+await pg.evaluate(()=>document.querySelector('#endBox').innerText||"（まだ）"));
await pg.screenshot({path:'/tmp/fight3.png',fullPage:true});
console.log(errs.length?"⚠ "+[...new Set(errs)].join("\n⚠ "):"例外なし");
await b.close();
