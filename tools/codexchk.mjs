/* ===== 図鑑が 埋まりにくくなったか・中身が出るか（α1.0.055） =====
   ① 段の数は 1/4/8/13/20 戦か
   ② 会っただけでは「埋まった」に数えないか（書き上がりだけ数える）
   ③ 4段目で **使う手の中身**が出るか（名前だけではない）
   ④ 5段目で 弱点と耐性が出るか
   使い方: node tools/codexchk.mjs                                        */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/index.html');await pg.waitForTimeout(800);
const out=await pg.evaluate(()=>{
  const L=[],bad=[];
  sel.job="knight";sel.race="hume";sel.orig="greed";newGame();closeModal();
  const KEYS=Object.keys(FOE), K=KEYS[0];
  L.push(`① 段の数　${CODEXN.join("・")} 戦　（敵は ${KEYS.length} 種）`);
  if(CODEXN[CODEXN.length-1]!==20)bad.push("書き上がりが 20 戦になっていない");

  /* ② 数え方。ぜんぶに 1 戦だけ会った状態 */
  META.codex={};KEYS.forEach(k=>{META.codex[k]=1;});
  const one=cxCount("foe"), oneAll=codexCount();
  META.codex={};KEYS.forEach(k=>{META.codex[k]=20;});
  const full=cxCount("foe"), fullAll=codexCount();
  L.push(`② ぜんぶに 1 戦だけ　モンスター ${one.got}/${one.all}　図鑑ぜんたい ${oneAll.pct}%`);
  L.push(`　 ぜんぶ 20 戦　　　 モンスター ${full.got}/${full.all}　図鑑ぜんたい ${fullAll.pct}%`);
  if(one.got!==0)bad.push(`1戦だけで ${one.got} 種が「埋まった」に数えられている`);
  if(full.got!==full.all)bad.push("20戦しても 埋まらない");

  /* ③④ 見え方。同じ敵で 段を上げながら */
  const rows={};
  [1,4,8,13,20].forEach(n=>{
    META.codex={};META.codex[K]=n;META.elem={};
    cxNow="foe";
    const h=cxBody();
    const i=h.indexOf(FOE[K].n);
    const seg=h.slice(Math.max(0,i-400),i+1400);
    rows[n]={段:codexLv(K),
      HP:/HP \d/.test(seg), VIT:/VIT \d/.test(seg),
      手:(seg.match(/class="cxact"/g)||[]).length,
      中身:/class="cxad"/.test(seg),
      弱:/弱 /.test(seg)||/elw/.test(seg)};
  });
  L.push("③ 同じ敵を 何戦したら 何が見えるか（"+FOE[K].n+"）");
  [1,4,8,13,20].forEach(n=>{const r=rows[n];
    L.push(`　 ${String(n).padStart(2)}戦 → 段 ${r.段}　HP ${r.HP?"○":"—"}　VIT ${r.VIT?"○":"—"}　`
      +`使う手 ${r.手?r.手+"つ":"—"}　中身 ${r.中身?"○":"—"}　弱点 ${r.弱?"○":"—"}`);});
  if(rows[8].手)bad.push("8戦で 使う手が出ている（13戦のはず）");
  if(!rows[13].手)bad.push("13戦で 使う手が出ていない");
  if(!rows[13].中身)bad.push("使う手の 中身が出ていない（名前だけ）");
  if(rows[13].弱)bad.push("13戦で 弱点が出ている（20戦のはず）");
  if(!rows[20].弱)bad.push("20戦で 弱点が出ていない");

  /* 使う手の一行が ぜんぶの敵・ぜんぶの種類で 空にならないか */
  let empty=[];
  KEYS.forEach(k=>(FOE[k].acts||[]).forEach(a=>{
    const l=foeActLine(a); if(!l||!l.d)empty.push(FOE[k].n+"／"+a.n);}));
  L.push(`④ 敵の手 ${KEYS.reduce((a,k)=>a+(FOE[k].acts||[]).length,0)} 個　中身が空 ${empty.length}`);
  if(empty.length)bad.push("中身が空の手："+empty.slice(0,5).join("・"));
  return {L,bad};
});
console.log(out.L.join("\n"));
if(errs.length)console.log("\nERR "+errs.slice(0,3).join("\n"));
if(out.bad.length){console.log("\n⚠ "+out.bad.join("\n⚠ "));process.exitCode=1;}
else console.log("\n✓ 図鑑は 20戦で書き上がり、使う手の中身も出ている");
await b.close();
