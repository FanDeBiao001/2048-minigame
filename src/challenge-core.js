(function(root){
  const D=typeof module!=='undefined'?require('./challenge-data'):root.ChallengeData;
  const R=typeof module!=='undefined'?require('./relax-core'):root.RelaxCore;
  const DIRS=['left','right','up','down'],SHAPES={I2:[[0,0],[1,0]],I3:[[0,0],[1,0],[2,0]],L3:[[0,0],[0,1],[1,1]],O4:[[0,0],[1,0],[0,1],[1,1]],I4:[[0,0],[1,0],[2,0],[3,0]],L4:[[0,0],[0,1],[0,2],[1,2]],T4:[[0,0],[1,0],[2,0],[1,1]],Z4:[[0,0],[1,0],[1,1],[2,1]]};
  function band(i,n){return i<2?'教学':i<(n===12?6:4)?'常规':i<n-2?'进阶':'挑战';}
  function chainWave(board,direction){
    const next=board.map(v=>v===-1?-1:0),tracks=[],merges=[];let gain=0;
    for(let line=0;line<4;line++){
      const ids=Array.from({length:4},(_,p)=>direction==='left'?line*4+p:direction==='right'?line*4+3-p:direction==='up'?p*4+line:(3-p)*4+line);
      let segment=[];
      function flush(){const occupied=segment.filter(i=>board[i]>0);let out=0;
        for(let k=0;k<occupied.length;k++){
          const from=occupied[k],to=segment[out++],value=board[from];tracks.push({from,to,value});
          if(k+1<occupied.length&&board[occupied[k+1]]===value){tracks.push({from:occupied[++k],to,value});next[to]=value*2;gain+=value*2;merges.push(to);}else next[to]=value;
        }segment=[];
      }
      ids.forEach(i=>{if(board[i]===-1)flush();else segment.push(i);});flush();
    }
    return {board:next,tracks,merges,gain,changed:next.some((v,i)=>v!==board[i])};
  }
  function chainMove(board,dir,level){
    let next=board.slice(),collected=0,gain=0;const waves=[];
    for(let i=0;i<8;i++){
      const before=next.slice(),result=chainWave(before,dir);next=result.board.slice();const taken=[];
      next.forEach((v,k)=>{if(v===level.target&&(!level.exits||level.exits.includes(k))){next[k]=0;taken.push(k);collected+=v;}});
      if(!result.changed&&!taken.length)break;
      waves.push({...result,before,board:next.slice(),taken});gain+=result.gain;
      if(!result.gain&&!taken.length)break;
    }
    return {board:next,waves,collected,gain,changed:waves.length>0,complete:next.every(v=>v<=0)};
  }
  function solveChain(level,start=level.board,limit=50000){
    const queue=[{board:start,path:[]}],seen=new Set([start.join(',')]);let head=0;
    while(head<queue.length&&head<limit){const {board,path}=queue[head++];if(board.every(v=>v<=0))return path;
      for(const d of DIRS){const r=chainMove(board,d,level),key=r.board.join(',');if(r.changed&&!seen.has(key)){seen.add(key);queue.push({board:r.board,path:[...path,d]});}}
    }return null;
  }
  function shape(name,rotation=0){
    let cells=SHAPES[name].map(p=>p.slice());for(let k=0;k<(rotation%4+4)%4;k++)cells=cells.map(([x,y])=>[-y,x]);
    const minX=Math.min(...cells.map(p=>p[0])),minY=Math.min(...cells.map(p=>p[1]));return cells.map(([x,y])=>[x-minX,y-minY]);
  }
  function storageCheck(level,placed,id,x,y,rot){
    if(!level.pieces[id]||!Number.isInteger(x)||!Number.isInteger(y))return {ok:false,reason:'请放在抽屉格内'};
    const cells=shape(level.pieces[id],rot).map(([cx,cy])=>[x+cx,y+cy]),occupied=new Set(level.blocked||[]);
    placed.forEach((p,j)=>{if(p&&j!==id)shape(level.pieces[j],p.rot).forEach(([cx,cy])=>occupied.add((p.y+cy)*level.cols+p.x+cx));});
    if(cells.some(([xx,yy])=>xx<0||xx>=level.cols||yy<0||yy>=level.rows))return {ok:false,reason:'边缘超出抽屉，旋转或换个位置'};
    if(cells.some(([xx,yy])=>occupied.has(yy*level.cols+xx)))return {ok:false,reason:'这里已有物件或隔板'};
    const edge=(level.edges||{})[id];
    if(edge&&!cells.some(([xx,yy])=>edge==='top'?yy===0:edge==='bottom'?yy===level.rows-1:edge==='left'?xx===0:xx===level.cols-1))return {ok:false,reason:'这件物品需要贴'+({top:'上',bottom:'下',left:'左',right:'右'}[edge])+'边放'};
    if((level.entry||[]).includes(id)){
      const own=shape(level.pieces[id],rot),height=Math.max(...own.map(p=>p[1]))+1;
      for(let row=-height;row<y;row++)if(own.some(([cx,cy])=>row+cy>=0&&occupied.has((row+cy)*level.cols+x+cx)))return {ok:false,reason:'上方通道被挡住了，先拿开前面的物件'};
    }
    const result=placed.map(p=>p&&({...p}));result[id]={x,y,rot};
    return {ok:true,placed:result,complete:result.every(Boolean)};
  }
  function solveStorage(level,limit=200000){
    let visits=0;const placed=Array(level.pieces.length).fill(null);
    function walk(){if(++visits>limit)return null;if(placed.every(Boolean))return placed.map(p=>({...p}));
      const available=level.pieces.map((_,id)=>id).filter(id=>!placed[id]);
      // Entry-constrained pieces are inserted before the remaining tiling.
      const forced=available.filter(id=>(level.entry||[]).includes(id));
      const ids=forced.length?[forced[0]]:available;
      let choices=[];
      for(const id of ids){const found=[];const variants=new Set();for(let rot=0;rot<4;rot++){
        const key=shape(level.pieces[id],rot).map(p=>p.join(',')).sort().join(';');if(variants.has(key))continue;variants.add(key);
        for(let y=0;y<level.rows;y++)for(let x=0;x<level.cols;x++){const r=storageCheck(level,placed,id,x,y,rot);if(r.ok)found.push({id,x,y,rot});}
      }if(!found.length)return null;if(!choices.length||found.length<choices.length)choices=found;}
      for(const p of choices){placed[p.id]={x:p.x,y:p.y,rot:p.rot};const solution=walk();if(solution)return solution;placed[p.id]=null;}return null;
    }return walk();
  }
  const rotatePorts=(mask,n=1)=>((mask<<((n%4+4)%4))|(mask>>(4-((n%4+4)%4))))&15;
  function magnetCheck(level,ports){
    const seen=new Set(),edges=[[0,-1,1,4],[1,0,2,8],[0,1,4,1],[-1,0,8,2]],queue=[level.source];let leaks=0;
    while(queue.length){const i=queue.pop();if(seen.has(i)||!ports[i])continue;seen.add(i);
      const x=i%level.cols,y=Math.floor(i/level.cols);
      edges.forEach(([dx,dy,bit,opp])=>{if(!(ports[i]&bit))return;const xx=x+dx,yy=y+dy,j=yy*level.cols+xx;
        if(xx<0||xx>=level.cols||yy<0||yy>=level.rows||!(ports[j]&opp))leaks++;else queue.push(j);
      });
    }
    return {complete:leaks===0&&seen.size===ports.filter(Boolean).length&&seen.has(level.sink),connected:seen,leaks};
  }
  function createSand(level){
    const s=R.createSand();s.walls.fill(0);for(let x=0;x<R.SAND.cols;x++)s.walls[(R.SAND.rows-1)*R.SAND.cols+x]=1;
    level.bins.forEach(([l,r])=>{for(let y=48;y<103;y++){s.walls[y*84+l]=1;s.walls[y*84+r]=1;}});
    s.spent=0;s.route=0;s.color=level.layers[0][0];s.changes=0;s.pourTick=0;return s;
  }
  function doseSand(s,level){
    if(s.spent>=level.quota)return 0;s.pourTick++;if(s.pourTick%2)return 0;
    const [l,r]=level.bins[s.route],x=Math.floor((l+r)/2),remaining=level.quota-s.spent;
    if(remaining<6)return 0;
    const added=R.pourSand(s,x,8,s.color+1);s.spent+=added;return added;
  }
  function sandGoal(s,level){
    const bins=level.bins.map(([l,r],id)=>{
      const grains=[];for(let y=102;y>=48;y--)for(let x=l+1;x<r;x++)if(s.cells[y*84+x])grains.push(s.cells[y*84+x]-1);
      const layers=level.layers[id],dose=level.dose,total=dose*layers.length;
      const ratios=layers.map((c,j)=>{const portion=grains.slice(j*dose,(j+1)*dose);return portion.filter(v=>v===c).length/dose;});
      return {count:grains.length,total,ratios,ok:grains.length>=total*.92&&grains.length<=total*1.14&&ratios.every(v=>v>=.70)};
    });
    return {bins,complete:bins.every(b=>b.ok)&&(!level.maxChanges||s.changes<=level.maxChanges)};
  }
  function createFluid(level){const s=R.createFluid();s.ink=level.quota;s.used=0;return s;}
  function paintFluid(s,level,x,y,dx,dy,color,tool){
    if(x<1||y<1||x>38||y>46)return false;
    if(tool==='paint'){if(!s.ink)return false;const ok=R.injectFluid(s,x,y,dx,dy,color);if(ok){s.ink--;s.used++;}return ok;}
    for(let yy=Math.max(1,Math.floor(y)-3);yy<=Math.min(46,Math.ceil(y)+3);yy++)for(let xx=Math.max(1,Math.floor(x)-3);xx<=Math.min(38,Math.ceil(x)+3);xx++){
      const i=yy*40+xx,w=Math.max(0,1-Math.hypot(xx-x,yy-y)/4);
      if(tool==='erase')for(const dye of s.dye)dye[i]*=1-w*.65;
      else {s.vx[i]=Math.max(-3,Math.min(3,s.vx[i]+dx*w*.15));s.vy[i]=Math.max(-3,Math.min(3,s.vy[i]+dy*w*.15));}
    }s.activity=1;return true;
  }
  function fluidGoal(s,level){
    const regions=level.regions.map(r=>{
      let total=0,good=0;for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++){
        const i=y*40+x,sum=s.dye.reduce((a,d)=>a+d[i],0);total++;
        if(r.protect?sum<.16:s.dye[r.color][i]>=.22&&s.dye[r.color][i]/Math.max(.001,sum)>=.64)good++;
      }return {ratio:good/total,ok:good/total>=(r.protect?.88:level.coverage)};
    });return {regions,complete:regions.every(r=>r.ok)&&s.used>0};
  }
  function createSoft(level){
    const s=R.createSoft();s.bodies=level.items.map((item,id)=>{
      const b=s.bodies[id],rx=item.rx,ry=item.ry;b.radius=Math.max(rx,ry);b.color=item.color;b.parked=true;
      b.nodes=b.nodes.map((_,j)=>{const a=j*2*Math.PI/10,x=item.x+Math.cos(a)*rx,y=item.y+Math.sin(a)*ry;return {x,y,px:x,py:y};});
      b.reference=b.nodes.map(n=>({x:n.x-item.x,y:n.y-item.y}));
      b.area=5*rx*ry*Math.sin(2*Math.PI/10);b.rest=b.nodes.map((n,j)=>Math.hypot(n.x-b.nodes[(j+1)%10].x,n.y-b.nodes[(j+1)%10].y));return b;
    });s.bounds={width:334,height:360};s.obstacles=[];
    level.cups.forEach(c=>{
      s.obstacles.push({x:c.x-10,y:c.y,w:10,h:c.h+10},{x:c.x+c.w,y:c.y,w:10,h:c.h+10},{x:c.x-10,y:c.y+c.h,w:c.w+20,h:10});
      if(c.mouth){const side=(c.w-c.mouth)/2;s.obstacles.push({x:c.x,y:c.y,w:side,h:12},{x:c.x+c.w-side,y:c.y,w:side,h:12});}
    });s.touched=false;return s;
  }
  function rotateSoft(s,id){
    const b=s.bodies[id];if(!b)return;const c=R.center(b);for(const n of b.nodes){const x=n.x-c.x,y=n.y-c.y;n.x=c.x-y;n.y=c.y+x;n.px=n.x;n.py=n.y;}if(b.reference)b.reference=b.reference.map(p=>({x:-p.y,y:p.x}));s.active=true;s.idle=0;s.quiet=0;
  }
  function softGoal(s,level){
    const fits=s.bodies.map((b,id)=>{const cup=level.cups[level.items[id].cup];let inside=0;for(const n of b.nodes)if(n.x>=cup.x-2&&n.x<=cup.x+cup.w+2&&n.y>=cup.y+12&&n.y<=cup.y+cup.h+2)inside++;return inside>=9;});
    return {fits,complete:fits.every(Boolean)&&!s.drag&&s.touched};
  }
  const api={LEVELS:D,SHAPES,band,chainWave,chainMove,solveChain,shape,storageCheck,solveStorage,rotatePorts,magnetCheck,createSand,doseSand,sandGoal,createFluid,paintFluid,fluidGoal,createSoft,rotateSoft,softGoal};
  if(typeof module!=='undefined')module.exports=api;else root.ChallengeCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
