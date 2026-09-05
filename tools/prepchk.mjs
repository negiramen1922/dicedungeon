import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:430,height:1600},deviceScaleFactor:2});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
pg.on('console',m=>{if(m.type()==='error'&&!/404|Failed to load/.test(m.text()))errs.push(m.text());});
await pg.goto('http://localhost:8765/lab/fight.html');await pg.waitForTimeout(600);
const acts=()=>pg.evaluate(()=>[...document.querySelectorAll('#acts .act')].map(b=>
  b.querySelector('.an').innerText.replace(/\s+/g,'')+' | '+b.querySelector('.ad').innerText.replace(/\s+/g,' ')+(b.disabled?' [×]':'')));
const who=()=>pg.evaluate(()=>document.querySelector('#prompt').innerText.replace(/\s+/g,' '));
const cells=()=>pg.evaluate(()=>['cA0','cA1','cA2'].map(id=>document.getElementById(id).innerText.replace(/\n+/g,'|')));
console.log("■ 技能の名前");
(await cells()).forEach(x=>console.log("  "+x));
console.log("\n■ "+await who()); (await acts()).forEach(x=>console.log("  "+x));
/* 仕込んでから撃つ（アーチャーが先手） */
await pg.click('[data-p="p2"]'); await pg.waitForTimeout(900);
console.log("\n■ 狙う を使った");
console.log("  盤面 "+(await cells())[1]);
console.log("  ログ "+await pg.evaluate(()=>document.querySelector('#log').innerText.split('\n').slice(-1)[0]));
/* ウィザード → ナイト → 敵 ... アーチャーの番まで回す */
for(let i=0;i<8;i++){
  const w=await who();
  if(w.includes("アーチャー")){ break; }
  const el=await pg.$('#acts [data-a="0"]:not([disabled])');
  if(!el){await pg.waitForTimeout(700);continue;}
  await el.click(); await pg.waitForTimeout(2800);
}
console.log("\n■ アーチャーの番に戻った → "+await who());
(await acts()).forEach(x=>console.log("  "+x));
await pg.click('#acts [data-a="0"]'); await pg.waitForTimeout(3000);
console.log("  ログ "+await pg.evaluate(()=>[...document.querySelectorAll('#log .lg')].map(e=>e.innerText.replace(/\s+/g,' ')).filter(t=>t.includes('アーチャー')).slice(-1)[0]));
console.log("  仕込みは消えたか → "+await pg.evaluate(()=>{const a=party.find(u=>u.n==="アーチャー");return a.prep?"残っている ✗":"消えた ✓";}));
/* ダイス上限 */
for(let i=0;i<8;i++){const el=await pg.$('[data-dp="0"]:not([disabled])'); if(!el)break; await el.click(); await pg.waitForTimeout(90);}
console.log("\n■ ダイスの上限 "+await pg.evaluate(()=>party[0].dice)+"　"+
  await pg.evaluate(()=>document.querySelector('#diceRows .trow .tnote').innerText.replace(/\s+/g,' ')));
await pg.evaluate(()=>window.scrollTo(0,0));
await pg.screenshot({path:'/tmp/prep.png',fullPage:true});
console.log("\n"+(errs.length?"⚠ "+[...new Set(errs)].join("\n⚠ "):"例外なし"));
await b.close();
