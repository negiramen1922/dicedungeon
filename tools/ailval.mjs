/* ===== 状態異常の値打ちを ひとつの物差しで測る（α1.0.065） =====
   「デバフの効果量を上げる」を決めるための道具。
   どの状態異常も **味方の通常攻撃1発**と同じ単位に置き換えて比べる。

   数え方（1ターンあたり）
     衰弱 weakp X%  … その敵の一撃が X% 軽くなる      → B × min(0.6,X/100)
     衰弱 weak  X   … 敵の STR から X 引く            → 実際の威力差で測る
     盲目 blur N    … 敵の命中閾値 +N                 → 当たらなくなったぶんの被害
     恐怖 fear N    … 同上
     弱化 break N   … 敵の VIT −N                     → こちらの一撃が増えたぶん
     鈍足 slow N    … 敵の DEX −N                     → こちらが当てやすくなったぶん
     萎縮 shrink N  … 敵の攻撃ダイス −N               → 当たらなくなったぶんの被害
     麻痺 palsy     … 手番をひとつ飛ばす              → B
     混乱 charm     … 飛ばす ＋ 仲間に入る            → B × 2
     毒 poison X    … 毎ターン X                      → X
     火傷 burn X%   … 毎ターン 残りHPの X%            → 敵HP × X/100
   B ＝ その区画の敵1体の1手ぶんの被害。
   持続は「(t+1) ターン」で数える（ゲームの表示と同じ）。
   効き判定（ailRoll・1d6 ≧ 命中閾値 −1）と 必要成功数の通る率も掛ける。

   使い方: node tools/ailval.mjs                                         */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/index.html');await pg.waitForTimeout(1000);
