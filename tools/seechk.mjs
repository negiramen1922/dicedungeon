/* 遊びはじめの数戦で 遊ぶ人に何が見えるか。
   仕組みを入れただけでは 画面に出ているとは限らない。
   α1.0.019 で「必要 1 しか出ていない」と言われて足した。

     node tools/seechk.mjs [職] [版.html]
*/
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const JOB=(process.argv[2]&&!process.argv[2].endsWith('.html'))?process.argv[2]:'knight';
const FILE=(process.argv.find(a=>a.endsWith('.html'))||'index.html');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:430,height:900}});
await pg.goto('http://localhost:8765/'+FILE);
await pg.evaluate(()=>{try{localStorage.clear()}catch(e){}});
await pg.reload();await pg.waitForTimeout(900);
await pg.evaluate(async(JOBNAME)=>{
  sel.job=JOBNAME;sel.race="hume";sel.orig="wrath";sel.area="plain";
  newGame();closeModal();slot=0;
  dive("plain");sel.enc=AREAS.plain.solo[0];RUN.elite=false;RUN.boss=false;
  startBattle();await engage();
},JOB);
await pg.waitForTimeout(600);
console.log("=== はじめての戦い（Lv1・技なし）で 遊ぶ人に見えるもの ===");
console.log("【コマンド】");
console.log(await pg.locator('#acts').innerText());
console.log("【敵の予告】");
console.log(await pg.locator('.cell .cact').first().getAttribute('title'));
await pg.evaluate(()=>{const d=$("#detail");if(d)d.classList.remove("hide");});
await pg.locator('#detBtn').click().catch(()=>{});
await pg.waitForTimeout(300);
console.log((await pg.locator('body').innerText()).split("\n").filter(x=>/必要|d6/.test(x)).slice(0,6).join("\n"));
/* 1発殴る */
await pg.locator('#acts .act').first().click();await pg.waitForTimeout(300);
if(await pg.locator('.cell.sel').count())await pg.locator('.cell.sel').first().click();
await pg.waitForTimeout(1600);
await pg.waitForTimeout(3500);
console.log("【ログ】");
console.log((await pg.locator('#log').innerText()).split("\n").slice(0,8).join("\n"));
await b.close();process.exit(0);
