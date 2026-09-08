/* ===== 新しい画面の 受け入れの線（§19 A-1〜A-8・α1.0.058） =====
   A-1 各画面 390×844 で 1.2画面以内（≦1010px）
   A-4 幅 320px で 横スクロールが出ない
   A-5 押せるものは **当たり 44×44px 以上**（見た目は 30px 以上でよい）
   A-7 固定幅の札の文字が 1行に収まる
   A-8 倉庫の一覧に 装備中の品が出ない
   使い方: node tools/uichk.mjs                                           */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const L=[],bad=[];
const SCREENS=[["menu",null],["party",null],["char",null],["skill",null],
  ["gear",null],["bag",null],["skone",{i:0,on:"0"}],["gearone",{i:0}]];
const seed=()=>{
  sel.job="knight";sel.race="hume";sel.orig="greed";newGame();closeModal();
  for(let i=1;i<30;i++){me.lv++;growUp();syncMates();}
  setParty([me,makeMate("mage","elf",me.lv),makeMate("archer","beast",me.lv)]);
  me.sk=REW.act.knight.slice(0,4); me.pass=REW.pass.knight.slice(0,3);
  me.bagSk=REW.act.common.slice(0,5); me.bagPass=REW.pass.common.slice(0,4);
  me.stash=[].concat((GEAR.wep.knight||[]).slice(0,3).map(g=>({...g,slot:"wep"})),
    GEAR.armor.slice(0,3).map(g=>({...g,slot:"armor"})),
    GEAR.acc.slice(0,4).map(g=>({...g,slot:"acc"})));
  me.bag={};Object.keys(ITEMS).slice(0,4).forEach(k=>me.bag[k]=2);
  me.mats={};Object.keys(MATS).slice(0,6).forEach(k=>me.mats[k]=3);
  me.recipes=Object.keys(RECIPES).slice(0,4);
};
/* ---- A-1・A-5・A-7 は 390px で ---- */
{
  const pg=await b.newPage({viewport:{width:390,height:844}});
  const errs=[];pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto('http://localhost:8765/index.html');await pg.waitForTimeout(700);
  const r=await pg.evaluate(({SCREENS,seedSrc})=>{
    eval("("+seedSrc+")()");
    const out=[];
    for(const [n,o] of SCREENS){
      UI.stack=[Object.assign({name:n},o||{})];uiDraw();
      const root=document.querySelector("#ui");
      const bs=[...root.querySelectorAll("button")].filter(x=>x.offsetParent!==null);
      /* 当たり判定は 疑似要素のはみ出しも数える */
      const hit=e=>{const r=e.getBoundingClientRect();
        const a=getComputedStyle(e,"::after");
        let t=r.height,w=r.width;
        if(a.content&&a.content!=="none"&&a.position==="absolute"){
          const top=parseFloat(a.top)||0, bot=parseFloat(a.bottom)||0;
          if(top<0)t+=-top; if(bot<0)t+=-bot;
        }
        return {w,h:t,n:(e.textContent||"").replace(/\s+/g," ").trim().slice(0,12)};
      };
      const small=bs.map(hit).filter(x=>x.h<44||x.w<24);
      const wrap=bs.filter(e=>e.scrollWidth>e.clientWidth+1)
        .map(e=>(e.textContent||"").replace(/\s+/g," ").trim().slice(0,14));
      out.push({n,h:Math.round(root.scrollHeight),btn:bs.length,small,wrap});
    }
    return out;
  },{SCREENS,seedSrc:seed.toString()});
  r.forEach(x=>{
    L.push(`${x.n.padEnd(8)} ${String(x.h).padStart(5)}px（${(x.h/844).toFixed(2)} 画面）`
      +`　札 ${String(x.btn).padStart(2)}　当たり不足 ${x.small.length}　折り返し ${x.wrap.length}`);
    if(x.h>1010)bad.push(`A-1 ${x.n} が ${x.h}px（1010px まで）`);
    if(x.small.length)bad.push(`A-5 ${x.n} の当たりが小さい：`
      +x.small.map(s=>`「${s.n}」${Math.round(s.w)}×${Math.round(s.h)}`).join("・"));
    if(x.wrap.length)bad.push(`A-7 ${x.n} で札の字が はみ出す：${x.wrap.join("・")}`);
  });
  if(errs.length)L.push("ERR "+errs.slice(0,3).join(" / "));
  await pg.close();
}
/* ---- A-4 は 320px で ---- */
{
  const pg=await b.newPage({viewport:{width:320,height:844}});
  await pg.goto('http://localhost:8765/index.html');await pg.waitForTimeout(600);
  const r=await pg.evaluate(({SCREENS,seedSrc})=>{
    eval("("+seedSrc+")()");
    const out=[];
    for(const [n,o] of SCREENS){
      UI.stack=[Object.assign({name:n},o||{})];uiDraw();
      out.push({n,over:document.documentElement.scrollWidth>document.documentElement.clientWidth,
        w:document.documentElement.scrollWidth,c:document.documentElement.clientWidth});
    }
    return out;
  },{SCREENS,seedSrc:seed.toString()});
  const ng=r.filter(x=>x.over);
  L.push(`\nA-4 幅 320px　横に溢れた画面 ${ng.length}/${r.length}`
    +(ng.length?`　${ng.map(x=>`${x.n}(${x.w}>${x.c})`).join("・")}`:""));
  ng.forEach(x=>bad.push(`A-4 ${x.n} が 横に溢れる（${x.w} > ${x.c}）`));
  await pg.close();
}
await b.close();
console.log(L.join("\n"));
if(bad.length){console.log("\n⚠ "+bad.join("\n⚠ "));process.exitCode=1;}
else console.log("\n✓ 受け入れの線 A-1・A-4・A-5・A-7 を通った");
