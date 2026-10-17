(function (root) {
  const C = typeof module !== 'undefined' ? require('./core') : root.GameCore;
  const F = typeof module !== 'undefined' ? require('./merge-effects') : root.MergeEffects;
  const B = typeof module !== 'undefined' ? require('./render-budget') : root.RenderBudget;
  const S = typeof module !== 'undefined' ? require('./swap-effect') : root.SwapEffect;
  const V = typeof module !== 'undefined' ? require('./feature-effects') : root.FeatureEffects;
  const U = typeof module !== 'undefined' ? require('./skill-ui') : root.SkillUI;
  const R = typeof module !== 'undefined' ? require('./relax-scene') : root.RelaxScene;
  const P = typeof module !== 'undefined' ? require('./platform') : root.GamePlatform;
  const canvas = P.canvas(), ctx = canvas.getContext('2d');
  let state, previous = null, modal = '', buttons = [], start = null, best = Number(P.read('2048-best')) || 0, flash = 0;
  let scale = 1, ox = 0, oy = 0, hitShift = 0, animation = null, queued = null, framePending = false, tileMergeTime = 0;
  let screenInfo=P.info(), hidden=false, frameHandle=null, frameEpoch=0, lastCallback=null;
  let skillFeedback=null, feedbackTimer=null;
  let selection=null, featureMotion=null, availabilityCache=null, sidebarClaimed=false, chargeMotion=null;
  const readyCue=U.createCue();
  const clock=()=>typeof performance!=='undefined'&&performance.now?performance.now():Date.now();
  const budget=B.create(), effects = F.create(budget.settings), MOVE_MS = 110, INPUT_MS = 200;
  if(P.setFPS)P.setFPS(budget.settings().fps);
  const reducedMotion = !P.native && typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const relax=R.create({ctx,canvas,platform:P,clock,reducedMotion,
    onChange:(coalesce=false)=>{if(hidden)return;if(coalesce){scheduleFrame();return;}render();if(relax.animating())scheduleFrame();},
    onExit:()=>{start=null;lastCallback=null;budget.resetClock();render();}});
  const nextValue = () => Math.random() < .9 ? 2 : 4;
  function enrich() {
    if(state.next!==2&&state.next!==4)state.next=nextValue();
    state.energy=Number.isInteger(state.energy)?Math.max(0,Math.min(3,state.energy)):0;
    state.combo=Number.isInteger(state.combo)?state.combo:0;
    const h=state.pairHint;
    if(h&&(!Number.isInteger(h.source)||!Number.isInteger(h.target)||h.source<0||h.source>15||h.target<0||h.target>15||
      !Number.isSafeInteger(h.value)||h.value<2||!Number.isInteger(Math.log2(h.value))||
      Math.abs(Math.floor(h.source/4)-Math.floor(h.target/4))+Math.abs(h.source%4-h.target%4)!==1||
      state.board[h.source]!==h.value||state.board[h.target]!==h.value))delete state.pairHint;
    const p=state.parcel;
    if(p&&(!Number.isSafeInteger(p.value)||p.value<2||!Number.isInteger(Math.log2(p.value))||!Number.isInteger(p.target)||p.target<0||p.target>15||!Number.isInteger(p.remaining)||p.remaining<0||p.remaining>2))delete state.parcel;
  }
  const palette = {2:['#ede9df','#5a6156'],4:['#e4e8cd','#546044'],8:['#c5d8a4','#3c5736'],16:['#a9ca89','#35582d'],32:['#81ae6a','#fff'],64:['#598d51','#fff'],128:['#edc777','#6b5020'],256:['#e7b450','#fff'],512:['#d9963f','#fff'],1024:['#c87935','#fff'],2048:['#e0ae48','#fff']};
  function save() { availabilityCache=null; P.write('2048-save', state); P.write('2048-best', best); }
  function fresh() { state = {board:C.spawn(C.spawn(C.empty())),score:0,steps:0,continued:false}; previous=null; modal=''; animation=null; queued=null; selection=null;featureMotion=null;chargeMotion=null;effects.clear(); clearSkillFeedback(); enrich(); save(); render(); }
  const stored=P.read('2048-save');
  if(stored && Array.isArray(stored.board) && stored.board.length===16 && stored.board.every(v=>v===0 || (Number.isSafeInteger(v)&&v>=2&&Number.isInteger(Math.log2(v)))) && Number.isFinite(stored.score) && Number.isFinite(stored.steps)) state=stored;
  else state={board:C.spawn(C.spawn(C.empty())),score:0,steps:0,continued:false};
  enrich();
  function outcome(){return state.board.includes(2048)&&!state.continued?'win':C.over(state.board)&&!(state.energy===3&&C.canFold(state.board))?'over':'';}
  modal=outcome();
  function box(x,y,w,h,r,color) { ctx.fillStyle=color; ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); ctx.fill(); }
  function text(value,x,y,size=14,color='#4c5948',weight='400',align='left') { ctx.fillStyle=color;ctx.font=weight+' '+size+'px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(value,x,y); }
  function button(label,x,y,w,h,action,dark=false,disabled=false,muted=false) { box(x,y,w,h,14,disabled||muted?'#e7e9e0':dark?'#385a3b':'#fffdf7');text(label,x+w/2,y+h/2,14,disabled||muted?'#76836b':dark?'#fff':'#4c5948','600','center');buttons.push({x,y:y+hitShift,w,h,action:disabled?()=>{}:action}); }
  function clearSkillFeedback(){
    if(feedbackTimer!==null)clearTimeout(feedbackTimer);
    feedbackTimer=null;skillFeedback=null;
  }
  function setSkillFeedback(kind,message,details={}){
    clearSkillFeedback();
    const feedback={kind,message,time:clock(),motion:kind==='pair'?S.DURATION:240,...details};
    skillFeedback=feedback;
    // Keep the explanation readable without redrawing it for its entire lifetime.
    feedbackTimer=setTimeout(()=>{
      if(skillFeedback!==feedback)return;
      feedbackTimer=null;skillFeedback=null;render();
    },1600);
  }
  function skillAnimating(now){return !!skillFeedback&&!reducedMotion&&now-skillFeedback.time<skillFeedback.motion;}
  function pairAnimating(now){return !!skillFeedback&&skillFeedback.kind==='pair'&&skillAnimating(now);}
  function busy(){return !!animation||!!featureMotion||pairAnimating(clock());}
  function cellName(index){return '第'+(Math.floor(index/4)+1)+'行第'+(index%4+1)+'列';}
  function cellCenter(index){return {x:48.5+index%4*87,y:302.5+Math.floor(index/4)*87,size:77};}
  function openRelax(){
    if(hidden||modal||busy())return;
    start=null;queued=null;effects.clear();chargeMotion=null;readyCue.cancel();clearSkillFeedback();
    relax.open();
  }
  function grantPair(){
    if(hidden)return;
    if(pairAnimating(clock()))return;
    readyCue.cancel();chargeMotion=null;
    if(animation||featureMotion)setSkillFeedback('need','正在合并，稍后再配对');
    else if(state.energy<3)setSkillFeedback('need','还差 '+(3-state.energy)+' 格能量 · 每次合并蓄能 +1');
    else {
      const gift=C.pair(state.board);
      if(!gift)setSkillFeedback('need','棋盘已满 · 先滑动合并腾出空位');
      else {
        previous=JSON.parse(JSON.stringify(state));
        state.board[gift.target]=gift.value;state.pairHint=gift;state.energy=0;flash=0;
        setSkillFeedback('pair','配对牌 '+gift.value+' → '+cellName(gift.target)+' · 能量 -3',gift);save();
      }
    }
    render();if(skillAnimating(clock()))scheduleFrame();
  }
  function notice(message){setSkillFeedback('need',message);render();if(skillAnimating(clock()))scheduleFrame();}
  function openFeature(kind){
    if(hidden||modal)return;
    if(busy()){if(!pairAnimating(clock()))notice('动画进行中 · 请稍后操作');return;}
    if(kind==='mail'&&state.parcel){notice('已有一封快递 · '+(state.parcel.remaining?'还需 '+state.parcel.remaining+' 步送达':'收件格被占，腾空后签收'));return;}
    if(state.energy<3){notice('还差 '+(3-state.energy)+' 格能量 · 三种技能共用能量');return;}
    if(kind==='mail'&&!state.board.includes(0)){notice('棋盘已满 · 先腾空收件格');return;}
    clearSkillFeedback();readyCue.cancel();chargeMotion=null;queued=null;
    if(kind==='fold'){
      const plan=C.bestFold(state.board,state.parcel);
      if(!plan){notice('没有可合并的对折组合 · 不消耗充能');return;}
      executeFold(plan);return;
    }
    selection={kind:'mail',source:state.board.indexOf(Math.max(...state.board)),target:null};
    render();
  }
  function executeFold(plan){
    const {direction,delivered}=plan,before=state.board.slice();previous=JSON.parse(JSON.stringify(state));
    state.board=delivered.board;state.parcel=delivered.parcel;delete state.pairHint;
    state.energy=0;state.score+=plan.totalGain;state.steps++;flash=plan.totalGain;
    best=Math.max(best,state.score);effects.clear();tileMergeTime=clock()+360;
    const label={left:'左',right:'右',up:'上',down:'下'}[direction];
    setSkillFeedback('fold','自动向'+label+'折叠 · 合并 '+plan.pairs.length+' 组，+'+flash+' 分');
    if(!reducedMotion){
      featureMotion={kind:'fold',time:clock(),duration:V.FOLD_MS,before,direction,modal:outcome()};
      effects.emit(plan.merges.map(i=>({index:i,value:state.board[i],...cellCenter(i)})),clock()+360,direction,1);
    }else modal=outcome();
    if(delivered.delivery)setSkillFeedback('fold','自动向'+label+'折叠 · +'+flash+' 分 · 快递已签收');
    save();render();if(featureMotion||skillAnimating(clock()))scheduleFrame();
  }
  function commitFeature(){
    if(!selection||busy())return;
    if(selection.target===null){selection.note='请点一个空格作为收件地址';render();return;}
    if(state.board[selection.target]){selection.note='收件格已被占用，请重新选空格';render();return;}
    previous=JSON.parse(JSON.stringify(state));
    const value=state.board[selection.source],target=selection.target,origin=cellCenter(selection.source);
    state.parcel={value,target,remaining:2};state.energy=0;delete state.pairHint;selection=null;
    setSkillFeedback('mail','寄出 '+value+' · 两步后送达'+cellName(target));
    if(!reducedMotion)featureMotion={kind:'send',time:clock(),duration:V.SEND_MS,origin,target,value,modal:''};
    save();render();if(featureMotion||skillAnimating(clock()))scheduleFrame();
  }
  function outline(x,y,w,h,color,r=12,width=2.5){
    ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();ctx.stroke();ctx.restore();
  }
  function availability(){
    if(!availabilityCache){const empty=state.board.includes(0);availabilityCache={pair:state.energy===3&&empty&&state.board.some(Boolean),fold:state.energy===3&&C.canFold(state.board),mail:state.energy===3&&!state.parcel&&empty};}
    return availabilityCache;
  }
  function skillCard(kind,x,ready,now,register=true){
    const mail=kind==='mail',pair=kind==='pair',y=680,w=106,h=62;
    const enabled=ready,pose=readyCue.pose(mail?2:pair?4:1,now);
    const style=U.CARDS.find(card=>card.kind===kind);
    const fill=enabled?style.fill:'#e6eadd',ink=enabled?style.ink:'#53624b';
    const subtitle=mail?'两步后定点送达':pair?'相邻补同值牌':'自动择优合并';
    ctx.save();
    box(x,y,w,h,12,fill);
    outline(x+.5,y+.5,w-1,h-1,enabled?style.border:'#d5ddcc',12,1);
    ctx.save();box(x+1,y+1,w-2,h-2,11,fill);ctx.clip();
    ctx.globalAlpha=.12;ctx.fillStyle='#ffffff';ctx.fillRect(x+4,y+1,w-8,1);ctx.restore();
    if(pose)U.drawMeteor(ctx,x,y,pose.phase,style.trail);
    text(mail?'未来快递':pair?(pairAnimating(now)?'补牌中':'配对'):'折一下',x+w/2,y+21,15,ink,'700','center');
    text(subtitle,x+w/2,y+44,11,enabled?style.sub:'#5b6a52','400','center');ctx.restore();
    // Geometry and hit targets stay fixed while the meteor follows the inset edge.
    if(register)buttons.push({x,y:y+hitShift,w,h,action:()=>kind==='pair'?grantPair():openFeature(kind)});
  }
  function renderSkillStrip(now){
    const dpr=budget.pixelRatio(screenInfo),available=availability();
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.translate(ox,oy);ctx.scale(scale,scale);ctx.translate(0,U.BODY_SHIFT);
    ctx.fillStyle='#ecefe3';ctx.fillRect(6,673,346,77);
    U.CARDS.forEach(card=>skillCard(card.kind,card.x,available[card.kind],now,false));
  }

  function chargeAnimating(now){return !!chargeMotion&&now<chargeMotion.time+U.CHARGE_MS;}
  function renderCharge(now){
    if(!chargeMotion)return;
    const pose=U.chargePose(now-chargeMotion.time);if(!pose)return;
    const t=pose.flight,to={x:226+118*chargeMotion.level/3,y:641},from=chargeMotion.source;
    const x=from.x+(to.x-from.x)*t,y=from.y+(to.y-from.y)*t-32*Math.sin(Math.PI*t);
    ctx.save();ctx.globalAlpha=pose.opacity;
    box(x-12,y-10,24,20,9,'#e7bd5b');text('+1',x,y,11,'#4e5c3b','700','center');ctx.restore();
  }
  function renderSkillPanel(now){
    box(0,622,358,134,20,'#ecefe3');outline(.5,622.5,357,133,'#d9e0ce',20,1);
    text(state.energy===3?'充能已满 3/3':'合并充能 '+state.energy+'/3',14,640,14,'#36533a','700');
    const pose=chargeMotion?U.chargePose(now-chargeMotion.time):null;
    const fillProgress=chargeMotion&&now<chargeMotion.time?0:pose?pose.fill:1;
    const fraction=chargeMotion?((chargeMotion.level-1)+fillProgress)/3:state.energy/3;
    ctx.save();box(226,635,118,12,6,'#dce3d3');ctx.clip();
    ctx.fillStyle=state.energy===3?'#d8b461':'#b5a36d';ctx.fillRect(226,635,118*fraction,12);
    ctx.globalAlpha=.25;ctx.fillStyle='#fff8e1';ctx.fillRect(228,637,Math.max(0,118*fraction-4),2);ctx.restore();
    const parcelMessage=state.parcel?'快递 '+state.parcel.value+' · '+cellName(state.parcel.target)+' · '+(state.parcel.remaining?'还需 '+state.parcel.remaining+' 步':'待签收，腾空收件格'):'';
    const hint=parcelMessage||(state.pairHint?'配对牌 '+state.pairHint.value+' 已放入'+cellName(state.pairHint.target):'');
    const rule=state.energy===3?'点击下方一个技能，消耗全部充能':'再合并 '+(3-state.energy)+' 次，可选下方一个技能';
    text(skillFeedback?skillFeedback.message:hint||rule,179,663,11,'#5b6d50','400','center');
    const available=availability();U.CARDS.forEach(card=>skillCard(card.kind,card.x,available[card.kind],now));
  }
  function markCell(index,label,color){
    const x=10+index%4*87,y=264+Math.floor(index/4)*87;
    outline(x-2,y-2,81,81,color);box(x+3,y+3,71,17,5,'#f4e8c8');text(label,x+38.5,y+11.5,10,'#536749','600','center');
  }
  function renderSelection(){
    buttons=[];box(0,622,358,186,18,'#fffdf7');
    const value=state.board[selection.source];markCell(selection.source,'寄出 '+value,'#799969');
    if(selection.target!==null)markCell(selection.target,'收件地址','#c7a14c');
    text(selection.note||'点原牌选数字，再点空格选收件地址',179,642,12,'#536749','600','center');
    text('寄 '+value+' · '+(selection.target===null?'尚未选择地址':cellName(selection.target))+' · 两步后到',179,696,12,'#718066','400','center');
    button('取消',12,752,160,44,()=>{selection=null;render();});
    button('确认寄出 · 能量 -3',186,752,160,44,commitFeature,true);
  }
  function render() {
    if(hidden)return;
    if(relax.active()){relax.render(screenInfo,budget.pixelRatio(screenInfo));if(relax.animating())scheduleFrame();return;}
    const info=screenInfo, w=info.windowWidth,h=info.windowHeight,dpr=budget.pixelRatio(info);
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#f5f5ed';ctx.fillRect(0,0,w,h);
    const layout=U.fit(info,!!P.native);scale=layout.scale;ox=layout.ox;oy=layout.oy;
    ctx.translate(ox,oy);ctx.scale(scale,scale);buttons=[];
    const now=clock(), feedbackAge=skillFeedback?now-skillFeedback.time:Infinity;
    const available=availability();
    readyCue.update((available.fold?1:0)|(available.mail?2:0)|(available.pair?4:0),now,{covered:!!selection||!!modal,reduced:reducedMotion});
    text('看见下一步 · 合出你的节奏',0,16,12,'#6f7c65');text('2048',0,61,48,'#36533a','800');
    button('解压小屋',139,42,92,28,openRelax,false,false,true);
    if(P.sidebar&&P.sidebar.supported){
      const claimed=sidebarClaimed;
      button(claimed?'今日已领':P.sidebar.fromSidebar?'领取能量':'每日能量',272,42,86,36,()=>{if(busy())return;refreshReward();modal='sidebar';queued=null;render();},false,false,claimed);
    }
    text('玩法',358,20,13,'#718066','400','right');
    buttons.push({x:302,y:0,w:56,h:40,action:()=>{if(busy())return;modal='help';queued=null;render();}});
    box(0,104,172,76,18,'#e8eddf');box(184,104,174,76,18,'#eee9dc');
    text('当前得分',16,125,12,'#5f6e56');text(state.score,16,155,27,'#36533a','700');
    text('历史最佳',200,125,12,'#736653');text(best,200,155,27,'#776042','700');
    const pairing=pairAnimating(now);
    ctx.save();ctx.translate(0,U.BODY_SHIFT);hitShift=U.BODY_SHIFT;
    box(0,228,358,384,22,'#cbd4bf');
    text('下一张',14,244,11,'#536749');box(55,233,25,23,7,palette[state.next][0]);
    text(state.next,67.5,244.5,15,'#36533a','700','center');
    text('目标 2048',179,244,11,'#536749','400','center');
    text(state.combo>1?state.combo+' 连合 · '+state.steps+' 步':state.steps+' 步',344,244,11,'#536749','400','right');
    for(let i=0;i<16;i++)box(10+(i%4)*87,264+Math.floor(i/4)*87,77,77,12,'#dde3d4');
    const tile=(value,x,y,size=1,stretch={x:1,y:1},shine=0,numberOpacity=1)=>{
      const colors=palette[value]||['#375d43','#fff'];
      const softness=Math.min(1,(Math.abs(stretch.x-1)+Math.abs(stretch.y-1))*2.5);
      const radius=12+softness*11;
      ctx.save();ctx.translate(x+38.5,y+38.5);ctx.scale(size*stretch.x,size*stretch.y);
      if(softness>0){ctx.save();ctx.globalAlpha=.09*softness;box(-37,-33,74,75,radius,'#3f5736');ctx.restore();}
      box(-38.5,-38.5,77,77,radius,colors[0]);
      if(softness>0){ctx.save();ctx.globalAlpha=.23*softness;box(-29,-31,58,12,6,'#fffdf0');ctx.restore();}
      if(shine>0){ctx.save();ctx.globalAlpha=shine;box(-36,-36,72,72,radius,'#fffbea');ctx.restore();}
      ctx.restore();
      // Deform the material, keeping the number readable throughout the squeeze.
      ctx.save();ctx.translate(x+38.5,y+38.5);ctx.scale(size,size);
      ctx.globalAlpha=numberOpacity;text(value,0,0,value>=1024?27:value>=128?30:36,colors[1],'700','center');ctx.restore();
    };
    ctx.save();ctx.beginPath();ctx.rect(0,254,358,358);ctx.clip();
    if(featureMotion&&featureMotion.kind==='fold'){
      V.fold(ctx,now-featureMotion.time,featureMotion.before,state.board,featureMotion.direction,tile);
    }else if(animation && animation.phase==='move') {
      const t=Math.min(1,(now-animation.time)/MOVE_MS), eased=1-Math.pow(1-t,3);
      animation.tracks.forEach(v=>{
        const x=(v.from%4)+(v.to%4-v.from%4)*eased,y=Math.floor(v.from/4)+(Math.floor(v.to/4)-Math.floor(v.from/4))*eased;
        const merging=animation.merges.includes(v.to), incoming=v.from!==v.to;
        if(merging&&incoming&&!reducedMotion){
          const tail=1-Math.pow(1-Math.max(0,t-.13),3),tx=(v.from%4)+(v.to%4-v.from%4)*tail,ty=Math.floor(v.from/4)+(Math.floor(v.to/4)-Math.floor(v.from/4))*tail;
          ctx.save();ctx.globalAlpha=.13*Math.sin(Math.PI*t);box(10+tx*87,264+ty*87,77,77,16,(palette[v.value]||['#a9ca89'])[0]);ctx.restore();
        }
        const squeeze=merging&&!reducedMotion?Math.max(0,(t-.72)/.28):0;
        const stretch=animation.horizontal?{x:1-.07*squeeze,y:1+.045*squeeze}:{x:1+.045*squeeze,y:1-.07*squeeze};
        const numberOpacity=merging&&!reducedMotion?1-Math.max(0,(t-.75)/.25):1;
        tile(v.value,10+x*87,264+y*87,1,stretch,0,numberOpacity);
      });
    } else {
      // Draw merged tiles last so their soft rebound stays above neighbours.
      const indices=Array.from({length:16},(_,i)=>i);
      const rebound=new Set(animation?animation.merges:[]);
      indices.sort((a,b)=>Number(rebound.has(a))-Number(rebound.has(b)));
      indices.forEach(i=>{
        const value=state.board[i];if(!value||(pairing&&i===skillFeedback.target)||(featureMotion&&featureMotion.kind==='receive'&&i===featureMotion.target))return;
        const age=animation?now-animation.time-MOVE_MS:0;
        const newborn=animation&&i===animation.spawn?Math.min(1,Math.max(.72,.72+.28*age/90)):1;
        const stretch=reducedMotion?{x:1,y:1}:effects.tile(i,now,tileMergeTime);
        const shine=animation&&animation.merges.includes(i)&&age>=0?Math.max(0,1-age/140)*.18:0;
        tile(value,10+(i%4)*87,264+Math.floor(i/4)*87,reducedMotion?1:newborn,stretch,shine);
      });
    }
    if(state.pairHint&&!animation){
      const hint=state.pairHint;
      for(const [index,isTarget] of [[hint.source,false],[hint.target,true]]){
        const x=10+index%4*87,y=264+Math.floor(index/4)*87;
        // Static nested paths provide a visible outline without an idle pulse.
        box(x-2,y-2,81,81,14,isTarget?'#d1a64b':'#799969');
        ctx.save();ctx.globalAlpha=isTarget && pairing ? .6 : 1;
        box(x,y,77,77,12,(palette[hint.value]||['#375d43'])[0]);ctx.restore();
        if(!(isTarget&&pairing))text(hint.value,x+38.5,y+38.5,hint.value>=1024?27:hint.value>=128?30:36,(palette[hint.value]||['','#fff'])[1],'700','center');
        box(x+6,y+3,65,16,6,isTarget?'#f3e0ad':'#e6eedb');
        text(isTarget?(pairing?'落点':'新牌'):'配对原牌',x+38.5,y+11,10,'#536749','600','center');
      }
    }
    if(state.parcel){const p=state.parcel;markCell(p.target,p.value+' · '+(p.remaining?p.remaining+'步到':'待签收'),'#c7a14c');}
    if(featureMotion&&featureMotion.kind==='send')V.send(ctx,now-featureMotion.time,featureMotion.origin,cellCenter(featureMotion.target),featureMotion.value);
    if(featureMotion&&featureMotion.kind==='receive'&&now>=featureMotion.time)V.receive(ctx,now-featureMotion.time,cellCenter(featureMotion.target),featureMotion.value,tile);
    if(!reducedMotion)effects.draw(ctx,now,'over');
    ctx.restore();
    renderSkillPanel(now);renderCharge(now);
    button('撤销一步',0,768,173,36,()=>{if(animation)return;if(previous){selection=null;featureMotion=null;state=previous;previous=null;modal='';queued=null;flash=0;chargeMotion=null;effects.clear();clearSkillFeedback();save();render();}},false,!previous);
    button('再来一局',185,768,173,36,()=>{if(busy())return;modal='restart';queued=null;render();});
    if(pairing)S.draw(ctx,feedbackAge,skillFeedback.value,skillFeedback.value,palette,{origin:cellCenter(skillFeedback.source),destination:cellCenter(skillFeedback.target),title:'获得同值配对牌',subtitle:skillFeedback.value+' × 1 · '+cellName(skillFeedback.target)});
    if(selection)renderSelection();
    ctx.restore();hitShift=0;
    if(modal) drawModal();
    if(readyCue.active(now))scheduleFrame();
  }
  function refreshReward(){if(P.sidebar&&P.sidebar.supported)sidebarClaimed=P.read('2048-sidebar-day')===rewardDay();}
  function rewardDay() { const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
  function drawModal() {
    buttons=[];ctx.fillStyle='rgba(42,57,39,.48)';ctx.fillRect(-ox/scale,-oy/scale,canvas.width/scale,canvas.height/scale);
    if(modal==='sidebar') {
      box(12,280,334,300,24,'#fffdf7');text('每日能量补给',179,318,22,'#36533a','700','center');
      const claimed=sidebarClaimed, returned=P.sidebar.fromSidebar;
      text('从首页侧边栏进入，当前能量补满至 3 格',179,365,13,'#718066','400','center');
      text(claimed?'今天已领取，明天再来':returned?'已从侧边栏进入，可以领取':'去首页侧边栏 → 打开本游戏 → 返回领取',179,395,12,'#718066','400','center');
      button(claimed?'今日已领取':returned?'领取能量':'去首页侧边栏',34,438,290,44,()=>{
        if(claimed)return;
        if(returned){state.energy=3;previous=null;P.write('2048-sidebar-day',rewardDay());sidebarClaimed=true;save();modal='';render();}
        else {modal='';render();P.openSidebar(()=>{modal='sidebar';render();if(P.native.showToast)P.native.showToast({title:'暂时无法打开，请稍后再试',icon:'none'});});}
      },true,claimed);
      button('返回棋盘',34,501,290,40,()=>{modal='';render();});return;
    }
    const help=modal==='help';box(12,help?234:310,334,help?340:245,24,'#fffdf7');
    const title={help:'合成，从容一点',restart:'开启一局新挑战？',win:'你合成了 2048！',over:'这一局，已经很棒了'}[modal];text(title,179,help?270:349,22,'#36533a','700','center');
    if(help){['滑动合并相同数字，合出 2048 后可继续。','普通预告为 2 / 4，每次合并蓄能 +1。','满 3 格可任选下列技能，能量共用：','① 配对：相邻空格补一张同值牌。','② 折一下：自动选择当前最高收益方向。','③ 未来快递：选原牌和空格，两步后送达。','收件格同值自动合并，异值占用则待签收。','策略：大数留角落，为快递提前安排落点。'].forEach((s,i)=>text(s,34,309+i*25,12,'#718066'));button('知道了，开始合成',34,526,290,32,()=>{modal='';render();},true);}
    else {text(modal==='restart'?'当前棋盘将清空，历史最佳会保留。':'本局得分 '+state.score+'  ·  共走了 '+state.steps+' 步',179,396,13,'#819076','400','center');button(modal==='restart'?'开启新局':'再来一局',34,435,290,44,fresh,true);button(modal==='win'?'继续挑战 4096':modal==='over'&&previous?'撤销一步，继续挑战':'返回棋盘',34,489,290,40,()=>{if(modal==='win')state.continued=true;if(modal==='over'&&previous){state=previous;previous=null;}modal='';save();render();});}
  }
  function scheduleFrame() {
    if(hidden||framePending)return;
    framePending=true;
    const epoch=frameEpoch;
    frameHandle=P.frame(()=>{if(epoch===frameEpoch)tick();});
  }
  function tick() {
    framePending=false;frameHandle=null;
    if(hidden)return;
    const now=clock(), gap=lastCallback===null?0:now-lastCallback;
    lastCallback=now;
    if(relax.active()){
      if(relax.update(now,budget.settings().fps)){
        const before=clock(),fps=budget.settings().fps;render();budget.sample(clock()-before,gap);
        if(fps!==budget.settings().fps){if(P.setFPS)P.setFPS(budget.settings().fps);render();}
      }
      if(relax.animating())scheduleFrame();return;
    }
    const hadEffects=effects.active();effects.update(now);
    const effectsEnded=hadEffects&&!effects.active();
    let finished=false;
    if(animation){
      const elapsed=now-animation.time;
      animation.phase=elapsed<MOVE_MS?'move':'pop';
      if(elapsed>=INPUT_MS){if(!featureMotion)modal=animation.modal;animation=null;finished=true;}
    }
    if(skillFeedback&&skillFeedback.kind==='pair'&&!skillFeedback.settled&&!pairAnimating(now)){
      skillFeedback.settled=true;finished=true;
    }
    if(chargeMotion&&!chargeAnimating(now)){chargeMotion=null;finished=true;}
    if(featureMotion&&now-featureMotion.time>=featureMotion.duration){modal=featureMotion.modal;featureMotion=null;finished=true;}
    if(finished){const direction=queued;queued=null;if(direction&&!modal&&slide(direction))return;}
    const reminderOnly=!animation&&!featureMotion&&!effects.active()&&!skillAnimating(now)&&!chargeAnimating(now)&&readyCue.active(now);
    if((reminderOnly?readyCue.allowIdleFrame(now):budget.allowFrame(now))||finished||effectsEnded||(!animation&&!featureMotion&&!effects.active()&&!skillAnimating(now)&&!chargeAnimating(now)&&!readyCue.active(now))){
      const before=clock(), fps=budget.settings().fps;
      // Expired effects still leave pixels behind: clear the scene once before idle strip draws.
      if(reminderOnly&&!finished&&!effectsEnded)renderSkillStrip(now);else render();
      budget.sample(clock()-before,gap);
      if(fps!==budget.settings().fps){if(P.setFPS)P.setFPS(budget.settings().fps);render();}
    }
    if(animation||featureMotion||effects.active()||skillAnimating(now)||chargeAnimating(now)||readyCue.active(now))scheduleFrame();
  }
  function slide(direction) {
    if(hidden||modal)return false;
    if(selection)return false;
    if(busy()){queued=direction;return false;}
    const result=C.move(state.board,direction);if(!result.changed)return false;
    clearSkillFeedback();chargeMotion=null;
    previous=JSON.parse(JSON.stringify(state));delete state.pairHint;state.board=result.board;
    const delivery=C.deliver(state.board,state.parcel);
    state.board=delivery.board;state.parcel=delivery.parcel;
    const slots=state.board.map((v,i)=>v?-1:i).filter(i=>i>=0);
    const index=slots.length?slots[Math.floor(Math.random()*slots.length)]:-1;
    if(index>=0){state.board[index]=state.next;state.next=nextValue();}
    state.score+=result.gain+delivery.gain;state.steps++;flash=result.gain+delivery.gain;
    state.combo=result.gain?state.combo+1:0;
    if(result.gain){
      const energy=state.energy;state.energy=Math.min(3,state.energy+1);
      if(state.energy>energy){
        setSkillFeedback('charge',state.energy===3?'充能已满 · 点击下方一个技能':'合并充能 +1 · '+state.energy+'/3，还差 '+(3-state.energy)+' 次合并');
        if(!reducedMotion)chargeMotion={time:clock()+MOVE_MS,source:cellCenter(result.merges[0]),level:state.energy};
      }
    }
    best=Math.max(best,state.score);const pending=outcome();
    const now=clock();tileMergeTime=now+MOVE_MS;
    // A new board movement ends deformation on old cells; short droplets may finish.
    animation={tracks:result.tracks,merges:result.merges,spawn:index,time:now,phase:'move',horizontal:direction==='left'||direction==='right',modal:pending};
    if(!reducedMotion)effects.emit(result.merges.map(i=>({index:i,value:state.board[i],x:48.5+(i%4)*87,y:302.5+Math.floor(i/4)*87})),now+MOVE_MS,direction,state.combo);
    if(delivery.delivery){
      const received=delivery.delivery;
      setSkillFeedback('receive','快递 '+received.original+' 已签收'+(received.merged?' · 合成 '+received.value:'')+' · '+cellName(received.target));
      if(!reducedMotion)featureMotion={kind:'receive',time:now+MOVE_MS,duration:V.RECEIVE_MS,...received,modal:pending};
    }
    if(!framePending){lastCallback=null;budget.resetClock();budget.allowFrame(now);}
    save();render();scheduleFrame();return true;
  }
  function gesture(x,y) {
    if(relax.active()){relax.move(x,y);return;}
    if(!start||start.consumed)return;
    const dx=x-start.rawX,dy=y-start.rawY, distance=Math.max(Math.abs(dx),Math.abs(dy));
    if(distance<18 || Math.max(Math.abs(dx),Math.abs(dy))<Math.min(Math.abs(dx),Math.abs(dy))*1.15)return;
    start.consumed=true;if(start.board)slide(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up');
  }
  P.touch(canvas,(x,y)=>{if(relax.active()){relax.down(x,y);return;}if(start)return;const px=(x-ox)/scale,py=(y-oy)/scale;start={x:px,y:py,rawX:x,rawY:y,consumed:false,board:py>=254+U.BODY_SHIFT&&py<=612+U.BODY_SHIFT&&px>=0&&px<=358};},(x,y)=>{
    if(relax.active()){relax.up(x,y);start=null;return;}
    if(!start)return;gesture(x,y);const p={x:(x-ox)/scale,y:(y-oy)/scale};
    if(!start.consumed&&Math.hypot(x-start.rawX,y-start.rawY)<18){const b=buttons.find(b=>start.x>=b.x&&start.x<=b.x+b.w&&start.y>=b.y&&start.y<=b.y+b.h&&p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h);if(b)b.action();
      else if(selection&&selection.kind==='mail'&&p.x>=0&&p.x<=358&&p.y>=254+U.BODY_SHIFT&&p.y<612+U.BODY_SHIFT){
        const gridY=p.y-U.BODY_SHIFT;
        const col=Math.floor((p.x-10)/87),row=Math.floor((gridY-264)/87);
        if(col>=0&&col<4&&row>=0&&row<4&&p.x<10+col*87+77&&gridY<264+row*87+77){
          const index=row*4+col;
          if(state.board[index]){selection.source=index;selection.target=null;}else selection.target=index;
          delete selection.note;render();
        }
      }
    }start=null;
  },()=>{start=null;if(relax.active())relax.cancel();},gesture);
  function resize(){screenInfo=P.info();render();}
  function suspend(){
    hidden=true;relax.suspend();start=null;queued=null;selection=null;chargeMotion=null;readyCue.cancel();clearSkillFeedback();
    if(animation)modal=animation.modal;
    if(featureMotion)modal=featureMotion.modal;featureMotion=null;
    animation=null;effects.clear();frameEpoch++;
    if(framePending&&P.cancelFrame)P.cancelFrame(frameHandle);
    framePending=false;frameHandle=null;lastCallback=null;budget.resetClock();save();
  }
  function resume(){refreshReward();hidden=false;lastCallback=null;budget.resetClock();resize();}
  if(!P.native){addEventListener('resize',resize);addEventListener('keydown',e=>{if(relax.active()){if(relax.key(e.key))e.preventDefault();return;}if(e.key==='Escape'&&selection){selection=null;render();return;}const d={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',a:'left',d:'right',w:'up',s:'down'}[e.key];if(d){e.preventDefault();slide(d);}});}
  else if(P.native.onWindowResize)P.native.onWindowResize(resize);
  if(P.lifecycle)P.lifecycle(resume,suspend);
  if(P.sidebar)P.sidebar.changed=()=>{start=null;refreshReward();render();};
  refreshReward();render();
})(typeof globalThis !== 'undefined' ? globalThis : this);
