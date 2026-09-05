import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:430,height:1180},deviceScaleFactor:2});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
pg.on('console',m=>{if(m.type()==='error'&&!/404|Failed to load/.test(m.text()))errs.push(m.text());});
await pg.goto('http://localhost:8765/lab/fight.html');await pg.waitForTimeout(500);
const T=()=>pg.evaluate(()=>document.querySelector('#thrN').textContent);
console.log("DEX20 → 閾値 "+await T()+"　"+await pg.evaluate(()=>document.querySelector('#xNote').innerText));
for(let i=0;i<3;i++){await pg.click('#xPlus');await pg.waitForTimeout(120);}
console.log("DEX35 → 閾値 "+await T()+"　"+await pg.evaluate(()=>document.querySelector('#xNote').innerText));
for(let i=0;i<3;i++){await pg.click('#xPlus');await pg.waitForTimeout(120);}
console.log("DEX50 → 閾値 "+await T()+"　"+await pg.evaluate(()=>document.querySelector('#xNote').innerText));
console.log("行動 "+await pg.evaluate(()=>[...document.querySelectorAll('#acts .act .ad')].map(e=>e.innerText.replace(/\s+/g,' ')).join(' ／ ')));
await pg.click('[data-a="a1"]');await pg.waitForTimeout(3200);
console.log("\nログ\n"+await pg.evaluate(()=>document.querySelector('#log').innerText));
await pg.click('[data-f="wslime"]');await pg.waitForTimeout(400);
console.log("水スライム → 閾値 "+await T()+"　DEX 保った? "+await pg.evaluate(()=>document.querySelector('#xVal').textContent));
await pg.evaluate(()=>{document.querySelectorAll('.tbtn').forEach(b=>{});});
await pg.screenshot({path:'/tmp/fight2.png',fullPage:true});
console.log(errs.length?"⚠ "+[...new Set(errs)].join("\n⚠ "):"例外なし");
await b.close();
