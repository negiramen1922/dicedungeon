/* まっさらから 本物のクリックだけで遊ぶ。
   関数を直に呼ばない ── 呼ぶと「画面から辿れない道」を見落とす
   （α1.0.004 で キャラ作成が 消した startRun を呼んだまま残っていた）。 */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:430,height:930}});
const errs=[];
pg.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
pg.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::/.test(m.text()))errs.push('CONSOLE '+m.text());});
await pg.goto('http://localhost:8765/index.html');
await pg.evaluate(()=>{try{localStorage.clear()}catch(e){}});
await pg.reload();await pg.waitForTimeout(900);
/* 演出だけ速くする（押す道すじは本物のまま） */
await pg.evaluate(()=>{window.wait=async()=>{};window.ovMsg=()=>{};});
const log=[];
const scr=()=>pg.evaluate(()=>curScreen+(modalOpen()?"+窓":""));
const tap=async(sel,name)=>{
  const el=await pg.$(sel);
  if(!el||!(await el.isVisible())){log.push(`✗ ${name} が押せない（${sel}）`);return false;}
  await el.click({force:true});await pg.waitForTimeout(180);return true;
};
const tapText=async(txt,name)=>{
  const els=await pg.$$('button');
  for(const e of els){
    const t=(await e.innerText()).replace(/\s/g,"");
    if(t.includes(txt.replace(/\s/g,""))&&await e.isVisible()&&await e.isEnabled()){
      await e.click({force:true});await pg.waitForTimeout(160);return true;}
  }
  log.push(`✗ 「${name||txt}」が押せない`);return false;
};
/* 窓を1つ進める。選ぶ札（先頭）→ 進める札（末尾）→ 閉じる札 の順で試す。
   窓は非同期でつながるので、次が描かれるまで何度か待つ。 */
const once=async()=>{
  /* 窓が開いているあいだは 窓の中だけを見る。後ろの画面の札を掴むと
     キャラ作成をやり直してしまう（実際に踏んだ） */
  const inModal=await pg.evaluate(()=>modalOpen());
  const list=inModal
    ?[['#mbox [data-i]',0],['#mbox [data-d]',0],['#mbox [data-b]',1],
      ['#mbox .ndbtn button',1],['#mbox .mclose',0],['#mbox button',1]]
    :[['#mkBody [data-k]',0],['#mkBody [data-w]',0]];
  for(const [q,last] of list){
    const els=await pg.$$(q);
    if(!els.length)continue;
    const e=last?els[els.length-1]:els[0];
    try{ await e.click({force:true,timeout:2500}); }catch(err){ continue; }
    await pg.waitForTimeout(220);return true;
  }
  return false;
};
const firstCard=async(name,tries)=>{
  for(let t=0;t<(tries||6);t++){
    if(await once())return true;
    await pg.waitForTimeout(220);
  }
  log.push(`✗ ${name} の札が無い`);return false;
};

