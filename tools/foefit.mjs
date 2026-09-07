/* ===== 敵の手の 必要成功数を 役ごとの帯に配り直す =====
   役が決めるのは 硬さと狙いだけではない。**当たり方**も役の一部。

     タンク　　… 軽く 確実に当てる（必要1中心）
     アタッカー… 痛い（必要1〜2）
     シューター… **波がある**（必要2〜3・当たりにくいが 通ると重い）
     サポート　… デバフが本体（必要1）
     ボス　　　… 手ごとに書いてあるので 触らない

   必要成功数を上げると当たりにくくなるので、**期待ダメージが変わらない
   ところまで pct を上げ直す**。動かすのは「当たり方の形」だけで、
   平均の重さは変えない ── そのあと encchk で場ごとに水平を取る。

     node tools/foefit.mjs           表を出すだけ
     node tools/foefit.mjs --apply   index.html を書き換える            */
import fs from 'node:fs';
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
import {EXPECT_SRC} from './expect.mjs';
const APPLY=process.argv.includes("--apply");
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/index.html');await pg.waitForTimeout(800);
await pg.evaluate(EXPECT_SRC);
const out=await pg.evaluate(()=>{
  /* 役ごとの帯。その敵の手を pct の軽い順に並べ、この順で配る */
  const BAND={tank:[1,1,2], atk:[1,2,2], shoot:[2,2,3], sup:[1,1,2]};
  /* 測るときの仮の相手。区画の段に合った味方ひとり */
  sel.job="knight";sel.race="hume";sel.orig="greed";sel.area="plain";
  newGame();dive("plain");RUN.area="plain";RUN.cur={r:8};
  for(let i=1;i<28;i++){me.lv++;growUp();}
  setParty([me]);recalcMe(me,false);
  const rows=[];
  Object.keys(FOE).forEach(k=>{
    const F=FOE[k], role=FROLE[k];
    if(!BAND[role])return;                       /* ボス・部位は触らない */
    const mk=()=>({...F,key:k,id:0,name:F.n,isFoe:true,
      HP:F.HP,maxHP:F.HP,ail:[],buffs:[],dbuffs:[],block:0});
    const f=mk();
    foes=[f];
    /* 場のすべてに及ぶ手（aim:"all"）は 手で置いた重さなので触らない。
       ひと振りで全員に入る形は 帯に押し込むものではない */
    const acts=(F.acts||[]).filter(a=>a.k==="atk"&&!a.aim);
    if(!acts.length)return;
    /* 軽い順。同率は書いてある順 */
    const order=acts.map((a,i)=>({a,i})).sort((x,y)=>((x.a.pct||0)-(y.a.pct||0))||(x.i-y.i));
    order.forEach((o,rank)=>{
      const a=o.a;
      const band=BAND[role];
      const want=band[Math.min(band.length-1,Math.round(rank*(band.length-1)/Math.max(1,order.length-1)))];
      const nd=Math.max(1,a.dice||a.diceRand||1);
      const thr=threshold(f,me,{act:a});
      const now=Math.max(1,a.suc||1);
      const base=window.expDmg(nd,thr,now,powOf(f,{pct:a.pct||0,pow:a.pow||0}),0,defOf(me));
      /* 期待ダメージが揃うところまで pct を探す */
      let lo=-90,hi=900,pct=a.pct||0;
      if(want!==now&&base>0){
        for(let i=0;i<40;i++){
          pct=(lo+hi)/2;
          const v=window.expDmg(nd,thr,want,powOf(f,{pct,pow:a.pow||0}),0,defOf(me));
          if(v<base)lo=pct; else hi=pct;
        }
        pct=Math.round(pct/5)*5;
      }
      const after=window.expDmg(nd,thr,want,powOf(f,{pct,pow:a.pow||0}),0,defOf(me));
      rows.push({key:k,foe:F.n.replace(/ /g,""),role,n:a.n,
        was:now,now:want,wasPct:a.pct||0,pct,
        base:+base.toFixed(1),after:+after.toFixed(1),dice:nd,thr});
    });
  });
  return rows;
});
const RN={tank:"盾",atk:"牙",shoot:"射",sup:"癒"};
let cur="",moved=0;
rows: for(const r of out){
  if(r.foe!==cur){cur=r.foe;console.log(`\n${RN[r.role]} ${r.foe}`);}
  const ch=(r.was!==r.now);
  if(ch)moved++;
  console.log(`   「${r.n}」`.padEnd(18,"　").slice(0,18)+
    ` 必要 ${r.was}${ch?" → "+r.now:"  "}　pct ${String(r.wasPct).padStart(4)}${
      ch?" → "+String(r.pct).padStart(4):"    "}　期待 ${r.base} → ${r.after}`);
}
console.log(`\n動かした手 ${moved} / ${out.length}`);
const off=out.filter(r=>Math.abs(r.after-r.base)>Math.max(1,r.base*0.06));
if(off.length){
  console.log("⚠ 期待ダメージが 6% より動いた手");
  off.forEach(r=>console.log(`  ${r.foe}「${r.n}」 ${r.base} → ${r.after}`));
}
if(APPLY){
  /* 〔罠〕`\{n:"..."[^}]*?\}` は ail:{...} の内側の } で止まる（skdesc で3度目）。
     **括弧を数えて**その敵の その手だけを切り出す。 */
  let s=fs.readFileSync("index.html","utf8"),n=0;
  const span=(str,from)=>{           /* from の { から 対応する } まで */
    let d=0,i=from;
    for(;i<str.length;i++){const c=str[i];
      if(c==="{")d++;else if(c==="}"){d--;if(!d)return i+1;}}
    return -1;
  };
  const byFoe={};
  out.forEach(r=>{(byFoe[r.key]=byFoe[r.key]||[]).push(r);});
  for(const key in byFoe){
    /* その敵の行を見つける。`key:{n:"..."` の形 */
    const at=s.indexOf("\n "+key+":{n:\"");
    if(at<0){console.log("⚠ 見つからない敵 "+key);continue;}
    const st=s.indexOf("{",at), en=span(s,st);
    let blk=s.slice(st,en);
    for(const r of byFoe[key]){
      if(r.was===r.now&&r.pct===r.wasPct)continue;
      const head=`{n:"${r.n}",k:"atk"`;
      let i=blk.indexOf(head);
      while(i>=0){
        const j=span(blk,i);
        let t=blk.slice(i,j);
        t=t.replace(/,suc:\d+/,"").replace(/,pct:-?\d+/,"");
        t=t.replace(/^\{n:"([^"]*)",k:"atk"/,`{n:"$1",k:"atk",suc:${r.now},pct:${r.pct}`);
        blk=blk.slice(0,i)+t+blk.slice(j);
        n++;
        i=blk.indexOf(head,i+t.length);   /* 段階（phases）にも同じ手がある */
      }
    }
    s=s.slice(0,st)+blk+s.slice(en);
  }
  fs.writeFileSync("index.html",s);
  console.log(`書き換えた ${n} 箇所`);
}
if(errs.length)console.log("⚠ "+[...new Set(errs)].join("\n"));
await b.close();
