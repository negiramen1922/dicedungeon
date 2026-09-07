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
  return window.expDmg((a.dice||a.diceRand||1),threshold(f,tgt,{act:a}),
    Math.max(1,a.suc||1),pow,0,defOf(tgt));
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
  const def=Math.round(defOf(t)*(1-Math.min(1,(s.pen||0)/100)));
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
`;
