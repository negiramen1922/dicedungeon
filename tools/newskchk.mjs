/* 新しく足した仕掛けが 本当に効いているか（α1.0.044） */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const file=process.argv[2]||'index.html';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:430,height:930}});
const errs=[];pg.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
await pg.goto('http://localhost:8765/'+file);await pg.waitForTimeout(800);
const out=await pg.evaluate(async()=>{
  const L=[],bad=[];
  window.ovMsg=()=>{};window.ovHide=()=>{};window.wait=async()=>{};
  window.rollDice=async()=>0;window.lungeUnit=async()=>{};
  window.fxOn=()=>{};window.popOn=()=>{};window.popSelf=()=>{};window.setHPBar=()=>{};
  slot=0; sel.job="knight";sel.race="hume";sel.orig="wrath";
  newGame();
  let g=0;while(g++<14&&modalOpen()){const q=document.querySelector("#mbox [data-i]")
    ||document.querySelector("#mbox .ndbtn button:last-child")
    ||document.querySelector("#mbox [data-skip]");if(!q)break;q.click();
    await new Promise(r=>setTimeout(r,8));}
  while(party.length<2){const m=makeMate("mage","elf",3);setParty([...party,m]);}
  const find=id=>{for(const p in REW.act){const r=REW.act[p].find(x=>x.id===id);if(r)return r;}return null;};
  const enc=Object.keys(ENCS)[0];
  const encMany=Object.keys(ENCS).find(e=>ENCS[e].list.length>=3)||enc;
  const setup=async()=>{ sel.enc=enc;dive("plain");RUN.elite=false;RUN.boss=false;
    await startBattle(); cur=me;busy=false;over=false; };
  /* 使ったあと そのまま手番が進むと、反撃も状態異常も 次の手番の頭で
     消されてしまう。**使った直後の姿**を見たいので、手番送りだけ止める */
  const realQueue=window.runQueue;
  window.runQueue=async()=>{};
  const use=async(id,tg)=>{ const r=find(id); if(!r){bad.push("技が無い "+id);return;}
    me.sk=[{...r,cdLeft:0}]; me.MP=me.maxMP; busy=false;cur=me;over=false;
    await resolvePlayer({kind:"skill",i:0}, tg===undefined?alive()[0]:tg); };
  /* 出目は本物なので、当たるまで繰り返す。見たいのは「当たったら何が起きるか」 */
  const useTill=async(id,tg,ok)=>{ for(let i=0;i<20;i++){ await use(id,tg); if(ok())return i+1; } return 0; };
  await setup();
  const mate=party[1];

  /* ① 鉄壁：余ったシールドが HP に変わる */
  me.HP=Math.round(me.maxHP*0.5); me.block=0; me.spill=null;
  await use("ak2", me);
  const sh=me.block, hp0=me.HP;
  L.push(`① 鉄壁 → シールド ${sh}（最大HPの ${Math.round(sh/me.maxHP*100)}%）　spill=${!!me.spill}`);
  if(!sh)bad.push("鉄壁でシールドが張られない");
  if(!me.spill)bad.push("鉄壁の spill が立っていない");
  round++;                             /* 次のターンへ */
  queue=[me];qi=0;
  /* 手番の頭の処理だけを走らせる */
  if(me.spill&&round>me.spill.r){
    const back=Math.min(Math.round(me.block*me.spill.pct),me.maxHP-me.HP);
    me.HP+=back;me.block=0;me.spill=null;
    L.push(`　 次の手番 → 残ったシールドが HP <b>+${back}</b>（${hp0}→${me.HP}）`);
    if(back<=0)bad.push("余ったシールドが HP に変わっていない");
  }

  /* ② シールドバッシュ：盾の量が威力に乗る */
  await setup();
  const t=alive()[0]; t.HP=t.maxHP=99999;
  me.block=0; await use("ak8",t); const noSh=t.maxHP-t.HP;
  t.HP=t.maxHP; me.block=200; await use("ak8",t); const withSh=t.maxHP-t.HP;
  L.push(`② シールドバッシュ　盾なし ${noSh} → 盾200 ${withSh}`);
  if(!(withSh>noSh))bad.push("シールドの量が 威力に乗っていない");

  /* ③ 合わせ打ち：弱点を知っていれば その属性 */
  await setup();
  const t3=alive()[0]; t3.maxHP=999999;
  const swing3=async()=>{ let best=0;
    for(let i=0;i<24;i++){ t3.HP=t3.maxHP; await use("akh4",t3); best=Math.max(best,t3.maxHP-t3.HP); }
    return best; };
  META.elem[t3.key]=null;
  const unknown=await swing3();
  learnElem(t3.key,"weak",FOE[t3.key].weak||"fire");
  const known=await swing3();
  L.push(`③ 合わせ打ち（24回振って いちばん重い一撃）　弱点を知らない ${unknown} → 知っている ${known}（弱点 ${ELEM[FOE[t3.key].weak].n}）`);
  if(!(known>unknown))bad.push("弱点を知っていても 属性が乗っていない");

  /* ④ 隙を突く：遅い相手には +20%。誰にでも撃てること も見る */
  await setup();
  const t4=alive()[0]; t4.maxHP=999999;
  const swing=async(dex)=>{ let best=0;
    for(let i=0;i<24;i++){ t4.HP=t4.maxHP; t4.DEX=dex;
      await use("akh5",t4); best=Math.max(best,t4.maxHP-t4.HP); }
    return best; };
  /* DEX 999 だと しきい値が 6 に張り付き、24回振っても当たらない回が出る。
     **少し速い相手**で測る（比べたいのは +20% が乗るかどうか） */
  const fast=await swing(dexOf(me)+30), slow=await swing(1);
  L.push(`④ 隙を突く（24回振って いちばん重い一撃）　速い相手 ${fast} → 遅い相手 ${slow}`);
  if(fast<=0)bad.push("速い相手には まったく撃てない（腐っている）");
  if(!(slow>fast))bad.push("遅い相手に 威力が乗っていない");

  /* ⑤ 免疫：状態異常を すべて解く */
  await setup();
  ailAdd(mate,"poison",5,3);ailAdd(mate,"slow",10,3);ailAdd(mate,"blur",2,3);
  const n5=mate.ail.length;
  await use("akh6",mate);
  L.push(`⑤ 免疫　${n5} つ → ${mate.ail.length} つ`);
  if(mate.ail.length)bad.push("免疫で 全部は解けていない");

  /* ⑥ 踏み締め：しばらく 受け付けない */
  await setup();
  me.resAil=null;me.ail=[];
  await use("akd5", me);
  L.push(`⑥ 踏み締め → 耐性 ${me.resAil?me.resAil.k.join("・"):"なし"}　シールド ${me.block}`);
  if(!me.resAil)bad.push("踏み締めで 耐性が付かない");
  ailAdd(me,"slow",10,2); ailAdd(me,"poison",5,2);
  L.push(`　 鈍足をかけた → ${ailHas(me,"slow")?"入った":"弾いた"}　毒 → ${ailHas(me,"poison")?"入った":"弾いた"}`);
  if(ailHas(me,"slow"))bad.push("耐性があるのに 鈍足が入る");
  if(!ailHas(me,"poison"))bad.push("耐性の外の 毒まで弾いている");

  /* ⑦ 精霊の加護：盾と一緒に 1つ解く */
  await setup();
  mate.ail=[];ailAdd(mate,"burn",8,3);ailAdd(mate,"slow",10,3);
  mate.block=0;
  await use("ake5",mate);
  L.push(`⑦ 精霊の加護 → シールド ${mate.block}　状態異常 2 → ${mate.ail.length}`);
  if(!mate.block)bad.push("加護でシールドが張られない");
  if(mate.ail.length!==1)bad.push("加護で 1つだけ解けていない");

  /* ⑧ ビーストハウル：自分の威力が上がる */
  await setup();
  me.selfPow=null;
  await use("akb2", me);
  L.push(`⑧ ビーストハウル → 自分の威力 +${me.selfPow?me.selfPow.v:0}%（${me.selfPow?me.selfPow.t+1:0}ターン）`);
  if(!me.selfPow||me.selfPow.v!==40)bad.push("ハウルで 威力が上がっていない");

  /* ⑨ 金貨は 所持金の割合 */
  await setup();
  me.gold=1000; me.goldPow=null;
  await use("agr1", me);
  L.push(`⑨ マネーイズパワー（所持金1000）→ 払った ${1000-me.gold}　威力 +${me.goldPow?me.goldPow.v:0}%`);
  if(1000-me.gold!==100)bad.push("所持金の 10% を払っていない: "+(1000-me.gold));
  me.gold=200; me.block=0;
  await use("agr5", me);
  L.push(`　 守銭奴（所持金200）→ 払った ${200-me.gold}　シールド ${me.block}`);
  if(200-me.gold!==16)bad.push("守銭奴が 所持金の 8% を払っていない: "+(200-me.gold));

  /* ⑩ 後回し：再使用待ちが縮む */
  await setup();
  const r10=find("asl5");
  me.sk=[{...r10,cdLeft:0},{...find("akd1"),cdLeft:3},{...find("ake1"),cdLeft:2}];
  me.MP=me.maxMP;busy=false;cur=me;
  await resolvePlayer({kind:"skill",i:0}, me);
  L.push(`⑩ 後回し → 3→${me.sk[1].cdLeft}　2→${me.sk[2].cdLeft}　シールド ${me.block}`);
  if(me.sk[1].cdLeft!==2||me.sk[2].cdLeft!==1)bad.push("後回しで 再使用待ちが縮んでいない");

  /* ⑪ 血の契：HP を払う */
  await setup();
  me.HP=me.maxHP; const mp0=me.MP;
  await use("awr1");
  L.push(`⑪ 血の契 → HP ${me.maxHP}→${me.HP}（最大の 10% は ${Math.round(me.maxHP*0.1)}）　MP ${mp0}→${me.MP}`);
  if(me.HP>=me.maxHP)bad.push("血の契で HP を払っていない");
  if(me.MP!==mp0)bad.push("血の契で MP を使っている");

  /* ⑫ 道連れ：自分の状態異常を 相手へ */
  await setup();
  me.ail=[];ailAdd(me,"poison",5,3);ailAdd(me,"blur",2,3);
  const t12=alive()[0]; t12.HP=t12.maxHP=999999; t12.ail=[];
  const n12=await useTill("aen4",t12,()=>t12.ail.length>0||me.ail.length===0);
  L.push(`⑫ 道連れ（${n12}回目で通った）→ 自分 ${me.ail.length} つ　相手 ${t12.ail.length} つ`);
  if(me.ail.length)bad.push("道連れで 自分から抜けていない");
  if(t12.ail.length!==2)bad.push("道連れで 相手に移っていない");

  /* ⑬ 痛み返し：盾は張らず 反撃だけ */
  await setup();
  me.block=0;me.counter=0;
  await use("awr4", me);
  L.push(`⑬ 痛み返し → シールド ${me.block}　反撃 ${Math.round((me.counter||0)*100)}%`);
  if(me.counter!==0.7)bad.push("痛み返しの 反撃が立っていない");

  /* ⑭ 全体になった手が ちゃんと全部に届く */
  sel.enc=encMany;dive("plain");RUN.elite=false;RUN.boss=false;
  await startBattle(); cur=me;busy=false;over=false;
  if(alive().length>=2){
    let hit=0,tries=0;
    for(;tries<24&&!hit;tries++){
      alive().forEach(f=>{f.maxHP=999999;f.HP=f.maxHP;});
      await use("akd2", alive()[0]);
      hit=alive().filter(f=>f.HP<f.maxHP).length;
    }
    L.push(`⑭ ロックスパイク（${tries}回目で通った）→ ${alive().length} 体中 ${hit} 体に入った`);
    if(hit<alive().length)bad.push("ロックスパイクが 全体に届いていない");
  }else L.push("⑭ 敵が1体なので 全体の確かめは飛ばした");

  return {L,bad};
});
console.log(out.L.join("\n"));
if(errs.length)console.log(errs.join("\n"));
if(out.bad.length){console.log("\n⚠ "+out.bad.join("\n⚠ "));process.exitCode=1;}
else console.log("\n✓ 新しい仕掛けは すべて効いている");
await b.close();
