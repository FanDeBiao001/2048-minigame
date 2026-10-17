(function (root) {
  // Small, bounded work per interaction; never run a loop to measure performance.
  const NORMAL = Object.freeze({fps:60, dpr:2, pixels:2000000, decorations:4, droplets:4, duration:420});
  const ECONOMY = Object.freeze({fps:30, dpr:1.5, pixels:1200000, decorations:2, droplets:0, duration:340});
  function create() {
    let profile=NORMAL, deadline=null, samples=0, slow=0;
    return {
      settings: () => profile,
      pixelRatio(info) {
        return Math.min(info.pixelRatio || 1, profile.dpr,
          Math.sqrt(profile.pixels / Math.max(1, info.windowWidth * info.windowHeight)));
      },
      resetClock() { deadline=null; },
      allowFrame(now) {
        const interval=1000/profile.fps;
        if(deadline!==null && now+.5<deadline)return false;
        const late=deadline===null?0:Math.max(0,now-deadline);
        deadline=now+interval-(late%interval);
        return true;
      },
      sample(cost, callbackGap) {
        if(profile===ECONOMY)return;
        samples++;
        if(cost>=8 || (callbackGap>25 && callbackGap<100))slow++;
        // A whole window avoids reacting to one GC pause or the first frame after idle.
        if(samples===24){
          if(slow>=12){profile=ECONOMY;deadline=null;}
          samples=0;slow=0;
        }
      }
    };
  }
  const api={create,NORMAL,ECONOMY};
  if(typeof module!=='undefined')module.exports=api;else root.RenderBudget=api;
})(typeof globalThis!=='undefined'?globalThis:this);
