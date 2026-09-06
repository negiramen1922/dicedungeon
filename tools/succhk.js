#!/usr/bin/env node
/*  必要成功数（suc）の階段を測る。
    技ごとに「ダイス n個・しきい値 t のときの 期待威力倍率」を出す。

      node tools/succhk.js            … 職・種族・出自ごとに一覧
      node tools/succhk.js --ladder   … 必要成功の帯が重なっていないか
      node tools/succhk.js --foe      … 敵の技

    期待威力倍率 = Σ[k≥suc] C(n,k)p^k(1-p)^(n-k) × powMul × (1+XGAIN·min(XCAP,k-suc))
    （物理・魔法の別や属性・状態異常は見ない。「素の重さ」だけを比べる）        */
const api = require("./probe.js").load();
const {REW, FOE} = api;
const XGAIN = 0.25, XCAP = 2;

const C = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return r; };
function expMul(n, thr, suc, mul) {
  const p = (7 - thr) / 6;
  let out = 0;
  for (let k = suc; k <= n; k++)
    out += C(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k) * mul * (1 + XGAIN * Math.min(XCAP, k - suc));
  return out;
}
const sucOf = a => Math.max(1, a.suc || 1);
/* 素の威力倍率。powMul が無い技は 1.0 扱い。可変倍率のものは 上限を控えに書く */
const VARY = {
  lostPow: 1.45, jealous: 1.6, rage: 1.6, chain: 1.0, again: 1.0,
  lostDice: 1.0, steal: 1.0, lifeSteal: 1.0, devour: 1.0, loot: 1.0, mpDrain: 1.0,
};
function mulOf(a) {
  if (a.powMul != null) return a.powMul;
  for (const k in VARY) if (a[k]) return VARY[k];
  return 1.0;
}

function atks(list) { return (list || []).filter(a => a.kind === "atk"); }

const NS = [2, 3, 4, 5, 6];
function row(a, thr) {
  const s = sucOf(a), m = mulOf(a);
  const cells = NS.map(n => (n < s ? "  −  " : expMul(n, thr, s, m).toFixed(2).padStart(5)));
  return `  ${a.n.replace(/\s/g, "").padEnd(9, "　")} 必要${s} ×${m.toFixed(2).padStart(4)} mp${String(a.mp).padStart(2)} cd${a.cd}` +
         ` │${cells.join(" ")}`;
}

const mode = process.argv[2] || "";

if (mode === "--foe") {
  const seen = new Map();
  for (const id in FOE) for (const t of (FOE[id].acts || [])) {
    if (t.k !== "atk") continue;
    const key = t.n;
    if (!seen.has(key)) seen.set(key, {t, who: []});
    seen.get(key).who.push(FOE[id].n);
  }
  console.log(`敵の攻撃 ${seen.size} 種`);
  console.log(`  ${"技".padEnd(9, "　")} 必要  倍率  ダイス │ 使う者`);
  for (const [n, v] of [...seen].sort((a, b) => (a[1].t.suc || 1) - (b[1].t.suc || 1))) {
    const t = v.t;
    console.log(`  ${n.replace(/\s/g, "").padEnd(9, "　")} 必要${Math.max(1, t.suc || 1)} ` +
      `${t.pct != null ? "pct" + t.pct : "  −"} d${t.dice || "?"} │ ${v.who.slice(0, 4).join(" ")}${v.who.length > 4 ? " …" : ""}`);
  }
  process.exit(0);
}

if (mode === "--ladder") {
  /* 必要成功ごとの 素の倍率の帯。上の帯の最大（×1.5）が
     下の帯の最小を 追い越していないか。 */
  const band = {};
  for (const g in REW.act) for (const a of atks(REW.act[g])) {
    const s = sucOf(a), m = mulOf(a);
    (band[s] = band[s] || []).push({n: a.n.replace(/\s/g, ""), m, g});
  }
  for (const s of Object.keys(band).sort()) {
    const l = band[s].sort((x, y) => x.m - y.m);
    console.log(`■ 必要成功 ${s}　${l.length}個　素 ×${l[0].m.toFixed(2)} 〜 ×${l[l.length - 1].m.toFixed(2)}` +
      `　（超過込みの最大 ×${(l[l.length - 1].m * 1.5).toFixed(2)}）`);
    console.log("   " + l.map(x => `${x.n}(${x.m})`).join(" "));
  }
  console.log("");
  const ks = Object.keys(band).map(Number).sort();
  for (let i = 0; i + 1 < ks.length; i++) {
    const lo = band[ks[i]], hi = band[ks[i + 1]];
    const loMax = Math.max(...lo.map(x => x.m)) * 1.5;
    const hiMin = Math.min(...hi.map(x => x.m));
    const ok = loMax <= hiMin;
    console.log(`必要${ks[i]}の最大 ×${loMax.toFixed(2)}　vs　必要${ks[i + 1]}の最小 ×${hiMin.toFixed(2)}　${ok ? "○ 追い越さない" : "✗ 追い越す"}`);
  }
  process.exit(0);
}

console.log(`ダイス ${NS.join("/")}個・しきい値4以上での 期待威力倍率\n`);
for (const g in REW.act) {
  const l = atks(REW.act[g]);
  if (!l.length) continue;
  console.log(`■ ${g}`);
  console.log(`  ${"技".padEnd(9, "　")}  必要 素倍率  費用   │${NS.map(n => (n + "個").padStart(5)).join(" ")}`);
  for (const a of l) console.log(row(a, 4));
  console.log("");
}
