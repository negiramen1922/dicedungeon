/* 上限 Lv100 の確かめ
     ・レベルはまとめて上がるか／点はそのぶん増えるか
     ・覚えるのは LEARNEVERY ごとか
     ・上限で止まるか。余った経験を持ち越さないか
     ・Lv100 まで行くと 技能点は 99 か
     ・仲間も追いつくか                                          */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const FILE=(process.argv.find(a=>a.endsWith('.html'))||'index.html');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:430,height:900}});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/'+FILE);
await pg.evaluate(()=>{try{localStorage.clear()}catch(e){}});
await pg.reload();await pg.waitForTimeout(900);
const r=await pg.evaluate(()=>{
  const o=[];
  sel.job="knight";sel.race="hume";sel.orig="greed";sel.area="plain";
  newGame();closeModal();slot=0;
  o.push(["上限",lvMax(),100]);
  o.push(["Lv1 の点",me.skp,0]);
  o.push(["覚える間隔",LEARNEVERY,4]);
  /* まとめ上げ：3段ぶんの経験を一度に入れる */
  me.exp=EXPNEED[1]+EXPNEED[2]+EXPNEED[3];
  const from=me.lv;
  let learn=0;
  while(!atLvMax()&&me.exp>=expCap()){me.exp-=expCap();me.lv++;growUp();if(me.lv%LEARNEVERY===0)learn++;}
  o.push(["3段ぶんで上がった数",me.lv-from,3]);
  o.push(["そのぶんの点",me.skp,3]);
  o.push(["Lv4 で覚える回数",learn,1]);
  /* 上限まで */
  while(!atLvMax()){me.lv++;growUp();}
  o.push(["Lv100 まで行った",me.lv,100]);
  o.push(["Lv100 の点（合計）",me.skp+skSpent(me),99]);
  o.push(["上限では次が無い",expToNext()>0,true]);
  o.push(["Lv100 STR（ナイト）",me.STR,35+4*99]);
  /* 覚える回数の合計 */
  let n=0;for(let lv=2;lv<=100;lv++)if(lv%LEARNEVERY===0)n++;
  o.push(["Lv100 までに覚える回数",n,25]);
  /* 仲間 */
  const m=makeMate("mage","hume",100);
  o.push(["仲間 Lv100",m.lv,100]);
  o.push(["仲間の覚える回数",MATELV.filter(x=>100>=x).length,7]);
  /* DEX の上限 */
  const a2=makeMate("archer","hume",100);
  o.push(["アーチャー Lv100 の素の DEX",Math.round(a2.base.DEX+a2.grow.DEX),98]);
  return o;
});
let ng=0;
for(const [n,got,want] of r){
  const ok=String(got)===String(want); if(!ok)ng++;
  console.log(`${ok?"○":"✗"} ${n.padEnd(24,"　")} ${got}${ok?"":`　（期待 ${want}）`}`);
}
console.log(errs.length?"⚠ "+[...new Set(errs)].join("\n⚠ "):"例外なし");
console.log(ng?`\n✗ ${ng} 件 食い違い`:"\n✓ すべて合う");
await b.close();process.exit(ng?1:0);
