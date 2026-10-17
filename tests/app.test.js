const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(options={}){
  let now=0,nextFrame=1,nextTimer=1,renders=0,infoReads=0;
  const frames=new Map(),timers=new Map(),listeners={},saved={},texts=[],fps=[],rects=[];
  const ctx=new Proxy({}, {get:(_,key)=>key==='setTransform'?()=>{renders++;now+=options.renderCost||0;}:key==='fillRect'?(x,y,w,h)=>rects.push({x,y,w,h}):key==='fillText'?value=>texts.push(value):()=>{},set:()=>true});
  const canvas={width:0,height:0,getContext:()=>ctx};
  const board=options.board||[2,2,4,0,...Array(12).fill(0)];
  saved['2048-save']={board,score:0,steps:0,continued:false,next:options.next||2,energy:options.energy===undefined?2:options.energy,combo:0};
  if(options.pairHint)saved['2048-save'].pairHint=options.pairHint;
  if(options.parcel)saved['2048-save'].parcel=options.parcel;
  if(options.relaxSave)saved['2048-relax-v1']=options.relaxSave;
  const platform={
    native:options.native?{}:null,sidebar:options.sidebar,openSidebar:()=>{listeners.sidebarOpened=true;},
    canvas:()=>canvas,surface:options.surface,
    info:()=>{infoReads++;return options.info||{windowWidth:390,windowHeight:844,pixelRatio:options.dpr||2};},
    read:k=>saved[k],write:(k,v)=>saved[k]=JSON.parse(JSON.stringify(v)),
    frame:f=>{const id=nextFrame++;frames.set(id,f);return id;},
    cancelFrame:id=>frames.delete(id),setFPS:value=>fps.push(value),
    lifecycle:(show,hide)=>Object.assign(listeners,{show,hide}),
    touch:(_,start,end,cancel,move)=>Object.assign(listeners,{start,end,cancel,move})
  };
  const math=Object.create(Math);if(options.random!==undefined)math.random=typeof options.random==='function'?options.random:()=>options.random;
  const sandbox={Math:math,RelaxScene:require('../src/relax-scene'),GameCore:require('../src/core'),MergeEffects:require('../src/merge-effects'),RenderBudget:require('../src/render-budget'),SwapEffect:require('../src/swap-effect'),FeatureEffects:require('../src/feature-effects'),SkillUI:require('../src/skill-ui'),GamePlatform:platform,Date:class extends Date{constructor(...args){super(...(args.length?args:['2026-10-17T04:00:00Z']));}static now(){return now;}},setTimeout:(f,delay)=>{const id=nextTimer++;timers.set(id,{f,time:now+delay});return id;},clearTimeout:id=>timers.delete(id),matchMedia:()=>({matches:!!options.reducedMotion}),addEventListener:(k,f)=>listeners[k]=f};
  vm.createContext(sandbox);vm.runInContext(fs.readFileSync('src/app.js','utf8'),sandbox);
  function advance(ms){now+=ms;for(const [id,timer] of timers)if(timer.time<=now){timers.delete(id);timer.f();}const entry=frames.entries().next().value;if(entry){frames.delete(entry[0]);entry[1]();}}
  return {saved,listeners,canvas,texts,fps,rects,layout:require('../src/skill-ui').fit(options.info||{windowWidth:390,windowHeight:844,pixelRatio:options.dpr||2},!!platform.native),flush:()=>advance(250),advance,pendingFrames:()=>frames.size,
    pendingTimers:()=>timers.size,peekFrame:()=>frames.values().next().value,renders:()=>renders,infoReads:()=>infoReads,
    key:k=>listeners.keydown({key:k,preventDefault(){}})};
}
test('预告数字实际生成、能量增长且连续操作只缓存一步',()=>{const a=setup();a.key('ArrowLeft');assert.equal(a.saved['2048-save'].steps,1);assert.equal(a.saved['2048-save'].energy,3);assert.equal(a.saved['2048-save'].board.reduce((x,y)=>x+y),10);a.key('ArrowDown');a.key('ArrowRight');assert.equal(a.saved['2048-save'].steps,1);a.flush();assert.equal(a.saved['2048-save'].steps,2);a.flush();assert.equal(a.saved['2048-save'].steps,2);});
test('越过阈值立即移动，抬手不重复触发',()=>{const a=setup();a.listeners.start(180,420);a.listeners.move(140,420);assert.equal(a.saved['2048-save'].steps,1);a.listeners.end(120,420);a.flush();assert.equal(a.saved['2048-save'].steps,1);});
test('取消手势和短距离移动不产生步数',()=>{const a=setup();a.listeners.start(180,420);a.listeners.move(175,420);a.listeners.cancel();a.listeners.end(100,420);assert.equal(a.saved['2048-save'].steps,0);});
test('蓄能配对消耗能量，撤销完整恢复棋盘与策略状态',()=>{const a=setup();a.key('ArrowLeft');a.flush();const before=JSON.parse(JSON.stringify(a.saved['2048-save']));tapSkill(a);assert.equal(a.saved['2048-save'].energy,0);assert.equal(a.saved['2048-save'].next,before.next);assert.ok(a.saved['2048-save'].pairHint);assert.equal(a.saved['2048-save'].steps,before.steps);tapContent(a,86,786);assert.deepEqual(a.saved['2048-save'],before);});

