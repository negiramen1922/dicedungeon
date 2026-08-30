#!/usr/bin/env node
/*
  職業×種族16通りの強さを、実際の敵の数値を使って測る。

    node tools/balance.js            いまの数値で測る
    node tools/balance.js --try      調整案を並べて比べる

  測っているもの（すべて初期装備・装飾なし）
    火力   1ターンの見込みダメージ。敵のDEFの分布と、出目の期待値を通す
    耐久   敵の攻撃を受けて倒れるまでのターン数
    総合   火力 × 耐久（1戦でどれだけ働けるかの目安）

  装備で伸びる分は入れていない。職業差を見るための物差しであって、
  実際の強さそのものではない。
*/
const path = require("path");
const api = require(path.join(__dirname, "probe.js")).load();
const {JOB, RACE, GROW, WEP, FOE, ENCS, DUNGEONS} = api;

/* ---- 敵の側の代表値。実データから作る ---- */
function foeStats(actIdx) {
  /* その階層に出る敵を集め、DEF と 威力 の中央値を取る */
  const keys = new Set();
  Object.values(DUNGEONS).forEach(d => {
    const A = d.acts[actIdx]; if (!A) return;
    ["solo","easy","norm","hard"].forEach(s => (A[s]||[]).forEach(e =>
      (ENCS[e] ? ENCS[e].list : []).forEach(k => keys.add(k))));
  });
  const list = [...keys].map(k => FOE[k]).filter(Boolean);
  const med = a => a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)];
  const dm = actIdx === 0 ? 1.0 : actIdx === 1 ? 1.14 : 1.3;   /* 深さ倍率のおよそ */
  return {
    DEF: med(list.map(f => f.DEF)),
    STR: Math.round(med(list.map(f => f.STR)) * (1 + (dm-1)*0.6)),
    dice: med(list.flatMap(f => (f.acts||[]).filter(a=>a.k==="atk").map(a=>a.dice||1))),
    n: list.length,
  };
}

/* ---- 計算はゲーム本体と同じ形 ---- */
const perHit = (pow, def) => Math.max(Math.ceil(pow*0.25), pow - def);
/* 閾値thr以上が当たり、(出目-thr)*5%（上限25%）を上乗せ。期待値を返す */
function diceExp(thr) {
  let sum = 0;
  for (let v = 1; v <= 6; v++)
    if (v >= thr) sum += 1 + Math.min(.25, Math.max(0, (v-thr)*.05));
  return sum / 6;
}

function build(job, race, lv, grow) {
  const st = {};
  ["STR","DEX","INT","VIT","DEF"].forEach(k => st[k] = JOB[job].st[k] + (RACE[race].st[k]||0));
  const g = (grow && grow[job]) || GROW[job];
  Object.keys(g).forEach(k => st[k] += g[k] * (lv-1));
  const w = WEP[JOB[job].wep];
  return {st, w, maxHP: Math.round(st.VIT*4 + 35), block: 5 + Math.floor(st.VIT/7)};
}

/* 敵の 75% が前列。後衛に下がれる職業は、その分の被害が 4割減る（enemyAct の reach）。
   遠隔武器の職業は後衛に居座れるので、これを入れないと耐久を過小に見積もる。
   遠隔は逆に、敵の後列を狙うと命中閾値が +1 されるぶんを火力から引く。 */
const FRONT_RATIO = 0.75;
function rate(job, race, lv, foe, grow) {
  const b = build(job, race, lv, grow);
  const ranged = b.w.type === "ranged";
  const pow = Math.round(b.st[b.w.stat] * (b.w.mul||1));
  const thr = 4;
  const dmg = Math.round(perHit(pow, foe.DEF) * b.w.hands * diceExp(thr));
  let taken = Math.max(1, perHit(foe.STR, b.st.DEF) * foe.dice * diceExp(thr));
  if (ranged) taken *= (1 - FRONT_RATIO*0.4);      /* 後衛に下がっていられる */
  const turns = b.maxHP / taken;
  return {名:`${RACE[race].n} ${JOB[job].n}`, job, race, 列:ranged?"後":"前",
          HP:b.maxHP, DEF:b.st.DEF, 威力:pow, ダイス:b.w.hands,
          火力:dmg, 耐久:+turns.toFixed(1), 総合:Math.round(dmg*turns)};
}

