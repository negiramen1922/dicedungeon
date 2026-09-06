/* まっさらから 本物のクリックだけで遊ぶ。
   関数を直に呼ばない ── 呼ぶと「画面から辿れない道」を見落とす
   （α1.0.004 で キャラ作成が 消した startRun を呼んだまま残っていた）。 */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:430,height:930}});
const errs=[];
pg.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
pg.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::/.test(m.text()))errs.push('CONSOLE '+m.text());});
await pg.goto('http://localhost:8765/'+(process.argv[2]||'index.html'));   /* 版を指定して 前の版と突き合わせられる */
await pg.evaluate(()=>{try{localStorage.clear()}catch(e){}});
await pg.reload();await pg.waitForTimeout(900);
/* 演出だけ速くする（押す道すじは本物のまま） */
await pg.evaluate(()=>{window.wait=async()=>{};window.ovMsg=()=>{};});
const log=[];
const chestOn=()=>pg.evaluate(()=>{const O=document.querySelector("#chestOv");return !!(O&&O.classList.contains("on"));});
const scr=()=>pg.evaluate(()=>curScreen+(modalOpen()?"+窓":"")+
  (document.querySelector("#chestOv")&&document.querySelector("#chestOv").classList.contains("on")?"+覆":""));
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
const ttlSeen={last:null,run:0};
const once=async()=>{
  /* 窓が開いているあいだは 窓の中だけを見る。後ろの画面の札を掴むと
     キャラ作成をやり直してしまう（実際に踏んだ） */
  /* 宝箱の覆いは 画面ぜんぶを覆う。開いたままだと 後ろの札が押せない */
  if(await chestOn()){
    for(const q of ['#chestOv .ndbtn .go2','#chestOv .ndbtn button','#chestOv #cSkip','#chestOv button']){
      const es=await pg.$$(q); if(!es.length)continue;
      try{ await es[es.length-1].click({force:true,timeout:2500}); }catch(e){ continue; }
      await pg.waitForTimeout(260); return true;
    }
    return false;
  }
  const inModal=await pg.evaluate(()=>modalOpen());
  /* 行商の窓は「買う→確かめ→行商」と回り続ける。同じ窓が続いたら 閉じる */
  const ttl=inModal?await pg.evaluate(()=>{
    const t=document.querySelector("#mbox .mtitle");return t?t.textContent.trim():"";}):"";
  /* ===== 数えるのは **続けて**戻った回数 =====
     前は一周を通した通算で数えていた。戦利品の窓は戦闘ごとに出るので
     **4戦目には必ず「堂々巡り」扱い**になり、`.mclose`（選ばずに閉じる）が
     先に押される。すると lootModal のコールバックが走らず nextStage() に
     届かないので、勝ったのに fight のまま止まっていた。
     ── 製品は何も壊れていないのに 3回に1回ほど赤が出ていた原因。 */
  if(ttl){
    if(ttl===ttlSeen.last)ttlSeen.run=(ttlSeen.run||0)+1;
    else {ttlSeen.last=ttl;ttlSeen.run=1;}
  }else{ ttlSeen.last=null;ttlSeen.run=0; }
  const stuck=ttl&&ttlSeen.run>=4;   /* 同じ窓に続けて4度戻ったら 堂々巡り */
  const list=inModal
    ?(stuck
      ?[['#mbox .mclose',0],['#mbox .ndbtn button',1],['#mbox button',1]]
      :[['#mbox [data-i]',0],['#mbox [data-d]',0],['#mbox [data-b]',1],
        ['#mbox [data-keep]',0],['#mbox [data-skip]',0],
        ['#mbox .ndbtn button',1],['#mbox .mclose',0],['#mbox button',1]])
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

/* ① 表題 → 記録を選ぶ → キャラ作成 */
log.push(`① 起動　画面 ${await scr()}`);
await tap("#tStart","ゲームをスタート");
log.push(`   記録を選ぶ → ${await scr()}　枠 ${await pg.evaluate(()=>document.querySelectorAll("#slotList [data-sl]").length)}`);
{ const sl=await pg.$$('#slotList [data-sl]');
  if(sl.length)await sl[0].click({force:true}); else log.push("✗ 記録の枠が無い"); }
await pg.waitForTimeout(300);
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
/* 「始める場所」の段は α1.0.012 で外した。確認の札を押すと そのまま町へ出る */
await tap("#mkNext","この者で始める");
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
/* ===== 決着まで押し切る =====
   前は `for(let t=0;t<80;t++)` の中で **busy 待ちも1回として数えて**いた。
   攻撃ひとつの演出が 2秒ほどあるので、待つだけで 30回ぶん食う。
   つまり「80回」は実際には **2〜3手**しか押せておらず、
   相手が4体いる回は決着に届かないことがあった。
   ── 揺らぎで赤が出て、そのたびに中身を疑うことになる。
   数えるのは **押した回数**にして、行き詰まりは 実時間で見切る。 */
const fightOut=async(maxActs,maxMs)=>{
  const t0=Date.now();
  let acts=0;
  while(acts<maxActs&&Date.now()-t0<maxMs){
    if(await pg.evaluate(()=>over))return true;
    if(await pg.evaluate(()=>busy)){await pg.waitForTimeout(80);continue;}
    const cells=await pg.$$('#board .cell.sel');
    if(cells.length){await cells[0].click({force:true});await pg.waitForTimeout(90);continue;}
    const atk=await pg.$('#acts .act.atk:not([disabled])');
    if(atk){await atk.click({force:true});acts++;await pg.waitForTimeout(130);continue;}
    const def=await pg.$('#acts .act.def:not([disabled])');
    if(def){
      /* 守りは 相手を選ばないので「これで使う」まで押さないと使われない
         （α1.0.029 で 二度押しは「やめる」になった）。
         ここを直さないと 押しても押しても使われず 決着しない */
      await def.click({force:true});await pg.waitForTimeout(120);
      const go=await pg.$('#acts .act.go2');
      if(go){await go.click({force:true});}
      acts++;await pg.waitForTimeout(140);continue;
    }
    await pg.waitForTimeout(120);
  }
  if(await pg.evaluate(()=>over))return true;
  /* 決着しなかったら **なぜ**かを残す。「✗ 町に戻れていない」だけでは
     こちらの不具合なのか 押し方が足りないのか 分からない */
  const st=await pg.evaluate(()=>({
    r:typeof round==="undefined"?"-":round, busy, over,
    me:party.map(u=>`${u.name} ${Math.max(0,u.HP)}/${u.maxHP}`).join("・"),
    foe:foes.filter(f=>f.HP>0).map(f=>`${f.name} ${f.HP}/${f.maxHP}`).join("・"),
    acts:[...document.querySelectorAll('#acts .act')].map(b=>
      b.querySelector('.an').innerText.replace(/\s+/g,'')+(b.disabled?'[×]':'')).join(" "),
  }));
  log.push(`   決着せず　押した ${acts} 手・${Math.round((Date.now()-t0)/1000)}秒`+
    `　ラウンド ${st.r}　busy=${st.busy}`);
  log.push(`   一味 ${st.me}`);
  log.push(`   敵 ${st.foe||"（居ない）"}`);
  log.push(`   札 ${st.acts||"（無い）"}`);
  return false;
};

/* ⑤ 潜る */
await tap("#hGo","潜る");
log.push(`⑤ 潜る窓 → ${await scr()}`);

await pg.waitForTimeout(500);
log.push(`⑥ 地図 → ${await scr()}　部屋 ${await pg.evaluate(()=>RUN&&RUN.M?Object.keys(RUN.M.node).length:"RUN なし")}`);
/* ⑦ 部屋を進んで 戦闘まで */
let battles=0,wasFight=false;
const trail=[];
for(let step=0;step<60;step++){          /* 部屋が増えたので 40 → 60 */
  if(battles>=3&&!wasFight&&!(await scr()).startsWith("fight"))break;   /* 3戦したら 帰り道の確かめへ */
  const s=await scr();
  trail.push(s+(s.endsWith("窓")?"["+(await pg.evaluate(()=>{
    const t=document.querySelector("#mbox .mtitle");return t?t.textContent.trim().replace(/\s/g,""):"?";}))+"]":""));
  if(s.startsWith("fight")){
    if(!wasFight)battles++;
    wasFight=true;
    /* 攻撃を押し続けて 決着まで */
    await fightOut(60,70000);
    await pg.waitForTimeout(400);
    for(let i=0;i<8;i++){ if(!await pg.evaluate(()=>modalOpen()))break; if(!await firstCard("戦利品"))break; }
    await pg.waitForTimeout(300);
    continue;
  }
  wasFight=false;
  if(await chestOn()){ if(!await firstCard("宝箱の覆い"))break; continue; }
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
/* ⑧ 町へ帰る。窓が開いたまま止まっていることがあるので まず閉じる */
for(let i=0;i<8;i++){ if(!await pg.evaluate(()=>modalOpen())&&!await chestOn())break; if(!await once())break; }
/* 歩数が尽きて **戦いの最中**で止まっていることがある。町へは戻れないので
   まず決着まで押し切る。ここを飛ばすと ⑧ が「町へ帰った → fight」と
   出るのに 何も確かめていない、という嘘の緑になる（α1.0.018 で踏んだ）。 */
if((await scr()).startsWith("fight")){
  log.push("   戦いの最中で歩数が尽きた → 決着まで押す");
  await fightOut(90,110000);
  await pg.waitForTimeout(400);
  for(let i=0;i<10;i++){ if(!await pg.evaluate(()=>modalOpen())&&!await chestOn())break; if(!await once())break; }
}
/* まだ戦闘の画面なら **なぜ抜けられないのか**を残す。
   決着（over）はしていても 戦利品の窓が閉じきれないと画面は fight のままで、
   下の「町へ帰る」が丸ごと飛ばされる。前はここが無言だったので
   「✗ 町に戻れていない」だけが出て、何が起きたのか分からなかった。 */
if((await scr()).startsWith("fight")){
  const d=await pg.evaluate(()=>{
    const t=document.querySelector("#mbox .mtitle");
    return {
      over, busy, run:!!RUN,
      modal:modalOpen(), chest:!!(document.querySelector("#chestOv")||{classList:{contains:()=>false}}).classList.contains("on"),
      title:t?t.textContent.trim():"（窓なし）",
      btns:[...document.querySelectorAll("#mbox button")]
        .map(b=>b.innerText.replace(/\s+/g,"").slice(0,14)+(b.disabled?"[×]":"")).join(" ")||"（札なし）",
      foes:(typeof foes!=="undefined"?foes:[]).filter(f=>f.HP>0).length,
      acts:[...document.querySelectorAll("#acts .act")]
        .map(b=>b.querySelector(".an").innerText.replace(/\s+/g,"")).join(" ")||"（札なし）",
    };
  });
  log.push(`   戦闘から抜けられない　over=${d.over} busy=${d.busy} RUN=${d.run}`+
    `　窓=${d.modal} 覆=${d.chest}　生きた敵 ${d.foes}`);
  log.push(`   窓の題 ${d.title}`);
  log.push(`   窓の札 ${d.btns}`);
  log.push(`   行動の札 ${d.acts}`);
}
if((await scr()).startsWith("floor")){
  await tap("#leaveBtn","町へ帰る");
  try{ await pg.waitForSelector('#mbox .ndbtn button',{timeout:4000}); }catch(e){}
  /* 確かめの窓は「まだ潜る／引き返す」。末尾の札が 引き返す */
  const nd=[];
  for(const e of await pg.$$('#mbox .ndbtn button'))if(await e.isVisible())nd.push(e);
  if(nd.length){ try{ await nd[nd.length-1].click({force:true}); }
                 catch(e){ log.push("✗ 引き返す が押せない"); } }
  else log.push("✗ 引き返す の札が無い");
  await pg.waitForTimeout(600);
  for(let i=0;i<5;i++){ if(!await pg.evaluate(()=>modalOpen()))break; if(!await once())break; }
}
const endScr=await scr(), endRun=await pg.evaluate(()=>RUN===null?"null":"あり");
log.push(`⑧ 町へ帰った → ${endScr}　金貨 ${await pg.evaluate(()=>me?me.gold:"-")}　RUN=${endRun}`);
/* **ここまで来たら 町に居ること。**前は floor で無ければ黙って飛ばしており、
   「町へ帰った → fight」と出るのに 何も確かめていなかった。 */
const homeOK=endScr.startsWith("home")&&endRun==="null";
if(!homeOK)log.push(`✗ 町に戻れていない（画面 ${endScr}／RUN ${endRun}）`);
await pg.screenshot({path:'/tmp/pt_town.png'});
console.log(log.join("\n"));
console.log(errs.length?"⚠ "+[...new Set(errs)].slice(0,8).join("\n⚠ "):"例外なし");
console.log(homeOK?"✓ 起動から町へ帰るまで 通った":"✗ 通し切れていない");
await b.close();
process.exit(homeOK&&!errs.length?0:1);
