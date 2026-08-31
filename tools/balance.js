#!/usr/bin/env node
/*
  職業×種族16通りの強さを、実際の敵の数値を使って測る。

    node tools/balance.js            いまの数値で測る
    node tools/balance.js --try      調整案を並べて比べる

  測っているもの（すべて初期装備・装飾なし）
    火力   1ターンの見込みダメージ。敵のDEFの分布と、出目の期待値を通す
           索敵で勝ったぶんの初撃ボーナスも、倒すまでのターン数で薄めて足している
    耐久   敵の攻撃を受けて倒れるまでのターン数
    総合   火力 × 耐久（1戦でどれだけ働けるかの目安）

  装備で伸びる分は入れていない。職業差を見るための物差しであって、
  実際の強さそのものではない。
*/
const path = require("path");
const api = require(path.join(__dirname, "probe.js")).load();
const {JOB, RACE, GROW, WEP, FOE, ENCS, AREAS, SKJOB, SKRACE} = api;

/* ---- 敵の側の代表値。実データから作る ---- */
function foeStats(actIdx) {
  /* その階層に出る敵を集め、DEF と 威力 の中央値を取る */
  /* actIdx は 0 起点。担当階層（tier）は 1 起点なので +1 して引く */
  const keys = new Set();
  Object.values(AREAS).forEach(A => {
    if ((A.tier||1) !== actIdx+1) return;
    ["solo","easy","norm","hard"].forEach(s => (A[s]||[]).forEach(e =>
      (ENCS[e] ? ENCS[e].list : []).forEach(k => keys.add(k))));
  });
  const list = [...keys].map(k => FOE[k]).filter(Boolean);
  const med = a => a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)];
  const dm = (1 + actIdx*0.34) * (actIdx === 0 ? 1.0 : actIdx === 1 ? 1.14 : 1.3);   /* 深さ倍率のおよそ */
  return {
    DEF: med(list.map(f => f.DEF)),
    STR: Math.round(med(list.map(f => f.STR)) * (1 + (dm-1)*0.6)),
    HP:  Math.round(med(list.map(f => f.HP)) * dm),
    /* 戦闘の長さは遭遇まるごとで見る。索敵ボーナスは1戦に1回しか乗らないので、
       敵1体ぶんで割ると効き目を大きく見積もってしまう */
    encHP: (() => {
      const tot = [];
      Object.values(AREAS).forEach(A => {
        if ((A.tier||1) !== actIdx+1) return;
        ["solo","easy","norm","hard"].forEach(sl => (A[sl]||[]).forEach(e => {
          const L = ENCS[e] ? ENCS[e].list : [];
          if (L.length) tot.push(L.reduce((a,k)=>a+(FOE[k]?FOE[k].HP:0),0));
        }));
      });
      return Math.round(med(tot) * dm);
    })(),
    dice: med(list.flatMap(f => (f.acts||[]).filter(a=>a.k==="atk").map(a=>a.dice||1))),
    DEX: med(list.map(f => f.DEX)),
    /* 索敵の相手側。doScout と同じ式 */
    scout: Math.round(med(list.map(f => f.scout||0))) + Math.floor(med(list.map(f=>f.DEX))/13),
    n: list.length,
  };
}

/* ---- 計算はゲーム本体と同じ形 ---- */
let FLOOR = 0.25;           /* perHit の下限。手数の多い武器ほどここに救われる */
let EVDIV = 15;             /* 回避 ev = floor(DEX差 / EVDIV)。threshold() と同じ */
let EVCAP = 99;             /* ev の上限。いまは無い（閾値6で頭打ちになるだけ） */
let FOEDEX = 1;             /* 敵の DEX を深さで伸ばす倍率（いまは伸びない） */
const perHit = (pow, def) => Math.max(Math.ceil(pow*FLOOR), pow - def);
/* 閾値thr以上が当たり、(出目-thr)*5%（上限25%）を上乗せ。期待値を返す */
function diceExp(thr) {
  let sum = 0;
  for (let v = 1; v <= 6; v++)
    if (v >= thr) sum += 1 + Math.min(.25, Math.max(0, (v-thr)*.05));
  return sum / 6;
}

