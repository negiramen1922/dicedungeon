/* ===== 盤の HP・MP の数字（α1.0.063） =====
   ① マスに HP の数字が出ている
   ② 帯を動かす setHPBar で **数字も一緒に動く**（帯だけ減る作りに戻さない）
   ③ 残り 35% 以下で 数字が赤くなる
   ④ シールドは HP の数字の隣に **水色**で足す（パーティ画面と同じ）
   ⑤ 同じ盾の数字を 下の札にも出さない（二重に出さない）
   ⑥ 敵には MP の行を出さない
   使い方: node tools/hpnumchk.mjs                                        */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:390,height:844}});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/index.html');await pg.waitForTimeout(800);
const out=await pg.evaluate(async()=>{
  const L=[],bad=[];
  window.ovMsg=()=>{};window.ovHide=()=>{};window.rollDice=async()=>0;
  slot=0; sel.job="knight";sel.race="hume";sel.orig="wrath";
  newGame();
  let g=0;while(g++<14&&modalOpen()){const b=document.querySelector("#mbox [data-i]")
    ||document.querySelector("#mbox .ndbtn button:last-child");if(!b)break;b.click();
    await new Promise(r=>setTimeout(r,8));}
  dive("plain"); sel.enc=Object.keys(ENCS)[0]; RUN.elite=false;RUN.boss=false;
  await startBattle();
  const num=u=>{const c=cellOf(u);const n=c&&c.querySelector(".cnum:not(.mp)");
    return n?n.textContent.trim():"(なし)";};
  L.push(`① はじめ 主人公 ${num(me)}（HP ${me.HP}/${me.maxHP}）`);
  if(!/^\d+\/\d+$/.test(num(me)))bad.push("HP の数字が マスに出ていない");
  setHPBar(me, Math.round(me.maxHP*0.3));
  const mid=num(me);
  L.push(`② setHPBar(30%) → ${mid}　赤 ${cellOf(me).querySelector(".cnum").classList.contains("lo")}`);
  if(mid!==Math.round(me.maxHP*0.3)+"/"+me.maxHP)bad.push("帯だけ動いて 数字が古いまま");
  if(!cellOf(me).querySelector(".cnum").classList.contains("lo"))bad.push("残り少ないのに 赤くならない");
  me.block=7; draw();
  const em=cellOf(me).querySelector(".cnum em");
  L.push(`④ 盾 7 → ${num(me)}　色 ${em?getComputedStyle(em).color:"(なし)"}`);
  if(!em)bad.push("盾の数字が HP の隣に出ない");
  if(em&&getComputedStyle(em).color!=="rgb(111, 146, 171)")bad.push("盾の数字が 水色でない");
  const chip=[...cellOf(me).querySelectorAll(".cst")].map(x=>x.textContent).join("");
  L.push(`⑤ 下の札「${chip||"—"}」`);
  if(/盾/.test(chip))bad.push("盾が 二か所に出ている");
  L.push(`⑥ 敵 ${foes[0].name} ${num(foes[0])}　MPの行 ${!!cellOf(foes[0]).querySelector(".cnum.mp")}`);
  if(cellOf(foes[0]).querySelector(".cnum.mp"))bad.push("敵に MP の行が出ている");
  if(!cellOf(me).querySelector(".cnum.mp"))bad.push("味方に MP の行が無い");
  return {L,bad};
});
console.log(out.L.join('\n'));
if(errs.length)console.log('ERR\n'+errs.join('\n'));
console.log(out.bad.length?'\n✗ '+out.bad.join('\n✗ '):'\n✓ 盤の数字 すべて効いている');
await b.close();
process.exit(out.bad.length||errs.length?1:0);
