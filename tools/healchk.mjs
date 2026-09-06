import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:430,height:1700},deviceScaleFactor:2});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
pg.on('console',m=>{if(m.type()==='error'&&!/404|Failed to load/.test(m.text()))errs.push(m.text());});
await pg.goto('http://localhost:8765/lab/fight.html');await pg.waitForTimeout(600);
const acts=()=>pg.evaluate(()=>[...document.querySelectorAll('#acts .act')].map(b=>
  b.querySelector('.an').innerText.replace(/\s+/g,' ').trim()+' | '+b.querySelector('.ad').innerText.replace(/\s+/g,' ')+(b.disabled?' [×]':'')));
console.log("■ 盤面（技能ごとのダイス）");
console.log(await pg.evaluate(()=>['cA0','cA1','cA2'].map(id=>document.getElementById(id).innerText.replace(/\n+/g,'|')).join("\n")));
console.log("\n■ 稽古の行");
console.log(await pg.evaluate(()=>[...document.querySelectorAll('#diceRows .trow')].map(r=>r.innerText.replace(/\s+/g,' ')).join("\n")));
/* ウィザードの番まで進めて 治療を見る */
await pg.evaluate(()=>{turn=order.indexOf(party.find(u=>u.n==="ウィザード"));
  party[0].hp=60;drawAll();});
await pg.waitForTimeout(300);
console.log("\n■ ナイトを HP60 にして ウィザードの番");
(await acts()).forEach(x=>console.log("  "+x));
/* 治療を撃つ */
const idx=await pg.evaluate(()=>now().acts.findIndex(a=>a.heal));
await pg.click(`#acts [data-a="${idx}"]`); await pg.waitForTimeout(3400);
console.log("\n■ 癒しを撃った");
console.log(await pg.evaluate(()=>[...document.querySelectorAll('#log .lg')].map(e=>e.innerText.replace(/\s+/g,' ')).slice(-2).join("\n")));
console.log("ナイトの HP → "+await pg.evaluate(()=>Math.round(party[0].hp)));
/* 目減りが出るまで何度か */
console.log("\n■ 目減りが出るか（HPを戻しながら数回）");
for(let i=0;i<8;i++){
  await pg.evaluate(()=>{turn=order.indexOf(party.find(u=>u.n==="ウィザード"));
    party[0].hp=60; party[2].mp=99; drawAll();});
  await pg.waitForTimeout(200);
  const el=await pg.$(`#acts [data-a="${idx}"]:not([disabled])`); if(!el)break;
  await el.click(); await pg.waitForTimeout(3200);
}
console.log(await pg.evaluate(()=>[...document.querySelectorAll('#log .lg')].map(e=>e.innerText.replace(/\s+/g,' ')).filter(t=>/癒/.test(t)).join("\n")));
await pg.evaluate(()=>window.scrollTo(0,0));
await pg.screenshot({path:'/tmp/heal.png',fullPage:true});
console.log("\n"+(errs.length?"⚠ "+[...new Set(errs)].join("\n⚠ "):"例外なし"));
await b.close();