/* 索敵の勝ち幅の期待値。互いに 4以上（1/2）が当たりのダイスを振り、
   差を 0〜3 に丸めたものが最初の攻撃に乗る（doScout）。
   E[clamp(差)] を二項分布の畳み込みで正しく出す。 */
function binom(n) {                       /* p=1/2 の分布 */
  const out = [1];
  for (let i = 0; i < n; i++) {
    const nx = new Array(out.length+1).fill(0);
    for (let k = 0; k < out.length; k++) { nx[k] += out[k]/2; nx[k+1] += out[k]/2; }
    out.length = 0; out.push(...nx);
  }
  return out;
}
function scoutBonusExp(mD, fD) {
  const A = binom(Math.max(0,mD)), B = binom(Math.max(0,fD));
  let e = 0;
  for (let a = 0; a < A.length; a++)
    for (let b = 0; b < B.length; b++)
      e += A[a]*B[b] * Math.max(0, Math.min(3, a-b));
  return e;
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
  /* 命中閾値は threshold() と同じ形にする。
     ev = floor((狙われる側のDEX − 狙う側のDEX)/15) を 4 に足し、2〜6 で丸める。
     これを入れないと、DEX の高い組み合わせの耐久を大きく取りこぼす
     （敵が 4以上ではなく 6 でしか当たらなくなるため）。 */
  const fdex = Math.round(foe.DEX * FOEDEX);
  /* 自分が狙うとき … 技能（射撃/格闘）と、相手の素早さ
     敵が狙うとき   … こちらの DEX（回避）
     threshold() と同じ形にしてある */
  const skName = ranged ? "shoot" : "fight";
  const skVal  = (SKJOB[job][skName]||0)+(SKRACE[race][skName]||0);
  const thr    = Math.max(2, Math.min(6,
    4 - Math.round((skVal-40)/25) + Math.floor(fdex/15)));
  const thrFoe = Math.max(2, Math.min(6,
    4 + Math.min(EVCAP, Math.max(0, Math.floor((b.st.DEX - fdex)/EVDIV)))));
  /* 索敵に勝つと、その戦闘の最初の攻撃だけダイスが増える（最大 +3）。
     DEX が索敵ダイスに乗る（floor(DEX/13)）ので、DEX の高い職業ほど得をする。
     1戦のうち1回ぶんなので、倒すのにかかるターン数で薄めて数える。 */
  const myScout = JOB[job].scout + RACE[race].scout + 1 + Math.floor(b.st.DEX/13);
  const bonus = scoutBonusExp(myScout, foe.scout);
  const perTurn = perHit(pow, foe.DEF) * diceExp(thr);
  const turnsToKill = Math.max(1, foe.encHP / (perTurn * b.w.hands));
  const dmg = Math.round(perTurn * (b.w.hands + bonus/turnsToKill));
  let taken = Math.max(1, perHit(foe.STR, b.st.DEF) * foe.dice * diceExp(thrFoe));
  if (ranged) taken *= (1 - FRONT_RATIO*0.4);      /* 後衛に下がっていられる */
  const turns = b.maxHP / taken;
  return {名:`${RACE[race].n} ${JOB[job].n}`, job, race, 列:ranged?"後":"前",
          HP:b.maxHP, DEF:b.st.DEF, 威力:pow, ダイス:b.w.hands,
          攻:thr, 防:thrFoe, 索敵:+bonus.toFixed(1),
          火力:dmg, 耐久:+turns.toFixed(1), 総合:Math.round(dmg*turns)};
}

