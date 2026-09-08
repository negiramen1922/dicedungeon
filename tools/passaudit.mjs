/* ===== パッシブの棚卸し =====
   特性 67 件について 3つの見方で調べる。

     ① 走らせて数える … `passOn` を包んで、**戦いを1周まわしたときに
        どの効果キーが訊かれたか**を記録する。ここに出てこないキーは
        どうやっても働かない。
     ② 書いてある場所を探す … `passOn("k"` と `ef.k==="k"` を数える。
     ③ 持たせて数字が動くか … 本物の式（defOf/dexOf/powOf/skillDice）で
        前後を比べる。条件つきは PCOND を素通しにしてから測る。

   〔なぜ ① が要るか（α1.0.053）〕
   はじめ ② だけで見て「知識・鍛錬は配線が無い」と読んだが、**間違いだった。**
   powOf は `passOn("stat"+u.wep.stat, u)` と **キーを組み立てて**訊いている。
   文字を探すやり方では こういう読み方が丸ごと抜ける。
   **走らせて数えるのが本当。**

   使い方: node tools/passaudit.mjs                                        */
import fs from 'node:fs';
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
import {EXPECT_SRC} from './expect.mjs';

/* ---- ② 書いてある場所。定義のかたまりを外して数える ---- */
const src=fs.readFileSync('index.html','utf8');
const i0=src.indexOf(" pass:{"), i1=src.indexOf("const CAT=");
const rest=src.slice(0,i0)+src.slice(i1);

const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/index.html');await pg.waitForTimeout(800);
await pg.evaluate(EXPECT_SRC);

const list=await pg.evaluate(()=>{
  const o=[];
  for(const pool in REW.pass)REW.pass[pool].forEach(p=>
    o.push({pool,id:p.id,n:p.n,k:p.ef.k,v:p.ef.v,w:p.ef.w,d:p.d}));
  return o;
});

/* ---- ① 走らせて数える ---- */
const asked=await pg.evaluate(async()=>{
  const seen={};
  const real=window.passOn;
  window.passOn=function(k,u){ seen[k]=(seen[k]|0)+1; return real.apply(this,arguments); };
  /* 演出はぜんぶ潰す。数だけ要る */
  window.wait=async()=>{};window.ovMsg=()=>{};window.rollDice=async()=>0;
  window.addDice=async(a)=>a;window.ovHide=()=>{};window.lungeUnit=async()=>{};
  window.fxOn=()=>{};window.popOn=()=>{};window.popSelf=()=>{};window.setHPBar=()=>{};
  window.lukOv=async()=>{};window.SFX=new Proxy({},{get:()=>()=>{}});

  /* 得物の型ちがいを両方通す（STR で殴る者と INT で撃つ者） */
  for(const [job,race] of [["knight","dwarf"],["mage","elf"],["scout","beast"],["archer","hume"]]){
    sel.job=job;sel.race=race;sel.orig="greed";sel.area="plain";
    newGame();closeModal();
    for(let i=1;i<40;i++){me.lv++;growUp();syncMates();}
    setParty([me,makeMate("mage","hume",me.lv),makeMate("knight","hume",me.lv)]);
    /* ぜんぶの特性を持たせる。条件も素通しにして、どの道も通す */
    const all=[];for(const p in REW.pass)all.push(...REW.pass[p]);
    party.forEach(u=>{u.pass=all.slice();recalcMe(u,true);});
    dive("plain");sel.enc=(AREAS.plain.norm||[])[0];
    foes=makeFoes();round=1;over=false;busy=false;cur=me;
    /* 見る側の式をひととおり */
    party.forEach(u=>{powOf(u,{});defOf(u);dexOf(u);healDice(u);
      skillDice(wepSkill(u),u);threshold(u,foeLine()[0],{});});
    /* 殴る・守る・殴られる・倒す を通す */
    for(let r=1;r<=3&&alive().length;r++){
      round=r;
      try{ await resolvePlayer({kind:"atk"},foeLine()[0]); }catch(e){}
      try{ await resolvePlayer({kind:"guard"}); }catch(e){}
      for(const f of alive().slice()){ try{ await enemyAct(f); }catch(e){} }
      /* 倒したときの道（捕食・悪食など）も通す */
      const t=foeLine()[0]; if(t){t.HP=1; try{ await resolvePlayer({kind:"atk"},t); }catch(e){} }
    }
    /* 戦いの外の道（金貨・行商・鍛冶・戦利品） */
    try{ addGold(100); }catch(e){}
    try{ shopPrice&&shopPrice({v:100}); }catch(e){}
    try{ pickList(["gear"]); }catch(e){}
  }
  window.passOn=real;
  return seen;
});

