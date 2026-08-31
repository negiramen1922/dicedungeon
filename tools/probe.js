#!/usr/bin/env node
/*
  index.html の <script> を Node で読み込むための足場。
  DOM を持たない環境で、データ定数と純粋な計算関数だけを取り出す。

    node tools/probe.js            … データの件数を一覧する
    node tools/probe.js --check    … 整合チェックを走らせる（不整合があれば終了コード 1）

  他のスクリプトから使うときは load() を呼ぶ。
    const api = require("./tools/probe.js").load();
    api.FOE, api.REW, api.perHit, api.elemMul …
*/
const fs = require("fs");
const path = require("path");

/* ---- DOM のダミー ----
   何を呼ばれても落ちない張りぼて。プロパティの読み書きも受け流す。 */
const mkEl = () => new Proxy({}, {
  get(t, p) {
    if (p === "style") return t.style || (t.style = new Proxy({}, {get: () => "", set: () => true}));
    if (p === "classList") return {add(){}, remove(){}, toggle(){}, contains(){return false}};
    if (p === "children" || p === "childNodes") return [];
    if (p in t) return t[p];
    if (typeof p === "string" && /^(appendChild|removeChild|addEventListener|removeEventListener|setAttribute|getAttribute|querySelector|querySelectorAll|focus|blur|play|pause|scrollIntoView|insertAdjacentHTML|remove|cloneNode|getContext|load)$/.test(p))
      return () => (p === "querySelectorAll" ? [] : mkEl());
    return "";
  },
  set(t, p, v) { t[p] = v; return true; },
});

function stubDom() {
  global.document = {
    querySelector: () => mkEl(), querySelectorAll: () => [],
    getElementById: () => mkEl(), createElement: () => mkEl(),
    addEventListener() {}, body: mkEl(), documentElement: mkEl(), head: mkEl(),
  };
  global.window = {addEventListener() {}, matchMedia: () => ({matches: false, addEventListener() {}})};
  global.Audio = function () { return mkEl(); };
  global.AudioContext = global.webkitAudioContext = function () { return mkEl(); };
  global.requestAnimationFrame = () => 0;
  global.location = {href: ""};
}

/* 取り出したいトップレベルの名前。増やしたければここに足す。 */
const EXPORTS = [
  /* データ */
  "WEP", "GEAR", "ITEMS", "MATS", "FOODS", "RECIPES", "JOB", "RACE", "ORIG", "GROW",
  "REW", "FOE", "ENCS", "AREAS", "AIL", "ELEM", "ELCYCLE", "EXPNEED", "PCOND",
  "SND", "BGM", "PXFOE", "PXTAG", "PXITEM", "PXMAT", "PXAIL", "PXDUN", "PX",
  "WEIGHT", "GOLD", "ROWS", "COLS", "PATHS", "SKMAX", "PASSMAX", "BAGBASE",
  "SK", "SKJOB", "SKRACE", "SKORIG", "SKMAXV", "LUKRANK", "CHESTGAIN",
  /* 計算 */
  "elemMul", "perHit", "hitDmg", "dieRate", "statMul", "codexLv",
];

function load(file) {
  file = file || path.join(__dirname, "..", "index.html");
  const html = fs.readFileSync(file, "utf8");
  const m = html.match(/<script>([\s\S]*)<\/script>/);
  if (!m) throw new Error("index.html に <script> が見つからない");
  stubDom();
  return new Function(m[1] + ";return {" + EXPORTS.join(",") + "};")();
}

const size = o => (Array.isArray(o) ? o.length : Object.keys(o).length);
const sum = a => a.reduce((x, y) => x + y, 0);

function report(api) {
  const act = Object.values(api.REW.act).map(a => a.length);
  const pass = Object.values(api.REW.pass).map(a => a.length);
  const wep = sum(Object.values(api.GEAR.wep).map(a => a.length));
  const rows = [
    ["敵", size(api.FOE)], ["遭遇", size(api.ENCS)],
    ["スキル", sum(act)], ["パッシブ", sum(pass)],
    ["武器の型", size(api.WEP)], ["武器（等級表）", wep],
    ["防具", api.GEAR.armor.length], ["装飾", api.GEAR.acc.length],
    ["道具", size(api.ITEMS)], ["素材・食材", size(api.MATS)],
    ["レシピ", size(api.RECIPES)],
    ["職業", size(api.JOB)], ["種族", size(api.RACE)], ["欲望", size(api.ORIG)],
    ["属性", size(api.ELEM)], ["状態異常", size(api.AIL)],
    ["区画", size(api.AREAS)],
    ["効果音", size(api.SND)], ["BGM", size(api.BGM)],
  ];
  rows.forEach(([n, v]) => console.log(String(n).padEnd(16, "　").slice(0, 16), v));
  const codex = size(api.FOE) + sum(act) + sum(pass) + size(api.WEP)
    + api.GEAR.armor.length + api.GEAR.acc.length + size(api.ITEMS)
    + size(api.MATS) + size(api.RECIPES);
  console.log("\n図鑑の総件数", codex);
  console.log("職業ごとのスキル", Object.entries(api.REW.act).map(([k, v]) => k + ":" + v.length).join(" "));
  console.log("職業ごとのパッシブ", Object.entries(api.REW.pass).map(([k, v]) => k + ":" + v.length).join(" "));
}

