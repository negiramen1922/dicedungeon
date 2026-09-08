/* ===== 混乱（charm）が効いているか（α1.0.063 で不具合を確認） =====
   AIL.charm は「味方を襲うようになる」と書いてあるが、敵の手番のどこにも
   charm を読む行が無い。狙い先を決める foeTarget() も見ていない。
   この道具は **混乱を付けた敵が 誰を殴るか**を実測する。
   直すまでは「混乱が効いていない」と出るのが正しい。
   使い方: node tools/charmchk.mjs                                        */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:390,height:844}});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/index.html');await pg.waitForTimeout(800);
const out=await pg.evaluate(async()=>{
  const L=[];
  window.ovMsg=()=>{};window.ovHide=()=>{};window.rollDice=async()=>0;window.wait=async()=>{};
  slot=0; sel.job="knight";sel.race="hume";sel.orig="lust";
  newGame();
  let g=0;while(g++<14&&modalOpen()){const b=document.querySelector("#mbox [data-i]")
    ||document.querySelector("#mbox .ndbtn button:last-child");if(!b)break;b.click();
    await new Promise(r=>setTimeout(r,8));}
  dive("plain"); sel.enc=Object.keys(ENCS)[0];
  await startBattle();
  /* 敵を2体に増やす */
  /* 2体出る組み合わせを引き当てるまで 戦いを作り直す */
  for(let i=0;i<40&&foes.length<2;i++){ await startBattle(); }
  L.push(`敵 ${foes.length} 体：${foes.map(f=>f.name).join("・")}`);
  const v=foes[0];
  ailAdd(v,"charm",0,3);
  /* 攻撃の予告に固定する */
  v.tele=(v.acts||[]).find(a=>a.k==="atk")||v.tele;
  L.push(`${v.name} 混乱：${(v.ail||[]).map(a=>a.k).join(",")}　予告 ${v.tele&&v.tele.k}`);
  const pb=party.map(u=>u.HP), fb=foes.map(f=>f.HP);
  await enemyAct(v);
  L.push(`味方HP ${pb.join("/")} → ${party.map(u=>u.HP).join("/")}`);
  L.push(`敵HP   ${fb.join("/")} → ${foes.map(f=>f.HP).join("/")}`);
  const hitAlly=party.some((u,i)=>u.HP<pb[i]);
  const hitFoe=foes.some((f,i)=>f.HP<fb[i]);
  L.push(hitFoe?"→ 混乱が効いている（仲間を襲った）"
    :hitAlly?"→ **混乱が効いていない**（こちらを襲った）":"→ 判定できず（当たらなかった）");
  return L;
});
console.log(out.join('\n'));
if(errs.length)console.log('ERR '+errs.join('\n'));
await b.close();
