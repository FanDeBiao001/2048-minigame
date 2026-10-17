const test=require('node:test'),assert=require('node:assert/strict');
const S=require('../src/swap-effect');
test('换牌离开预告位、放大，展示卡背后再回原位',()=>{
  const start=S.pose(0),raised=S.pose(150),back=S.pose(340),result=S.pose(540),end=S.pose(S.DURATION);
  assert.equal(start.size,30);assert.equal(start.x,66);assert.equal(start.y,207);assert.equal(start.face,'old');
  assert.equal(raised.size,100);assert.equal(raised.x,179);assert.equal(raised.y,433);
  assert.equal(back.face,'back');assert.equal(back.width,1);
  assert.equal(result.face,'new');assert.equal(result.size,100);
  assert.equal(end.size,30);assert.equal(end.x,66);assert.equal(end.y,207);assert.equal(end.done,true);
  assert.ok(S.pose(230).width<.05);assert.ok(S.pose(460).width<.05);
});
test('翻面只显示对应数字或卡背，两个换牌方向都可正确呈现',()=>{
  for(const [from,to] of [[2,4],[4,2]]){
    const labels=[];
    const ctx=new Proxy({}, {get:(_,key)=>key==='fillText'?value=>labels.push(value):()=>{},set:()=>true});
    const palette={2:['#ede9df','#5a6156'],4:['#e4e8cd','#546044']};
    S.draw(ctx,150,from,to,palette);assert.ok(labels.includes(from));assert.ok(!labels.includes(to));
    labels.length=0;S.draw(ctx,340,from,to,palette);
    assert.ok(labels.includes('⇄'));assert.ok(!labels.includes(from));assert.ok(!labels.includes(to));
    labels.length=0;S.draw(ctx,540,from,to,palette);assert.ok(labels.includes(to));assert.ok(!labels.includes(from));
  }
});
test('配对牌从已有牌位置翻出，准确落在指定格且支持大数字',()=>{
  const route={origin:{x:309.5,y:302.5,size:77},destination:{x:309.5,y:389.5,size:77},title:'获得同值配对牌',subtitle:'64 × 1 · 第2行第4列'};
  const start=S.pose(0,route),end=S.pose(S.DURATION,route);
  assert.equal(start.x,309.5);assert.equal(start.y,302.5);assert.equal(start.size,77);
  assert.equal(end.x,309.5);assert.equal(end.y,389.5);assert.equal(end.size,77);
  assert.equal(S.pose(340,route).face,'back');
  const labels=[],ctx=new Proxy({}, {get:(_,key)=>key==='fillText'?value=>labels.push(value):()=>{},set:()=>true});
  S.draw(ctx,540,4096,4096,{},route);assert.ok(labels.includes(4096));assert.ok(labels.includes(route.subtitle));
});