test('粒子尾迹不增加200ms输入等待，结束后停止请求帧',()=>{const a=setup({energy:0});a.key('ArrowLeft');a.advance(110);a.advance(90);assert.equal(a.saved['2048-save'].steps,1);a.key('ArrowDown');assert.equal(a.saved['2048-save'].steps,2);a.advance(110);a.advance(90);a.advance(600);assert.equal(a.pendingFrames(),0);});

test('高刷新率不增加绘制频率，静止和尾迹结束后没有帧任务',()=>{
  const a=setup({dpr:3,energy:0});assert.equal(a.pendingFrames(),0);
  assert.equal(a.canvas.width,780);assert.equal(a.canvas.height,1688);
  a.key('ArrowLeft');const start=a.renders();
  for(let i=0;i<100;i++)a.advance(1000/120);
  const drawn=a.renders()-start;
  assert.ok(drawn>=38&&drawn<=43,'120Hz下绘制帧数：'+drawn);
  assert.equal(a.pendingFrames(),0);assert.equal(a.infoReads(),1);
  a.listeners.resize();assert.equal(a.infoReads(),2);
});
test('切后台取消任务并丢弃缓存手势，回前台只显示已经提交的棋盘',()=>{
  const a=setup({energy:0});a.key('ArrowLeft');a.key('ArrowDown');
  const stale=a.peekFrame(),before=JSON.parse(JSON.stringify(a.saved['2048-save']));
  a.listeners.hide();assert.equal(a.pendingFrames(),0);
  const draws=a.renders();a.key('ArrowRight');stale();
  assert.equal(a.renders(),draws);assert.deepEqual(a.saved['2048-save'],before);
  a.listeners.show();assert.equal(a.infoReads(),2);assert.equal(a.pendingFrames(),0);
  a.key('ArrowDown');assert.equal(a.saved['2048-save'].steps,2);
  const current=a.pendingFrames();stale();assert.equal(a.pendingFrames(),current);
  a.advance(600);assert.equal(a.pendingFrames(),0);
});
test('持续高绘制耗时后自动降低像素开销，仍保留滑动输入',()=>{
  const a=setup({renderCost:10,dpr:3,energy:0});a.key('ArrowLeft');
  for(let i=0;i<30;i++)a.advance(1000/60);
  a.key('ArrowDown');
  for(let i=0;i<30;i++)a.advance(1000/60);
  assert.equal(a.canvas.width,585);assert.equal(a.canvas.height,1266);assert.deepEqual(a.fps,[60,30]);
  assert.equal(a.pendingFrames(),0);a.key('ArrowRight');
  assert.equal(a.saved['2048-save'].steps,3);a.advance(800);
  assert.equal(a.pendingFrames(),0);
});
test('合出2048时切后台，回前台仍显示通关弹层',()=>{
  const a=setup({board:[1024,1024,...Array(14).fill(0)]});
  a.key('ArrowLeft');a.listeners.hide();a.listeners.show();
  assert.ok(a.texts.includes('你合成了 2048！'));assert.equal(a.pendingFrames(),0);
});

