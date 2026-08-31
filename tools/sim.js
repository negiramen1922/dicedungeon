#!/usr/bin/env node
/*
  1周を歩いて、階層ごとの手応えを測る。

    node tools/sim.js            いまの数値で測る
    node tools/sim.js --json     機械向けに出す

  tools/balance.js は「職業×種族の差」を見る物差しで、式を写して持っている。
  写した式は本体と離れていき、これまで2度まちがえた（前列の被害減・回避）。
  こちらは **ゲーム本体の関数をそのまま呼ぶ**。ブラウザで index.html を開き、
  makeMe / genAct / makeFoes / powOf / threshold / perHit / hitDmg を使う。

  測っているもの
    倒すまで   遭遇まるごとの HP ÷ こちらの1ターンの見込みダメージ
    倒れるまで こちらの最大HP ÷ 敵の集団の1ラウンドの見込みダメージ
    余裕       倒れるまで ÷ 倒すまで（大きいほど楽。1 なら相打ち）

  Lv は「その階層に着くまでに実際どれだけ経験が入るか」を、
  本物の genAct で道を引いて数えて出す。
*/
const path = require("path");
const {chromium} = require("/opt/node22/lib/node_modules/playwright");
const URL = process.env.SIM_URL || "http://127.0.0.1:8765/index.html";
const ROUTE = ["plain","cave","hall","city"];
const TRIES = 200;

