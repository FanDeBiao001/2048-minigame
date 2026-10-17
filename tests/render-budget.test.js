const test=require('node:test'),assert=require('node:assert/strict');
const B=require('../src/render-budget');
test('60/90/120/144Hz回调下，绘制预算都保持约60fps',()=>{
  for(const hz of [60,90,120,144]){
    const budget=B.create();let frames=0;
    for(let i=0;i<hz*10;i++)if(budget.allowFrame(i*1000/hz))frames++;
    assert.ok(frames>=599&&frames<=601,hz+'Hz: '+frames);
  }
});
test('正常与省电档都限制DPR及总像素数',()=>{
  const budget=B.create(),info={windowWidth:1200,windowHeight:2000,pixelRatio:3};
  assert.ok(info.windowWidth*info.windowHeight*budget.pixelRatio(info)**2<=2000001);
  for(let i=0;i<24;i++)budget.sample(9,16);
  assert.equal(budget.settings().fps,30);
  assert.ok(info.windowWidth*info.windowHeight*budget.pixelRatio(info)**2<=1200001);
});
test('单次卡顿不会降级；持续掉帧降级后本次会话不反复升档',()=>{
  const budget=B.create();budget.sample(50,50);
  for(let i=0;i<23;i++)budget.sample(2,16);
  assert.equal(budget.settings().fps,60);
  for(let i=0;i<24;i++)budget.sample(2,33);
  assert.equal(budget.settings().fps,30);
  for(let i=0;i<48;i++)budget.sample(1,8);
  assert.equal(budget.settings().fps,30);
  budget.resetClock();let frames=0;
  for(let i=0;i<120;i++)if(budget.allowFrame(i*1000/120))frames++;
  assert.equal(frames,30);
});
test('长时间空闲后的首个回调不作为掉帧证据',()=>{
  const budget=B.create();
  for(let i=0;i<24;i++)budget.sample(1,500);
  assert.equal(budget.settings().fps,60);
});
