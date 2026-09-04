/* 全職の全スキルを 一度ずつ実際に使って、落ちるものが無いか調べる。
   反撃のような「条件が揃わないと通らない枝」を洗い出す。 */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/index.html');await pg.waitForTimeout(800);
const out=await pg.evaluate(async()=>{
  const bad=[],ok=[];
  window.wait=async()=>{};window.ovMsg=()=>{};window.rollDice=async()=>0;
  window.addDice=async(a)=>a;window.ovHide=()=>{};window.lungeUnit=async()=>{};
  window.fxOn=()=>{};window.popOn=()=>{};window.popSelf=()=>{};window.setHPBar=()=>{};
  sel.job="knight";sel.race="hume";sel.orig="greed";
  startRun();closeModal();
  for(let i=1;i<15;i++){me.lv++;growUp();syncMates();}
  const all=[];
  Object.entries(REW.act).forEach(([grp,list])=>list.forEach(s=>all.push({grp,s})));
  enterArea("plain",true);sel.enc="p_hard";RUN.elite=true;RUN.boss=false;
  startBattle();await engage();
  for(const {grp,s} of all){
    try{
      party.forEach(u=>{u.HP=u.maxHP;u.MP=999;u.block=0;u.counter=0;u.ail=[];u.half=false;});
      foes.forEach(f=>{f.HP=f.maxHP=99999;f.ail=[];f.block=0;});
      over=false;busy=false;pending=null;cur=me;
      me.sk=[{...s,cdLeft:0}];me.MP=999;
      const t=alive().find(f=>canTarget(f))||alive()[0];
      await resolvePlayer({kind:"skill",i:0},t);
      /* 構え系は 殴られてはじめて通る枝がある。必ず1発受けさせる */
      const f=alive()[0];
      f.tele=f.acts.find(a=>a.k==="atk")||f.acts[0];
      busy=false;
      await enemyAct(f);
      ok.push(s.n);
    }catch(e){ bad.push(`${grp} ${s.n}: ${e.message}`); }
  }
  return {n:all.length,ok:ok.length,bad};
});
console.log(`スキル ${out.n} 件を 使って→殴られて まで通した／通った ${out.ok} 件`);
console.log(out.bad.length?"⚠ "+out.bad.join("\n⚠ "):"落ちたスキル なし");
console.log("ERR",[...new Set(errs)].slice(0,8));
await b.close();
