(function(root){
  const DURATION=720;
  const clamp=t=>Math.max(0,Math.min(1,t));
  const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
  function pose(age,options={}){
    const origin=options.origin||{x:66,y:207,size:30},destination=options.destination||origin;
    const lift=age<150?smooth(age/150):age<540?1:1-smooth((age-540)/180);
    const angle=age<150?0:age<310?Math.PI*smooth((age-150)/160):age<380?Math.PI:Math.PI*(1+smooth((age-380)/160));
    const face=angle<Math.PI/2?'old':angle<Math.PI*1.5?'back':'new';
    const end=age>=540?destination:origin;
    return {x:end.x+(179-end.x)*lift,y:end.y+(433-end.y)*lift,size:end.size+(100-end.size)*lift,lift,
      width:Math.max(.035,Math.abs(Math.cos(angle))),face,
      tilt:-.055*Math.sin(Math.PI*lift),done:age>=DURATION};
  }
  function box(ctx,x,y,w,h,r,color){
    ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();ctx.fill();
  }
  function label(ctx,value,x,y,size,color){
    ctx.fillStyle=color;ctx.font='700 '+size+'px -apple-system, "PingFang SC", sans-serif';
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(value,x,y);
  }
  function draw(ctx,age,from,to,palette,options={}){
    const p=pose(age,options),half=p.size/2;
    ctx.save();ctx.globalAlpha=.12*p.lift;box(ctx,0,254,358,358,22,'#36533a');ctx.restore();
    ctx.save();ctx.globalAlpha=p.lift;
    label(ctx,options.title||'下一块换牌',179,351,14,'#36533a');
    label(ctx,options.subtitle||from+' → '+to,179,507,15,'#36533a');ctx.restore();
    // A flat, short-lived contact shadow; no blur, texture, or physics solver.
    ctx.save();ctx.translate(p.x,p.y+half+7*p.lift);ctx.scale(1,.15);
    ctx.globalAlpha=.12*p.lift;box(ctx,-half,-half,p.size,p.size,12,'#36533a');ctx.restore();
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.tilt);
    const edge=Math.max(2,p.size*p.width);
    box(ctx,-edge/2-1,-half,edge+2,p.size,Math.min(12,edge/2),'#c5b58a');
    ctx.scale(p.width,1);
    const value=p.face==='old'?from:to;
    const colors=palette[value]||['#375d43','#fff'];
    box(ctx,-half,-half,p.size,p.size,8+4*p.lift,p.face==='back'?'#385a3b':colors[0]);
    if(p.face==='back'){
      const inset=p.size*.14;
      for(const x of [-1,1])for(const y of [-1,1])box(ctx,x*p.size*.31-inset/2,y*p.size*.31-inset/2,inset,inset,3,'#87a174');
      label(ctx,'⇄',0,0,p.size*.4,'#f3dfa6');
    }else{
      ctx.save();ctx.globalAlpha=.35;box(ctx,-half+7,-half+6,p.size-14,5,2.5,'#fffdf0');ctx.restore();
      label(ctx,value,0,0,Math.min(46,p.size*.63,p.size/(String(value).length*.7)),colors[1]);
    }
    ctx.restore();
  }
  const api={DURATION,pose,draw};
  if(typeof module!=='undefined')module.exports=api;else root.SwapEffect=api;
})(typeof globalThis!=='undefined'?globalThis:this);
