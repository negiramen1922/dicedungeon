/* ===== 経験の表を 潜行の回数で見る =====
   1回潜るごとに どこまで上がるか。区画の適正レベルを追い越していないか。
   使い方: node tools/expchk.mjs                                           */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/index.html');await pg.waitForTimeout(700);
const r=await pg.evaluate(()=>{
  sel.job="knight";sel.race="hume";sel.orig="greed";newGame();closeModal();
  const cum=n=>{let s=0;for(let i=1;i<=n;i++)s+=EXPNEED[i];return s;};
  const lvAt=e=>{let s=0;for(let n=1;n<=LVMAX;n++){s+=EXPNEED[n];if(s>e)return n;}return LVMAX;};
  const O=[];
  const order=["plain","seed","cave","wtree","hall","city"];
  let lv=1,tot=0;
  order.forEach(k=>{
    const A=AREAS[k];if(!A||A.wip)return;
    const step=(A.tier||1)-1;
    const one=(kd)=>Math.round({battle:24,elite:55,boss:110}[kd]*(1+step*0.55));
    const dive=8*one("battle")+one("elite")+one("boss");
    const rows=[];
    for(let d=1;d<=4;d++){
      const cap=TIERLV[(A.tier||1)-1]!==undefined?tierCap(A.tier||1):LVMAX;
      const mul=Math.max(0,1-Math.max(0,lv-cap)*0.34);
      tot+=Math.round(dive*mul); lv=lvAt(tot);
      rows.push(lv);
    }
    O.push({n:A.n.replace(/ /g,""),tier:A.tier,適正:TIERLV[(A.tier||1)-1],上限:tierCap(A.tier||1),
      一回:dive,rows});
  });
  const tbl=[1,10,25,50,75,100].map(n=>[n,EXPNEED[n],cum(n)]);
  return {O,tbl,総量:cum(100),
    式:(EXPNEED.__src||"")};
});
console.log("経験の表（EXPNEED）");
console.log("  Lv    次に要る   そこまでの累計");
r.tbl.forEach(([n,e,c])=>console.log("  "+String(n).padStart(3)+String(e).padStart(9)+String(c).padStart(14)));
console.log("  Lv100 までの総量 "+r.総量);
console.log("\n1回の潜行（8戦＋手練れ1＋ボス1）で どこまで上がるか");
console.log("区画                 適正  上限   1回の経験   1回目 2回目 3回目 4回目");
r.O.forEach(o=>console.log("  "+o.n.padEnd(14,"　").slice(0,11)+
  String(o.適正).padStart(5)+String(o.上限).padStart(6)+String(o.一回).padStart(10)+
  "     "+o.rows.map(x=>("Lv"+x).padStart(6)).join("")));
if(errs.length)console.log("ERR",errs.slice(0,2));
await b.close();
