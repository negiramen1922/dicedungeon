/* ===== 技の釣り合いを ひと目で見る =====
   ぜんぶの技を **タダの階段（通常攻撃/斬撃/強撃/大技）と同じ物差し**で並べる。

   見るのは 3 つ。
     ① 必要成功数     … 何個 成功が要るか
     ② 実効威力       … 超過の上乗せまで含めた ならしの倍率
     ③ 階段との差     … 同じ必要数のタダの札と比べて 何倍か

   ③ が 1.0 を下回る技は **タダの札より弱い**。
   それでも別の働き（状態異常・複数巻き込み・防御無視など）があれば
   枠を取る値打ちはある。何も無ければ ただの下位互換。

   使い方: node tools/skbal.mjs [ファイル名] [--dice N]
     --dice は 振れるダイスの数（既定 3）。手練れになるほど上の段が現実になる。 */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const FILE=process.argv.find(a=>a.endsWith(".html"))||"index.html";
const DI=process.argv.indexOf("--dice");
const NDICE=DI>0?+process.argv[DI+1]:3;
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/'+FILE);await pg.waitForTimeout(700);
const out=await pg.evaluate((NDICE)=>{
  const THR=4;
  const C=(a,b)=>{let r=1;for(let i=0;i<b;i++)r=r*(a-i)/(i+1);return r;};
  /* 必要 need を n個で振ったときの **ならした倍率**（届かなければ 0） */
  const eff=(need,n,mul)=>{
    const p=Math.max(0,Math.min(1,(7-THR)/6));let e=0;
    for(let k=need;k<=n;k++)
      e+=C(n,k)*Math.pow(p,k)*Math.pow(1-p,n-k)*mul*(1+XGAIN*Math.min(XCAP,k-need));
    return e;
  };
  const L=LADDER.fight;
  const rows=[];
  Object.keys(REW.act).forEach(g=>REW.act[g].forEach(s=>{
    if(s.kind!=="atk")return;
    const need=Math.max(1,s.suc||1);
    const n=Math.max(1,NDICE+(s.dice||0));
    /* ===== 多段（hits）を数える（α1.0.071 で足した） =====
       〔罠〕`powMul` だけを見ていたので、**同じ相手を2回・3回 裂く札**が
       1回ぶんとして測られ、二段突き（×0.97 ×2回）や 爪撃ち（×0.70 ×3回）が
       「タダの札より弱い」と出ていた。実際は 2倍・3倍 入る。
       VIT が引き算だった頃は 1回ごとに VIT を引かれるので 多段は損だったが、
       α1.0.066 で **割合**になったので 何回に分けても総量は変わらない。 */
    const hits=Math.max(1,s.hits||1);
    const mul=(s.powMul||1)*hits;
    const mine=eff(need,n,mul);
    const r=L[need-1]||L[L.length-1];
    const base=eff(r.need,NDICE,r.mul);          /* 同じ段の タダの札 */
    /* 階段にない働き */
    const X=[];
    if(s.dice)X.push(`ダイス+${s.dice}`);
    if(s.ail)X.push("状態異常");
    if(s.all||s.allFoes)X.push("複数");
    if(s.column||s.pierce)X.push("貫通");
    if(s.pen)X.push("防御無視");
    if(s.el)X.push("属性");
    if(s.chain)X.push("連鎖");
    if(s.stun)X.push("行動不能");
    if(s.even)X.push("偶数判定");
    if(hits>1)X.push(`${hits}回`);
    if(s.spread)X.push("散らす");
    if(s.lostDice||s.lostPow||s.rage)X.push("手負いで伸びる");
    if(s.lifeSteal||s.drain||s.feast||s.devourHeal)X.push("吸収");
    if(s.loot||s.steal||s.mpDrain)X.push("奪う");
    if(s.again)X.push("もう一度");
    if(s.charm)X.push("混乱");
    if(s.devour)X.push("即死");
    if(s.jealous)X.push("差で伸びる");
    if(s.selfBuff||s.selfDef)X.push("自分に代償/強化");
    if(s.earlyOnly)X.push(`${s.earlyOnly}R まで`);
    if(s.backOnly||s.slower||s.front)X.push("狙い先に条件");
    if(s.once)X.push("1回だけ");
    rows.push({g,n:s.n.replace(/ /g,""),need,dice:s.dice||0,mul,mp:s.mp||0,cd:s.cd||0,
      mine:+mine.toFixed(2), base:+base.toFixed(2),
      ratio:base>0?+(mine/base).toFixed(2):99, x:X.join("・")});
  }));
  return {rows, ladder:L.map(r=>({n:r.n.replace(/ /g,""),need:r.need,mul:r.mul,mp:r.mp,
    eff:+eff(r.need,NDICE,r.mul).toFixed(2)}))};
},NDICE);
console.log(`■ タダの階段（ダイス ${NDICE}個・しきい値4 のとき）`);
out.ladder.forEach(r=>console.log(
  `   ${r.n.padEnd(5)} 必要${r.need} ×${r.mul.toFixed(2)} MP${String(r.mp).padStart(2)}　ならし ${r.eff}`));
console.log(`\n■ 覚える技 ${out.rows.length} 件　（比 = ならし ÷ 同じ段のタダの札）`);
console.log("   " + "職".padEnd(9)+"技".padEnd(13)+"必要 ダイス 倍率  MP 再  ならし   比  ほかの働き");
out.rows.sort((a,b)=>a.ratio-b.ratio).forEach(r=>{
  const mark=r.ratio<1?(r.x?"△":"✗"):" ";
  console.log(`  ${mark}${r.g.padEnd(9)}${r.n.padEnd(13)}`+
    ` ${r.need}  ${String(r.dice||"").padStart(3)}  ${r.mul.toFixed(2)} ${String(r.mp).padStart(2)} ${String(r.cd).padStart(2)}`+
    `  ${String(r.mine).padStart(6)} ${String(r.ratio).padStart(5)}  ${r.x}`);
});
const bad=out.rows.filter(r=>r.ratio<1&&!r.x);
console.log(`\n✗ タダの札より弱く 別の働きも無い … ${bad.length} 件`+
  (bad.length?"　"+bad.map(r=>r.n).join("・"):""));
const weak=out.rows.filter(r=>r.ratio<1&&r.x);
console.log(`△ タダの札より弱いが 別の働きはある … ${weak.length} 件`);
console.log(errs.length?"⚠ "+[...new Set(errs)].join("\n⚠ "):"例外なし");
await b.close();
