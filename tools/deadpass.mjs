/* ===== 眠っていた特性 5 つが 札のとおりに働くか（α1.0.053） =====
   死角・戦場慣れ・妬み・省エネ・惰性 は 効き目が書いてあるだけで、
   それを読む場所がゲームの中に一つも無かった。配線したので、
   **札の文どおりに数字が動くか**を1つずつ見る。
   使い方: node tools/deadpass.mjs                                        */
import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/index.html');await pg.waitForTimeout(800);
const out=await pg.evaluate(async()=>{
  const L=[],bad=[];
  window.wait=async()=>{};window.ovMsg=()=>{};window.rollDice=async()=>0;
  window.addDice=async(a)=>a;window.ovHide=()=>{};window.lungeUnit=async()=>{};
  window.fxOn=()=>{};window.popOn=()=>{};window.popSelf=()=>{};window.setHPBar=()=>{};
  window.lukOv=async()=>{};
  /* r6 は script の頭の const なので window から差し替えられない。
     **Math.random のほうを決め打ちにする**（r6 = 1+floor(rand*6)）。
     v/6 を渡せば 出目 v が出る。 */
  const fixRoll=v=>{ Math.random=()=>((v-1)+0.5)/6; };
  const freeRoll=()=>{ Math.random=window.__realRandom; };
  window.__realRandom=window.__realRandom||Math.random;
  const P=id=>{for(const k in REW.pass){const f=REW.pass[k].find(x=>x.id===id);if(f)return f;}};
  const setup=(pass)=>{
    sel.job="knight";sel.race="hume";sel.orig="greed";sel.area="plain";
    newGame();closeModal();
    for(let i=1;i<40;i++){me.lv++;growUp();syncMates();}
    setParty([me]);me.pass=pass||[];recalcMe(me,true);
    dive("plain");sel.enc=(AREAS.plain.norm||[])[0];
    foes=makeFoes();round=1;over=false;busy=false;cur=me;
    foes.forEach(f=>{f.HP=f.maxHP=99999;});
    return foes[0];
  };

  /* ① 死 角 … 6 の目 1 個につき ダメージ +10 */
  {
    const dmg=async(pass,rolls)=>{
      const t=setup(pass);
      fixRoll(rolls);
      const before=t.HP;
      await playerAttack([t],{});
      freeRoll();
      return before-t.HP;
    };
    const six=6, four=4;   /* 全部の目を その値に固定する */
    setup([]);
    const nd=Math.max(1,skillDice(wepSkill(me),me));   /* 振る数は 技能で決まる */
    const a=await dmg([],six), c=await dmg([P("ps1")],six);
    const a4=await dmg([],four), c4=await dmg([P("ps1")],four);
    L.push(`① 死 角　振るのは ${nd}個。全部 6　素 ${a} → 持つと ${c}（差 ${c-a}　狙い +${nd*10}）`);
    L.push(`　 全部 4（6 なし）　素 ${a4} → 持つと ${c4}（差 ${c4-a4}　狙い 0）`);
    if(c-a!==nd*10)bad.push(`死角 6 の目 ${nd} 個で +${c-a}（+${nd*10} のはず）`);
    if(c4-a4!==0)bad.push("死角 6 が無いのに 増えている");
  }

  /* ② 戦場慣れ … 3ターン目以降 攻撃ダイス +1 */
  {
    setup([P("pwr1")]);
    const n=r=>{round=r;return Math.max(1,skillDice(wepSkill(me),me)+passOn("dice",me));};
    const base=(()=>{setup([]);round=3;return Math.max(1,skillDice(wepSkill(me),me));})();
    setup([P("pwr1")]);
    L.push(`② 戦場慣れ　1R ${n(1)}　2R ${n(2)}　3R ${n(3)}　4R ${n(4)}　（持たないと ${base}）`);
    if(n(1)!==base)bad.push("戦場慣れが 1R から効いている");
    if(n(3)!==base+1)bad.push("戦場慣れが 3R で効いていない");
  }

  /* ③ 妬 み … 相手が強化を持っているとき 威力 +20% */
  {
    const dmg=async(pass,buff)=>{
      const t=setup(pass);
      if(buff)addBuff(t,10,9);
      fixRoll(5);
      const before=t.HP;await playerAttack([t],{});freeRoll();
      return before-t.HP;
    };
    const plain=await dmg([P("pen3")],false), buffed=await dmg([P("pen3")],true);
    const noPass=await dmg([],true);
    const r=(buffed-noPass)/Math.max(1,noPass);
    L.push(`③ 妬 み　強化なし ${plain}　強化あり ${buffed}　持たない相手 ${noPass}（+${Math.round(r*100)}%　狙い +20%）`);
    if(buffed<=noPass)bad.push("妬みが 効いていない");
    if(plain!==noPass)bad.push("妬みが 強化を持たない相手にも効いている");
  }

  /* ④⑤ 省エネ（MP −1）と 惰性（続けがけで 半分） */
  {
    const cost=(pass,twice)=>{
      setup(pass);
      me.sk=[{...REW.act.knight.find(x=>x.id==="ak1"),cdLeft:0}];
      me.MP=me.maxMP;
      const s=me.sk[0], mp0=me.MP;
      resolvePlayer({kind:"skill",i:0},me);
      const one=mp0-me.MP, cd1=s.cdLeft;
      let two=null,cd2=null;
      if(twice){ s.cdLeft=0;busy=false;const m1=me.MP;
        resolvePlayer({kind:"skill",i:0},me);
        two=m1-me.MP; cd2=s.cdLeft; }
      return {one,cd1,two,cd2,mp:s.mp,cd:s.cd};
    };
    const b0=cost([],false);
    const ec=cost([P("psl1")],false);
    L.push(`④ 省エネ　盾構（MP ${b0.mp}）　素 −${b0.one} → 持つと −${ec.one}（狙い −${b0.mp-1}）`);
    if(ec.one!==b0.mp-1)bad.push(`省エネで MP −${ec.one}（−${b0.mp-1} のはず）`);
    const lz=cost([P("psl3")],true);
    const b2=cost([],true);
    L.push(`⑤ 惰 性　1回目 MP −${lz.one}・再使用 ${lz.cd1}　2回目 MP −${lz.two}・再使用 ${lz.cd2}`);
    L.push(`　 持たないと 1回目 −${b2.one}/${b2.cd1}　2回目 −${b2.two}/${b2.cd2}`);
    if(lz.two!==Math.ceil(lz.one/2))bad.push(`惰性の2回目が MP −${lz.two}（−${Math.ceil(lz.one/2)} のはず）`);
    if(lz.cd2!==Math.ceil(b0.cd/2))bad.push(`惰性の2回目の再使用が ${lz.cd2}（${Math.ceil(b0.cd/2)} のはず）`);
    if(b2.two!==b2.one)bad.push("持たないのに 2回目が安い");
  }
  return {L,bad};
});
console.log(out.L.join("\n"));
if(errs.length)console.log("\nERR "+errs.slice(0,3).join("\n"));
if(out.bad.length){console.log("\n⚠ "+out.bad.join("\n⚠ "));process.exitCode=1;}
else console.log("\n✓ 眠っていた 5 つとも 札のとおりに働いている");
await b.close();
