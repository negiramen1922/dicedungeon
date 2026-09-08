/* ===== 「装備・状態」の窓の 縦の長さを測る =====
   4つの札それぞれが 何画面ぶんになるか。受け入れの線は 1.2 画面（≦1010px）。
   使い方: node tools/uichk.mjs                                            */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
for(const [w,h,nm] of [[390,844,"スマホ 390×844"],[820,1180,"タブレット 820"]]){
const pg=await b.newPage({viewport:{width:w,height:h}});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/index.html');await pg.waitForTimeout(700);
const r=await pg.evaluate(async()=>{
  sel.job="knight";sel.race="hume";sel.orig="greed";
  newGame();closeModal();
  for(let i=1;i<50;i++){me.lv++;growUp();syncMates();}
  setParty([me,makeMate("mage","elf",me.lv),makeMate("archer","beast",me.lv)]);
  /* それらしく持たせる */
  const A=REW.act, P=REW.pass;
  me.sk=[...A.knight.slice(0,4),...A.greed.slice(0,2)];
  me.pass=[...P.knight,...P.hume,...P.greed].slice(0,8);
  me.bagx={act:[...A.common.slice(0,3)],pass:[...P.common.slice(0,3)]};
  me.stash=[].concat(
    (GEAR.wep.knight||[]).slice(0,3).map(g=>({...g,slot:"wep"})),
    GEAR.armor.slice(0,3).map(g=>({...g,slot:"armor"})),
    GEAR.acc.slice(0,3).map(g=>({...g,slot:"acc"})));
  me.bag={};Object.keys(ITEMS).slice(0,6).forEach(k=>me.bag[k]=2);
  me.mats={};Object.keys(MATS).slice(0,7).forEach(k=>me.mats[k]=3);
  me.recipes=Object.keys(RECIPES).slice(0,5);
  const out={};
  for(const t of ["st","sk","eq","bag"]){
    chNow=t; chWho=0; charModal();
    await new Promise(r=>setTimeout(r,60));
    const box=document.querySelector("#mbox");
    out[t]={高さ:Math.round(box.scrollHeight),
      行数:box.querySelectorAll(".mitem").length,
      見出し:box.querySelectorAll(".msec").length,
      札:box.querySelectorAll("button").length};
    closeModal();
  }
  return {out,画面:innerHeight};
});
console.log("\n■ "+nm+"（表示できる高さ "+r.画面+"px）");
for(const k in r.out){const o=r.out[k];
  console.log("  "+k.padEnd(4)+" 高さ "+String(o.高さ).padStart(5)+"px"+
    "　＝ "+ (o.高さ/r.画面).toFixed(1)+" 画面ぶん"+
    "　行 "+String(o.行数).padStart(3)+"　見出し "+o.見出し+"　札 "+o.札);}
if(errs.length)console.log("  ERR",errs.slice(0,2));
await pg.close();
}
await b.close();