/* ---- ③ 持たせて数字が動くか ---- */
const eff=await pg.evaluate(()=>{
  for(const k in PCOND)PCOND[k]=()=>true;
  const mk=(job,race)=>{
    sel.job=job;sel.race=race;sel.orig="greed";
    newGame();closeModal();dive("plain");
    for(let i=1;i<40;i++){me.lv++;growUp();}
    const u=me;setParty([u]);recalcMe(u,false);
    sel.enc=(AREAS.plain.norm||[])[0];foes=makeFoes();
    return u;
  };
  const snap=u=>{
    recalcMe(u,false);
    return {最大HP:u.maxHP, 最大MP:u.maxMP,
      守り:defOf(u), 速さ:dexOf(u), 威力:powOf(u,{}),
      攻撃ダイス:Math.max(1,skillDice(wepSkill(u),u)+passOn("dice",u)),
      索敵:Math.max(1,skillDice("search",u)+passOn("scout",u)),
      閾値:4-passOn("thr",u)};
  };
  const out={};
  /* STR で殴る者と INT で撃つ者、両方で見る。
     知識（statINT）は 杖を持つ者でしか動かない */
  for(const [job,race] of [["knight","dwarf"],["mage","elf"]]){
    const base=(()=>{const u=mk(job,race);u.pass=[];return snap(u);})();
    for(const pool in REW.pass)REW.pass[pool].forEach(p=>{
      const u=mk(job,race);u.pass=[p];
      const s=snap(u);const d=[];
      for(const k in base)if(s[k]!==base[k])d.push(k+" "+base[k]+"→"+s[k]);
      if(d.length&&!out[p.id])out[p.id]=(job==="mage"?"杖：":"")+d.join("　");
    });
  }
  return out;
});
await b.close();

const bad=[],ev=[],ok=[];
for(const p of list){
  const runs=(asked[p.k]|0);
  const reads=(rest.match(new RegExp('passOn\\("'+p.k+'"|ef\\.k==="'+p.k+'"','g'))||[]).length;
  const moved=eff[p.id]||"";
  if(!runs&&!reads&&!moved) bad.push(p);
  else if(!moved) ev.push([p,runs,reads]);
  else ok.push([p,moved,runs]);
}
const nm=p=>(p.pool+"/"+p.n.replace(/ /g,"")).padEnd(15,"　").slice(0,13);
console.log(`特性 ${list.length} 件　（① 走らせて訊かれたキー ${Object.keys(asked).length} 種）`);
console.log(`\n✗ どうやっても働かない（訊かれもせず 書かれもせず 動きもしない） ${bad.length} 件`);
bad.forEach(p=>console.log("  "+nm(p)+" ef.k="+(p.k+"").padEnd(12)+p.d));
console.log(`\n○ 配線はある。止まったままでは見えない（戦いの出来事で働く型） ${ev.length} 件`);
ev.forEach(([p,r,w])=>console.log("  "+nm(p)+" ef.k="+(p.k+"").padEnd(12)+"訊かれた "+String(r).padStart(4)+"　書かれた "+w));
console.log(`\n✓ 持たせると 数字が動く ${ok.length} 件`);
ok.forEach(([p,d])=>console.log("  "+nm(p)+" "+d));
if(errs.length)console.log("\nERR",errs.slice(0,3));
if(bad.length)process.exitCode=0;   /* 見つけるための道具。落とさない */
