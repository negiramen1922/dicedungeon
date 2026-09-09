/* ===== 混乱（charm）が効いているか（α1.0.064 で実装） =====
   AIL.charm は「味方を襲うようになる」と書いてあるのに、α1.0.063 まで
   **どこも読んでいなかった**。混乱を付けた敵はそのままこちらを殴っていた。

   ① 仲間がいるとき … 隣の仲間を襲う（無作為だと 描き直すたびに相手が変わるので 並びで決める）
   ② ひとりきりのとき … 自分を殴る
   ③ 混乱した敵は 味方の赤枠（aimedBy）から外れる ── こちらを狙っていないので
   ④ 場のすべてに及ぶ手も 及ぶ先が 敵の側になる
   使い方: node tools/charmchk.mjs                                        */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:390,height:844}});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/index.html');await pg.waitForTimeout(800);
const out=await pg.evaluate(async()=>{
  const L=[],bad=[];
  window.ovMsg=()=>{};window.ovHide=()=>{};window.rollDice=async()=>0;window.wait=async()=>{};
  slot=0; sel.job="knight";sel.race="hume";sel.orig="lust";
  newGame();
  let g=0;while(g++<14&&modalOpen()){const b=document.querySelector("#mbox [data-i]")
    ||document.querySelector("#mbox .ndbtn button:last-child");if(!b)break;b.click();
    await new Promise(r=>setTimeout(r,8));}
  dive("plain");

  /* ---- ① 仲間がいるとき ---- */
  sel.enc="db2";                       /* 滴りの群れ ── 3体 */
  await startBattle();
  L.push(`① 敵 ${foes.length} 体：${foes.map(f=>f.name).join("・")}`);
  if(foes.length<2)bad.push("2体以上の組み合わせを作れていない（この道具の前提）");
  const v=foes[0];
  ailAdd(v,"charm",0,3);
  v.tele=(v.acts||[]).find(a=>a.k==="atk")||v.tele;
  L.push(`   ${v.name} に 混乱　狙い先 → ${foeTarget(v,v.tele).name}`);
  if(party.includes(foeTarget(v,v.tele)))bad.push("混乱しているのに こちらを狙っている");
  /* ③ 赤枠から外れているか */
  const aimed=party.filter(u=>aimedBy(u));
  L.push(`   混乱した敵ぶんの 赤枠 ${aimed.length?aimed.map(u=>u.name).join("・"):"なし"}`);
  const pb=party.map(u=>u.HP), fb=foes.map(f=>f.HP);
  await enemyAct(v);
  const hitAlly=party.some((u,i)=>u.HP<pb[i]);
  const hitFoe=foes.some((f,i)=>f!==v&&f.HP<fb[i]);
  L.push(`   味方HP ${pb.join("/")} → ${party.map(u=>u.HP).join("/")}`);
  L.push(`   敵HP   ${fb.join("/")} → ${foes.map(f=>f.HP).join("/")}`);
  if(hitAlly)bad.push("混乱した敵が こちらを殴った");
  if(!hitFoe&&!hitAlly)L.push("   （空振り。当たりの向きは 狙い先で見ている）");

  /* ---- ② ひとりきりのとき ---- */
  sel.enc="s_gb";                      /* はぐれ見張り ── 1体 */
  await startBattle();
  const w=foes[0];
  ailAdd(w,"charm",0,3);
  w.tele=(w.acts||[]).find(a=>a.k==="atk")||w.tele;
  L.push(`② 敵 ${foes.length} 体　狙い先 → ${foeTarget(w,w.tele).name}`);
  if(foeTarget(w,w.tele)!==w)bad.push("ひとりきりなのに 自分を殴らない");
  const pb2=party.map(u=>u.HP), wb=w.HP;
  await enemyAct(w);
  L.push(`   味方HP ${pb2.join("/")} → ${party.map(u=>u.HP).join("/")}`);
  L.push(`   その敵 ${wb} → ${w.HP}`);
  if(party.some((u,i)=>u.HP<pb2[i]))bad.push("ひとりきりの混乱で こちらが殴られた");
  if(w.HP>=wb)bad.push("ひとりきりの混乱で 自分に入っていない");
  return {L,bad};
});
console.log(out.L.join('\n'));
if(errs.length)console.log('ERR\n'+errs.join('\n'));
console.log(out.bad.length?'\n✗ '+out.bad.join('\n✗ '):'\n✓ 混乱は 仲間を襲い、ひとりなら 自分を殴る');
await b.close();
process.exit(out.bad.length||errs.length?1:0);
