/* ひと振りが **一撃** で見えているか。
   α1.0.020 までは 超過のぶんだけ 踏み込みと効果音を繰り返し、
   ダメージの数字も 2か所から出していたので、
   「必要1の通常攻撃で 2つ成功したら 2回攻撃した」ように見えていた。

   出目を全部6に固めて 超過を必ず出し、盤面をひと回しぶん見る。
   踏み込み1つにつき **打撃音1つ・数字1つ** で揃っていれば通す。
   誰の手番かで選り分けようとすると 敵の手番が挟まって当てにならないので、
   **踏み込みで区切った かたまり**をそのまま数える。 */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/'+(process.argv[2]||'index.html'));await pg.waitForTimeout(800);
const T=await pg.evaluate(async()=>{
  const T=[];
  window.wait=async()=>{};window.ovMsg=()=>{};window.rollDice=async()=>0;
  window.addDice=async(a)=>a;window.ovHide=()=>{};window.fxOn=()=>{};
  window.setHPBar=()=>{};
  window.lungeUnit=async(u)=>{T.push({e:"lunge",who:u.name});};
  window.popOn=(f,t)=>{if(/^−\d/.test(t))T.push({e:"pop",who:f.name});};
  window.popSelf=(t)=>{if(/^−\d/.test(t))T.push({e:"pop",who:"（受け手）"});};
  SFX.atk=()=>{T.push({e:"snd"});};
  window.r6=()=>6;               /* 出目は全部 6 ＝ 必ず成功・必ず超過 */
  sel.job="knight";sel.race="hume";sel.orig="greed";
  newGame();closeModal();
  dive("plain");sel.enc="p_hard";RUN.elite=true;RUN.boss=false;
  startBattle();await engage();
  const settle=()=>new Promise(r=>setTimeout(r,150));
  const keep=()=>{party.forEach(u=>{u.HP=u.maxHP;u.MP=999;});
    foes.forEach(f=>{f.HP=f.maxHP=99999;f.block=0;f.counter=0;});};
  /* engage の連なりが 止まるまで待つ。ここを待たずに殴らせると
     敵の手番と自分の手番が混ざって、数え間違いを「不具合」と読んでしまう */
  for(let q=0,last=-1;q<40&&T.length!==last;q++){last=T.length;await settle();}
  T.length=0;
  const t0=alive().find(f=>canTarget(f))||alive()[0];
  /* 基本攻撃（α1.0.032 で 階段は これ1つになった）と、
     必要2 以上を持つ **覚える技**を一度ずつ。
     〔前は rung の 1・2 を押していて、段を外した版で落ちた〕 */
  keep();await settle();
  over=false;busy=false;pending=null;cur=me;
  await resolvePlayer({kind:"rung",i:0},t0);
  await settle();
  me.sk=REW.act.knight.filter(x=>x.kind==="atk").slice(0,2).map(x=>({...x,cdLeft:0}));
  for(let i=0;i<me.sk.length;i++){
    keep();await settle();
    over=false;busy=false;pending=null;cur=me;me.MP=999;
    await resolvePlayer({kind:"skill",i},t0);
    await settle();
  }
  return T;
});
/* 踏み込みで区切る */
const sw=[];
T.forEach(x=>{
  if(x.e==="lunge")sw.push({who:x.who,lunge:1,snd:0,pop:0});
  else if(sw.length)sw[sw.length-1][x.e==="snd"?"snd":"pop"]++;
});
let bad=0;
sw.forEach((s,i)=>{
  const ok=s.snd===1&&s.pop===1;
  if(!ok)bad++;
  console.log(`${ok?"○":"✗"} ${String(i+1).padStart(2)} ${s.who}　打撃音 ${s.snd}　数字 ${s.pop}`);
});
if(!sw.length){console.log("✗ 一度も殴らなかった");bad++;}
console.log(errs.length?"⚠ "+[...new Set(errs)].slice(0,5).join("\n⚠ "):"例外なし");
console.log(bad?`\n✗ ${bad} 件 ひと振りが 何回にも見えている`:`\n✓ ${sw.length} 振り すべて 一撃で見えている`);
await b.close();
process.exit(bad||errs.length?1:0);
