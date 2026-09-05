import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:430,height:1200},deviceScaleFactor:2});
const errs=[];
pg.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
pg.on('console',m=>{if(m.type()==='error'&&!/404|Failed to load resource/.test(m.text()))errs.push('CONSOLE '+m.text());});
await pg.goto('http://localhost:8765/lab/dice.html');
await pg.waitForTimeout(500);
const set=async(id,v)=>pg.evaluate(([i,x])=>{const e=document.querySelector('#'+i);e.value=x;e.dispatchEvent(new Event('input'));},[id,v]);
const acts=()=>pg.evaluate(()=>[...document.querySelectorAll('#skBody tr')].map(r=>{
  const t=[...r.querySelectorAll('td')];
  return [t[0].innerText.split('\n')[0].padEnd(7), t[1].innerText.padEnd(8), '威'+t[5].innerText.padStart(6),
          t[6].innerText.padStart(8), '期待'+t[7].innerText.padStart(7), (r.className.includes('best')?' ◀':'')].join(' ');}));
console.log("■ しきい値 "+await pg.evaluate(()=>document.querySelector('#thrBig').textContent)
  +"　"+await pg.evaluate(()=>document.querySelector('#thrWhy').innerText.replace(/\s+/g,' ')));
for(const n of [2,3,4,5,6,7]){
  await set('nDice',n);
  console.log(`\n── ダイス ${n}個 ──`); (await acts()).forEach(x=>console.log("  "+x));
}
console.log("\n■ 敵の技");
console.log(await pg.evaluate(()=>document.querySelector('#foeTbl').innerText));
console.log("■ 罠 "+await pg.evaluate(()=>document.querySelector('#trapNote').innerText.replace(/\s+/g,' ')));
/* 超過に切り替えて階段が潰れるのを見る */
await pg.click('#segPow [data-v="excess"]'); await pg.waitForTimeout(150);
console.log("\n■ 超過成功で伸びる に切り替え");
for(const n of [3,5,7]){ await set('nDice',n); console.log(` ダイス${n}個`); (await acts()).forEach(x=>console.log("  "+x)); }
await pg.click('#segPow [data-v="flat"]'); await set('nDice',5);
/* 手で振る */
await pg.click('[data-roll="2"]'); await pg.waitForTimeout(200);
console.log("\n■ 手で振った → "+await pg.evaluate(()=>document.querySelector('#rollBox').innerText.replace(/\s+/g,' ')));
/* 撃ち合い */
for(const n of [3,5,7]){
  await set('nDice',n);
  await pg.click('#runBtn'); await pg.waitForTimeout(3500);
  console.log(`\n■ 撃ち合い（自分ダイス${n}個）　`+await pg.evaluate(()=>document.querySelector('#runNote').textContent));
  console.log(await pg.evaluate(()=>document.querySelector('#simTbl').innerText));
}
await set('nDice',3);
await pg.evaluate(()=>document.querySelectorAll('.scroll').forEach(e=>e.scrollLeft=0));
await pg.screenshot({path:'/tmp/lab2.png',fullPage:true});
console.log(errs.length?"⚠ "+[...new Set(errs)].join("\n⚠ "):"例外なし");
await b.close();
