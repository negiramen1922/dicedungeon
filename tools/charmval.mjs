/* ===== 混乱1ターンの値打ちを測る（α1.0.064） =====
   混乱が本当に効くようになったので、「魅了」の値（MP・再使用待ち）を
   決め直さないといけない。そのための物差し。

   混乱1ターンで起きること は 2つ。
     ① その敵の一撃が **こちらに入らない**
     ② その一撃が **仲間に入る**
   つまり 混乱1ターン ≒ 敵の1手ぶんの被害 × 2。

   これを **味方の通常攻撃1発**と同じ単位に置いて比べる。
   使い方: node tools/charmval.mjs                                        */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/index.html');await pg.waitForTimeout(800);
const out=await pg.evaluate(()=>{
  const L=[],rows=[];
  slot=0;sel.job="knight";sel.race="hume";sel.orig="lust";
  newGame();closeModal();
  const C=(a,k)=>{let r=1;for(let i=0;i<k;i++)r=r*(a-i)/(i+1);return r;};
  const pAt=(n,need,thr)=>{const p=Math.max(0,Math.min(1,(7-thr)/6));
    let o=0;for(let k=need;k<=n;k++)o+=C(n,k)*Math.pow(p,k)*Math.pow(1-p,n-k);return o;};
  /* 超過の期待倍率（XBONUS ぶん）*/
  const xAvg=(n,need,thr)=>{const p=Math.max(0,Math.min(1,(7-thr)/6));
    let e=0,s=0;for(let k=need;k<=n;k++){const w=C(n,k)*Math.pow(p,k)*Math.pow(1-p,n-k);
      e+=w*(1+XBONUS*Math.min(1,k-need));s+=w;}return s?e/s:1;};

  [["plain",1],["seed",2],["cave",2],["wtree",3],["hall",3],["city",4]].forEach(([ak,tier])=>{
    /* その区画の適正レベルまで育てる */
    slot=0;sel.job="knight";sel.race="hume";sel.orig="lust";newGame();closeModal();
    const lv=tierLo(tier)+Math.floor((tierHi(tier)-tierLo(tier))/2);
    while(me.lv<lv){me.lv++;growUp();}
    /* 技能ぶんの点は 近接に注ぐ（いちばん多い遊び方） */
    while(skCanUp("fight"))skUp("fight");
    dive(ak);
    /* その区画の ふつうの組み合わせ（norm）から ひとつ */
    const A0=AREAS[ak];
    const pool=(A0.norm&&A0.norm.length?A0.norm:A0.easy||A0.solo);
    sel.enc=pool[0];
    RUN.elite=false;RUN.boss=false;
    startBattle();
    const f=foes[0], tg=me;
    /* ---- ① 敵1体の1手ぶんの被害（攻撃の手の平均）---- */
    const atks=(f.acts||[]).filter(a=>a.k==="atk");
    let fd=0,fw=0;
    atks.forEach(t=>{
      const w=t.w||1;
      const nd=foeDice(f,t), need=Math.max(1,t.suc||1), thr=threshold(f,tg,{act:t});
      const pw=powOf(f,{pct:t.pct||0,pow:t.pow||0});
      const hits=Math.max(1,t.hits||1);
      const dmg=pAt(nd,need,thr)*xAvg(nd,need,thr)*hits*perHit(pw,defOf(tg));
      fd+=dmg*w; fw+=w;
    });
    const B=fw?fd/fw:0;
    /* ---- ② 味方の通常攻撃1発 ---- */
    const nd=skillDice(wepSkill(me),me), thr=threshold(me,f,{});
    const pw=powOf(me,{});
    const A=pAt(nd,1,thr)*xAvg(nd,1,thr)*Math.max(1,me.wep.hits||1)*perHit(pw,defOf(f));
    /* 魅了が実際に掛かるまでに 2つの関門がある。
         ① 必要2 を満たす（ダイス nd・しきい値 thr）
         ② 効き判定 ailRoll（1d6 ≧ 命中閾値 −AILTHR）── α1.0.064 で混乱も通すようにした */
    const pHit=pAt(nd,2,thr);
    const at=ailThr(me,f,{});
    const pAil=Math.max(0,Math.min(1,(7-at)/6));
    rows.push({n:AREAS[ak].n.replace(/ /g,""),lv,A:Math.round(A),B:Math.round(B),
      nd,thr,at,pHit,pAil,foe:f.name});
  });

  L.push("区画　　　　　　Lv 通常攻撃1発 敵1体の1手 混乱1ターン ＝通常攻撃 必要2が通る 効き判定");
  rows.forEach(r=>L.push(
    `${r.n.padEnd(12,"　")} ${String(r.lv).padStart(3)}  ${String(r.A).padStart(7)}   ${
      String(r.B).padStart(7)}   ${String(r.B*2).padStart(8)}   ×${
      (r.B*2/Math.max(1,r.A)).toFixed(2)}    ${Math.round(r.pHit*100)}%      ${Math.round(r.pAil*100)}%`));
  const avg=rows.reduce((a,r)=>a+r.B*2/Math.max(1,r.A),0)/rows.length;
  const pH=rows.reduce((a,r)=>a+r.pHit,0)/rows.length;
  const pA=rows.reduce((a,r)=>a+r.pAil,0)/rows.length;
  L.push("");
  L.push(`混乱1ターンの生の値打ち ＝ 通常攻撃 ×${avg.toFixed(2)} ぶん（6区画の平均）`);
  L.push(`実際に掛かるのは 必要2 ${Math.round(pH*100)}% × 効き判定 ${Math.round(pA*100)}% ＝ ${
    Math.round(pH*pA*100)}%`);
  L.push(`魅了そのものの打点 ＝ 通常攻撃 ×0.92（tools/skbal.mjs・必要2 ×1.76・ダイス3）`);
  L.push("");
  L.push("魅了ぜんぶ（打点 ＋ 混乱）を 通常攻撃1発 と比べると");
  [1,2,3].forEach(t=>L.push(
    `  混乱 ${t}ターン ＝ ×${(0.92+avg*t*pH*pA).toFixed(2)}　`+
    `<かける前の生の値 ×${(0.92+avg*t).toFixed(2)}>`));
  L.push("");
  L.push("くらべる相手（tools/skbal.mjs より）");
  L.push("  いちばん強い札  血の契 ×2.05（必要2・MP0・再3・自分に代償）");
  L.push("  急所突き ×1.68（必要2・MP3・再2）　王の一撃 ×0.85〜3.77（必要3・MP6・再4）");
  return L;
});
console.log(out.join('\n'));
if(errs.length)console.log('ERR\n'+errs.join('\n'));
await b.close();
