(function(root){
  const C=typeof module!=='undefined'?require('./core'):root.GameCore;
  const MODES=Object.freeze([
    {id:'chain',name:'连锁清盘',desc:'一划连合，清空棋盘',color:'#527252'},
    {id:'storage',name:'软块收纳',desc:'拖进抽屉，刚好装满',color:'#9a7753'},
    {id:'magnet',name:'磁吸归位',desc:'轻轻靠近，整齐吸附',color:'#587788'},
    {id:'sand',name:'彩砂填瓶',desc:'指尖落砂，慢慢装满',color:'#b68a46'},
    {id:'fluid',name:'流体画布',desc:'滑动调色，留下涡流',color:'#577c85'},
    {id:'soft',name:'软团碰撞',desc:'拖动、挤压、松手回弹',color:'#987882'}
  ]);
  const LEVELS=[
    {target:16,board:[2,2,4,8,0,0,0,0,0,0,0,0,0,0,0,0]},
    {target:16,board:[2,2,4,0,0,0,0,8,0,0,0,0,0,0,0,0]},
    {target:16,board:[2,0,2,0,0,4,0,0,0,0,8,0,0,0,0,0]},
    {target:32,board:[2,0,0,16,0,2,0,0,0,0,4,0,8,0,0,0]},
    {target:32,board:Array(16).fill(2)}
  ];
  function chain(board,direction,target){
    let next=board.slice(),gain=0,collected=0;const waves=[];
    for(let i=0;i<8;i++){
      const before=next.slice(),result=C.move(before,direction);
      if(!result.changed)break;
      next=result.board.slice();const taken=[];
      next.forEach((v,index)=>{if(v===target){next[index]=0;taken.push(index);collected+=v;}});
      gain+=result.gain;waves.push({...result,before,board:next.slice(),taken});
      if(!result.gain)break;
    }
    return {board:next,waves,gain,collected,changed:waves.length>0,complete:next.every(v=>!v)};
  }
  const CELL=54,DRAWER={x:71,y:192,cols:4,rows:3};
  const PIECES=Object.freeze([
    {cells:[[0,0],[1,0],[0,1],[1,1]],target:[0,0],tray:[28,420],color:'#86a87c'},
    {cells:[[0,0],[1,0]],target:[2,0],tray:[182,420],color:'#bba06b'},
    {cells:[[0,0],[0,1]],target:[2,1],tray:[182,510],color:'#799aa6'},
    {cells:[[0,0],[0,1]],target:[3,1],tray:[266,510],color:'#b38b97'},
    {cells:[[0,0],[1,0]],target:[0,2],tray:[28,566],color:'#a0a778'}
  ]);
  function storageTarget(id){const p=PIECES[id];return {x:DRAWER.x+p.target[0]*CELL,y:DRAWER.y+p.target[1]*CELL};}
  function placeStorage(placed,id,x,y){
    if(!PIECES[id]||placed.includes(id))return null;const p=storageTarget(id);
    return Math.hypot(p.x-x,p.y-y)<=30?[...placed,id]:null;
  }
  function magnetTarget(id){return {x:83+id%3*96,y:210+Math.floor(id/3)*72};}
  function magnetTray(id){return {x:48+id%3*128,y:440+Math.floor(id/3)*72};}
  function placeMagnet(fixed,id,x,y){
    if(id<0||id>8||!Number.isInteger(id)||fixed.includes(id))return null;
    const p=magnetTarget(id);return Math.hypot(p.x-x,p.y-y)<=42?[...fixed,id]:null;
  }
  // Bounded cellular sand: gravity and diagonal slipping, not independent rigid bodies.
  const SAND={cols:84,rows:104,cap:2200,goal:330,bins:[[3,25],[30,52],[57,79]]};
  function createSand(){
    const {cols,rows}=SAND,cells=new Uint8Array(cols*rows),walls=new Uint8Array(cells.length);
    for(let x=0;x<cols;x++)walls[(rows-1)*cols+x]=1;
    SAND.bins.forEach(([l,r])=>{for(let y=54;y<103;y++){walls[y*cols+l]=1;walls[y*cols+r]=1;}});
    return {cells,walls,count:0,turn:0,active:false};
  }
  function pourSand(s,x,y,color){
    const {cols,rows,cap}=SAND;let added=0;x=Math.round(x);y=Math.round(y);
    if(x<0||x>=cols||y<0||y>=rows||color<1||color>3)return 0;
    for(const dx of [0,-1,1,-2,2,-3]){
      const xx=x+dx,index=y*cols+xx;
      if(xx>=0&&xx<cols&&!s.walls[index]&&!s.cells[index]&&s.count<cap){s.cells[index]=color;s.count++;added++;}
    }
    if(added)s.active=true;return added;
  }
  function stepSand(s){
    const {cols,rows}=SAND;let moved=false;s.turn++;
    for(let pass=0;pass<3;pass++)for(let y=rows-2;y>=0;y--)for(let j=0;j<cols;j++){
      const x=s.turn%2?j:cols-1-j,index=y*cols+x,value=s.cells[index];if(!value)continue;
      const side=(x+y+s.turn)%2?1:-1;
      for(const dx of [0,side,-side]){
        const nx=x+dx,to=index+cols+dx;
        if(nx<0||nx>=cols||s.walls[to]||s.cells[to])continue;
        s.cells[to]=value;s.cells[index]=0;moved=true;break;
      }
    }
    s.active=moved;return moved;
  }
  function sandCounts(s){return SAND.bins.map(([l,r])=>{let n=0;for(let y=54;y<103;y++)for(let x=l+1;x<r;x++)if(s.cells[y*SAND.cols+x])n++;return n;});}
  // Semi-Lagrangian dye advection + a small pressure projection on a fixed 40x48 grid.
  const FLUID={cols:40,rows:48};
  function createFluid(){
    const n=FLUID.cols*FLUID.rows,field=()=>new Float32Array(n);
    return {vx:field(),vy:field(),u:field(),v:field(),div:field(),p:field(),q:field(),dye:[field(),field(),field()],tmp:[field(),field(),field()],activity:0};
  }
  function injectFluid(s,x,y,dx,dy,color){
    const {cols:w,rows:h}=FLUID;if(x<1||y<1||x>w-2||y>h-2)return false;
    for(let yy=Math.max(1,Math.floor(y)-3);yy<=Math.min(h-2,Math.ceil(y)+3);yy++)for(let xx=Math.max(1,Math.floor(x)-3);xx<=Math.min(w-2,Math.ceil(x)+3);xx++){
      const weight=Math.max(0,1-Math.hypot(xx-x,yy-y)/3.8),i=yy*w+xx;if(!weight)continue;
      s.vx[i]=Math.max(-3,Math.min(3,s.vx[i]+dx*.22*weight));s.vy[i]=Math.max(-3,Math.min(3,s.vy[i]+dy*.22*weight-.04*weight));
      s.dye[color][i]=Math.min(1,s.dye[color][i]+.42*weight);
    }
    s.activity=1;return true;
  }
  function sample(field,x,y){
    const {cols:w,rows:h}=FLUID;x=Math.max(0,Math.min(w-1.001,x));y=Math.max(0,Math.min(h-1.001,y));
    const a=Math.floor(x),b=Math.floor(y),tx=x-a,ty=y-b,i=b*w+a;
    return (field[i]*(1-tx)+field[i+1]*tx)*(1-ty)+(field[i+w]*(1-tx)+field[i+w+1]*tx)*ty;
  }
  function stepFluid(s){
    const {cols:w,rows:h}=FLUID;
    s.u.fill(0);s.v.fill(0);
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
      const i=y*w+x,xx=x-s.vx[i],yy=y-s.vy[i];
      s.u[i]=sample(s.vx,xx,yy)*.94;s.v[i]=sample(s.vy,xx,yy)*.94;
    }
    [s.vx,s.u]=[s.u,s.vx];[s.vy,s.v]=[s.v,s.vy];s.p.fill(0);s.q.fill(0);
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;s.div[i]=-.5*(s.vx[i+1]-s.vx[i-1]+s.vy[i+w]-s.vy[i-w]);}
    for(let pass=0;pass<6;pass++){
      for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;s.q[i]=(s.div[i]+s.p[i-1]+s.p[i+1]+s.p[i-w]+s.p[i+w])*.25;}
      [s.p,s.q]=[s.q,s.p];
    }
    let speed=0;
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
      const i=y*w+x;s.vx[i]-=.5*(s.p[i+1]-s.p[i-1]);s.vy[i]-=.5*(s.p[i+w]-s.p[i-w]);
      speed=Math.max(speed,Math.abs(s.vx[i])+Math.abs(s.vy[i]));
      for(let c=0;c<3;c++)s.tmp[c][i]=sample(s.dye[c],x-s.vx[i],y-s.vy[i])*.999;
    }
    [s.dye,s.tmp]=[s.tmp,s.dye];s.activity=speed>.008?speed:0;return s.activity>0;
  }
  // Verlet rings with edge/area constraints and bounded broad-phase contacts.
  const SOFT={count:12,nodes:10,width:334,height:448};
  function createSoft(){
    return {bodies:Array.from({length:SOFT.count},(_,id)=>{
      const radius=23+(id%3)*4,cx=46+(id%4)*79,cy=45+Math.floor(id/4)*82;
      const nodes=Array.from({length:SOFT.nodes},(_,j)=>{const a=j*2*Math.PI/SOFT.nodes,x=cx+Math.cos(a)*radius,y=cy+Math.sin(a)*radius;return {x,y,px:x,py:y};});
      return {radius,nodes,color:id%4,area:SOFT.nodes*.5*radius*radius*Math.sin(2*Math.PI/SOFT.nodes)};
    }),drag:null,quiet:0,idle:0,active:true};
  }
  function center(body){let x=0,y=0;for(const n of body.nodes){x+=n.x;y+=n.y;}return {x:x/body.nodes.length,y:y/body.nodes.length};}
  function softHit(s,x,y){for(let i=s.bodies.length-1;i>=0;i--){const b=s.bodies[i],c=center(b);if(Math.hypot(c.x-x,c.y-y)<b.radius+8)return i;}return -1;}
  function stepSoft(s){
    if(!s.active&&!s.drag)return false;
    s.idle=s.drag?0:s.idle+1;
    let movement=0;
    for(const [id,b] of s.bodies.entries()){
      if(b.parked||b.stowed)continue;
      const c=center(b),pull=s.drag&&s.drag.id===id?s.drag:null;
      for(const n of b.nodes){const vx=(n.x-n.px)*.97,vy=(n.y-n.py)*.97;n.px=n.x;n.py=n.y;n.x+=vx;n.y+=vy+.065;
        if(pull){const speed=b.rest?18:8,strength=b.rest?.5:.13;n.x+=Math.max(-speed,Math.min(speed,(pull.x-c.x)*strength));n.y+=Math.max(-speed,Math.min(speed,(pull.y-c.y)*strength));}
      }
    }
    for(let pass=0;pass<3;pass++){
      for(const b of s.bodies){
        if(b.parked||b.stowed)continue;
        const nodes=b.nodes,c=center(b);let area=0;
        for(let j=0;j<nodes.length;j++){const a=nodes[j],z=nodes[(j+1)%nodes.length];area+=a.x*z.y-z.x*a.y;const dx=z.x-a.x,dy=z.y-a.y,d=Math.hypot(dx,dy)||1,rest=b.rest?b.rest[j]:2*b.radius*Math.sin(Math.PI/nodes.length),f=(d-rest)/d*.34;a.x+=dx*f;a.y+=dy*f;z.x-=dx*f;z.y-=dy*f;}
        const correction=Math.max(.97,Math.min(1.035,Math.sqrt(b.area/Math.max(1,Math.abs(area)*.5))));
        for(const [j,n] of nodes.entries()){n.x=c.x+(n.x-c.x)*correction;n.y=c.y+(n.y-c.y)*correction;if(b.reference){n.x+=(c.x+b.reference[j].x-n.x)*.12;n.y+=(c.y+b.reference[j].y-n.y)*.12;}}
      }
      for(let a=0;a<s.bodies.length;a++)for(let b=a+1;b<s.bodies.length;b++){
        const first=s.bodies[a],second=s.bodies[b];if(first.parked||second.parked)continue;const ca=center(first),cb=center(second),dx=cb.x-ca.x,dy=cb.y-ca.y,d=Math.hypot(dx,dy)||.01;
        if(d>first.radius+second.radius+5)continue;
        if(first.rest&&second.rest){
          // Convex node outlines, rather than a circle, preserve space around long soft pieces.
          let depth=Infinity,axis=null,separated=false;
          for(const body of [first,second])for(let j=0;j<body.nodes.length;j++){
            const p=body.nodes[j],q=body.nodes[(j+1)%body.nodes.length],length=Math.hypot(q.x-p.x,q.y-p.y)||1,ax=-(q.y-p.y)/length,ay=(q.x-p.x)/length;
            let loA=Infinity,hiA=-Infinity,loB=Infinity,hiB=-Infinity;
            for(const n of first.nodes){const v=n.x*ax+n.y*ay;loA=Math.min(loA,v);hiA=Math.max(hiA,v);}
            for(const n of second.nodes){const v=n.x*ax+n.y*ay;loB=Math.min(loB,v);hiB=Math.max(hiB,v);}
            const overlap=Math.min(hiA,hiB)-Math.max(loA,loB);if(overlap<=0){separated=true;break;}
            if(overlap<depth){depth=overlap;const sign=dx*ax+dy*ay>=0?1:-1;axis={x:ax*sign,y:ay*sign};}
          }
          if(!separated&&axis){const weight=first.stowed?0:second.stowed?1:s.drag&&s.drag.id===a?.15:s.drag&&s.drag.id===b?.85:.5;for(const n of first.nodes){n.x-=axis.x*depth*weight;n.y-=axis.y*depth*weight;}for(const n of second.nodes){n.x+=axis.x*depth*(1-weight);n.y+=axis.y*depth*(1-weight);}}
          continue;
        }
        const overlap=Math.max(0,first.radius+second.radius-d)*.12;
        for(const [body,other,sign] of [[first,cb,-1],[second,ca,1]])for(const n of body.nodes){
          n.x+=sign*dx/d*overlap;n.y+=sign*dy/d*overlap;
          const nx=n.x-other.x,ny=n.y-other.y,nd=Math.hypot(nx,ny)||.01,limit=(body===first?second.radius:first.radius)*.87;
          if(nd<limit){const f=(limit-nd)/nd*.42;n.x+=nx*f;n.y+=ny*f;}
        }
      }
      const bounds=s.bounds||SOFT;
      for(const b of s.bodies)for(const n of b.nodes){
        if(b.parked||b.stowed)continue;
        for(const o of s.obstacles||[]){
          const dx=n.x-n.px,dy=n.y-n.py;let enter=0,leave=1,axis=null;
          if(!(n.px>o.x&&n.px<o.x+o.w&&n.py>o.y&&n.py<o.y+o.h)){
            for(const [start,delta,min,max,key] of [[n.px,dx,o.x,o.x+o.w,'x'],[n.py,dy,o.y,o.y+o.h,'y']]){
              if(Math.abs(delta)<1e-8){if(start<=min||start>=max){leave=-1;break;}}else{const t1=(min-start)/delta,t2=(max-start)/delta,near=Math.min(t1,t2),far=Math.max(t1,t2);if(near>=enter&&near>=0){enter=near;axis=key;}leave=Math.min(leave,far);}
            }
            if(axis&&enter>=0&&enter<=1&&enter<leave){if(axis==='x')n.x=n.px+dx*enter;else n.y=n.py+dy*enter;}
          }
          if(n.x>o.x&&n.x<o.x+o.w&&n.y>o.y&&n.y<o.y+o.h){
          const distances=[n.x-o.x,o.x+o.w-n.x,n.y-o.y,o.y+o.h-n.y],side=distances.indexOf(Math.min(...distances));
          if(side===0)n.x=o.x;else if(side===1)n.x=o.x+o.w;else if(side===2)n.y=o.y;else n.y=o.y+o.h;
          }
        }
        n.x=Math.max(2,Math.min(bounds.width-2,n.x));n.y=Math.max(2,Math.min(bounds.height-2,n.y));
      }
    }
    for(const b of s.bodies)for(const n of b.nodes)movement=Math.max(movement,Math.hypot(n.x-n.px,n.y-n.py));
    s.quiet=!s.drag&&movement<.16?s.quiet+1:0;s.active=s.quiet<45&&(!!s.drag||s.idle<600);
    if(!s.active)for(const b of s.bodies)for(const n of b.nodes){n.px=n.x;n.py=n.y;}
    return s.active;
  }
  const api={MODES,LEVELS,chain,CELL,DRAWER,PIECES,storageTarget,placeStorage,magnetTarget,magnetTray,placeMagnet,SAND,createSand,pourSand,stepSand,sandCounts,FLUID,createFluid,injectFluid,stepFluid,SOFT,createSoft,center,softHit,stepSoft};
  if(typeof module!=='undefined')module.exports=api;else root.RelaxCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
