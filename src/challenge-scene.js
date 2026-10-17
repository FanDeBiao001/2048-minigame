(function(root){
  const L=typeof module!=='undefined'?require('./challenge-core'):root.ChallengeCore;
  const R=typeof module!=='undefined'?require('./relax-core'):root.RelaxCore;
  const U=typeof module!=='undefined'?require('./skill-ui'):root.SkillUI;
  const COLORS=['#b99b5e','#83a67d','#7c9fae','#b495a1','#a7b97e','#b99d7e'];
  const STAGE={x:12,y:154,w:334,h:360};
  function copy(v){if(ArrayBuffer.isView(v))return new v.constructor(v);if(Array.isArray(v))return v.map(copy);if(v&&typeof v==='object'){const o={};Object.keys(v).forEach(k=>o[k]=copy(v[k]));return o;}return v;}
  function create({ctx,canvas,platform:P,clock,onChange,onBack,onFree,reducedMotion=false}){
    let mode=null,page='levels',index=0,game=null,layout=null,buttons=[],pointer=null,drag=null,selected=0,rotation=0,paused=false,tool='paint',color=0,lastStep=null,motion=null,history=[],message='',done=false,pendingCheck=false,release=null,steps=0,undos=0,surface=null,surfaceContext=null,pixels=null,surfaceTried=false;
    const raw=P.read('2048-challenges-v1'),progress={},selectedLevels={},attempts={};
    for(const id of ['chain','storage','magnet']){const a=raw&&raw.attempts&&raw.attempts[id]||raw&&raw.attempt&&raw.attempt.mode===id&&raw.attempt;if(a&&Number.isInteger(a.index)&&a.index>=0&&a.index<L.LEVELS[id].length&&JSON.stringify(a).length<12000)attempts[id]=a;}
    Object.keys(L.LEVELS).forEach(id=>{
      const records=raw&&raw.progress&&raw.progress[id];progress[id]=L.LEVELS[id].map((_,i)=>{const r=Array.isArray(records)&&records[i];return r&&Number.isInteger(r.stars)&&r.stars>=1&&r.stars<=3&&Number.isInteger(r.best)&&r.best>=0&&r.best<=100000?{stars:r.stars,best:r.best}:null;});
      const v=raw&&raw.selected&&raw.selected[id];selectedLevels[id]=Number.isInteger(v)&&v>=0&&v<L.LEVELS[id].length?v:0;
    });
    const level=()=>L.LEVELS[mode][index],heavy=()=>['sand','fluid','soft'].includes(mode);
    function save(){const attempt=mode&&page==='play'&&!heavy()?{mode,index,game:copy(game),moves:steps,undos}:null;if(attempt)attempts[mode]=attempt;P.write('2048-challenges-v1',{version:1,progress,selected:selectedLevels,attempt,attempts});}
    function box(x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();ctx.fill();}
    function text(s,x,y,size=14,c='#405b43',weight='400',align='left'){ctx.fillStyle=c;ctx.font=weight+' '+size+'px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(String(s),x,y);}
    function line(x,y,xx,yy,c,w=2){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.stroke();}
    function button(label,x,y,w,h,action,dark=false){box(x,y,w,h,12,dark?'#456550':'#e5eadf');text(label,x+w/2,y+h/2,13,dark?'#fffdf5':'#526650','600','center');buttons.push({x,y,w,h,action});}
    const inside=(p,b)=>p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h;
    const point=(x,y)=>layout?{x:(x-layout.ox)/layout.scale,y:(y-layout.oy)/layout.scale}:{x,y};
    function stop(){if(mode==='soft'&&game)game.drag=null;pointer=null;drag=null;lastStep=null;pendingCheck=false;release=null;motion=null;}
    function open(id){stop();mode=id;page='levels';index=selectedLevels[id];onChange();}
    function close(){stop();mode=null;}
    function map(){stop();page='levels';paused=false;save();onChange();}
    function restoreAttempt(){
      const a=attempts[mode],l=level();if(!a||a.mode!==mode||a.index!==index||!a.game||!Number.isInteger(a.moves)||a.moves<0||a.moves>100000)return;
      const g=a.game;let valid=false;
      if(mode==='chain')valid=Array.isArray(g.board)&&g.board.length===16&&g.board.every((v,i)=>l.board[i]===-1?v===-1:v===0||(Number.isSafeInteger(v)&&v>=2&&v<=l.target&&Number.isInteger(Math.log2(v))))&&g.board.reduce((n,v)=>n+Math.max(0,v),0)<=l.board.reduce((n,v)=>n+Math.max(0,v),0);
      if(mode==='magnet'){
        if(Array.isArray(g.ports)&&g.ports.length===l.ports.length&&g.ports.every(v=>Number.isInteger(v)&&v>=0&&v<=15)){
          const canonical=v=>Math.min(...[0,1,2,3].map(n=>L.rotatePorts(v,n))),sort=a=>a.map(canonical).sort((a,b)=>a-b).join(',');valid=sort(g.ports)===sort(l.ports)&&l.fixed.every(id=>g.ports[id]===l.ports[id]);
        }
      }
      if(mode==='storage'&&Array.isArray(g.placed)&&g.placed.length===l.pieces.length){let placed=l.pieces.map(()=>null);valid=true;const ids=[...(l.entry||[]),...l.pieces.map((_,id)=>id).filter(id=>!(l.entry||[]).includes(id))];for(const id of ids){const p=g.placed[id];if(p===null)continue;if(!p||!Number.isInteger(p.rot)||p.rot<0||p.rot>3){valid=false;break;}const r=L.storageCheck(l,placed,id,p.x,p.y,p.rot);if(!r.ok){valid=false;break;}placed=r.placed;}}
      if(valid){game=copy(g);steps=a.moves;undos=Number.isInteger(a.undos)&&a.undos>=0?a.undos:0;message='已恢复上次摆到的位置';}
    }
    function start(i,restore=true){stop();page='play';index=i;selectedLevels[mode]=i;steps=0;undos=0;history=[];selected=0;rotation=0;paused=false;done=false;message='';tool='paint';const l=level();
      if(mode==='chain')game={board:l.board.slice()};if(mode==='storage')game={placed:l.pieces.map(()=>null)};if(mode==='magnet')game={ports:l.ports.slice()};if(mode==='sand')game=L.createSand(l);if(mode==='fluid')game=L.createFluid(l);if(mode==='soft')game=L.createSoft(l);
      color=mode==='sand'?l.layers[0][0]:0;if(restore&&!heavy())restoreAttempt();if(mode==='storage'){const next=game.placed.findIndex(p=>!p);selected=next<0?0:next;rotation=game.placed[selected]?game.placed[selected].rot:0;}check(false);save();onChange();
    }
    function snapshot(){history.push({game:copy(game),steps,selected,rotation});if(history.length>(heavy()?3:12))history.shift();}
    function undo(){if(!history.length){message='还没有可撤销的操作';onChange();return;}stop();const h=history.pop();game=h.game;if(mode==='soft')game.drag=null;steps=h.steps;selected=h.selected;rotation=h.rotation;undos++;done=false;paused=false;message='已撤销，换个思路再试';save();onChange();}
    function metric(){return mode==='sand'?game.spent:mode==='fluid'?game.used:steps;}
    function finish(){if(done)return;done=true;pointer=null;if(mode==='soft')game.drag=null;paused=true;const n=metric(),l=level(),par=mode==='sand'?l.par*1.15:mode==='fluid'?l.quota*.8:l.par,stars=n<=par?(undos===0?3:2):1,old=progress[mode][index];progress[mode][index]={stars:Math.max(stars,old?old.stars:0),best:Math.min(n,old?old.best:Infinity)};message='收得刚刚好 · '+ '★'.repeat(stars);save();}
    function check(notify=true){if(page!=='play')return;const l=level();let complete=false;
      if(mode==='chain')complete=game.board.every(v=>v<=0);if(mode==='storage')complete=game.placed.every(Boolean);if(mode==='magnet')complete=L.magnetCheck(l,game.ports).complete;
      if(mode==='sand')complete=L.sandGoal(game,l).complete;if(mode==='fluid')complete=L.fluidGoal(game,l).complete;if(mode==='soft')complete=L.softGoal(game,l).complete;
      if(complete)finish();else if(notify){message=mode==='sand'?sandFailure():mode==='fluid'?'还差一些颜色覆盖，注意纯色与留白':mode==='soft'?'把同色软团完整放入盒内，再检查一次':'继续整理，每一步都可以撤销';}
      if(notify)onChange();return complete;
    }
    function sandFailure(){const l=level(),s=game;if(l.maxChanges&&s.changes>l.maxChanges)return '调整次数超出目标，可撤销上一轮或重来';const result=L.sandGoal(s,l),id=result.bins.findIndex(b=>!b.ok),b=result.bins[id];if(!b)return '再对照色层和刻度调整';return (id+1)+'号瓶'+(b.count>b.total*1.14?'装得太满，可撤销后少倒一些':b.count<b.total*.92?'还没到刻度'+(s.spent>=l.quota?'，材料用完了，可撤销重试':'，继续加一点'):'色层不符，按目标从底到顶换色');}
    function requestCheck(){if(mode==='soft'&&release){pendingCheck=true;message='等软团放稳后，自动检查';onChange();}else if(mode==='sand'&&game.active){pendingCheck=true;paused=false;message='等彩砂落稳后，自动检查';onChange();}else check();}
    function slide(dir){if(mode!=='chain'||page!=='play'||done||motion)return;const r=L.chainMove(game.board,dir,level());if(!r.changed){message='这个方向没有变化';onChange();return;}snapshot();steps++;game.board=r.board;if(!reducedMotion)motion={time:clock(),waves:r.waves,duration:r.waves.length*220};message=r.collected?'目标已收走，继续清空':'连合 '+r.waves.filter(w=>w.gain).length+' 次';check(false);save();onChange();}
    function grid(){const l=level(),cell=mode==='magnet'?Math.min(82,326/l.cols):Math.min(l.rows>=4?58:78,326/l.cols);return {cell,x:(358-l.cols*cell)/2,y:mode==='magnet'?180:172,w:l.cols*cell,h:l.rows*cell};}
    function bankY(){const g=grid();return Math.max(400,g.y+g.h+50);}
    function pieceRect(id){const g=grid(),p=game.placed[id];if(p)return {x:g.x+p.x*g.cell,y:g.y+p.y*g.cell,cell:g.cell,rot:p.rot};const rot=selected===id?rotation:0,cells=L.shape(level().pieces[id],rot),w=Math.max(...cells.map(p=>p[0]))+1,h=Math.max(...cells.map(p=>p[1]))+1;return {x:6+id%3*116+(112-w*20)/2,y:bankY()+Math.floor(id/3)*83+(58-h*20)/2,cell:20,rot};}
    function selectPiece(id){if(selected!==id)rotation=game.placed[id]?game.placed[id].rot:0;selected=id;const edge=(level().edges||{})[id],entry=(level().entry||[]).includes(id);message=edge?'需贴'+({top:'上',bottom:'下',left:'左',right:'右'}[edge])+'边'+(entry?'，上方装入通道须空出':'，可旋转后放置'):entry?'从上方装入，先留出竖直通道':'选好了，可拖动或点击抽屉格放入';}
    function place(id,x,y,rot){const r=L.storageCheck(level(),game.placed,id,x,y,rot);if(r.ok){snapshot();game.placed=r.placed;steps++;message='轻轻放好了一件';const next=game.placed.findIndex(p=>!p);selected=next<0?id:next;rotation=game.placed[selected]?game.placed[selected].rot:0;check(false);save();}else message=r.reason;}
    function down(x,y){const p=point(x,y),hit=buttons.find(b=>inside(p,b));pointer={...p,startX:p.x,startY:p.y,button:hit||null,consumed:false,dx:0,dy:0};if(hit||page!=='play'||done)return;
      if(mode==='storage'){
        const g=grid();
        for(let id=0;id<level().pieces.length;id++)if(!game.placed[id]&&inside(p,{x:6+id%3*116,y:bankY()-9+Math.floor(id/3)*83,w:112,h:78})){selectPiece(id);drag={id,x:p.x,y:p.y,ox:.5,oy:.5,bank:true};onChange();return;}
        for(let id=level().pieces.length-1;id>=0;id--){const pos=pieceRect(id);if(L.shape(level().pieces[id],pos.rot).some(([xx,yy])=>inside(p,{x:pos.x+xx*pos.cell,y:pos.y+yy*pos.cell,w:pos.cell,h:pos.cell}))){selectPiece(id);drag={id,x:p.x,y:p.y,ox:(p.x-pos.x)/pos.cell,oy:(p.y-pos.y)/pos.cell,bank:!game.placed[id]};onChange();return;}}
        if(inside(p,g))place(selected,Math.floor((p.x-g.x)/g.cell),Math.floor((p.y-g.y)/g.cell),rotation);
      }
      if(mode==='magnet'){const g=grid();if(inside(p,g))pointer.id=Math.floor((p.y-g.y)/g.cell)*level().cols+Math.floor((p.x-g.x)/g.cell);}
      if(!paused&&heavy()&&inside(p,STAGE)){snapshot();if(mode==='soft'){const id=R.softHit(game,p.x-STAGE.x,p.y-STAGE.y);if(id>=0){selected=id;release=null;game.bodies[id].parked=false;game.bodies[id].stowed=false;game.drag={id,x:p.x-STAGE.x,y:p.y-STAGE.y};game.active=true;game.idle=0;game.quiet=0;game.touched=true;steps++;}}}
      onChange(heavy());
    }
    function move(x,y){if(!pointer||pointer.button||page!=='play'||done)return;const p=point(x,y);pointer.dx=Math.max(-8,Math.min(8,(p.x-pointer.x)/6));pointer.dy=Math.max(-8,Math.min(8,(p.y-pointer.y)/6));pointer.x=p.x;pointer.y=p.y;
      if(mode==='chain'&&!pointer.consumed&&inside({x:pointer.startX,y:pointer.startY},{x:0,y:154,w:358,h:358})&&Math.max(Math.abs(p.x-pointer.startX),Math.abs(p.y-pointer.startY))>18){pointer.consumed=true;slide(Math.abs(p.x-pointer.startX)>Math.abs(p.y-pointer.startY)?p.x>pointer.startX?'right':'left':p.y>pointer.startY?'down':'up');}
      if(drag){drag.x=p.x;drag.y=p.y;}
      if(mode==='soft'&&!paused&&game.drag){game.drag.x=Math.max(0,Math.min(334,p.x-STAGE.x));game.drag.y=Math.max(0,Math.min(360,p.y-STAGE.y));game.active=true;}
      onChange(heavy());
    }
    function up(x,y){if(!pointer)return;const p=point(x,y),pressed=pointer.button;if(pressed){pointer=null;if(inside(p,pressed))pressed.action();return;}move(x,y);
      if(page==='play'&&!done){
        if(mode==='storage'&&drag){if(Math.hypot(p.x-pointer.startX,p.y-pointer.startY)>8){const g=grid();place(drag.id,Math.round((p.x-g.x)/g.cell-drag.ox),Math.round((p.y-g.y)/g.cell-drag.oy),rotation);}drag=null;}
        if(mode==='magnet'&&pointer.id!==undefined){const g=grid(),id=pointer.id,j=inside(p,g)?Math.floor((p.y-g.y)/g.cell)*level().cols+Math.floor((p.x-g.x)/g.cell):-1,fixed=level().fixed;
          if(!fixed.includes(id)&&game.ports[id]&&j>=0&&!fixed.includes(j)){snapshot();if(j===id)game.ports[id]=L.rotatePorts(game.ports[id]);else [game.ports[id],game.ports[j]]=[game.ports[j],game.ports[id]];steps++;message=j===id?'旋转了一个端口':'两片磁片已交换';check(false);save();}else message='起点与终点是固定锚点';
        }
        if(mode==='soft'&&game.drag)release={id:game.drag.id,until:clock()+320};
      }
      pointer=null;onChange();
    }
    function cancel(){if(mode==='soft'&&game)game.drag=null;pointer=null;drag=null;release=null;lastStep=null;if(mode)save();}
    function animating(){if(!mode||page!=='play')return false;if(motion)return true;if(paused||done)return false;const held=pointer&&!pointer.button&&inside(pointer,STAGE);
      return mode==='sand'?game.active||held&&game.spent<level().quota:mode==='fluid'?game.activity>0||held&&(tool!=='paint'||game.ink>0):mode==='soft'?game.active:false;
    }
    function update(now,fps=60){if(!animating())return false;const interval=1000/(heavy()?Math.min(30,fps):fps);if(lastStep!==null&&now-lastStep<interval-.5)return false;lastStep=now;
      if(motion&&now-motion.time>=motion.duration)motion=null;
      const held=pointer&&!pointer.button&&inside(pointer,STAGE);
      if(!paused&&!done){if(mode==='sand'){if(held)L.doseSand(game,level());R.stepSand(game);if(pendingCheck&&!game.active){pendingCheck=false;check(false);if(!done)message=sandFailure();}}
        if(mode==='fluid'){if(held)L.paintFluid(game,level(),(pointer.x-STAGE.x)/334*40,(pointer.y-STAGE.y)/360*48,pointer.dx,pointer.dy,color,tool);if(pointer){pointer.dx=0;pointer.dy=0;}R.stepFluid(game);}
        if(mode==='soft'){R.stepSoft(game);R.stepSoft(game);if(release&&now>=release.until){const id=release.id;release=null;game.drag=null;if(L.softGoal(game,level()).fits[id]){game.bodies[id].stowed=true;for(const n of game.bodies[id].nodes){n.px=n.x;n.py=n.y;}message='已安放，再次拖动可调整位置';}if(pendingCheck){pendingCheck=false;check(false);if(!done)message='还有软团未完整进入同色盒，可再调整';}}}}
      return true;
    }
    function drawLevels(){const meta=R.MODES.find(m=>m.id===mode),levels=L.LEVELS[mode];text('解压小屋 · 关卡挑战',0,16,12,'#72816a');button('玩法列表',274,0,84,34,()=>{close();onBack();});text(meta.name,0,65,30,meta.color,'750');text(levels.length+' 关 · 无倒计时 · 支持撤销',0,111,12,'#67785f');button('自由体验',250,94,108,34,()=>{const id=mode;close();onFree(id);});
      levels.forEach((l,i)=>{const x=i%3*124,y=160+Math.floor(i/3)*108,record=progress[mode][i],active=i===selectedLevels[mode];box(x,y,110,94,15,active?'#dbe5d1':'#e9ecdf');text(String(i+1).padStart(2,'0'),x+13,y+21,19,meta.color,'700');text(L.band(i,levels.length),x+97,y+21,10,'#7d866f','400','right');text(l.name,x+13,y+49,12,'#4d634b','600');text(record?'★'.repeat(record.stars):'待整理',x+13,y+75,12,record?'#aa894b':'#87917b');buttons.push({x,y,w:110,h:94,action:()=>start(i)});});
      const passed=progress[mode].filter(Boolean).length;text('已完成 '+passed+' / '+levels.length+' 关',0,620,14,'#536a4d','600');text('教学 → 常规 → 进阶 → 挑战',0,651,12,'#748068');text('关卡均可直接体验，挑战更省步数与材料',0,677,12,'#748068');button('继续第 '+(selectedLevels[mode]+1)+' 关',0,710,358,46,()=>start(selectedLevels[mode]),true);
    }
    function chainBoard(){const l=level(),a=motion;box(0,154,358,358,20,'#cbd6c0');
      for(let i=0;i<16;i++){const x=9+i%4*87,y=163+Math.floor(i/4)*87;box(x,y,79,79,12,l.board[i]===-1?'#a9b09d':(l.exits||[]).includes(i)?'#d9c99d':'#e1e7d8');if(l.board[i]===-1)text('石',x+39,y+39,18,'#76816d','600','center');if((l.exits||[]).includes(i))text('出口',x+39,y+64,10,'#9d8353','500','center');}
      function tile(v,i,size=1){const x=9+(i%4)*87,y=163+Math.floor(i/4)*87;drawTile(v,x,y,size);}
      function drawTile(v,x,y,s=1){ctx.save();ctx.translate(x+39.5,y+39.5);ctx.scale(s,s);box(-39,-39,78,78,12,v>=16?'#c4a669':v>=8?'#a9c38b':v>=4?'#d2ddb7':'#eeeade');text(v,0,0,30,'#405d3c','700','center');ctx.restore();}
      if(a){const age=clock()-a.time,j=Math.min(a.waves.length-1,Math.floor(age/220)),wave=a.waves[j],t=Math.min(1,(age-j*220)/150),e=1-Math.pow(1-t,3);if(t<1)wave.tracks.forEach(v=>{drawTile(v.value,9+(v.from%4+(v.to%4-v.from%4)*e)*87,163+(Math.floor(v.from/4)+(Math.floor(v.to/4)-Math.floor(v.from/4))*e)*87);});else{wave.board.forEach((v,i)=>{if(v>0)tile(v,i);});wave.taken.forEach(i=>tile(l.target,i,Math.max(0,1-(age-j*220-150)/70)));}}
      else game.board.forEach((v,i)=>{if(v>0)tile(v,i);});
      text((l.exits?'合成 '+l.target+'，送到金色出口':'合成 '+l.target+' 即收走')+' · 清空全部牌',179,545,13,'#6b7558','500','center');text('已用 '+steps+' 步 · 三星参考 ≤ '+l.par+' 步且不撤销',179,574,12,'#7c856d','400','center');
    }
    function storageBoard(){const l=level(),g=grid();box(g.x-7,g.y-7,g.w+14,g.h+14,16,'#d3d6c4');for(let i=0;i<l.cols*l.rows;i++)box(g.x+i%l.cols*g.cell+2,g.y+Math.floor(i/l.cols)*g.cell+2,g.cell-4,g.cell-4,8,(l.blocked||[]).includes(i)?'#a8ac9b':'#edf0e4');
      l.pieces.forEach((name,id)=>{const p=pieceRect(id),s=L.shape(name,p.rot);if(!game.placed[id]){box(6+id%3*116,bankY()-9+Math.floor(id/3)*83,112,78,11,selected===id?'#d8e2cc':'#eceee2');text((l.edges||{})[id]?'贴'+({top:'上',bottom:'下',left:'左',right:'右'}[l.edges[id]])+'边'+((l.entry||[]).includes(id)?' · 上方入':''):(l.entry||[]).includes(id)?'从上方装入':'可旋转',13+id%3*116,bankY()+59+Math.floor(id/3)*83,10,'#7d836e');}
        s.forEach(([x,y])=>box(p.x+x*p.cell+1,p.y+y*p.cell+1,p.cell-2,p.cell-2,Math.min(8,p.cell/4),COLORS[id]));if(game.placed[id]&&selected===id){text('•',p.x+g.cell/2,p.y+g.cell/2,18,'#fff','700','center');}
      });
      if(drag&&Math.hypot(drag.x-pointer.startX,drag.y-pointer.startY)>8){ctx.save();ctx.globalAlpha=.7;L.shape(l.pieces[drag.id],rotation).forEach(([x,y])=>box(drag.x+(x-drag.ox)*g.cell+1,drag.y+(y-drag.oy)*g.cell+1,g.cell-2,g.cell-2,8,COLORS[drag.id]));ctx.restore();}
      text('拖入拼合，也可选物件后点格子 · 无固定答案',179,bankY()-29,12,'#6b755c','400','center');button('旋转选中 ↻',0,626,173,36,()=>{if(done)return;rotation=(rotation+1)%4;message='转了 90°，点格子或拖入即可放置';onChange();});button('拿回选中',185,626,173,36,()=>{if(done)return;if(game.placed[selected]){snapshot();game.placed[selected]=null;steps++;done=false;paused=false;save();}onChange();});
    }
    function magnetBoard(){const l=level(),g=grid(),check=L.magnetCheck(l,game.ports);box(g.x-7,g.y-7,g.w+14,g.h+14,17,'#d8e2df');game.ports.forEach((mask,i)=>{const x=g.x+i%l.cols*g.cell,y=g.y+Math.floor(i/l.cols)*g.cell,cx=x+g.cell/2,cy=y+g.cell/2,fixed=l.fixed.includes(i),lit=check.connected.has(i);box(x+3,y+3,g.cell-6,g.cell-6,13,!mask?'#e9eee6':lit?'#819e8b':'#9aafb5');if(mask){const c=lit?'#f3e4ac':'#edf1e8';[[1,0,-1],[2,1,0],[4,0,1],[8,-1,0]].forEach(([bit,dx,dy])=>{if(mask&bit)line(cx,cy,cx+dx*(g.cell/2-5),cy+dy*(g.cell/2-5),c,7);});box(cx-6,cy-6,12,12,6,c);if(fixed)text(i===l.source?'起':'终',cx,cy+21,11,'#fffdf3','700','center');}});
      text('点击旋转 · 拖到另一片交换 · 起终点固定',179,510,12,'#60766a','400','center');text('接通 '+check.connected.size+' / '+game.ports.filter(Boolean).length+' 片 · 未对齐端口 '+check.leaks,179,549,13,'#557364','600','center');text('所有端口相互咬合，整张磁网才算归位',179,579,12,'#7d8978','400','center');
    }
    function palette(y){COLORS.slice(0,3).forEach((c,i)=>{box(i*122,y,114,34,11,color===i?'#d5e0ca':'#e7ebdf');box(i*122+9,y+9,16,16,6,c);text(['麦金','苔绿','雾蓝'][i],i*122+70,y+17,12,'#52664d','500','center');buttons.push({x:i*122,y,w:114,h:34,action:()=>{if(mode==='sand'&&game.color!==i){game.color=i;game.changes++;}color=i;onChange();}});});}
    function sandBoard(){const l=level(),s=game;box(12,154,334,360,15,'#ece8db');const cell=334/84,sy=360/104;
      for(let c=1;c<=3;c++){ctx.fillStyle=COLORS[c-1];ctx.beginPath();for(let i=0;i<s.cells.length;i++)if(s.cells[i]===c)ctx.rect(12+i%84*cell,154+Math.floor(i/84)*sy,cell,sy);ctx.fill();}
      l.bins.forEach(([left,right],id)=>{const x=12+left*cell,w=(right-left)*cell,y=154+48*sy;line(x,y,x,511,'#aaa68f');line(x+w,y,x+w,511,'#aaa68f');line(x,511,x+w,511,'#aaa68f');const goalY=511-l.layers[id].length*l.dose/(right-left-1)*sy;line(x+2,goalY,x+15,goalY,'#8b835f');text(id+1,x+w/2,y-15,12,'#7e8069','600','center');button((id===s.route?'↓ ':'')+(id+1)+'号瓶',id*(358/l.bins.length),525,358/l.bins.length-6,32,()=>{if(s.route!==id){s.route=id;s.changes++;}onChange();},id===s.route);});
      const [left,right]=l.bins[s.route],nozzle=12+(left+right)/2*cell;line(nozzle,165,nozzle,182,COLORS[color],6);text('按住此区域落砂',179,210,12,'#8b8974','400','center');
      const r=L.sandGoal(s,l);l.layers.forEach((layers,id)=>{const x=id*(358/l.bins.length),w=358/l.bins.length;text((id+1)+'号 · '+Math.round(r.bins[id].count/r.bins[id].total*100)+'%',x+w/2,577,11,r.bins[id].ok?'#4f7857':'#7c806a','600','center');layers.forEach((c,j)=>box(x+w/2-layers.length*12+j*24,590,21,13,4,COLORS[c]));});
      text('色层顺序：左→右 = 底→顶 · 剩余砂 '+(l.quota-s.spent),179,620,11,'#748067','400','center');palette(638);text((l.maxChanges?'阀/色调整 '+s.changes+'/'+l.maxChanges+' · ':'')+'容量目标 92–114%',179,127,11,l.maxChanges&&s.changes>l.maxChanges?'#a16655':'#8a7e60','400','center');
    }
    function fluidBoard(){const s=game,w=40,h=48;if(!surfaceTried){surfaceTried=true;try{surface=P.surface&&P.surface(w,h);surfaceContext=surface&&surface.getContext('2d');if(surfaceContext&&surfaceContext.createImageData&&surfaceContext.putImageData&&ctx.drawImage)pixels=surfaceContext.createImageData(w,h);}catch(_){pixels=null;}}
      const inks=[[185,155,94],[131,166,125],[124,159,174]],base=[232,238,226];box(12,154,334,360,15,'#e8eee2');
      if(pixels){for(let i=0;i<w*h;i++){const total=s.dye[0][i]+s.dye[1][i]+s.dye[2][i],strength=Math.min(.92,total*.85);for(let c=0;c<3;c++){const mixed=total?s.dye.reduce((n,d,j)=>n+d[i]*inks[j][c],0)/total:base[c];pixels.data[i*4+c]=base[c]+(mixed-base[c])*strength;}pixels.data[i*4+3]=255;}surfaceContext.putImageData(pixels,0,0);ctx.save();box(12,154,334,360,15,'#e8eee2');ctx.clip();ctx.imageSmoothingEnabled=true;ctx.drawImage(surface,12,154,334,360);ctx.restore();}
      else{for(let c=0;c<3;c++)for(let band=1;band<=6;band++){ctx.save();ctx.globalAlpha=band/8;ctx.fillStyle=COLORS[c];ctx.beginPath();for(let i=0;i<w*h;i++)if(Math.min(6,Math.ceil(s.dye[c][i]*6))===band)ctx.rect(12+i%w*334/w,154+Math.floor(i/w)*360/h,334/w+.2,360/h+.2);ctx.fill();ctx.restore();}}
      const r=L.fluidGoal(s,level());if(level().regions.some(r=>r.protect))text('留白区至少 88% 保持干净',179,127,11,'#7d866e','400','center');level().regions.forEach((region,i)=>{const x=12+region.x*334/40,y=154+region.y*360/48,ww=region.w*334/40,hh=region.h*360/48,c=region.protect?'#7f8075':COLORS[region.color];line(x,y,x+ww,y,c,1.5);line(x,y,x,y+hh,c,1.5);line(x+ww,y,x+ww,y+hh,c,1.5);line(x,y+hh,x+ww,y+hh,c,1.5);text((region.protect?'留白 ':['麦金 ','苔绿 ','雾蓝 '][region.color])+Math.round(r.regions[i].ratio*100)+'%',x+ww/2,y+12,10,'#526750','600','center');});
      text('色区覆盖 ≥ '+Math.round(level().coverage*100)+'% · 纯色占比 ≥ 64%',179,539,12,'#6a7b64','400','center');text('剩余颜料 '+s.ink+' / '+level().quota+' · 留白区须保持干净',179,565,12,'#718069','400','center');palette(590);['paint','push','erase'].forEach((t,i)=>button(['染色','推流','吸走'][i],i*122,638,114,34,()=>{tool=t;onChange();},tool===t));
    }
    function softBoard(){const l=level(),r=L.softGoal(game,l);box(12,154,334,360,15,'#ebe7df');l.cups.forEach((cup,id)=>{box(12+cup.x,154+cup.y,cup.w,cup.h,9,'#e0dfd2');ctx.save();ctx.globalAlpha=.16;box(12+cup.x,154+cup.y,cup.w,cup.h,9,COLORS[id]);ctx.restore();text(['麦金盒','苔绿盒','雾蓝盒'][id],12+cup.x+cup.w/2,154+cup.y-15,11,'#63735a','600','center');text(r.fits.filter((v,j)=>l.items[j].cup===id&&v).length+' / '+l.items.filter(item=>item.cup===id).length,12+cup.x+cup.w/2,154+cup.y+30,12,COLORS[id],'700','center');});game.obstacles.forEach(o=>box(12+o.x,154+o.y,o.w,o.h,3,'#bdc2af'));
      game.bodies.forEach((b,id)=>{const nodes=b.nodes;ctx.save();ctx.translate(12,154);ctx.fillStyle=COLORS[b.color];ctx.strokeStyle=id===selected?'#faf7e9':'#d5ddca';ctx.lineWidth=id===selected?3:1;ctx.beginPath();const first=nodes[0],last=nodes[nodes.length-1];ctx.moveTo((first.x+last.x)/2,(first.y+last.y)/2);nodes.forEach((n,j)=>{const next=nodes[(j+1)%nodes.length];ctx.quadraticCurveTo(n.x,n.y,(n.x+next.x)/2,(n.y+next.y)/2);});ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();});
      text('从盒口放入同色盒 · 放稳会安放，再抓可调整',179,544,12,'#74806a','400','center');text('已完整装入 '+r.fits.filter(Boolean).length+' / '+l.items.length+' 个',179,574,13,'#5b735a','600','center');button('旋转选中软团 ↻',0,623,358,40,()=>{if(done)return;snapshot();game.bodies[selected].stowed=false;L.rotateSoft(game,selected);game.touched=true;steps++;onChange();});
    }
    function render(info,dpr){layout=U.fit(info,!!P.native);const w=info.windowWidth,h=info.windowHeight;if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#f5f5ed';ctx.fillRect(0,0,w,h);ctx.translate(layout.ox,layout.oy);ctx.scale(layout.scale,layout.scale);buttons=[];if(page==='levels'){drawLevels();return;}
      const meta=R.MODES.find(m=>m.id===mode),l=level();text(meta.name+' · '+L.band(index,L.LEVELS[mode].length),0,16,12,meta.color,'600');button('选择关卡',274,0,84,34,map);text(l.name,0,66,27,meta.color,'750');text('第 '+(index+1)+' / '+L.LEVELS[mode].length+' 关 · '+(mode==='storage'?'旋转拼合，留出装入通道':mode==='magnet'?'接通起终点与所有端口':mode==='sand'?'限量彩砂，装出目标色层':mode==='fluid'?'有限颜料，染色并保留空白':mode==='soft'?'不同形状，从盒口装入':'固定牌局，不补新牌'),0,105,12,'#6d7c62');
      if(mode==='chain')chainBoard();if(mode==='storage')storageBoard();if(mode==='magnet')magnetBoard();if(mode==='sand')sandBoard();if(mode==='fluid')fluidBoard();if(mode==='soft')softBoard();
      if(mode==='chain'||mode==='magnet')button('检查目标',0,624,358,39,()=>check());
      text(message||'不计时，慢慢整理；撤销可以换个思路',179,687,12,done?'#a28348':'#697d60','500','center');
      button('撤销',0,713,82,42,undo);button('重来',92,713,82,42,()=>start(index,false));
      if(done)button(index===L.LEVELS[mode].length-1?'返回关卡':'下一关',184,713,174,42,()=>index===L.LEVELS[mode].length-1?map():start(index+1,false),true);
      else if(heavy()){button(paused?'继续':'暂停',184,713,78,42,()=>{paused=!paused;cancel();onChange();});button('检查',272,713,86,42,requestCheck,true);}else button('关卡列表',184,713,174,42,map,true);
      text(done?'本关已完成 · 成绩已保存':paused?'已暂停 · 点继续后再操作':mode==='sand'?'三星：用砂 ≤ '+Math.floor(l.par*1.15)+' 粒，且不撤销':mode==='fluid'?'三星：用料 ≤ '+Math.floor(l.quota*.8)+' 次，且不撤销':'三星：≤ '+l.par+' 次操作 · 当前 '+steps+' 次 · 不撤销',179,776,11,'#86907a','400','center');
      if(done){box(12,350,334,76,18,'#f5f4e9');text('整理完成',179,376,22,'#4e6f52','700','center');text('★'.repeat(progress[mode][index].stars),179,403,20,'#b19454','600','center');}
      else if(paused){box(94,320,170,62,17,'#f5f4e9');text('已暂停，慢慢来',179,351,17,'#5b7458','600','center');}
    }
    function key(k){if(k==='Escape'){if(page==='play')map();else{close();onBack();}return true;}const dir={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',a:'left',d:'right',w:'up',s:'down'}[k];if(dir&&page==='play'&&mode==='chain'){slide(dir);return true;}return false;}
    function suspend(){cancel();motion=null;lastStep=null;}
    return {open,close,active:()=>mode!==null,render,down,move,up,cancel,animating,update,key,suspend,completed:id=>progress[id].filter(Boolean).length};
  }
  const api={create,copy,STAGE};if(typeof module!=='undefined')module.exports=api;else root.ChallengeScene=api;
})(typeof globalThis!=='undefined'?globalThis:this);
