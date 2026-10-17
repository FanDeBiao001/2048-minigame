const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../src/merge-effects');
test('碰撞挤压、回弹按滑动方向变形，末尾回归原尺寸', () => {
  const h = F.deformation(0, true), v = F.deformation(0, false);
  assert.ok(h.x < 1 && h.y > 1);
  assert.equal(v.x, h.y); assert.equal(v.y, h.x);
  assert.ok(F.deformation(78, true).x > 1);
  assert.deepEqual(F.deformation(340, true), {x:1,y:1});
});
test('多个合并并发但特效池有上限，过期清理，不变更输入', () => {
  const effects = F.create(), items = Array.from({length:16}, (_,index)=>({index,value:4,x:0,y:0}));
  effects.emit(items, 100, 'left', 2);
  assert.equal(effects.count(), F.MAX_BURSTS);
  assert.equal(items.length, 16);
  effects.update(100+F.DURATION); assert.equal(effects.active(), false);
});
test('前一步粒子可以继续播放，但不能让新棋盘的方块变形', () => {
  const effects=F.create();effects.emit([{index:0,value:4,x:0,y:0}],110,'left',1);
  assert.ok(effects.tile(0,188).x>1);
  assert.deepEqual(effects.tile(0,220,310),{x:1,y:1});
  assert.equal(effects.active(),true);
  effects.clear();assert.equal(effects.active(),false);
});

test('碰撞后保留短促压缩停顿，再完整回弹',()=>{
  assert.deepEqual(F.deformation(0,true),F.deformation(24,true));
  assert.ok(F.deformation(78,true).x>1);
  assert.deepEqual(F.deformation(340,true),{x:1,y:1});
});

test('形变近似保持面积，省电档限制装饰但保留所有合并形变',()=>{
  for(let age=0;age<340;age+=7){const p=F.deformation(age,true);assert.ok(Math.abs(p.x*p.y-1)<1e-9);}
  let profile={duration:420,decorations:4,droplets:4};
  const effects=F.create(()=>profile),items=Array.from({length:8},(_,index)=>({index,value:4,x:0,y:0}));
  effects.emit(items,0,'left',1);
  let arcs=0,scores=0;
  const ctx=new Proxy({}, {get:(_,key)=>key==='arc'?()=>arcs++:key==='fillText'?()=>scores++:()=>{},set:()=>true});
  effects.draw(ctx,78,'over');assert.equal(arcs,20);assert.equal(scores,4);
  profile={duration:340,decorations:2,droplets:0};arcs=0;scores=0;
  effects.draw(ctx,78,'over');assert.equal(arcs,2);assert.equal(scores,2);
  assert.equal(effects.count(),8);assert.ok(effects.tile(0,78).x>1);
  effects.update(340);assert.equal(effects.active(),false);
});
