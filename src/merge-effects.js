(function (root) {
  // Time is supplied by the game loop; effects never change the board or RNG.
  const DURATION = 420;
  const MAX_BURSTS = 8;
  const clamp = value => Math.max(0, Math.min(1, value));
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const pose = [
    [0, .86], [24, .86], [78, 1.10],
    [160, .975], [245, 1.008], [340, 1]
  ];

  function deformation(age, horizontal) {
    if (age < 0 || age >= 340) return {x: 1, y: 1};
    let right = 1;
    while (right < pose.length - 1 && age > pose[right][0]) right++;
    const a = pose[right - 1], b = pose[right];
    const t = clamp((age - a[0]) / (b[0] - a[0]));
    const smooth = t * t * (3 - 2 * t);
    const x = a[1] + (b[1] - a[1]) * smooth;
    const y = 1 / x; // Approximate area conservation makes the material feel solid.
    return horizontal ? {x, y} : {x: y, y: x};
  }

  const DEFAULT = {decorations:4,droplets:4,duration:DURATION};
  function create(settings = () => DEFAULT) {
    let bursts = [];
    return {
      emit(items, time, direction, combo) {
        const horizontal = direction === 'left' || direction === 'right';
        const strength = Math.min(1.2, 1 + Math.max(0, combo - 1) * .035);
        bursts = bursts.concat(items.map(item => ({...item, time, horizontal, strength,
          directions:Array.from({length:4},(_,i)=>{const angle=i*Math.PI/2+(item.index%3)*.22;return {x:Math.cos(angle),y:Math.sin(angle),angle};})
        }))).slice(-MAX_BURSTS);
      },
      clear() { bursts = []; },
      update(now) {
        let keep=0;const duration=settings().duration;
        for(let i=0;i<bursts.length;i++)if(now-bursts[i].time<duration)bursts[keep++]=bursts[i];
        bursts.length=keep;
      },
      active() { return bursts.length > 0; },
      count() { return bursts.length; },
      tile(index, now, since = -Infinity) {
        for (let i = bursts.length - 1; i >= 0; i--) {
          if (bursts[i].index === index && bursts[i].time >= since) return deformation(now - bursts[i].time, bursts[i].horizontal);
        }
        return {x: 1, y: 1};
      },
      draw(ctx, now, layer) {
        // One clean ring replaces the old three translucent background disks.
        if(layer==='under')return;
        const profile=settings(), duration=profile.duration;
        for(let n=Math.max(0,bursts.length-profile.decorations);n<bursts.length;n++){
          const b=bursts[n];
          const age = now - b.time;
          if (age < 0 || age >= duration) continue;
          const t = clamp(age / duration);
          ctx.save();
          ctx.translate(b.x, b.y);
          {
            // A bounded number of soft droplets, released after the squeeze.
            const release = clamp((age - 24) / (duration - 24));
            const releaseFade = age < 24 ? 0 : Math.pow(1 - release, 1.6);
            ctx.globalAlpha = .66 * releaseFade;
            ctx.strokeStyle = '#fff8db'; ctx.lineWidth = 2.8 * (1 - t) + .3;
            ctx.beginPath();ctx.arc(0, 0, 33 + easeOut(release) * 29, 0, Math.PI * 2);ctx.stroke();
            for (let i = 0; i < profile.droplets; i++) {
              const direction=b.directions[i];
              const travel = (20 + (i % 3) * 7) * b.strength * easeOut(release);
              const radius = 30 + travel;
              const x = direction.x * radius, y = direction.y * radius + 12 * t * t;
              ctx.save();ctx.translate(x, y);ctx.rotate(direction.angle + Math.PI / 2);
              ctx.globalAlpha = .92 * releaseFade;
              ctx.fillStyle = ['#fff9e9', '#e5c46e', '#9ab87e'][i % 3];
              ctx.scale(1, 1.55 - .55 * t);
              ctx.beginPath();ctx.arc(0, 0, (3.3 + (i % 2) * .9) * (1 - .65 * release), 0, Math.PI * 2);ctx.fill();ctx.restore();
            }
            // The small score lifts out of the collision, then gently dissolves.
            const scoreT = clamp((age - 70) / (duration - 70));
            ctx.globalAlpha = Math.sin(Math.PI * scoreT) * .9;
            ctx.fillStyle = '#49693e';ctx.font = '600 12px -apple-system, "PingFang SC", sans-serif';
            ctx.textAlign = 'center';ctx.textBaseline = 'middle';
            ctx.fillText('+' + b.value, 0, -26 - easeOut(scoreT) * 22);
          }
          ctx.restore();
        }
      }
    };
  }
  const api = {create, deformation, DURATION, MAX_BURSTS};
  if (typeof module !== 'undefined') module.exports = api;
  else root.MergeEffects = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
