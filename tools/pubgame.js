#!/usr/bin/env node
/*
  本体（index.html）を Artifact に載せられる形へ書き出す。

    node tools/pubgame.js        →  lab/.game.artifact.html

  Artifact は <!doctype>/<html>/<head>/<body> を publish のときに被せるので、
  中身だけを渡す。あわせて、あちらで動かないものを外す。

    ・BGM …… 26MB あり、Artifact の上限 16MB を超える。しかも外の音は
              CSP で止まる。**曲の表を空にして 静かに黙らせる**
              （404 を出し続けないため。BGM の仕掛けそのものは残る）
    ・効果音 …… 外から読むのは jajan.mp3 ひとつ（100KB）だけなので
              data URI にして埋め込む
    ・クラウド保存 …… Firebase の SDK は www.gstatic.com から取るので
              CSP で止まる。apiKey を空にして **眠らせる**
              （configured() が false になり、端末内の控えだけで動く）

  遊ぶぶんには何も欠けない。曲が鳴らないのと、記録が端末に残るだけになる。
*/
const fs=require("fs"), path=require("path");
const ROOT=path.join(__dirname,"..");
const SRC=path.join(ROOT,"index.html");
const OUT=path.join(ROOT,"lab",".game.artifact.html");

let s=fs.readFileSync(SRC,"utf8");

/* ---- 1. 外側の殻を剥ぐ ---- */
const head=s.indexOf("<head>"), endHead=s.indexOf("</head>");
const body=s.indexOf("<body>"), endBody=s.indexOf("</body>");
if(head<0||endHead<0||body<0||endBody<0){console.error("殻が見つからない");process.exit(1);}
let inHead=s.slice(head+"<head>".length,endHead);
const inBody=s.slice(body+"<body>".length,endBody);
/* charset と viewport は publish のときに被せてくれるので外す */
inHead=inHead.replace(/<meta charset[^>]*>\s*/i,"")
             .replace(/<meta name="viewport"[^>]*>\s*/i,"");

let out=inHead.trim()+"\n"+inBody;

/* ---- 2. BGM を黙らせる ---- */
const bgmRe=/const BGM=\{[\s\S]*?\n\};/;
if(!bgmRe.test(out)){console.error("BGM の表が見つからない");process.exit(1);}
out=out.replace(bgmRe,
  "const BGM={};   /* Artifact 版は曲を持たない（26MB あり 上限を超える） */");

/* ---- 3. 効果音を埋め込む ---- */
const sfx=path.join(ROOT,"audio","sfx","jajan.mp3");
if(fs.existsSync(sfx)){
  const b64=fs.readFileSync(sfx).toString("base64");
  out=out.replace(/const SFXFILE=\{[\s\S]*?\n\};/,
    'const SFXFILE={win:"data:audio/mpeg;base64,'+b64+'"};')
     .replace('new Audio(encodeURI(SFXDIR+f))',
              'new Audio(/^data:/.test(f)?f:encodeURI(SFXDIR+f))');
}

/* ---- 4. クラウド保存を眠らせる ---- */
const key=/apiKey:"[^"]*",/;
if(!key.test(out)){console.error("apiKey が見つからない");process.exit(1);}
out=out.replace(key,'apiKey:"",   /* Artifact 版はクラウド保存を眠らせる */');

fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,out);
const kb=n=>(n/1024).toFixed(0)+"KB";
console.log(`書き出した ${path.relative(ROOT,OUT)}　${kb(Buffer.byteLength(out))}`);
console.log(`  版 ${(s.match(/const VERSION="([^"]+)"/)||[])[1]}`);
console.log(`  BGM 無し／効果音は埋め込み／クラウド保存は眠り`);
for(const bad of [["<!DOCTYPE",/<!DOCTYPE/i],["<html",/<html[\s>]/i],["<body",/<body[\s>]/i]])
  if(bad[1].test(out))console.log(`  ⚠ ${bad[0]} が残っている`);
