/* 手応えの物差し。**敵は本物の makeFoes で組む**ので、倍率を変えれば必ず反映される。
   耐えるT = 一味の合計HP ÷ 敵1ラウンドの与ダメ
   倒すT   = 敵の合計HP  ÷ 一味1ラウンドの与ダメ（遠さの +1/+2 込み）
   余裕    = 耐えるT ÷ 倒すT （1.0 で拮抗）
   引数 solo … 味方1人（昔の形）で測る
   引数 grow … 技能の点を「得物で使う技能」に全部注いだ形で測る（上振れのほう）。
               何も注がない形（既定）との差が、技能の育ちの効き目になる */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
const FILE=(process.argv.find(a=>a.endsWith('.html'))||'index.html');
await pg.goto('http://localhost:8765/'+FILE);await pg.waitForTimeout(800);
const solo=process.argv.includes("solo");
const raw=process.argv.includes("raw");   // 倍率をかけない（昔の敵）
const grow=process.argv.includes("grow"); // 技能の点を全部 得物の技能へ
const out=await pg.evaluate(({solo,raw,grow})=>{
  if(raw){FOEHP=1;FOESTR=1;}
  /* 測るレベルは **その版の TIERLV** から引く。版によって上限が違うので
     ここを決め打ちにすると 比べ物にならない（α1.0.014）。 */
  const T=k=>TIERLV[(AREAS[k].tier||1)-1]||1;
  const LV={};Object.keys(AREAS).forEach(k=>{LV[k]=T(k);});
  const R=[];
  Object.entries(AREAS).forEach(([ak,A])=>{
    if(A.wip)return;
    sel.job="knight";sel.race="hume";sel.orig="greed";sel.area=ak;
    newGame();dive(ak);
    /* **その場所が前提にしている人数**まで一味を組む。
       α1 は ひとりで始まって町で雇う形になったので `newGame()` は
       `setParty([me])` を呼ぶ。ここを直さないまま
       「一味3人・横一列」と見出しに書いていた（α1.0.016 で直した）。
       敵の丈夫さは `PARTYHP` が前提の人数で割ってあるので、
       ひとりで測ると 段2以降が必ず「勝てない」と出る ── それは設計どおり。 */
    RUN.cur={r:8};
    if(!solo){
      const want=wantParty();
      const jobs=["mage","archer","scout"];
      const l=[me];
      for(let i=0;l.length<want&&i<jobs.length;i++)l.push(makeMate(jobs[i],"hume",me.lv));
      setParty(l);
    }else setParty([me]);
    for(let i=1;i<LV[ak];i++){me.lv++;growUp();syncMates();}
    /* 主人公は自分で注がないので、注がない形が既定。grow なら全部 得物の技能へ */
    if(grow)party.forEach(u=>{ if((u.skp|0)>0)skUp(wepSkill(u),u,u.skp); });
    party.forEach(u=>recalcMe(u,false));
    RUN.area=ak;RUN.cur={r:8};RUN.boss=false;
    const ourHP=party.reduce((a,u)=>a+u.maxHP,0);
    const meas=(enc,boss)=>{
      sel.enc=enc;RUN.boss=!!boss;
      foes=makeFoes();                    /* 本物の組み立てを通す */
      RUN.boss=false;
      let hp=0,dmg=0,our=0;
      /* ===== 必要成功数（α2）に合わせた見積り =====
         **本体の式を写している。**ここがずれると 測る意味が無くなるので、
         決めごとを変えたら 必ず両方直すこと（`XGAIN` / `XCAP` / `needOf`）。
         ひと振りで出る量 ＝ Σ_k P(k成功) × [k≧必要] × 威力×(1+0.25·min(2,k−必要)) */
      const comb=(n,k)=>{let r=1;for(let i=0;i<k;i++)r=r*(n-i)/(i+1);return r;};
      const binom=(n,k,p)=>comb(n,k)*Math.pow(p,k)*Math.pow(1-p,n-k);
      const expect=(n,thr,need,pow,def)=>{
        const p=(7-thr)/6; let out=0;
        for(let k=need;k<=n;k++)
          out+=binom(n,k,p)*perHit(Math.round(pow*(1+XGAIN*Math.min(XCAP,k-need))),def);
        return out;
      };
      foes.forEach(f=>{
        hp+=f.maxHP;
        const tgt=foeTarget(f);
        const tot=f.acts.reduce((x,a)=>x+(a.w||1),0);
        f.acts.forEach(a=>{
          if(a.k==="atk"){
            const nd=Math.max(1,a.dice||a.diceRand||1);
            const thr=threshold(f,tgt,{act:a});
            const pow=powOf(f,{pct:a.pct||0,pow:a.pow||0});
            dmg+=(a.w||1)/tot*expect(nd,thr,Math.max(1,a.suc||1),pow,defOf(tgt));
          }else if(a.k==="hex"&&a.poison)dmg+=(a.w||1)/tot*a.poison*1.5;
        });
      });
      party.forEach(u=>{
        const t=foeLine()[0]; if(!t)return;
        const thr=threshold(u,t,{});
        /* ダイスは **技能**から。得物の hands はもう見ない */
        const n=skillDice(wepSkill(u),u);
        const pow=Math.round(powOf(u,{})*orgMul("outMul",u));
        our+=expect(n,thr,1,pow,defOf(t));
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
},{solo,raw,grow});
const GN={norm:"普通",hard:"重い",elite:"精鋭"};
let all=[];
console.log((solo?"味方1人（昔の形）":"その場所が前提にしている人数で組む")+(raw?"／敵は昔のまま":""));
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
