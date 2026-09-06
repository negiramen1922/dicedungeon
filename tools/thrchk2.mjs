/* threshold() と thrWhy() が いつも同じ数を出すか。
   片方だけ直すと 画面に嘘の内訳が出るので、全部の組み合わせで突き合わせる。

     職4 × 種族4 × 欲望7 × 敵（区画ごと） × 奥ゆき × 技の補正
*/
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/index.html');await pg.waitForTimeout(800);
const out=await pg.evaluate(()=>{
  const bad=[]; let n=0;
  const jobs=Object.keys(JOB), races=Object.keys(RACE), origs=Object.keys(ORIG);
  for(const j of jobs)for(const r of races)for(const o of origs){
    sel.job=j;sel.race=r;sel.orig=o;sel.area="plain";
    newGame();closeModal();
    for(let i=1;i<8;i++){me.lv++;growUp();syncMates();}
    dive("plain");sel.enc=AREAS.plain.solo[0];RUN.elite=false;RUN.boss=false;
    prepareBattle();
    for(const f of foes)for(const thr of [0,1,2]){
      n++;
      const a=threshold(me,f,{thr});
      const w=thrWhy(f,{thr},me);
      if(a!==w.thr)bad.push(`${j}/${r}/${o} → ${f.name} thr+${thr}　threshold=${a} thrWhy=${w.thr}`);
    }
  }
  return {n,bad:bad.slice(0,10),all:bad.length};
});
console.log(`${out.n} 通りを突き合わせた　食い違い ${out.all} 件`);
if(out.bad.length)out.bad.forEach(x=>console.log("⚠ "+x));
console.log("ERR",[...new Set(errs)].slice(0,5));
await b.close();
process.exit(out.all?1:0);
