/* 図鑑・殿堂・抜けた区画が 枠ごとに分かれているか（α1.0.051） */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const file=process.argv[2]||'index.html';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:430,height:930}});
const errs=[];pg.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
await pg.goto('http://localhost:8765/'+file);await pg.waitForTimeout(800);
const out=await pg.evaluate(async()=>{
  const L=[],bad=[];
  window.wait=async()=>{};
  const drain=async()=>{let g=0;while(g++<14&&modalOpen()){
    const q=document.querySelector("#mbox [data-i]")
      ||document.querySelector("#mbox .ndbtn button:last-child")
      ||document.querySelector("#mbox [data-skip]");if(!q)break;q.click();
    await new Promise(r=>setTimeout(r,8));}};
  const start=async(i,job)=>{ sel.job=job;sel.race="hume";sel.orig="wrath";
    openSlot(i); newGame(); await drain(); };

  /* ① 枠0 に 記録をためる */
  await start(0,"knight");
  META.codex["slime"]=3; META.seen["a1"]=true; META.mats["gel"]=true;
  META.areas["plain"]=true; META.best=4; META.runs=2;
  META.hall.push({no:1,job:"knight",race:"hume",orig:"wrath",cleared:true,lv:9});
  metaFlush();
  const c0=codexCount();
  L.push(`① 枠0 に ためた　図鑑 ${c0.got}件 ${c0.pct}%　殿堂 ${META.hall.length}　抜けた区画 ${Object.keys(META.areas).length}　最も深く ${META.best}`);

  /* ② 枠1 は まっさら */
  goTitle();
  await start(1,"mage");
  const c1=codexCount();
  L.push(`② 枠1 を開いた　図鑑 ${c1.got}件 ${c1.pct}%　殿堂 ${META.hall.length}　抜けた区画 ${Object.keys(META.areas).length}　最も深く ${META.best}`);
  if(c1.got>=c0.got)bad.push("枠1 に 枠0 の図鑑が流れ込んでいる");
  if(META.hall.length)bad.push("枠1 に 枠0 の殿堂が残っている");
  if(Object.keys(META.areas).length)bad.push("枠1 に 枠0 の区画が残っている");
  if(META.best)bad.push("枠1 に 枠0 の到達階層が残っている");

  /* ③ 枠1 にも ためる */
  META.codex["rat"]=1; META.best=2; metaFlush();

  /* ④ 枠0 に戻ると 枠0 のものが戻る */
  goTitle();
  openSlot(0);
  const c0b=codexCount();
  L.push(`④ 枠0 に戻った　図鑑 ${c0b.got}件　殿堂 ${META.hall.length}　最も深く ${META.best}　鼠を見たか ${!!META.codex["rat"]}`);
  if(c0b.got!==c0.got)bad.push("枠0 の図鑑が 戻っていない");
  if(META.hall.length!==1)bad.push("枠0 の殿堂が 戻っていない");
  if(META.best!==4)bad.push("枠0 の到達階層が 戻っていない");
  if(META.codex["rat"])bad.push("枠1 で見たものが 枠0 に混ざっている");

  /* ⑤ 表題に戻ると 伏せられる */
  goTitle();
  L.push(`⑤ 表題　図鑑 ${Object.keys(META.codex).length}件　殿堂 ${META.hall.length}　枠 ${slot}`);
  if(Object.keys(META.codex).length||META.hall.length)bad.push("表題で 記録が伏せられていない");

  /* ⑥ 枠の一覧に 進み具合が出る */
  drawSlots();
  const rows=[...document.querySelectorAll("#slotList .slm")].map(e=>e.textContent.replace(/\s+/g," ").trim());
  L.push(`⑥ 一覧の進み具合 ${rows.length} 行`);
  rows.forEach(r=>L.push("   "+r));
  if(rows.length<2)bad.push("枠ごとの進み具合が 一覧に出ていない");
  const m0=slotMeta(0), m1=slotMeta(1);
  if(m0&&m1&&m0.best===m1.best)bad.push("一覧の値が 枠で分かれていない");

  /* ⑦ 遊び方・お知らせは 枠をまたいで残る */
  META.tutSeen=true; META.newsSeen="α9.9.9"; prefWrite();
  metaReset(); prefLoad();
  L.push(`⑦ 枠をまたぐもの　遊び方 ${META.tutSeen}　お知らせ ${META.newsSeen}`);
  if(!META.tutSeen||META.newsSeen!=="α9.9.9")bad.push("遊び方・お知らせが 残っていない");

  /* ⑧ 記録を消すと その枠の図鑑も消える */
  try{localStorage.removeItem("dd.run.1");localStorage.removeItem("dd.meta.1");}catch(e){}
  L.push(`⑧ 枠1 を消した → 一覧の進み具合 ${slotMeta(1)?"残っている":"消えた"}`);
  if(slotMeta(1))bad.push("記録を消しても 図鑑が残っている");

  /* ⑨ クラウドは 枠をまたいで混ぜない */
  openSlot(0);
  const got0=Object.keys(META.codex).length;
  metaMerge({slot:1,codex:{"wolf":9,"orc":9},hall:[{no:9,cleared:true}],best:99});
  L.push(`⑨ 別の枠(1)の記録を流し込む → 図鑑 ${got0}→${Object.keys(META.codex).length}件　最も深く ${META.best}`);
  if(Object.keys(META.codex).length!==got0)bad.push("別の枠の記録が 混ざった");
  if(META.best===99)bad.push("別の枠の到達階層が 混ざった");
  metaMerge({slot:0,codex:{"wolf":9},best:99});
  L.push(`   同じ枠(0)なら 受け取る → 図鑑 ${Object.keys(META.codex).length}件　最も深く ${META.best}`);
  if(META.best!==99)bad.push("同じ枠の記録が 受け取られていない");
  /* ⑩ α1.0.050 までの 共通の記録が 枠へ配られるか */
  try{
    for(let i=0;i<SLOTS;i++){localStorage.removeItem("dd.meta."+i);}
    localStorage.removeItem("dd.pref.moved");
    localStorage.setItem("dd.meta",JSON.stringify({v:MVER,
      codex:{slime:5,rat:5,wolf:5},seen:{a1:true},mats:{},areas:{plain:true},
      ended:{},hall:[{no:1,cleared:true}],runs:7,best:6,rooms:{},elem:{}}));
    /* 枠0 と 枠2 に 記録がある体にする */
    if(!localStorage.getItem("dd.run.2"))
      localStorage.setItem("dd.run.2",localStorage.getItem("dd.run.0")||"{}");
  }catch(e){}
  metaMigrate();
  const g=[0,1,2].map(i=>slotMeta(i));
  L.push(`⑩ 共通の記録を配った → ${[0,1,2].map(i=>`枠${i} ${g[i]?"あり(最も深く "+g[i].best+")":"なし"}`).join("　")}`);
  if(!g[0]||g[0].best!==6)bad.push("中身のある枠0へ 配られていない");
  if(!g[2]||g[2].best!==6)bad.push("中身のある枠2へ 配られていない");
  if(g[1])bad.push("中身の無い枠1にも 配られている");
  /* 二度目は何もしない */
  try{localStorage.setItem("dd.meta",JSON.stringify({v:MVER,best:99,codex:{},seen:{},
    mats:{},areas:{},ended:{},hall:[],runs:0,rooms:{},elem:{}}));}catch(e){}
  metaMigrate();
  L.push(`   もう一度 呼んでも 上書きしない ${slotMeta(0).best===6}`);
  if(slotMeta(0).best!==6)bad.push("二度目の移行で 上書きされた");

  /* ⑪ 一覧には 付けた名で並ぶ */
  goTitle();
  sel.job="scout";sel.race="beast";sel.orig="wrath";
  openSlot(1); newChar(); sel.pname="ク ロ"; newGame(); await drain();
  runSave();
  const inf=slotInfo(1);
  L.push(`⑪ 一覧の名 「${inf&&inf.name}」`);
  if(!inf||inf.name!=="ク ロ")bad.push("一覧に 付けた名が出ていない");

  return {L,bad};
});
console.log(out.L.join("\n"));
if(errs.length)console.log(errs.join("\n"));
if(out.bad.length){console.log("\n⚠ "+out.bad.join("\n⚠ "));process.exitCode=1;}
else console.log("\n✓ 記録は 枠ごとに分かれている");
await b.close();
