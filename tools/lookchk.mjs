/* 見た目（肌・服・目）が 絵に効いているか（α1.0.041） */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const file=process.argv[2]||'index.html';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:430,height:930}});
const errs=[];pg.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
await pg.goto('http://localhost:8765/'+file);await pg.waitForTimeout(700);
const out=await pg.evaluate(async()=>{
  const L=[],bad=[];
  const cols=svg=>[...new Set((svg.match(/fill="([^"]+)"/g)||[]).map(x=>x.slice(6,-1)))];
  const RACES=["hume","elf","dwarf","beast"], JOBS=["knight","archer","scout","mage"];

  /* ① どの組み合わせでも 肌・服・目が 絵に出ている */
  const miss=[];
  RACES.forEach(r=>JOBS.forEach(j=>{
    const c={skin:"s5",cloth:"c5",eye:"e3"};          /* 黒檀・臙脂・碧 */
    const g=cols(pixFig(j,r,64,null,c));
    const sk=hexOf(SKINS,"s5"), cl=hexOf(CLOTHS,"c5"), ey=hexOf(EYECOL,"e3");
    const has=(h)=>g.some(x=>x.toLowerCase()===h.toLowerCase());
    if(!has(sk))miss.push(`${r}/${j} 肌`);
    if(!has(cl))miss.push(`${r}/${j} 服`);
    if(!has(ey))miss.push(`${r}/${j} 目`);
  }));
  L.push(`① 16通り すべてに 肌・服・目 が出ている：${miss.length?"✗ "+miss.join(" "):"✓"}`);
  if(miss.length)bad.push("絵に出ない色がある： "+miss.join(" "));

  /* ② 色を変えたら 絵が変わる */
  const a=pixFig("knight","hume",64,null,{skin:"s1",cloth:"c1",eye:"e1"});
  const b2=pixFig("knight","hume",64,null,{skin:"s5",cloth:"c5",eye:"e5"});
  L.push(`② 色を変えると 絵が変わる ${a!==b2}`);
  if(a===b2)bad.push("色を変えても 絵が同じ");

  /* ③ 作成の段で 選べて、選んだ色が その者に残る */
  slot=0;newChar();sel.job="knight";sel.race="hume";sel.orig="wrath";
  mkStep=MKSTEPS.findIndex(x=>x.k==="__look");
  drawMake();showScreen("make");
  const sw=[...document.querySelectorAll("#mkBody [data-col]")];
  const kinds=[...new Set(sw.map(b=>b.dataset.col))];
  L.push(`③ 見た目の段の札 ${sw.length} 枚（${kinds.join("・")}）`);
  if(kinds.length!==3)bad.push("肌・服・目 の3つが揃っていない");
  const fig0=$("#mkFig").innerHTML;
  sw.find(b=>b.dataset.col==="cloth"&&b.dataset.v==="c5").click();
  L.push(`　 服を選んだら 立ち絵が変わった ${fig0!==$("#mkFig").innerHTML}`);
  if(fig0===$("#mkFig").innerHTML)bad.push("選んでも 立ち絵が変わらない");
  sw2:{ }
  [...document.querySelectorAll("#mkBody [data-col]")]
    .find(b=>b.dataset.col==="eye"&&b.dataset.v==="e4").click();
  document.querySelector("#mkLookGo").click();
  const m=makeMe();
  L.push(`　 作った者の色 肌 ${m.col.skin}　服 ${m.col.cloth}　目 ${m.col.eye}`);
  if(m.col.cloth!=="c5"||m.col.eye!=="e4")bad.push("選んだ色が その者に残っていない");
  if(!cols(meFig(48,m)).includes(hexOf(CLOTHS,"c5")))bad.push("盤の絵に 選んだ服の色が出ていない");

  /* ④ 仲間は てんでばらばら */
  const set=new Set();
  for(let i=0;i<12;i++){const t=makeMate("scout","elf",1);set.add(t.col.skin+t.col.cloth+t.col.eye);}
  L.push(`④ 仲間 12人の見た目 ${set.size} 通り`);
  if(set.size<4)bad.push("仲間の見た目が ばらけていない");

  /* ⑤ 古い記録（色を持たない者）でも 落ちない */
  const old={job:"mage",race:"dwarf"};
  const g=pixFig(old.job,old.race,40,null,undefined);
  L.push(`⑤ 色を持たない者 → ${g.length>100?"描けた":"描けない"}`);
  if(g.length<100)bad.push("色を持たない者が 描けない");
  return {L,bad};
});
console.log(out.L.join("\n"));
if(errs.length)console.log(errs.join("\n"));
if(out.bad.length){console.log("\n⚠ "+out.bad.join("\n⚠ "));process.exitCode=1;}
else console.log("\n✓ 肌・服・目 が選べて 絵に出る");
await b.close();
