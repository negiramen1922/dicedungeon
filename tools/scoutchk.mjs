/* 索敵が d6 の振り合いになったか（α1.0.017）
     ・一味でいちばん探索の高い者が振るか
     ・成功の数の差が 先制のダイスになるか
     ・気配がダイスに直っているか                                */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const FILE=(process.argv.find(a=>a.endsWith('.html'))||'index.html');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:430,height:900}});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/'+FILE);
await pg.evaluate(()=>{try{localStorage.clear()}catch(e){}});
await pg.reload();await pg.waitForTimeout(900);
const r=await pg.evaluate(async()=>{
  const o=[];
  window.wait=async()=>{};window.ovMsg=()=>{};window.ovHide=()=>{};
  sel.job="knight";sel.race="hume";sel.orig="wrath";sel.area="plain";
  newGame();closeModal();slot=0;
  o.push(["ナイトひとりの探索",skillOf("search",me),skillBorn("search",me)]);
  o.push(["そのダイス",skillDice("search",me),1+Math.floor(skillOf("search",me)/25)]);
  /* スカウトの仲間を入れると 一味の目が上がる */
  const sc=makeMate("scout","elf",me.lv);
  setParty([me,sc]);
  o.push(["一味でいちばん勘のいい者",bestScout()===sc?"仲間のスカウト":"主人公","仲間のスカウト"]);
  o.push(["その者のダイス",skillDice("search",bestScout()),skillDice("search",sc)]);
  setParty([me]);
  o.push(["ひとりに戻すと",bestScout()===me?"主人公":"ちがう","主人公"]);
  /* 気配 → ダイス */
  o.push(["気配 3 → ダイス",hideDice(3),1]);
  o.push(["気配 30 → ダイス",hideDice(30),2]);
  o.push(["気配 58 → ダイス",hideDice(58),3]);
  /* 実際に索敵を通す */
  dive("plain");sel.enc=AREAS.plain.solo[0];RUN.elite=false;RUN.boss=false;
  let ok=0;
  for(let i=0;i<20;i++){
    prepareBattle();scoutBonus=0;
    await doScout();
    if(scoutBonus>=0&&scoutBonus<=3)ok++;
  }
  o.push(["20回まわして 先制ダイスが 0〜3 に収まる",ok,20]);
  return o;
});
let ng=0;
for(const [n,got,want] of r){
  const okk=String(got)===String(want); if(!okk)ng++;
  console.log(`${okk?"○":"✗"} ${n.padEnd(30,"　")} ${got}${okk?"":`　（期待 ${want}）`}`);
}
console.log(errs.length?"⚠ "+[...new Set(errs)].join("\n⚠ "):"例外なし");
console.log(ng?`\n✗ ${ng} 件 食い違い`:"\n✓ すべて合う");
await b.close();process.exit(ng?1:0);
