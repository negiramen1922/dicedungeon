#!/usr/bin/env node
/*
  index.html の VERSION を1つ上げる。マージのたびに走らせる。

    node tools/bump.js          α1.0.001 → α1.0.002
    node tools/bump.js --show   いまの版を表示するだけ
    node tools/bump.js --minor  中を1つ上げて 小を 000 に戻す（α1.0.087 → α1.1.000）

  版の付け方は 大.中.小 の3つ。小は3桁で、桁あふれは中へ繰り上がる。
    大 … ゲームの形が変わったとき（α0 ローグライク → α1 町と持ち帰り）
    中 … まとまった作り足し
    小 … ふだんの1つ

  古い2つ組（α0.0054）も読める。読めたら3つ組に直して書き戻す。
*/
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "index.html");
const RE3 = /(const VERSION\s*=\s*")α(\d+)\.(\d+)\.(\d+)(";)/;
const RE2 = /(const VERSION\s*=\s*")α(\d+)\.(\d+)(";)/;

function main() {
  const src = fs.readFileSync(FILE, "utf8");
  let m = src.match(RE3), old2 = false;
  if (!m) { m = src.match(RE2); old2 = true; }
  if (!m) {
    console.error("index.html に const VERSION が見つからない");
    process.exit(1);
  }
  const head = m[1], tail = m[m.length - 1];
  const major = Number(m[2]);
  const minor = old2 ? 0 : Number(m[3]);
  const patch = old2 ? 0 : Number(m[4]);
  const width = old2 ? 3 : m[4].length;
  const fmt = (a, b, c) => `α${a}.${b}.${String(c).padStart(width, "0")}`;
  const cur = old2 ? `α${m[2]}.${m[3]}` : fmt(major, minor, patch);

  if (process.argv.includes("--show")) { console.log(cur); return; }

  let a = major, b = minor, c = patch + 1;
  if (process.argv.includes("--minor")) { b += 1; c = 0; }
  if (String(c).length > width) { b += 1; c = 0; }   /* 桁あふれは中へ */
  const bumped = fmt(a, b, c);

  fs.writeFileSync(FILE, src.replace(old2 ? RE2 : RE3, `${head}${bumped}${tail}`));
  console.log(`${cur} → ${bumped}`);
}

main();
