/* 普通・重い・精鋭 の遭遇に 敵を1体足す。
   足すのは **その遭遇でいちばん弱い顔ぶれ**（素の HP がいちばん低い者）。
   こうすると「狼と兎」は 狼＋兎2 になり、遭遇の性格が変わらない。
   名前が数を言っている遭遇（二頭・二人・ふたつ・二体・二匹・番）は触らない。 */
const fs=require("fs");
const P="index.html";
let s=fs.readFileSync(P,"utf8");

const gi=s.indexOf("const ENCS="), ge=s.indexOf("\nconst ",gi+12);
const T=s.slice(gi,ge);
const ENCS={};
for(const m of T.matchAll(/(\w+):\{n:"([^"]+)",list:\[([^\]]*)\]\}/g))
  ENCS[m[1]]={n:m[2],list:m[3].replace(/"/g,"").split(",")};

/* FOE の素の HP */
const fi=s.indexOf("const FOE="), fe=s.indexOf("\nconst ",fi+11);
const F=s.slice(fi,fe);
const HP={};
for(const m of F.matchAll(/(?:^|\s)(\w+):\{n:"[^"]+"[\s\S]{0,900}?HP:(\d+)/g))
  if(HP[m[1]]===undefined)HP[m[1]]=+m[2];

/* 普通・重い・精鋭 に出る遭遇を集める */
const ai=s.indexOf("const AREAS="), ae=s.indexOf("\nconst ",ai+12);
const A=s.slice(ai,ae);
const keys=new Set();
for(const g of ["norm","hard","elite"])
  for(const m of A.matchAll(new RegExp(g+':\\[([^\\]]*)\\]',"g")))
    m[1].replace(/"/g,"").split(",").filter(Boolean).forEach(k=>keys.add(k));

const NUM=/二|ふたつ|番$|の番/;
const done=[],skip=[];
for(const k of [...keys].sort()){
  const e=ENCS[k]; if(!e){skip.push(k+" ← ENCS に無い");continue;}
  if(NUM.test(e.n)){skip.push(`${k}「${e.n}」← 名前が数を言っている`);continue;}
  /* いちばん弱い顔ぶれ（同点なら先に出てくるほう） */
  let weak=e.list[0], wh=HP[weak]===undefined?1e9:HP[weak];
  e.list.forEach(x=>{const h=HP[x]===undefined?1e9:HP[x];if(h<wh){wh=h;weak=x;}});
  const nl=e.list.concat([weak]);
  const before=`${k}:{n:"${e.n}",list:[${e.list.map(x=>`"${x}"`).join(",")}]}`;
  const after =`${k}:{n:"${e.n}",list:[${nl.map(x=>`"${x}"`).join(",")}]}`;
  if(s.indexOf(before)<0){skip.push(k+" ← 本文で見つからない");continue;}
  s=s.split(before).join(after);
  done.push(`${e.n.replace(/ /g,"")}　${e.list.join("・")} ＋${weak}`);
}
fs.writeFileSync(P,s);
console.log(`足した遭遇 ${done.length}件 ／ 触らなかった ${skip.length}件`);
console.log("\n― 触らなかったもの ―");
skip.forEach(x=>console.log("  "+x));
console.log("\n― 足したもの（先頭20件）―");
done.slice(0,20).forEach(x=>console.log("  "+x));
