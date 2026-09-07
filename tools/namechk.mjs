/* 名前・自由な色・仲間を自分で作る（α1.0.050） */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const file=process.argv[2]||'index.html';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:430,height:1100}});
const errs=[];pg.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
await pg.goto('http://localhost:8765/'+file);await pg.waitForTimeout(800);
const out=await pg.evaluate(async()=>{
  const L=[],bad=[];
  window.wait=async()=>{};
  const cols=svg=>[...new Set((svg.match(/fill="([^"]+)"/g)||[]).map(x=>x.slice(6,-1)))];

  /* ① 生の色を そのまま持てる */
  const g=pixFig("knight","hume",64,null,{skin:"#c98a5e",cloth:"#6a3f7a",eye:"#4fd6c0"});
  const has=h=>cols(g).some(x=>x.toLowerCase()===h);
  L.push(`① 自由な色　肌 ${has("#c98a5e")}　服 ${has("#6a3f7a")}　目 ${has("#4fd6c0")}`);
  if(!has("#c98a5e"))bad.push("自由な肌の色が 絵に出ない");
  if(!has("#6a3f7a"))bad.push("自由な服の色が 絵に出ない");
  if(!has("#4fd6c0"))bad.push("自由な目の色が 絵に出ない");
  /* 見本の鍵も これまでどおり */
  const g2=pixFig("knight","hume",64,null,{skin:"s5",cloth:"c5",eye:"e3"});
  L.push(`　 見本の鍵も 読める ${cols(g2).includes(hexOf(SKINS,"s5"))}`);
  if(!cols(g2).includes(hexOf(SKINS,"s5")))bad.push("見本の鍵が読めなくなった");

  /* ② 名前を付けて 作る */
  slot=0;newChar();sel.job="knight";sel.race="hume";sel.orig="wrath";
  mkStep=MKSTEPS.findIndex(x=>x.k==="__look");drawMake();showScreen("make");
  const nm=$("#mkName");
  L.push(`② 作成に 名前の欄 ${!!nm}`);
  if(!nm)bad.push("名前の欄が無い");
  else{
    nm.value="ロラン<script>"; nm.oninput();
    L.push(`   「ロラン<script>」→ 「${sel.pname}」（${NAMEMAX}文字・記号は落とす）`);
    if(/[<>]/.test(sel.pname))bad.push("危ない字が残っている");
    if(sel.pname.length>NAMEMAX)bad.push("文字数の上限が効いていない");
    nm.value="ロ ラ ン"; nm.oninput();
  }
  const free=document.querySelector('#mkBody [data-free="cloth"]');
  L.push(`   自由な色のつまみ ${!!free}`);
  if(!free)bad.push("自由な色のつまみが無い");
  else{ free.value="#6a3f7a"; free.oninput();
    L.push(`   つまみを動かした → sel.col.cloth ${sel.col.cloth}`);
    if(sel.col.cloth!=="#6a3f7a")bad.push("自由な色が入っていない"); }
  /* 「この姿で」を押しても 選んだ色が消えないこと */
  $("#mkLookGo").click();
  L.push(`   「この姿で」のあと sel.col.cloth ${sel.col.cloth}`);
  if(sel.col.cloth!=="#6a3f7a")bad.push("「この姿で」で 自由な色が消えた");
  const m=makeMe();
  L.push(`   作った者　名 ${m.pname} / ${m.name}　服 ${m.col.cloth}`);
  if(m.pname!=="ロ ラ ン")bad.push("名が その者に残っていない");
  if(m.col.cloth!=="#6a3f7a")bad.push("自由な色が その者に残っていない");
  if(!cols(meFig(48,m)).includes("#6a3f7a"))bad.push("盤の絵に 自由な色が出ない");

  /* ③ 名は 盤とログの呼び名になる */
  newGame();
  let q=0;while(q++<14&&modalOpen()){const x=document.querySelector("#mbox [data-i]")
    ||document.querySelector("#mbox .ndbtn button:last-child")
    ||document.querySelector("#mbox [data-skip]");if(!x)break;x.click();
    await new Promise(r=>setTimeout(r,8));}
  L.push(`③ 名乗り　rosterName ${rosterName(me)}　shortOf ${shortOf(me)}　name ${me.name}`);
  if(rosterName(me)!=="ロ ラ ン")bad.push("名簿の名が 付けた名になっていない");
  if(me.name!=="ロ ラ ン")bad.push("ログの名が 付けた名になっていない");

  /* ④ 仲間を自分で作る */
  me.gold=9999;
  hireStart();
  L.push(`④ 仲間を作る窓　段 ${hireSel.step}　職の札 ${document.querySelectorAll("#mbox [data-k]").length}`);
  if(!document.querySelectorAll("#mbox [data-k]").length)bad.push("職を選ぶ札が無い");
  document.querySelector('#mbox [data-k="mage"]').click();
  L.push(`   職を選んだ → 段 ${hireSel.step}　種族の札 ${document.querySelectorAll("#mbox [data-k]").length}`);
  if(hireSel.step!==1)bad.push("種族の段へ進まない");
  document.querySelector('#mbox [data-k="elf"]').click();
  L.push(`   種族を選んだ → 段 ${hireSel.step}　名前の欄 ${!!$("#hrName")}　色の札 ${
    document.querySelectorAll("#mbox [data-col]").length}`);
  if(hireSel.step!==2)bad.push("見た目の段へ進まない");
  if(!$("#hrName"))bad.push("仲間に 名前の欄が無い");
  $("#hrName").value="シェラ";$("#hrName").oninput();
  const f2=document.querySelector('#mbox [data-free="eye"]');
  f2.value="#c94a7a";f2.oninput();
  $("#hrNext").click();
  L.push(`   確認へ → 段 ${hireSel.step}　雇う札 ${!!$("#hrGo")}`);
  if(!$("#hrGo"))bad.push("雇う札が出ない");
  const n0=party.length;
  $("#hrGo").click();
  await new Promise(r=>setTimeout(r,60));
  let q2=0;while(q2++<10&&modalOpen()){const x=document.querySelector("#mbox [data-i]")
    ||document.querySelector("#mbox .ndbtn button:last-child");if(!x)break;x.click();
    await new Promise(r=>setTimeout(r,10));}
  const mate=[...party,...bench].find(u=>u!==me);
  L.push(`   雇った → 人数 ${n0}→${party.length}　${mate?`${rosterName(mate)}（${
    JOB[mate.job].n}・${RACE[mate.race].n}）目 ${mate.col.eye}`:"仲間がいない"}`);
  if(!mate)bad.push("仲間が加わっていない");
  else{
    if(mate.job!=="mage"||mate.race!=="elf")bad.push("選んだ職・種族になっていない");
    if(mate.pname!=="シェラ")bad.push("仲間の名が残っていない");
    if(mate.col.eye!=="#c94a7a")bad.push("仲間の自由な色が残っていない");
  }

  /* ⑤ 読み直しても 残る */
  runSave();
  const r=runLoad();
  const rm=(r.mates||[])[0];
  L.push(`⑤ 読み直し　主人公 ${r.me.pname}　仲間 ${rm?rm.pname+"／目 "+rm.col.eye:"—"}`);
  if(r.me.pname!=="ロ ラ ン")bad.push("主人公の名が 保存されていない");
  if(!rm||rm.pname!=="シェラ")bad.push("仲間の名が 保存されていない");

  /* ⑥ 曲の無い区画が 無くなった */
  const noBgm=Object.keys(AREAS).filter(k=>{
    const key=(k==="hall")?"hallw":k; return !bgmFile(key);});
  L.push(`⑥ 無音の区画 ${noBgm.length?noBgm.join("・"):"なし"}`);
  if(noBgm.length)bad.push("曲の無い区画が残っている: "+noBgm.join("・"));
  return {L,bad};
});
console.log(out.L.join("\n"));
if(errs.length)console.log(errs.join("\n"));
if(out.bad.length){console.log("\n⚠ "+out.bad.join("\n⚠ "));process.exitCode=1;}
else console.log("\n✓ 名前・自由な色・仲間づくり すべて効いている");
await b.close();