function table(lv, actIdx, grow, label) {
  const foe = foeStats(actIdx);
  const rows = [];
  Object.keys(JOB).forEach(j => Object.keys(RACE).forEach(r => rows.push(rate(j,r,lv,foe,grow))));
  const avg = k => rows.reduce((a,b)=>a+b[k],0)/rows.length;
  const A = {火力:avg("火力"), 耐久:avg("耐久"), 総合:avg("総合")};
  rows.sort((x,y)=>y.総合-x.総合);
  console.log(`\n=== ${label}　Lv${lv}／${actIdx+1}階層の敵（DEF ${foe.DEF}・威力 ${foe.STR}・${foe.dice}発）===`);
  console.log("  組み合わせ".padEnd(19)+"  HP  DEF 威力 ダイス   火力      耐久        総合");
  rows.forEach(s => {
    const p = k => `${String(s[k]).padStart(5)}(${String(Math.round(s[k]/A[k]*100)).padStart(3)}%)`;
    console.log("  "+s.名.padEnd(16,"　").slice(0,16)+
      String(s.HP).padStart(5)+String(s.DEF).padStart(5)+String(s.威力).padStart(5)+
      String(s.ダイス).padStart(5)+"  "+p("火力")+" "+p("耐久")+" "+p("総合"));
  });
  const spread = k => {
    const v = rows.map(x=>x[k]);
    return (Math.max(...v)/Math.min(...v)).toFixed(2);
  };
  console.log(`  ばらつき（最大÷最小）　火力 ${spread("火力")}　耐久 ${spread("耐久")}　総合 ${spread("総合")}`);
  return {rows, A};
}

/* ---- 案を比べる ---- */
function summary(lv, act, grow, wep) {
  const save = {};
  if (wep) { Object.keys(wep).forEach(k => { save[k] = {...WEP[k]}; Object.assign(WEP[k], wep[k]); }); }
  const foe = foeStats(act);
  const rows = [];
  Object.keys(JOB).forEach(j => Object.keys(RACE).forEach(r => rows.push(rate(j,r,lv,foe,grow))));
  if (wep) Object.keys(save).forEach(k => Object.assign(WEP[k], save[k]));
  const avg = k => rows.reduce((a,b)=>a+b[k],0)/rows.length;
  const byJob = {};
  Object.keys(JOB).forEach(j => {
    const sub = rows.filter(x => x.job === j);
    byJob[JOB[j].n] = {
      火力: Math.round(sub.reduce((a,b)=>a+b.火力,0)/sub.length / avg("火力") * 100),
      耐久: Math.round(sub.reduce((a,b)=>a+b.耐久,0)/sub.length / avg("耐久") * 100),
      総合: Math.round(sub.reduce((a,b)=>a+b.総合,0)/sub.length / avg("総合") * 100),
    };
  });
  const v = rows.map(x=>x.総合);
  return {byJob, spread:+(Math.max(...v)/Math.min(...v)).toFixed(2),
          最弱:rows.reduce((a,b)=>a.総合<b.総合?a:b).名,
          最強:rows.reduce((a,b)=>a.総合>b.総合?a:b).名};
}
function compare(cases) {
  [[1,0],[10,1],[16,2]].forEach(([lv,act]) => {
    console.log(`\n=== Lv${lv} ／ ${act+1}階層の敵　（職業ごとの平均。100%が全体平均）===`);
    console.log("  案".padEnd(22)+"ナイト        アーチャー      スカウト      ウィザード     ばらつき");
    cases.forEach(c => {
      const r = summary(lv, act, c.grow, c.wep);
      const f = n => {const x=r.byJob[n];return `${String(x.総合).padStart(3)}%(火${String(x.火力).padStart(3)}耐${String(x.耐久).padStart(3)})`;};
      console.log("  "+c.n.padEnd(20,"　").slice(0,20)+" "+
        f("ナイト")+" "+f("アーチャー")+" "+f("スカウト")+" "+f("ウィザード")+
        `  ${String(r.spread).padStart(5)}倍`);
    });
  });
  console.log("\n  総合 = 火力 × 耐久（1戦でどれだけ働けるか）。100% が16通りの平均。");
}

if (require.main === module) {
  if (process.argv.includes("--try")) {
    const scoutWepDex = {};
    ["dagger","twindagger","fang","rapier","clawblade","shadowfang","assassin"]
      .forEach(k => { if (WEP[k]) scoutWepDex[k] = {stat:"DEX"}; });
    const scoutWepDexLow = {};
    Object.keys(scoutWepDex).forEach(k => scoutWepDexLow[k] = {stat:"DEX", mul:+(WEP[k].mul*0.78).toFixed(2)});
    const K4 = {...GROW, knight:{STR:4,VIT:4}};
    const K35= {...GROW, knight:{STR:5,VIT:4}};
    const mulUp = {};
    ["dagger","twindagger","fang","rapier","clawblade","shadowfang","assassin"]
      .forEach(k => { if (WEP[k]) mulUp[k] = {mul:+(WEP[k].mul*1.15).toFixed(2)}; });
    const S43 = {...GROW, scout:{STR:4,DEX:3,VIT:2}};
    compare([
      {n:"手つかず", grow:{...GROW, knight:{STR:4,VIT:5}}},
      {n:"いま(騎VIT4のみ)", grow:null},
      {n:"斥候 STR4DEX3VIT2", grow:S43},
      {n:"斥候の武器 倍率1.15倍", grow:null, wep:mulUp},
      {n:"両方", grow:S43, wep:mulUp},
    ]);


  } else {
    [[1,0],[10,1],[16,2]].forEach(([lv,act]) => table(lv, act, null, "いまの数値"));
  }
}
module.exports = {table, rate, build, foeStats};
