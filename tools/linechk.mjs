import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:430,height:1500},deviceScaleFactor:2});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
pg.on('console',m=>{if(m.type()==='error'&&!/404|Failed to load/.test(m.text()))errs.push(m.text());});
await pg.goto('http://localhost:8765/lab/fight.html');await pg.waitForTimeout(600);
const tips=()=>pg.evaluate(()=>document.querySelector('#tips').innerText.replace(/\s+/g,' '));
const cells=()=>pg.evaluate(()=>['cA0','cA1','cA2','cF0','cF1','cF2'].map(id=>
  (document.getElementById(id).innerText||'—').replace(/\n+/g,'|')));
console.log("■ スライム3体（投げ物なし）");
for(const m of ['thr2','pow']){ await pg.click(`[data-d="${m}"]`); await pg.waitForTimeout(200);
  console.log(`  ${m}: ${await tips()}`); }
/* 混成にすると 草スライムの投げ物が入る */
await pg.click('[data-g="mixed"]'); await pg.waitForTimeout(400);
console.log("\n■ 混成（草スライムが投げ物を持つ）");
(await cells()).forEach((x,i)=>console.log(`  ${i<3?"味":"敵"}${i%3} ${x}`));
for(const m of ['thr2','thr1','dice','pow']){ await pg.click(`[data-d="${m}"]`); await pg.waitForTimeout(200);
  console.log(`  ${m}: ${await tips()}`); }
await pg.click('[data-d="thr2"]');
/* 実際に回して 投げ物が後列に届くか */
await pg.click('#godBtn'); await pg.waitForTimeout(200);
console.log("\n■ 回す");
for(let i=0;i<12;i++){
  if(await pg.evaluate(()=>over))break;
  const el=await pg.$('#acts [data-a="0"]:not([disabled])');
  if(!el){await pg.waitForTimeout(700);continue;}
  await el.click(); await pg.waitForTimeout(2600);
}
console.log(await pg.evaluate(()=>document.querySelector('#log').innerText));
await pg.evaluate(()=>window.scrollTo(0,0));
await pg.screenshot({path:'/tmp/line2.png',fullPage:true});
console.log(errs.length?"⚠ "+[...new Set(errs)].join("\n⚠ "):"例外なし");
await b.close();