function tapSkill(a){tapContent(a,65,711);}
test('能量不足点击有明确说明与短反馈，不消耗能量且不会增加计时器',()=>{
  const a=setup({energy:1});const before=JSON.parse(JSON.stringify(a.saved['2048-save']));
  tapSkill(a);assert.ok(a.texts.includes('还差 2 格能量 · 每次合并蓄能 +1'));
  assert.deepEqual(a.saved['2048-save'],before);
  for(let i=0;i<10;i++)tapSkill(a);
  assert.equal(a.pendingFrames(),1);assert.equal(a.pendingTimers(),1);
  a.advance(250);assert.equal(a.pendingFrames(),0);
  const draws=a.renders();a.advance(1000);assert.equal(a.renders(),draws);
  a.advance(400);assert.equal(a.pendingTimers(),0);assert.equal(a.pendingFrames(),0);
});
test('配对从已有数字复制同值牌，在明确空位落牌，不修改普通预告或计分',()=>{
  const a=setup({energy:3,board:[2,4,32,64,...Array(12).fill(0)]});
  const before=JSON.parse(JSON.stringify(a.saved['2048-save']));tapSkill(a);
  const after=a.saved['2048-save'];assert.equal(after.energy,0);assert.equal(after.next,before.next);
  assert.deepEqual(after.pairHint,{source:3,target:7,value:64});assert.equal(after.board[7],64);
  assert.equal(before.board[7],0);assert.equal(after.board[3],64);
  assert.equal(after.steps,0);assert.equal(after.score,0);
  assert.ok(a.texts.includes('配对牌 64 → 第2行第4列 · 能量 -3'));
  assert.ok(a.texts.includes('配对原牌'));assert.ok(a.texts.includes('落点'));
  tapSkill(a);assert.equal(a.pendingTimers(),1);assert.equal(a.pendingFrames(),1);
  assert.equal(a.saved['2048-save'].board.filter(v=>v===64).length,2);
  a.advance(340);assert.ok(a.texts.includes('⇄'));
  a.advance(400);assert.equal(a.pendingFrames(),0);assert.ok(a.texts.includes('新牌'));
  a.advance(1000);assert.equal(a.pendingTimers(),0);assert.equal(a.pendingFrames(),0);
  assert.ok(a.texts.includes('配对牌 64 已放入第2行第4列'));
  a.key('ArrowDown');assert.equal(a.saved['2048-save'].board.reduce((x,y)=>x+y),168);
  assert.equal(a.saved['2048-save'].pairHint,undefined);
});
test('合并获得能量与满格都有反馈，动画中点换牌说明等待且不消耗',()=>{
  const a=setup();a.key('ArrowLeft');assert.ok(a.texts.includes('充能已满 · 点击下方一个技能'));
  const before=JSON.parse(JSON.stringify(a.saved['2048-save']));tapSkill(a);
  assert.ok(a.texts.includes('正在合并，稍后再配对'));assert.deepEqual(a.saved['2048-save'],before);
  const b=setup({energy:0});b.key('ArrowLeft');assert.ok(b.texts.includes('合并充能 +1 · 1/3，还差 2 次合并'));
});
test('配对支持减少动态效果；后台清理动画但保留真实落牌与位置',()=>{
  const a=setup({energy:3,reducedMotion:true});tapSkill(a);
  assert.equal(a.saved['2048-save'].next,2);assert.equal(a.saved['2048-save'].pairHint.value,4);
  assert.equal(a.pendingFrames(),0);assert.equal(a.pendingTimers(),1);
  assert.ok(a.texts.some(t=>typeof t==='string'&&t.startsWith('配对牌 4 → 第')));
  a.listeners.hide();assert.equal(a.pendingTimers(),0);assert.equal(a.pendingFrames(),0);
  const draws=a.renders();a.advance(2000);assert.equal(a.renders(),draws);
  a.listeners.show();assert.equal(a.pendingTimers(),0);assert.ok(a.texts.includes('新牌'));
});
test('配对翻牌期间只缓存最后一个滑动方向，结束后按已有新牌移动',()=>{
  const a=setup({energy:3});tapSkill(a);assert.ok(a.texts.includes('补牌中'));
  a.key('ArrowDown');a.key('ArrowLeft');assert.equal(a.saved['2048-save'].steps,0);
  a.advance(320);assert.ok(a.texts.includes('⇄'));assert.equal(a.saved['2048-save'].steps,0);
  a.advance(410);assert.equal(a.saved['2048-save'].steps,1);
  assert.equal(a.saved['2048-save'].board[0],4);
  assert.equal(a.saved['2048-save'].board.reduce((x,y)=>x+y),14);
  a.advance(800);assert.equal(a.pendingFrames(),0);
});
test('配对中切后台不补播或执行旧手势，切回保留已补好的同值牌',()=>{
  const a=setup({energy:3});tapSkill(a);a.key('ArrowLeft');a.advance(200);a.listeners.hide();
  assert.equal(a.pendingFrames(),0);assert.equal(a.pendingTimers(),0);
  a.listeners.show();assert.equal(a.saved['2048-save'].steps,0);assert.equal(a.saved['2048-save'].next,2);
  const hint=a.saved['2048-save'].pairHint;assert.equal(a.saved['2048-save'].board[hint.target],hint.value);
  assert.equal(a.pendingFrames(),0);
});
test('满盘点击配对提示腾空位，不扣能量、不生成牌或修改撤销',()=>{
  const board=[2,2,4,8,16,32,64,128,256,512,1024,2,4,8,16,32];
  const a=setup({energy:3,board});const before=JSON.parse(JSON.stringify(a.saved['2048-save']));
  tapSkill(a);assert.deepEqual(a.saved['2048-save'],before);
  assert.ok(a.texts.includes('棋盘已满 · 先滑动合并腾出空位'));
  a.advance(250);assert.equal(a.pendingFrames(),0);
});
test('配对落点标记可随存档恢复，损坏的旧标记会被清理',()=>{
  const board=[2,4,32,64,0,0,0,64,...Array(8).fill(0)];
  const a=setup({board:board.slice(),pairHint:{source:3,target:7,value:64}});
  assert.ok(a.texts.includes('配对原牌'));assert.ok(a.texts.includes('新牌'));
  assert.ok(a.texts.includes('配对牌 64 已放入第2行第4列'));assert.equal(a.pendingFrames(),0);
  const b=setup({board:board.slice(),pairHint:{source:3,target:4,value:64}});
  assert.ok(!b.texts.includes('配对原牌'));assert.ok(!b.texts.includes('新牌'));
  const c=setup({board:board.slice(),pairHint:{source:5,target:6,value:0}});
  assert.ok(!c.texts.includes('新牌'));
});

