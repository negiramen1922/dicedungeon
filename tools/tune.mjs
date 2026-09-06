/* 敵の目盛りを合わせる。上限を Lv100 にしたぶん 一味が強くなったので、
   **段ごとに何倍返せば 昔と同じ手応えになるか**を測って出す。

     node tools/tune.mjs                 いまの値で 段ごとの倍率を出す
     node tools/tune.mjs <比べる版.html> その版を目標にする

   余裕 = 耐えるT ÷ 倒すT。
   敵の HP と 与ダメを どちらも k 倍すると 余裕は 1/k^2 になるので、
   目標との比の平方根が「返すべき倍率」になる。                       */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
import {EXPECT_SRC} from './expect.mjs';

const REF=process.argv.find(a=>a.endsWith('.html'))||null;
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});

async function measure(file){
  const pg=await b.newPage();
  await pg.goto('http://localhost:8765/'+file);await pg.waitForTimeout(800);
  await pg.evaluate(EXPECT_SRC);
  const out=await pg.evaluate(()=>{
    const R={};
    Object.entries(AREAS).forEach(([ak,A])=>{
      if(A.wip)return;
      sel.job="knight";sel.race="hume";sel.orig="greed";sel.area=ak;
      newGame();dive(ak);
      const lv=TIERLV[(A.tier||1)-1]||1;
      for(let i=1;i<lv;i++){me.lv++;growUp();syncMates();}
      party.forEach(u=>recalcMe(u,false));
      RUN.area=ak;RUN.cur={r:8};RUN.boss=false;
      const ourHP=party.reduce((a,u)=>a+u.maxHP,0);
      const meas=(enc,boss)=>{
        sel.enc=enc;RUN.boss=!!boss;foes=makeFoes();RUN.boss=false;
        let hp=0,dmg=0,our=0;
        foes.forEach(f=>{hp+=f.maxHP;
          const tgt=foeTarget(f),tot=f.acts.reduce((x,a)=>x+(a.w||1),0);
          f.acts.forEach(a=>{ if(a.k==="atk")dmg+=(a.w||1)/tot*expFoeAct(f,a,tgt); });});
        party.forEach(u=>{const t=foeLine()[0];if(t)our+=expMineAtk(u,t);});
        return (ourHP/Math.max(1,dmg))/(hp/Math.max(1,our));
      };
      const avg=k=>{const l=(A[k]||[]).map(e=>meas(e,false));
        return l.length?l.reduce((a,b)=>a+b,0)/l.length:0;};
      R[ak]={tier:A.tier,lv,norm:avg("norm"),hard:avg("hard"),
             elite:avg("elite"),boss:meas(A.boss,true)};
    });
    return R;
  });
  await pg.close();
  return out;
}

const now=await measure('index.html');
if(!REF){
  console.log("いまの手応え（余裕・1.0で拮抗）");
  for(const k in now)console.log(`  段${now[k].tier} Lv${String(now[k].lv).padStart(3)} ${k.padEnd(6)}`+
    ["norm","hard","elite","boss"].map(x=>("×"+now[k][x].toFixed(2)).padStart(8)).join(""));
  await b.close();process.exit(0);
}
const ref=await measure(REF);
console.log(`目標 ${REF} に合わせるための 敵の倍率\n`);
console.log("段  区画        目標(普通)  いま(普通)   比    返す倍率");
const byTier={};
for(const k in now){
  const t=now[k].tier;
  const r=["norm","hard","elite","boss"].filter(x=>ref[k][x]>0)
    .map(x=>now[k][x]/ref[k][x]);
  const ratio=r.reduce((a,b)=>a+b,0)/r.length;
  (byTier[t]=byTier[t]||[]).push(ratio);
  console.log(`${t}   ${k.padEnd(8)} ×${ref[k].norm.toFixed(2).padStart(6)} ×${now[k].norm.toFixed(2).padStart(7)}`+
    `  ×${ratio.toFixed(2).padStart(5)}   ×${Math.sqrt(ratio).toFixed(2)}`);
}
console.log("\n段ごとに返すべき倍率（HP と 与ダメ の両方に掛ける）");
for(const t of Object.keys(byTier).sort()){
  const m=byTier[t].reduce((a,b)=>a+b,0)/byTier[t].length;
  console.log(`  段${t}　×${Math.sqrt(m).toFixed(2)}`);
}
await b.close();
