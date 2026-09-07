/* 覚えたものは失わない ／ 入れ替えは戦っていないあいだ（α1.0.043） */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const file=process.argv[2]||'index.html';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:430,height:930}});
const errs=[];pg.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
await pg.goto('http://localhost:8765/'+file);await pg.waitForTimeout(800);
const out=await pg.evaluate(async()=>{
  const L=[],bad=[];
  window.wait=async()=>{};window.ovMsg=()=>{};window.ovHide=()=>{};
  const pick=()=>{const b=document.querySelector("#mbox [data-i]")
    ||document.querySelector("#mbox .ndbtn button:last-child")
    ||document.querySelector("#mbox [data-skip]");if(b){b.click();return true;}return false;};
  const drain=async()=>{let g=0;while(g++<14&&modalOpen()&&pick())await new Promise(r=>setTimeout(r,8));};

  slot=0; sel.job="knight";sel.race="hume";sel.orig="wrath";
  newGame();await drain();

  /* ① 枠より多く覚えても 消えない */
  const pool=REW.act.common.concat(REW.act.knight||[],REW.act.hume||[],REW.act.wrath||[]);
  me.sk=[];me.bagSk=[];owned=[];
  let n=0;
  for(const r of pool){ if(n>=SKMAX+4)break; applyReward("act",r); n++; }
  L.push(`① スキルを ${n} 個 覚えた → 枠 ${me.sk.length}/${SKMAX}　控え ${bagOf(me,"act").length}`);
  if(me.sk.length!==SKMAX)bad.push("枠が埋まりきっていない");
  if(me.sk.length+bagOf(me,"act").length!==n)bad.push("覚えたものが消えた");

  const pp=REW.pass.common.concat(REW.pass.knight||[],REW.pass.hume||[],REW.pass.wrath||[]);
  me.pass=[];me.bagPass=[];
  let m=0;
  for(const r of pp){ if(m>=PASSMAX+3)break; applyReward("pass",r); m++; }
  L.push(`　 パッシブを ${m} 個 → 枠 ${me.pass.length}/${PASSMAX}　控え ${bagOf(me,"pass").length}`);
  if(me.pass.length+bagOf(me,"pass").length!==m)bad.push("パッシブが消えた");

  /* ② 装備の予備に上限が無い */
  const gpool=catPool("gear").slice(0,9);
  me.stash=[];
  gpool.forEach(g=>applyReward("gear",g));
  L.push(`② 装備を ${gpool.length} 個 → 予備 ${me.stash.length}　装飾 ${(me.eq.acc||[]).length}/${ACCMAX}`);
  if(me.stash.length+ (me.eq.acc||[]).length < gpool.length-2)bad.push("予備が溢れて消えた");

  /* ③ 町では入れ替えられる */
  L.push(`③ 町で入れ替え可 ${canSwap()}`);
  if(!canSwap())bad.push("町で入れ替えられない");
  chNow="sk"; charModal(null);
  const off=document.querySelector("#mbox [data-skoff]");
  const on0=document.querySelector("#mbox [data-skon]");
  L.push(`　 窓に 控えへ札 ${!!off}　持ち出す札 ${!!on0}（満杯なので押せない=${on0?on0.disabled:"—"}）`);
  if(!off)bad.push("町なのに『控えへ』の札が無い");
  if(!on0)bad.push("控えがあるのに『持ち出す』の札が無い");
  if(on0&&!on0.disabled)bad.push("枠が満杯なのに 持ち出す札が押せる");
  const wasTop=me.sk[0].id, bagN=bagOf(me,"act").length;
  if(off)off.click();
  L.push(`　 ${wasTop} を控えへ → 枠 ${me.sk.length}　控え ${bagOf(me,"act").length}`);
  if(me.sk.length!==SKMAX-1)bad.push("控えへ回っていない");
  if(bagOf(me,"act").length!==bagN+1)bad.push("控えに入っていない");
  if(!bagOf(me,"act").some(x=>x.id===wasTop))bad.push("控えに 別のものが入った");
  const on=document.querySelector("#mbox [data-skon]");
  L.push(`　 空きができて 持ち出す札が押せる=${on&&!on.disabled}`);
  if(!on||on.disabled)bad.push("空きがあるのに 持ち出せない");
  const willBe=bagOf(me,"act")[+on.dataset.skon].id;
  on.click();
  L.push(`　 ${willBe} を持ち出した → 枠 ${me.sk.length}　控え ${bagOf(me,"act").length}`);
  if(!me.sk.some(x=>x.id===willBe))bad.push("持ち出せていない");
  if(me.sk.some(x=>x.cdLeft===undefined))bad.push("持ち出した技の cdLeft が無い");
  closeModal();

  /* ④ 潜行中でも 戦っていなければ 入れ替えられる（α1.0.043） */
  dive("plain");
  RUN.cur={t:"fight",r:0,name:"—"};
  L.push(`④ 潜行中の戦いの部屋（戦闘には入っていない） → 入れ替え可 ${canSwap()}`);
  if(!canSwap())bad.push("戦っていないのに 入れ替えられない");
  chNow="sk"; charModal(null);
  if(!document.querySelector("#mbox [data-skoff]"))bad.push("道の途中で 入れ替えの札が出ない");
  closeModal();
  RUN.cur={t:"rest",r:1,name:"焚き火"};
  L.push(`　 焚き火の部屋 → 入れ替え可 ${canSwap()}`);
  if(!canSwap())bad.push("焚き火で入れ替えられない");
  /* 戦いのあいだだけ 動かせない */
  const scr0=curScreen, ov0=over;
  curScreen="fight"; over=false;
  L.push(`　 戦いのあいだ → 入れ替え可 ${canSwap()}　わけ「${swapWhy()}」`);
  if(canSwap())bad.push("戦いのあいだに 入れ替えられてしまう");
  chNow="sk"; charModal(null);
  if(document.querySelector("#mbox [data-skoff]"))bad.push("戦いのあいだ 入れ替えの札が出ている");
  closeModal();
  curScreen=scr0; over=ov0;

  /* ⑤ 全滅しても 覚えたものは失わない */
  const skN=me.sk.length, bgN=bagOf(me,"act").length, psB=bagOf(me,"pass").length;
  goTown("wipe");await drain();
  L.push(`⑤ 全滅 → 技 ${skN}→${me.sk.length}　控え ${bgN}→${bagOf(me,"act").length}　癖の控え ${psB}→${bagOf(me,"pass").length}`);
  if(me.sk.length!==skN||bagOf(me,"act").length!==bgN||bagOf(me,"pass").length!==psB)
    bad.push("全滅で 覚えたものが消えた");

  /* ⑥ 控えは 控えのまま保存される */
  runSave();
  const r=runLoad();
  L.push(`⑥ 控えを読み直す → 技の控え ${(r.me.bagSk||[]).length}　癖の控え ${(r.me.bagPass||[]).length}`);
  if((r.me.bagSk||[]).length!==bagOf(me,"act").length)bad.push("控えが保存されていない");

  /* ⑦ 仲間も 枠を越えて覚える */
  const mt=makeMate("mage","elf",3);
  if(mt){ mt.short=mt.short||"仲間";
    party.push(mt);
    const mp2=matePool(mt,"act");
    let k=0;
    for(const r of mp2){ if(k>=MATESKMAX+2)break; mateLearn(mt,"act",r); k++; }
    L.push(`⑦ 仲間が ${k} 個 → 枠 ${mt.sk.length}/${MATESKMAX}　控え ${bagOf(mt,"act").length}`);
    if(mt.sk.length+bagOf(mt,"act").length!==k)bad.push("仲間の覚えたものが消えた");
  }else L.push(`⑦ 仲間を作れなかった（makeMate なし）`);

  return {L,bad};
});
console.log(out.L.join("\n"));
if(errs.length)console.log(errs.join("\n"));
if(out.bad.length){console.log("\n⚠ "+out.bad.join("\n⚠ "));process.exitCode=1;}
else console.log("\n✓ 覚えたものは失わず、入れ替えは戦っていないあいだだけ");
await b.close();