function tapDesign(a,x,y){const {scale,ox,oy}=a.layout; a.listeners.start(x*scale+ox,y*scale+oy);a.listeners.end(x*scale+ox,y*scale+oy);}
function tapContent(a,x,y){tapDesign(a,x,y+require('../src/skill-ui').BODY_SHIFT);}
function tapCell(a,index){tapContent(a,48.5+index%4*87,302.5+Math.floor(index/4)*87);}
function tapFold(a){tapContent(a,179,711);a.advance(0);}
function openMail(a){tapContent(a,293,711);a.advance(0);}
function confirmFeature(a){tapContent(a,266,774);}
test('折叠单击自动执行，不生成随机牌，不返还能量，可完整撤销',()=>{
  const a=setup({energy:3,board:[2,4,4,2,...Array(12).fill(0)],random:0});
  const before=JSON.parse(JSON.stringify(a.saved['2048-save']));tapFold(a);
  assert.ok(a.texts.includes('自动向左折叠 · 合并 2 组，+12 分'));
  assert.ok(!a.texts.some(t=>typeof t==='string'&&/对折预览|确认对折/.test(t)));assert.equal(a.pendingFrames(),1);
  assert.deepEqual(a.saved['2048-save'].board.slice(0,4),[4,8,0,0]);
  assert.equal(a.saved['2048-save'].score,12);assert.equal(a.saved['2048-save'].steps,1);
  assert.equal(a.saved['2048-save'].energy,0);assert.equal(a.saved['2048-save'].next,2);
  a.advance(850);assert.equal(a.pendingFrames(),0);
  tapContent(a,86,786);assert.deepEqual(a.saved['2048-save'],before);
});
test('没有对折组合时不扣能量，不进入选择态且仍可直接滑动',()=>{
  const a=setup({energy:3});const before=JSON.parse(JSON.stringify(a.saved['2048-save']));
  tapFold(a);assert.ok(a.texts.includes('没有可合并的对折组合 · 不消耗充能'));
  assert.deepEqual(a.saved['2048-save'],before);
  a.key('ArrowDown');assert.equal(a.saved['2048-save'].steps,1);
});
test('自动折叠选择高收益方向，动画中重复点击只结算一次',()=>{
  const board=Array(16).fill(0);board[0]=2;board[1]=64;board[3]=2;board[13]=64;
  const a=setup({energy:3,board});tapFold(a);
  assert.equal(a.saved['2048-save'].score,128);assert.equal(a.saved['2048-save'].board[1],128);
  assert.ok(a.texts.includes('自动向上折叠 · 合并 1 组，+128 分'));
  tapFold(a);assert.equal(a.saved['2048-save'].score,128);assert.equal(a.saved['2048-save'].steps,1);
  a.advance(1000);assert.equal(a.pendingFrames(),0);
});
test('自动折叠计入已到站快递收益，撤销恢复快递和充能',()=>{
  const a=setup({energy:3,board:[2,4,4,2,...Array(12).fill(0)],parcel:{value:4,target:3,remaining:0}});
  const before=JSON.parse(JSON.stringify(a.saved['2048-save']));tapFold(a);
  assert.deepEqual(a.saved['2048-save'].board.slice(0,4),[0,0,8,8]);
  assert.equal(a.saved['2048-save'].score,20);assert.equal(a.saved['2048-save'].parcel,null);
  a.advance(1000);tapContent(a,86,786);assert.deepEqual(a.saved['2048-save'],before);
  const b=setup({energy:3,board:before.board,parcel:{value:4,target:3,remaining:1}});tapFold(b);
  assert.equal(b.saved['2048-save'].parcel.remaining,1);assert.equal(b.saved['2048-save'].score,12);
});
test('满盘尚有折叠机会时不提前判负，可用能量折叠解困',()=>{
  const board=[2,4,8,2,4,8,2,4,8,2,4,8,2,4,8,2];
  const a=setup({board,energy:3});assert.ok(!a.texts.includes('这一局，已经很棒了'));
  tapFold(a);a.advance(850);
  assert.ok(a.saved['2048-save'].board.includes(0));assert.equal(a.saved['2048-save'].energy,0);
});
test('折叠中切后台保留结果，取消任务且不执行缓存方向',()=>{
  const a=setup({energy:3,board:[2,4,4,2,...Array(12).fill(0)]});tapFold(a);a.key('ArrowDown');
  a.advance(200);a.listeners.hide();assert.equal(a.pendingFrames(),0);assert.equal(a.pendingTimers(),0);
  a.listeners.show();assert.equal(a.saved['2048-save'].steps,1);assert.equal(a.saved['2048-save'].score,12);
  assert.equal(a.pendingFrames(),0);
});
test('快递选择数字和空位，取消不扣能量，寄出不改变棋盘',()=>{
  const a=setup({energy:3,board:[64,2,...Array(14).fill(0)],random:0});
  const before=JSON.parse(JSON.stringify(a.saved['2048-save']));openMail(a);confirmFeature(a);
  assert.ok(a.texts.includes('请点一个空格作为收件地址'));assert.deepEqual(a.saved['2048-save'],before);
  tapCell(a,1);tapCell(a,15);confirmFeature(a);
  assert.deepEqual(a.saved['2048-save'].parcel,{value:2,target:15,remaining:2});
  assert.deepEqual(a.saved['2048-save'].board,before.board);assert.equal(a.saved['2048-save'].energy,0);
  assert.equal(a.saved['2048-save'].steps,0);assert.ok(a.texts.includes('2 · 2步到'));
  a.advance(600);assert.equal(a.pendingFrames(),0);
  tapContent(a,86,786);assert.deepEqual(a.saved['2048-save'],before);
});
test('快递按两次有效滑动送到指定空格，撤销恢复在途状态',()=>{
  const a=setup({energy:3,board:[64,2,...Array(14).fill(0)],random:0});
  openMail(a);tapCell(a,15);confirmFeature(a);a.advance(600);
  a.key('ArrowUp');assert.equal(a.saved['2048-save'].parcel.remaining,2); // Invalid move.
  a.key('ArrowRight');assert.equal(a.saved['2048-save'].parcel.remaining,1);a.advance(600);
  const inTransit=JSON.parse(JSON.stringify(a.saved['2048-save']));
  a.key('ArrowLeft');assert.equal(a.saved['2048-save'].parcel,null);assert.equal(a.saved['2048-save'].board[15],64);
  assert.equal(a.saved['2048-save'].board.reduce((x,y)=>x+y),134);
  a.advance(600);assert.equal(a.pendingFrames(),0);tapContent(a,86,786);
  assert.deepEqual(a.saved['2048-save'],inTransit);
  a.key('ArrowLeft');assert.equal(a.saved['2048-save'].board[15],64);assert.equal(a.saved['2048-save'].steps,2);
});
test('快递同值到货直接合并计分但不额外蓄能，待签收不覆盖',()=>{
  const a=setup({energy:0,board:[0,64,...Array(14).fill(0)],parcel:{value:64,target:0,remaining:1},random:0});
  a.key('ArrowLeft');assert.equal(a.saved['2048-save'].board[0],128);
  assert.equal(a.saved['2048-save'].score,128);assert.equal(a.saved['2048-save'].energy,0);
  assert.ok(a.texts.includes('快递 64 已签收 · 合成 128 · 第1行第1列'));a.advance(600);assert.equal(a.pendingFrames(),0);
  const b=setup({energy:0,board:[0,32,...Array(14).fill(0)],parcel:{value:64,target:0,remaining:1},random:0});
  b.key('ArrowLeft');assert.equal(b.saved['2048-save'].board[0],32);assert.equal(b.saved['2048-save'].parcel.remaining,0);
  b.advance(600);b.key('ArrowRight');assert.equal(b.saved['2048-save'].parcel,null);assert.equal(b.saved['2048-save'].board[0],64);
});
test('到货占用最后一个空位时不覆盖其他牌，不消费普通预告',()=>{
  const board=[2,2,4,8,4,8,16,32,8,16,32,64,16,32,64,128];
  const a=setup({board,energy:0,next:4,parcel:{value:256,target:3,remaining:1},random:0});
  a.key('ArrowLeft');assert.equal(a.saved['2048-save'].board.filter(Boolean).length,16);
  assert.equal(a.saved['2048-save'].board[3],256);assert.equal(a.saved['2048-save'].next,4);
  assert.equal(a.saved['2048-save'].board.reduce((x,y)=>x+y),board.reduce((x,y)=>x+y)+256);
});
test('快递保存恢复与后台均不推进步数，最多一封且坏存档清理',()=>{
  const parcel={value:64,target:15,remaining:1};const a=setup({energy:3,parcel});
  a.listeners.hide();a.advance(5000);a.listeners.show();assert.equal(a.saved['2048-save'].parcel.remaining,1);
  openMail(a);assert.ok(a.texts.includes('已有一封快递 · 还需 1 步送达'));
  assert.equal(a.saved['2048-save'].energy,3);
  const b=setup({parcel:{value:3,target:99,remaining:-1}});assert.ok(!b.texts.some(t=>typeof t==='string'&&t.includes('待签收')));
});
test('系统减少动态效果时两种技能直接显示结果，选址和静止标记不常驻请求帧',()=>{
  const a=setup({energy:3,reducedMotion:true,board:[2,4,4,2,...Array(12).fill(0)]});
  tapFold(a);assert.equal(a.pendingFrames(),0);
  const b=setup({energy:3,reducedMotion:true});openMail(b);assert.equal(b.pendingFrames(),0);
  tapCell(b,15);confirmFeature(b);assert.equal(b.pendingFrames(),0);assert.equal(b.saved['2048-save'].parcel.remaining,2);
});

