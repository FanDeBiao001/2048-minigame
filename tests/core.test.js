const test=require('node:test');const assert=require('node:assert/strict');const C=require('../src/core');
test('一次移动每个方块只合并一次',()=>{const b=C.empty();b.splice(0,4,2,2,2,2);const r=C.move(b,'left');assert.deepEqual(r.board.slice(0,4),[4,4,0,0]);assert.equal(r.gain,8);assert.deepEqual(b.slice(0,4),[2,2,2,2]);});
test('四个方向遵循相同规则',()=>{const b=C.empty();b[0]=2;b[1]=2;assert.deepEqual(C.move(b,'right').board.slice(0,4),[0,0,0,4]);b[1]=0;b[4]=2;assert.equal(C.move(b,'up').board[0],4);assert.equal(C.move(b,'down').board[12],4);});
test('无效移动不改变棋盘或得分',()=>{const b=C.empty();b[0]=4;const r=C.move(b,'left');assert.equal(r.changed,false);assert.equal(r.gain,0);});
test('满盘但可合并仍可继续',()=>{const b=[2,4,2,4,4,2,4,2,2,4,2,4,4,2,4,2];assert.equal(C.over(b),true);b[1]=2;assert.equal(C.over(b),false);});
test('随机生成仅落在空格且支持2/4',()=>{const b=Array(16).fill(2);b[7]=0;C.spawn(b,()=>0.95);assert.equal(b[7],4);assert.equal(b.filter(v=>v===4).length,1);});
test('穿过空位合并与2048计分',()=>{const b=C.empty();b.splice(0,4,1024,0,1024,0);const r=C.move(b,'left');assert.equal(r.board[0],2048);assert.equal(r.gain,2048);});
