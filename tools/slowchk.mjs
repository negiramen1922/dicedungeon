/* ===== 鈍足（α1.0.067 で −20 に上げた） =====
   ① 鈍足を重ねても **DEX が 1 未満にならない**（味方も敵も）
   ② 攻撃ダイスは DEX を見ていない（foeDice / skillDice）ので 鈍足で振れなくならない
   ③ 命中閾値の段が 実際に動く（DEXCUT=[25,40] の差で決まる）
   使い方: node tools/slowchk.mjs                                        */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/index.html');await pg.waitForTimeout(900);
const out=await pg.evaluate(async()=>{
  const L=[],bad=[];
  window.ovMsg=()=>{};window.ovHide=()=>{};window.rollDice=async()=>0;window.wait=async()=>{};
  slot=0;sel.job="knight";sel.race="hume";sel.orig="greed";
  newGame();
  let g=0;while(g++<14&&modalOpen()){const b=document.querySelector("#mbox [data-i]")
    ||document.querySelector("#mbox .ndbtn button:last-child");if(!b)break;b.click();
    await new Promise(r=>setTimeout(r,8));}
  dive("plain");sel.enc="db2";RUN.elite=false;RUN.boss=false;
  await startBattle();
  const f=foes[0];
  L.push(`はじめ　味方DEX ${dexOf(me)}　敵DEX ${f.DEX}`);
  /* ① 鈍足を 5回 重ねる（20 × 5 ＝ 100） */
  for(let i=0;i<5;i++){ailAdd(me,"slow",20,3);ailAdd(f,"slow",20,3);}
  const myD=dexOf(me), foD=Math.max(1,f.DEX-ailSum(f,"slow"));
  L.push(`① 鈍足 ×5（合計 −${ailSum(me,"slow")}）　味方DEX ${myD}　敵DEX ${foD}`);
  if(myD<1)bad.push("味方の DEX が 1 未満になった");
  if(foD<1)bad.push("敵の DEX が 1 未満になった");
  /* ② ダイスは減っていないか */
  const nd=skillDice(wepSkill(me),me);
  const atk=(f.acts||[]).find(a=>a.k==="atk")||f.acts[0];
  const fd=foeDice(f,atk);
  L.push(`② 攻撃ダイス　味方 ${nd}　敵 ${fd}　（どちらも 1 以上であること）`);
  if(nd<1)bad.push("味方の攻撃ダイスが 0 になった");
  if(fd<1)bad.push("敵の攻撃ダイスが 0 になった");
  /* ③ 閾値が壊れていないか（2〜6 の内） */
  const t1=threshold(me,f,{}), t2=threshold(f,me,{act:atk});
  L.push(`③ 命中閾値　味方→敵 ${t1}　敵→味方 ${t2}　（2〜6 の内）`);
  if(t1<2||t1>6||t2<2||t2>6)bad.push("命中閾値が 2〜6 の外に出た");
  /* ④ 実際に一撃を通してみる（例外が出ないこと） */
  const before=f.HP;
  cur=me;busy=false;
  await playerAttack([f],{});
  L.push(`④ 一撃を通した　敵HP ${before} → ${f.HP}`);
  /* ⑤ 同じ種類は 重ならない（ailAdd は 1つだけ持ち、v も t も max を取る） */
  me.ail=[];
  ailAdd(me,"slow",20,3); ailAdd(me,"slow",20,3); ailAdd(me,"slow",20,3);
  L.push(`⑤ 鈍足を3回かけた → 合計 ${ailSum(me,"slow")}（重ならないので 20 のまま）`);
  if(ailSum(me,"slow")!==20)bad.push("同じ種類の状態異常が 足し算されている");
  me.ail=[];
  /* ⑥ 区画ごとに 鈍足 −20 で 命中閾値の段が動くか */
  let moved=0, tried=0;
  for(const [ak,tier] of [["plain",1],["seed",2],["cave",2],["wtree",3],["hall",3],["city",4]]){
    slot=0;sel.job="knight";sel.race="hume";sel.orig="greed";newGame();closeModal();
    const lv=tierLo(tier)+Math.floor((tierHi(tier)-tierLo(tier))/2);
    while(me.lv<lv){me.lv++;growUp();}
    while(skCanUp("fight"))skUp("fight");
    dive(ak);const A0=AREAS[ak];
    sel.enc=(A0.norm&&A0.norm.length?A0.norm:A0.easy||A0.solo)[0];
    RUN.elite=false;RUN.boss=false;await startBattle();
    const z=foes[0];
    const t0=threshold(me,z,{});
    ailAdd(z,"slow",20,3);
    const tS=threshold(me,z,{});
    tried++; if(tS<t0)moved++;
    L.push(`⑥ ${AREAS[ak].n.replace(/ /g,"").padEnd(11,"　")} 味方DEX ${dexOf(me)} 敵DEX ${z.DEX}　閾値 ${t0} → ${tS}　${tS<t0?"**動いた**":"動かない"}`);
  }
  L.push(`　 ${tried} 区画中 ${moved} 区画で 命中閾値が下がる`);
  if(!moved)bad.push("どの区画でも 鈍足 −20 が 命中閾値を動かさない");
  return {L,bad};
});
console.log(out.L.join('\n'));
if(errs.length)console.log('ERR\n'+errs.join('\n'));
console.log(out.bad.length?'\n✗ '+out.bad.join('\n✗ '):'\n✓ 鈍足を重ねても DEX もダイスも 1 を割らない');
await b.close();
process.exit(out.bad.length||errs.length?1:0);