const PAGE = ({route, tries, mode, plans}) => {
/* ===== ここから下はページの中で走る ===== */
const R = route, N = tries;
const rnd = a => a[Math.floor(Math.random()*a.length)];

/* 深さの重みを差し替える。案を比べるために本体の関数を上書きする。
     step … depthAt の刻み（いま 0.34）
     boss … ボスの重み（いま 1.3。r>=10 の通常部屋と同じ値）
     strf … 深さぶんの攻撃力の伸び（いま 0.6。HP は 1.0 で伸びる） */
const BASE={step:0.34, boss:1.3, strf:0.6};
function setKnobs(k){
  window.depthAt=(tier)=>1+((tier||1)-1)*k.step;
  window.depthMul=()=>{
    const r=(RUN&&RUN.cur)?RUN.cur.r:0;
    const d=depthAt(areaTier());
    if(RUN&&RUN.boss)return k.boss*d;
    return (r<2?0.9:(r<5?1:(r<10?1.14:1.3)))*d;
  };
  window.makeFoes=()=>{
    const dm=depthMul();
    return ENCS[sel.enc].list.map((key,i)=>{
      const f=FOE[key];
      return {...f,id:i,key,name:f.n,
        maxHP:Math.round(f.HP*dm),HP:Math.round(f.HP*dm),
        STR:Math.round(f.STR*(1+(dm-1)*k.strf)),
        rank:(f.flex?"front":f.rank),turn:0,
        block:0,buffs:[],ail:[],stun:false,isFoe:true,tele:null,lastAid:null,sumCd:0,sumUsed:false};
    });
  };
}

/* 1周ぶん道を歩いて、区画ごとに「入ったときの Lv」を出す */
function walk(job,race,orig){
  sel.job=job;sel.race=race;sel.orig=orig;sel.luk=50;
  me=makeMe(); owned=[];
  const out=[];
  R.forEach((area,ai)=>{
    sel.area=area;
    RUN={id:"S",act:ai,area,seen:R.slice(0,ai+1),cur:null,curKey:null,path:[],
         over:false,cleared:false,elite:false,boss:false};
    RUN.M=genAct(AREAS[area]);
    out.push({area,tier:AREAS[area].tier,lvIn:me.lv});
    /* 道を1本引く */
    let k=rnd(RUN.M.rows[0]), guard=0;
    const seen=[k];
    while((RUN.M.kids[k]||[]).length && guard++<60){ k=rnd(RUN.M.kids[k]); seen.push(k); }
    /* 歩きながら経験を入れる */
    seen.forEach(key=>{
      const nd=RUN.M.node[key];
      let kind=null;
      if(nd.t==="battle")kind="battle";
      else if(nd.t==="elite")kind="elite";
      else if(nd.t==="boss")kind="boss";
      else if(nd.t==="event"&&nd.ev==="ambush")kind="battle";
      if(!kind)return;
      me.exp+=expFor(kind);
      while(me.exp>=expCap()&&me.lv<25){ me.exp-=expCap(); me.lv++;
        const g=GROW[sel.job]; for(const q in g)me.grow[q]+=g[q]; recalcMe(me,false); }
    });
    out[out.length-1].lvOut=me.lv;
  });
  return out;
}

/* 遭遇ひとつぶんの手応え。me と foes は呼ぶ前に組んでおく */
function bout(){
  const HP=foes.reduce((a,f)=>a+f.maxHP,0);
  /* こちらの1ターン。前列の1体を狙う想定 */
  const t=foes[0];
  const thr=threshold(me,t,{});
  const per=perHit(powOf(me,{}),defOf(t));
  let e=0; for(let v=1;v<=6;v++) if(v>=thr) e+=hitDmg(per,v,thr);
  const my=e/6*me.wep.hands;
  /* 敵の集団の1ラウンド。攻撃の手を重みで平均する */
  let take=0;
  foes.forEach(f=>{
    const ALL=(f.acts||[]);
    if(!ALL.length)return;
    /* chooseTele は 攻撃だけでなく 防御・溜め・呼び寄せ も重みで選ぶ。
       攻撃だけで割ると「毎ターン殴ってくる」ことになり、被害を多く見積もる。
       重みは **全部の手** の合計で割る。 */
    const wsum=ALL.reduce((a,x)=>a+(x.w||1),0);
    ALL.filter(a=>a.k==="atk").forEach(a=>{
      const p=perHit(powOf(f,{pow:a.pow||0}),defOf(me));
      const th=threshold(f,me,{});
      let s=0; for(let v=1;v<=6;v++) if(v>=th) s+=hitDmg(p,v,th);
      take+=(a.w||1)/wsum * s/6 * (a.dice||1);
    });
  });
  return {HP,my:+my.toFixed(1),take:+take.toFixed(1),thr,
          倒すまで:+(HP/Math.max(.1,my)).toFixed(1),
          倒れるまで:+(me.maxHP/Math.max(.1,take)).toFixed(1)};
}

/* 装備を積む。tier に見合う一番強い武器・防具・装飾4つ */
function equip(tier){
  const maxT=Math.min(3,tier);
  const pick=(list)=>list.filter(g=>(g.tier||1)<=maxT)
    .sort((a,b)=>(b.tier||1)-(a.tier||1))[0];
  const w=pick(GEAR.wep[sel.job]||[]);
  if(w){ me.eq.wep={...w,slot:"wep"};
    me.wep={...WEP[w.key],n:w.n,tier:w.tier,key:w.key}; }
  const ar=pick(GEAR.armor); if(ar)me.eq.armor={...ar,slot:"armor"};
  const ac=GEAR.acc.filter(g=>(g.tier||1)<=maxT)
    .sort((a,b)=>(b.tier||1)-(a.tier||1)).slice(0,ACCMAX);
  me.eq.acc=ac.map(g=>({...g,slot:"acc"}));
  recalcMe(me,false);
}

function measure(job,race,orig,gear,knobs){
  setKnobs(knobs||BASE);
  const w=walk(job,race,orig);
  const rows=[];
  R.forEach((area,ai)=>{
    const A=AREAS[area];
    sel.area=area;
    /* その区画の入口の Lv まで育てた姿を作り直す */
    me=makeMe(); owned=[];
    const lv=w[ai].lvOut;                    /* ボスに挑むころの Lv */
    for(let i=1;i<lv;i++){ const g=GROW[sel.job]; for(const q in g)me.grow[q]+=g[q]; }
    me.lv=lv; recalcMe(me,true);
    if(gear)equip(A.tier);
    RUN={id:"S",act:ai,area,seen:R.slice(0,ai+1),cur:{r:15},curKey:null,path:[],
         over:false,cleared:false,elite:false,boss:false};
    const one=(pool,kind)=>{
      const acc={HP:0,my:0,take:0,倒すまで:0,倒れるまで:0,n:0};
      for(let i=0;i<N;i++){
        sel.enc=rnd(pool);
        RUN.elite=(kind==="elite"); RUN.boss=(kind==="boss");
        RUN.cur={r:kind==="boss"?19:15};
        foes=makeFoes();
        if(RUN.elite)foes.forEach(f=>{
          f.maxHP=Math.round(f.maxHP*1.4);f.HP=f.maxHP;f.STR=Math.round(f.STR*1.15);});
        const b=bout();
        ["HP","my","take","倒すまで","倒れるまで"].forEach(k=>acc[k]+=b[k]);
        acc.n++;
      }
      const o={};["HP","my","take","倒すまで","倒れるまで"].forEach(k=>o[k]=+(acc[k]/acc.n).toFixed(1));
      o.余裕=+(o.倒れるまで/o.倒すまで).toFixed(2);
      return o;
    };
    rows.push({区画:A.n.replace(/ /g,""),tier:A.tier,Lv:lv,自HP:me.maxHP,
      威力:powOf(me,{}),ダイス:me.wep.hands,DEF:defOf(me),
      通常:one(A.norm.concat(A.hard),"battle"),
      精鋭:one(A.elite,"elite"),
      ボス:one([A.boss],"boss")});
  });
  return {歩き:w, 表:rows};
}

const COMBOS=[["knight","hume","pride"],["archer","beast","greed"],
              ["scout","elf","envy"],["mage","dwarf","wrath"]];
if(mode==="try"){
  /* 案ごとに、4人ぶんの平均の「余裕」を階層×種類で出す */
  const out={};
  Object.keys(plans).forEach(name=>{
    const k={...BASE,...plans[name]};
    const acc={};
    COMBOS.forEach(c=>{
      const m=measure(c[0],c[1],c[2],true,k);
      m.表.forEach(r=>{
        ["通常","精鋭","ボス"].forEach(t=>{
          const key=r.tier+"/"+t;
          acc[key]=acc[key]||{余裕:0,敵HP:0,被:0,n:0};
          acc[key].余裕+=r[t].余裕; acc[key].敵HP+=r[t].HP;
          acc[key].被+=r[t].take; acc[key].n++;
        });
      });
    });
    const o={};
    Object.keys(acc).forEach(key=>{const a=acc[key];
      o[key]={余裕:+(a.余裕/a.n).toFixed(2),敵HP:Math.round(a.敵HP/a.n),被:+(a.被/a.n).toFixed(1)};});
    out[name]={knobs:k,表:o};
  });
  return out;
}
const res={};
[false,true].forEach(gear=>{
  res[gear?"装備あり":"初期装備"]=COMBOS.map(c=>({
    誰:`${RACE[c[1]].n}の${JOB[c[0]].n}`, ...measure(c[0],c[1],c[2],gear,BASE)}));
});
return res;
/* ===== ページの中はここまで ===== */
};

