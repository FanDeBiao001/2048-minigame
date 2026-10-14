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
  const api = {empty, spawn, move, over};
  if (typeof module !== 'undefined') module.exports = api;
  else root.GameCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
