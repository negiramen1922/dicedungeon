/* 攻撃の演出。当たり → 数字 → 帯 の三拍が 見えているか（α1.0.039） */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const file=process.argv[2]||'index.html';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:430,height:930}});
const errs=[];pg.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
await pg.goto('http://localhost:8765/'+file);await pg.waitForTimeout(800);
const out=await pg.evaluate(async()=>{
  const L=[],bad=[];
  window.ovMsg=()=>{};window.ovHide=()=>{};window.rollDice=async()=>0;
/* 〔罠〕`r6` は スクリプト直下の const なので **window に乗っていない**。
     `window.r6=()=>6` と書いても 本体の r6 は差し替わらない（ずっと素の出目のまま
     測っていて、外れると この道具が落ちていた）。握るなら **Math.random** のほう
     （0.99 で 1+floor(0.99×6)=6）。ただし **戦いを組み立てる前から握ると
     乱数を待つところで止まる**ので、握るのは 撃つ直前だけ。 */
  slot=0; sel.job="knight";sel.race="hume";sel.orig="wrath";
  newGame();
  let g=0;while(g++<14&&modalOpen()){const b=document.querySelector("#mbox [data-i]")
    ||document.querySelector("#mbox .ndbtn button:last-child")
    ||document.querySelector("#mbox [data-skip]");if(!b)break;b.click();
    await new Promise(r=>setTimeout(r,8));}
  dive("plain"); sel.enc=Object.keys(ENCS)[0]; RUN.elite=false;RUN.boss=false;
  await startBattle();
  await new Promise(r=>setTimeout(r,300));
  const t=alive()[0];
  /* 撮る。攻撃を走らせながら 30ms ごとに 盤の姿を控える */
  const film=[];
  const tick=setInterval(()=>{
    const bd=document.querySelector("#board");
    film.push({t:Date.now(),
      pop:bd.querySelectorAll(".pop").length,
      ptx:[...bd.querySelectorAll(".pop")].map(x=>x.className+":"+x.textContent).join("|"),
      fx:bd.querySelectorAll(".fx").length,
      /* 盤のマスの作りが α1.0.061 で変わった（.por → .cfig） */
      lunge:!!bd.querySelector('.cfig[style*="translateX(2"]'),
      bar:(()=>{const i=cellOf(t)&&cellOf(t).querySelector(".chp i");
        return i?i.style.width:"";})()});
  },30);
  const t0=Date.now();
  const _rnd=Math.random; Math.random=()=>0.99;      /* ここから 必ず当てる */
  await playerAttack([t],{});
  Math.random=_rnd;
  clearInterval(tick);
  const span=x=>{const f=film.filter(x);return f.length?[f[0].t-t0,f[f.length-1].t-t0]:null;};
  const lu=span(f=>f.lunge), fx=span(f=>f.fx>0), pp=span(f=>/−/.test(f.ptx));
  const bars=[...new Set(film.map(f=>f.bar))];
  L.push(`踏み込み ${lu?lu[0]+"〜"+lu[1]+"ms":"見えなかった"}`);
  L.push(`当たりの光 ${fx?fx[0]+"〜"+fx[1]+"ms":"見えなかった"}`);
  L.push(`数 字 ${pp?pp[0]+"〜"+pp[1]+"ms（"+(pp[1]-pp[0])+"ms 見えた）":"見えなかった"}`);
  L.push(`帯の幅 ${bars.join(" → ")}`);
  L.push(`全部で ${Date.now()-t0}ms`);
  L.push("film "+film.filter(f=>f.pop>0).slice(0,4).map(f=>(f.t-t0)+"ms "+f.ptx).join(" / "));
  if(!lu)bad.push("踏み込みが 見えていない");
  if(!fx)bad.push("当たりの光が 見えていない");
  if(!pp)bad.push("ダメージの数字が 一度も出ていない");
  else{
    if(pp[1]-pp[0]<300)bad.push(`数字が ${pp[1]-pp[0]}ms しか出ていない（消されている）`);
    if(fx&&pp[0]<=fx[0])bad.push("数字が 当たりの光より先か同時に出ている");
  }
  if(bars.length<2)bad.push("帯が 減っていない");
  else{
    const barAt=film.find(f=>f.bar===bars[bars.length-1]);
    const pop1=film.find(f=>/−/.test(f.ptx));
    if(barAt&&pop1&&barAt.t<pop1.t)bad.push("帯が 数字より先に減っている");
  }
  return {L,bad};
});
console.log(out.L.join("\n"));
if(errs.length)console.log(errs.join("\n"));
if(out.bad.length){console.log("\n⚠ "+out.bad.join("\n⚠ "));process.exitCode=1;}
else console.log("\n✓ 踏み込み → 光 → 数字 → 帯 の順に見えている");
await b.close();
