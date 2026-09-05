/* 雇用まわりを 本物のクリックで確かめる */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:430,height:930}});
const errs=[];
pg.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
pg.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::/.test(m.text()))errs.push('CONSOLE '+m.text());});
await pg.goto('http://localhost:8765/index.html');
await pg.evaluate(()=>{try{localStorage.clear()}catch(e){}});
await pg.reload();await pg.waitForTimeout(900);
await pg.evaluate(()=>{window.wait=async()=>{};window.ovMsg=()=>{};});
const log=[];
const scr=()=>pg.evaluate(()=>curScreen+(modalOpen()?"+窓":""));
const tap=async(sel)=>{const e=await pg.$(sel);if(!e||!(await e.isVisible()))return false;await e.click({force:true});await pg.waitForTimeout(200);return true;};
const once=async()=>{
  const inModal=await pg.evaluate(()=>modalOpen());
  const list=inModal
    ?[['#mbox [data-i]',0],['#mbox [data-d]',0],['#mbox [data-b]',1],
      ['#mbox [data-keep]',0],['#mbox [data-skip]',0],
      ['#mbox .ndbtn button',1],['#mbox .mclose',0],['#mbox button',1]]
    :[['#mkBody [data-k]',0],['#mkBody [data-w]',0]];
  for(const [q,last] of list){
    const els=await pg.$$(q); if(!els.length)continue;
    const e=last?els[els.length-1]:els[0];
    try{ await e.click({force:true,timeout:2500}); }catch(err){ continue; }
    await pg.waitForTimeout(220); return true;
  }
  return false;
};
const firstCard=async(tries)=>{for(let t=0;t<(tries||6);t++){if(await once())return true;await pg.waitForTimeout(220);}return false;};
const drain=async(n=12)=>{for(let i=0;i<n;i++){if(!await pg.evaluate(()=>modalOpen()))break;if(!await once())break;}};
const st=()=>pg.evaluate(()=>({p:party.map(u=>u.short||u.name),b:bench.map(u=>u.short||u.name),g:me.gold}));

async function newSave(){
  await tap("#tStart");
  const sl=await pg.$$('#slotList [data-sl]'); if(sl.length)await sl[0].click({force:true});
  await pg.waitForTimeout(300);
  for(const s of ["職業","種族","欲望"]){
    const c=await pg.$$('#mkBody [data-k], #mkBody [data-w]'); if(!c.length)break;
    await c[0].click(); await pg.waitForTimeout(160);
  }
  await pg.waitForSelector("#mkNext",{timeout:8000});
  await tap("#mkNext"); await pg.waitForTimeout(300);
  await firstCard(); await pg.waitForTimeout(600);
  await drain();
}
await newSave();
log.push(`町に着いた → ${await scr()}　${JSON.stringify(await st())}`);

const hbtn=await pg.$('#hHire');
log.push(`雇う札「${hbtn?(await hbtn.innerText()).replace(/\s/g,""):"なし"}」`);
for(let n=1;n<=5;n++){
  await pg.evaluate(()=>{me.gold+=2000;});
  const h=await pg.$('#hHire'); const t=(await h.innerText()).replace(/\s/g,"");
  await h.click({force:true}); await pg.waitForTimeout(450);
  const cand=await pg.evaluate(()=>document.querySelectorAll('#mbox [data-h]').length);
  const g0=await pg.evaluate(()=>me.gold);
  if(!cand){log.push(`${n}人目 候補なし　画面 ${await scr()}`);await drain();break;}
  await tap('#mbox [data-h]');
  await drain(12);
  const s=await st();
  log.push(`${n}人目 札「${t}」候補${cand}人 → 一味 ${s.p.join("/")}　控え ${s.b.join("/")}　払った ${g0-s.g}`);
}
/* 一味の窓で 入れ替え */
await tap("#hChar");
await pg.waitForTimeout(300);
log.push(`一味の窓 → ${await scr()}　主人公を見ているとき 入れる札 ${
  await pg.evaluate(()=>document.querySelectorAll('#mbox [data-in]').length)}（うち押せる ${
  await pg.evaluate(()=>[...document.querySelectorAll('#mbox [data-in]')].filter(b=>!b.disabled).length)}）　外す札 ${
  await pg.evaluate(()=>document.querySelectorAll('#mbox [data-out]').length)}`);
