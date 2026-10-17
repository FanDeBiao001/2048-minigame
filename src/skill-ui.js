(function(root){
  const HEIGHT=780,BODY_SHIFT=-32,PERIOD_MS=5000,IDLE_FPS=30,CHARGE_MS=560;
  function fit(info,native){
    const w=info.windowWidth,h=info.windowHeight;
    const top=native?Math.max(26,(info.safeArea?info.safeArea.top:info.statusBarHeight||0)+40):20;
    const bottom=native&&info.safeArea&&Number.isFinite(info.safeArea.bottom)?Math.max(18,h-info.safeArea.bottom):18;
    const available=Math.max(1,h-top-bottom);
    const scale=Math.min((w-32)/358,available/HEIGHT,1.25);
    return {scale,ox:(w-358*scale)/2,oy:top,top,bottom};
  }
  // Continuous reminders share one phase; only their small strip redraws at idle.
  function createCue(){
    let mask=0,start=null,deadline=null;
    const active=()=>mask!==0&&start!==null;
    return {
      update(available,now,{covered=false,reduced=false}={}){
        mask=covered||reduced?0:available;
        if(!mask){start=null;deadline=null;}
        else if(start===null)start=now;
      },
      active,
      allowIdleFrame(now){
        if(!active())return false;
        const interval=1000/IDLE_FPS;
        if(deadline!==null&&now+.5<deadline)return false;
        const late=deadline===null?0:Math.max(0,now-deadline);
        deadline=now+interval-(late%interval);return true;
      },
      pose(bit,now){
        if(!active()||!(mask&bit))return null;
        const phase=Math.max(0,now-start)%PERIOD_MS/PERIOD_MS;
        return {phase:(phase+(bit===4?0:bit===1?1/3:2/3))%1};
      },
      cancel(){mask=0;start=null;deadline=null;}
    };
  }
  // Sample the inset rounded perimeter once. Frames only interpolate cached points.
  const EDGE={x:1.25,y:1.25,w:103.5,h:59.5,r:11};
  const STRAIGHT_X=EDGE.w-2*EDGE.r,STRAIGHT_Y=EDGE.h-2*EDGE.r,ARC=Math.PI*EDGE.r/2;
  const EDGE_LENGTH=2*(STRAIGHT_X+STRAIGHT_Y)+4*ARC,TRACK_STEPS=256;
  function perimeterPoint(distance){
    let d=distance;const {x,y,w,h,r}=EDGE;
    const sections=[STRAIGHT_X,ARC,STRAIGHT_Y,ARC,STRAIGHT_X,ARC,STRAIGHT_Y,ARC];
    let section=0;while(section<7&&d>sections[section])d-=sections[section++];
    if(section===0)return {x:x+r+d,y};
    if(section===2)return {x:x+w,y:y+r+d};
    if(section===4)return {x:x+w-r-d,y:y+h};
    if(section===6)return {x,y:y+h-r-d};
    const angle=({1:-Math.PI/2,3:0,5:Math.PI/2,7:Math.PI})[section]+d/r;
    const cx=section===1||section===3?x+w-r:x+r,cy=section===1||section===7?y+r:y+h-r;
    return {x:cx+r*Math.cos(angle),y:cy+r*Math.sin(angle)};
  }
  const EDGE_TRACK=Array.from({length:TRACK_STEPS},(_,i)=>perimeterPoint(i*EDGE_LENGTH/TRACK_STEPS));
  function meteorPoint(phase){
    const position=((phase%1+1)%1)*TRACK_STEPS,index=Math.floor(position),t=position-index;
    const a=EDGE_TRACK[index],b=EDGE_TRACK[(index+1)%TRACK_STEPS];
    return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
  }
  function drawMeteor(ctx,x,y,phase,color){
    ctx.save();ctx.translate(x,y);ctx.lineCap='butt';ctx.lineJoin='round';
    ctx.strokeStyle=color;ctx.lineWidth=1.7;
    // One tapered-opacity line; no separate bright head or halo. Fixed 12 segments.
    for(let segment=0;segment<12;segment++){
      const t=(segment+.5)/12;ctx.globalAlpha=.66*t*t*(3-2*t);ctx.beginPath();
      for(let j=0;j<=2;j++){
        const p=meteorPoint(phase-(12-segment-j/2)*4.5/EDGE_LENGTH);
        if(j)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  const CARDS=Object.freeze([
    Object.freeze({kind:'pair',x:12,bit:4,fill:'#47634b',border:'#71866b',ink:'#fffdf4',sub:'#e0e8dc',trail:'#bdd3ad'}),
    Object.freeze({kind:'fold',x:126,bit:1,fill:'#4c6574',border:'#7c929d',ink:'#fffdf4',sub:'#e1e9ed',trail:'#c1d4df'}),
    Object.freeze({kind:'mail',x:240,bit:2,fill:'#e8cf95',border:'#c4aa72',ink:'#3d533d',sub:'#506044',trail:'#896b3c'})
  ]);
  function chargePose(age){
    if(age<0||age>=CHARGE_MS)return null;
    const flight=Math.min(1,age/380);
    const fill=Math.max(0,Math.min(1,(age-180)/300));
    return {flight,fill:fill*fill*(3-2*fill),opacity:flight<1?1:Math.max(0,1-(age-380)/180)};
  }
  const api={HEIGHT,BODY_SHIFT,PERIOD_MS,IDLE_FPS,CHARGE_MS,CARDS,chargePose,fit,createCue,meteorPoint,drawMeteor};
  if(typeof module!=='undefined')module.exports=api;else root.SkillUI=api;
})(typeof globalThis!=='undefined'?globalThis:this);
