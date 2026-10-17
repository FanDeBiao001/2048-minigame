const test=require('node:test'),assert=require('node:assert/strict');
const U=require('../src/skill-ui');

test('短屏和全面屏都将所有控制放在安全区内，三个技能有足够点击高度',()=>{
  for(const [w,h,top,bottom] of [[320,568,20,0],[375,667,20,0],[390,844,47,34],[430,932,59,34]]){
    const layout=U.fit({windowWidth:w,windowHeight:h,safeArea:{top,bottom:h-bottom}},true);
    assert.ok(layout.oy>=top+40);
    assert.ok(layout.oy+U.HEIGHT*layout.scale<=h-Math.max(18,bottom)+.001);
    assert.ok(layout.ox>=16-.001);
    if(h>=667)assert.ok(62*layout.scale>=44,'技能点击高度 '+62*layout.scale);
    U.CARDS.forEach((card,i)=>{assert.ok(card.x>=0&&card.x+106<=358);if(i)assert.ok(card.x>=U.CARDS[i-1].x+106+8);});
  }
});
test('可用期间循环提醒，不随普通重绘重置相位；失去资格才结束',()=>{
  const cue=U.createCue();cue.update(3,0);
  const peak=cue.pose(1,U.PERIOD_MS/2);assert.ok(peak.phase>=0&&peak.phase<1);
  cue.update(3,U.PERIOD_MS);assert.equal(cue.active(),true);
  assert.deepEqual(cue.pose(1,U.PERIOD_MS*1.5),peak);
  cue.update(3,U.PERIOD_MS*2);assert.equal(cue.active(),true);
  const retained=cue.pose(2,U.PERIOD_MS*2.5);
  cue.update(2,U.PERIOD_MS*2.5);assert.equal(cue.pose(1,U.PERIOD_MS*2.5),null);
  assert.deepEqual(cue.pose(2,U.PERIOD_MS*2.5),retained);
  const before=U.meteorPoint(cue.pose(2,U.PERIOD_MS*3-.1).phase),after=U.meteorPoint(cue.pose(2,U.PERIOD_MS*3+.1).phase);
  assert.ok(Math.hypot(before.x-after.x,before.y-after.y)<.03,'循环边界位置连续');
  cue.update(0,10000);assert.equal(cue.active(),false);
});
test('循环提醒空闲时各刷新率下均限制30fps，关闭提醒立即停止',()=>{
  for(const hz of [60,90,120,144]){
    const cue=U.createCue();cue.update(3,0);let frames=0;
    for(let i=0;i<hz*4;i++)if(cue.allowIdleFrame(i*1000/hz))frames++;
    assert.ok(frames>=119&&frames<=121,hz+'Hz: '+frames);
    cue.update(0,5000);assert.equal(cue.allowIdleFrame(5000),false);
  }
});
test('面板、后台和减少动态效果关闭提醒；重新可见时恢复循环',()=>{
  const cue=U.createCue();cue.update(3,0);assert.equal(cue.active(),true);
  cue.update(3,200,{covered:true});assert.equal(cue.active(),false);
  cue.update(3,300);assert.equal(cue.active(),true);
  cue.update(3,400,{reduced:true});assert.equal(cue.active(),false);
  cue.update(3,500);cue.cancel();assert.equal(cue.active(),false);
  cue.update(3,600);assert.equal(cue.active(),true);
});

test('充能飞行与连续填充有固定寿命，过期与未开始时不绘制',()=>{
  assert.equal(U.chargePose(-1),null);assert.equal(U.chargePose(U.CHARGE_MS),null);
  assert.equal(U.chargePose(0).flight,0);assert.equal(U.chargePose(380).flight,1);
  assert.ok(U.chargePose(420).fill>.8);assert.ok(U.chargePose(U.CHARGE_MS-1).opacity<.01);
  for(const card of U.CARDS){assert.ok(card.x>=0&&card.x+106<=358);}
});

test('流星沿圆角边界匀速绕行，跨圈连续且三个技能错开相位',()=>{
  const start=U.meteorPoint(0);assert.deepEqual(U.meteorPoint(1),start);assert.deepEqual(U.meteorPoint(-1),start);
  let previous=start,distances=[];
  for(let i=1;i<=400;i++){
    const point=U.meteorPoint(i/400);
    assert.ok(point.x>=1.24&&point.x<=104.76&&point.y>=1.24&&point.y<=60.76);
    assert.ok(point.x<=13||point.x>=93||point.y<=1.26||point.y>=60.74,'光点只在边缘');
    distances.push(Math.hypot(point.x-previous.x,point.y-previous.y));previous=point;
  }
  assert.ok(Math.max(...distances)-Math.min(...distances)<.015,'圆角不突然加速或停顿');
  const cue=U.createCue();cue.update(7,0);
  assert.equal(new Set([1,2,4].map(bit=>cue.pose(bit,100).phase)).size,3);
  cue.update(5,200);assert.equal(cue.pose(2,200),null);assert.ok(cue.pose(1,200));
});
test('绕边固定十二段连续渐隐线，无独立亮点、模糊或阴影',()=>{
  const calls=[],ctx=new Proxy({}, {get:(_,key)=>(...args)=>calls.push([key,...args]),set:(_,key,value)=>{calls.push([key,value]);return true;}});
  U.drawMeteor(ctx,12,680,.999,U.CARDS[0].trail);U.drawMeteor(ctx,240,680,.001,U.CARDS[2].trail);
  assert.equal(calls.filter(c=>c[0]==='stroke').length,24);
  assert.equal(calls.filter(c=>c[0]==='fill'||c[0]==='arc').length,0,'没有亮点或光晕');
  const alpha=calls.filter(c=>c[0]==='globalAlpha').map(c=>c[1]);
  assert.equal(alpha.length,24);assert.ok(Math.max(...alpha)<.67);
  for(let i=1;i<12;i++)assert.ok(alpha[i]>alpha[i-1],'从尾到头连续增加亮度');
  assert.equal(new Set(calls.filter(c=>c[0]==='lineWidth').map(c=>c[1])).size,1);
  assert.ok(!calls.some(c=>/gradient|shadow|filter/i.test(c[0])));
  assert.ok(calls.every(c=>c.slice(1).every(v=>typeof v!=='number'||Number.isFinite(v))));
});
