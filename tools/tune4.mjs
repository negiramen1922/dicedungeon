/* 段4 ── 区画ごとの手応えを 目標の形に寄せる倍率を出す。

     node tools/tune4.mjs            いまの手応えと 返すべき倍率
     node tools/tune4.mjs <版.html>  その版で測る

   出すのは AREATOUGH（普通・重い・精鋭）と BOSSTOUGH（ボス）。
   どちらも 最大HP と 与ダメの両方に掛かるので 余裕は 1/k² で動く
   ── 返すべき倍率は √(いま ÷ 目標)。
   `perHit` が引き算なので 1回では決まらない。**2〜3回まわすこと。** */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
import {EXPECT_SRC} from './expect.mjs';

/* 目標。段が進むほど じわじわ重くなる形にしてある。
   1.0 が相打ち。普通は快勝、精鋭とボスは 用意が要る、くらい。

   〔α1.0.035 で引き締めた〕技を46件配り直して パーティの火力が 1.3〜1.5倍に
   なったのに 敵の硬さが据え置きだった。norm は 普通・重い・精鋭 を
   ならした値なので、普通が ×7 でも精鋭が ×1.7 なら真ん中に来てしまう。
   **前提の人数で挑んで、普通は快勝・ボスは拮抗**になる形へ寄せる。 */
const WANT={1:{norm:2.6,elite:1.25,boss:1.15},2:{norm:2.4,elite:1.20,boss:1.10},
            3:{norm:2.2,elite:1.15,boss:1.05},4:{norm:2.0,elite:1.10,boss:1.00}};

const FILE=(process.argv.find(a=>a.endsWith('.html'))||'index.html');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/'+FILE);await pg.waitForTimeout(800);
await pg.evaluate(EXPECT_SRC);
const R=await pg.evaluate(()=>{
  const out={};
  Object.entries(AREAS).forEach(([ak,A])=>{
    if(A.wip)return;
    sel.job="knight";sel.race="hume";sel.orig="greed";sel.area=ak;
    newGame();dive(ak);
    RUN.area=ak;RUN.cur={r:8};RUN.boss=false;
    const lv=TIERLV[(A.tier||1)-1]||1;
    for(let i=1;i<lv;i++){me.lv++;growUp();syncMates();}
    const want=wantParty(), jobs=["mage","archer","scout"], l=[me];
    for(let i=0;l.length<want&&i<jobs.length;i++)l.push(makeMate(jobs[i],"hume",me.lv));
    setParty(l);
    party.forEach(u=>recalcMe(u,false));
    const ourHP=party.reduce((a,u)=>a+u.maxHP,0);
    /* ===== 精鋭の上乗せも 測る（α1.0.035） =====
       makeFoes() を直に呼んでいたので、**prepareBattle の中にある
       精鋭の ×ELITEHP / ×ELITESTR が一度も掛かっていなかった。**
       表に出ていた「精鋭」は ただの重い顔ぶれで、実戦はこれより厳しい。
       ── 測っていないものを「釣り合っている」と言わないこと。 */
    const meas=(enc,boss,elite)=>{
      sel.enc=enc;RUN.boss=!!boss;RUN.elite=!!elite;foes=makeFoes();
      RUN.boss=false;RUN.elite=false;
      let hp=0,dmg=0,our=0;
      foes.forEach(f=>{hp+=f.maxHP;
        const tgt=foeTarget(f),tot=f.acts.reduce((x,a)=>x+(a.w||1),0);
        f.acts.forEach(a=>{ if(a.k==="atk")dmg+=(a.w||1)/tot*expFoeAct(f,a,tgt); });});
      party.forEach(u=>{const t=foeLine()[0];if(t)our+=expMineAtk(u,t);});
      return (ourHP/Math.max(1,dmg))/(hp/Math.max(1,our));
    };
    const avg=(k,elite)=>{const l2=(A[k]||[]).map(e=>meas(e,false,elite));
      return l2.length?l2.reduce((a,b)=>a+b,0)/l2.length:0;};
    out[ak]={tier:A.tier,n:A.n.replace(/ /g,""),
      norm:avg("norm"),hard:avg("hard"),elite:avg("elite",true),boss:meas(A.boss,true),
      tough:(typeof AREATOUGH!=="undefined"&&AREATOUGH[ak])||1,
      btough:(typeof BOSSTOUGH!=="undefined"&&BOSSTOUGH[ak])||1,
      etough:(typeof ELITETOUGH!=="undefined"&&ELITETOUGH[ak])||1};
  });
  return out;
});
console.log("区画　　　　　　 段  普通   重い   精鋭   ボス │ いまの倍率");
for(const k in R){const r=R[k];
  console.log(`  ${r.n.padEnd(12,"　")}${r.tier} `+
    ["norm","hard","elite","boss"].map(x=>("×"+r[x].toFixed(2)).padStart(7)).join("")+
    ` │ 区画 ${r.tough.toFixed(2)}　ボス ${r.btough.toFixed(2)}`);}
console.log("\n返すべき倍率（AREATOUGH / BOSSTOUGH に掛ける）");
const A={},B={},E={};
for(const k in R){const r=R[k], w=WANT[r.tier]||WANT[4];
  /* 普通・重い・精鋭 の平均を 目標の形（普通:重い:精鋭 ＝ 1:0.55:0.38）に照らす */
  /* 精鋭は自分の摘み（ELITETOUGH）で合わせるので、ここでは混ぜない。
     混ぜていたせいで、いちばん低い精鋭が 普通に引きずられて潰れていた */
  const mid=(r.norm+r.hard)/2;
  const wantMid=w.norm*(1+0.55)/2;
  A[k]=+(r.tough*Math.sqrt(mid/wantMid)).toFixed(2);
  /* ボスは 区画の倍率が先に掛かるので、そのぶんを差し引いて出す */
  const afterArea=r.boss*Math.pow(r.tough/A[k],2);
  B[k]=+(r.btough*Math.sqrt(afterArea/w.boss)).toFixed(2);
  /* 精鋭も 区画の倍率が先に掛かるので そのぶんを差し引く */
  const eAfter=r.elite*Math.pow(r.tough/A[k],2);
  E[k]=+(r.etough*Math.sqrt(eAfter/w.elite)).toFixed(2);
  console.log(`  ${r.n.padEnd(12,"　")}区画 ${A[k]}　精鋭 ${E[k]}　ボス ${B[k]}`);}
console.log("\nconst AREATOUGH="+JSON.stringify(A)+";");
console.log("const ELITETOUGH="+JSON.stringify(E)+";");
console.log("const BOSSTOUGH="+JSON.stringify(B)+";");
console.log(errs.length?"⚠ "+[...new Set(errs)].join("\n"):"");
await b.close();
