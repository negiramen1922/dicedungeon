/* 宿（α1.0.018）
     ・傷のぶんだけ代金がかかるか
     ・全快するか・金貨が引かれるか
     ・傷が無いときは 押せない札になるか
     ・金貨が足りなければ 泊まれないか
     ・傲慢（店の値段が半分）が効くか                             */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const FILE=(process.argv.find(a=>a.endsWith('.html'))||'index.html');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:430,height:900}});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/'+FILE);
await pg.evaluate(()=>{try{localStorage.clear()}catch(e){}});
await pg.reload();await pg.waitForTimeout(900);
const setup=async(orig)=>pg.evaluate(o=>{
  sel.job="knight";sel.race="hume";sel.orig=o;sel.area="plain";
  newGame();closeModal();slot=0;
  setParty([me,makeMate("mage","hume",me.lv)]);
  party.forEach(u=>{u.HP=u.maxHP;u.MP=u.maxMP;});
  drawHome();
},orig);
const r=[];
await setup("wrath");
r.push(await pg.evaluate(()=>["傷が無いときの代金",innCost().gold,0]));
r.push(await pg.evaluate(()=>["傷が無いときの札",$("#hInn").disabled?"押せない":"押せる","押せない"]));
r.push(await pg.evaluate(()=>{
  party.forEach(u=>{u.HP=Math.round(u.maxHP*0.5);u.MP=Math.round(u.maxMP*0.5);});
  drawHome();
  const c=innCost();
  const wantHP=party.reduce((a,u)=>a+(u.maxHP-u.HP),0);
  const wantMP=party.reduce((a,u)=>a+(u.maxMP-u.MP),0);
  return ["半分傷ついたときの HP 合計",c.hp,wantHP];
}));
r.push(await pg.evaluate(()=>["代金の式",innCost().gold,
  Math.ceil(innCost().hp*INNHP+innCost().mp*INNMP)]));
r.push(await pg.evaluate(()=>["札に代金が出る",/\d+ 金貨/.test($("#hInn").textContent),true]));
/* 泊まる */
await pg.evaluate(()=>{me.gold=99999;innModal();});
await pg.waitForTimeout(300);
r.push(await pg.evaluate(()=>["泊まる札",$("#innGo").disabled?"押せない":"押せる","押せる"]));
const before=await pg.evaluate(()=>({g:me.gold,c:innCost().gold}));
await pg.locator('#innGo').click();await pg.waitForTimeout(400);
r.push(await pg.evaluate(()=>["全快したか",party.every(u=>u.HP===u.maxHP&&u.MP===u.maxMP),true]));
r.push(await pg.evaluate(g=>["金貨が引かれた",g.g-me.gold,g.c],before));
/* 金貨が足りない */
await pg.evaluate(()=>{closeModal();
  party.forEach(u=>{u.HP=1;u.MP=0;});me.gold=1;innModal();});
await pg.waitForTimeout(300);
r.push(await pg.evaluate(()=>["足りないときの札",$("#innGo").disabled?"押せない":"押せる","押せない"]));
r.push(await pg.evaluate(()=>["足りない額が出る",/足りない/.test($("#mbox").innerHTML),true]));
/* 控えは町に戻れば ただで癒える */
await pg.evaluate(()=>{closeModal();me.gold=9999;
  const m=makeMate("scout","hume",me.lv);m.HP=1;m.MP=0;bench=[m];
  RUN={id:"x",area:"plain",seen:[],cur:{r:1},over:false,entry:townSnap()};
  goTown("leave");closeModal();});
await pg.waitForTimeout(400);
r.push(await pg.evaluate(()=>["控えは町でただで癒える",
  bench[0].HP===bench[0].maxHP&&bench[0].MP===bench[0].maxMP,true]));
r.push(await pg.evaluate(()=>["宿代は パーティのぶんだけ",
  innCost().hp,party.reduce((a,u)=>a+(u.maxHP-Math.max(0,u.HP)),0)]));
/* 傲慢は半額 */
await pg.evaluate(()=>closeModal());
const norm=await pg.evaluate(()=>{party.forEach(u=>{u.HP=1;u.MP=0;});return innCost().gold;});
await setup("pride");
const half=await pg.evaluate(()=>{party.forEach(u=>{u.HP=1;u.MP=0;});return innCost().gold;});
r.push(["傲慢は半額",half<=Math.ceil(norm*0.51)&&half>0,true]);
let ng=0;
for(const [n,got,want] of r){
  const ok=String(got)===String(want); if(!ok)ng++;
  console.log(`${ok?"○":"✗"} ${n.padEnd(26,"　")} ${got}${ok?"":`　（期待 ${want}）`}`);
}
console.log(errs.length?"⚠ "+[...new Set(errs)].join("\n⚠ "):"例外なし");
console.log(ng?`\n✗ ${ng} 件 食い違い`:"\n✓ すべて合う");
await b.close();process.exit(ng?1:0);
