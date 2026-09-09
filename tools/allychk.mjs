/* 味方に かける手。相手を選べるか（α1.0.039） */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const file=process.argv[2]||'index.html';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:430,height:930}});
const errs=[];pg.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
await pg.goto('http://localhost:8765/'+file);await pg.waitForTimeout(800);
const out=await pg.evaluate(async()=>{
  const L=[],bad=[];
  window.ovMsg=()=>{};window.ovHide=()=>{};window.rollDice=async()=>0;
  window.wait=async()=>{};
  /* 〔罠〕`r6` は スクリプト直下の const なので window に乗っていない。
     `window.r6=()=>6` は効かない。出目を握るなら Math.random のほう。
     ただし 戦いを組み立てる前から握ると 乱数を待つところで止まるので、
     この道具では **当たるまで繰り返す**やり方をそのまま使う。 */
  slot=0; sel.job="knight";sel.race="hume";sel.orig="wrath";
  newGame();
  let g=0;while(g++<14&&modalOpen()){const b=document.querySelector("#mbox [data-i]")
    ||document.querySelector("#mbox .ndbtn button:last-child")
    ||document.querySelector("#mbox [data-skip]");if(!b)break;b.click();
    await new Promise(r=>setTimeout(r,8));}
  /* 3人にする */
  while(party.length<3){const m=makeMate("mage","elf",3);m.gold=0;setParty([...party,m]);}
  dive("plain"); sel.enc=Object.keys(ENCS)[0]; RUN.elite=false;RUN.boss=false;
  await startBattle();
  cur=me;busy=false;
  const find=id=>REW.act.common.find(x=>x.id===id);
  const put=ids=>{me.sk=ids.map(i=>({...find(i),cdLeft:0}));me.MP=me.maxMP;drawActs();};
  const sel2=()=>[...document.querySelectorAll("#board .cell.sel")]
      .map(e=>e.dataset.me!==undefined?"味方"+e.dataset.me:"敵"+e.dataset.id);

  /* ① 癒し。味方のマスが選べる */
  put(["a1"]);
  const btn=[...document.querySelectorAll("#acts .act")].find(b=>/応急手当/.test(b.textContent));
  L.push(`① 応急手当の札 ${!!btn}`);
  if(!btn)bad.push("応急手当の札が無い");
  btn.click();
  L.push(`　 選べるマス ${sel2().join(" ")}　案内「${$("#prompt").textContent.trim()}」`);
  if(!sel2().length)bad.push("味方のマスが選べない");
  if(sel2().some(x=>/敵/.test(x)))bad.push("癒しなのに 敵のマスが選べる");
  if(sel2().length!==party.filter(u=>u.HP>0).length)bad.push("生きている仲間ぜんぶが選べていない");
  /* ② 仲間を選んで 実際に その仲間が回復する。
     出目は本物なので 当たるまで繰り返す（当たり外れではなく **誰に効くか**を見る） */
  const mate=party[1]; mate.HP=Math.round(mate.maxHP*0.3);
  const meWas=me.HP=Math.round(me.maxHP*0.5);
  let healed=0, tries=0;
  while(!healed&&tries++<12){
    pending=null;busy=false;cur=me;me.MP=me.maxMP;me.sk[0].cdLeft=0;draw();drawActs();
    [...document.querySelectorAll("#acts .act")].find(b=>/応急手当/.test(b.textContent)).click();
    const c=document.querySelector(`#board .cell.sel[data-me="${mate.pid}"]`);
    if(!c){bad.push("仲間のマスが押せない");break;}
    const h0=mate.HP;
    c.click();
    await new Promise(r=>setTimeout(r,120));
    if(mate.HP>h0)healed=mate.HP-h0;
  }
  L.push(`② ${mate.short} に ${tries}回目で 通った　HP +${healed}　主人公 HP ${meWas}→${me.HP}`);
  if(!healed)bad.push("選んだ仲間が 一度も回復しなかった");
  if(me.HP!==meWas)bad.push("選んでいない主人公が回復した");

  /* ③ 盾。仲間に張れる */
  busy=false;cur=me;
  put(["ak1"]);
  me.sk=[{...REW.act.knight.find(x=>x.id==="ak1"),cdLeft:0}];me.MP=me.maxMP;drawActs();
  const gb=[...document.querySelectorAll("#acts .act")].find(b=>/盾/.test(b.textContent));
  gb.click();
  const gc=document.querySelector(`#board .cell.sel[data-me="${mate.pid}"]`);
  const b0=mate.block||0;
  if(!gc)bad.push("盾を 仲間に張れない");
  else{ gc.click(); await new Promise(r=>setTimeout(r,400));
    L.push(`③ ${mate.short} のシールド ${b0}→${mate.block}　主人公 ${me.block}`);
    if(!(mate.block>b0))bad.push("仲間にシールドが張られていない");
    if(me.block>0)bad.push("張った本人にも付いている");
  }

  /* ④ 蘇生。倒れた者だけが選べる */
  busy=false;cur=me;
  mate.HP=0;
  me.sk=[{...find("a7"),cdLeft:0}];me.MP=me.maxMP;draw();drawActs();
  [...document.querySelectorAll("#acts .act")].find(b=>/蘇/.test(b.textContent)).click();
  const ss=sel2();
  L.push(`④ 蘇生で選べるマス ${ss.join(" ")}（倒れているのは ${mate.short} だけ）`);
  if(ss.length!==1||ss[0]!=="味方"+mate.pid)bad.push("蘇生で 倒れた者だけが選べていない");
  let woke=0,t2=0;
  while(!woke&&t2++<12){
    pending=null;busy=false;cur=me;me.MP=me.maxMP;me.sk[0].cdLeft=0;mate.HP=0;draw();drawActs();
    [...document.querySelectorAll("#acts .act")].find(b=>/蘇/.test(b.textContent)).click();
    const rc=document.querySelector(`#board .cell.sel[data-me="${mate.pid}"]`);
    if(!rc)break;
    rc.click(); await new Promise(r=>setTimeout(r,120));
    if(mate.HP>0)woke=mate.HP;
  }
  L.push(`　 ${t2}回目で 起き上がった　HP ${woke}`);
  if(!woke)bad.push("一度も起き上がらなかった");

  /* ⑤ 自分だけの手は これまでどおり「これで使う」 */
  busy=false;cur=me;
  me.sk=[{id:"zz",n:"獣 化",kind:"focus",mp:1,cd:1,beast:{pow:30,dex:10},dur:2,d:"—",cdLeft:0}];
  me.MP=me.maxMP;draw();drawActs();
  [...document.querySelectorAll("#acts .act")].find(b=>/獣/.test(b.textContent)).click();
  /* α1.0.061 で 決めは **下の帯（#bdec）**へ移った。
     札の中に生やすと コマンド欄の高さが変わってしまうため */
  const go=[...document.querySelectorAll("#bdec button")].some(
    b=>/こ\s*の\s*手\s*を\s*使\s*う/.test(b.textContent));
  L.push(`⑤ 自分だけの手 → 決めの帯「この手を使う」 ${go}　選べるマス ${sel2().length}`);
  if(!go)bad.push("自分だけの手で 決めの帯が出ない");
  if(sel2().length)bad.push("自分だけの手なのに マスが選べる");

  return {L,bad};
});
console.log(out.L.join("\n"));
if(errs.length)console.log(errs.join("\n"));
if(out.bad.length){console.log("\n⚠ "+out.bad.join("\n⚠ "));process.exitCode=1;}
else console.log("\n✓ 味方を選んで かけられる");
await b.close();
