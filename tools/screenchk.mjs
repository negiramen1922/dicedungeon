/* ===== 画面ぜんぶの 縦・札の数・当たり・横溢れ を一覧にする =====
   §20（残りの画面を design へ渡す要件）の数字は これで採った。
   直したあとも これで確かめる。
     高さ … 390×844 で 1.2画面（1010px）まで
     当たり不足 … 44×44px に届かない押せる札。「閉じる」の1つは素通し
     320px 横溢れ … 幅 320px で 横スクロールが出るか
   使い方: node tools/screenchk.mjs                                       */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const rows=[];
for(const W of [390,320]){
const pg=await b.newPage({viewport:{width:W,height:844}});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/index.html');await pg.waitForTimeout(700);
const r=await pg.evaluate(async()=>{
  const out=[];
  const seed=()=>{
    sel.job="knight";sel.race="hume";sel.orig="greed";newGame();closeModal();
    for(let i=1;i<30;i++){me.lv++;growUp();syncMates();}
    setParty([me,makeMate("mage","elf",me.lv),makeMate("archer","beast",me.lv)]);
    me.sk=REW.act.knight.slice(0,4);me.pass=REW.pass.knight.slice(0,3);
    me.stash=(GEAR.wep.knight||[]).slice(0,3).map(g=>({...g,slot:"wep"}));
    me.bag={};Object.keys(ITEMS).slice(0,4).forEach(k=>me.bag[k]=2);
    me.mats={};Object.keys(MATS).slice(0,8).forEach(k=>me.mats[k]=4);
    me.recipes=Object.keys(RECIPES).slice(0,5);me.gold=500;
  };
  const M=(name,kind,fn)=>{
    document.querySelector("#newswrap").classList.add("hide");
    document.querySelector("#setwrap").classList.add("hide");
    try{ seed(); fn(); }catch(e){ out.push({name,kind,err:e.message}); return; }
    const host=(!document.querySelector("#newswrap").classList.contains("hide")
        &&document.querySelector("#newswrap .setbox"))
      ||(!document.querySelector("#setwrap").classList.contains("hide")
        &&document.querySelector("#setwrap .setbox"))
      ||document.querySelector("#modal:not(.hide) .mbox")
      ||document.querySelector("#"+kind);
    if(!host){ out.push({name,kind,err:"見つからない"}); return; }
    const bs=[...host.querySelectorAll("button")].filter(x=>x.offsetParent!==null);
    const small=bs.filter(e=>{const r=e.getBoundingClientRect();return r.height<44||r.width<24;}).length;
    const wrap=bs.filter(e=>e.scrollWidth>e.clientWidth+1).length;
    out.push({name,h:Math.round(host.scrollHeight),btn:bs.length,small,wrap,
      ox:document.documentElement.scrollWidth>document.documentElement.clientWidth});
    closeModal();
  };
  M("表題","title",()=>{goTitle();});
  M("記録を選ぶ","slots",()=>{drawSlots();showScreen("slots");});
  M("遊び方","tut",()=>{drawTut();showScreen("tut");});
  M("見立て","quiz",()=>{qzStep=0;qzAns={};drawQuiz();showScreen("quiz");});
  M("キャラ作成","make",()=>{newChar();mkStep=0;drawMake();showScreen("make");});
  M("町（ホーム）","home",()=>{goHome();});
  M("殿堂","hall",()=>{META.hall=[];dive("plain");for(let i=0;i<4;i++)logDive(i%2?"clear":"wipe");drawHall();showScreen("hall");});
  M("図鑑","codex",()=>{Object.keys(FOE).slice(0,6).forEach(k=>META.codex[k]=20);
    drawCodex();showScreen("codex");});
  M("地図（潜行中）","floor",()=>{dive("plain");showScreen("floor");drawFloor();});
  M("戦闘","fight",()=>{dive("plain");sel.enc=(AREAS.plain.norm||[])[0];
    showScreen("fight");foes=makeFoes();cur=me;over=false;busy=false;draw();drawActs();});
  M("戦闘・詳細","fight",()=>{dive("plain");sel.enc=(AREAS.plain.norm||[])[0];
    showScreen("fight");foes=makeFoes();cur=me;over=false;busy=false;round=1;
    foes.forEach(f=>{f.tele=teleOf({...f.acts[0]});f.next=null;});draw();drawActs();
    document.querySelector("#detail").classList.remove("hide");drawDetail();});
  M("どこへ潜るか","home",()=>{goHome();diveModal();});
  M("世界地図","home",()=>{goHome();worldModal();});
  M("仲間を雇う","home",()=>{goHome();hireModal();});
  M("行商","floor",()=>{dive("plain");showScreen("floor");shopModal(null);});
  M("こしらえる","floor",()=>{dive("plain");showScreen("floor");craftModal(null);});
  M("戦利品","floor",()=>{dive("plain");showScreen("floor");
    lootModal(catPool("act").slice(0,3).map(r=>({cat:"act",r})),()=>{});});
  M("レベルアップ","floor",()=>{dive("plain");showScreen("floor");
    me.lv++;levelUpModal(()=>{});});
  M("敵の詳細","fight",()=>{dive("plain");sel.enc=(AREAS.plain.norm||[])[0];
    showScreen("fight");foes=makeFoes();foeModal(foes[0]);});
  M("お知らせ","home",()=>{goHome();openNews();});
  M("設定","home",()=>{goHome();openSet();});
  return out;
});
rows.push([W,r]);
if(errs.length)console.log("幅"+W+" ERR "+errs.slice(0,2).join(" / "));
await pg.close();
}
await b.close();
const [a,c]=rows;
console.log("画面                  390px 高さ  画面ぶん  札  当たり不足 折返し ｜ 320px 溢れ");
a[1].forEach((x,i)=>{
  const y=c[1][i]||{};
  if(x.err){console.log("  "+x.name.padEnd(12,"　").slice(0,12)+"  ✗ "+x.err);return;}
  console.log("  "+x.name.padEnd(12,"　").slice(0,12)
    +String(x.h).padStart(7)+"px"+(x.h/844).toFixed(2).padStart(8)
    +String(x.btn).padStart(5)+String(x.small).padStart(8)+String(x.wrap).padStart(7)
    +"  ｜ "+(y.ox?"✗ 溢れる":"○"));
});
