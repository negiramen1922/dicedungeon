/* ===== 覚えたものは失わず、入れ替えは戦っていないあいだだけ =====
   （α1.0.058 で新しい画面に合わせ直した）
   ① 枠に入りきらない技・癖は 控えへ回り、消えない
   ② 拾った装備は 倉庫へ
   ③ 町では入れ替えられる。控えへ回す → 持ち出す が通る
   ④ 戦いのあいだは 入れ替えられず、理由が出る
   ⑤ **枠が満杯でも 行き止まりにしない**（仕様 R-8）──
      札は「入れ替え」に変わり、控え→枠 の2タップで差し替わる
   ⑥ 全滅しても 覚えたものは減らない
   使い方: node tools/bagchk.mjs                                          */
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
  setParty([me]);
  /* ① 枠を越えて覚える */
  const pool=[].concat(REW.act.common,REW.act.knight,REW.act.hume);
  me.sk=[];me.bagSk=[];
  pool.forEach(r=>applyReward("act",r));
  const n=pool.length;
  L.push(`① スキルを ${n} 個 覚えた → 枠 ${me.sk.length}/${SKMAX}　控え ${bagOf(me,"act").length}`);
  if(me.sk.length!==SKMAX)bad.push("枠が埋まりきっていない");
  if(me.sk.length+bagOf(me,"act").length!==n)bad.push("覚えたものが消えた");
  const ppool=[].concat(REW.pass.common,REW.pass.knight,REW.pass.hume);
  me.pass=[];me.bagPass=[];
  ppool.forEach(r=>applyReward("pass",r));
  L.push(`　 パッシブを ${ppool.length} 個 → 枠 ${me.pass.length}/${PASSMAX}　控え ${bagOf(me,"pass").length}`);
  if(me.pass.length+bagOf(me,"pass").length!==ppool.length)bad.push("パッシブが消えた");
  /* ② 装備は倉庫へ */
  me.stash=[];
  const gp=[].concat((GEAR.wep.knight||[]).slice(0,2).map(g=>({...g,slot:"wep"})),
    GEAR.acc.slice(0,5).map(g=>({...g,slot:"acc"})));
  gp.forEach(g=>applyReward("gear",g));
  L.push(`② 装備を ${gp.length} 個 → 倉庫 ${store().length}`);
  if(store().length!==gp.length)bad.push("倉庫から溢れて消えた");
  /* ③⑤ 町での入れ替え。満杯でも行き止まりにしない */
  UI.who=0;UI.skTab="act";uiEnter("skill");
  L.push(`③ 町で入れ替え可 ${canSwap()}`);
  if(!canSwap())bad.push("町で入れ替えられない");
  const take=QA('[data-uk="take"]'), pick=QA('[data-uk="pick"]');
  L.push(`⑤ 枠 ${me.sk.length}/${SKMAX}（満杯）→ 控えの札「${
    pick.length?pick[0].textContent.trim():take.length?take[0].textContent.trim():"—"}」`
    +`　持ち出す ${take.length}　入れ替え ${pick.length}`);
  if(!pick.length)bad.push("満杯なのに 入れ替えの札が出ない");
  if(pick.some(x=>x.disabled))bad.push("満杯のとき 札が全部死んでいる（行き止まり）");
  /* 控え→枠 の2タップ */
  const was=me.sk[0].id, bagWas=bagOf(me,"act")[0].id, bn0=bagOf(me,"act").length;
  pick[0].click();
  const slots=QA('[data-uk="swapin"]');
  L.push(`　 控えを選んだ → 枠の札 ${slots.length}`);
  if(slots.length!==SKMAX)bad.push("枠が ぜんぶ出ていない");
  slots[0].click();
  L.push(`　 枠を選んだ → 枠 ${me.sk.length}　控え ${bn0}→${bagOf(me,"act").length}`
    +`　入った ${me.sk[0].id===bagWas}　出た ${bagOf(me,"act").some(x=>x.id===was)}`);
  if(me.sk.length!==SKMAX)bad.push("枠の数が変わった");
  if(me.sk[0].id!==bagWas)bad.push("選んだ技が 枠に入っていない");
  if(!bagOf(me,"act").some(x=>x.id===was))bad.push("外した技が 控えに戻っていない");
  if(bagOf(me,"act").length!==bn0)bad.push("控えの数が合わない");
  /* ④ 戦いのあいだ */
  dive("plain");sel.enc=(AREAS.plain.norm||[])[0];
  showScreen("fight");foes=makeFoes();over=false;
  const why=swapWhy();
  uiEnter("skill");
  const dis=[...document.querySelectorAll("#mbox [data-uk=take],#mbox [data-uk=pick]")];
  const warn=document.querySelector("#mbox .uiwarn");
  L.push(`④ 戦いのあいだ 入れ替え可 ${canSwap()}　わけ「${why}」　断りの帯 ${!!warn}`
    +`　押せない札 ${dis.filter(x=>x.disabled).length}/${dis.length}`);
  if(canSwap())bad.push("戦いのあいだに入れ替えられる");
  if(!warn)bad.push("戦いのあいだ 理由が出ていない");
  if(dis.length&&dis.some(x=>!x.disabled))bad.push("戦いのあいだ 札が押せる");
  /* ⑥ 全滅しても減らない */
  const s0=me.sk.length,b0=bagOf(me,"act").length,p0=me.pass.length;
  over=true;goTown("wipe");
  L.push(`⑥ 全滅 → 技 ${s0}→${me.sk.length}　控え ${b0}→${bagOf(me,"act").length}　癖 ${p0}→${me.pass.length}`);
  if(me.sk.length!==s0||bagOf(me,"act").length!==b0||me.pass.length!==p0)
    bad.push("全滅で 覚えたものが減った");
  return {L,bad};
});
console.log(out.L.join("\n"));
if(errs.length)console.log("\nERR "+errs.slice(0,3).join("\n"));
if(out.bad.length){console.log("\n⚠ "+out.bad.join("\n⚠ "));process.exitCode=1;}
else console.log("\n✓ 覚えたものは失わず、満杯でも行き止まりにならない");
await b.close();
