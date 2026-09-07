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
  /* ===== 必要成功数は **スキルの性格**で決める =====
     MP から出してはいけない。MP は「何回使えるか」、
     必要成功数は「当たりにくさ」── **別の軸**。
     混ぜると「成功1だが MP が重い」スキルが作れなくなる。

       必要1 … 当てること自体が主眼でないもの。デバフ・小技・布石
       必要2 … 職の主力。狙って撃つもの
       必要3 … 決め技。当たれば大きい、外せば何も残らない

     1件ずつ 書いて置く。式で出すものではない。 */
  const NEED={
    /* ナイト ── 受けて耐える */
    ak4:3,  /* 渾身 …「当てにくいが通れば重い」*/
    ak5:1,  /* 兜割り … VIT を削る布石。当てたい */
    ak6:1,  /* 威圧 … デバフ。当てたい */
    ak7:2,  /* 薙ぎ払い … 手前3体。範囲は当たってこそ */
    /* アーチャー ── 遠くから抜く */
    aa1:3,  /* 徹甲矢 … VIT を完全に無視する決め技 */
    aa2:2,  /* 貫通矢 … 縦に2体。位置取りの技 */
    aa4:3,  /* 狙撃 … 名のとおり精密 */
    aa5:1,  /* 乱れ撃ち … 数を撃つ。偶数判定という別の当て方 */
    aa6:1,  /* 足止めの矢 … デバフ。当てたい */
    aa7:2,  /* アローレイン … 面を制圧する */
    /* スカウト ── 手数 */
    as1:3,  /* 二段突き … ダイス+2 で上の段を狙う技 */
    as2:1,  /* 連撃 … 6 が出ると伸びる。数を振る技 */
    as3:2,  /* 急所突き … 職の主力 */
    as4:3,  /* 首刈り …「一撃で断つ」*/
    as6:2,  /* 追い討ち … もう一度動ける。強い */
    as7:1,  /* シャドウステップ … 麻痺の布石 */
    /* ウィザード ── 術 */
    am1:1,  /* マジックショット … MP1 の基本術 */
    am2:2, am3:2, am4:2, am5:2,   /* 属性の主力4種 */
    am6:3, am7:3,                 /* インフェルノ・アースクエイク … 大魔法 */
    /* 種族 */
    akd1:2, /* 岩砕き */
    akd2:3, /* ロックスパイク … 上位の術 */
    ake1:2, /* 精霊の矢 */
    akb2:1, /* ビーストハウル … 全体の咆哮。当ててこそ */
    akh1:2, /* 火事場の力 … 追い込まれて出る */
    akh2:3, /* 全力 … ダイス+2 の決め技 */
    /* 欲望 */
    aen1:1, /* 呪詛 … デバフ */
    aen2:2, /* 簒奪 … 強化を奪う技巧 */
    aen3:2, /* 妬心 … HP 差で伸びる */
    agr2:1, /* エナジードレイン … MP を吸う布石 */
    agr3:1, /* 略奪 … 金貨を奪う */
    awr1:3, /* 血の契 … MP0 の代わりに 当てにくい */
    awr2:2, /* 逆境 … 受けたぶん伸びる */
    awr3:2, /* 復讐 … ダイスが増える */
    asl3:1, /* ため息 … デバフ */
    agl1:2, /* 捕食 … HP を吸う */
    agl2:3, /* 丸呑み … 瀕死を断つ決め技 */
    agl3:2, /* 暴飲暴食 … 全体 */
    apr2:2, /* 見下す … 格下のみ */
    apr3:3, /* 王の一撃 … 序盤だけの大技 */
    alu1:2, /* 魅了 … 混乱を乗せる */
    alu2:1, /* 甘い囁き … デバフ */
    alu3:1, /* 誘惑 … デバフ */
  };
  const needOf=s=>NEED[s.id]||s.suc||1;
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
