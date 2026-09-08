/* ===== 倉庫と 誰に着けるか（α1.0.058 で新しい画面に合わせ直した） =====
   ① 拾った装備は 勝手に着かず 倉庫へ入る
   ② 得物は パーティにいる職ぶん落ちる
   ③ 仲間の画面にも 装備がある（持ち物は主人公だけなので メニューから）
   ④ 職の合う得物だけ着けられる。合わないものは 理由が出て押せない
   ⑤ 外すと 倉庫へ戻る
   ⑥ 倉庫の一覧に **装備中のものは出ない**（仕様 A-8）
   使い方: node tools/storechk.mjs                                        */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:390,height:844}});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/index.html');await pg.waitForTimeout(800);
const out=await pg.evaluate(()=>{
  const L=[],bad=[];
  const Q=s=>document.querySelector("#ui "+s);
  const QA=s=>[...document.querySelectorAll("#ui "+s)];
  sel.job="knight";sel.race="hume";sel.orig="greed";newGame();closeModal();
  for(let i=1;i<24;i++){me.lv++;growUp();syncMates();}
  const mate=makeMate("mage","elf",me.lv);
  setParty([me,mate]);
  /* ② 落ちる得物の職 */
  const jobs=[...new Set(catPool("gear").filter(g=>g.slot==="wep")
    .map(g=>{for(const j in GEAR.wep)if(GEAR.wep[j].some(x=>x.key===g.key))return j;}))];
  L.push(`② 落ちる得物の職 ${jobs.join("・")}（パーティ ${
    [...new Set(party.map(u=>u.job))].join("・")}）`);
  if(!jobs.includes("mage"))bad.push("仲間の職の得物が 落ちてこない");
  /* ① 拾ったものは倉庫へ */
  const wep0=me.eq.wep, arm0=me.eq.armor;
  const gs=[].concat((GEAR.wep.mage||[]).slice(0,1).map(g=>({...g,slot:"wep"})),
    (GEAR.wep.knight||[]).slice(0,1).map(g=>({...g,slot:"wep"})),
    GEAR.armor.slice(0,1).map(g=>({...g,slot:"armor"})));
  me.stash=[];gs.forEach(g=>applyReward("gear",g));
  L.push(`① 装備 ${gs.length} 個を得た → 倉庫 ${store().length}　主人公の武器 ${
    me.eq.wep?me.eq.wep.n:"素手のまま"}　防具 ${me.eq.armor?me.eq.armor.n:"なし"}`);
  if(store().length!==gs.length)bad.push("倉庫に入っていない");
  if(me.eq.wep!==wep0||me.eq.armor!==arm0)bad.push("勝手に装備された");
  /* ③ 仲間の装備の画面へ */
  UI.who=1;uiEnter("gear");
  const who=Q(".uihd .uin").textContent.trim();
  L.push(`③ ‹ › で ${who} の装備へ　倉庫の行 ${QA(".strow").length}`);
  if(who!==rosterName(mate))bad.push("仲間の画面になっていない");
  /* ④ 職の合う／合わない */
  const btns=QA('[data-uk="pickgear"][data-w="1"]');
  const txt=btns.map(x=>x.textContent.replace(/\s+/g," ").trim());
  const okN=btns.filter(x=>!x.disabled).length;
  L.push(`④ ${rosterName(mate)} の欄の札 ${btns.length}　押せる ${okN}`);
  L.push(`　 ${txt.join(" ／ ")}`);
  if(!okN)bad.push("職の合う得物が 一つも着けられない");
  if(okN===btns.length)bad.push("職の合わない得物も 着けられてしまう");
  if(!btns.some(x=>x.disabled&&/得物/.test(x.textContent)))
    bad.push("着けられない理由が 出ていない");
  /* 着ける（品を選ぶ → 枠を選ぶ の2タップ） */
  const n0=store().length;
  btns.find(x=>!x.disabled).click();
  const slot=Q('[data-uk="slotin"]');
  L.push(`　 品を選んだ → 枠の札 ${!!slot}`);
  if(!slot)bad.push("枠を選ぶ札が出ない");
  else{
    slot.click();
    L.push(`　 着けた → ${rosterName(mate)} の武器 ${mate.eq.wep?mate.eq.wep.n:"なし"}`
      +`　倉庫 ${n0}→${store().length}　主人公の武器 ${me.eq.wep?me.eq.wep.n:"素手"}`);
    if(!mate.eq.wep)bad.push("仲間に着かなかった");
    if(store().length!==n0-1)bad.push("倉庫から減っていない");
    if(me.eq.wep)bad.push("主人公にも着いた");
  }
  /* ⑥ 装備中のものは倉庫の一覧に出ない */
  const shown=QA(".strow .sn").map(x=>x.textContent.trim());
  const eqn=mate.eq.wep?mate.eq.wep.n:"";
  L.push(`⑥ 倉庫の一覧 ${shown.length} 件　装備中「${eqn}」が出ている ${
    shown.some(t=>t.includes(eqn))}`);
  if(eqn&&shown.some(t=>t.includes(eqn)))bad.push("装備中の品が 倉庫の一覧に出ている");
  /* ⑤ 外す */
  const off=Q('[data-uk="off"][data-s="wep"]');
  L.push(`⑤ 外す札 ${!!off}`);
  if(!off)bad.push("外す札が無い");
  else{
    const n1=store().length; off.click();
    L.push(`　 外した → ${rosterName(mate)} の武器 ${mate.eq.wep?mate.eq.wep.n:"なし"}`
      +`　倉庫 ${n1}→${store().length}`);
    if(mate.eq.wep)bad.push("外れていない");
    if(store().length!==n1+1)bad.push("倉庫へ戻っていない");
  }
  return {L,bad};
});
console.log(out.L.join("\n"));
if(errs.length)console.log("\nERR "+errs.slice(0,3).join("\n"));
if(out.bad.length){console.log("\n⚠ "+out.bad.join("\n⚠ "));process.exitCode=1;}
else console.log("\n✓ 倉庫に入り、誰にでも着けられる");
await b.close();
