(function (root) {
  const empty = () => Array(16).fill(0);
  function spawn(board, random = Math.random) {
    const slots = board.map((v, i) => v ? -1 : i).filter(i => i >= 0);
    if (slots.length) board[slots[Math.floor(random() * slots.length)]] = random() < 0.9 ? 2 : 4;
    return board;
  }
  function move(board, direction) {
    const next = empty(), tracks = [], merges = []; let gain = 0;
    for (let line = 0; line < 4; line++) {
      const indices = Array.from({length: 4}, (_, p) => direction === 'left' ? line * 4 + p : direction === 'right' ? line * 4 + 3 - p : direction === 'up' ? p * 4 + line : (3 - p) * 4 + line);
      const cells = indices.filter(i => board[i]), values = cells.map(i => board[i]), merged = [];
      for (let i = 0; i < values.length; i++) {
        const to = indices[merged.length];
        tracks.push({from:cells[i],to,value:values[i]});
        if (values[i] === values[i + 1]) { tracks.push({from:cells[i+1],to,value:values[i+1]}); merges.push(to); merged.push(values[i] * 2); gain += values[i] * 2; i++; }
        else merged.push(values[i]);
      }
      indices.forEach((index, p) => { next[index] = merged[p] || 0; });
    }
    return {board: next, gain, tracks, merges, changed: next.some((v, i) => v !== board[i])};
  }
  function over(board) { return ['left', 'right', 'up', 'down'].every(d => !move(board, d).changed); }
  function pair(board, random = Math.random) {
    let largest=0, choices=[];
    for(let source=0;source<16;source++){
      const value=board[source];if(!value||value<largest)continue;
      const row=Math.floor(source/4),col=source%4;
      const neighbours=[row>0?source-4:-1,row<3?source+4:-1,col>0?source-1:-1,col<3?source+1:-1];
      for(const target of neighbours){
        if(target<0||board[target])continue;
        if(value>largest){largest=value;choices=[];}
        choices.push({source,target,value});
      }
    }
    return choices.length?choices[Math.min(choices.length-1,Math.max(0,Math.floor(random()*choices.length)))]:null;
  }
  function fold(board, direction) {
    if(!['left','right','up','down'].includes(direction))throw new Error('Invalid fold direction');
    const next=board.slice(),pairs=[],merges=[];let gain=0;
    for(let line=0;line<4;line++)for(let p=0;p<2;p++){
      const target=direction==='left'?line*4+p:direction==='right'?line*4+3-p:direction==='up'?p*4+line:(3-p)*4+line;
      const source=direction==='left'||direction==='right'?line*4+3-target%4:(3-Math.floor(target/4))*4+line;
      const value=board[source];
      if(value&&value===board[target]&&Number.isSafeInteger(value*2)){
        next[source]=0;next[target]=value*2;gain+=value*2;
        pairs.push({source,target,value});merges.push(target);
      }
    }
    return {board:next,pairs,merges,gain,changed:pairs.length>0};
  }
  function canFold(board){return ['left','right','up','down'].some(d=>fold(board,d).changed);}
  function deliver(board, parcel, advance=true){
    const next=board.slice();
    if(!parcel)return {board:next,parcel:null,delivery:null,gain:0};
    const pending={...parcel,remaining:Math.max(0,parcel.remaining-(advance?1:0))};
    if(pending.remaining>0 || (next[pending.target]!==0&&next[pending.target]!==pending.value))return {board:next,parcel:pending,delivery:null,gain:0};
    const merged=next[pending.target]===pending.value,value=pending.value*(merged?2:1);
    if(!Number.isSafeInteger(value))return {board:next,parcel:pending,delivery:null,gain:0};
    next[pending.target]=value;
    return {board:next,parcel:null,delivery:{target:pending.target,value,merged,original:pending.value},gain:merged?value:0};
  }
  function bestFold(board,parcel=null){
    let best=null;
    for(const direction of ['left','right','up','down']){
      const result=fold(board,direction);if(!result.changed)continue;
      const delivered=deliver(result.board,parcel,false);
      const candidate={...result,direction,delivered,totalGain:result.gain+delivered.gain,
        emptyCells:delivered.board.filter(v=>!v).length};
      if(!best||candidate.totalGain>best.totalGain||
        (candidate.totalGain===best.totalGain&&(candidate.pairs.length>best.pairs.length||
          (candidate.pairs.length===best.pairs.length&&candidate.emptyCells>best.emptyCells))))best=candidate;
    }
    return best;
  }
  const api = {empty, spawn, move, over, pair, fold, canFold, deliver, bestFold};
  if (typeof module !== 'undefined') module.exports = api;
  else root.GameCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
