/* 火事場の力・妬心・逆境 のログが 二重に出ていないか、
   火事場が二重取りしていないかを 本物の戦闘で確かめる */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:430,height:900}});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/index.html');
await pg.evaluate(()=>{try{localStorage.clear()}catch(e){}});
await pg.reload();await pg.waitForTimeout(900);
await pg.evaluate(()=>{window.wait=async()=>{};window.ovMsg=()=>{};window.rollDice=async()=>{};
  window.ovHide=()=>{};window.lukOv=async()=>{};});
const res=await pg.evaluate(async()=>{
  sel.job="knight";sel.race="hume";sel.orig="wrath";sel.area="plain";
  newGame(); closeModal(); me.lv=10; for(let i=0;i<9;i++)growUp(me); recalcMe(me,false);
  me.HP=Math.round(me.maxHP*0.35);  /* 半分以上 失っている */
  dive("plain"); sel.enc=AREAS.plain.solo[0]; RUN.elite=false; RUN.boss=false;
  prepareBattle();
  const t=foes[0]; t.HP=99999; t.maxHP=99999; t.block=0;
  const out=[];
  for(const [nm,opt] of [["火事場の力",{lostPow:true}],["妬 心",{jealous:true}],["逆 境",{rage:true}]]){
    const before=t.HP; const logs=[];
    const realLog=window.log; window.log=(h,c)=>{logs.push(String(h).replace(/<[^>]*>/g,""));realLog&&realLog(h,c);};
    me.taken=200;
    await playerAttack([t],{...opt});
    window.log=realLog;
    out.push({nm, 出た回数:logs.filter(l=>l.includes(nm.replace(/ /g,"")[0]+"")&&l.includes("威力")).length,
      ログ:logs.filter(l=>/威力/.test(l)), ダメージ:before-t.HP});
  }
  return out;
});
for(const r of res){
  console.log(`■ ${r.nm}　ダメージ ${r.ダメージ}`);
  r.ログ.forEach(l=>console.log("   "+l.replace(/\s+/g," ")));
  console.log("");
}
console.log(errs.length?"⚠ "+[...new Set(errs)].join("\n⚠ "):"例外なし");
await b.close();
