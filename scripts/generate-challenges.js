// Offline content authoring only. No solver or random level generation runs per frame.
const fs=require('node:fs'),L=require('../src/challenge-core');
let seed=20261017;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const chain=[],names=['轻轻一划','合到角落','绕开石块','留出空格','送到右下','两条通路','先腾再合','错位出口','穿过窄道','留一个角落','双份收纳','最后的空位'];
const walls=[[],[],[5],[6],[5,6],[5,9],[6,10],[5,10],[5,6,9],[6,9,10],[5,6],[5,10]];
for(let i=0;i<12;i++){
  let chosen=null;const min=[1,2,3,3,4,4,5,5,6,6,6,7][i];
  for(let attempt=0;attempt<1000&&!chosen;attempt++){
    const board=Array(16).fill(0);walls[i].forEach(k=>board[k]=-1);
    const values=i<2?[2,2,4,8]:i<10?[2,2,4,8,16]:[2,2,4,8,16,32];
    for(const v of values){const ids=board.map((v,j)=>v===0?j:-1).filter(j=>j>=0);board[ids[Math.floor(random()*ids.length)]]=v;}
    const target=i<2?16:i<10?32:32,exits=i>=4?[i%2?0:15]:undefined;
    const level={name:names[i],target,board,exits};const solution=L.solveChain(level,board,18000);
    if(solution&&solution.length>=min&&solution.length<=min+2)chosen={...level,solution,par:solution.length+2};
  }
  if(!chosen)throw Error('No chain level '+i);chain.push(chosen);console.log('清盘',i+1,chosen.solution.length);
}
const specs=[
  [3,2,['I2','I2','I2']], [4,3,['O4','L3','L3','I2']], [4,3,['I3','I3','L3','L3']],
  [4,4,['O4','O4','L4','L4']], [4,4,['T4','T4','L4','Z4']], [5,4,['I4','O4','L4','L4','O4']],
  [5,4,['O4','L4','T4','L3','L3','I2']], [5,4,['L4','T4','O4','L3','I3'],[8,13]],
  [5,4,['L4','L4','T4','T4','O4']], [5,4,['I4','Z4','L4','I3','L3'],[8,13]],
  [5,4,['I4','O4','L4','L4','O4']], [5,4,['O4','L4','T4','L3','L3','I2']]
];
const storage=specs.map(([cols,rows,pieces,blocked],i)=>{
  const level={name:['刚好合适','转个方向','留出长边','文具抽屉','角落拼合','厨房收纳','把大件放好','绕开隔板','靠边整理','先开通道','长件先行','旅行箱'][i],cols,rows,pieces,blocked:blocked||[]};
  if(i>=8)level.edges={0:i%2?'left':'top'};
  if(i>=9)level.entry=[0];
  const solution=L.solveStorage(level,1000000);if(!solution)throw Error('No storage '+i);
  console.log('收纳',i+1);return {...level,solution,par:pieces.length+2};
});
function portsFromPath(cols,rows,path,extra=[]){const ports=Array(cols*rows).fill(0);const edges=path.slice(1).map((v,i)=>[path[i],v]).concat(extra);
  for(const [a,b] of edges){const d=b-a,bit=d===1?2:d===-1?8:d===cols?4:1,opp=d===1?8:d===-1?2:d===cols?1:4;ports[a]|=bit;ports[b]|=opp;}return ports;}
