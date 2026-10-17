const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../src/core'),V=require('../src/feature-effects');
test('左右对折按镜像重合，一次合并两组且不改输入',()=>{
  const b=[2,4,4,2,...Array(12).fill(0)],before=b.slice();
  const left=C.fold(b,'left'),right=C.fold(b,'right');
  assert.deepEqual(left.board.slice(0,4),[4,8,0,0]);assert.equal(left.gain,12);assert.equal(left.pairs.length,2);
  assert.deepEqual(right.board.slice(0,4),[0,0,8,4]);assert.deepEqual(b,before);
});
test('上下对折遵守相同镜像规则，不同数字展开归位',()=>{
  const b=C.empty();[2,4,4,2].forEach((v,i)=>b[i*4]=v);
  assert.deepEqual([0,4,8,12].map(i=>C.fold(b,'up').board[i]),[4,8,0,0]);
  assert.deepEqual([0,4,8,12].map(i=>C.fold(b,'down').board[i]),[0,0,8,4]);
  const mixed=[2,8,4,2,...Array(12).fill(0)];
  assert.deepEqual(C.fold(mixed,'left').board.slice(0,4),[4,8,4,0]);
  assert.equal(C.fold(mixed,'left').gain,4);
});
test('折叠无匹配不变化；最多八组，每块只参与一次，数值总和守恒',()=>{
  const no=[2,4,8,16,...Array(12).fill(0)];assert.equal(C.fold(no,'left').changed,false);
  const b=Array(16).fill(2),r=C.fold(b,'left');assert.equal(r.pairs.length,8);assert.equal(r.gain,32);
  assert.equal(r.board.reduce((a,b)=>a+b),32);assert.equal(r.board.filter(Boolean).length,8);
  assert.throws(()=>C.fold(b,'bad'));
});
test('普通方向均无法移动时，仍可能通过折叠继续',()=>{
  const b=[2,4,8,2,4,8,2,4,8,2,4,8,2,4,8,2];
  assert.equal(C.over(b),true);assert.equal(C.canFold(b),true);
  assert.ok(C.fold(b,'left').board.includes(0));
});
test('快递只在有效动作调用时倒数，两步到空格，仅签收一次',()=>{
  const b=C.empty(),parcel={value:64,target:15,remaining:2};
  const first=C.deliver(b,parcel);assert.equal(first.parcel.remaining,1);assert.equal(first.board[15],0);
  const second=C.deliver(first.board,first.parcel);assert.equal(second.parcel,null);assert.equal(second.board[15],64);assert.equal(second.gain,0);
  assert.equal(C.deliver(second.board,second.parcel).board[15],64);
  assert.deepEqual(parcel,{value:64,target:15,remaining:2});assert.deepEqual(b,C.empty());
});
test('快递到同值格合并计分，异值格待签收且绝不覆盖',()=>{
  const b=C.empty();b[7]=64;
  const merged=C.deliver(b,{value:64,target:7,remaining:1});
  assert.equal(merged.board[7],128);assert.equal(merged.gain,128);assert.equal(merged.delivery.merged,true);
  const blocked=C.deliver(b,{value:32,target:7,remaining:1});
  assert.equal(blocked.board[7],64);assert.equal(blocked.parcel.remaining,0);assert.equal(blocked.delivery,null);
  blocked.board[7]=0;const later=C.deliver(blocked.board,blocked.parcel);
  assert.equal(later.board[7],32);assert.equal(later.parcel,null);
});
test('折叠不推进快递步数，但已到站快递可在腾空后签收',()=>{
  const b=C.empty();
  assert.equal(C.deliver(b,{value:64,target:3,remaining:2},false).parcel.remaining,2);
  assert.equal(C.deliver(b,{value:64,target:3,remaining:0},false).board[3],64);
});
test('超出安全整数的快递合并保留待签收，不破坏存档',()=>{
  const b=C.empty();b[0]=2**52;
  const r=C.deliver(b,{value:2**52,target:0,remaining:1});
  assert.equal(r.board[0],2**52);assert.equal(r.parcel.remaining,0);assert.equal(r.delivery,null);
});
test('纸面先合拢露背，再展开为最终棋盘；所有方向与快递绘制可运行',()=>{
  assert.equal(V.foldPose(0).scale,1);assert.equal(V.foldPose(360).back,true);
  assert.equal(V.foldPose(360).resolved,true);assert.equal(V.foldPose(V.FOLD_MS).scale,1);
  const ctx=new Proxy({}, {get:()=>()=>{},set:()=>true}),before=Array(16).fill(2),after=C.fold(before,'left').board;
  let tiles=0;const tile=()=>tiles++;
  for(const direction of ['left','right','up','down'])for(const age of [0,210,360,600,680])V.fold(ctx,age,before,after,direction,tile);
  assert.ok(tiles>0);V.send(ctx,250,{x:48,y:302},{x:309,y:563},64);
  V.receive(ctx,200,{x:309,y:563},128,tile);
});

test('自动择优优先总得分，同分优先合并组数，再按固定方向稳定选择',()=>{
  const b=C.empty();b[0]=2;b[1]=64;b[3]=2;b[13]=64;
  const before=b.slice(),plan=C.bestFold(b);
  assert.equal(plan.direction,'up');assert.equal(plan.totalGain,128);assert.deepEqual(b,before);
  const tied=C.empty();tied[0]=2;tied[2]=4;tied[3]=2;tied[4]=2;tied[7]=2;tied[14]=4;
  assert.equal(C.fold(tied,'up').gain,8);assert.equal(C.fold(tied,'up').pairs.length,1);
  const best=C.bestFold(tied);assert.equal(best.totalGain,8);assert.equal(best.pairs.length,2);assert.equal(best.direction,'left');
  for(let i=0;i<10;i++)assert.deepEqual(C.bestFold(tied),best);
  assert.equal(C.bestFold([2,4,8,16,...Array(12).fill(0)]),null);
});
test('自动择优计入已到站快递合并，但不推进在途快递且不修改输入',()=>{
  const b=[2,4,4,2,...Array(12).fill(0)],before=b.slice(),parcel={value:4,target:3,remaining:0};
  const plan=C.bestFold(b,parcel);assert.equal(plan.direction,'right');assert.equal(plan.totalGain,20);
  assert.deepEqual(plan.delivered.board.slice(0,4),[0,0,8,8]);assert.equal(plan.delivered.parcel,null);
  assert.deepEqual(b,before);assert.deepEqual(parcel,{value:4,target:3,remaining:0});
  const waiting=C.bestFold(b,{...parcel,remaining:1});assert.equal(waiting.direction,'left');
  assert.equal(waiting.totalGain,12);assert.equal(waiting.delivered.parcel.remaining,1);
});
