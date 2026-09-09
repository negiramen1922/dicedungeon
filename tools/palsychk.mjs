/* ===== 麻痺が効いているか（α1.0.071 で直した） =====
   〔不具合〕`t:0` で掛けていたので、手番の頭で走る `ailTick` が
   **判定の前に麻痺を消していた**（t が 0 → −1 で落ちる）。
   麻痺を掛けた敵に そのまま殴られていた。
   ① 麻痺を掛けた敵は 1回ぶん動けない　② 1回で解ける（2回は止まらない）
   ③ 表の中に t:0 の麻痺が残っていない
   使い方: node tools/palsychk.mjs                                        */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:390,height:844}});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/index.html');await pg.waitForTimeout(900);
const out=await pg.evaluate(async()=>{
  const L=[],bad=[];
  window.ovMsg=()=>{};window.ovHide=()=>{};window.rollDice=async()=>0;window.wait=async()=>{};
  /* ③ 表に t:0 の麻痺が残っていないか */
  const zero=[];
  Object.keys(REW.act).forEach(g=>REW.act[g].forEach(s=>{
    (s.ail||[]).forEach(a=>{if(a.k==="palsy"&&!(a.t>=1))zero.push(s.n.replace(/\s/g,""));});}));
  L.push(`③ t:0 の麻痺を持つ札 ${zero.length?zero.join("・"):"なし"}`);
  if(zero.length)bad.push("t:0 の麻痺が残っている（効かない）："+zero.join("・"));
  slot=0;sel.job="scout";sel.race="hume";sel.orig="greed";
  newGame();
  let g=0;while(g++<14&&modalOpen()){const b=document.querySelector("#mbox [data-i]")
    ||document.querySelector("#mbox .ndbtn button:last-child");if(!b)break;b.click();
    await new Promise(r=>setTimeout(r,8));}
  dive("plain");sel.enc="s_gb";RUN.elite=false;RUN.boss=false;
  await startBattle();
  const f=foes[0];
  f.tele=(f.acts||[]).find(a=>a.k==="atk")||f.tele;
  const rnd=Math.random;Math.random=()=>0.99;
  /* ① 1回ぶん止まる */
  ailAdd(f,"palsy",0,1);
  let hp0=me.HP;
  await enemyAct(f);
  L.push(`① 麻痺のあと 味方HP ${hp0} → ${me.HP}　${me.HP===hp0?"止まった":"**殴られた**"}`);
  if(me.HP<hp0)bad.push("麻痺を掛けたのに 敵が動いた");
  /* ② 次の手番は動く（1回だけ奪う） */
  hp0=me.HP;
  await enemyAct(f);
  L.push(`② 次の手番　味方HP ${hp0} → ${me.HP}　${me.HP<hp0?"動いた":"**止まったまま**"}`);
  if(me.HP===hp0)bad.push("麻痺が 2回ぶん止めている（1回だけのはず）");
  Math.random=rnd;
  return {L,bad};
});
console.log(out.L.join('\n'));
if(errs.length)console.log('ERR\n'+errs.join('\n'));
console.log(out.bad.length?'\n✗ '+out.bad.join('\n✗ '):'\n✓ 麻痺は 1回ぶん動きを奪う');
await b.close();
process.exit(out.bad.length||errs.length?1:0);