function table(lv, actIdx, grow, label) {
  const foe = foeStats(actIdx);
  const rows = [];
  Object.keys(JOB).forEach(j => Object.keys(RACE).forEach(r => rows.push(rate(j,r,lv,foe,grow))));
  const avg = k => rows.reduce((a,b)=>a+b[k],0)/rows.length;
  const A = {火力:avg("火力"), 耐久:avg("耐久"), 総合:avg("総合")};
  rows.sort((x,y)=>y.総合-x.総合);
  console.log(`\n=== ${label}　Lv${lv}／${actIdx+1}階層の敵（DEF ${foe.DEF}・威力 ${foe.STR}・${foe.dice}発・遭遇まるごとで HP ${foe.encHP}・索敵 ${foe.scout}D）===`);
  console.log("  組み合わせ".padEnd(19)+"  HP  DEF 威力 ダイス  攻  防 索敵   火力      耐久        総合");
  rows.forEach(s => {
    const p = k => `${String(s[k]).padStart(5)}(${String(Math.round(s[k]/A[k]*100)).padStart(3)}%)`;
    console.log("  "+s.名.padEnd(16,"　").slice(0,16)+
      String(s.HP).padStart(5)+String(s.DEF).padStart(5)+String(s.威力).padStart(5)+
      String(s.ダイス).padStart(5)+String(s.攻).padStart(4)+String(s.防).padStart(4)+
      String(s.索敵).padStart(5)+"  "+p("火力")+" "+p("耐久")+" "+p("総合"));
  });
  const spread = k => {
    const v = rows.map(x=>x[k]);
    return (Math.max(...v)/Math.min(...v)).toFixed(2);
  };
  console.log(`  ばらつき（最大÷最小）　火力 ${spread("火力")}　耐久 ${spread("耐久")}　総合 ${spread("総合")}`);
  return {rows, A};
}

