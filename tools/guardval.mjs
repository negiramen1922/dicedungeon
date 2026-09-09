/* ===== 守りの技の値段表（α1.0.067） =====
   VIT が 割合の削減になったので、「VIT +N を Mターン」が どれだけの値打ちかを
   一つの物差しで出す。物差しは ailval と同じ **味方の通常攻撃1発 ＝ 1.00**。

   VIT +N を1ターン … その者が受ける一撃が N/(100−いまのVIT) だけ軽くなる
                      → 防いだ被害 ÷ 通常攻撃1発
   盾 X%           … 最大HP の X% を肩代わり。**1発で消えるのではなく
                      HP と同じように 受けたぶんだけ減っていく**（残りは持ち越す）
                      → 肩代わりできる量ぜんぶ ÷ 通常攻撃1発

   くらべる相手は 攻めの札（血の契 ×2.05・急所突き ×1.68・タダの札 ×1.00）。
   守りは「1手で どれだけ被害を減らせたか」なので、同じ単位で並ぶ。
   使い方: node tools/guardval.mjs                                       */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/index.html');await pg.waitForTimeout(900);
const out=await pg.evaluate(()=>{
  const L=[];
  const C=(a,k)=>{let r=1;for(let i=0;i<k;i++)r=r*(a-i)/(i+1);return r;};
  const pAt=(n,need,thr)=>{const p=Math.max(0,Math.min(1,(7-thr)/6));
    let o=0;for(let k=need;k<=n;k++)o+=C(n,k)*Math.pow(p,k)*Math.pow(1-p,n-k);return o;};
  const xAvg=(n,need,thr)=>{const p=Math.max(0,Math.min(1,(7-thr)/6));
    let e=0,s2=0;for(let k=need;k<=n;k++){const w=C(n,k)*Math.pow(p,k)*Math.pow(1-p,n-k);
      e+=w*(1+XBONUS*Math.min(1,k-need));s2+=w;}return s2?e/s2:1;};
  const ctx=[];
  [["plain",1],["seed",2],["cave",2],["wtree",3],["hall",3],["city",4]].forEach(([ak,tier])=>{
    slot=0;sel.job="knight";sel.race="hume";sel.orig="greed";newGame();closeModal();
    const lv=tierLo(tier)+Math.floor((tierHi(tier)-tierLo(tier))/2);
    while(me.lv<lv){me.lv++;growUp();}
    while(skCanUp("fight"))skUp("fight");
    dive(ak);const A0=AREAS[ak];
    sel.enc=(A0.norm&&A0.norm.length?A0.norm:A0.easy||A0.solo)[0];
    RUN.elite=false;RUN.boss=false;startBattle();
    const f=foes[0];
    /* 敵1体の1手の被害 B（いまの VIT のまま） */
    const atks=(f.acts||[]).filter(a=>a.k==="atk");
    let fd=0,fw=0;
    atks.forEach(t=>{
      const w=t.w||1,nd=foeDice(f,t),need=Math.max(1,t.suc||1);
      const thr=threshold(f,me,{act:t});
      const pw=powOf(f,{pct:t.pct||0,pow:t.pow||0});
      fd+=pAt(nd,need,thr)*xAvg(nd,need,thr)*Math.max(1,t.hits||1)*perHit(pw,defOf(me))*w;
      fw+=w;});
    const B=fw?fd/fw:0;
    const nd=skillDice(wepSkill(me),me), thr=threshold(me,f,{});
    const A=pAt(nd,1,thr)*xAvg(nd,1,thr)*Math.max(1,me.wep.hits||1)*perHit(powOf(me,{}),defOf(f));
    ctx.push({n:AREAS[ak].n.replace(/ /g,""),lv,A,B,vit:defOf(me),maxHP:me.maxHP});
  });
  const av=f=>ctx.reduce((a,c)=>a+f(c),0)/ctx.length;

  L.push("■ 土台（味方の通常攻撃1発 ＝ 1.00）");
  L.push("区画　　　　　 Lv 通常攻撃1発 敵1体の1手 味方VIT 最大HP");
  ctx.forEach(c=>L.push(`${c.n.padEnd(11,"　")} ${String(c.lv).padStart(2)} ${
    String(Math.round(c.A)).padStart(9)} ${String(Math.round(c.B)).padStart(9)} ${
    String(c.vit).padStart(6)}% ${String(c.maxHP).padStart(6)}`));
  L.push("");
  /* ===== 盾と VIT の いちばん大きな違い =====
     盾は **1発で使い切る**。VIT は 続くあいだ **何発でも**軽くする。
     だから 1ターンに何発 受けるかで 値打ちが変わる。
     敵が3体並ぶ戦いなら 前に立つ者は 2〜3発 受ける。 */
  L.push("■ VIT +N を Mターン の値打ち（防いだ被害 ÷ 通常攻撃1発）");
  L.push("　　　　　　1発/ターン　　　　　2発/ターン　　　　　3発/ターン");
  L.push("　　　　 1T   2T   3T  │ 1T   2T   3T  │ 1T   2T   3T");
  [5,8,10,15,20,30].forEach(n=>{
    const one=av(c=>c.B*(n/Math.max(1,100-c.vit))/c.A);
    const row=[1,2,3].map(h=>[1,2,3].map(t=>("×"+(one*h*t).toFixed(2))).join(" ")).join(" │ ");
    L.push(` VIT +${String(n).padEnd(3)} ${row}`);
  });
  L.push("");
  L.push("");
  L.push("■ 盾（最大HPの X%）の値打ち");
  L.push("　 シールドは **HP と同じように減っていく**（1発で消えるのではない）ので、");
  L.push("　 戦いが続くかぎり **肩代わりできる量ぜんぶ**が値打ちになる。");
  [8,10,12,15,25].forEach(x=>{
    const full=av(c=>(c.maxHP*x/100)/c.A);
    const oneHit=av(c=>Math.min(c.maxHP*x/100,c.B)/c.A);
    L.push(` 盾 ${String(x).padEnd(3)}%  ×${full.toFixed(2)}　`+
      (full-oneHit>0.01?`（1発で使い切るなら ×${oneHit.toFixed(2)}。それを越えるぶんは 次の一撃へ持ち越す）`:`（敵の一撃 1発ぶんに満たないので 1発で消える）`));
  });
  L.push("");
  L.push("■ いま在る守りの札");
  const N={knight:"ナイト",archer:"アーチャー",scout:"スカウト",mage:"ウィザード",
    hume:"ヒューム",dwarf:"ドワーフ",elf:"エルフ",beast:"ビースト",common:"共通",
    greed:"強欲",wrath:"憤怒",sloth:"怠惰",gluttony:"暴食",pride:"傲慢",envy:"嫉妬",lust:"色欲"};
  const rows=[];
  Object.keys(REW.act).forEach(g=>REW.act[g].forEach(s=>{
    if(s.kind!=="guard"&&!(s.kind==="focus"&&s.defUp))return;
    let v=0,what="";
    if(s.blockPct){v=av(c=>(c.maxHP*s.blockPct/100)/c.A);what=`盾 ${s.blockPct}%`;}
    if(s.block){v=av(c=>s.block/c.A);what=`盾 ${s.block}`;}
    if(s.defUp){const t=(s.dur||1)+1;
      v+=av(c=>c.B*(s.defUp/Math.max(1,100-c.vit))/c.A)*t;what+=`${what?" ＋ ":""}VIT +${s.defUp}（${t}ターン）`;}
    rows.push({g,s,v,what});
  }));
  rows.sort((a,b)=>b.v-a.v).forEach(r=>L.push(
    ` ${(N[r.g]||r.g).padEnd(6,"　")}${r.s.n.replace(/\s/g,"").padEnd(9,"　")} MP${
      String(r.s.mp).padStart(2)} 再${r.s.cd}　×${r.v.toFixed(2)}　${r.what}`));
  L.push("");
  L.push("くらべる相手  血の契 ×2.05（いちばん強い攻めの札）／急所突き ×1.68／タダの札 ×1.00");
  return L;
});
console.log(out.join('\n'));
if(errs.length)console.log('ERR\n'+errs.join('\n'));
await b.close();
