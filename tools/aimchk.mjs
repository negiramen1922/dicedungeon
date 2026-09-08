/* 敵の役と 狙い（α1.0.042） */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const file=process.argv[2]||'index.html';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:430,height:930}});
const errs=[];pg.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
await pg.goto('http://localhost:8765/'+file);await pg.waitForTimeout(800);
const out=await pg.evaluate(async()=>{
  const L=[],bad=[];
  window.ovMsg=()=>{};window.ovHide=()=>{};window.wait=async()=>{};window.rollDice=async()=>0;
  slot=0; sel.job="knight";sel.race="hume";sel.orig="wrath";
  newGame();
  let g=0;while(g++<14&&modalOpen()){const b=document.querySelector("#mbox [data-i]")
    ||document.querySelector("#mbox .ndbtn button:last-child")
    ||document.querySelector("#mbox [data-skip]");if(!b)break;b.click();
    await new Promise(r=>setTimeout(r,8));}
  while(party.length<3){const m=makeMate(["mage","archer"][party.length-1],"elf",3);setParty([...party,m]);}

  /* ① 役がすべての敵に付いている */
  const noRole=Object.keys(FOE).filter(k=>!FROLE[k]);
  L.push(`① 役の無い敵 ${noRole.length?noRole.join("・"):"なし"}`);
  if(noRole.length)bad.push("役の無い敵: "+noRole.join("・"));
  const cnt={};Object.keys(FROLE).forEach(k=>cnt[FROLE[k]]=(cnt[FROLE[k]]||0)+1);
  L.push(`　 ${Object.keys(cnt).map(k=>ROLEFULL[k]+" "+cnt[k]).join("　")}`);

  /* ② 役で 列が並ぶ */
  const enc=Object.keys(ENCS).find(e=>{
    const rs=ENCS[e].list.map(k=>FROLE[k]);
    return new Set(rs).size>=2&&rs.includes("shoot");});
  L.push(`② 並びを見る遭遇 ${enc?ENCS[enc].n:"—"}`);
  if(enc){
    sel.enc=enc;dive("plain");RUN.elite=false;RUN.boss=false;
    await startBattle();
    const line=foeLine().map(f=>`${f.name.replace(/ /g,"")}(${ROLEFULL[roleOf(f)]})`);
    L.push(`   手前から ${line.join(" ▸ ")}`);
    const ord=foeLine().map(f=>ROLEORDER[roleOf(f)]);
    if(ord.some((v,i)=>i&&v<ord[i-1]))bad.push("役の順に並んでいない");
  }

  /* ③ 狙いが 役ごとに変わる */
  const front=party[0], back=party[party.length-1];
  const tally={};
  foes.forEach(f=>{
    const r=roleOf(f);
    const t=foeTarget(f,f.tele);
    tally[r]=tally[r]||{};
    const w=(t===front)?"先頭":(t===back?"最後尾":"まんなか");
    tally[r][w]=(tally[r][w]||0)+1;
  });
  L.push(`③ いま誰を狙っているか ${Object.keys(tally).map(r=>
    `${ROLEFULL[r]}→${Object.keys(tally[r]).map(w=>w+tally[r][w]).join("/")}`).join("　")}`);

  /* ④ シューターは 後ろを狙う */
  const sh={n:"shoot",key:Object.keys(FOE).find(k=>FROLE[k]==="shoot")};
  foes.length=0;
  foes.push({...FOE[sh.key],id:0,key:sh.key,name:"試",isFoe:true,HP:100,maxHP:100,
    ail:[],buffs:[],dbuffs:[],block:0,tele:{k:"atk",n:"試し"},turn:0});
  party.forEach(u=>{u.HP=u.maxHP;});
  const t1=foeTarget(foes[0],foes[0].tele);
  L.push(`④ シューター（みな元気）→ ${t1.short}（先頭は ${party[0].short}）`);
  if(t1===party[0])bad.push("シューターが 先頭を狙っている");
  party[0].HP=Math.round(party[0].maxHP*0.2);
  const t2=foeTarget(foes[0],foes[0].tele);
  L.push(`　 先頭が瀕死（20%）→ ${t2.short}`);
  if(t2!==party[0])bad.push("弱っている者を狙っていない");

  /* ⑤ アタッカーは 先頭。弱った者がいればそちら */
  const ak=Object.keys(FOE).find(k=>FROLE[k]==="atk");
  foes[0]={...FOE[ak],id:0,key:ak,name:"試",isFoe:true,HP:100,maxHP:100,
    ail:[],buffs:[],dbuffs:[],block:0,tele:{k:"atk",n:"試し"},turn:0};
  party.forEach(u=>{u.HP=u.maxHP;});
  const t3=foeTarget(foes[0],foes[0].tele);
  party[2].HP=Math.round(party[2].maxHP*0.2);
  const t4=foeTarget(foes[0],foes[0].tele);
  L.push(`⑤ アタッカー（みな元気）→ ${t3.short}　後ろが瀕死 → ${t4.short}`);
  if(t3!==party[0])bad.push("アタッカーが 元気なとき 先頭を狙っていない");
  if(t4!==party[2])bad.push("アタッカーが 弱っている者を狙っていない");

  /* ⑥ 手に書いた aim が 役より優先される */
  foes[0].tele={k:"atk",n:"試し",aim:"front"};
  party.forEach(u=>{u.HP=u.maxHP;});party[2].HP=1;
  const t5=foeTarget(foes[0],foes[0].tele);
  L.push(`⑥ 手に aim:"front" → ${t5.short}（後ろが瀕死でも先頭）`);
  if(t5!==party[0])bad.push("手に書いた aim が効いていない");

  /* ⑦ 役で 数値の型が変わる */
  const ex=["tank","atk","shoot","sup"].map(r=>{
    const k=Object.keys(FROLE).find(x=>FROLE[x]===r);
    const m=rmOf(k);
    return `${ROLEFULL[r]} HP×${m.HP} STR×${m.STR} VIT×${m.VIT} DEX×${m.DEX}`;});
  L.push("⑦ "+ex.join("　"));
  if(rmOf(Object.keys(FROLE).find(x=>FROLE[x]==="tank")).HP
     <=rmOf(Object.keys(FROLE).find(x=>FROLE[x]==="shoot")).HP===false){}
  /* ⑧ 傷ついた者に 場の全員が群がらないか */
  party.forEach(u=>{u.HP=u.maxHP;});
  party[2].HP=Math.round(party[2].maxHP*0.2);
  let sw=0,tot=0;
  for(let i=0;i<400;i++){
    const t=teleOf({k:"atk",n:"試し"});
    tot++;
    if(foeTarget(foes[0],t)===party[2])sw++;
  }
  L.push(`⑧ 弱った者へ乗り換えた割合 ${Math.round(sw/tot*100)}%（狙い ${Math.round(HUNTP*100)}%）`);
  if(sw/tot>0.75||sw/tot<0.25)bad.push("乗り換えの割合が 狙いから外れている: "+Math.round(sw/tot*100)+"%");
  /* ⑨ 場のすべてに及ぶ手（aim:"all"）が 本当に全員に入るか */
  const allOwner=Object.keys(FOE).find(k=>(FOE[k].acts||[]).some(a=>a.aim==="all"));
  const allAct=allOwner&&FOE[allOwner].acts.find(a=>a.aim==="all");
  L.push(`⑨ 場のすべてに及ぶ手 ${allOwner?FOE[allOwner].n.replace(/ /g,"")+"「"+allAct.n+"」":"—"}`);
  if(!allOwner)bad.push("aim:\"all\" を持つ敵がいない");
  else{
    window.rollDice=async()=>0;window.ovHide=()=>{};
    window.lungeUnit=async()=>{};window.fxOn=()=>{};window.popOn=()=>{};
    window.popSelf=()=>{};window.setHPBar=()=>{};
    party.forEach(u=>{u.HP=u.maxHP;u.block=0;u.ail=[];});
    foes.length=0;
    foes.push({...FOE[allOwner],id:0,key:allOwner,name:"試",isFoe:true,
      HP:9999,maxHP:9999,ail:[],buffs:[],dbuffs:[],block:0,turn:0,
      tele:teleOf({...allAct}),acts:[allAct]});
    let hurt=0,tries=0;
    for(;tries<24&&hurt<party.length;tries++){
      party.forEach(u=>{u.HP=u.maxHP;});
      busy=false;over=false;
      await enemyAct(foes[0]);
      hurt=party.filter(u=>u.HP<u.maxHP).length;
    }
    L.push(`　 ${tries}回目で通った → ${party.length} 人中 ${hurt} 人に入った`);
    if(hurt!==party.length)bad.push("全体の手が 全員に入っていない");
    /* ===== 全体の手は 味方ぜんぶの枠が赤くなる（α1.0.053） =====
       前は 敵のマスの「→ 全 員」で確かめていたが、
       誰を狙っているかは もう出さない。**印は味方側の枠だけ。** */
    const allAimed=party.filter(u=>/\baimed\b/.test(unitCell(u,true,40))).length;
    L.push(`　 全体の手 → 味方 ${allAimed}/${party.length} の枠が 赤くなる`);
    if(allAimed!==party.length)bad.push("全体の手で 全員の枠が赤くなっていない");
  }

  /* ===== 枠が赤くなるのは こちらへ来る手のときだけ（α1.0.053） ===== */
  {
    const mk=k=>{
      foes.length=0;
      foes.push({...FOE.wolf,id:0,key:"wolf",name:"試",isFoe:true,
        HP:99,maxHP:99,ail:[],buffs:[],dbuffs:[],block:0,turn:0,
        tele:{n:"試 し",k,pct:0,heal:5,slow:8,dur:2},acts:[]});
      const h=party.map(u=>unitCell(u,true,40)).join("");
      return {付いた:(h.match(/\baimed\b/g)||[]).length,
              赤:(h.match(/aimed bad/g)||[]).length};
    };
    const rows=[["atk","殴る"],["hex","呪う"],["buff","力をためる"],
                ["guard","身を固める"],["summon","仲間を呼ぶ"],["regen","傷を癒す"]];
    L.push("\n⑩ 手の種類ごとに 味方の枠が赤くなるか");
    rows.forEach(([k,n])=>{
      const r=mk(k);
      const want=(k==="atk"||k==="hex");
      L.push(`　 ${n.padEnd(8,"　")} ${k.padEnd(7)} 印 ${r.付いた}　赤 ${r.赤}`);
      if(want&&!r.付いた)bad.push(`${n}（${k}）で 印が付かない`);
      if(!want&&r.付いた)bad.push(`${n}（${k}）は こちらへ来ないのに 印が付く`);
      if(k==="atk"&&!r.赤)bad.push("殴る手なのに 赤くならない");
      if(k==="hex"&&r.赤)bad.push("呪う手なのに 赤（攻撃の色）になっている");
    });
  }

  /* ===== 消したはずの札が 残っていないか（α1.0.053） ===== */
  {
    const html=[...party.map(u=>unitCell(u,true,40)),
                ...foes.map(f=>unitCell(f,false,40))].join("");
    const gone=[["crole","役の一文字"],["caimn","→ 相手の名"],["caim\"","狙 n体"]];
    const det=(typeof drawDetail==="function")?(()=>{
      $("#detail").classList.remove("hide");drawDetail();
      return $("#detail").innerHTML;})():"";
    const left=gone.filter(([c])=>new RegExp(c).test(html)).map(x=>x[1]);
    L.push(`\n⑪ 消した札 ${gone.length} つ　残っているもの ${left.length?left.join("・"):"なし"}`);
    if(left.length)bad.push("消したはずの札が 残っている："+left.join("・"));
    if(/→/.test(html))bad.push("盤に 矢印が残っている");
    L.push(`　 詳細に 矢印が残っている ${/class="k2"|→\s*[^\s<]/.test(det)}`);
    if(/class="k2"/.test(det))bad.push("詳細に 矢印が残っている");
  }

  return {L,bad};
});
console.log(out.L.join("\n"));
if(errs.length)console.log(errs.join("\n"));
if(out.bad.length){console.log("\n⚠ "+out.bad.join("\n⚠ "));process.exitCode=1;}
else console.log("\n✓ 役ごとに 並びも狙いも変わっている");
await b.close();
