(function(root){
  const FOLD_MS=680,SEND_MS=500,RECEIVE_MS=420;
  const clamp=t=>Math.max(0,Math.min(1,t));
  const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
  function foldPose(age){
    const angle=age<360?Math.PI*smooth((age-60)/300):Math.PI*(1-smooth((age-400)/280));
    const raw=Math.cos(angle);
    return {scale:Math.abs(raw)<.025?(raw<0?-.025:.025):raw,back:raw<0,resolved:age>=360};
  }
  function panel(ctx,x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
  function fold(ctx,age,before,after,direction,tile){
    const p=foldPose(age),horizontal=direction==='left'||direction==='right';
    const source=i=>direction==='left'?i%4>=2:direction==='right'?i%4<2:direction==='up'?i>=8:i<8;
    const values=p.resolved?after:before;
    for(let i=0;i<16;i++)if(!source(i)&&values[i])tile(values[i],10+i%4*87,264+Math.floor(i/4)*87);
    ctx.save();
    if(horizontal){ctx.translate(179,0);ctx.scale(p.scale,1);ctx.translate(-179,0);}
    else {ctx.translate(0,433);ctx.scale(1,p.scale);ctx.translate(0,-433);}
    const x=direction==='left'?179:0,y=direction==='up'?433:254;
    panel(ctx,x,y,horizontal?179:358,horizontal?358:179,p.back?'#a5b897':'#dce3d2');
    for(let i=0;i<16;i++)if(source(i)){
      const cx=48.5+i%4*87,cy=302.5+Math.floor(i/4)*87;
      if(p.back){panel(ctx,cx-18,cy-2,36,4,'#c5d4b9');}
      else if(values[i])tile(values[i],cx-38.5,cy-38.5);
    }
    ctx.restore();
    ctx.save();ctx.strokeStyle='#708866';ctx.lineWidth=2;ctx.beginPath();
    if(horizontal){ctx.moveTo(179,260);ctx.lineTo(179,606);}else{ctx.moveTo(6,433);ctx.lineTo(352,433);}
    ctx.stroke();ctx.restore();
  }
  function envelope(ctx,x,y,size,value,opening=0){
    ctx.save();ctx.translate(x,y);ctx.scale(size/64,size/64);
    panel(ctx,-32,-23,64,46,'#e6cc8b');
    ctx.fillStyle='#f7e9c0';ctx.beginPath();ctx.moveTo(-32,-23);ctx.lineTo(0,opening>0?-23-26*opening:2);ctx.lineTo(32,-23);ctx.closePath();ctx.fill();
    ctx.fillStyle='#536749';ctx.font='700 16px -apple-system, "PingFang SC", sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(value,0,10);ctx.restore();
  }
  function send(ctx,age,origin,target,value){
    const t=smooth(age/SEND_MS),size=50+14*Math.sin(Math.PI*t);
    envelope(ctx,origin.x+(target.x-origin.x)*t,origin.y+(target.y-origin.y)*t-35*Math.sin(Math.PI*t),size,value);
  }
  function receive(ctx,age,target,value,tile){
    const t=clamp(age/RECEIVE_MS);
    ctx.save();ctx.globalAlpha=1-smooth((t-.25)/.65);
    envelope(ctx,target.x,target.y,68,value,smooth(t/.4));ctx.restore();
    ctx.save();ctx.globalAlpha=smooth((t-.25)/.55);
    tile(value,target.x-38.5,target.y-38.5+14*(1-smooth(t)),.85+.15*smooth(t));ctx.restore();
  }
  const api={FOLD_MS,SEND_MS,RECEIVE_MS,foldPose,fold,send,receive};
  if(typeof module!=='undefined')module.exports=api;else root.FeatureEffects=api;
})(typeof globalThis!=='undefined'?globalThis:this);