const out=await pg.evaluate(()=>{
  const L=[];
  const C=(a,k)=>{let r=1;for(let i=0;i<k;i++)r=r*(a-i)/(i+1);return r;};
  const pAt=(n,need,thr)=>{const p=Math.max(0,Math.min(1,(7-thr)/6));
    let o=0;for(let k=need;k<=n;k++)o+=C(n,k)*Math.pow(p,k)*Math.pow(1-p,n-k);return o;};
  const xAvg=(n,need,thr)=>{const p=Math.max(0,Math.min(1,(7-thr)/6));
    let e=0,s=0;for(let k=need;k<=n;k++){const w=C(n,k)*Math.pow(p,k)*Math.pow(1-p,n-k);
      e+=w*(1+XBONUS*Math.min(1,k-need));s+=w;}return s?e/s:1;};
  const N={knight:"ナイト",archer:"アーチャー",scout:"スカウト",mage:"ウィザード",
    hume:"ヒューム",dwarf:"ドワーフ",elf:"エルフ",beast:"ビースト",common:"共通",
    greed:"強欲",wrath:"憤怒",sloth:"怠惰",gluttony:"暴食",pride:"傲慢",envy:"嫉妬",lust:"色欲"};

  /* ---- 区画ごとに 土台を測る ---- */
  const areas=[["plain",1],["seed",2],["cave",2],["wtree",3],["hall",3],["city",4]];
  const ctx=[];
  areas.forEach(([ak,tier])=>{
    slot=0;sel.job="knight";sel.race="hume";sel.orig="lust";newGame();closeModal();
    const lv=tierLo(tier)+Math.floor((tierHi(tier)-tierLo(tier))/2);
    while(me.lv<lv){me.lv++;growUp();}
    while(skCanUp("fight"))skUp("fight");
    dive(ak);
    const A0=AREAS[ak];
    sel.enc=(A0.norm&&A0.norm.length?A0.norm:A0.easy||A0.solo)[0];
    RUN.elite=false;RUN.boss=false;
    startBattle();
    const f=foes[0];
    /* 敵1体の1手ぶんの被害 B。攻撃の手の 重みつき平均 */
    const atks=(f.acts||[]).filter(a=>a.k==="atk");
    let fd=0,fw=0,tsum=0;
    atks.forEach(t=>{
      const w=t.w||1, nd=foeDice(f,t), need=Math.max(1,t.suc||1);
      const thr=threshold(f,me,{act:t});
      const pw=powOf(f,{pct:t.pct||0,pow:t.pow||0});
      fd+=pAt(nd,need,thr)*xAvg(nd,need,thr)*Math.max(1,t.hits||1)*perHit(pw,defOf(me))*w;
      fw+=w; tsum+=thr*w;
    });
    const B=fw?fd/fw:0, fthr=fw?tsum/fw:4, fnd=atks.length?foeDice(f,atks[0]):3;
    const fneed=atks.length?Math.max(1,atks[0].suc||1):1;
    /* 味方の通常攻撃1発 A */
    const nd=skillDice(wepSkill(me),me), thr=threshold(me,f,{});
    const pw=powOf(me,{});
    const A=pAt(nd,1,thr)*xAvg(nd,1,thr)*Math.max(1,me.wep.hits||1)*perHit(pw,defOf(f));
    ctx.push({ak,n:AREAS[ak].n.replace(/ /g,""),lv,A,B,f,
      fthr,fnd,fneed,mynd:nd,mythr:thr,mypw:pw,
      pAil:Math.max(0,Math.min(1,(7-ailThr(me,f,{}))/6))});
  });

  /* ---- 1ターンあたりの値打ち（通常攻撃1発 ＝ 1.00） ---- */
  function per(c,k,v){
    const {A,B,f}=c;
    if(!A)return 0;
    if(k==="weakp") return B*Math.min(0.6,v/100)/A;
    if(k==="weak")  return B*Math.min(1,v/Math.max(1,f.STR))/A;
    if(k==="blur"||k==="fear"){
      const p0=pAt(c.fnd,c.fneed,c.fthr), p1=pAt(c.fnd,c.fneed,c.fthr+v);
      return B*Math.max(0,(p0-p1)/Math.max(1e-6,p0))/A;
    }
    if(k==="shrink"){
      const p0=pAt(c.fnd,c.fneed,c.fthr), p1=pAt(Math.max(1,c.fnd-v),c.fneed,c.fthr);
      return B*Math.max(0,(p0-p1)/Math.max(1e-6,p0))/A;
    }
    if(k==="break"){
      /* VIT が下がると こちらの一撃が増える。増えた割合が そのまま値打ち。
         perHit には下限（残りの VITFLOOR は必ず通る）があるので、
         下限に張り付いていると **VIT を削っても何も起きない** */
      const d0=perHit(c.mypw,defOf(f)), d1=perHit(c.mypw,Math.max(0,defOf(f)-v));
      return Math.max(0,(d1-d0)/Math.max(1,d0));
    }
    if(k==="slow"){
      /* 遅くなると こちらが当てやすくなる。閾値の差で測る */
      const before=c.mythr;
      const keep=f.DEX; f.DEX=Math.max(1,f.DEX-v);
      const after=threshold(me,f,{});
      f.DEX=keep;
      const p0=pAt(c.mynd,1,before), p1=pAt(c.mynd,1,after);
      return Math.max(0,(p1-p0)/Math.max(1e-6,p0));
    }
    if(k==="palsy") return B/A;
    if(k==="charm") return B*2/A;
    if(k==="poison")return v/A;
    if(k==="burn")  return Math.max(1,f.HP*v/100)/A;
    return 0;
  }

  /* ---- 状態異常ひとつあたりの表 ---- */
  L.push("■ 状態異常 1ターンぶんの値打ち（味方の通常攻撃1発 ＝ 1.00）");
  L.push("　　　　　　" + ctx.map(c=>c.n.slice(0,4).padStart(6,"　")).join("") + "　平均");
  const KINDS=[["weakp",20],["weakp",30],["weak",10],["blur",1],["blur",2],
    ["fear",1],["fear",2],["break",12],["slow",10],["slow",15],
    ["shrink",1],["palsy",0],["charm",0],["poison",10]];
  KINDS.forEach(([k,v])=>{
    const vals=ctx.map(c=>per(c,k,v));
    const av=vals.reduce((a,x)=>a+x,0)/vals.length;
    L.push(`${(AIL[k].n.replace(/\s/g,"")+" "+(v||"")).padEnd(10,"　")}`+
      vals.map(x=>("×"+x.toFixed(2)).padStart(7,"　")).join("")+`　×${av.toFixed(2)}`);
  });

  /* ---- 技ごとの合計 ---- */
  L.push("");
  L.push("■ デバフを持つ技ぜんぶ（打点は skbal の比・デバフは上の表 × 持続 × 通る率）");
  L.push("プール　　技　　　　　　必要 MP/再  打点  デバフ  効き  合計");
  const rows=[];
  Object.keys(REW.act).forEach(g=>REW.act[g].forEach(s=>{
    const a=s.ail||[]; if(!a.length&&!s.charm)return;
    /* 打点（ダイス3・しきい値4 でのならし ÷ タダの札）。
       〔罠〕攻めの手でないものは powMul が **打点ではない**。
       宣言の powMul:2 は「誓いの倍率」で、その手そのものは 1 も削らない。
       打点として数えると ×2.00 と出て 嘘になる。 */
    const isAtk=(s.kind==="atk");
    const need=Math.max(1,s.suc||1), nDie=3+(s.dice||0);
    const base=pAt(3,1,4)*xAvg(3,1,4)*1.0;
    const hit=pAt(nDie,need,4)*xAvg(nDie,need,4)*(s.powMul||1);
    const dmg=isAtk?hit/base:0;
    /* デバフの値打ち。区画平均で見る */
    let db=0;
    ctx.forEach(c=>{
      let x=0;
      a.forEach(z=>{ x+=per(c,z.k,z.v||0)*((z.t||2)+1); });
      if(s.charm)x+=per(c,"charm",0)*(s.charm+1);
      if(s.allFoes)x*=Math.max(1,foes.length);   /* 全体は敵の数だけ */
      db+=x;
    });
    db/=ctx.length;
    const pAil=ctx.reduce((a2,c)=>a2+c.pAil,0)/ctx.length;
    const pHit=isAtk?pAt(nDie,need,4):1;   /* 攻めでない手は 当たり判定を持たない */
    const total=dmg+db*pHit*pAil;
    rows.push({g,s,dmg,db,pHit,pAil,total});
  }));
  rows.sort((x,y)=>y.total-x.total).forEach(r=>L.push(
    ` ${(N[r.g]||r.g).padEnd(5,"　")}${r.s.n.replace(/\s/g,"").padEnd(9,"　")} ${r.s.suc||1}  ${
      String(r.s.mp).padStart(2)}/${r.s.cd}  ${("×"+r.dmg.toFixed(2)).padStart(6)}  ${
      ("×"+r.db.toFixed(2)).padStart(6)}  ${Math.round(r.pHit*r.pAil*100)+"%"}  ${
      ("×"+r.total.toFixed(2)).padStart(6)}`));
  L.push("");
  L.push("くらべる相手  血の契 ×2.05（いちばん強い攻めの札）／急所突き ×1.68");
  L.push("〔宣言〕打点0。誓い ×2（先手必勝で ×2.6）は **次の一手**に乗るので この表には出ない");
  return L;
});
console.log(out.join('\n'));
if(errs.length)console.log('ERR\n'+errs.join('\n'));
await b.close();
