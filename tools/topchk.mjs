/* ===== 右上の札（お知らせ ✉・設定 ⚙）が 何にも被っていないか =====
   2つは画面に貼り付いている（position:fixed）ので、
   各画面のいちばん上の行が その下に潜り込みやすい。
   ① 2つの札どうし（未読の印まで含めて）が重なっていないか
   ② 画面ごとの 上の行の文字と重なっていないか
   使い方: node tools/topchk.mjs                                          */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const L=[],bad=[];
for(const W of [320,360,390,430,720,1100]){
  const pg=await b.newPage({viewport:{width:W,height:800}});
  const errs=[];pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto('http://localhost:8765/index.html');await pg.waitForTimeout(600);
  const r=await pg.evaluate(()=>{
    sel.job="knight";sel.race="hume";sel.orig="greed";newGame();closeModal();
    for(let i=1;i<8;i++){me.lv++;growUp();syncMates();}
    META.newsSeen=null;drawMail();
    const box=e=>{const b=e.getBoundingClientRect();
      return {l:b.left,r:b.right,t:b.top,b:b.bottom,w:b.width,h:b.height};};
    const hit=(a,c)=>a&&c&&a.l<c.r&&c.l<a.r&&a.t<c.b&&c.t<a.b;
    /* 札の当たり判定は 未読の印（右上に −4px はみ出す）まで含める */
    const icon=s=>{const e=document.querySelector(s);if(!e)return null;
      const b=box(e); const d=e.querySelector(".dot");
      if(d){const q=box(d); b.l=Math.min(b.l,q.l);b.r=Math.max(b.r,q.r);
        b.t=Math.min(b.t,q.t);b.b=Math.max(b.b,q.b);}
      return b;};
    const M=icon("#mail"), G=icon("#gear");
    const out={両札:hit(M,G),隙間:Math.round(G.l-M.r),画面:[]};
    /* 画面ごとに いちばん上の行を見る */
    const S=[["home",()=>{goHome&&goHome();},".hometitle,.homesub,.townnote"],
             ["floor",()=>{dive("plain");showScreen("floor");drawFloor();},"#fName,#fSub"],
             ["fight",()=>{dive("plain");sel.enc=(AREAS.plain.norm||[])[0];
                showScreen("fight");foes=makeFoes();cur=me;over=false;busy=false;
                draw();drawActs();},"#stageLbl,#charBtn"],
             ["codex",()=>{drawCodex();showScreen("codex");},".secttl,.backbtn"],
             ["hall",()=>{drawHall();showScreen("hall");},".secttl,.backbtn"]];
    for(const [n,go,sel2] of S){
      try{go();}catch(e){}
      const es=[...document.querySelectorAll("#"+n+" "+sel2.split(",").join(", #"+n+" "))];
      const over=es.filter(e=>e.offsetParent!==null&&e.textContent.trim())
        .filter(e=>hit(box(e),M)||hit(box(e),G))
        .map(e=>(e.id||e.className)+"「"+e.textContent.trim().slice(0,14)+"」");
      out.画面.push([n,es.length,over]);
    }
    return out;
  });
  L.push(`■ 幅 ${W}px　札どうし ${r.両札?"✗ 重なっている":"○"}（隙間 ${r.隙間}px）`);
  if(r.両札)bad.push(`幅 ${W}px で ✉ と ⚙ が重なっている`);
  if(r.隙間<4)bad.push(`幅 ${W}px で ✉ と ⚙ の隙間が ${r.隙間}px しかない`);
  r.画面.forEach(([n,cnt,over])=>{
    L.push(`   ${n.padEnd(6)} 上の行 ${cnt} 個　潜り込み ${over.length?over.join("・"):"なし"}`);
    if(over.length)bad.push(`幅 ${W}px の ${n} で 「${over.join("・")}」が札の下に潜っている`);
  });
  if(errs.length)L.push("   ERR "+errs.slice(0,2).join(" / "));
  await pg.close();
}
await b.close();
console.log(L.join("\n"));
if(bad.length){console.log("\n⚠ "+bad.join("\n⚠ "));process.exitCode=1;}
else console.log("\n✓ 右上の札は 何にも被っていない");
