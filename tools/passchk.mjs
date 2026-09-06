/* 特性は **その者のもの**か。
   仲間が覚えた特性が働き、主人公の特性が仲間に漏れないことを 本物の戦闘で見る。 */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const FILE=(process.argv.find(a=>a.endsWith('.html'))||'index.html');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/'+FILE);await pg.waitForTimeout(800);
const r=await pg.evaluate(async()=>{
  const o=[];
  window.wait=async()=>{};window.ovMsg=()=>{};window.rollDice=async()=>0;
  window.addDice=async(a)=>a;window.ovHide=()=>{};window.lungeUnit=async()=>{};
  window.fxOn=()=>{};window.popOn=()=>{};window.popSelf=()=>{};window.setHPBar=()=>{};
  window.lukOv=async()=>{};
  sel.job="knight";sel.race="hume";sel.orig="greed";sel.area="plain";
  newGame();closeModal();
  for(let i=1;i<12;i++){me.lv++;growUp();syncMates();}
  setParty([me,makeMate("archer","hume",me.lv)]);
  const mate=party[1];
  /* 攻撃ダイス +1 の特性を探す */
  /* 条件なしで必ず効く形にした札を使う（w:"always"）。
     素のダイス特性は 後衛のとき／第1ラウンド／HP30%以下 と条件つきなので、
     そのままだと 条件の違いか 持ち主の違いか 見分けられない。 */
  const src=Object.values(REW.pass).flat().find(p=>p.ef&&p.ef.k==="dice");
  const dicePass=src?{...src,ef:{...src.ef,w:"always"}}:null;
  o.push(["ダイスの特性が見つかった",!!dicePass,true]);
  me.pass=[];mate.pass=[];
  dive("plain");sel.enc=AREAS.plain.solo[0];RUN.elite=false;RUN.boss=false;
  prepareBattle();
  /* **本物の攻撃を通して**数える。passOn を直に呼ぶと 呼び出し側の
     食い違い（u を渡していない）を素通りしてしまう。
     ダイスの窓に渡される数を横取りする。 */
  let rolled=0;
  window.rollDice=async(rolls)=>{rolled=rolls.length;return 0;};
  const swing=async u=>{
    party.forEach(x=>{x.HP=x.maxHP;x.MP=999;x.ail=[];x.block=0;});
    foes.forEach(f=>{f.HP=f.maxHP=99999;f.ail=[];f.block=0;});
    over=false;busy=false;pending=null;cur=u;scoutBonus=0;round=2;
    rolled=0;
    await playerAttack([alive()[0]],{});
    return rolled;
  };
  const base={me:await swing(me),mate:await swing(mate)};
  /* ① 主人公だけが持つ */
  me.pass=[{...dicePass}];mate.pass=[];
  o.push(["主人公に付けた → 主人公",await swing(me),base.me+dicePass.ef.v]);
  o.push(["主人公に付けた → 仲間（漏れない）",await swing(mate),base.mate]);
  /* ② 仲間だけが持つ */
  me.pass=[];mate.pass=[{...dicePass}];
  o.push(["仲間に付けた → 仲間（効く）",await swing(mate),base.mate+dicePass.ef.v]);
  o.push(["仲間に付けた → 主人公（漏れない）",await swing(me),base.me]);
  /* ③ 状態異常を弾く特性（頑迷）も その者のもの */
  const stout=Object.values(REW.pass).flat().find(p=>p.ef&&p.ef.k==="stout");
  if(stout){
    me.pass=[];mate.pass=[{...stout}];
    mate.ail=[];ailAdd(mate,"slow",10,2);
    o.push(["仲間の頑迷が 鈍足を弾く",(mate.ail||[]).length,0]);
    me.ail=[];ailAdd(me,"slow",10,2);
    o.push(["主人公には効く（漏れていない）",(me.ail||[]).length,1]);
  }
  return o;
});
let ng=0;
for(const [n,got,want] of r){
  const ok=String(got)===String(want); if(!ok)ng++;
  console.log(`${ok?"○":"✗"} ${n.padEnd(30,"　")} ${got}${ok?"":`　（期待 ${want}）`}`);
}
console.log(errs.length?"⚠ "+[...new Set(errs)].join("\n⚠ "):"例外なし");
console.log(ng?`\n✗ ${ng} 件 食い違い`:"\n✓ すべて合う");
await b.close();process.exit(ng?1:0);
