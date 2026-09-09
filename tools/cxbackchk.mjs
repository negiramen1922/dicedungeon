/* ===== 図鑑の「もどる」が 来たところへ帰るか（α1.0.069） =====
   〔不具合〕戦いの最中に 敵の詳細 →「図鑑」と辿って もどると、
   **いつも町へ帰されて 潜行が途切れていた**（盤ごと消える）。
   ① 戦いから開いたら 戦いへ戻る　② 町から開いたら 町へ戻る
   使い方: node tools/cxbackchk.mjs                                       */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:390,height:844}});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/index.html');await pg.waitForTimeout(900);
const out=await pg.evaluate(async()=>{
  const L=[],bad=[];
  window.ovMsg=()=>{};window.ovHide=()=>{};window.rollDice=async()=>0;window.wait=async()=>{};
  slot=0;sel.job="knight";sel.race="hume";sel.orig="greed";
  newGame();
  let g=0;while(g++<14&&modalOpen()){const b=document.querySelector("#mbox [data-i]")
    ||document.querySelector("#mbox .ndbtn button:last-child");if(!b)break;b.click();
    await new Promise(r=>setTimeout(r,8));}
  dive("plain");sel.enc="s_gb";RUN.elite=false;RUN.boss=false;
  showScreen("fight");
  await startBattle();
  const f=foes[0], hp0=f.HP, rnd=(RUN&&RUN.curKey);
  L.push(`① 戦い中　画面 ${curScreen}　敵 ${f.name} HP ${hp0}　RUN ${!!RUN}`);
  /* 敵の詳細 → 図鑑 */
  foeModal(f);
  const cx=document.querySelector('#mbox [data-fx="cx"]');
  L.push(`   敵の詳細に 図鑑の札 ${!!cx}`);
  if(!cx)bad.push("敵の詳細に 図鑑の札が無い");
  else cx.click();
  await new Promise(r=>setTimeout(r,30));
  L.push(`   図鑑へ → 画面 ${curScreen}`);
  if(curScreen!=="codex")bad.push("図鑑が開いていない");
  /* もどる */
  document.querySelector("#cxBack").click();
  await new Promise(r=>setTimeout(r,30));
  L.push(`② もどる → 画面 ${curScreen}　敵 ${foes&&foes.length?foes[0].name+" HP "+foes[0].HP:"いない"}　RUN ${!!RUN}`);
  if(curScreen!=="fight")bad.push("戦いへ戻らない（"+curScreen+"へ行った）");
  if(!RUN)bad.push("潜行が消えた");
  if(!foes||!foes.length||foes[0].HP!==hp0)bad.push("盤が作り直されている");
  /* ③ 町から開いたら 町へ戻る */
  goTown("leave");
  L.push(`③ 町へ　画面 ${curScreen}`);
  $("#hCodex").click();
  await new Promise(r=>setTimeout(r,30));
  L.push(`   町から図鑑 → ${curScreen}`);
  document.querySelector("#cxBack").click();
  await new Promise(r=>setTimeout(r,30));
  L.push(`   もどる → ${curScreen}`);
  if(curScreen!=="home")bad.push("町から開いた図鑑が 町へ戻らない");
  return {L,bad};
});
console.log(out.L.join('\n'));
if(errs.length)console.log('ERR\n'+errs.join('\n'));
console.log(out.bad.length?'\n✗ '+out.bad.join('\n✗ '):'\n✓ 図鑑の もどるは 来たところへ帰る');
await b.close();
process.exit(out.bad.length||errs.length?1:0);
