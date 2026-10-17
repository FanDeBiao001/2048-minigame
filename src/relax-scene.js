(function(root){
  const R=typeof module!=='undefined'?require('./relax-core'):root.RelaxCore;
  const Q=typeof module!=='undefined'?require('./challenge-scene'):root.ChallengeScene;
  const U=typeof module!=='undefined'?require('./skill-ui'):root.SkillUI;
  const COLORS=['#bda365','#91ab7a','#819fb5'],SOFT_COLORS=['#94b38a','#c7ac7b','#88a9b6','#bd99a7'];
  const STAGE={x:12,y:154,w:334,h:448};
  function create({ctx,canvas=ctx.canvas,platform:P,clock,onChange,onExit,reducedMotion=false}){
    let mode=null,layout=null,buttons=[],pointer=null,drag=null,motion=null,chainMotion=null,winTime=null;
    let lastStep=null,paused=false,color=0,message='',surface=null,pixels=null,surfaceContext=null,surfaceAttempted=false;
    const games={},history={};
    const challenge=Q.create({ctx,canvas,platform:P,clock,onChange,reducedMotion,onBack:()=>{mode='hub';onChange();},onFree:id=>chooseFree(id)});
    const raw=P.read('2048-relax-v1')||{};
    const validIds=(list,max)=>Array.isArray(list)&&list.length<=max&&new Set(list).size===list.length&&list.every(n=>Number.isInteger(n)&&n>=0&&n<max);
    if(raw.chain&&Number.isInteger(raw.chain.level)&&raw.chain.level>=0&&raw.chain.level<R.LEVELS.length&&Array.isArray(raw.chain.board)&&raw.chain.board.length===16&&raw.chain.board.every(v=>v===0||(Number.isSafeInteger(v)&&v>=2&&Number.isInteger(Math.log2(v))))&&raw.chain.board.reduce((a,b)=>a+b,0)<=R.LEVELS[raw.chain.level].target)games.chain={level:raw.chain.level,board:raw.chain.board.slice()};
    if(validIds(raw.storage,5))games.storage={placed:raw.storage.slice()};
    if(validIds(raw.magnet,9))games.magnet={fixed:raw.magnet.slice()};
    function save(){P.write('2048-relax-v1',{chain:games.chain,storage:games.storage&&games.storage.placed,magnet:games.magnet&&games.magnet.fixed});}
    function box(x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();ctx.fill();}
    function text(s,x,y,size=14,color='#405b43',weight='400',align='left'){ctx.fillStyle=color;ctx.font=weight+' '+size+'px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(s,x,y);}
    function line(x,y,xx,yy,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.stroke();}
    function button(label,x,y,w,h,action,dark=false){box(x,y,w,h,13,dark?'#47664f':'#e6ebde');text(label,x+w/2,y+h/2,14,dark?'#fffdf5':'#496047','600','center');buttons.push({x,y,w,h,action});}
    function open(){challenge.close();mode='hub';lastStep=null;pointer=null;drag=null;motion=null;chainMotion=null;paused=false;onChange();}
    function choose(id){if(!R.MODES.some(m=>m.id===id))return;cancel();mode=id;challenge.open(id);}
    function chooseFree(id){
      challenge.close();
      if(!R.MODES.some(m=>m.id===id))return;
      mode=id;lastStep=null;pointer=null;drag=null;motion=null;chainMotion=null;winTime=null;message='';paused=false;
      if(!games[id])reset(false);onChange();
    }
    function reset(notify=true){
      pointer=null;drag=null;motion=null;chainMotion=null;winTime=null;message='';paused=false;lastStep=null;history[mode]=null;
      if(mode==='chain')games.chain={level:0,board:R.LEVELS[0].board.slice()};
      if(mode==='storage')games.storage={placed:[]};
      if(mode==='magnet')games.magnet={fixed:[]};
      if(mode==='sand')games.sand=R.createSand();
      if(mode==='fluid'){
        games.fluid=R.createFluid();
        for(let c=0;c<3;c++)R.injectFluid(games.fluid,11+c*9,20+c%2*9,(c-1)*3,1,c);
      }
      if(mode==='soft')games.soft=R.createSoft();
      save();if(notify)onChange();
    }
    function hub(){challenge.close();cancel();mode='hub';paused=false;motion=null;chainMotion=null;onChange();}
    function exit(){challenge.close();cancel();mode=null;onExit();}
    function point(x,y){return layout?{x:(x-layout.ox)/layout.scale,y:(y-layout.oy)/layout.scale}:{x,y};}
    const inside=(p,r)=>p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;
    function finishTime(){if(!reducedMotion)winTime=clock();}
    function undo(){
      if(!history[mode])return;games[mode]=JSON.parse(JSON.stringify(history[mode]));history[mode]=null;
      motion=null;chainMotion=null;winTime=null;pointer=null;drag=null;message='已撤销，可换个方式试试';save();onChange();
    }
    function nextLevel(){const g=games.chain;g.level=(g.level+1)%R.LEVELS.length;g.board=R.LEVELS[g.level].board.slice();history.chain=null;chainMotion=null;winTime=null;message='';save();onChange();}
    function slide(direction){
      if(mode!=='chain'||chainMotion)return false;const g=games.chain;
      if(g.board.every(v=>!v))return false;
      const plan=R.chain(g.board,direction,R.LEVELS[g.level].target);if(!plan.changed)return false;
      history.chain=JSON.parse(JSON.stringify(g));g.board=plan.board;message=plan.complete?'收走 '+plan.collected+' · 棋盘清空了':plan.waves.filter(w=>w.gain).length+' 次连合 · 继续整理';
      if(!reducedMotion)chainMotion={...plan,time:clock(),duration:plan.waves.length*220+180};
      if(plan.complete)finishTime();save();onChange();return true;
    }
    function piecePosition(id){
      if(drag&&drag.id===id)return {x:drag.x,y:drag.y};
      if(motion&&motion.id===id){const t=Math.min(1,(clock()-motion.time)/motion.duration),e=1-Math.pow(1-t,3);return {x:motion.from.x+(motion.to.x-motion.from.x)*e,y:motion.from.y+(motion.to.y-motion.from.y)*e};}
      if(mode==='storage')return games.storage.placed.includes(id)?R.storageTarget(id):{x:R.PIECES[id].tray[0],y:R.PIECES[id].tray[1]};
      return games.magnet.fixed.includes(id)?R.magnetTarget(id):R.magnetTray(id);
    }
    function down(x,y){
      if(challenge.active()){challenge.down(x,y);return;}
      const p=point(x,y),hit=buttons.find(b=>inside(p,b));pointer={...p,startX:p.x,startY:p.y,button:hit||null,consumed:false};
      if(hit||mode==='hub')return;
      if(mode==='chain'){pointer.board=inside(p,{x:0,y:154,w:358,h:358});return;}
      if((mode==='storage'||mode==='magnet')&&motion)motion=null;
      if(mode==='storage'&&!motion){
        for(let i=R.PIECES.length-1;i>=0;i--){if(games.storage.placed.includes(i))continue;const pos=piecePosition(i);
          if(R.PIECES[i].cells.some(([cx,cy])=>inside(p,{x:pos.x+cx*R.CELL,y:pos.y+cy*R.CELL,w:R.CELL,h:R.CELL}))){drag={id:i,x:pos.x,y:pos.y,ox:p.x-pos.x,oy:p.y-pos.y};break;}
        }
      }
      if(mode==='magnet'&&!motion){for(let i=8;i>=0;i--){if(games.magnet.fixed.includes(i))continue;const pos=piecePosition(i);if(Math.hypot(p.x-pos.x,p.y-pos.y)<=30){drag={id:i,x:pos.x,y:pos.y,ox:p.x-pos.x,oy:p.y-pos.y};break;}}}
      if(!paused&&inside(p,STAGE)){
        if(mode==='sand')R.pourSand(games.sand,(p.x-STAGE.x)/4,(p.y-STAGE.y)/4,color+1);
        if(mode==='fluid')R.injectFluid(games.fluid,(p.x-STAGE.x)/STAGE.w*R.FLUID.cols,(p.y-STAGE.y)/STAGE.h*R.FLUID.rows,0,0,color);
        if(mode==='soft'){const id=R.softHit(games.soft,p.x-STAGE.x,p.y-STAGE.y);if(id>=0){games.soft.drag={id,x:p.x-STAGE.x,y:p.y-STAGE.y};games.soft.active=true;games.soft.quiet=0;games.soft.idle=0;}}
      }
      onChange();
    }
    function move(x,y){
      if(challenge.active()){challenge.move(x,y);return;}
      if(!pointer||pointer.button)return;const p=point(x,y),dx=p.x-pointer.x,dy=p.y-pointer.y;
      if(mode==='chain'&&pointer.board&&!pointer.consumed&&Math.max(Math.abs(p.x-pointer.startX),Math.abs(p.y-pointer.startY))>18){pointer.consumed=true;slide(Math.abs(p.x-pointer.startX)>Math.abs(p.y-pointer.startY)?p.x>pointer.startX?'right':'left':p.y>pointer.startY?'down':'up');}
      if(drag){drag.x=p.x-drag.ox;drag.y=p.y-drag.oy;}
      if(!paused&&inside(p,STAGE)){
        if(mode==='fluid')R.injectFluid(games.fluid,(p.x-STAGE.x)/STAGE.w*R.FLUID.cols,(p.y-STAGE.y)/STAGE.h*R.FLUID.rows,dx/4,dy/4,color);
        if(mode==='soft'&&games.soft.drag){games.soft.drag.x=p.x-STAGE.x;games.soft.drag.y=p.y-STAGE.y;games.soft.active=true;}
      }
      pointer.x=p.x;pointer.y=p.y;onChange(heavy());
    }
    function up(x,y){
      if(challenge.active()){challenge.up(x,y);return;}
      if(!pointer)return;const p=point(x,y),pressed=pointer.button;
      if(pressed){pointer=null;if(inside(p,pressed))pressed.action();return;}
      move(x,y);
      if(drag){
        const d=drag,g=games[mode],old=JSON.parse(JSON.stringify(g));let placed=null;
        if(mode==='storage')placed=R.placeStorage(g.placed,d.id,d.x,d.y);else if(mode==='magnet')placed=R.placeMagnet(g.fixed,d.id,d.x,d.y);
        if(placed){history[mode]=old;if(mode==='storage')g.placed=placed;else g.fixed=placed;message=mode==='storage'?'轻轻放好了一块':'咔哒，归位了';}
        drag=null;const to=piecePosition(d.id);if(!reducedMotion)motion={id:d.id,from:{x:d.x,y:d.y},to,time:clock(),duration:260};
        if(placed&&(placed.length===(mode==='storage'?5:9)))finishTime();save();
      }
      if(mode==='soft')games.soft.drag=null;pointer=null;onChange();
    }
    function cancel(){if(challenge.active()){challenge.cancel();return;}if(mode==='soft'&&games.soft)games.soft.drag=null;pointer=null;drag=null;save();lastStep=null;if(mode)onChange();}
    function heavy(){return ['sand','fluid','soft'].includes(mode);}
    function animating(){
      if(challenge.active())return challenge.animating();
      if(!mode||mode==='hub'||paused)return false;
      if(motion||chainMotion||(winTime!==null&&clock()-winTime<700))return true;
      if(mode==='sand')return games.sand.active||!!pointer&&!pointer.button&&inside(pointer,STAGE)&&games.sand.count<R.SAND.cap;
      if(mode==='fluid')return games.fluid.activity>0||!!pointer&&!pointer.button&&inside(pointer,STAGE);
      if(mode==='soft')return games.soft.active;
      return false;
    }
    function update(now,fps=60){
      if(challenge.active())return challenge.update(now,fps);
      if(!animating())return false;
      const interval=1000/(heavy()?Math.min(30,fps):fps);
      if(lastStep!==null&&now-lastStep<interval-.5)return false;lastStep=now;
      if(motion&&now-motion.time>=motion.duration)motion=null;
      if(chainMotion&&now-chainMotion.time>=chainMotion.duration)chainMotion=null;
      if(winTime!==null&&now-winTime>=700)winTime=null;
      if(mode==='sand'){
        if(pointer&&!pointer.button&&inside(pointer,STAGE)&&games.sand.count<R.SAND.cap)R.pourSand(games.sand,(pointer.x-STAGE.x)/4,(pointer.y-STAGE.y)/4,color+1);
        R.stepSand(games.sand);
      }
      if(mode==='fluid'){
        if(pointer&&!pointer.button&&inside(pointer,STAGE))R.injectFluid(games.fluid,(pointer.x-STAGE.x)/STAGE.w*R.FLUID.cols,(pointer.y-STAGE.y)/STAGE.h*R.FLUID.rows,0,0,color);
        R.stepFluid(games.fluid);
      }
      if(mode==='soft'){R.stepSoft(games.soft);R.stepSoft(games.soft);}
      return true;
    }
    function Lcount(id){return ['chain','storage','sand'].includes(id)?12:8;}
    function renderHub(){
      text('把节奏放慢一点',0,16,12,'#6b7d62');text('解压小屋',0,63,30,'#36533a','750');text('60 关慢慢整理，也可自由体验',0,102,13,'#687b60');
      R.MODES.forEach((m,i)=>{
        const x=i%2*184,y=143+Math.floor(i/2)*156;box(x,y,174,138,18,'#e7ecdf');
        // Small code-native previews show the actual material / movement, without idle animation.
        if(m.id==='chain'){[2,4,8].forEach((v,j)=>{box(x+17+j*44,y+18,37,34,9,['#dce3c5','#c3d6a5','#a8c58d'][j]);text(v,x+35+j*44,y+35,17,'#45613c','700','center');});}
        if(m.id==='storage'){[[17,18,62,33],[85,18,65,33]].forEach(([xx,yy,w,h],j)=>box(x+xx,y+yy,w,h,8,j?'#bfaa7a':'#8da982'));}
        if(m.id==='magnet'){[0,1,2].forEach(j=>{box(x+21+j*43,y+18,32,32,10,'#91acb6');text(j+1,x+37+j*43,y+34,13,'#fff','600','center');});}
        if(m.id==='sand'){for(let j=0;j<3;j++)box(x+20+j*44,y+17,32,37,8,COLORS[j]);}
        if(m.id==='fluid'){ctx.save();ctx.globalAlpha=.6;[0,1,2].forEach(j=>{box(x+18+j*35,y+18,65,33,16,['#8bab9a','#8cabb7','#bea2ad'][j]);});ctx.restore();}
        if(m.id==='soft'){[0,1,2].forEach(j=>box(x+20+j*39,y+16+j%2*7,43,35,17,SOFT_COLORS[j]));}
        text(m.name,x+16,y+80,19,m.color,'700');text(Lcount(m.id)+' 关 · 已完成 '+challenge.completed(m.id),x+16,y+111,11,'#5f7157');buttons.push({x,y,w:174,h:138,action:()=>choose(m.id)});
      });
      text('不计时 · 棋盘独立 · 随时返回',179,650,12,'#6b7d62','400','center');
      button('返回 2048',0,710,358,48,exit,true);
    }
    function drawChain(){
      const g=games.chain,level=R.LEVELS[g.level],a=chainMotion;
      box(0,154,358,358,20,'#cdd7c3');
      for(let i=0;i<16;i++)box(9+i%4*87,164+Math.floor(i/4)*87,79,79,12,'#e0e7d7');
      function tile(value,x,y,size=1){const fill=value>=16?'#c1a25e':value>=8?'#abc68d':value>=4?'#cddbb4':'#edeadf';ctx.save();ctx.translate(x+39.5,y+39.5);ctx.scale(size,size);box(-39.5,-39.5,79,79,12,fill);text(value,0,0,30,'#3f5939','700','center');ctx.restore();}
      if(a){
        const age=clock()-a.time,index=Math.min(a.waves.length-1,Math.floor(age/220)),wave=a.waves[index],t=Math.min(1,(age-index*220)/150),e=1-Math.pow(1-t,3);
        if(t<1)wave.tracks.forEach(v=>{const x=v.from%4+(v.to%4-v.from%4)*e,y=Math.floor(v.from/4)+(Math.floor(v.to/4)-Math.floor(v.from/4))*e;tile(v.value,9+x*87,164+y*87);});
        else wave.board.forEach((v,i)=>{if(v)tile(v,9+i%4*87,164+Math.floor(i/4)*87);});
        if(t>=1)wave.taken.forEach(i=>tile(level.target,9+i%4*87,164+Math.floor(i/4)*87,Math.max(0,1-(age-index*220-150)/70)));
      }else g.board.forEach((v,i)=>{if(v)tile(v,9+i%4*87,164+Math.floor(i/4)*87);});
      box(0,538,358,68,16,'#e8eddf');text('本关收纳目标',18,559,12,'#68795d');text(level.target,337,573,27,'#8b7546','700','right');
      text(g.board.every(v=>!v)?'全部收走，留下一盘清爽':'合成目标后自动收走，不会补新牌',18,585,12,'#52684b');
      text(message||'上下左右滑动，让合并连续发生',179,644,13,'#556c4e','400','center');
      button('撤销',0,700,173,44,undo);button(g.board.every(v=>!v)?g.level===4?'再玩一轮':'下一关':'重玩本关',185,700,173,44,()=>{if(chainMotion)return;if(g.board.every(v=>!v))nextLevel();else{g.board=level.board.slice();history.chain=null;message='';save();onChange();}},true);
    }
    function drawStorage(){
      const g=games.storage;box(0,150,358,484,20,'#eeeade');text('把同色软块放进对应空位',179,171,12,'#7e725a','400','center');
      box(R.DRAWER.x-10,R.DRAWER.y-10,236,182,15,'#d7d3c2');
      R.PIECES.forEach((p,id)=>p.cells.forEach(([x,y])=>{const to=R.storageTarget(id);ctx.save();ctx.globalAlpha=.24;box(to.x+x*R.CELL+2,to.y+y*R.CELL+2,50,50,9,p.color);ctx.restore();text(id+1,to.x+x*R.CELL+27,to.y+y*R.CELL+27,12,'#7c816a','500','center');}));
      const order=[0,1,2,3,4].filter(i=>!drag||drag.id!==i);if(drag)order.push(drag.id);
      order.forEach(id=>{const p=R.PIECES[id],pos=piecePosition(id);p.cells.forEach(([x,y])=>box(pos.x+x*R.CELL+2,pos.y+y*R.CELL+2,50,50,10,p.color));text(id+1,pos.x+27,pos.y+27,16,'#fffdf3','650','center');});
      if(g.placed.length===5&&!motion){
        const t=winTime===null?1:Math.max(0,Math.min(1,(clock()-winTime-260)/440)),offset=-174*Math.pow(1-t,3);
        ctx.save();ctx.beginPath();ctx.rect(R.DRAWER.x-6,R.DRAWER.y-6,228,174);ctx.clip();
        box(R.DRAWER.x-6,R.DRAWER.y-6+offset,228,174,13,'#d5c8aa');line(154,270+offset,204,270+offset,'#a28b66',4);
        text('收得刚刚好',179,307+offset,15,'#716448','600','center');ctx.restore();
      }
      text(message||'松手时靠近空位，会自动轻轻落好',179,655,12,'#657257','400','center');
      button('撤销一块',0,700,173,44,undo);button('再收一次',185,700,173,44,reset,true);
    }
    function drawMagnet(){
      const g=games.magnet;box(0,150,358,484,20,'#e4ece9');
      for(let i=0;i<9;i++){
        const p=R.magnetTarget(i);if(i%3<2){const q=R.magnetTarget(i+1);line(p.x,p.y,q.x,q.y,g.fixed.includes(i)&&g.fixed.includes(i+1)?'#90ad9b':'#d1ddd5',3);}if(i<6){const q=R.magnetTarget(i+3);line(p.x,p.y,q.x,q.y,g.fixed.includes(i)&&g.fixed.includes(i+3)?'#90ad9b':'#d1ddd5',3);}
        box(p.x-27,p.y-27,54,54,15,'#d4dfd9');text(i+1,p.x,p.y,15,'#83958c','500','center');
      }
      const order=Array.from({length:9},(_,i)=>i).filter(i=>!drag||drag.id!==i);if(drag)order.push(drag.id);
      order.forEach(i=>{const p=piecePosition(i);box(p.x-27,p.y-27,54,54,15,['#7f9b85','#7895a4','#b39b70'][Math.floor(i/3)]);text(i+1,p.x,p.y,21,'#fffdf3','650','center');});
      text(g.fixed.length===9?'每一块都在自己的位置':'拖动编号磁片，靠近同号位置后松手',179,655,12,'#5b7165','400','center');
      button('撤销一块',0,700,173,44,undo);button('打散再玩',185,700,173,44,reset,true);
    }
    function drawSand(){
      const s=games.sand;box(STAGE.x,STAGE.y,STAGE.w,STAGE.h,15,'#e8e5d8');
      const {cols,rows}=R.SAND;
      for(let color=1;color<=3;color++){ctx.fillStyle=COLORS[color-1];ctx.beginPath();for(let i=0;i<s.cells.length;i++)if(s.cells[i]===color)ctx.rect(STAGE.x+i%cols*4,STAGE.y+Math.floor(i/cols)*4,4,4);ctx.fill();}
      R.SAND.bins.forEach(([l,r],i)=>{
        const x=STAGE.x+l*4,y=STAGE.y+54*4,w=(r-l+1)*4;line(x,y,x,STAGE.y+rows*4,'#b0ab95',2);line(x+w,y,x+w,STAGE.y+rows*4,'#b0ab95',2);line(x,STAGE.y+rows*4,x+w,STAGE.y+rows*4,'#b0ab95',2);
        line(x+4,STAGE.y+86*4,x+15,STAGE.y+86*4,'#8f9277',1.5);text(i+1,x+w/2,y-16,14,'#7d806b','600','center');
      });
      const counts=R.sandCounts(s),complete=counts.every(v=>v>=R.SAND.goal);
      text(complete?'三瓶都装到刻度了，继续玩也可以':counts.map((n,i)=>(i+1)+'号 '+Math.min(100,Math.floor(n/R.SAND.goal*100))+'%').join('     '),179,622,12,'#6e7159','500','center');
      text(s.count>=R.SAND.cap?'彩砂已用完，清空后可以继续': '按住落砂，左右移动 · 装到每瓶刻度',179,104,12,'#6f795e','400','center');
    }
    function drawFluid(){
      const s=games.fluid,{cols:w,rows:h}=R.FLUID;
      if(!surfaceAttempted&&P.surface){
        surfaceAttempted=true;
        try {surface=P.surface(w,h);surfaceContext=surface&&surface.getContext('2d');
          if(surfaceContext&&typeof surfaceContext.createImageData==='function'&&typeof surfaceContext.putImageData==='function'&&typeof ctx.drawImage==='function')pixels=surfaceContext.createImageData(w,h);
        } catch (_) {pixels=null;surface=null;surfaceContext=null;}
      }
      const base=[228,237,229],inks=[[175,144,83],[108,155,117],[100,141,175]];
      if(pixels&&pixels.data){
        for(let i=0;i<w*h;i++){
          const total=s.dye[0][i]+s.dye[1][i]+s.dye[2][i],strength=Math.min(.9,total*.8),k=i*4;
          for(let c=0;c<3;c++){const value=total?(s.dye[0][i]*inks[0][c]+s.dye[1][i]*inks[1][c]+s.dye[2][i]*inks[2][c])/total:base[c];pixels.data[k+c]=base[c]+(value-base[c])*strength;}pixels.data[k+3]=255;
        }
        surfaceContext.putImageData(pixels,0,0);ctx.save();box(STAGE.x,STAGE.y,STAGE.w,STAGE.h,16,'#e4ede5');ctx.clip();ctx.imageSmoothingEnabled=true;ctx.drawImage(surface,STAGE.x,STAGE.y,STAGE.w,STAGE.h);ctx.restore();
      }else{
        box(STAGE.x,STAGE.y,STAGE.w,STAGE.h,16,'#e4ede5');
        for(let color=0;color<3;color++)for(let level=1;level<=6;level++){ctx.save();ctx.globalAlpha=level/8;ctx.fillStyle=COLORS[color];ctx.beginPath();for(let i=0;i<w*h;i++)if(Math.ceil(s.dye[color][i]*6)===level)ctx.rect(STAGE.x+i%w*STAGE.w/w,STAGE.y+Math.floor(i/w)*STAGE.h/h,STAGE.w/w+.2,STAGE.h/h+.2);ctx.fill();ctx.restore();}
      }
      text('滑动带起涡流，按住慢慢染色',179,622,12,'#597968','400','center');
    }
    function drawSoft(){
      box(STAGE.x,STAGE.y,STAGE.w,STAGE.h,16,'#e8e6de');
      games.soft.bodies.forEach(b=>{
        const nodes=b.nodes;ctx.save();ctx.translate(STAGE.x,STAGE.y);ctx.fillStyle=SOFT_COLORS[b.color];ctx.strokeStyle='#f4f2e8';ctx.lineWidth=1.5;ctx.beginPath();
        const first=nodes[0],last=nodes[nodes.length-1];ctx.moveTo((first.x+last.x)/2,(first.y+last.y)/2);
        nodes.forEach((n,i)=>{const next=nodes[(i+1)%nodes.length];ctx.quadraticCurveTo(n.x,n.y,(n.x+next.x)/2,(n.y+next.y)/2);});ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
      });
      text('拖动软团挤一挤，松手会回弹',179,622,12,'#7b6871','400','center');
    }
    function render(info,dpr){
      if(challenge.active()){challenge.render(info,dpr);return;}
      layout=U.fit(info,!!P.native);const w=info.windowWidth,h=info.windowHeight;
      if(canvasSizeChanged(w,h,dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#f5f5ed';ctx.fillRect(0,0,w,h);ctx.translate(layout.ox,layout.oy);ctx.scale(layout.scale,layout.scale);buttons=[];
      if(mode==='hub'){renderHub();return;}
      const meta=R.MODES.find(m=>m.id===mode);if(!meta)return;
      text('解压小屋',0,16,12,'#738269');button('闯关',202,0,62,34,()=>choose(mode));button('玩法列表',274,0,84,34,hub);
      text(meta.name,0,65,30,meta.color,'750');
      let sub=meta.desc;
      if(mode==='chain')sub='第 '+(games.chain.level+1)+' / '+R.LEVELS.length+' 关 · 无随机补牌';
      if(mode==='storage')sub='已收好 '+games.storage.placed.length+' / 5 块 · 编号对应位置';
      if(mode==='magnet')sub='已归位 '+games.magnet.fixed.length+' / 9 块';
      if(mode!=='sand')text(sub,0,104,12,'#62765b');
      if(mode==='chain')drawChain();if(mode==='storage')drawStorage();if(mode==='magnet')drawMagnet();if(mode==='sand')drawSand();if(mode==='fluid')drawFluid();if(mode==='soft')drawSoft();
      if(heavy()){
        if(mode!=='soft')COLORS.forEach((c,i)=>{box(i*122,650,114,38,12,color===i?'#d6dfcc':'#e8ecdf');box(i*122+12,660,18,18,7,c);text(['麦金','苔绿','雾蓝'][i],i*122+70,670,13,'#52634a','500','center');buttons.push({x:i*122,y:650,w:114,h:38,action:()=>{color=i;onChange();}});});
        else text('12 个软团 · 停手后自动休息',179,668,12,'#7c7c67','400','center');
        button(paused?'继续':'暂停',0,710,173,44,()=>{paused=!paused;pointer=null;if(mode==='soft')games.soft.drag=null;lastStep=null;onChange();});button('清空重来',185,710,173,44,reset,true);
        if(paused){ctx.save();ctx.globalAlpha=.8;box(93,335,172,64,18,'#f5f5ed');ctx.restore();text('已暂停，慢慢来',179,367,16,'#5e7156','600','center');}
      }
      text('返回玩法列表',179,774,12,'#607358','500','center');buttons.push({x:104,y:754,w:150,h:26,action:hub});
    }
    function canvasSizeChanged(w,h,dpr){return canvas&&(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr));}
    function key(k){if(challenge.active())return challenge.key(k);if(k==='Escape'){mode==='hub'?exit():hub();return true;}const d={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',a:'left',d:'right',w:'up',s:'down'}[k];if(d&&mode==='chain'){slide(d);return true;}return false;}
    function suspend(){if(challenge.active()){challenge.suspend();return;}cancel();motion=null;chainMotion=null;winTime=null;lastStep=null;}
    return {open,active:()=>mode!==null,render,down,move,up,cancel,animating,update,key,suspend,mode:()=>mode};
  }
  const api={create,STAGE};if(typeof module!=='undefined')module.exports=api;else root.RelaxScene=api;
})(typeof globalThis!=='undefined'?globalThis:this);