(async () => {
  const b = await chromium.launch({executablePath:"/opt/pw-browsers/chromium"});
  const p = await (await b.newContext()).newPage();
  const errs=[]; p.on("pageerror",e=>errs.push(""+e));
  await p.goto(URL); await p.waitForTimeout(700);
  await p.evaluate(()=>{try{localStorage.clear()}catch(e){}});
  await p.reload(); await p.waitForTimeout(900);
  const TRY = process.argv.includes("--try");
  const PLANS = {
    "いま"            : {},
    "A ボスを重く"     : {boss:1.7},
    "B 攻撃力を伸ばす" : {strf:0.85},
    "C 階層の刻みを上げ": {step:0.44},
    "A+B"             : {boss:1.7, strf:0.85},
    "A+B+C"           : {boss:1.7, strf:0.85, step:0.44},
  };
  const out = await p.evaluate(PAGE,
    {route:ROUTE, tries:TRY?60:TRIES, mode:TRY?"try":"now", plans:PLANS});
  if(errs.length){ console.error("ページの中で落ちた:",errs); process.exit(1); }
  await b.close();

  if(process.argv.includes("--json")){ console.log(JSON.stringify(out,null,1)); return; }

  if(TRY){
    const TIERS=[1,2,3,4], KINDS=["通常","精鋭","ボス"];
    console.log("\n余裕（倒れるまで ÷ 倒すまで）。4人の平均。小さいほど手強い。");
    console.log("装備あり・スキルとパッシブは数えていない\n");
    KINDS.forEach(kind=>{
      console.log(`── ${kind} ──`);
      console.log("  案".padEnd(20)+TIERS.map(t=>`  第${t}階層`).join("")+"      敵HP(4階)  被/T(4階)");
      Object.keys(out).forEach(name=>{
        const T=out[name].表;
        const row=TIERS.map(t=>String(T[t+"/"+kind].余裕).padStart(8)).join("");
        const last=T["4/"+kind];
        console.log("  "+name.padEnd(18,"　").slice(0,18)+row+
          String(last.敵HP).padStart(11)+String(last.被).padStart(11));
      });
      console.log("");
    });
    Object.keys(out).forEach(n=>console.log(`  ${n} … ${JSON.stringify(out[n].knobs)}`));
    return;
  }

  Object.keys(out).forEach(mode=>{
    console.log(`\n████ ${mode} ████`);
    out[mode].forEach(who=>{
      console.log(`\n── ${who.誰} ──`);
      console.log("  区画            階 Lv  自HP 威力 ダ DEF │ 種類  敵HP  与/T 被/T 倒すまで 倒れるまで 余裕");
      who.表.forEach(r=>{
        const head=`  ${r.区画.padEnd(12,"　").slice(0,12)}${String(r.tier).padStart(2)}`+
          `${String(r.Lv).padStart(3)}${String(r.自HP).padStart(6)}`+
          `${String(r.威力).padStart(5)}${String(r.ダイス).padStart(3)}${String(r.DEF).padStart(4)}`;
        ["通常","精鋭","ボス"].forEach((k,i)=>{
          const c=r[k];
          console.log((i===0?head:" ".repeat(head.length))+
            ` │ ${k.padEnd(4,"　").slice(0,4)}`+
            String(c.HP).padStart(6)+String(c.my).padStart(6)+String(c.take).padStart(5)+
            String(c.倒すまで).padStart(9)+String(c.倒れるまで).padStart(11)+
            String(c.余裕).padStart(6));
        });
      });
    });
  });
  console.log(`\n余裕 = 倒れるまで ÷ 倒すまで。1 なら相打ち、大きいほど楽。`);
  console.log(`Lv はその区画のボスに挑むころの値（本物の genAct で道を引いて経験を数えた）。`);
})();