/* 2人目の札に切り替える */
const who=await pg.$$('#mbox [data-who]');
if(who[1])await who[1].click({force:true});
await pg.waitForTimeout(300);
log.push(`2人目を選んだ → 入れる札のうち押せる ${
  await pg.evaluate(()=>[...document.querySelectorAll('#mbox [data-in]')].filter(b=>!b.disabled).length)}　外す札 ${
  await pg.evaluate(()=>document.querySelectorAll('#mbox [data-out]').length)}　札の字「${
  await pg.evaluate(()=>{const b=document.querySelector('#mbox [data-in]');return b?b.textContent.trim():"なし";})}」`);
let s0=await st();
await tap('#mbox [data-in]'); await pg.waitForTimeout(350);
let s1=await st();
log.push(`入れ替え → 一味 ${s1.p.join("/")}　控え ${s1.b.join("/")}（前 一味 ${s0.p.join("/")}／控え ${s0.b.join("/")}）`);
log.push(`　人数 一味${s1.p.length}人 控え${s1.b.length}人　総数 ${s1.p.length+s1.b.length}（前 ${s0.p.length+s0.b.length}）${s1.p.length+s1.b.length===s0.p.length+s0.b.length?" ✓":" ✗ 人が消えた/増えた"}`);
/* 控えへ外す */
const who2=await pg.$$('#mbox [data-who]');
if(who2[1])await who2[1].click({force:true});
await pg.waitForTimeout(250);
s0=await st();
await tap('#mbox [data-out]'); await pg.waitForTimeout(350);
s1=await st();
log.push(`控えへ → 一味 ${s1.p.join("/")}　控え ${s1.b.join("/")}（前 ${s0.p.join("/")}）${s1.p.length===s0.p.length-1?" ✓":" ✗"}`);
/* 空いたので「一味に入れる」になるはず */
log.push(`空きあり → 札の字「${await pg.evaluate(()=>{const b=document.querySelector('#mbox [data-in]');return b?b.textContent.trim():"なし";})}」`);
await tap('#mbox [data-in]'); await pg.waitForTimeout(350);
s1=await st();
log.push(`入れた → 一味 ${s1.p.join("/")}　控え ${s1.b.join("/")}`);
await tap('#mClose');
/* 保存と読み直し */
await pg.evaluate(()=>runSave());
const b1=await st();
await pg.reload(); await pg.waitForTimeout(900);
await pg.evaluate(()=>{window.wait=async()=>{};window.ovMsg=()=>{};});
await tap("#tStart");
const sl2=await pg.$$('#slotList [data-sl]'); if(sl2.length)await sl2[0].click({force:true});
await pg.waitForTimeout(800);
const b2=await pg.evaluate(()=>({s:curScreen,p:(party||[]).map(u=>u.short||u.name),b:(bench||[]).map(u=>u.short||u.name),g:me?me.gold:-1}));
log.push(`読み直し → ${b2.s}　一味 ${b2.p.join("/")}　控え ${b2.b.join("/")}　金貨 ${b2.g}`);
log.push(`保存の一致 ${JSON.stringify(b1.p)===JSON.stringify(b2.p)&&JSON.stringify(b1.b)===JSON.stringify(b2.b)&&b1.g===b2.g?"✓":"✗ "+JSON.stringify(b1)+" / "+JSON.stringify(b2)}`);
console.log(log.join("\n"));
console.log(errs.length?"⚠ "+[...new Set(errs)].slice(0,8).join("\n⚠ "):"例外なし");
await b.close();
