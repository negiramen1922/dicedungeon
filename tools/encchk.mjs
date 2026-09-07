/* 遭遇ひとつずつの手応え。区画の摘みでは直せない **中の偏り** を見つける */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
import {EXPECT_SRC} from './expect.mjs';
const FILE=(process.argv.find(a=>a.endsWith('.html'))||'index.html');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/'+FILE);await pg.waitForTimeout(800);
await pg.evaluate(EXPECT_SRC);
const WANT={1:{norm:2.6,hard:1.45,elite:1.25},2:{norm:2.4,hard:1.35,elite:1.20},
            3:{norm:2.2,hard:1.25,elite:1.15},4:{norm:2.0,hard:1.15,elite:1.10}};
const out=await pg.evaluate(({WANT})=>{
  const rows=[];
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
    const meas=(enc,boss,elite)=>{
      sel.enc=enc;RUN.boss=!!boss;RUN.elite=!!elite;foes=makeFoes();
      RUN.boss=false;RUN.elite=false;
      let hp=0,dmg=0;
      const L=partyLine();
      const aimTargets=f=>{const a=aimOf(f,null);
        if(a==="back")return [L[L.length-1]||L[0]];
        if(a==="rand")return L.slice();
        return [L[0]];};
      foes.forEach(f=>{hp+=f.maxHP;
        const ts=aimTargets(f).filter(Boolean);
        const tot=f.acts.reduce((x,a)=>x+(a.w||1),0);
        f.acts.forEach(a=>{ if(a.k!=="atk")return;
          const d=ts.reduce((x,t)=>x+expFoeAct(f,a,t),0)/Math.max(1,ts.length);
          dmg+=(a.w||1)/tot*d;});});
      const t0=foeLine()[0];
      const R=expPartyRound(party,t0,hp);
      const roles={};
      foes.forEach(f=>{const r=roleOf(f);roles[r]=(roles[r]||0)+1;});
      return {ease:(ourHP/Math.max(1,dmg))/(hp/Math.max(1,R.our)),
        cnt:foes.length,hp:Math.round(hp),dmg:Math.round(dmg),roles,T:+R.T.toFixed(1)};
    };
    ["norm","hard","elite"].forEach(gr=>{
      (A[gr]||[]).forEach(e=>{
        const m=meas(e,false,gr==="elite");
        rows.push({area:A.n.replace(/ /g,""),tier:A.tier,gr,enc:e,
          n:ENCS[e].n.replace(/ /g,""),...m,want:WANT[A.tier][gr],
          tgh:(typeof ENCTOUGH!=="undefined"&&ENCTOUGH[e])||1});
      });
    });
    const mb=meas(A.boss,true);
    rows.push({area:A.n.replace(/ /g,""),tier:A.tier,gr:"boss",enc:A.boss,
      n:ENCS[A.boss].n.replace(/ /g,""),...mb,want:1.05});
  });
  return rows;
},{WANT});
const RN={tank:"盾",atk:"牙",shoot:"射",sup:"癒",boss:"主",part:"部"};
let area="";
const bad=[];
out.forEach(r=>{
  if(r.area!==area){area=r.area;console.log(`\n══ ${area}（段${r.tier}）`);}
  const off=r.ease/r.want;
  const mark=off>=1.5?"◎楽":off>=1.25?"○やや楽":off<=0.65?"✗重い":off<=0.8?"△やや重い":"　";
  if(off>=1.5||off<=0.65)bad.push(r);
  console.log(`  ${r.gr.padEnd(5)} ${r.n.padEnd(11,"　").slice(0,11)} ${r.cnt}体 `+
    `${Object.keys(r.roles).map(k=>RN[k]+r.roles[k]).join("").padEnd(8,"　")}`+
    ` 余裕 ×${r.ease.toFixed(2)} / 目標 ${r.want.toFixed(2)}  ${mark}`);
});
/* ===== 返すべき遭遇ごとの摘み =====
   HP にも与ダメにも掛かるので 余裕は 1/k² で動く → √(いま ÷ 目標)。
   0.6〜1.6 に収める。振り切れる顔ぶれは **摘みでは直せない** */
const LO=0.6, HI=1.6;
const T={}, over=[];
out.forEach(r=>{
  const cur=r.tgh||1;
  let v=+(cur*Math.sqrt(r.ease/r.want)).toFixed(2);
  if(v<LO||v>HI)over.push({...r,want2:v});
  v=Math.max(LO,Math.min(HI,v));
  if(Math.abs(v-1)>0.02||cur!==1)T[r.enc]=v;
});
console.log("\nconst ENCTOUGH="+JSON.stringify(T)+";");
if(over.length){
  console.log("\n⚠ 摘みでは直せない顔ぶれ（0.6〜1.6 の外・**編成を見直すこと**）");
  over.forEach(r=>console.log(`  ${r.area} ${r.gr} 「${r.n}」 ${r.cnt}体 ${
    Object.keys(r.roles).map(k=>RN[k]+r.roles[k]).join("")}　余裕 ×${r.ease.toFixed(2)}（目標 ${r.want}）→ 要る摘み ${r.want2}`));
}
/* 同じ役ばかりの顔ぶれ。手応えが振れる いちばんの原因 */
const solo=out.filter(r=>r.cnt>=3&&Object.keys(r.roles).length===1);
if(solo.length){
  console.log("\n△ 3体以上で 役がひとつだけの顔ぶれ（手応えが振れる）");
  solo.forEach(r=>console.log(`  ${r.area} ${r.gr} 「${r.n}」 ${r.cnt}体 ${
    Object.keys(r.roles).map(k=>RN[k]+r.roles[k]).join("")}　余裕 ×${r.ease.toFixed(2)}（目標 ${r.want}）`));
}
console.log("\n── 直したほうがよい遭遇（目標の 1.5倍より楽 か 0.65倍より重い）");
bad.forEach(r=>console.log(`  ${r.area} ${r.gr} 「${r.n}」　余裕 ×${r.ease.toFixed(2)}（目標 ${r.want}）　`+
  `敵HP計 ${r.hp}　敵の与ダメ/R ${r.dmg}　役 ${Object.keys(r.roles).map(k=>RN[k]+r.roles[k]).join("")}`));
if(errs.length)console.log("⚠ "+[...new Set(errs)].join("\n"));
await b.close();
