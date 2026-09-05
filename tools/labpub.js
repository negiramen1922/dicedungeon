/* lab/dice.html を Artifact 用に書き出す。
   Artifact は <!doctype>…<head>…<body> を publish のときに被せるので、
   こちらでその外枠を書くと二重になる。<title> と <style> と中身だけを渡す。
   **本体は lab/dice.html のほう。**ここは写すだけで、直接いじらないこと。 */
const fs=require("fs"), path=require("path");
const src=path.join(__dirname,"..","lab","dice.html");
const out=process.argv[2]||path.join(__dirname,"..","lab",".dice.artifact.html");
const s=fs.readFileSync(src,"utf8");
const ttl=(s.match(/<title>([\s\S]*?)<\/title>/)||[])[1];
const css=(s.match(/<style>([\s\S]*?)<\/style>/)||[])[1];
const body=(s.match(/<body>([\s\S]*?)<\/body>/)||[])[1];
if(!ttl||!css||!body){ console.error("外枠が見つからない。lab/dice.html の形が変わった？"); process.exit(1); }
fs.writeFileSync(out,`<title>${ttl}</title>\n<style>${css}</style>\n${body.trim()}\n`);
console.log(`${path.relative(process.cwd(),out)} に書き出した（${ttl}／${
  (fs.statSync(out).size/1024).toFixed(1)} KB）`);
