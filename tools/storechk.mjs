/* 倉庫と ひとりずつの装備（α1.0.040） */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const file=process.argv[2]||'index.html';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:430,height:930}});
const errs=[];pg.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
await pg.goto('http://localhost:8765/'+file);await pg.waitForTimeout(800);
const out=await pg.evaluate(async()=>{
  const L=[],bad=[];
  window.ovMsg=()=>{};window.ovHide=()=>{};window.wait=async()=>{};
  slot=0; sel.job="knight";sel.race="hume";sel.orig="wrath";
  newGame();
  let g=0;while(g++<14&&modalOpen()){const b=document.querySelector("#mbox [data-i]")
    ||document.querySelector("#mbox .ndbtn button:last-child")
    ||document.querySelector("#mbox [data-skip]");if(!b)break;b.click();
    await new Promise(r=>setTimeout(r,8));}
  const mate=makeMate("mage","elf",3); setParty([...party,mate]);

  /* ② パーティの職ぶんの得物が 落ちてくる */
  const jobs=[...new Set(catPool("gear").filter(x=>x.slot==="wep")
    .map(x=>wepJobOf(x.key)))];
  L.push(`② 落ちる得物の職 ${jobs.join("・")}（パーティ ${[...new Set(party.map(u=>u.job))].join("・")}）`);
  if(!jobs.includes("mage"))bad.push("仲間の職の得物が 落ちてこない");

  /* ① 拾ったものは 誰にも着かず 倉庫へ */
  me.stash=[];
  const wep0=me.eq.wep, arm0=me.eq.armor;
  const pool=catPool("gear");
  const gs=pool.slice(0,6);
  gs.forEach(x=>applyReward("gear",x));
  L.push(`① 装備 ${gs.length} 個を得た → 倉庫 ${store().length}　主人公の武器 ${
    me.eq.wep?me.eq.wep.n:"素手のまま"}　防具 ${me.eq.armor?me.eq.armor.n:"なし"}`);
  if(store().length!==gs.length)bad.push("倉庫に入っていない");
  if(me.eq.wep!==wep0||me.eq.armor!==arm0)bad.push("勝手に装備された");

  /* ③ 仲間の欄が 開ける */
  chWho=party.indexOf(mate); chNow="eq"; charModal(null);
  const tabs=[...document.querySelectorAll("#mbox [data-ch]")].map(b=>b.dataset.ch);
  L.push(`③ ${mate.short} の窓の札 ${tabs.join(" ")}`);
  if(!tabs.includes("eq"))bad.push("仲間の窓に 装備の札が無い");
  if(tabs.includes("bag"))bad.push("仲間の窓に 持ち物（共有）の札が出ている");

  /* ④ 職の合う得物だけ 着けられる */
  const iM=store().findIndex(x=>x.slot==="wep"&&wepJobOf(x.key)==="mage");
  const iK=store().findIndex(x=>x.slot==="wep"&&wepJobOf(x.key)==="knight");
  L.push(`④ 倉庫に 魔道士の得物 ${iM>=0}　騎士の得物 ${iK>=0}`);
  if(iM>=0&&iK>=0){
    const bM=document.querySelector(`#mbox [data-eq="${iM}"]`);
    const bK=document.querySelector(`#mbox [data-eq="${iK}"]`);
    L.push(`　 ${mate.short} の窓　魔道士の得物 押せる=${bM&&!bM.disabled}　騎士の得物 押せる=${bK&&!bK.disabled}（${bK?bK.textContent.trim():"—"}）`);
    if(!bM||bM.disabled)bad.push("職の合う得物が 着けられない");
    if(!bK||!bK.disabled)bad.push("職の合わない得物が 着けられてしまう");
    const n0=store().length;
    bM.click();
    L.push(`　 着けた → ${mate.short} の武器 ${mate.eq.wep?mate.eq.wep.n:"なし"}　倉庫 ${n0}→${store().length}　主人公の武器 ${me.eq.wep?me.eq.wep.n:"素手"}`);
    if(!mate.eq.wep)bad.push("仲間に着かなかった");
    if(store().length!==n0-1)bad.push("倉庫から減っていない");
    if(me.eq.wep)bad.push("主人公にも着いた");
  }

  /* ⑤ 外すと 倉庫へ戻る */
  chWho=party.indexOf(mate); chNow="eq"; charModal(null);
  const off=document.querySelector('#mbox [data-off="wep"]');
  const n1=store().length;
  L.push(`⑤ 外す札 ${!!off}`);
  if(!off)bad.push("外す札が無い");
  else{ off.click();
    L.push(`　 外した → ${mate.short} の武器 ${mate.eq.wep?mate.eq.wep.n:"なし"}　倉庫 ${n1}→${store().length}`);
    if(mate.eq.wep)bad.push("外れていない");
    if(store().length!==n1+1)bad.push("倉庫へ戻っていない");
  }

  /* ⑥ 潜って全滅すると 仲間の装備も 町の姿に戻る */
  closeModal();
  const iM2=store().findIndex(x=>x.slot==="wep"&&wepJobOf(x.key)==="mage");
  stashEquip(iM2,mate);
  const townWep=mate.eq.wep, townN=store().length;
  dive("plain");
  const iM3=store().findIndex(x=>x.slot==="wep"&&wepJobOf(x.key)==="mage");
  if(iM3>=0)stashEquip(iM3,mate);
  const diveWep=mate.eq.wep;
  goTown("wipe");
  let gg=0;while(gg++<14&&modalOpen()){const b=document.querySelector("#mbox .ndbtn button:last-child");if(!b)break;b.click();await new Promise(r=>setTimeout(r,8));}
  L.push(`⑥ 町 ${townWep&&townWep.n} → 潜行中 ${diveWep&&diveWep.n} → 全滅後 ${mate.eq.wep&&mate.eq.wep.n}　倉庫 ${townN}→${store().length}`);
  if(mate.eq.wep!==townWep)bad.push("全滅で 仲間の装備が町の姿に戻っていない");

  return {L,bad};
});
console.log(out.L.join("\n"));
if(errs.length)console.log(errs.join("\n"));
if(out.bad.length){console.log("\n⚠ "+out.bad.join("\n⚠ "));process.exitCode=1;}
else console.log("\n✓ 倉庫に入り、誰にでも着けられる");
await b.close();