test('持续提醒仅30fps重绘技能区，滑动不打断，后台停止、回来恢复',()=>{
  const a=setup({energy:3,board:[2,4,4,2,8,16,32,64,...Array(8).fill(0)],random:0});
  assert.equal(a.pendingFrames(),1);assert.ok(!a.texts.includes('可用'));
  const before=a.renders(),full=a.rects.filter(r=>r.w===390&&r.h===844).length;
  for(let i=0;i<600;i++)a.advance(1000/120);
  const frames=a.renders()-before;assert.ok(frames>=149&&frames<=151,'空闲绘制帧数 '+frames);
  assert.equal(a.rects.filter(r=>r.w===390&&r.h===844).length,full);
  a.key('ArrowLeft');assert.equal(a.saved['2048-save'].steps,1);a.advance(900);
  assert.equal(a.pendingFrames(),1);a.listeners.hide();assert.equal(a.pendingFrames(),0);
  const draws=a.renders();a.advance(5000);assert.equal(a.renders(),draws);
  a.listeners.show();assert.equal(a.pendingFrames(),1);
  const b=setup({energy:3,reducedMotion:true});assert.equal(b.pendingFrames(),0);assert.ok(!b.texts.includes('可用'));
});
test('满能量提醒不阻塞立即使用技能，消耗后清除高亮且不重复扣能量',()=>{
  const a=setup({energy:3,board:[2,4,4,2,...Array(12).fill(0)]});
  tapFold(a);assert.equal(a.pendingFrames(),1);
  a.advance(1000);assert.equal(a.saved['2048-save'].energy,0);assert.equal(a.pendingFrames(),0);
  const count=a.texts.length;openMail(a);assert.equal(a.saved['2048-save'].energy,0);
  assert.ok(a.texts.slice(count).includes('还差 3 格能量 · 三种技能共用能量'));
});
test('在途快递和无重合棋盘不会伪装成可用；满能量后空格技能仍可用',()=>{
  const a=setup({energy:3,board:[2,4,...Array(14).fill(0)],parcel:{value:64,target:15,remaining:2}});
  assert.ok(!a.texts.includes('可用'));assert.ok(!a.texts.includes('在途'));assert.equal(a.pendingFrames(),1); // Pair remains available.
  const b=setup();b.key('ArrowLeft');assert.equal(b.saved['2048-save'].energy,3);
  b.advance(200);assert.equal(b.pendingFrames(),1);b.advance(1200);assert.equal(b.pendingFrames(),1);
});
test('每日能量保留顶部入口，侧边栏返回领取后补满，日内重进不重复领取',()=>{
  const sidebar={supported:true,fromSidebar:false};const a=setup({energy:0,sidebar});
  assert.ok(a.texts.includes('每日能量'));tapDesign(a,315,60);
  assert.ok(a.texts.includes('每日能量补给'));tapDesign(a,179,460);
  assert.equal(a.listeners.sidebarOpened,true);assert.equal(a.saved['2048-save'].energy,0);
  sidebar.fromSidebar=true;sidebar.changed();tapDesign(a,315,60);tapDesign(a,179,460);
  assert.equal(a.saved['2048-save'].energy,3);assert.ok(a.saved['2048-sidebar-day']);
  assert.ok(a.texts.includes('今日已领'));a.advance(1200);tapSkill(a);a.advance(800);
  const energy=a.saved['2048-save'].energy;tapDesign(a,315,60);tapDesign(a,179,460);
  assert.equal(a.saved['2048-save'].energy,energy);assert.ok(a.texts.includes('今日已领取'));
});
test('原生全面屏底部留白后技能命中仍正确，单击自动折叠可撤销',()=>{
  const info={windowWidth:390,windowHeight:844,pixelRatio:3,safeArea:{top:47,bottom:810}};
  const a=setup({native:true,info,energy:3,board:[2,4,4,2,...Array(12).fill(0)]});
  tapFold(a);assert.deepEqual(a.saved['2048-save'].board.slice(0,4),[4,8,0,0]);
  a.advance(900);tapContent(a,86,786);assert.equal(a.saved['2048-save'].energy,3);
});

