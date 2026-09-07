/* 技の説明と 実際の値が合っているか。合っていなければ 説明を直す。
     node tools/skdesc.mjs          食い違いを並べる
     node tools/skdesc.mjs --fix    説明を実際の値に揃える

   〔前の失敗〕`\{id:"..."[^}]*?\}` で切り出していたので、
   `ail:[{k:"break",...}]` を持つ技が **内側の } で切れて**飛ばされ、
   8件が直らずに残っていた。**括弧を数えて切ること。** */
import fs from 'node:fs';
const FIX=process.argv.includes("--fix");
let s=fs.readFileSync("index.html","utf8");
const a=s.indexOf("const REW={"), b=s.indexOf("\n pass:",a);
const seg=s.slice(a,b);
const blocks=[];let i=0;
while((i=seg.indexOf('{id:"',i))>=0){
  let d=0,j=i;
  for(;j<seg.length;j++){ if(seg[j]==="{")d++; else if(seg[j]==="}"){d--; if(!d){j++;break;}} }
  blocks.push({t:seg.slice(i,j),at:a+i}); i=j;
}
const bad=[];
blocks.forEach(B=>{
  if(!/kind:"atk"/.test(B.t))return;
  const n=(B.t.match(/n:"([^"]+)"/)||[])[1];
  const mul=+((B.t.match(/powMul:([\d.]+)/)||[])[1]||1);
  const dm=B.t.match(/(?<![A-Za-z])d:"([^"]*)"/);
  if(!dm)return;
  const said=dm[1].match(/×(\d+(?:\.\d+)?)/);
  if(said&&Math.abs(+said[1]-mul)>0.005)
    bad.push({n,said:+said[1],mul,at:B.at,old:B.t});
});
bad.forEach(x=>console.log(`  ${x.n.replace(/ /g,"").padEnd(12)} 説明 ×${x.said}　実際 ×${x.mul}`));
console.log(bad.length?`\n✗ ${bad.length} 件 食い違い`:"✓ 説明と値は合っている");
if(FIX&&bad.length){
  /* うしろから直す（前を直すと 位置がずれる） */
  bad.sort((p,q)=>q.at-p.at).forEach(x=>{
    const fixed=x.old.replace(/((?<![A-Za-z])d:")([^"]*)(")/,(m,p1,body,p3)=>
      p1+body.replace(/×\d+(?:\.\d+)?/,"×"+String(x.mul))+p3);
    s=s.slice(0,x.at)+fixed+s.slice(x.at+x.old.length);
  });
  fs.writeFileSync("index.html",s);
  console.log(`✓ ${bad.length} 件の説明を 実際の値に揃えた`);
}
process.exit(!FIX&&bad.length?1:0);
