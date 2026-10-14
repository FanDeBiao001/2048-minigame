(function (root) {
  const C = typeof module !== 'undefined' ? require('./core') : root.GameCore;
  const P = typeof module !== 'undefined' ? require('./platform') : root.GamePlatform;
  const canvas = P.canvas(), ctx = canvas.getContext('2d');
  let state, previous = null, modal = '', buttons = [], start = null, best = Number(P.read('2048-best')) || 0, flash = 0;
  let scale = 1, ox = 0, oy = 0, animation = null, queued = null;
  const nextValue = () => Math.random() < .9 ? 2 : 4;
  function enrich() { if(state.next!==2&&state.next!==4)state.next=nextValue(); state.energy=Number.isInteger(state.energy)?Math.max(0,Math.min(3,state.energy)):0; state.combo=Number.isInteger(state.combo)?state.combo:0; }
  const palette = {2:['#ede9df','#5a6156'],4:['#e4e8cd','#546044'],8:['#c5d8a4','#3c5736'],16:['#a9ca89','#35582d'],32:['#81ae6a','#fff'],64:['#598d51','#fff'],128:['#edc777','#6b5020'],256:['#e7b450','#fff'],512:['#d9963f','#fff'],1024:['#c87935','#fff'],2048:['#e0ae48','#fff']};
  function save() { P.write('2048-save', state); P.write('2048-best', best); }
  function fresh() { state = {board:C.spawn(C.spawn(C.empty())),score:0,steps:0,continued:false}; previous=null; modal=''; animation=null; queued=null; enrich(); save(); render(); }
  const stored=P.read('2048-save');
  if(stored && Array.isArray(stored.board) && stored.board.length===16 && stored.board.every(v=>v===0 || (Number.isSafeInteger(v)&&v>=2&&Number.isInteger(Math.log2(v)))) && Number.isFinite(stored.score) && Number.isFinite(stored.steps)) state=stored;
  else state={board:C.spawn(C.spawn(C.empty())),score:0,steps:0,continued:false};
  enrich();
  if(C.over(state.board)) modal='over'; else if(state.board.includes(2048)&&!state.continued) modal='win';
  function box(x,y,w,h,r,color) { ctx.fillStyle=color; ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); ctx.fill(); }
  function text(value,x,y,size=14,color='#4c5948',weight='400',align='left') { ctx.fillStyle=color;ctx.font=weight+' '+size+'px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(value,x,y); }
  function button(label,x,y,w,h,action,dark=false,disabled=false) { box(x,y,w,h,14,disabled?'#e7e9e0':dark?'#385a3b':'#fffdf7');text(label,x+w/2,y+h/2,14,disabled?'#a2aa9a':dark?'#fff':'#4c5948','600','center');buttons.push({x,y,w,h,action:disabled?()=>{}:action}); }
  function render() {
    const info=P.info(), w=info.windowWidth,h=info.windowHeight,dpr=Math.min(info.pixelRatio||1,3);
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#f5f5ed';ctx.fillRect(0,0,w,h);
    const safe=P.native?Math.max(26,(info.safeArea?info.safeArea.top:info.statusBarHeight||0)+40):20;
    scale=Math.min((w-32)/358,(h-safe-18)/746,1.25);ox=(w-358*scale)/2;oy=safe+Math.max(0,(h-safe-746*scale)/2);
    ctx.translate(ox,oy);ctx.scale(scale,scale);buttons=[];
    text('看见下一步 · 合出你的节奏',0,16,12,'#8b9682');text('2048',0,61,48,'#36533a','800');
    box(139,42,66,25,12,'#e4e9da');text('合成大师',172,55,11,'#53694c','600','center');
    button('玩法 ↗',280,43,78,32,()=>{if(animation)return;modal='help';queued=null;render();});
    box(0,104,172,76,18,'#e8eddf');box(184,104,174,76,18,'#eee9dc');
    text('当前得分',16,125,12,'#7e8c73');text(state.score,16,155,27,'#36533a','700');
    text('历史最佳',200,125,12,'#948571');text(best,200,155,27,'#776042','700');
    text('下一块',0,207,12,'#718066');box(51,192,30,30,8,palette[state.next][0]);text(state.next,66,207,19,'#36533a','700','center');
    button(state.energy===3?'换牌 ⇄':'蓄能 '+state.energy+'/3',94,191,101,32,()=>{if(animation||state.energy<3)return;previous=JSON.parse(JSON.stringify(state));state.next=state.next===2?4:2;state.energy=0;flash=0;save();render();},true,state.energy<3||!!animation);text(state.combo>1?state.combo+' 连合 · '+state.steps+' 步':state.steps+' 步',358,207,12,'#8a9582','400','right');
    const maximum=Math.max(...state.board), progress=Math.min(Math.log2(maximum)/11,1);
    box(0,229,358,5,2,'#e1e6d9');box(0,229,358*progress,5,2,'#86a36f');
    box(0,254,358,358,22,'#cbd4bf');
    for(let i=0;i<16;i++)box(10+(i%4)*87,264+Math.floor(i/4)*87,77,77,12,'#dde3d4');
    const tile=(value,x,y,size=1)=>{const colors=palette[value]||['#375d43','#fff'];ctx.save();ctx.translate(x+38.5,y+38.5);ctx.scale(size,size);box(-38.5,-38.5,77,77,12,colors[0]);text(value,0,0,value>=1024?27:value>=128?30:36,colors[1],'700','center');ctx.restore();};
    if(animation && animation.phase==='move') {
      const t=Math.min(1,(Date.now()-animation.time)/110), eased=1-Math.pow(1-t,3);
      animation.tracks.forEach(v=>{const x=(v.from%4)+(v.to%4-v.from%4)*eased,y=Math.floor(v.from/4)+(Math.floor(v.to/4)-Math.floor(v.from/4))*eased;tile(v.value,10+x*87,264+y*87);});
    } else state.board.forEach((value,i)=>{if(!value)return;const t=animation?Math.min(1,(Date.now()-animation.time-110)/90):1;let zoom=1;if(animation&&animation.merges.includes(i))zoom=1+.13*Math.sin(Math.PI*t);else if(animation&&i===animation.spawn)zoom=.7+.3*t;tile(value,10+(i%4)*87,264+Math.floor(i/4)*87,zoom);});
    text(flash?'+'+flash+' 分 · 漂亮的合并！':'↑  ↓  ←  →   滑动棋盘，合并相同数字',179,634,12,'#89957f','400','center');
    button('↶  撤销一步',0,659,172,44,()=>{if(animation)return;if(previous){state=previous;previous=null;modal='';flash=0;save();render();}},false,!previous);
    button('再来一局',184,659,174,44,()=>{if(animation)return;modal='restart';queued=null;render();},true);
    text('每次合并蓄能 +1 · 满 3 格可切换下一块',179,724,11,'#929c89','400','center');
    if(modal) drawModal();
  }
  function drawModal() {
    buttons=[];ctx.fillStyle='rgba(42,57,39,.48)';ctx.fillRect(-ox/scale,-oy/scale,canvas.width/scale,canvas.height/scale);
    const help=modal==='help';box(12,help?234:310,334,help?340:245,24,'#fffdf7');
    const title={help:'合成，从容一点',restart:'开启一局新挑战？',win:'你合成了 2048！',over:'这一局，已经很棒了'}[modal];text(title,179,help?270:349,22,'#36533a','700','center');
    if(help){['上下左右滑动，相同数字碰撞后翻倍。','下一块提前预告，落点仍然随机。','合成 2048 即通关，还能继续挑战。','────────  通关小诀窍  ────────','① 最大数字固定在同一个角落。','② 沿边排列，尽量保持从大到小。','③ 多留空格，避免频繁反向滑动。','④ 每次合并蓄能，满 3 格可换 2 / 4。'].forEach((s,i)=>text(s,34,309+i*25,12,'#718066'));button('知道了，开始合成',34,526,290,32,()=>{modal='';render();},true);}
    else {text(modal==='restart'?'当前棋盘将清空，历史最佳会保留。':'本局得分 '+state.score+'  ·  共走了 '+state.steps+' 步',179,396,13,'#819076','400','center');button(modal==='restart'?'开启新局':'再来一局',34,435,290,44,fresh,true);button(modal==='win'?'继续挑战 4096':modal==='over'&&previous?'撤销一步，继续挑战':'返回棋盘',34,489,290,40,()=>{if(modal==='win')state.continued=true;if(modal==='over'&&previous){state=previous;previous=null;}modal='';save();render();});}
  }
  function tick() {
    if(!animation)return;
    const elapsed=Date.now()-animation.time;
    animation.phase=elapsed<110?'move':'pop';
    if(elapsed>=200){const pending=animation.modal;animation=null;modal=pending;render();const direction=queued;queued=null;if(direction&&!modal)slide(direction);}
    else {render();P.frame(tick);}
  }
  function slide(direction) {
    if(modal)return;if(animation){queued=direction;return;}
    const result=C.move(state.board,direction);if(!result.changed)return;
    previous=JSON.parse(JSON.stringify(state));state.board=result.board;
    const slots=state.board.map((v,i)=>v?-1:i).filter(i=>i>=0), index=slots[Math.floor(Math.random()*slots.length)];
    state.board[index]=state.next;state.next=nextValue();state.score+=result.gain;state.steps++;flash=result.gain;
    state.combo=result.gain?state.combo+1:0;if(result.gain)state.energy=Math.min(3,state.energy+1);
    best=Math.max(best,state.score);const pending=state.board.includes(2048)&&!state.continued?'win':C.over(state.board)?'over':'';
    animation={tracks:result.tracks,merges:result.merges,spawn:index,time:Date.now(),phase:'move',modal:pending};save();render();P.frame(tick);
  }
  function gesture(x,y) {
    if(!start||start.consumed)return;
    const dx=x-start.rawX,dy=y-start.rawY, distance=Math.max(Math.abs(dx),Math.abs(dy));
    if(distance<18 || Math.max(Math.abs(dx),Math.abs(dy))<Math.min(Math.abs(dx),Math.abs(dy))*1.15)return;
    start.consumed=true;if(start.board)slide(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up');
  }
  P.touch(canvas,(x,y)=>{if(start)return;const px=(x-ox)/scale,py=(y-oy)/scale;start={x:px,y:py,rawX:x,rawY:y,consumed:false,board:py>=254&&py<=612&&px>=0&&px<=358};},(x,y)=>{
    if(!start)return;gesture(x,y);const p={x:(x-ox)/scale,y:(y-oy)/scale};
    if(!start.consumed&&Math.hypot(x-start.rawX,y-start.rawY)<18){const b=buttons.find(b=>start.x>=b.x&&start.x<=b.x+b.w&&start.y>=b.y&&start.y<=b.y+b.h&&p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h);if(b)b.action();}start=null;
  },()=>{start=null;},gesture);
  if(!P.native){addEventListener('resize',render);addEventListener('keydown',e=>{const d={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',a:'left',d:'right',w:'up',s:'down'}[e.key];if(d){e.preventDefault();slide(d);}});}
  else {if(P.native.onWindowResize)P.native.onWindowResize(render);if(P.native.onHide)P.native.onHide(save);}
  render();
})(typeof globalThis !== 'undefined' ? globalThis : this);
