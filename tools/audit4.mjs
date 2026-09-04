/* 手応えの物差し。**敵は本物の makeFoes で組む**ので、倍率を変えれば必ず反映される。
   耐えるT = 一味の合計HP ÷ 敵1ラウンドの与ダメ
   倒すT   = 敵の合計HP  ÷ 一味1ラウンドの与ダメ（遠さの +1/+2 込み）
   余裕    = 耐えるT ÷ 倒すT （1.0 で拮抗）
   引数 solo … 味方1人（昔の形）で測る */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/index.html');await pg.waitForTimeout(800);
const solo=process.argv.includes("solo");
const raw=process.argv.includes("raw");   // 倍率をかけない（昔の敵）
const out=await pg.evaluate(({solo,raw})=>{
  if(raw){FOEHP=1;FOESTR=1;}
  const LV={plain:4,seed:8,wtree:13,cave:8,hall:13,city:17};
  const R=[];
  Object.entries(AREAS).forEach(([ak,A])=>{
    if(A.wip)return;
    sel.job="knight";sel.race="hume";sel.orig="greed";sel.area=ak;
    newGame();dive(ak);
    if(solo)setParty([me]);
    for(let i=1;i<LV[ak];i++){me.lv++;growUp();syncMates();}
    party.forEach(u=>recalcMe(u,false));
    RUN.area=ak;RUN.cur={r:8};RUN.boss=false;
    const ourHP=party.reduce((a,u)=>a+u.maxHP,0);
    const meas=(enc,boss)=>{
      sel.enc=enc;RUN.boss=!!boss;
      foes=makeFoes();                    /* 本物の組み立てを通す */
      RUN.boss=false;
      let hp=0,dmg=0,our=0;
      foes.forEach(f=>{
        hp+=f.maxHP;
        const tgt=foeTarget(f);
        const tot=f.acts.reduce((x,a)=>x+(a.w||1),0);
        f.acts.forEach(a=>{
          if(a.k==="atk"){
            const per=perHit(powOf(f,{pct:a.pct||0,pow:a.pow||0}),defOf(tgt));
            dmg+=(a.w||1)/tot*(a.dice||a.diceRand||1)*per*0.55;
          }else if(a.k==="hex"&&a.poison)dmg+=(a.w||1)/tot*a.poison*1.5;
        });
      });
      party.forEach(u=>{
        const t=foeLine()[0]; if(!t)return;
        const thr=threshold(u,t,{});
        const n=Math.max(1,u.wep.hands);
        const per=perHit(Math.round(powOf(u,{})*orgMul("outMul",u)),defOf(t));
        our+=n*((7-thr)/6)*per;
      });
      return {hold:ourHP/dmg,kill:hp/our,ease:(ourHP/dmg)/(hp/our),n:foes.length};
    };
    const area={n:A.n.replace(/ /g,""),lv:me.lv,ourHP,g:{}};
    ["norm","hard","elite"].forEach(gr=>{
      const rows=(A[gr]||[]).map(k=>meas(k));
      if(rows.length)area.g[gr]=rows;
    });
    area.boss=meas(A.boss,true);
    R.push(area);
  });
  return R;
},{solo,raw});
const GN={norm:"普通",hard:"重い",elite:"精鋭"};
let all=[];
console.log((solo?"味方1人":"一味3人・横一列")+(raw?"／敵は昔のまま":`／敵 HP×${2.5} STR×${1.4}`));
for(const a of out){
  console.log(`\n══ ${a.n}  Lv${a.lv}　一味の合計HP ${a.ourHP}`);
  for(const g of ["norm","hard","elite"]){
    const rows=a.g[g]; if(!rows)continue;
    const e=rows.map(r=>r.ease); all=all.concat(e);
    console.log(`  ${GN[g]}  耐える ${Math.min(...rows.map(r=>r.hold)).toFixed(1)}〜${Math.max(...rows.map(r=>r.hold)).toFixed(1)}T`+
      `　倒す ${Math.min(...rows.map(r=>r.kill)).toFixed(1)}〜${Math.max(...rows.map(r=>r.kill)).toFixed(1)}T`+
      `　余裕 ×${(e.reduce((x,y)=>x+y,0)/e.length).toFixed(2)}`);
  }
  all.push(a.boss.ease);
  console.log(`  ボス  耐える ${a.boss.hold.toFixed(1)}T　倒す ${a.boss.kill.toFixed(1)}T　余裕 ×${a.boss.ease.toFixed(2)}`);
}
console.log(`\n全体の平均 余裕 ×${(all.reduce((x,y)=>x+y,0)/all.length).toFixed(2)}`);
console.log("ERR",errs.slice(0,3));
await b.close();
