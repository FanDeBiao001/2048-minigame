const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../src/relax-core');
test('五个清盘关卡可解；连锁只收目标、不补牌，最多八轮且不修改输入',()=>{
  for(const level of R.LEVELS){
    const seen=new Set(),queue=[level.board];let solved=false;
    while(queue.length&&seen.size<12000){
      const b=queue.shift(),key=b.join(',');if(seen.has(key))continue;seen.add(key);
      if(b.every(v=>!v)){solved=true;break;}
      for(const d of ['left','right','up','down']){
        const before=b.slice(),result=R.chain(b,d,level.target);
        assert.deepEqual(b,before);assert.ok(result.waves.length<=8);
        assert.equal(b.reduce((a,v)=>a+v,0),result.board.reduce((a,v)=>a+v,0)+result.collected);
        if(result.changed)queue.push(result.board);
      }
    }
    assert.ok(solved,'目标 '+level.target+' 的关卡可以清空');
  }
  const plan=R.chain(R.LEVELS[0].board,'left',16);
  assert.equal(plan.waves.filter(w=>w.gain).length,3);assert.equal(plan.collected,16);assert.ok(plan.complete);
});
test('收纳五块覆盖抽屉全部十二格，错误落点不放置、不修改输入',()=>{
  let placed=[];const cells=[];
  for(let id=0;id<R.PIECES.length;id++){
    assert.equal(R.placeStorage(placed,id,0,0),null);const p=R.storageTarget(id),before=placed.slice();
    const next=R.placeStorage(placed,id,p.x+10,p.y+10);assert.deepEqual(placed,before);placed=next;
    assert.equal(R.placeStorage(placed,id,p.x,p.y),null);
    const piece=R.PIECES[id];piece.cells.forEach(([x,y])=>cells.push((y+piece.target[1])*4+x+piece.target[0]));
  }
  assert.equal(placed.length,5);assert.equal(new Set(cells).size,12);assert.ok(cells.every(n=>n>=0&&n<12));
});
test('九块磁片仅在同号位置吸附，容错半径明确且不重复放置',()=>{
  let fixed=[];
  for(let id=0;id<9;id++){
    const to=R.magnetTarget(id);assert.equal(R.placeMagnet(fixed,id,to.x+43,to.y),null);
    fixed=R.placeMagnet(fixed,id,to.x+30,to.y);assert.equal(R.placeMagnet(fixed,id,to.x,to.y),null);
  }
  assert.equal(fixed.length,9);assert.equal(R.placeMagnet([],9,0,0),null);
});
test('彩砂数量守恒、不可穿墙、有容量上限且三瓶目标均可达',()=>{
  const s=R.createSand();
  for(let i=0;i<125;i++)for(let bin=0;bin<3;bin++){
    R.pourSand(s,(R.SAND.bins[bin][0]+R.SAND.bins[bin][1])/2,5,bin+1);R.stepSand(s);
  }
  for(let i=0;i<150;i++)R.stepSand(s);
  const count=s.cells.reduce((a,v)=>a+!!v,0);assert.equal(count,s.count);assert.ok(count<=R.SAND.cap);
  assert.ok(s.cells.every((v,i)=>!v||!s.walls[i]));assert.ok(R.sandCounts(s).every(n=>n>=R.SAND.goal));
  assert.equal(s.active,false,'静止后停止更新');
  const before=s.count;assert.equal(R.pourSand(s,-1,0,1),0);assert.equal(R.pourSand(s,999,0,1),0);assert.equal(s.count,before);
});
test('流体速度场会搬运染色，衰减后静止，数组大小固定且数值有限',()=>{
  const s=R.createFluid(),n=R.FLUID.cols*R.FLUID.rows;
  R.injectFluid(s,12,20,8,1,0);const dye=s.dye[0].slice();
  for(let i=0;i<90;i++)R.stepFluid(s);
  assert.ok(s.dye[0].some((v,i)=>Math.abs(v-dye[i])>.01),'染色被速度场搬运');
  assert.ok(s.dye[0].every(v=>Number.isFinite(v)&&v>=0&&v<=1.001));assert.equal(s.vx.length,n);
  for(let i=0;i<500&&s.activity;i++)R.stepFluid(s);
  assert.equal(s.activity,0);assert.ok(s.vx.every(Number.isFinite));assert.ok(s.vy.every(Number.isFinite));
  assert.equal(R.injectFluid(s,-1,20,1,1,0),false);
});
test('十二个软团真实节点运动与变形，拖拽碰撞后保持有限数值和边界',()=>{
  const s=R.createSoft(),first=R.center(s.bodies[0]),initial=s.bodies[0].nodes.map(n=>({x:n.x,y:n.y}));
  assert.equal(s.bodies.length,12);assert.equal(s.bodies[0].nodes.length,10);assert.equal(R.softHit(s,first.x,first.y),0);
  s.drag={id:0,x:180,y:320};for(let i=0;i<60;i++)R.stepSoft(s);
  assert.ok(R.center(s.bodies[0]).y>first.y+80);s.drag=null;
  for(let i=0;i<500;i++)R.stepSoft(s);
  for(const b of s.bodies)for(const n of b.nodes){assert.ok(Number.isFinite(n.x)&&Number.isFinite(n.y));assert.ok(n.x>=0&&n.x<=R.SOFT.width&&n.y>=0&&n.y<=R.SOFT.height);}
  for(let i=0;i<650&&s.active;i++)R.stepSoft(s);assert.equal(s.active,false,'停手后有休眠上限');
  assert.ok(s.bodies[0].nodes.some((n,i)=>Math.abs((n.x-R.center(s.bodies[0]).x)-(initial[i].x-first.x))>1),'节点形状发生变化');
});
