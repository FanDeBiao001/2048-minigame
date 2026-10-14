(function (root) {
  const native = typeof wx !== 'undefined' ? wx : typeof tt !== 'undefined' ? tt : null;
  const api = {
    native,
    canvas: () => native ? native.createCanvas() : document.querySelector('canvas'),
    info: () => native ? native.getSystemInfoSync() : {windowWidth: innerWidth, windowHeight: innerHeight, pixelRatio: devicePixelRatio || 1},
    read: key => { try { return native ? native.getStorageSync(key) : JSON.parse(localStorage.getItem(key)); } catch (_) { return null; } },
    write: (key, value) => { try { if (native) native.setStorageSync(key, value); else localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} },
    frame: callback => typeof requestAnimationFrame === 'function' ? requestAnimationFrame(callback) : setTimeout(callback, 16),
    touch: (canvas, start, end, cancel, move) => {
      if (native) { native.onTouchStart(e => { if(e.touches[0]) start(e.touches[0].clientX, e.touches[0].clientY); }); native.onTouchEnd(e => { if(e.changedTouches[0]) end(e.changedTouches[0].clientX, e.changedTouches[0].clientY); }); native.onTouchCancel(cancel); native.onTouchMove(e => {if(e.touches[0]) move(e.touches[0].clientX,e.touches[0].clientY);}); }
      else { canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); start(e.clientX, e.clientY); }); canvas.addEventListener('pointerup', e => end(e.clientX, e.clientY)); canvas.addEventListener('pointercancel', cancel); canvas.addEventListener('pointermove', e => move(e.clientX,e.clientY)); }
    }
  };
  if (typeof module !== 'undefined') module.exports = api; else root.GamePlatform = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
