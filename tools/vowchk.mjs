/* ===== 宣言（傲慢）が働いているか（α1.0.065） =====
   ① 告げた相手に 恐怖が乗る（効き判定を通してから）
   ② 誓いは 判定に関わらず立つ ── そちらが この手の本体
   ③ 誓った相手への一撃に 誓い ×2 と 先手必勝 +30% が乗る
   使い方: node tools/vowchk.mjs                                          */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:390,height:844}});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/index.html');await pg.waitForTimeout(800);
const out=await pg.evaluate(async()=>{
  const L=[],bad=[];
  window.ovMsg=()=>{};window.ovHide=()=>{};window.rollDice=async()=>0;window.wait=async()=>{};
  slot=0;sel.job="knight";sel.race="hume";sel.orig="pride";
  newGame();
  let g=0;while(g++<14&&modalOpen()){const b=document.querySelector("#mbox [data-i]")
    ||document.querySelector("#mbox .ndbtn button:last-child");if(!b)break;b.click();
    await new Promise(r=>setTimeout(r,8));}
  me.sk=REW.act.pride.map(s=>({...s,cdLeft:0}));
  me.pass=REW.pass.pride.map(p=>({...p}));
  dive("plain");sel.enc="s_gb";RUN.elite=false;RUN.boss=false;
  await startBattle();
  cur=me;busy=false;me.MP=me.maxMP;
  const f=foes[0];
  const decl=me.sk.find(s=>s.id==="apr1");
  L.push(`① 宣言の札 恐怖 ${JSON.stringify(decl.ail)}`);
  if(!decl.ail||!decl.ail.length)bad.push("宣言に 恐怖が付いていない");
  /* 効き判定を通す。出目を握るのは この一手のあいだだけ ──
     newGame の前から握ると 乱数を待つところで止まる */
  const rnd=Math.random; Math.random=()=>0.99;
  await resolvePlayer({kind:"skill",i:me.sk.indexOf(decl)}, f);
  Math.random=rnd;
  L.push(`   誓い ${JSON.stringify(me.vow)}`);
  L.push(`   相手の状態 ${(f.ail||[]).map(a=>AIL[a.k].n+" "+a.v+"("+(a.t+1)+"ターン)").join("・")||"なし"}`);
  if(!me.vow)bad.push("誓いが立っていない");
  if(!ailHas(f,"fear"))bad.push("恐怖が乗っていない");
  /* ③ 先手必勝 */
  const win=me.pass.find(p=>p.id==="ppr1");
  L.push(`③ 先手必勝 ${JSON.stringify(win.ef)}　passOn("vowp") = ${passOn("vowp",me)}`);
  if(passOn("vowp",me)!==30)bad.push("先手必勝が 誓いに乗らない");
  return {L,bad};
});
console.log(out.L.join('\n'));
if(errs.length)console.log('ERR\n'+errs.join('\n'));
console.log(out.bad.length?'\n✗ '+out.bad.join('\n✗ '):'\n✓ 宣言は 誓いを立て、相手を竦ませる');
await b.close();
process.exit(out.bad.length||errs.length?1:0);
