(function (root) {
  const native = typeof wx !== 'undefined' ? wx : typeof tt !== 'undefined' ? tt : null;
  const sidebar = {supported:false, fromSidebar:false, changed:()=>{}};
  const douyin = typeof tt !== 'undefined' && native === tt;
  function updateLaunch(options) {
    sidebar.fromSidebar=!!options && options.launch_from==='homepage' && options.location==='sidebar_card';
    sidebar.changed();
  }
  // Subscribe synchronously at startup so warm launches update the reward state.
  if(douyin && native.onShow) native.onShow(updateLaunch);
  if(douyin && native.getLaunchOptionsSync) updateLaunch(native.getLaunchOptionsSync());
  if(douyin && native.checkScene && native.navigateToScene) native.checkScene({scene:'sidebar',success:res=>{sidebar.supported=!!res.isExist;sidebar.changed();},fail:()=>{sidebar.supported=false;sidebar.changed();}});
  const api = {
    sidebar,
    openSidebar: fail => { if(sidebar.supported) native.navigateToScene({scene:'sidebar',fail}); },

    native,
    canvas: () => native ? native.createCanvas() : document.querySelector('canvas'),
    surface: (width,height) => {
      try {
        // The main canvas is created first; subsequent mini-game canvases are offscreen.
        const surface=native?native.createCanvas():document.createElement('canvas');
        if(surface){surface.width=width;surface.height=height;}return surface;
      } catch (_) { return null; }
    },
    info: () => native ? native.getSystemInfoSync() : {windowWidth: innerWidth, windowHeight: innerHeight, pixelRatio: devicePixelRatio || 1},
    read: key => { try { return native ? native.getStorageSync(key) : JSON.parse(localStorage.getItem(key)); } catch (_) { return null; } },
    write: (key, value) => { try { if (native) native.setStorageSync(key, value); else localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} },
    frame: callback => typeof requestAnimationFrame === 'function' ? requestAnimationFrame(callback) : setTimeout(callback, 16),
    cancelFrame: handle => {
      if(typeof requestAnimationFrame === 'function') {
        if(typeof cancelAnimationFrame === 'function')cancelAnimationFrame(handle);
      } else clearTimeout(handle);
    },
    setFPS: fps => {
      // Hosts expose this as a global or a namespaced API, depending on runtime.
      // The game's own drawing cap remains the fallback when unavailable.
      try {
        if(typeof setPreferredFramesPerSecond==='function')setPreferredFramesPerSecond(fps);
        else if(native&&typeof native.setPreferredFramesPerSecond==='function')native.setPreferredFramesPerSecond(fps);
      } catch (_) {}
    },
    lifecycle: (show, hide) => {
      if(native){if(native.onShow)native.onShow(show);if(native.onHide)native.onHide(hide);}
      else document.addEventListener('visibilitychange',()=>document.hidden?hide():show());
    },
    touch: (canvas, start, end, cancel, move) => {
      if (native) { native.onTouchStart(e => { if(e.touches[0]) start(e.touches[0].clientX, e.touches[0].clientY); }); native.onTouchEnd(e => { if(e.changedTouches[0]) end(e.changedTouches[0].clientX, e.changedTouches[0].clientY); }); native.onTouchCancel(cancel); native.onTouchMove(e => {if(e.touches[0]) move(e.touches[0].clientX,e.touches[0].clientY);}); }
      else { canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); start(e.clientX, e.clientY); }); canvas.addEventListener('pointerup', e => end(e.clientX, e.clientY)); canvas.addEventListener('pointercancel', cancel); canvas.addEventListener('pointermove', e => move(e.clientX,e.clientY)); }
    }
  };
  if (typeof module !== 'undefined') module.exports = api; else root.GamePlatform = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
