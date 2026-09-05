import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const errs=[];
/* ── たたかい ── */
let pg=await b.newPage({viewport:{width:430,height:1400},deviceScaleFactor:2});
pg.on('pageerror',e=>errs.push('fight '+e.message));
pg.on('console',m=>{if(m.type()==='error'&&!/404|Failed to load/.test(m.text()))errs.push('fight '+m.text());});
await pg.goto('http://localhost:8765/lab/fight.html');await pg.waitForTimeout(500);
console.log("■ たたかい ── 既定 "+await pg.evaluate(()=>XMODE));
console.log(await pg.evaluate(()=>document.querySelector('#xNote2').innerText.replace(/\s+/g,' ')));
for(const x of ['x25','x50c2','none','x25c2']){
  await pg.click(`[data-x="${x}"]`); await pg.waitForTimeout(200);
  console.log(`\n「${x}」 ${await pg.evaluate(()=>document.querySelector('#xNote2').innerText.replace(/\s+/g,' '))}`);
}
/* 上限で切られる出目を見る：ダイス6個・通常攻撃 */
await pg.click('#godBtn');
for(let i=0;i<4;i++)await pg.click('#dPlus');
await pg.waitForTimeout(250);
console.log("\n■ ダイス6個で通常攻撃を数回（上限2で切られるか）");
for(let i=0;i<4;i++){
  const el=await pg.$('[data-a="a1"]:not([disabled])'); if(!el)break;
  await el.click(); await pg.waitForTimeout(4200);
}
console.log(await pg.evaluate(()=>[...document.querySelectorAll('#log .lg')]
  .map(e=>e.innerText.replace(/\s+/g,' ')).filter(t=>t.includes('通常攻撃')).join("\n")));
await pg.screenshot({path:'/tmp/cap_fight.png',fullPage:true});
await pg.close();
/* ── 数字の台 ── */
pg=await b.newPage({viewport:{width:430,height:1400},deviceScaleFactor:2});
pg.on('pageerror',e=>errs.push('dice '+e.message));
pg.on('console',m=>{if(m.type()==='error'&&!/404|Failed to load/.test(m.text()))errs.push('dice '+m.text());});
await pg.goto('http://localhost:8765/lab/dice.html');await pg.waitForTimeout(500);
console.log("\n\n■ 数字の台 ── 既定 "+JSON.stringify(await pg.evaluate(()=>S)));
console.log(await pg.evaluate(()=>document.querySelector('#capHint').innerText.replace(/\s+/g,' ')));
const rows=()=>pg.evaluate(()=>[...document.querySelectorAll('#skBody tr')].map(r=>{
  const t=[...r.querySelectorAll('td')];
  return t[0].innerText.split('\n')[0].padEnd(7)+' 成功'+t[6].innerText.padStart(7)
    +' 期待'+t[7].innerText.padStart(7)+(r.className.includes('best')?' ◀':'');}));
for(const n of [3,5,7]){
  await pg.evaluate(v=>{const d=document.querySelector('#nDice');d.value=v;d.dispatchEvent(new Event('input'));},n);
  await pg.waitForTimeout(150);
  console.log(`\nダイス${n}個`); (await rows()).forEach(x=>console.log("  "+x));
}
/* 上限を外すと条件が崩れるか */
await pg.evaluate(()=>{const c=document.querySelector('#exCap');c.value=8;c.dispatchEvent(new Event('input'));});
await pg.waitForTimeout(200);
console.log("\n上限を8にすると:\n"+await pg.evaluate(()=>document.querySelector('#capHint').innerText.replace(/\s+/g,' ')));
await pg.screenshot({path:'/tmp/cap_dice.png',fullPage:true});
console.log("\n"+(errs.length?"⚠ "+[...new Set(errs)].join("\n⚠ "):"例外なし"));
await b.close();
