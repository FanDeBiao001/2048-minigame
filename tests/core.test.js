const test=require('node:test');const assert=require('node:assert/strict');const C=require('../src/core');
test('一次移动每个方块只合并一次',()=>{const b=C.empty();b.splice(0,4,2,2,2,2);const r=C.move(b,'left');assert.deepEqual(r.board.slice(0,4),[4,4,0,0]);assert.equal(r.gain,8);assert.deepEqual(b.slice(0,4),[2,2,2,2]);});
test('四个方向遵循相同规则',()=>{const b=C.empty();b[0]=2;b[1]=2;assert.deepEqual(C.move(b,'right').board.slice(0,4),[0,0,0,4]);b[1]=0;b[4]=2;assert.equal(C.move(b,'up').board[0],4);assert.equal(C.move(b,'down').board[12],4);});
test('无效移动不改变棋盘或得分',()=>{const b=C.empty();b[0]=4;const r=C.move(b,'left');assert.equal(r.changed,false);assert.equal(r.gain,0);});
test('满盘但可合并仍可继续',()=>{const b=[2,4,2,4,4,2,4,2,2,4,2,4,4,2,4,2];assert.equal(C.over(b),true);b[1]=2;assert.equal(C.over(b),false);});
test('随机生成仅落在空格且支持2/4',()=>{const b=Array(16).fill(2);b[7]=0;C.spawn(b,()=>0.95);assert.equal(b[7],4);assert.equal(b.filter(v=>v===4).length,1);});
test('穿过空位合并与2048计分',()=>{const b=C.empty();b.splice(0,4,1024,0,1024,0);const r=C.move(b,'left');assert.equal(r.board[0],2048);assert.equal(r.gain,2048);});
test('配对优先选择能在旁边补牌的较大数字，不被包围的大牌误导',()=>{
  const b=[64,2,32,8,4,...Array(11).fill(0)],before=b.slice();
  assert.deepEqual(C.pair(b,()=>0),{source:2,target:6,value:32});assert.deepEqual(b,before);
});
test('配对落点不跨行，并在同等候选间选择不同位置',()=>{
  const b=Array(16).fill(2);b[3]=1024;b[8]=16;b[4]=0;
  assert.deepEqual(C.pair(b,()=>0),{source:8,target:4,value:16});
  const c=C.empty();c[5]=64;
  assert.notEqual(C.pair(c,()=>0).target,C.pair(c,()=>.999).target);
});
test('满盘和空盘没有配对，不调用随机数也不改棋盘',()=>{
  let calls=0;
  for(const b of [Array(16).fill(2),C.empty()]){
    const before=b.slice();assert.equal(C.pair(b,()=>{calls++;return 0;}),null);assert.deepEqual(b,before);
  }
  assert.equal(calls,0);
});
test('多种棋盘上配对始终复制已有值、落在相邻空位且不修改输入',()=>{
  let seed=42;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  for(let n=0;n<500;n++){
    const b=Array.from({length:16},()=>random()<.3?0:2**(1+Math.floor(random()*8))),before=b.slice();
    const gift=C.pair(b,random);assert.deepEqual(b,before);
    if(!b.some(v=>v)||!b.includes(0)){assert.equal(gift,null);continue;}
    assert.ok(gift);assert.equal(b[gift.source],gift.value);assert.equal(b[gift.target],0);
    assert.equal(Math.abs(Math.floor(gift.source/4)-Math.floor(gift.target/4))+Math.abs(gift.source%4-gift.target%4),1);
    const eligible=b.filter((v,i)=>v&&b.some((other,j)=>!other&&Math.abs(Math.floor(i/4)-Math.floor(j/4))+Math.abs(i%4-j%4)===1));
    assert.equal(gift.value,Math.max(...eligible));
  }
});