test('仅技能区提醒发生慢帧降级时，立即调整画布并完整重绘，消耗技能后停帧',()=>{
  const a=setup({energy:3,dpr:3,renderCost:10,board:[2,4,4,2,...Array(12).fill(0)]});
  for(let i=0;i<400;i++)a.advance(1000/120);
  assert.equal(a.canvas.width,585);assert.deepEqual(a.fps,[60,30]);
  assert.ok(a.rects.filter(r=>r.w===390&&r.h===844).length>=2);
  tapFold(a);a.advance(1200);assert.equal(a.pendingFrames(),0);
});

test('统一技能区明确显示合并充能，多组合并只充一格，旧位置不再触发配对',()=>{
  const a=setup({energy:0,board:[2,2,4,4,...Array(12).fill(0)],random:0});
  assert.ok(a.texts.includes('合并充能 0/3'));a.key('ArrowLeft');
  assert.equal(a.saved['2048-save'].energy,1);assert.ok(a.texts.includes('合并充能 1/3'));
  assert.ok(a.texts.includes('合并充能 +1 · 1/3，还差 2 次合并'));
  a.advance(1700);assert.ok(a.texts.includes('再合并 2 次，可选下方一个技能'));assert.equal(a.pendingFrames(),0);
  const b=setup({energy:2,random:0});b.key('ArrowLeft');b.advance(800);
  assert.ok(b.texts.includes('充能已满 3/3'));tapDesign(b,144,207);
  assert.equal(b.saved['2048-save'].energy,3);tapSkill(b);assert.equal(b.saved['2048-save'].energy,0);
  assert.ok(b.texts.includes('合并充能 0/3'));
});
test('充能飞入不延长200ms滑动窗口；后台清理飞行动画且不重播',()=>{
  const a=setup({energy:0,random:0});a.key('ArrowLeft');a.advance(200);
  a.key('ArrowDown');assert.equal(a.saved['2048-save'].steps,2);a.advance(1000);assert.equal(a.pendingFrames(),0);
  const b=setup({energy:0});b.key('ArrowLeft');b.advance(150);b.listeners.hide();
  assert.equal(b.pendingFrames(),0);b.listeners.show();assert.equal(b.pendingFrames(),0);
  assert.ok(b.texts.includes('合并充能 1/3'));b.advance(2000);assert.equal(b.pendingFrames(),0);
  const c=setup({energy:0,reducedMotion:true});c.key('ArrowLeft');c.advance(210);assert.equal(c.pendingFrames(),0);
});

