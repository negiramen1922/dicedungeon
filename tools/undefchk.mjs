/* 画面に出る文字の中に undefined が混じっていないか、
   敵ぜんぶ・手ぜんぶ・図鑑・素材 まで総なめして探す。
   1体ずつ目で見ても見つからないので、機械に探させる。 */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/'+(process.argv[2]||'index.html'));await pg.waitForTimeout(700);
const out=await pg.evaluate(()=>{
  const bad=[];
  const chk=(where,v)=>{ const t=String(v==null?"":v);
    if(t.includes("undefined")||t.includes("NaN"))bad.push(where+" ｜ "+t.replace(/<[^>]+>/g,"").slice(0,120)); };
  sel.job="knight";sel.race="hume";sel.orig="greed";
  newGame();closeModal();
  dive("plain");sel.enc=Object.keys(ENCS)[0];
  startBattle();
  const me0=me, tgt=foes[0];
  Object.entries(FOE).forEach(([k,F])=>{
    /* 盤に置いた形にして見る */
    const f={...F,key:k,name:F.n,isFoe:true,id:999,
      maxHP:F.HP,HP:F.HP,STR:F.STR,VIT:F.VIT,DEX:F.DEX,
      acts:F.acts,ail:[],buffs:[],dbuffs:[],block:0,ph:0};
    chk(`${F.n} 素材`, F.mat?(MATS[F.mat]?MATS[F.mat].n:"MATS に無い:"+F.mat):"");
    (F.acts||[]).forEach(a=>{
      try{ const p=telePreview(f,a);
        chk(`${F.n} / ${a.n} 見出し`,p&&p.txt);
        chk(`${F.n} / ${a.n} 説明`,p&&p.sub);
      }catch(e){ bad.push(`${F.n} / ${a.n} ｜ 例外 ${e.message}`); }
      if(a.k==="summon"&&!FOE[a.who])bad.push(`${F.n} / ${a.n} ｜ 呼ぶ相手が無い:${a.who}`);
    });
    try{ chk(`${F.n} 図鑑`, foeCodexLine?foeCodexLine(k):""); }catch(e){}
  });
  /* ===== 同じ敵が並ぶときの呼び名（α1.0.036） =====
     "ABC"[3] は undefined。4体並ぶ遭遇の4体目が
     「キラービー undefined」と名乗っていた。
     **遭遇ぜんぶを組み立てて 名前を見る。** */
  Object.entries(ENCS).forEach(([ek,E])=>{
    sel.enc=ek;RUN.elite=false;RUN.boss=false;
    let fs=[];
    try{ fs=makeFoes(); }catch(e){ bad.push(`遭遇 ${E.n} ｜ 例外 ${e.message}`);return; }
    fs.forEach(f=>chk(`遭遇 ${E.n}（${E.list.length}体）の名前`,f.name));
  });
  return bad;
});
/* ここまでは「書いてある文字」。次は **実際に手を出させて ログに出る文字** */
const out2=await pg.evaluate(async()=>{
  const bad=[],seen=[];
  window.wait=async()=>{};window.rollDice=async()=>0;window.ovHide=()=>{};
  window.fxOn=()=>{};window.setHPBar=()=>{};window.lungeUnit=async()=>{};
  window.ovMsg=()=>{};
  const L=window.log;
  window.log=(h)=>{ const t=String(h).replace(/<[^>]+>/g,"");
    seen.push(t); if(/undefined|NaN/.test(t))bad.push("ログ ｜ "+t.slice(0,120)); };
  const keys=Object.keys(FOE);
  for(const k of keys){
    try{
      sel.job="knight";sel.race="hume";sel.orig="greed";
      newGame();closeModal();dive("plain");
      sel.enc=Object.keys(ENCS)[0];RUN.elite=false;RUN.boss=false;
      startBattle();
      /* 盤の敵を その1体に差し替える */
      const F=FOE[k];
      const f=foes[0];
      Object.assign(f,{key:k,name:F.n,acts:F.acts,snd:F.snd,art:F.art,
        maxHP:99999,HP:99999,STR:F.STR,VIT:F.VIT,DEX:F.DEX,ail:[],ph:0});
      party.forEach(u=>{u.maxHP=99999;u.HP=99999;u.MP=99;u.ail=[];});
      for(const a of (F.acts||[])){
        over=false;busy=false;pending=null;
        f.tele=a;
        try{ await enemyAct(f); }
        catch(e){ bad.push(`${F.n} / ${a.n} ｜ 例外 ${e.message}`); }
      }
    }catch(e){ bad.push(`${FOE[k].n} ｜ 用意で例外 ${e.message}`); }
  }
  window.log=L;
  return {bad,n:seen.length};
});
const all=out.concat(out2.bad);
console.log(all.length?all.join("\n"):"✓ undefined / NaN は見つからなかった");
console.log(`ログ ${out2.n} 行を調べた`);
console.log(`\n調べた敵 ${Object.keys(await pg.evaluate(()=>FOE)).length} 体`);
console.log(errs.length?"⚠ "+[...new Set(errs)].slice(0,4).join("\n⚠ "):"例外なし");
await b.close();
process.exit(all.length?1:0);
