/* ===== 控えの技・特性が いまの表で引き直されるか（α1.0.064） =====
   控えには札まるごとが入っているので、表の数字を直しても
   すでに作った者には古い札が残り続けていた（釣り合いの直しが届かない）。
   fixUnit で id を鍵に引き直すようにしたので、それを確かめる。
   使い方: node tools/freshchk.mjs                                        */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/index.html');await pg.waitForTimeout(800);
const out=await pg.evaluate(async()=>{
  const L=[],bad=[];
  slot=0;sel.job="knight";sel.race="hume";sel.orig="pride";newGame();closeModal();
  /* 傲慢の札を持たせる */
  me.sk=REW.act.pride.map(s=>({...s,cdLeft:0}));
  me.pass=REW.pass.pride.map(p=>({...p}));
  /* ---- 古い控えを装う ---- */
  const king=me.sk.find(s=>s.id==="apr3");
  king.earlyOnly=3; king.powMul=1; king.cdLeft=2;      /* 古い数字 */
  const win=me.pass.find(p=>p.id==="ppr1");
  win.ef={k:"powp",v:30,w:"r1"};                        /* 古い条件 */
  L.push(`古い控え　王の一撃 earlyOnly ${king.earlyOnly} ×${king.powMul} 再${king.cdLeft}`);
  L.push(`　　　　　先手必勝 ${JSON.stringify(win.ef)}`);
  /* ---- 読み直す ---- */
  setParty([me,...party.slice(1)]);
  const k2=me.sk.find(s=>s.id==="apr3"), w2=me.pass.find(p=>p.id==="ppr1");
  L.push(`引き直し後 王の一撃 earlyOnly ${k2.earlyOnly} ×${k2.powMul} 再${k2.cdLeft}`);
  L.push(`　　　　　先手必勝 ${JSON.stringify(w2.ef)}`);
  if(k2.earlyOnly!==SKBOOK.apr3.earlyOnly)bad.push("技の縛りが 古いまま");
  if(k2.powMul!==SKBOOK.apr3.powMul)bad.push("技の倍率が 古いまま");
  if(k2.cdLeft!==2)bad.push("再使用待ちが 消えた（持ち越すこと）");
  if(w2.ef.k!==PASSBOOK.ppr1.ef.k||w2.ef.w!==PASSBOOK.ppr1.ef.w)bad.push("特性の条件が 古いまま");
  /* 表に無い札は そのまま置く */
  me.sk.push({id:"__none__",n:"作りかけ",cdLeft:1});
  setParty([me,...party.slice(1)]);
  const gh=me.sk.find(s=>s.id==="__none__");
  L.push(`表に無い札 ${gh?"残った":"消えた"}`);
  if(!gh)bad.push("表に無い札を 消してしまった");
  return {L,bad};
});
console.log(out.L.join('\n'));
if(errs.length)console.log('ERR\n'+errs.join('\n'));
console.log(out.bad.length?'\n✗ '+out.bad.join('\n✗ '):'\n✓ 控えの札は いまの表で引き直される');
await b.close();
process.exit(out.bad.length||errs.length?1:0);
