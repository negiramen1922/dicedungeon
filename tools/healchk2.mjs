/* 治癒のダイス（α1.0.028）。
   ・技能ごとの ダイスの数
   ・必要成功数ごとの 目減り（healRate）
   ・実際に使ったときの ならした回復量
   期待値を直書きせず、その版の HEALSHORT / XGAIN / XCAP / SKDIESTEP から引く。 */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/'+(process.argv[2]||'index.html'));await pg.waitForTimeout(800);
const out=await pg.evaluate(async()=>{
  const R=[];const bad=[];
  window.wait=async()=>{};window.rollDice=async()=>0;window.ovHide=()=>{};
  window.fxOn=()=>{};window.popSelf=()=>{};window.popOn=()=>{};window.setHPBar=()=>{};
  window.lungeUnit=async()=>{};window.ovMsg=()=>{};
  sel.job="knight";sel.race="hume";sel.orig="greed";
  newGame();closeModal();
  dive("plain");sel.enc="p_hard";RUN.elite=true;RUN.boss=false;
  startBattle();await engage();
  me.skg=me.skg||{};
  const setHeal=v=>{me.skg.heal=v-skillBorn("heal",me);};
  /* ① 技能 → ダイス。刻みは SKDIESTEP から引く */
  const dice=[];
  for(const v of [10,20,40,60,80,100]){setHeal(v);dice.push([v,healDice(me)]);}
  dice.forEach(([v,d])=>{
    const want=Math.max(1,Math.min(SKDIEMAX,Math.floor(v/SKDIESTEP)));
    if(d!==want)bad.push(`技能 ${v} のダイス ${d}（期待 ${want}）`);
  });
  R.push("技能→ダイス　"+dice.map(([v,d])=>`${v}:${d}`).join(" "));
  /* ② 目減り。0成功だけがゼロ、足りない1つにつき ×HEALSHORT */
  for(const need of [1,2,3]){
    const row=[0,1,2,3].map(k=>healRate(k,need));
    const want=[0,1,2,3].map(k=>k<=0?0:k>=need?1:Math.pow(HEALSHORT,need-k));
    if(JSON.stringify(row)!==JSON.stringify(want))bad.push(`必要 ${need} の目減り ${row}`);
    R.push(`必要 ${need} の目減り　`+row.map((v,k)=>`${k}→${Math.round(v*100)}%`).join(" "));
  }
  /* ③ しきい値は 自分にかけるので 遠さを払わない */
  setHeal(60);
  const front=healThr(me,{});
  setParty([me,makeMate("mage","hume",1),makeMate("mage","hume",1)].filter(Boolean));
  const back=healThr(party[party.length-1]||me,{});
  R.push(`しきい値　先頭 ${front}　いちばん後ろ ${back}`);
  if(front!==back)bad.push(`後ろに立つと しきい値が変わる（${front}→${back}）`);
  /* ④ 実際に使って ならした回復量。ダイスは本物を振る */
  setParty([me]);
  const s={...REW.act.common.find(x=>x.kind==="heal"),cdLeft:0};
  me.sk=[s];
  /* 敵の手番を止めてから回す。止めないと 1回ごとに相手の演出まで
     通ることになり、400回で 10分を超えた（実際に待たされた） */
  const EA=window.enemyAct; window.enemyAct=async()=>{};
  const N=200;let sum=0,zero=0;
  const L=window.log;window.log=()=>{};
  for(let i=0;i<N;i++){
    me.HP=1;me.MP=99;me.sk[0].cdLeft=0;
    over=false;busy=false;pending=null;cur=me;
    const before=me.HP;
    await resolvePlayer({kind:"skill",i:0},null);
    const got=me.HP-before;sum+=got;if(got<=0)zero++;
    foes.forEach(f=>{f.HP=f.maxHP;});
  }
  window.log=L;window.enemyAct=EA;
  const full=Math.round(me.maxHP*s.heal);
  R.push(`${N}回まわして　満額 ${full}　ならすと ${Math.round(sum/N)}　空振り ${zero}回（${Math.round(zero/N*100)}%）`);
  /* 空振りの割合は 「必要成功に1つも届かない確率」に近いはず */
  const n=healDice(me),p=(7-healThr(me,{}))/6;
  const wantZero=Math.pow(1-p,n);
  if(Math.abs(zero/N-wantZero)>0.10)bad.push(`空振りが ${Math.round(zero/N*100)}%（期待 ${Math.round(wantZero*100)}%）`);
  return {R,bad};
});
out.R.forEach(x=>console.log("○ "+x));
console.log(errs.length?"⚠ "+[...new Set(errs)].slice(0,5).join("\n⚠ "):"例外なし");
console.log(out.bad.length?"\n✗ "+out.bad.join("\n✗ "):"\n✓ すべて合う");
await b.close();
process.exit(out.bad.length||errs.length?1:0);
