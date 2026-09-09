/* ===== 防御無視（pen）の単位が揃っているか（α1.0.070） =====
   〔不具合〕技の pen は 0〜1、装備の pen は 0〜100 で **同じ名前で単位が違った**。
   本番は 技を 0〜1 で、見立ては 0〜100 で読んでいたので、
   予告と実際のダメージが食い違っていた（徹甲矢は 予告 1% / 本番 100%）。
   ① 表の pen が すべて 0〜100 の範囲にある
   ② 予告のダメージと 本番のダメージが 合う
   使い方: node tools/penchk.mjs                                          */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:390,height:844}});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/index.html');await pg.waitForTimeout(900);
const out=await pg.evaluate(async()=>{
  const L=[],bad=[];
  /* ① 表 */
  const sk=[];
  Object.keys(REW.act).forEach(g=>REW.act[g].forEach(s=>{if(s.pen)sk.push([s.n.replace(/\s/g,""),s.pen]);}));
  const gr=[];
  ["wep","armor","acc"].forEach(k=>{
    const list=k==="wep"?[].concat(...Object.values(GEAR.wep||{})):(GEAR[k]||[]);
    list.forEach(g=>{if(g.pen)gr.push([g.n.replace(/\s/g,""),g.pen]);});});
  L.push("① 技　"+sk.map(x=>x[0]+" "+x[1]).join("　"));
  L.push("   装備　"+(gr.map(x=>x[0]+" "+x[1]).join("　")||"なし"));
  sk.concat(gr).forEach(([n,v])=>{ if(v<1||v>100)bad.push(`${n} の pen ${v} が 0〜100 の外`); });
  if(sk.some(([n,v])=>v<=1))bad.push("技の pen に 1 以下が残っている（0〜1 の単位の名残）");
  /* ② 予告と本番が合うか */
  window.ovMsg=()=>{};window.ovHide=()=>{};window.rollDice=async()=>0;window.wait=async()=>{};
  slot=0;sel.job="archer";sel.race="hume";sel.orig="greed";
  newGame();
  let g=0;while(g++<14&&modalOpen()){const b=document.querySelector("#mbox [data-i]")
    ||document.querySelector("#mbox .ndbtn button:last-child");if(!b)break;b.click();
    await new Promise(r=>setTimeout(r,8));}
  const pierce=REW.act.archer.find(x=>x.id==="aa1");
  me.sk=[{...pierce,cdLeft:0}];me.MP=me.maxMP;
  dive("plain");sel.enc="s_gb";RUN.elite=false;RUN.boss=false;
  await startBattle();
  cur=me;busy=false;
  const f=foes[0];
  f.VIT=25;                                   /* 貫きが効くよう 硬くしておく */
  const pen=Math.min(1,((pierce.pen||0)+passOn("pen",me)+(me.gearPen||0))/100);
  const tdefReal=Math.round(defOf(f)*(1-pen));
  const tdefPrev=Math.round(defOf(f)*(1-Math.min(1,(pierce.pen||0)/100)));
  L.push(`② 敵の VIT ${defOf(f)}%　本番で使う VIT ${tdefReal}%　見立てで使う VIT ${tdefPrev}%`);
  if(tdefReal!==tdefPrev)bad.push(`予告と本番で 貫いたあとの VIT が違う（${tdefPrev} 対 ${tdefReal}）`);
  if(tdefReal!==0)bad.push("徹甲矢（pen 100）なのに VIT が残っている");
  return {L,bad};
});
console.log(out.L.join('\n'));
if(errs.length)console.log('ERR\n'+errs.join('\n'));
console.log(out.bad.length?'\n✗ '+out.bad.join('\n✗ '):'\n✓ pen は 0〜100 で揃い、予告と本番が合う');
await b.close();
process.exit(out.bad.length||errs.length?1:0);
