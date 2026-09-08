/* はじめかたの二択・見立てからの道・遊び方の戻り（α1.0.052） */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const file=process.argv[2]||'index.html';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:430,height:930}});
const errs=[];pg.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
await pg.goto('http://localhost:8765/'+file);await pg.waitForTimeout(800);
const out=await pg.evaluate(async()=>{
  const L=[],bad=[];
  window.wait=async()=>{};
  const scr=()=>curScreen+(modalOpen()?"+窓":"");
  const drain=async()=>{let g=0;while(g++<14&&modalOpen()){
    const q=document.querySelector("#mbox [data-i]")
      ||document.querySelector("#mbox .ndbtn button:last-child")
      ||document.querySelector("#mbox [data-skip]");if(!q)break;q.click();
    await new Promise(r=>setTimeout(r,8));}};
  try{for(let i=0;i<SLOTS;i++)localStorage.removeItem("dd.run."+i);}catch(e){}

  /* ① 表題の札は 2つだけ */
  goTitle();
  const btns=[...document.querySelectorAll("#title .homemenu button")]
    .filter(b=>!b.classList.contains("hide")).map(b=>b.textContent.replace(/\s/g,""));
  L.push(`① 表題の札 ${btns.join(" / ")}`);
  if(btns.length!==2)bad.push("表題の札が 2つではない: "+btns.join("/"));

  /* ② 遊び方から 戻れる */
  drawTut();showScreen("tut");
  L.push(`② 遊び方へ → ${scr()}　もどる札 ${!!$("#tutBack")}　下の札「${$("#tutOK").textContent.replace(/\s/g,"")}」`);
  if(!$("#tutBack"))bad.push("遊び方に もどる札が無い");
  if(/草原/.test($("#tutOK").textContent))bad.push("「原始の草原へ」が残っている");
  $("#tutBack").click();
  L.push(`   もどる → ${scr()}`);
  if(curScreen!=="title")bad.push("遊び方から 表題へ戻れない");

  /* ③ 空の枠を開くと はじめかたの二択 */
  drawSlots();showScreen("slots");
  openSlot(0);
  const ways=[...document.querySelectorAll("#mbox [data-way]")].map(b=>b.dataset.way);
  L.push(`③ 空の枠 → ${scr()}　二択 ${ways.join(" / ")}`);
  if(ways.length!==2)bad.push("はじめかたの二択が 出ていない");

  /* ④ アンケートから → 見立て → 色の段へ */
  document.querySelector('#mbox [data-way="quiz"]').click();
  L.push(`④ アンケートから → ${scr()}　問い ${qzStep+1}/${QUIZ.length}`);
  if(curScreen!=="quiz")bad.push("見立てへ飛んでいない");
  for(let i=0;i<QUIZ.length;i++){
    const a=document.querySelector("#qzBody [data-i]");
    if(!a)break; a.click(); await new Promise(r=>setTimeout(r,10));
  }
  L.push(`   答え終わり → ${scr()}　この組み合わせで作る ${!!$("#qzGo")}　自分で選ぶ ${!!$("#qzFree")}`);
  if(!$("#qzGo"))bad.push("見立ての結果が出ていない");
  $("#qzGo").click();
  const lookAt=MKSTEPS.findIndex(x=>x.k==="__look");
  L.push(`   この組み合わせで作る → ${scr()}　段 ${mkStep}（見た目は ${lookAt}）　色の札 ${
    document.querySelectorAll("#mkBody [data-col]").length}`);
  if(curScreen!=="make")bad.push("キャラ作成へ行っていない");
  if(mkStep!==lookAt)bad.push("見た目の段に飛んでいない");
  if(!document.querySelectorAll("#mkBody [data-col]").length)bad.push("色の札が出ていない");

  /* ⑤ そこから 戻って 手で直せる */
  $("#mkPrev").click();
  L.push(`⑤ ひとつもどる → 段 ${mkStep}（${MKSTEPS[mkStep].ttl}）`);
  if(mkStep!==lookAt-1)bad.push("見た目の段から 戻れない");
  const pick=document.querySelector("#mkBody [data-k]:not([disabled])");
  if(pick){pick.click();L.push(`   選び直して → 段 ${mkStep}`);}
  if(mkStep!==lookAt)bad.push("選び直したあと 見た目へ戻らない");

  /* ⑥ 作り終わると 出立の支度は出ない */
  $("#mkLookGo").click();
  /* 名前の段（α1.0.063）。空のまま進む */
  if($("#mkNameGo"))$("#mkNameGo").click();
  /* 幸運を振る演出が終わるまで待つ（cwait は wait とは別もの） */
  for(let i=0;i<200&&!$("#mkNext");i++)await new Promise(r=>setTimeout(r,30));
  if(!$("#mkNext"))bad.push("確認の札が出ない");
  else $("#mkNext").click();
  await new Promise(r=>setTimeout(r,80));
  const seen=[];
  let g=0;
  while(g++<14&&modalOpen()){
    const t=$("#mbox").querySelector(".mtitle");
    seen.push(t?t.textContent.replace(/\s/g,""):"—");
    const q=document.querySelector("#mbox [data-i]")
      ||document.querySelector("#mbox .ndbtn button:last-child")
      ||document.querySelector("#mbox [data-skip]");
    if(!q)break;q.click();await new Promise(r=>setTimeout(r,10));
  }
  L.push(`⑥ 作り終わり → ${scr()}　出た窓 ${seen.join("→")||"なし"}`);
  /* 「出 立」は 町に着いたことを告げる窓。消したのは「出立の支度」（装備配り） */
  if(seen.some(t=>/支度/.test(t)))bad.push("出立の支度（装備配り）が まだ出る");
  L.push(`   持ち物　武器 ${me&&me.eq.wep?me.eq.wep.n:"素手のまま"}　防具 ${
    me&&me.eq.armor?me.eq.armor.n:"なし"}　倉庫 ${me?store().length:"—"}`);
  if(me&&(me.eq.wep||me.eq.armor||store().length))bad.push("装備が配られている");

  /* ⑦ 自分でつくる の道 */
  goTitle();drawSlots();showScreen("slots");
  openSlot(1);
  document.querySelector('#mbox [data-way="self"]').click();
  L.push(`⑦ 自分でつくる → ${scr()}　段 ${mkStep}（${MKSTEPS[mkStep].ttl}）`);
  if(mkStep!==0)bad.push("自分でつくるが 職の段から始まらない");

  /* ⑧ 作成のもどるで はじめかたへ */
  $("#mkBack").click();
  L.push(`⑧ 作成のもどる → ${scr()}　二択 ${document.querySelectorAll("#mbox [data-way]").length}`);
  if(!document.querySelectorAll("#mbox [data-way]").length)bad.push("もどると はじめかたへ帰らない");
  return {L,bad};
});
console.log(out.L.join("\n"));
if(errs.length)console.log(errs.join("\n"));
if(out.bad.length){console.log("\n⚠ "+out.bad.join("\n⚠ "));process.exitCode=1;}
else console.log("\n✓ はじめかたの二択・見立ての道・遊び方の戻り すべて通った");
await b.close();
