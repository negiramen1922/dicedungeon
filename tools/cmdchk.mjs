/* ===== 戦闘のコマンド欄が 揺れないか測る =====
   手を選び替えるたびに 説明の帯（#actInfo）の高さが変わると、
   その下のコマンド欄がまるごと上下して 押し間違いを生む。
   受け入れの線は **上端の移動 0px**。
   使い方: node tools/cmdchk.mjs                                           */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:390,height:844}});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/index.html');await pg.waitForTimeout(700);
const r=await pg.evaluate(async()=>{
  sel.job="mage";sel.race="elf";sel.orig="greed";
  newGame();closeModal();
  for(let i=1;i<40;i++){me.lv++;growUp();syncMates();}
  setParty([me,makeMate("knight","dwarf",me.lv)]);
  me.sk=[REW.act.mage[1],REW.act.mage[5],REW.act.greed[0],
         REW.act.elf[4],REW.act.common[4],REW.act.common[6]];
  dive("plain"); sel.enc=(AREAS.plain.norm||[])[0];
  showScreen("fight"); foes=makeFoes(); cur=me; over=false; busy=false;
  draw(); drawActs();
  await new Promise(r=>setTimeout(r,120));
  const info=document.querySelector("#actInfo");
  const out=[];
  const bs=[...document.querySelectorAll("#acts .act")];
  for(const btn of bs){
    btn.dispatchEvent(new PointerEvent("pointerenter",{bubbles:true}));
    await new Promise(r=>setTimeout(r,30));
    out.push({n:(btn.querySelector(".an")||{}).textContent.replace(/\s/g,""),
      h:Math.round(info.getBoundingClientRect().height),
      cmd:Math.round(document.querySelector("#acts").getBoundingClientRect().top)});
  }
  return out;
});
const hs=r.map(x=>x.h), ts=r.map(x=>x.cmd);
console.log("説明の帯 #actInfo（min-height:56px・上限なし）");
r.forEach(x=>console.log("  "+x.n.padEnd(14,"　").slice(0,12)+
  " 帯 "+String(x.h).padStart(4)+"px　コマンド欄の上端 "+String(x.cmd).padStart(4)+"px"));
console.log("\n 帯の高さ "+Math.min(...hs)+"〜"+Math.max(...hs)+"px　＝ 差 "+
  (Math.max(...hs)-Math.min(...hs))+"px");
console.log(" コマンド欄は 手を選ぶたび 最大 "+(Math.max(...ts)-Math.min(...ts))+"px 動く");
if(errs.length)console.log("ERR",errs.slice(0,2));
await b.close();