/* データの取りこぼしを機械的に見つける */
function check(api) {
  const bad = [];
  const add = (m) => bad.push(m);

  /* 敵：ドット絵・素材・属性の参照先が実在するか */
  Object.entries(api.FOE).forEach(([k, f]) => {
    if (!api.PXFOE[f.art || k]) add(`FOE.${k}: ドット絵 PXFOE.${f.art || k} がない`);
    if (f.mat && !api.MATS[f.mat]) add(`FOE.${k}: 素材 ${f.mat} がない`);
    [f.elem, f.weak, f.resist].forEach(e => { if (e && !api.ELEM[e]) add(`FOE.${k}: 属性 ${e} がない`); });
    (f.acts || []).forEach(a => {
      if (a.k === "summon" && !api.FOE[a.who]) add(`FOE.${k} の ${a.n}: 呼ぶ相手 ${a.who} がない`);
    });
  });

  /* 遭遇：並んでいる敵が実在するか */
  Object.entries(api.ENCS).forEach(([k, e]) => {
    e.list.forEach(x => { if (!api.FOE[x]) add(`ENCS.${k}: 敵 ${x} がない`); });
  });

  /* ダンジョン：階層の遭遇キーが実在するか。どこからも呼ばれない遭遇も拾う */
  const used = new Set();
  Object.entries(api.AREAS).forEach(([ak, a]) => {
    if (!api.PXDUN[a.art]) add(`AREAS.${ak}: 情景 PXDUN.${a.art} がない`);
    ["solo","easy","norm","hard","elite"].forEach(slot =>
      (a[slot]||[]).forEach(x => {
        if (!api.ENCS[x]) add(`AREAS.${ak}.${slot}: 遭遇 ${x} がない`);
      }));
    if (!api.ENCS[a.boss]) add(`AREAS.${ak}.boss: 遭遇 ${a.boss} がない`);
    used.add(a.boss);
    ["solo","easy","norm","hard","elite"].forEach(slot =>
      (a[slot]||[]).forEach(x => used.add(x)));
    (a.to||[]).forEach(t => {
      if (!api.AREAS[t]) add(`AREAS.${ak}.to: 区画 ${t} がない`);
    });
  });
  /* どの区画からも辿り着けない区画がないか */
  const reach = new Set(Object.keys(api.AREAS).filter(k => api.AREAS[k].start));
  let grew = true;
  while (grew) {
    grew = false;
    [...reach].forEach(k => (api.AREAS[k].to||[]).forEach(t => {
      if (api.AREAS[t] && !reach.has(t)) { reach.add(t); grew = true; }
    }));
  }
  Object.keys(api.AREAS).forEach(k => {
    if (!reach.has(k)) add(`AREAS.${k}: どこからも辿り着けない`);
  });
  Object.keys(api.ENCS).forEach(k => { if (!used.has(k)) add(`ENCS.${k}: どの階層からも出現しない`); });

  /* パッシブ：発動条件が PCOND にあるか */
  Object.entries(api.REW.pass).forEach(([pool, list]) => {
    list.forEach(p => {
      if (!p.ef) return add(`REW.pass.${pool} ${p.n}: ef がない`);
      if (p.ef.w && !api.PCOND[p.ef.w]) add(`REW.pass.${pool} ${p.n}: 条件 ${p.ef.w} が PCOND にない`);
    });
  });

  /* スキル：属性の参照先 */
  Object.entries(api.REW.act).forEach(([pool, list]) => {
    list.forEach(s => {
      if (s.el && !api.ELEM[s.el]) add(`REW.act.${pool} ${s.n}: 属性 ${s.el} がない`);
      (s.ail || []).forEach(a => { if (!api.AIL[a.k]) add(`REW.act.${pool} ${s.n}: 状態異常 ${a.k} がない`); });
    });
  });

  /* id の重複。図鑑は id で発見を記録するので、かぶると別物が同時に開く */
  const ids = {};
  const note = (id, where) => { (ids[id] = ids[id] || []).push(where); };
  Object.entries(api.REW.act).forEach(([p, l]) => l.forEach(r => note(r.id, `REW.act.${p}`)));
  Object.entries(api.REW.pass).forEach(([p, l]) => l.forEach(r => note(r.id, `REW.pass.${p}`)));
  Object.entries(api.GEAR.wep).forEach(([p, l]) => l.forEach(r => note(r.id, `GEAR.wep.${p}`)));
  api.GEAR.armor.forEach(r => note(r.id, "GEAR.armor"));
  api.GEAR.acc.forEach(r => note(r.id, "GEAR.acc"));
  Object.entries(ids).forEach(([id, w]) => { if (w.length > 1) add(`id "${id}" が重複：${w.join(" / ")}`); });

  /* レシピ：材料と出来上がりの参照先 */
  Object.entries(api.RECIPES).forEach(([k, R]) => {
    Object.keys(R.need || {}).forEach(n => { if (!api.MATS[n]) add(`RECIPES.${k}: 材料 ${n} がない`); });
    if (R.kind === "cook" && R.out && !api.ITEMS[R.out]) add(`RECIPES.${k}: 出来上がり ${R.out} が ITEMS にない`);
  });

  /* 道具・素材のドット絵 */
  Object.keys(api.MATS).forEach(k => { if (!api.PXMAT[k]) add(`MATS.${k}: ドット絵 PXMAT.${k} がない`); });
  /* weakp は weak の絵を借りている（ailIcon が読み替える） */
  const AILART = {weakp: "weak"};
  Object.keys(api.AIL).forEach(k => {
    const a = AILART[k] || k;
    if (!api.PXAIL[a]) add(`AIL.${k}: ドット絵 PXAIL.${a} がない`);
  });

  if (bad.length) { console.log("✗ " + bad.length + " 件\n" + bad.map(b => "  " + b).join("\n")); return 1; }
  console.log("✓ 参照はすべて解決した");
  return 0;
}

if (require.main === module) {
  const api = load();
  if (process.argv.includes("--check")) process.exit(check(api));
  else report(api);
}

module.exports = {load, check, report, EXPORTS};
