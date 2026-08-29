#!/usr/bin/env node
/*
  index.html の VERSION を1つ上げる。マージのたびに走らせる。

    node tools/bump.js          α0.0001 → α0.0002
    node tools/bump.js --show   いまの版を表示するだけ

  桁は保たれる。α0.0999 の次は α0.1000。
*/
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "index.html");
const RE = /(const VERSION\s*=\s*")α(\d+)\.(\d+)(";)/;

function main() {
  const src = fs.readFileSync(FILE, "utf8");
  const m = src.match(RE);
  if (!m) {
    console.error("index.html に const VERSION が見つからない");
    process.exit(1);
  }
  const [, head, major, minor, tail] = m;
  const cur = `α${major}.${minor}`;

  if (process.argv.includes("--show")) { console.log(cur); return; }

  /* 小数側を1つ上げる。桁あふれは繰り上げる（α0.9999 → α1.0000） */
  const width = minor.length;
  let next = String(Number(minor) + 1);
  let maj = Number(major);
  if (next.length > width) { maj += 1; next = "0".repeat(width); }
  const bumped = `α${maj}.${next.padStart(width, "0")}`;

  fs.writeFileSync(FILE, src.replace(RE, `${head}${bumped}${tail}`));
  console.log(`${cur} → ${bumped}`);
}

main();
