/* ─────────────────────────────────────────────────────────────
   期待ダメージの模型。**本体の式を写している 唯一の場所。**

   `XGAIN` / `XCAP` / `needOf` / ダイスの出どころ / `perHit` の順番 を
   変えたら **ここだけ**直す。

   〔なぜ1か所にまとめたか〕
   audit4.mjs と sizechk.mjs が それぞれ別に写していて、**両方ずれた**。
   ・audit4 …… 段3 で直し忘れ、旧模型のまま ×0.87 と出していた（本当は ×0.79）
   ・sizechk … 段1 の時点でも「ダイス数 × 1発 × 0.55」の旧模型のままで、
               味方のダイスも `wep.hands` を見ていた。α1.0.013 で
               敵の pct を上げたとき、必要成功の関門を通さずに
               そのぶんだけ重く数え、手応えが落ちたように見えた
   HANDOVER の「式を写すと必ずずれる」は これで3度目。
   ───────────────────────────────────────────────────────────── */

/* ページの中に window.expDmg を作る文字列。
     await pg.evaluate(EXPECT_SRC);
   としてから使う。本体の XGAIN / XCAP / perHit を **そのまま呼ぶ**ので、
   決めごとの数字までは写していない。 */
export const EXPECT_SRC = `
/* ひと振りの期待ダメージ。本体（playerAttack / enemyAct）と同じ順。
     ① 威力 × 超過の倍率
     ② シールドを引く
     ③ 残りから VIT を引く（perHit）
   成功が必要数に届かなければ 0（MP は消えるが ダメージは出ない）。

     n    振るダイスの数
     thr  しきい値（これ以上が成功）
     need 必要成功数
     pow  威力（powOf のあと・倍率まで掛けた値）
     sh   相手のシールド　def 相手の VIT                          */
window.expDmg=function(n,thr,need,pow,sh,def){
  const p=Math.max(0,Math.min(1,(7-thr)/6));
  const C=(a,b)=>{let r=1;for(let i=0;i<b;i++)r=r*(a-i)/(i+1);return r;};
  let out=0;
  for(let k=Math.max(1,need);k<=n;k++){
    const pr=C(n,k)*Math.pow(p,k)*Math.pow(1-p,n-k);
    /* 超過は 一律 +30%（α1.0.032）。本体の xMulOf を そのまま呼ぶ */
    const raw=Math.round(pow*xMulOf(k-Math.max(1,need)));
    out+=pr*perHit(Math.max(0,raw-(sh||0)),def||0);
  }
  return out;
};
/* 敵の技ひとつぶん。ダイスも必要成功も 技が持っている */
window.expFoeAct=function(f,a,tgt){
  if(a.k!=="atk")return 0;
  const pow=powOf(f,{pct:a.pct||0,pow:a.pow||0});
  const one=window.expDmg((a.dice||a.diceRand||1),threshold(f,tgt,{act:a}),
    Math.max(1,a.suc||1),pow,0,defOf(tgt));
  /* 何回入るか（hits）と 何人に入るか（aim:"all"）。
     ひと振りで通れば全員に入るので、パーティの人数ぶん重い */
  const many=(typeof aimOf==="function"&&aimOf(f,a)==="all")?Math.max(1,pAlive().length):1;
  return one*Math.max(1,a.hits||1)*many;
};
/* 味方ひとりの通常攻撃ひと振りぶん。ダイスは **技能**から。
   得物の個性（短剣の2回・槍の貫通）も見る（α1.0.035）。
   貫通は 別の相手に入るので 1体ぶんの見積りには足さない。 */
window.expMineAtk=function(u,t){
  const pow=Math.round(powOf(u,{})*orgMul("outMul",u));
  const one=window.expDmg(skillDice(wepSkill(u),u),threshold(u,t,{}),1,pow,0,defOf(t));
  return one*Math.max(1,(u.wep&&u.wep.hits)||1);
};
/* ===== 覚えた技ひとつぶん（α1.0.035） =====
   audit4 は 通常攻撃しか測っていなかったので、
   **技を46件動かしても数字が動かなかった**。
   「変わっていない」ではなく「測れていない」だった。
   いちばん重い技を1つ選んで、通常攻撃と並べて出せるようにする。 */
window.expMineSkill=function(u,t,s){
  if(!s||s.kind!=="atk")return 0;
  const pow=Math.round((powOf(u,{})+(s.pow||0))*(s.powMul||1)*orgMul("outMul",u));
  const n=Math.max(1,skillDice(wepSkill(u,s),u)+(s.dice||0));
  /* pen は **0〜1 の割合**（本体の playerAttack と同じ）。
     /100 と書いていたので 徹甲矢（pen:1）が 1% しか抜いていなかった */
  const def=Math.round(defOf(t)*(1-Math.min(1,s.pen||0)));
  const one=window.expDmg(n,threshold(u,t,{thr:s.thr||0}),Math.max(1,s.suc||1),pow,0,def);
  /* 何回入るか・何体に入るか */
  const hits=Math.max(1,s.hits||1);
  const tg=s.allFoes?alive().length:(s.all?Math.min(AOEMAX,alive().length)
           :(s.column||s.pierce)?2:1);
  return one*hits*(s.spread?1:tg);
};
/* その者が持てる技のうち いちばん重いもの（一撃ぶん） */
window.expBestSkill=function(u,t){
  const pool=[].concat(REW.act.common||[],REW.act[u.job]||[],
    REW.act[u.race]||[],REW.act[u.orig]||[]);
  let best=0,who=null;
  pool.forEach(s=>{const v=window.expMineSkill(u,t,s);if(v>best){best=v;who=s;}});
  return {v:best,n:who?who.n:"—"};
};

/* ═══════════════════════════════════════════════════════════════
   その場での **1ラウンドの与ダメ**（α1.0.045）

   「いちばん重い技を毎ターン撃つ」で測ると 実戦より遥かに強く出る。
   遊ぶ人が本当に持っているものだけで測るために、4つを守る。

     ① そのレベルで **何回 覚えているか**（主人公は LEARNEVERY ごと、
        仲間は MATELV。枠 SKMAX / MATESKMAX で頭打ち）
     ② 覚えたぶんが 全部 技とは限らない（技か特かを選ばせている）
     ③ 覚えた技が 全部 攻撃技とは限らない（守り・癒し・構えもある）
     ④ **MP と 再使用待ち**で 撃てる回数が決まる。残りは通常攻撃

   ①〜③ の見立ては 下の3つの数字だけで決まる。
   実戦とずれたら ここを動かすこと。                             */
const ACTSHARE=0.55;   /* 覚える機会のうち **技**に回す割合（残りは特性） */
const ATKBIAS=1.25;    /* 攻撃技を選びたがる度合い（1.0 で 出た通り） */
const PICKSPAN=3;      /* 1回の選択で 見せられる候補の数。良いものだけは取れない */

/* そのレベルで 何回 覚えているか */
window.expLearns=function(u){
  const mate=(u!==me);
  return mate ? MATELV.filter(x=>u.lv>=x).length
              : Math.floor(u.lv/LEARNEVERY);
};
/* 持ち出せる技の顔ぶれを 組む。**上から順に取れるわけではない**ので、
   良いものが並ぶ範囲（上位 PICKSPAN 倍）から 等間隔に取る */
window.expSkillPlan=function(u,t){
  const mate=(u!==me);
  const pool=[].concat(REW.act.common||[],REW.act[u.job]||[],
    REW.act[u.race]||[],REW.act[u.orig]||[]);
  const cap=mate?MATESKMAX:SKMAX;
  const learns=window.expLearns(u);
  const nSk=Math.max(0,Math.min(cap,Math.round(learns*ACTSHARE)));
  if(!nSk)return {nSk:0,nAtk:0,list:[],dmg:0,avgMP:0,cdRate:0};
  /* ③ 覚えた技のうち 攻撃技はいくつか。出方に 選り好みぶんを掛ける */
  const atkPool=pool.filter(s=>s.kind==="atk");
  const rate=Math.min(1,(atkPool.length/Math.max(1,pool.length))*ATKBIAS);
  const nAtk=Math.max(0,Math.round(nSk*rate));
  if(!nAtk)return {nSk,nAtk:0,list:[],dmg:0,avgMP:0,cdRate:0};
  const ranked=atkPool.map(s=>({s,v:window.expMineSkill(u,t,s)}))
                      .sort((a,b)=>b.v-a.v);
  const span=Math.min(ranked.length,Math.max(nAtk,nAtk*PICKSPAN));
  const list=[];
  for(let i=0;i<nAtk;i++)list.push(ranked[Math.min(ranked.length-1,Math.round(i*span/nAtk))]);
  const dmg=list.reduce((a,x)=>a+x.v,0)/list.length;
  const avgMP=list.reduce((a,x)=>a+(x.s.mp||0),0)/list.length;
  /* ④ 再使用待ち。cd の技は (cd+1) ラウンドに 1 回。手番は1つなので 1 で頭打ち */
  const cdRate=Math.min(1,list.reduce((a,x)=>a+1/((x.s.cd||0)+1),0));
  return {nSk,nAtk,list,dmg,avgMP,cdRate,names:list.map(x=>x.s.n)};
};
/* ひとりぶんの 1ラウンド平均の与ダメ。T ラウンド戦う前提。
   MP が尽きたら 通常攻撃に戻る ── ここを見ないと 長い戦いほど嘘になる */
window.expRound=function(u,t,T){
  const atk=window.expMineAtk(u,t);
  const P=window.expSkillPlan(u,t);
  if(!P.nAtk||P.dmg<=atk)return atk;
  const byCd=T*P.cdRate;
  const byMP=P.avgMP>0?Math.floor(u.maxMP/P.avgMP):T;
  const casts=Math.max(0,Math.min(T,byCd,byMP));
  return (casts*P.dmg+(T-casts)*atk)/T;
};
/* パーティ全体の 1ラウンドの与ダメ。T は「倒すのにかかるラウンド」なので
   互いを決め合う ── 何度か回して落ち着かせる */
window.expPartyRound=function(list,t,hp){
  let T=6;
  for(let i=0;i<6;i++){
    const our=list.reduce((a,u)=>a+window.expRound(u,t,T),0);
    const nT=hp/Math.max(1,our);
    if(Math.abs(nT-T)<0.05){T=nT;break;}
    T=(T+nT)/2;
  }
  return {our:list.reduce((a,u)=>a+window.expRound(u,t,T),0),T};
};
`;
