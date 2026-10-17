const test=require('node:test'),assert=require('node:assert/strict');
const L=require('../src/challenge-core'),R=require('../src/relax-core');
test('60 关分为四个梯度；清盘所有关卡可按见证路线清空且石块不移动',()=>{
  assert.deepEqual(Object.values(L.LEVELS).map(a=>a.length),[12,12,8,12,8,8]);
  for(const levels of Object.values(L.LEVELS)){assert.deepEqual(new Set(levels.map((_,i)=>L.band(i,levels.length))),new Set(['教学','常规','进阶','挑战']));}
  for(const l of L.LEVELS.chain){let board=l.board.slice();const initial=board.slice(),walls=board.map((v,i)=>v===-1?i:-1).filter(i=>i>=0);let collected=0;
    assert.ok(l.solution.length>=3);for(const d of l.solution){const before=board.slice(),r=L.chainMove(board,d,l);assert.deepEqual(board,before);board=r.board;collected+=r.collected;walls.forEach(i=>assert.equal(board[i],-1));assert.ok(r.waves.length<=8);}
    assert.ok(board.every(v=>v<=0));assert.equal(collected,initial.reduce((a,v)=>a+Math.max(0,v),0));
    let baseline=l.board.slice();for(let i=0;i<20;i++)baseline=L.chainMove(baseline,'left',l).board;assert.ok(!baseline.every(v=>v<=0),'不能只一直向左通关');
  }
});
test('清盘合并不能跨石块，出口规则生效，一轮不能把同一新牌再次合并',()=>{
  const board=[2,-1,2,2,0,0,0,0,0,0,0,0,0,0,0,0],r=L.chainWave(board,'left');assert.deepEqual(r.board.slice(0,4),[2,-1,4,0]);
  const a=L.chainMove([16,...Array(15).fill(0)],'left',{target:16,exits:[15]});assert.equal(a.collected,0);assert.equal(a.complete,false);
  assert.deepEqual(L.chainWave([2,2,4,0,...Array(12).fill(0)],'left').board.slice(0,4),[4,4,0,0]);
});
test('12 个收纳布局均可完整拼合，不重叠且无剩余格；支持旋转和多解',()=>{
  for(const l of L.LEVELS.storage){let placed=l.pieces.map(()=>null);const order=[...(l.entry||[]),...l.pieces.map((_,i)=>i).filter(i=>!(l.entry||[]).includes(i))];for(const id of order){const p=l.solution[id],r=L.storageCheck(l,placed,id,p.x,p.y,p.rot);assert.ok(r.ok,l.name+' '+r.reason);placed=r.placed;}
    assert.ok(placed.every(Boolean));assert.equal(l.pieces.reduce((n,p)=>n+L.shape(p).length,0)+(l.blocked||[]).length,l.cols*l.rows);
    const before=JSON.stringify(placed),p=placed[0];assert.equal(L.storageCheck(l,placed,0,-1,p.y,p.rot).ok,false);assert.equal(JSON.stringify(placed),before);
  }
  const l=L.LEVELS.storage[0],p=l.pieces.map(()=>null);assert.ok(L.storageCheck(l,p,0,0,0,0).ok);assert.ok(L.storageCheck(l,p,0,1,0,0).ok);assert.ok(L.storageCheck(l,p,0,0,0,1).ok);
  const edge={cols:3,rows:3,pieces:['I2'],edges:{0:'top'}};assert.equal(L.storageCheck(edge,[null],0,0,1,0).ok,false);
  const entry={cols:3,rows:3,pieces:['I2','I2'],entry:[0]};assert.equal(L.storageCheck(entry,[null,{x:0,y:0,rot:0}],0,0,2,0).ok,false);
});
test('8 张磁网全部有互通解；错向/断口不能凭编号通关',()=>{
  for(const l of L.LEVELS.magnet){assert.ok(L.magnetCheck(l,l.solution).complete,l.name);assert.equal(L.magnetCheck(l,l.ports).complete,false,l.name+' 初始不能完成');const broken=l.solution.slice();broken[l.source]=L.rotatePorts(broken[l.source]);assert.equal(L.magnetCheck(l,broken).complete,false);}
});
function fillSand(l,wrong=false){const s=L.createSand(l);for(let bin=0;bin<l.bins.length;bin++)for(const c of l.layers[bin]){const color=wrong?(c+1)%3:c;if(s.route!==bin)s.changes++;if(s.color!==color)s.changes++;s.route=bin;s.color=color;const end=s.spent+l.dose;for(let ticks=0;s.spent<end&&ticks<500;ticks++){L.doseSand(s,l);R.stepSand(s);}for(let n=0;n<250;n++)R.stepSand(s);}return s;}
test('12 个彩砂关卡经实际落砂均可达，材料上限固定，错色和错误层序失败',()=>{
  for(const l of L.LEVELS.sand){const s=fillSand(l);assert.ok(L.sandGoal(s,l).complete,l.name);assert.equal(s.count,s.spent);assert.ok(s.spent<=l.quota);assert.ok(l.quota<=R.SAND.cap);assert.equal(L.sandGoal(fillSand(l,true),l).complete,false);}
  const l=L.LEVELS.sand[11],s=L.createSand(l);for(let i=0;i<5000;i++){L.doseSand(s,l);R.stepSand(s);}assert.ok(s.spent<=l.quota);assert.equal(L.doseSand(s,l),0);assert.equal(L.sandGoal(s,l).complete,false,'一直倒同色同瓶不能过关');
});
test('8 个流体目标用真实染色操作可完成，限量且保护区与混色参与判定',()=>{
  for(const l of L.LEVELS.fluid){const s=L.createFluid(l);for(const r of l.regions.filter(r=>!r.protect))for(let y=r.y+2;y<r.y+r.h;y+=4)for(let x=r.x+2;x<r.x+r.w;x+=4){L.paintFluid(s,l,x,y,0,0,r.color,'paint');R.stepFluid(s);}assert.ok(L.fluidGoal(s,l).complete,l.name+' '+JSON.stringify(L.fluidGoal(s,l)));assert.ok(s.used<=l.quota);
    const before=s.used;L.paintFluid(s,l,20,25,2,2,0,'push');L.paintFluid(s,l,20,25,0,0,0,'erase');assert.equal(s.used,before);
    s.ink=0;assert.equal(L.paintFluid(s,l,20,25,0,0,0,'paint'),false);
    const protect=l.regions.find(r=>r.protect);if(protect){for(let y=protect.y;y<protect.y+protect.h;y++)for(let x=protect.x;x<protect.x+protect.w;x++)s.dye[0][y*40+x]=1;assert.equal(L.fluidGoal(s,l).complete,false);}
  }
  const l=L.LEVELS.fluid[1],s=L.createFluid(l);for(const d of s.dye)d.fill(1);s.used=1;assert.equal(L.fluidGoal(s,l).complete,false,'随机混满三色不能通过纯色目标');
});
function packSoft(l){const s=L.createSoft(l),order=l.items.length===6?[1,0,3,2,5,4]:l.items.map((_,i)=>i);for(const id of order){const g=l.solution[id],cup=l.cups[g.cup];if(g.rot)L.rotateSoft(s,id);s.bodies[id].parked=false;s.drag={id,x:cup.x+cup.w/2,y:cup.y-60};s.active=true;for(let t=0;t<120;t++)R.stepSoft(s);s.drag.y=g.y;for(let t=0;t<140;t++)R.stepSoft(s);s.drag.x=g.x;for(let t=0;t<100;t++)R.stepSoft(s);s.drag=null;if(L.softGoal(s,l).fits[id])s.bodies[id].stowed=true;}s.touched=true;for(let t=0;t<100;t++)R.stepSoft(s);return s;}
test('8 个软团关卡通过节点物理、旋转、装入顺序完成；停手休眠',()=>{
  for(const l of L.LEVELS.soft){const s=packSoft(l);assert.ok(L.softGoal(s,l).complete,l.name+' '+L.softGoal(s,l).fits.join(','));for(const b of s.bodies)for(const n of b.nodes){assert.ok(Number.isFinite(n.x)&&Number.isFinite(n.y));assert.ok(n.x>=2&&n.x<=332&&n.y>=2&&n.y<=358);}for(let i=0;i<650;i++)R.stepSoft(s);assert.equal(s.active,false);}
});
test('未操作软团停留托盘；盒壁阻挡快速横向拖拽，错误颜色不能通关',()=>{
  const l=L.LEVELS.soft[1],s=L.createSoft(l),before=JSON.stringify(s.bodies);for(let i=0;i<50;i++)R.stepSoft(s);assert.equal(JSON.stringify(s.bodies),before);
  s.bodies[0].parked=false;s.drag={id:0,x:80,y:315};s.active=true;for(let i=0;i<200;i++)R.stepSoft(s);s.drag.x=254;for(let i=0;i<300;i++)R.stepSoft(s);s.drag=null;s.touched=true;assert.equal(L.softGoal(s,l).complete,false);assert.ok(R.center(s.bodies[0]).x<155,'不能横穿盒壁');
});
