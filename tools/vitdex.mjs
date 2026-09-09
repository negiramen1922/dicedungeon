/* ===== 弱化（VIT下げ）と 鈍足（DEX下げ）が どれだけ効くか =====
   §21-7 で「鈍足と弱化が ほとんど効いていない（×0.06〜0.09）」と出たので、
   **なぜ効かないのか**をここで見る。

   弱化 … 敵の VIT を削る。だが 敵の VIT は 2〜31 と小さく、
          味方の一撃は 76〜292。**VIT を全部ゼロにしても +11%** しか増えない。
          割合（−50%）にしても平均 +5% で、いまの固定 −12（+6%）と変わらない。
          つまり「弱化の量」ではなく **VIT の重み**の話。
   鈍足 … 命中閾値の段は DEXCUT=[25,40] の **差**で決まる。−10 では
          段をまたがない区画が多い。−20 なら 6区画中5区画でまたぐ。
   おまけ … ナイトと ウィザードは GROW に DEX が無いので **一生 育たない**。
          敵は深い区画で DEX 55〜58。攻めるときも受けるときも 1段 損している。

   デバフは **敵もこちらに掛けてくる**（hex の curse / slow）ので、
   仕組みを変えると 受ける側の重さも変わる。その量もここに出す。
   使い方: node tools/vitdex.mjs                                          */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/index.html');await pg.waitForTimeout(1000);
const out=await pg.evaluate(()=>{
  const L=[];
  const C=(a,k)=>{let r=1;for(let i=0;i<k;i++)r=r*(a-i)/(i+1);return r;};
  const pAt=(n,need,thr)=>{const p=Math.max(0,Math.min(1,(7-thr)/6));
    let o=0;for(let k=need;k<=n;k++)o+=C(n,k)*Math.pow(p,k)*Math.pow(1-p,n-k);return o;};
  L.push("■ 弱化を「VIT −50%」にしたら（味方の一撃が 何%増えるか）");
  L.push("区画　　　　　 味方の威力 敵VIT  いま(−12) 50%引き VIT全部0  ＝値打ち");
  const rows=[];
  [["plain",1],["seed",2],["cave",2],["wtree",3],["hall",3],["city",4]].forEach(([ak,tier])=>{
    slot=0;sel.job="knight";sel.race="hume";sel.orig="lust";newGame();closeModal();
    const lv=tierLo(tier)+Math.floor((tierHi(tier)-tierLo(tier))/2);
    while(me.lv<lv){me.lv++;growUp();}
    while(skCanUp("fight"))skUp("fight");
    dive(ak);const A0=AREAS[ak];
    sel.enc=(A0.norm&&A0.norm.length?A0.norm:A0.easy||A0.solo)[0];
    RUN.elite=false;RUN.boss=false;startBattle();
    const f=foes[0], pw=powOf(me,{}), d=defOf(f);
    const a0=perHit(pw,d);
    const pc=x=>Math.round((perHit(pw,Math.max(0,d-x))/a0-1)*100);
    rows.push({n:AREAS[ak].n.replace(/ /g,""),pw,d,f,
      now:pc(12),half:pc(Math.round(d*0.5)),zero:pc(d),
      my:{vit:defOf(me),dex:dexOf(me)},fdex:f.DEX});
    L.push(`${rows[rows.length-1].n.padEnd(11,"　")} ${String(pw).padStart(6)} ${
      String(d).padStart(5)} ${(" +"+pc(12)+"%").padStart(9)} ${
      (" +"+pc(Math.round(d*0.5))+"%").padStart(7)} ${(" +"+pc(d)+"%").padStart(8)}`);
  });
  const av=k=>Math.round(rows.reduce((a,r)=>a+r[k],0)/rows.length);
  L.push(`平均　　　　　　　　　　　　　　　 +${av("now")}%　 +${av("half")}%　  +${av("zero")}%`);
  L.push("");
  L.push("→ VIT を **全部ゼロにしても** 一撃は平均 +"+av("zero")+"% しか増えない。");
  L.push("　 弱化が弱いのではなく **敵の VIT が小さい**（2〜31）。50% でも +"+av("half")+"%。");
  L.push("");
  L.push("■ 味方が 弱化を受ける側（敵の hex は curse 6〜7 の固定値）");
  rows.forEach(r=>L.push(
    `${r.n.padEnd(11,"　")} 味方VIT ${String(r.my.vit).padStart(3)}　`+
    `いま −7　→　50%引きなら −${Math.round(r.my.vit*0.5)}（${Math.round(r.my.vit*0.5/7*10)/10}倍）`));
  L.push("");
  L.push("■ 鈍足 −20 で 命中閾値の段が動くか（DEXCUT [25,40] の **差**で決まる）");
  rows.forEach(r=>{
    const d0=r.fdex-r.my.dex, d1=Math.max(1,r.fdex-20)-r.my.dex;
    L.push(`${r.n.padEnd(11,"　")} 敵DEX ${String(r.fdex).padStart(3)} 味方DEX ${
      String(r.my.dex).padStart(3)}　差 ${String(d0).padStart(4)}（${dexStep(d0)}段） → ${
      String(d1).padStart(4)}（${dexStep(d1)}段）　${
      dexStep(d1)!==dexStep(d0)?"**動く**":"動かない"}`);
  });
  L.push("");
  L.push("■ ナイトの DEX は 育たない（GROW.knight に DEX が無い）");
  L.push(`GROW.knight ${JSON.stringify(GROW.knight)}`);
  L.push(`　Lv8 も Lv53 も 味方DEX 30。敵は深いところで 55〜58。`);
  return L;
});
console.log(out.join('\n'));
if(errs.length)console.log('ERR',errs[0]);
await b.close();
