import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/index.html');await pg.waitForTimeout(800);
const out=await pg.evaluate(()=>{
  const L=[];
  slot=0;sel.job="knight";sel.race="hume";sel.orig="greed";
  newGame();closeModal();
  const hero=me;
  const setSize=n=>{
    const l=[hero];
    if(n>=2)l.push(makeMate("mage","hume",hero.lv));
    if(n>=3)l.push(makeMate("archer","hume",hero.lv));
    setParty(l);
    party.forEach(u=>{while(u.lv<hero.lv){u.lv++;growUp(u);}recalcMe(u,false);u.HP=u.maxHP;});
  };
  const meas=(ak,enc,boss,row)=>{
    sel.enc=enc;RUN.cur={r:row};RUN.boss=!!boss;
    foes=makeFoes();RUN.boss=false;
    const ourHP=party.reduce((a,u)=>a+u.maxHP,0);
    let hp=0,dmg=0,our=0;
    foes.forEach(f=>{hp+=f.maxHP;
      const tgt=foeTarget(f),tot=f.acts.reduce((x,a)=>x+(a.w||1),0);
      f.acts.forEach(a=>{ if(a.k==="atk"){
          const per=perHit(powOf(f,{pct:a.pct||0,pow:a.pow||0}),defOf(tgt));
          dmg+=(a.w||1)/tot*(a.dice||a.diceRand||1)*per*0.55;}
        else if(a.k==="hex"&&a.poison)dmg+=(a.w||1)/tot*a.poison*1.5;});});
    party.forEach(u=>{const t=foeLine()[0];if(!t)return;
      const thr=threshold(u,t,{}),n=Math.max(1,u.wep.hands);
      our+=n*((7-thr)/6)*perHit(Math.round(powOf(u,{})*orgMul("outMul",u)),defOf(t));});
    return (ourHP/dmg)/(hp/our);
  };
  const g=(ak,k,row)=>{const rows=(AREAS[ak][k]||[]).map(e=>meas(ak,e,false,row));
    return rows.reduce((a,b)=>a+b,0)/rows.length;};
  L.push("場所ごとの前提と、実際の人数での手応え（余裕・1.0で拮抗）");
  L.push("場所            前提  人数  普通    重い    精鋭    ボス");
  const rows=[
    ["plain",4,3,"草原 前半(段3)"],["plain",4,3,"草原 前半(段3)"],["plain",4,3,"草原 前半(段3)"],
    ["plain",4,15,"草原 後半(段15)"],["plain",4,15,"草原 後半(段15)"],["plain",4,15,"草原 後半(段15)"],
    ["seed",8,3,"木漏れ日の森"],["seed",8,3,"木漏れ日の森"],["seed",8,3,"木漏れ日の森"],
  ];
  rows.forEach(([ak,lv,row,nm],i)=>{
    const size=(i%3)+1;
    dive(ak);
    while(hero.lv<lv){hero.lv++;growUp(hero);}
    setSize(size);
    RUN.cur={r:row};
    const want=wantParty();
    L.push(`${nm.padEnd(15,"　")} ${want}人  ${size}人 `+
      ["norm","hard","elite"].map(k=>("×"+g(ak,k,row).toFixed(2)).padStart(7)).join(" ")+
      " "+("×"+meas(ak,AREAS[ak].boss,true,ROWS-1).toFixed(2)).padStart(7));
  });
  return L;
});
console.log(out.join("\n"));console.log("ERR",errs.slice(0,3));
await b.close();
