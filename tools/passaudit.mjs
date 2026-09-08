/* ===== パッシブの棚卸し =====
   ぜんぶの特性について 2つ見る。

     ① 配 線 … その効果キーを **どこかが読んでいるか**。
                読んでいる場所が 1つも無ければ その特性は「置いてあるだけ」。
     ② 効 き … 実際に持たせて 数字が動くか。
                能力値・最大HP/MP・ならしの与ダメージ を見る。
                条件つきの特性は 条件を通してから測る（PCOND を全部 true にする）。

   ② が動かなくても ①が通っていれば「戦いの出来事で働く型」（倒したら回復 など）。
   ①が落ちているものは **どうやっても働かない。**

   使い方: node tools/passaudit.mjs                                        */
import fs from 'node:fs';
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
import {EXPECT_SRC} from './expect.mjs';

/* ---- ① 配線。定義そのものを外して、キーが読まれているか数える ---- */
const src=fs.readFileSync('index.html','utf8');
const i0=src.indexOf(" pass:{"), i1=src.indexOf("const CAT=");
const defs=src.slice(i0,i1);                   /* 定義のかたまり */
const rest=src.slice(0,i0)+src.slice(i1);      /* それ以外ぜんぶ */

const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/index.html');await pg.waitForTimeout(800);
await pg.evaluate(EXPECT_SRC);

const list=await pg.evaluate(()=>{
  const o=[];
  for(const pool in REW.pass)REW.pass[pool].forEach(p=>
    o.push({pool,id:p.id,n:p.n,k:p.ef.k,v:p.ef.v,w:p.ef.w,d:p.d}));
  return o;
});
/* ---- ② 効き。条件を全部通したうえで 持たせる前後を比べる ---- */
const eff=await pg.evaluate(()=>{
  /* 条件を素通しにする。「条件が偽だから動かない」を「働かない」と読み違えない */
  for(const k in PCOND)PCOND[k]=()=>true;
  const mk=()=>{
    sel.job="knight";sel.race="hume";sel.orig="greed";
    newGame();closeModal();dive("plain");
    for(let i=1;i<40;i++){me.lv++;growUp();}
    const u=me; setParty([u]); recalcMe(u,false);
    sel.enc=(AREAS.plain.norm||[])[0]; foes=makeFoes(); return u;
  };
  /* **本物の式**で見る。期待値の見積り（expect.mjs）は特性を見ていないので、
     そちらで測ると どの特性も「動かない」と出てしまう。 */
  const snap=u=>{
    recalcMe(u,false);
    const t=foeLine()[0];
    return {
      最大HP:u.maxHP, 最大MP:u.maxMP,
      守り:defOf(u), 速さ:dexOf(u), 威力:powOf(u,{}),
      攻撃ダイス:Math.max(1,skillDice(wepSkill(u),u)+passOn("dice",u)),
      索敵:Math.max(1,skillDice("search",u)+passOn("scout",u)),
      閾値:4-passOn("thr",u),
      威力上乗せ:passOn("powp",u)+passOn("allround",u)*6+passOn("fang",u)*8,
    };
  };
  const out={};
  const base=(()=>{const u=mk();u.pass=[];return snap(u);})();
  for(const pool in REW.pass)REW.pass[pool].forEach(p=>{
    const u=mk(); u.pass=[p];
    const s=snap(u); const d=[];
    for(const k in base)if(s[k]!==base[k])d.push(k+" "+base[k]+"→"+s[k]);
    out[p.id]=d;
  });
  return out;
});
await b.close();

const bad=[],ev=[],ok=[];
for(const p of list){
  /* 「読んでいる」とは passOn か ef.k との突き合わせのこと。
     ただの文字列（見立ての選択肢など）と 取り違えないようにする */
  const re=new RegExp('passOn\\("'+p.k+'"|ef\\.k==="'+p.k+'"','g');
  const reads=(rest.match(re)||[]).length;
  const moved=eff[p.id]||[];
  if(!reads) bad.push(p);
  else if(!moved.length) ev.push(p);
  else ok.push([p,moved]);
}
const nm=p=>(p.pool+"/"+p.n).padEnd(16,"　").slice(0,14);
console.log(`特性 ${list.length} 件`);
console.log(`\n✗ 配線が無い（置いてあるだけ・どうやっても働かない） ${bad.length} 件`);
bad.forEach(p=>console.log("  "+nm(p)+" ef.k="+p.k+"　"+p.d));
console.log(`\n○ 配線はあるが 止まったままでは見えない（戦いの出来事で働く型） ${ev.length} 件`);
ev.forEach(p=>console.log("  "+nm(p)+" ef.k="+p.k));
console.log(`\n✓ 持たせると 数字が動く ${ok.length} 件`);
ok.forEach(([p,d])=>console.log("  "+nm(p)+" "+d.join("　")));
if(errs.length)console.log("\nERR",errs.slice(0,3));