/* ---- 案を比べる ---- */
function summary(lv, act, grow, wep, floor, jobSt, raceSt, ev) {
  const save = {}, saveJob = {}, saveRace = {};
  const keepEv = [EVDIV, EVCAP, FOEDEX];
  if (ev) { if (ev.div) EVDIV = ev.div; if (ev.cap!=null) EVCAP = ev.cap; if (ev.foedex) FOEDEX = ev.foedex; }
  if (wep) { Object.keys(wep).forEach(k => { save[k] = {...WEP[k]}; Object.assign(WEP[k], wep[k]); }); }
  if (jobSt) { Object.keys(jobSt).forEach(k => { saveJob[k] = {...JOB[k].st}; Object.assign(JOB[k].st, jobSt[k]); }); }
  if (raceSt){ Object.keys(raceSt).forEach(k => { saveRace[k] = {...RACE[k].st}; Object.assign(RACE[k].st, raceSt[k]); }); }
  const keepFloor = FLOOR; if (floor) FLOOR = floor;
  const foe = foeStats(act);
  const rows = [];
  Object.keys(JOB).forEach(j => Object.keys(RACE).forEach(r => rows.push(rate(j,r,lv,foe,grow))));
  FLOOR = keepFloor;
  [EVDIV, EVCAP, FOEDEX] = keepEv;
  if (wep) Object.keys(save).forEach(k => Object.assign(WEP[k], save[k]));
  if (jobSt) Object.keys(saveJob).forEach(k => Object.assign(JOB[k].st, saveJob[k]));
  if (raceSt)Object.keys(saveRace).forEach(k => Object.assign(RACE[k].st, saveRace[k]));
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
  const byRace = {};
  Object.keys(RACE).forEach(r => {
    const sub = rows.filter(x => x.race === r);
    byRace[RACE[r].n] = Math.round(sub.reduce((a,b)=>a+b.総合,0)/sub.length / avg("総合") * 100);
  });
  const v = rows.map(x=>x.総合);
  return {byJob, byRace, spread:+(Math.max(...v)/Math.min(...v)).toFixed(2),
          最弱:rows.reduce((a,b)=>a.総合<b.総合?a:b).名,
          最強:rows.reduce((a,b)=>a.総合>b.総合?a:b).名};
}
function compare(cases) {
  [[1,0],[10,1],[16,2]].forEach(([lv,act]) => {
    console.log(`\n=== Lv${lv} ／ ${act+1}階層の敵　（職業ごとの平均。100%が全体平均）===`);
    console.log("  案".padEnd(22)+"ナイト        アーチャー      スカウト      ウィザード      種族ごと                    ばらつき");
    cases.forEach(c => {
      const r = summary(lv, act, c.grow, c.wep, c.floor, c.job, c.race, c.ev);
      const f = n => {const x=r.byJob[n];return `${String(x.総合).padStart(3)}%(火${String(x.火力).padStart(3)}耐${String(x.耐久).padStart(3)})`;};
      const g = n => `${String(r.byRace[n]).padStart(3)}%`;
      console.log("  "+c.n.padEnd(20,"　").slice(0,20)+" "+
        f("ナイト")+" "+f("アーチャー")+" "+f("スカウト")+" "+f("ウィザード")+
        `  人${g("ヒューム")}矮${g("ドワーフ")}妖${g("エルフ")}獣${g("ビースト")}`+
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
    const mulUp25 = {};
    ["dagger","twindagger","fang","rapier","clawblade","shadowfang","assassin"]
      .forEach(k => { if (WEP[k]) mulUp25[k] = {mul:+(WEP[k].mul*1.25).toFixed(2)}; });
    const S43M2 = {...GROW, scout:{STR:4,DEX:3,VIT:2}, mage:{INT:5,VIT:2}};
    const scoutSTR = {scout:{...JOB.scout.st, STR:30}};
    /* いまが基準。ここからさらに動かす案を並べる */
    const mulUp09 = {};
    ["dagger","twindagger","fang","rapier","clawblade","shadowfang","assassin"]
      .forEach(k => { if (WEP[k]) mulUp09[k] = {mul:+(WEP[k].mul*0.92).toFixed(2)}; });
    const E = o => ({elf:{...RACE.elf.st, ...o}});
    /* 成長点は archer 9・scout 9 のまま、DEX を減らしたぶんを配り直す */
    const W1 = {...GROW, archer:{STR:4,DEX:1,VIT:3,INT:1}, scout:{STR:5,DEX:1,VIT:3}};
    const W2 = {...GROW, archer:{STR:4,DEX:2,VIT:2,INT:1}, scout:{STR:5,DEX:2,VIT:2}};
    const W3 = {...GROW, archer:{STR:4,VIT:4,INT:1},       scout:{STR:5,VIT:4}};
    compare([
      {n:"いま (DEX3/Lv)", grow:null},
      {n:"W2 DEX 3→2", grow:W2},
      {n:"W1 DEX 3→1", grow:W1},
      {n:"W3 DEX 成長なし", grow:W3},
      {n:"P 割り算 15→25", ev:{div:25}},
      {n:"P30 割り算 15→30", ev:{div:30}},
      {n:"Q 回避の上限 +1", ev:{cap:1}},
      {n:"W1＋P30", grow:W1, ev:{div:30}},
      {n:"W2＋P25", grow:W2, ev:{div:25}},
    ]);


  } else if (process.argv.some(a => a.startsWith("--elf="))) {
    /* エルフの案を1つ当てて、16通りの内訳をそのまま見る */
    const key = process.argv.find(a => a.startsWith("--elf=")).slice(6);
    const OPTS = {
      a:{STR:0}, b:{STR:0,VIT:6}, c:{STR:0,VIT:6,DEF:2},
      d:{STR:2,VIT:6,DEF:2}, f:{STR:2,VIT:6,DEF:2,INT:9},
    };
    Object.assign(RACE.elf.st, OPTS[key] || {});
    [[1,0],[10,1]].forEach(([lv,act]) => table(lv, act, null, "エルフ案 "+key));
  } else if (process.argv.includes("--before")) {
    /* 2026-08-31 の調整を巻き戻した状態。効き目を確かめるとき用 */
    GROW.scout = {DEX:5,STR:2,VIT:2};
    GROW.mage  = {INT:5,VIT:3};
    JOB.scout.st.STR  = 26;
    JOB.knight.st.DEF = 10;
    RACE.dwarf.st.DEF = 5;
    ["dagger","twindagger","fang","rapier","clawblade","shadowfang","assassin"]
      .forEach(k => { if (WEP[k]) WEP[k].mul = +(WEP[k].mul/1.15).toFixed(2); });
    [[1,0],[10,1],[16,2]].forEach(([lv,act]) => table(lv, act, null, "調整前"));
  } else {
    [[1,0],[10,1],[16,2]].forEach(([lv,act]) => table(lv, act, null, "いまの数値"));
  }
}
module.exports = {table, rate, build, foeStats};
