/* ===== 当て技の必要成功数と威力を 一本の決めごとで配り直す =====
   〔乙の基準〕通常攻撃を 1.0 として
       必要1 … ×1.8   必要2 … ×3.2   必要3 … ×6.2   必要4 … ×13.0
   超過は 必要数によらず 一律 +30%。

   必要成功数は **MP**（作り手が置いた重さ）から決める。
   威力は 基準値に **効果の割引**を掛ける ── 効果も対価だから。

   使い方: node tools/skfit.mjs [--apply]
     --apply で index.html を書き換える。付けなければ 表を出すだけ。 */
import fs from 'node:fs';
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const APPLY=process.argv.includes("--apply");
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/index.html');await pg.waitForTimeout(700);
const out=await pg.evaluate(()=>{
  const BASE={1:1.8, 2:3.2, 3:6.2, 4:13.0};
  /* ===== 必要成功数 =====
     MP は古い仕組みの頃に置かれた数字なので、それだけでは意図した段を表さない。
       ① MP の帯（作り手が置いた重さ）
       ② すでに suc:2 / suc:3 と書いてあるもの（意図して上の段に置いたもの）
       ③ ダイスを増やす技（`dice`）は **上の段に届かせるための技**
     の いちばん高いものを採る。下げることはしない。 */
  const needOfMp=mp=>mp>=6?3:mp>=4?2:1;
  const needOf=s=>Math.max(needOfMp(s.mp||0), s.suc||1, s.dice?3:1);
  /* ===== 効果の割引 =====
     掛け合わせると 3つ重なったところで通常攻撃を下回る。
     いちばん重い割引は そのまま、2つ目からは **半分の効き**にする。 */
  const cutAll=ks=>{
    const ds=ks.map(k=>CUT[k]).filter(v=>v!==undefined).sort((a,b)=>a-b);
    if(!ds.length)return 1;
    let m=ds[0];
    for(let i=1;i<ds.length;i++)m*= (ds[i]>1? 1+(ds[i]-1)*0.5 : 1-(1-ds[i])*0.5);
    return m;
  };
  const CUT={
    複数3:0.42, 全体:0.38, 貫通:0.62, 防御無視:0.72, 状態異常:0.72,
    属性:0.92, 吸収:0.82, 奪う:0.82, 条件で伸びる:0.80, 連鎖:0.75,
    偶数:0.85, 行動不能:0.60, 即死:0.55, もう一度:0.55, 混乱:0.55,
    "ダイス+":0.55,
    自分に代償:1.10, 狙い条件:1.12, 序盤のみ:1.12, "1回だけ":1.12,
  };
  const tag=s=>{const X=[];
    if(s.dice)X.push("ダイス+");
    if(s.allFoes)X.push("全体"); else if(s.all)X.push("複数3");
    if(s.column||s.pierce)X.push("貫通");
    if(s.pen)X.push("防御無視");
    if(s.ail)X.push("状態異常");
    if(s.el)X.push("属性");
    if(s.chain)X.push("連鎖");
    if(s.stun)X.push("行動不能");
    if(s.even)X.push("偶数");
    if(s.lostDice||s.lostPow||s.rage||s.jealous)X.push("条件で伸びる");
    if(s.lifeSteal||s.feast||s.devourHeal)X.push("吸収");
    if(s.loot||s.steal||s.mpDrain)X.push("奪う");
    if(s.again)X.push("もう一度");
    if(s.charm)X.push("混乱");
    if(s.devour)X.push("即死");
    if(s.selfBuff||s.selfDef)X.push("自分に代償");
    if(s.earlyOnly)X.push("序盤のみ");
    if(s.backOnly||s.slower||s.front)X.push("狙い条件");
    if(s.once)X.push("1回だけ");
    return X;};
  const rows=[];
  Object.keys(REW.act).forEach(g=>REW.act[g].forEach(s=>{
    if(s.kind!=="atk")return;
    const X=tag(s);
    const need=needOf(s);
    let mul=BASE[need]*cutAll(X);
    /* 底を打つ ── どの技も 基本攻撃（×1.0）より弱くはしない。
       複数を巻き込む技は 1体あたりで見るので 3体ぶんで ×1.2 を割らないこと */
    const floor=(X.includes("全体")||X.includes("複数3"))?0.45:1.0;
    if(mul<floor)mul=floor;
    mul=Math.round(mul*100)/100;
    rows.push({id:s.id,g,n:s.n,short:s.n.replace(/ /g,""),mp:s.mp||0,cd:s.cd||0,
      wasNeed:s.suc||1, wasMul:s.powMul||1, need, mul, x:X.join("・")||"素の一撃"});
  }));
  return rows;
});
console.log("■ 乙の基準　必要1 ×1.8 ／ 必要2 ×3.2 ／ 必要3 ×6.2 ／ 必要4 ×13.0　超過 一律 +30%");
console.log("■ 必要成功数は MP から　MP≤4→必要1　MP5-6→必要2　MP≥7→必要3\n");
const byG={};out.forEach(r=>(byG[r.g]=byG[r.g]||[]).push(r));
Object.keys(byG).forEach(g=>{
  console.log(`【${g}】`);
  byG[g].forEach(r=>console.log(
    `  ${r.short.padEnd(12)} MP${String(r.mp).padStart(2)} 再${r.cd}　`+
    `必要 ${r.wasNeed}→${r.need}　×${r.wasMul.toFixed(2)}→×${r.mul.toFixed(2)}`.padEnd(30)+
    `　${r.x}`));
});
const n={};out.forEach(r=>n[r.need]=(n[r.need]||0)+1);
console.log("\n■ 配ったあとの必要成功数　"+Object.entries(n).map(([k,v])=>`必要${k} ${v}件`).join("　"));
console.log(errs.length?"⚠ "+[...new Set(errs)].join("\n⚠ "):"例外なし");
if(APPLY){
  let src=fs.readFileSync("index.html","utf8");
  let hit=0;
  out.forEach(r=>{
    /* id で1件だけ引き当てて、その定義の suc / powMul を書き換える */
    const re=new RegExp(`(\\{id:"${r.id}",[^}]*?\\})`,"s");
    const m=src.match(re);
    if(!m){console.log("✗ 見つからない "+r.id);return;}
    let t=m[1];
    t = /suc:\s*[\d.]+/.test(t) ? t.replace(/suc:\s*[\d.]+/,`suc:${r.need}`)
        : t.replace(/kind:"atk",/,`kind:"atk",suc:${r.need},`);
    t = /powMul:\s*[\d.]+/.test(t) ? t.replace(/powMul:\s*[\d.]+/,`powMul:${r.mul}`)
        : t.replace(/kind:"atk",/,`kind:"atk",powMul:${r.mul},`);
    src=src.replace(m[1],t);hit++;
  });
  fs.writeFileSync("index.html",src);
  console.log(`\n✓ ${hit} 件を index.html に書き込んだ`);
}
await b.close();
