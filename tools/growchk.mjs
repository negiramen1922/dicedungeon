/* 技能の育ちを 本物の画面で確かめる
     ・レベルが上がると 点が 1つ増えるか
     ・注ぐとダイスが増えるか。100 を越えて注げないか
     ・控えに残るか（保存 → 読み直し）
     ・仲間は 自分で注ぐか                                        */
import {chromium} from '/opt/pw-browsers/../node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:430,height:900}});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/index.html');
await pg.evaluate(()=>{try{localStorage.clear()}catch(e){}});
await pg.reload();await pg.waitForTimeout(900);
const r=await pg.evaluate(()=>{
  const o=[];
  sel.job="scout";sel.race="hume";sel.orig="wrath";sel.area="plain";
  newGame();closeModal();
  slot=0;
  o.push(["Lv1 の点",me.skp,0]);
  o.push(["Lv1 近接",skillOf("fight",me),skillBorn("fight",me)]);
  const born=skillBorn("fight",me);
  o.push(["Lv1 近接ダイス",skillDice("fight",me),Math.floor(born/20)]);
  for(let i=0;i<9;i++){me.lv++;growUp(me);}
  o.push(["Lv10 の点",me.skp,9]);
  skUp("fight",me,9);
  o.push(["9点 注いだ後の近接",skillOf("fight",me),born+9]);
  o.push(["注いだ後の残り点",me.skp,0]);
  o.push(["注いだ後のダイス",skillDice("fight",me),Math.floor((born+9)/20)]);
  for(let i=0;i<20;i++){me.lv++;growUp(me);}
  skUp("fight",me,1);
  skUp("fight",me,Math.max(0,20*Math.ceil((born+10)/20)-(born+10)));
  o.push(["ちょうど 20 の倍数でダイス",skillDice("fight",me),skillOf("fight",me)/20]);
  /* 上限を越えて注げないか（点は足りている状態にする） */
  me.skp=500;
  const room=skRoom("fight",me);
  const put=skUp("fight",me,999);
  o.push(["上限まで注げた数",put,room]);
  o.push(["上限で止まる",skillOf("fight",me),100]);
  o.push(["満杯なら もう注げない",skUp("fight",me,1),0]);
  o.push(["点は残っている",me.skp>0,true]);
  me.skp=0;
  /* 仲間 */
  const m=makeMate("mage","elf",10);
  o.push(["仲間 Lv10 の残り点",m.skp,0]);
  /* 期待値は **その版から引く**。開始値を直書きすると 技能表を触るたびに
     嘘の失敗が出る（α1.0.020 で踏んだ） */
  o.push(["仲間は 得物の技能へ",skillOf("magic",m),skillBorn("magic",m)+skPtsOf(m.lv)]);
  return o;
});
let ng=0;
for(const [n,got,want] of r){
  const ok=got===want; if(!ok)ng++;
  console.log(`${ok?"○":"✗"} ${n.padEnd(22,"　")} ${got}${ok?"":`　（期待 ${want}）`}`);
}
/* 控えに残るか */
await pg.evaluate(()=>{ me.skp=5; skUp("heal",me,3); runSave(); });
const keep=await pg.evaluate(()=>{ const r=runLoad(); return r&&r.me?{g:r.me.skg&&r.me.skg.heal,p:r.me.skp}:null; });
const okKeep=keep&&keep.g===3&&keep.p===2;
if(!okKeep)ng++;
console.log(`${okKeep?"○":"✗"} ${"控えに残る".padEnd(22,"　")} ${JSON.stringify(keep)}`);
/* 古い控え（skg を持たない）を読ませる */
const old=await pg.evaluate(()=>{
  const r=runLoad(); delete r.me.skg; delete r.me.skp; r.me.lv=12; runPut(r);
  const q=runLoad(); fixUnit(q.me); return {p:q.me.skp,g:JSON.stringify(q.me.skg)};
});
const okOld=old.p===11&&old.g==="{}";
if(!okOld)ng++;
console.log(`${okOld?"○":"✗"} ${"古い控えに配り直す".padEnd(22,"　")} ${JSON.stringify(old)}`);
console.log(errs.length?"⚠ "+[...new Set(errs)].join("\n⚠ "):"例外なし");
console.log(ng?`\n✗ ${ng} 件 食い違い`:"\n✓ すべて合う");
await b.close();
process.exit(ng?1:0);