const paths=[[0,1,3,2],[0,1,2,5,4,3],[0,1,2,5,8,7,6,3],[0,1,2,5,4,3,6,7,8],...Array(4).fill([0,1,2,3,7,6,5,4,8,9,10,11])];
const magnet=paths.map((path,i)=>{const cols=i===0?2:i<4?3:4,rows=i===0?2:i===1?2:3,extra=i===5?[[1,5]]:i===6?[[0,4],[6,10]]:i===7?[[1,5],[2,6],[5,9]]:[];
  const solution=portsFromPath(cols,rows,path,extra),fixed=[path[0],path.at(-1)],ports=solution.map((v,j)=>fixed.includes(j)?v:L.rotatePorts(v,1+Math.floor(random()*3)));
  return {name:['点亮一段','转角相接','绕过空心','串起九格','一条长路','分支连接','固定锚点','整网接通'][i],cols,rows,source:path[0],sink:path.at(-1),fixed,ports,solution,par:path.length*2};
});
const patterns=[[[0]],[[0],[1]],[[2,0]],[[0,1],[1,0]],[[0],[1],[2]],[[0,1],[1,2]],[[2,0],[1]],[[0,2],[1,0],[2,1]],[[0,1,2],[2,1,0]],[[0,1],[1,2],[2,0]],[[2,0],[0,1],[1,2]],[[0,1,2],[1,2,0],[2,0,1]]];
const sand=patterns.map((layers,i)=>{const bins=layers.length===1?[[30,52]]:layers.length===2?[[10,32],[50,72]]:[[3,25],[30,52],[57,79]],dose=layers.some(l=>l.length===3)?180:i<4?150:i===4?240:i>=7?120:150,total=layers.reduce((n,l)=>n+l.length*dose,0);
  return {name:['第一瓶砂','分给两瓶','颜色有顺序','两层晚霞','三色小瓶','留一层空间','分流练习','错开色层','三层回忆','材料刚刚好','少调一次阀','彩砂收藏家'][i],bins,layers,dose,quota:Math.ceil(total*(i<8?1.42:1.24)/6)*6,maxChanges:i===10?5:i===11?10:i===9?18:0,par:total};
});
const regions=[
  [{x:11,y:13,w:18,h:22,color:1}],
  [{x:3,y:10,w:13,h:28,color:0},{x:24,y:10,w:13,h:28,color:2}],
  [{x:4,y:5,w:30,h:13,color:1},{x:4,y:30,w:30,h:13,color:2},{x:16,y:20,w:8,h:8,protect:true}],
  [{x:3,y:7,w:12,h:32,color:2},{x:25,y:7,w:12,h:32,color:0},{x:17,y:8,w:6,h:30,protect:true}],
  [{x:3,y:4,w:14,h:17,color:0},{x:23,y:4,w:14,h:17,color:1},{x:12,y:28,w:16,h:16,color:2}],
  [{x:3,y:5,w:13,h:15,color:1},{x:24,y:28,w:13,h:15,color:2},{x:17,y:18,w:6,h:12,protect:true}],
  [{x:3,y:5,w:10,h:38,color:0},{x:15,y:5,w:10,h:38,color:1},{x:27,y:5,w:10,h:38,color:2}],
  [{x:3,y:5,w:13,h:15,color:2},{x:24,y:5,w:13,h:15,color:1},{x:12,y:30,w:16,h:13,color:0},{x:15,y:21,w:10,h:6,protect:true}]
];
const fluid=regions.map((regions,i)=>({name:['一片薄荷湖','两岸不同色','给中间留白','绕过白色河道','三色岛屿','对角的风','并排的颜色','留白收藏家'][i],regions,coverage:i<2?.48:i<6?.55:.62,quota:[150,160,160,140,160,120,150,120][i],par:60}));
const cup=(x,y,w,h,mouth)=>({x,y,w,h,...(mouth?{mouth}:{})});
const soft=Array.from({length:8},(_,i)=>{
  const cups=i===0?[cup(110,210,120,138)]:i===4?[cup(20,175,294,173,80)]:i>=6?[cup(8,175,92,173,i===7?48:58),cup(121,175,92,173,i===7?48:58),cup(234,175,92,173,i===7?48:58)]:[cup(16,195,128,153,i>=3?64:0),cup(190,195,128,153,i>=3?64:0)];
  let goals;
  if(i===0)goals=[{cup:0,x:170,y:315,rx:24,ry:24}];
  else if(i===1)goals=[{cup:0,x:80,y:315,rx:26,ry:26},{cup:1,x:254,y:315,rx:26,ry:26}];
  else if(i===2)goals=[{cup:0,x:48,y:315,rx:22,ry:22},{cup:0,x:108,y:315,rx:22,ry:22},{cup:1,x:254,y:315,rx:28,ry:28}];
  else if(i===3)goals=[{cup:0,x:80,y:285,rx:38,ry:18,rot:1},{cup:1,x:222,y:315,rx:23,ry:23},{cup:1,x:285,y:315,rx:23,ry:23}];
  else if(i===4)goals=[{cup:0,x:70,y:265,rx:46,ry:18,rot:1},...[140,202,270].map(x=>({cup:0,x,y:315,rx:26,ry:26}))];
  else if(i===5)goals=[{cup:0,x:48,y:315,rx:22,ry:22},{cup:0,x:108,y:315,rx:22,ry:22},{cup:1,x:224,y:270,rx:40,ry:18,rot:1},{cup:1,x:285,y:315,rx:25,ry:25}];
  else goals=cups.flatMap((c,id)=>[{cup:id,x:c.x+c.w/2,y:245,rx:i===7?34:29,ry:17,rot:1},{cup:id,x:c.x+c.w/2,y:315,rx:22,ry:22}]);
  const items=goals.map((g,j)=>({rx:g.rx,ry:g.ry,color:g.cup,x:45+(j%3)*118,y:42+Math.floor(j/3)*70,cup:g.cup}));
  return {name:['轻放入盒','分进两格','圆团留空间','长团转个身','穿过窄口','先长后圆','三个小格','合上旅行盒'][i],cups,items,solution:goals,par:items.length*4};
});
const data={chain,storage,magnet,sand,fluid,soft};
fs.writeFileSync('src/challenge-data.js',`(function(root){\n  const data=${JSON.stringify(data,null,2)};\n  if(typeof module!=='undefined')module.exports=data;else root.ChallengeData=data;\n})(typeof globalThis!=='undefined'?globalThis:this);\n`);
console.log('完成',Object.values(data).reduce((n,a)=>n+a.length,0),'关');