test('连续充能槽从旧进度单向增长到新进度，飞行开始前不闪回',()=>{
  const a=setup({energy:0,random:0});a.key('ArrowLeft');
  for(const ms of [50,60,180,150,150,100])a.advance(ms);
  const widths=a.rects.filter(r=>r.x===226&&r.y===635&&r.h===12).map(r=>r.w);
  assert.ok(widths.length>4);assert.equal(widths[0],0);
  for(let i=1;i<widths.length;i++)assert.ok(widths[i]+.00001>=widths[i-1],'充能进度不能倒退');
  assert.ok(Math.abs(widths.at(-1)-118/3)<.00001);assert.equal(a.pendingFrames(),0);
});

test('满充能时合并飘分结束必须清理棋盘，随后仅局部绕边重绘',()=>{
  const a=setup({energy:3,random:0});a.key('ArrowLeft');a.advance(500);
  assert.ok(a.texts.includes('+4'),'已经绘制合并飘分');
  const fullDraws=()=>a.rects.filter(r=>r.w===390&&r.h===844).length;
  const before=fullDraws();a.texts.length=0;
  a.advance(40);
  assert.equal(fullDraws(),before+1,'最后一个合并特效过期时补一次完整重绘，清掉遗留像素');
  assert.ok(!a.texts.includes('+4'),'最终清理帧不再绘制飘分');
  const settled=fullDraws();a.advance(100);
  assert.equal(fullDraws(),settled,'清理后恢复技能区局部重绘');
  assert.equal(a.pendingFrames(),1,'保留技能绕边动画');
  assert.equal(a.saved['2048-save'].score,4);assert.equal(a.saved['2048-save'].steps,1);
});

function enterRelax(a,index){tapDesign(a,185,56);a.advance(0);tapDesign(a,index%2*184+86,143+Math.floor(index/2)*156+70);a.advance(0);tapDesign(a,304,111);a.advance(0);}
function dragDesign(a,x,y,xx,yy){const {scale,ox,oy}=a.layout;a.listeners.start(x*scale+ox,y*scale+oy);a.listeners.move(xx*scale+ox,yy*scale+oy);a.listeners.end(xx*scale+ox,yy*scale+oy);}
test('六种解压模式均可进入并返回，独立于原有2048棋盘',()=>{
  const names=['连锁清盘','软块收纳','磁吸归位','彩砂填瓶','流体画布','软团碰撞'];
  names.forEach((name,index)=>{const a=setup({energy:0}),before=JSON.parse(JSON.stringify(a.saved['2048-save']));enterRelax(a,index);assert.ok(a.texts.includes(name));
    a.advance(40);a.key('Escape');a.advance(40);a.key('Escape');a.advance(40);assert.deepEqual(a.saved['2048-save'],before);assert.equal(a.pendingFrames(),0);
  });
});
test('连锁清盘可清空、撤销和进入下一关，经典分数与能量不受影响',()=>{
  const a=setup({energy:1});enterRelax(a,0);a.key('ArrowLeft');
  assert.ok(a.saved['2048-relax-v1'].chain.board.every(v=>!v));a.advance(1100);
  tapDesign(a,86,722);assert.deepEqual(a.saved['2048-relax-v1'].chain.board,[2,2,4,8,...Array(12).fill(0)]);
  a.key('ArrowLeft');a.advance(1100);tapDesign(a,270,722);assert.equal(a.saved['2048-relax-v1'].chain.level,1);
  assert.equal(a.saved['2048-save'].score,0);assert.equal(a.saved['2048-save'].energy,1);assert.equal(a.pendingFrames(),0);
});
test('收纳与磁吸通过实际拖放归位，错误落点返回且支持撤销',()=>{
  const a=setup({energy:0});enterRelax(a,1);
  dragDesign(a,55,447,98,219);a.advance(400);assert.deepEqual(a.saved['2048-relax-v1'].storage,[0]);
  dragDesign(a,209,447,10,610);a.advance(400);assert.deepEqual(a.saved['2048-relax-v1'].storage,[0]);
  tapDesign(a,86,722);assert.deepEqual(a.saved['2048-relax-v1'].storage,[]);
  a.key('Escape');tapDesign(a,86,369);a.advance(0);tapDesign(a,304,111);a.advance(0); // Magnet card in the second row.
  dragDesign(a,48,440,83,210);a.advance(400);assert.deepEqual(a.saved['2048-relax-v1'].magnet,[0]);
  tapDesign(a,86,722);assert.deepEqual(a.saved['2048-relax-v1'].magnet,[]);
});
test('三个模拟模式可暂停、清空，后台取消帧且恢复时不追赶时间',()=>{
  for(const index of [3,4,5]){
    const a=setup({energy:0});enterRelax(a,index);
    dragDesign(a,150,220,170,290);a.advance(80);tapDesign(a,86,732);a.advance(40);
    assert.ok(a.texts.includes('已暂停，慢慢来'));assert.equal(a.pendingFrames(),0);
    const draws=a.renders();a.advance(5000);assert.equal(a.renders(),draws);
    tapDesign(a,270,732);a.advance(40);a.listeners.hide();assert.equal(a.pendingFrames(),0);
    a.advance(60000);a.listeners.show();a.advance(40);assert.ok(a.pendingFrames()<=1);a.key('Escape');a.advance(40);assert.equal(a.pendingFrames(),0);
  }
});