/* ① 起動 → 遊び方 → 見立て → キャラ作成 */
log.push(`① 起動　画面 ${await scr()}`);
if(await scr()==="tut"){ await tap("#tutOK","キャラをつくって"); log.push(`   遊び方を抜けた → ${await scr()}`); }
if(await scr()==="quiz"){
  /* 見立ては3問。答えると おすすめが出る */
  for(let q=0;q<5;q++){
    const a=await pg.$$('#qzBody [data-i]');
    if(!a.length)break;
    await a[0].click({force:true});await pg.waitForTimeout(160);
  }
  await tap("#qzGo","この組み合わせで作る");
  log.push(`   見立てを終えた → ${await scr()}`);
}
if(await scr()==="home"){ await tap("#hGo","はじめる"); }
log.push(`② キャラ作成へ → ${await scr()}`);
/* 見立てから来ると mkStep=3（確認）に飛ぶ。自分で選ぶ道なら3つ選ぶ */
for(const step of ["職業","種族","欲望"]){
  const cards=await pg.$$('#mkBody [data-k], #mkBody [data-w]');
  if(!cards.length)break;
  await cards[0].click();await pg.waitForTimeout(160);
  log.push(`   ${step} を選んだ → ${await scr()}`);
}
/* 幸運を振る演出が終わって 確認の札が出るのを待つ */
try{ await pg.waitForSelector("#mkNext",{timeout:8000}); }
catch(e){ log.push("✗ 確認の札が出ない"); }
await tap("#mkNext","始める場所を決める");
await pg.waitForTimeout(300);
if(!await firstCard("始める場所"))log.push("   始める場所の札が無い");
await pg.waitForTimeout(600);
log.push(`③ キャラ作成のあと → ${await scr()}`);
/* ④ 出立の支度・仲間の学び */
for(let i=0;i<10;i++){
  if(!await pg.evaluate(()=>modalOpen()))break;
  if(!await firstCard("窓"))break;
}
await pg.waitForTimeout(300);
log.push(`④ 支度と学びのあと → ${await scr()}`);
log.push(`   一味 ${await pg.evaluate(()=>party.length?party.map(u=>`${u.short}Lv${u.lv}技${u.sk.length}特${u.pass.length}`).join(" / "):"まだ居ない")}`);
/* ⑤ 潜る */
await tap("#hGo","潜る");
log.push(`⑤ 潜る窓 → ${await scr()}`);
if(!await firstCard("潜る先"))log.push("   潜る先の札が出ていない");
await pg.waitForTimeout(500);
log.push(`⑥ 地図 → ${await scr()}　部屋 ${await pg.evaluate(()=>RUN&&RUN.M?Object.keys(RUN.M.node).length:"RUN なし")}`);
/* ⑦ 部屋を進んで 戦闘まで */
let battles=0,wasFight=false;
const trail=[];
for(let step=0;step<26;step++){
  const s=await scr();
  trail.push(s);
  if(s.startsWith("fight")){
    if(!wasFight)battles++;
    wasFight=true;
    /* 攻撃を押し続けて 決着まで */
    for(let t=0;t<80;t++){
      if(await pg.evaluate(()=>over))break;
      if(await pg.evaluate(()=>busy)){await pg.waitForTimeout(60);continue;}
      const cells=await pg.$$('#board .cell.sel');
      if(cells.length){await cells[0].click({force:true});await pg.waitForTimeout(90);continue;}
      const atk=await pg.$('#acts .act.atk');
      if(atk&&await atk.isEnabled()){await atk.click({force:true});await pg.waitForTimeout(130);continue;}
      const def=await pg.$('#acts .act.def');
      if(def)await def.click({force:true});
      await pg.waitForTimeout(120);
    }
    await pg.waitForTimeout(400);
    for(let i=0;i<8;i++){ if(!await pg.evaluate(()=>modalOpen()))break; if(!await firstCard("戦利品"))break; }
    await pg.waitForTimeout(300);
    continue;
  }
  wasFight=false;
  if(await pg.evaluate(()=>modalOpen())){ if(!await firstCard("窓"))break; continue; }
  /* 地図の部屋を押す */
  /* SVG の部屋は 本物のマウスだと当たり判定が細いので、その者の onclick を呼ぶ。
     押したあとの「ここに進む」は 本物のクリックで押す。 */
  const picked=await pg.evaluate(()=>{
    const g=document.querySelector("#mapbox .mnode.go");
    if(!g)return null; g.onclick(); return g.dataset.k;
  });
  if(!picked){log.push(`   進める部屋が見つからない（${s}）`);break;}
  await pg.waitForTimeout(220);
  /* 部屋を押すのは下見まで。入るのは「ここに進む」 */
  if(!await tap("#ndGo","ここに進む"))break;
  await pg.waitForTimeout(420);
}
log.push(`   道すじ ${trail.join(" ")}`);
log.push(`⑦ ${battles} 戦した　画面 ${await scr()}　Lv ${await pg.evaluate(()=>me?me.lv:"-")}　金貨 ${await pg.evaluate(()=>me?me.gold:"-")}`);
/* ⑧ 町へ帰る */
if(await scr()==="floor"){
  await tap("#leaveBtn","町へ帰る");
  await pg.waitForTimeout(350);
  await firstCard("引き返す");            /* 窓の末尾の札＝引き返す */
  await pg.waitForTimeout(400);
  for(let i=0;i<4;i++){ if(!await pg.evaluate(()=>modalOpen()))break; if(!await firstCard("町へ"))break; }
}
log.push(`⑧ 町へ帰った → ${await scr()}　金貨 ${await pg.evaluate(()=>me?me.gold:"-")}　RUN=${await pg.evaluate(()=>RUN===null?"null":"あり")}`);
await pg.screenshot({path:'/tmp/pt_town.png'});
console.log(log.join("\n"));
console.log(errs.length?"⚠ "+[...new Set(errs)].slice(0,8).join("\n⚠ "):"例外なし");
await b.close();
