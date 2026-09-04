/* 町と持ち帰りの筋を通す */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:430,height:930}});
const errs=[];pg.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
await pg.goto('http://localhost:8765/index.html');await pg.waitForTimeout(800);
const out=await pg.evaluate(async()=>{
  const L=[],bad=[];
  window.wait=async()=>{};window.ovMsg=()=>{};window.rollDice=async()=>0;
  window.addDice=async(a)=>a;window.ovHide=()=>{};window.lungeUnit=async()=>{};
  window.fxOn=()=>{};window.popOn=()=>{};window.popSelf=()=>{};window.setHPBar=()=>{};
  const pick=()=>{const b=document.querySelector("#mbox [data-i]")
    ||document.querySelector("#mbox .ndbtn button:last-child")
    ||document.querySelector("#mbox [data-skip]");if(b){b.click();return true;}return false;};
  const drain=async()=>{let g=0;while(g++<14&&modalOpen()&&pick())await new Promise(r=>setTimeout(r,8));};

  slot=0;                       /* 記録の枠を開けてから始める */
  sel.job="knight";sel.race="hume";sel.orig="greed";
  newGame();await drain();
  L.push(`① はじめる → 画面 ${curScreen}　RUN=${RUN===null?"null（町）":"あり"}　金貨 ${me.gold}`);
  if(curScreen!=="home")bad.push("はじめたのに町にいない: "+curScreen);
  if(RUN!==null)bad.push("町にいるのに RUN が残っている");

  /* ② 潜る */
  dive("plain");
  L.push(`② 潜る → RUN あり=${!!RUN}　entry を控えた=${!!(RUN&&RUN.entry)}　地図の部屋 ${Object.keys(RUN.M.node).length}`);
  if(!RUN||!RUN.entry)bad.push("潜っても entry が無い");

  /* ③ 拾って 引き返す → 持ち帰れる */
  me.gold+=500; me.mats.gel=(me.mats.gel||0)+7; me.bag.potion=1;
  const g1=me.gold,m1=me.mats.gel;
  goTown("leave");await drain();
  L.push(`③ 引き返す → 金貨 ${g1}→${me.gold}　ゲル ${m1}→${me.mats.gel||0}　RUN=${RUN===null?"null":"あり"}`);
  if(me.gold!==g1||me.mats.gel!==m1)bad.push("引き返したのに 拾ったものが消えた");
  if(RUN!==null)bad.push("帰ったのに RUN が残っている");

  /* ④ 潜って 拾って 全滅 → 拾ったぶんだけ失う */
  const gTown=me.gold, mTown=me.mats.gel, sTown=me.stash.length, lv=me.lv;
  dive("plain");
  me.gold+=300; me.mats.gel=(me.mats.gel||0)+4; me.bag.napalm=2;
  me.stash.push({id:"x_test",n:"ためし",slot:"armor",tier:1});
  goTown("wipe");await drain();
  L.push(`④ 全滅 → 金貨 ${gTown+300}→${me.gold}（町の値 ${gTown}）　`+
    `ゲル ${mTown+4}→${me.mats.gel||0}（${mTown}）　予備装備 ${sTown+1}→${me.stash.length}（${sTown}）　Lv ${lv}→${me.lv}`);
  if(me.gold!==gTown)bad.push("全滅で 金貨が町の値に戻っていない");
  if((me.mats.gel||0)!==mTown)bad.push("全滅で 素材が戻っていない");
  if(me.stash.length!==sTown)bad.push("全滅で 拾った装備が残っている");
  if(me.bag.napalm)bad.push("全滅で 拾った道具が残っている");
  if(me.lv!==lv)bad.push("全滅で レベルが減った");

  /* ⑤ 控えと読み込み（町にいる状態） */
  runSave();
  const savedGold=me.gold;
  me=null;party=[];RUN=null;
  runResume();await new Promise(r=>setTimeout(r,60));await drain();
  L.push(`⑤ 町の控えを読む → 人数 ${party.length}　金貨 ${me.gold}　画面 ${curScreen}　RUN=${RUN===null?"null":"あり"}`);
  if(me.gold!==savedGold)bad.push("町の控えで金貨が変わった");
  if(party.length!==1)bad.push("町の控えで人数が違う: "+party.length);   /* ひとりで始まる */

  /* ⑥ 控えと読み込み（潜行中） */
  dive("plain");runSave();
  const key=RUN.curKey;
  me=null;party=[];RUN=null;
  runResume();await new Promise(r=>setTimeout(r,60));await drain();
  L.push(`⑥ 潜行中の控えを読む → 画面 ${curScreen}　RUN=${!!RUN}　entry=${!!(RUN&&RUN.entry)}`);
  if(curScreen!=="floor")bad.push("潜行中の控えなのに 地図に戻らない: "+curScreen);
  if(!RUN||!RUN.entry)bad.push("潜行中の控えで entry が消えた");

  /* ⑦ 潜れる先 */
  L.push(`⑦ 潜れる先（まだ何も抜けていない）　${diveTargets().map(k=>AREAS[k].n.replace(/ /g,"")).join("・")}`);
  if(diveTargets().length!==1)bad.push("何も抜けていないのに 先が開いている");
  META.areas.plain=true;
  L.push(`   草原を抜けたあと　${diveTargets().map(k=>AREAS[k].n.replace(/ /g,"")).join("・")}`);
  META.areas.cave=true;
  L.push(`   洞窟も抜けたあと　${diveTargets().map(k=>AREAS[k].n.replace(/ /g,"")).join("・")}`);
  return {L,bad};
});
console.log(out.L.join("\n"));
console.log(out.bad.length?"⚠ "+out.bad.join("\n⚠ "):"町と持ち帰り 問題なし");
console.log("ERR",errs.slice(0,6));
await b.close();