test('收纳可连续快速拖放五块，吸附动画不会吞掉下一次操作',()=>{
  const a=setup({energy:0});enterRelax(a,1);
  dragDesign(a,55,447,98,219);dragDesign(a,209,447,206,219);
  dragDesign(a,209,537,206,273);dragDesign(a,293,537,260,273);dragDesign(a,55,593,98,327);
  assert.equal(a.saved['2048-relax-v1'].storage.length,5);a.advance(1000);
  assert.ok(a.texts.includes('收得刚刚好'));assert.equal(a.pendingFrames(),0);
});

test('流体高频拖动合并到帧回调，不因每次触摸全屏重绘',()=>{
  const a=setup({energy:0});enterRelax(a,4);const {scale,ox,oy}=a.layout;
  a.listeners.start(150*scale+ox,230*scale+oy);const before=a.renders();
  for(let i=0;i<100;i++)a.listeners.move((150+i*.5)*scale+ox,(230+i*.5)*scale+oy);
  assert.equal(a.renders(),before,'高频触摸不直接绘制');assert.equal(a.pendingFrames(),1);
  a.advance(40);assert.equal(a.renders(),before+1);a.listeners.end(200*scale+ox,280*scale+oy);
});
test('清盘只接受从棋盘区域开始的滑动，标题和底部说明不触发',()=>{
  const a=setup({energy:0});enterRelax(a,0);const before=a.saved['2048-relax-v1'].chain.board.slice();
  dragDesign(a,200,90,100,90);assert.deepEqual(a.saved['2048-relax-v1'].chain.board,before);
  dragDesign(a,240,250,120,250);assert.ok(a.saved['2048-relax-v1'].chain.board.every(v=>!v));
});

test('解压进度独立恢复并过滤坏存档，进入模式不会清空经典棋盘',()=>{
  const relaxSave={chain:{level:1,board:require('../src/relax-core').LEVELS[1].board.slice()},storage:[0,2],magnet:[1,4,8]};
  for(const [index,expected] of [[0,'第 2 / 5 关 · 无随机补牌'],[1,'已收好 2 / 5 块 · 编号对应位置'],[2,'已归位 3 / 9 块']]){
    const a=setup({energy:2,relaxSave});const before=JSON.parse(JSON.stringify(a.saved['2048-save']));enterRelax(a,index);assert.ok(a.texts.includes(expected));assert.deepEqual(a.saved['2048-save'],before);
  }
  const a=setup({relaxSave:{chain:{level:999,board:[]},storage:[0,0],magnet:[99]}});enterRelax(a,1);
  assert.ok(a.texts.includes('已收好 0 / 5 块 · 编号对应位置'));assert.deepEqual(a.saved['2048-relax-v1'].storage,[]);
});

test('流体离屏上下文不可用时只尝试一次，回退绘制仍可交互',()=>{
  let attempts=0;const a=setup({energy:0,surface:()=>{attempts++;return {getContext:()=>{throw Error('unsupported context');}};}});
  enterRelax(a,4);for(let i=0;i<8;i++)a.advance(40);assert.equal(attempts,1);
  dragDesign(a,130,230,230,350);a.advance(40);assert.ok(a.texts.includes('流体画布'));assert.equal(attempts,1);
});
test('深化关卡从小屋默认进入，三层返回完整恢复2048，后台不会留下帧任务',()=>{
  const ids=['chain','storage','magnet','sand','fluid','soft'],L=require('../src/challenge-core');
  ids.forEach((id,i)=>{const a=setup({energy:0}),before=JSON.parse(JSON.stringify(a.saved['2048-save']));tapDesign(a,185,56);tapDesign(a,i%2*184+86,143+Math.floor(i/2)*156+70);assert.ok(a.texts.includes('继续第 1 关'));tapDesign(a,50,205);assert.ok(a.texts.includes(L.LEVELS[id][0].name));
    if(id==='chain'){a.key('ArrowLeft');}else if(id==='sand'||id==='fluid'){const {scale,ox,oy}=a.layout;a.listeners.start(179*scale+ox,220*scale+oy);for(let j=0;j<5;j++)a.advance(40);}
    a.listeners.hide();assert.equal(a.pendingFrames(),0);a.advance(60000);a.listeners.show();a.advance(40);assert.ok(a.pendingFrames()<=1);a.key('Escape');a.key('Escape');a.key('Escape');a.advance(40);assert.equal(a.pendingFrames(),0);assert.deepEqual(a.saved['2048-save'],before);
  });
});
