/* 育ち方の測り。1回の潜行で何戦できるか → 何回潜れば次の区画へ行けるか。
   稼ぎ止めが効いているかも見る（同じ区画を回り続けたときの伸び）。 */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/index.html');await pg.waitForTimeout(800);
const out=await pg.evaluate(()=>{
  const L=[];
  /* ゲームと同じ式（finish の中と揃える）。目減りが 0 なら 本当に 0 */
  const xpOf=(k,lv,cap)=>{const m=expMul(lv,cap);
    return m>0?Math.max(1,Math.round(expFor(k)*m)):0;};
  sel.job="knight";sel.race="hume";sel.orig="greed";
  newGame();closeModal();
  /* 1回の潜行に 戦いの部屋がいくつあるか（地図を20回作って平均） */
  let bat=0,eli=0,n=0;
  for(let i=0;i<20;i++){
    dive("plain");
    Object.values(RUN.M.node).forEach(nd=>{
      if(nd.t==="battle")bat++; else if(nd.t==="elite")eli++;
    });
    n++;
  }
  /* 1本の道で通る部屋はそのうち一部。ROWS 段を1つずつ通る */
  L.push(`地図ひとつ ${Object.keys(RUN.M.node).length} 部屋　うち 戦い ${(bat/n).toFixed(1)}　手練れ ${(eli/n).toFixed(1)}`);
  L.push(`1本の道で通るのは ${ROWS} 段　＝ おおよそ ${Math.round(ROWS*0.45)} 戦 ＋ ボス1`);

  /* 経験の入り方 */
  const rows=[];
  [["plain",1],["seed",2],["cave",2],["wtree",3],["hall",3],["city",4]].forEach(([ak,tier])=>{
    dive(ak);
    rows.push({ak,n:AREAS[ak].n.replace(/ /g,""),tier,
      fit:TIERLV[tier-1],cap:tierCap(tier),
      bat:expFor("battle"),eli:expFor("elite"),boss:expFor("boss"),
      gold:GOLD.battle[Math.min(2,worldStep())]});
  });
  L.push("");
  L.push("区画　　　　　段 ちょうどよい 上限  経験(戦/手練れ/ボス)  金貨");
  rows.forEach(r=>L.push(
    `${r.n.padEnd(11,"　")} ${r.tier}   Lv${String(r.fit).padStart(2)}    Lv${String(r.cap).padStart(2)}   ${
      String(r.bat).padStart(3)}/${String(r.eli).padStart(3)}/${String(r.boss).padStart(3)}       ${r.gold}`));

  /* 1区画を 何回潜れば 上限に届くか */
  L.push("");
  L.push("上限レベルまで 何回潜るか（1潜行 ＝ 8戦＋ボス1、手練れ1）");
  [["plain",1,1],["seed",2,8],["cave",2,8],["wtree",3,13],["hall",3,13],["city",4,17]].forEach(([ak,tier,from])=>{
    dive(ak);
    const cap=tierCap(tier);
    let lv=from, exp=0, dives=0, guard=0;
    while(lv<cap&&guard++<400){
      /* 1回の潜行 */
      dives++;
      let gain=0;
      for(let i=0;i<8;i++)gain+=xpOf("battle",lv,cap);
      gain+=xpOf("elite",lv,cap);
      gain+=xpOf("boss",lv,cap);
      exp+=gain;
      while(lv<EXPNEED.length-1&&exp>=EXPNEED[lv]){exp-=EXPNEED[lv];lv++;}
    }
    L.push(`  ${AREAS[ak].n.replace(/ /g,"").padEnd(11,"　")} Lv${from} → Lv${cap}　${dives} 回`);
  });

  /* 稼ぎ止め：草原だけを回り続けたら どこで止まるか */
  L.push("");
  L.push("草原だけを回り続けたら（稼ぎ止めの効き）");
  dive("plain");
  let lv=1,exp=0;
  for(let d=1;d<=12;d++){
    let gain=0;
    for(let i=0;i<8;i++)gain+=xpOf("battle",lv,tierCap(1));
    gain+=xpOf("elite",lv,tierCap(1));
    gain+=xpOf("boss",lv,tierCap(1));
    exp+=gain;
    while(lv<EXPNEED.length-1&&exp>=EXPNEED[lv]){exp-=EXPNEED[lv];lv++;}
    if(d<=6||d===8||d===12)L.push(`  ${String(d).padStart(2)}回目まで → Lv ${lv}　（この回の経験 ${gain}）`);
  }
  return L;
});
console.log(out.join("\n"));console.log("ERR",errs.slice(0,3));
await b.close();
