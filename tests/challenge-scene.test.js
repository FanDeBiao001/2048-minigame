const test=require('node:test'),assert=require('node:assert/strict');
const Q=require('../src/challenge-scene'),L=require('../src/challenge-core'),U=require('../src/skill-ui');
function setup({save,native=false,info={windowWidth:390,windowHeight:844,pixelRatio:2},reducedMotion=false}={}){
  let now=0,draws=0,coalesced=0,back=0,free=null;const texts=[],saved={},ctx=new Proxy({}, {get:(_,key)=>key==='fillText'?(s)=>texts.push(s):key==='setTransform'?()=>draws++:()=>{},set:()=>true});if(save)saved['2048-challenges-v1']=save;
  const canvas={width:0,height:0},platform={native:native?{}:null,read:k=>saved[k],write:(k,v)=>saved[k]=JSON.parse(JSON.stringify(v))};
  let scene;const render=()=>scene.render(info,2);scene=Q.create({ctx,canvas,platform,clock:()=>now,reducedMotion,onChange:c=>{if(c)coalesced++;else render();},onBack:()=>back++,onFree:id=>free=id});
  const fit=U.fit(info,native),xy=(x,y)=>[fit.ox+x*fit.scale,fit.oy+y*fit.scale];
  const tap=(x,y)=>{scene.down(...xy(x,y));scene.up(...xy(x,y));};
  const drag=(x,y,xx,yy)=>{scene.down(...xy(x,y));scene.move(...xy(xx,yy));scene.up(...xy(xx,yy));};
  const tick=(ms=34)=>{now+=ms;if(scene.update(now,60))render();};
  return {scene,tap,drag,tick,texts,saved,draws:()=>draws,coalesced:()=>coalesced,back:()=>back,free:()=>free,open:(id,i=0)=>{scene.open(id);tap(i%3*124+50,160+Math.floor(i/3)*108+45);},xy};
}
test('六种关卡入口、自由体验和返回可操作，选择页面不持续请求帧',()=>{
  for(const mode of Object.keys(L.LEVELS)){const a=setup();a.scene.open(mode);assert.equal(a.scene.animating(),false);assert.ok(a.texts.includes('继续第 1 关'));a.tap(300,111);assert.equal(a.free(),mode);assert.equal(a.scene.active(),false);a.scene.open(mode);a.tap(50,205);assert.ok(a.texts.includes(L.LEVELS[mode][0].name));a.scene.key('Escape');assert.equal(a.scene.animating(),false);a.scene.key('Escape');assert.equal(a.back(),1);}
});
test('清盘经真实方向键完成、星级入档、撤销与下一关可用，动画有寿命',()=>{
  for(const reducedMotion of [true,false]){const a=setup({reducedMotion});a.open('chain');const l=L.LEVELS.chain[0];a.drag(200,80,50,80);assert.deepEqual(a.saved['2048-challenges-v1'].attempt.game.board,l.board);
    for(const d of l.solution){a.scene.key('Arrow'+d[0].toUpperCase()+d.slice(1));a.tick(2000);}assert.ok(a.texts.includes('整理完成'));assert.equal(a.saved['2048-challenges-v1'].progress.chain[0].stars,3);assert.equal(a.scene.animating(),false);
    a.tap(40,734);assert.ok(a.saved['2048-challenges-v1'].attempt.game.board.some(v=>v>0));a.tap(134,734);assert.deepEqual(a.saved['2048-challenges-v1'].attempt.game.board,l.board);
    for(const d of l.solution){a.scene.key('Arrow'+d[0].toUpperCase()+d.slice(1));a.tick(2000);}a.tap(280,734);assert.equal(a.saved['2048-challenges-v1'].selected.chain,1);
  }
});
test('12 关收纳用旋转、拖放交互完成，接受见证解且存档持久化',()=>{
  for(const [i,l]of L.LEVELS.storage.entries()){const a=setup();a.open('storage',i);const cell=Math.min(l.rows>=4?58:78,326/l.cols),gx=(358-l.cols*cell)/2,gy=172,by0=Math.max(400,gy+l.rows*cell+50),order=[...(l.entry||[]),...l.pieces.map((_,id)=>id).filter(id=>!(l.entry||[]).includes(id))];
    for(const id of order){const p=l.solution[id],bx=62+id%3*116,by=by0+25+Math.floor(id/3)*83;a.tap(bx,by);for(let r=0;r<p.rot;r++)a.tap(86,644);a.drag(bx,by,gx+(p.x+.5)*cell,gy+(p.y+.5)*cell);}
    assert.ok(a.texts.includes('整理完成'),l.name+' '+a.texts.slice(-12));assert.equal(a.saved['2048-challenges-v1'].progress.storage[i].stars,3);assert.equal(a.scene.animating(),false);
  }
});
test('8 关磁吸使用点击转向整网接通；一次拖换仅计一步且可撤销',()=>{
  for(const[i,l]of L.LEVELS.magnet.entries()){const a=setup();a.open('magnet',i);const cell=Math.min(82,326/l.cols),gx=(358-l.cols*cell)/2;
    l.ports.forEach((v,id)=>{if(l.fixed.includes(id)||!v)return;let n=0;while(L.rotatePorts(v,n)!==l.solution[id])n++;for(let j=0;j<n;j++)a.tap(gx+(id%l.cols+.5)*cell,180+(Math.floor(id/l.cols)+.5)*cell);});assert.ok(a.texts.includes('整理完成'),l.name);assert.ok(a.saved['2048-challenges-v1'].progress.magnet[i]);
  }
  const a=setup(),l=L.LEVELS.magnet[3];a.open('magnet',3);const g=(358-246)/2;a.drag(g+123,221,g+205,221);assert.equal(a.saved['2048-challenges-v1'].attempt.moves,1);a.tap(40,734);assert.deepEqual(a.saved['2048-challenges-v1'].attempt.game.ports,l.ports);
});
test('模拟输入合帧，暂停无更新，撤销恢复材料，后台不追赶且重开可用',()=>{
  for(const mode of ['sand','fluid','soft']){const a=setup();a.open(mode);const before=a.draws();a.scene.down(...a.xy(160,260));for(let i=0;i<100;i++)a.scene.move(...a.xy(160+i*.2,260));assert.equal(a.draws(),before);assert.ok(a.coalesced()>0);
    for(let i=0;i<20;i++)a.tick();a.scene.up(...a.xy(180,260));a.tap(220,734);const drawn=a.draws();assert.equal(a.scene.animating(),false);for(let i=0;i<50;i++)a.tick();assert.equal(a.draws(),drawn);a.tap(220,734);a.scene.suspend();const n=a.draws();a.tick(60000);assert.ok(a.draws()<=n+1);a.tap(40,734);a.tap(134,734);assert.ok(a.texts.includes(L.LEVELS[mode][0].name));
    assert.equal(a.saved['2048-challenges-v1'].attempt,null,'不将每帧模拟数组写入存储');a.scene.close();assert.equal(a.scene.animating(),false);
  }
});
test('进度过滤损坏值，离散棋盘恢复但不采信非法牌、重叠收纳或篡改磁片',()=>{
  const l=L.LEVELS.chain[0],board=L.chainMove(l.board,l.solution[0],l).board;
  const save={selected:{chain:0},progress:{chain:[{stars:3,best:3},{stars:99,best:-1}]},attempt:{mode:'chain',index:0,game:{board},moves:1,undos:0}};const a=setup({save});a.open('chain');assert.deepEqual(a.saved['2048-challenges-v1'].attempt.game.board,board);assert.equal(a.saved['2048-challenges-v1'].progress.chain[1],null);
  for(const [mode,game]of [['chain',{board:Array(16).fill(4096)}],['storage',{placed:[{x:0,y:0,rot:0},{x:0,y:0,rot:0},null]}],['magnet',{ports:[15,15,15,15]}]]){const b=setup({save:{attempt:{mode,index:0,game,moves:4}}});b.open(mode);const g=b.saved['2048-challenges-v1'].attempt.game;assert.notDeepEqual(g,game);}
});
test('短屏/全面屏原生坐标仍可操作所有关卡和底部控件',()=>{
  for(const info of [{windowWidth:320,windowHeight:568,pixelRatio:3},{windowWidth:393,windowHeight:852,pixelRatio:3,safeArea:{top:59,left:0,right:393,bottom:818}}]){const a=setup({native:true,info});a.open('storage',11);assert.ok(a.texts.includes(L.LEVELS.storage[11].name));a.tap(134,734);a.tap(310,16);assert.ok(a.texts.includes('继续第 12 关'));assert.equal(a.scene.animating(),false);}
});
test('模拟关卡经客户端输入达标后才能保存星级，软团快速拖放会完成松手跟随',()=>{
  const sand=setup();sand.open('sand');sand.scene.down(...sand.xy(179,220));for(let i=0;i<50;i++)sand.tick();sand.scene.up(...sand.xy(179,220));sand.tap(315,734);for(let i=0;i<220;i++)sand.tick();assert.ok(sand.saved['2048-challenges-v1'].progress.sand[0]);assert.equal(sand.scene.animating(),false);
  const fluid=setup();fluid.open('fluid');fluid.tap(179,607);for(let y=15;y<35;y+=4)for(let x=13;x<29;x+=4){const xx=12+x/40*334,yy=154+y/48*360;fluid.scene.down(...fluid.xy(xx,yy));fluid.tick();fluid.scene.up(...fluid.xy(xx,yy));}fluid.tap(315,734);assert.ok(fluid.saved['2048-challenges-v1'].progress.fluid[0]);assert.equal(fluid.scene.animating(),false);
  const soft=setup();soft.open('soft');soft.drag(57,196,182,469);soft.tap(315,734);for(let i=0;i<15;i++)soft.tick();assert.ok(soft.saved['2048-challenges-v1'].progress.soft[0]);assert.ok(soft.texts.includes('整理完成'));assert.equal(soft.scene.animating(),false);
});
test('回关卡列表与切换模式均保留各自离散局面，重玩真正覆盖旧存档',()=>{
  const a=setup({reducedMotion:true});a.open('chain');const l=L.LEVELS.chain[0];a.scene.key('Arrow'+l.solution[0][0].toUpperCase()+l.solution[0].slice(1));const board=a.saved['2048-challenges-v1'].attempt.game.board;a.scene.key('Escape');a.tap(50,205);assert.deepEqual(a.saved['2048-challenges-v1'].attempt.game.board,board);a.scene.open('storage');a.tap(50,205);a.scene.open('chain');a.tap(50,205);assert.deepEqual(a.saved['2048-challenges-v1'].attempt.game.board,board);a.tap(134,734);a.scene.key('Escape');a.tap(50,205);assert.deepEqual(a.saved['2048-challenges-v1'].attempt.game.board,l.board);
});
test('恢复旋转过的收纳物件后，再抓取移动保持真实朝向',()=>{
  const a=setup({save:{attempt:{mode:'storage',index:2,game:{placed:[{x:0,y:0,rot:1},null,null,null]},moves:1,undos:0}}});a.open('storage',2);a.drag(62,211,140,211);assert.deepEqual(a.saved['2048-challenges-v1'].attempt.game.placed[0],{x:1,y:0,rot:1});
});
