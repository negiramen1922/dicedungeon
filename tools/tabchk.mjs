/* 人ひとりの3画面が 横に移れるか・盤面から詳細へ飛ぶか */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:390,height:844}});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/index.html');await pg.waitForTimeout(800);
const out=await pg.evaluate(async()=>{
  const L=[],bad=[];
  const Q=s=>document.querySelector(s), QA=s=>[...document.querySelectorAll(s)];
  sel.job="knight";sel.race="hume";sel.orig="greed";newGame();closeModal();
  for(let i=1;i<28;i++){me.lv++;growUp();syncMates();}
  setParty([me,makeMate("mage","elf",me.lv),makeMate("archer","beast",me.lv)]);
  me.sk=REW.act.knight.slice(0,4);me.bagSk=REW.act.common.slice(0,3);
  /* ① 盤面から */
  dive("plain");sel.enc=(AREAS.plain.norm||[])[0];
  showScreen("fight");foes=makeFoes();cur=me;over=false;busy=false;pending=null;draw();
  const cell=QA('#board .cell[data-me]').pop();
  cell.click();
  await new Promise(r=>setTimeout(r,80));
  const top=()=>uiTop().name;
  const host=()=>inBattle()?"#mbox":"#ui";
  L.push(`① 盤面の味方を押した → ${top()}　誰 ${rosterName(uiUnit())}　窓 ${inBattle()}`);
  if(top()!=="char")bad.push("盤面から 詳細へ行かない（"+top()+"）");
  L.push(`　 ↩ で戻る先 ${UI.stack[0].name}`);
  if(UI.stack[0].name!=="party")bad.push("↩ の戻り先が パーティでない");
  /* ② 3札で横に移れるか */
  closeModal();showScreen("home");
  uiEnter("char");
  const tabs=()=>QA("#ui .uitabs.row3 .uitab").map(x=>x.textContent.replace(/\s+/g," ").trim());
  L.push(`② ステータスの3札 ${tabs().length} 枚　${tabs().join(" ｜ ")}`);
  if(tabs().length!==3)bad.push("3札が出ていない");
  const go=k=>{const b2=Q(`#ui [data-uk="totab"][data-v="${k}"]`);if(!b2)return "無い";b2.click();return top();};
  L.push(`　 ステータス → スキル ${go("skill")}　積み ${UI.stack.length}`);
  if(top()!=="skill")bad.push("スキルへ移れない");
  const sub=QA("#ui .uitabs.sub2 .uitab").map(x=>x.textContent.replace(/\s+/g," ").trim());
  L.push(`　 スキルの下の札 ${sub.length} 枚　${sub.join(" ｜ ")}　上の3札 ${tabs().length} 枚`);
  if(sub.length!==2)bad.push("スキル／パッシブの札が無い");
  if(tabs().length!==3)bad.push("スキルの画面に 上の3札が無い");
  L.push(`　 スキル → 装備 ${go("gear")}　上の3札 ${tabs().length} 枚　積み ${UI.stack.length}`);
  if(top()!=="gear")bad.push("装備へ移れない");
  if(tabs().length!==3)bad.push("装備の画面に 上の3札が無い");
  L.push(`　 装備 → ステータス ${go("char")}　積み ${UI.stack.length}`);
  if(UI.stack.length!==1)bad.push("横に移るたび 積みが増えている（"+UI.stack.length+"）");
  /* ③ 札の高さ */
  const h=Q("#ui .uitabs.row3 .uitab").getBoundingClientRect();
  L.push(`③ 3札の高さ ${Math.round(h.height)}px（当たりは 44px 以上）`);
  if(h.height<44)bad.push("3札の当たりが 44px 未満");
  return {L,bad};
});
console.log(out.L.join("\n"));
if(errs.length)console.log("\nERR "+errs.slice(0,3).join("\n"));
if(out.bad.length){console.log("\n⚠ "+out.bad.join("\n⚠ "));process.exitCode=1;}
else console.log("\n✓ 盤面から詳細へ飛び、3画面を横に移れる");
await b.close();
