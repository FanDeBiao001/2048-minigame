const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(support=true){let show,options,check;const native={onShow:f=>show=f,getLaunchOptionsSync:()=>({launch_from:'',location:''}),checkScene:o=>{check=o;o.success({isExist:support});},navigateToScene:o=>options=o};const sandbox={tt:native,module:{exports:{}}};vm.createContext(sandbox);vm.runInContext(fs.readFileSync('src/platform.js','utf8'),sandbox);return {api:sandbox.module.exports,show:o=>show(o),getOptions:()=>options,check:()=>check};}
test('侧边栏仅在宿主支持时显示，跳转参数正确',()=>{const a=setup();assert.equal(a.api.sidebar.supported,true);a.api.openSidebar(()=>{});assert.equal(a.getOptions().scene,'sidebar');const b=setup(false);b.api.openSidebar(()=>{});assert.equal(b.api.sidebar.supported,false);assert.equal(b.getOptions(),undefined);});
test('侧边栏冷启动后热启动状态始终更新',()=>{const a=setup();let updated=0;a.api.sidebar.changed=()=>updated++;a.show({launch_from:'homepage',location:'sidebar_card'});assert.equal(a.api.sidebar.fromSidebar,true);a.show({launch_from:'other',location:'other'});assert.equal(a.api.sidebar.fromSidebar,false);assert.equal(updated,2);});

test('双宿主生命周期与帧率API接入，隐藏时能取消RAF',()=>{
  for(const host of ['tt','wx']){
    const events={show:[],hide:[]},fps=[],cancelled=[];
    const native={onShow:f=>events.show.push(f),onHide:f=>events.hide.push(f),setPreferredFramesPerSecond:f=>fps.push(f)};
    const sandbox={[host]:native,module:{exports:{}},requestAnimationFrame:()=>17,cancelAnimationFrame:id=>cancelled.push(id)};
    vm.createContext(sandbox);vm.runInContext(fs.readFileSync('src/platform.js','utf8'),sandbox);
    const api=sandbox.module.exports;let shown=0,hidden=0;
    api.lifecycle(()=>shown++,()=>hidden++);
    events.hide.forEach(f=>f());events.show.forEach(f=>f({}));
    assert.equal(shown,1);assert.equal(hidden,1);
    api.setFPS(60);api.setFPS(30);assert.deepEqual(fps,[60,30]);
    api.cancelFrame(api.frame(()=>{}));assert.deepEqual(cancelled,[17]);
  }
});
test('浏览器隐藏和定时器回退都能正确停止，支持全局宿主帧率API',()=>{
  let visibility,hidden=false;const cancelled=[],fps=[];
  const document={get hidden(){return hidden;},addEventListener:(name,fn)=>{assert.equal(name,'visibilitychange');visibility=fn;}};
  const sandbox={module:{exports:{}},document,setTimeout:()=>23,clearTimeout:id=>cancelled.push(id),setPreferredFramesPerSecond:f=>fps.push(f)};
  vm.createContext(sandbox);vm.runInContext(fs.readFileSync('src/platform.js','utf8'),sandbox);
  const api=sandbox.module.exports;let shown=0,paused=0;
  api.lifecycle(()=>shown++,()=>paused++);hidden=true;visibility();hidden=false;visibility();
  assert.equal(shown,1);assert.equal(paused,1);
  api.cancelFrame(api.frame(()=>{}));assert.deepEqual(cancelled,[23]);
  api.setFPS(30);assert.deepEqual(fps,[30]);
});

test('两宿主复用小游戏画布API创建小尺寸流体缓存，失败时可回退',()=>{
  for(const host of ['tt','wx']){
    let count=0;const canvases=[];
    const native={createCanvas:()=>{const c={index:count++};canvases.push(c);return c;}};
    const sandbox={[host]:native,module:{exports:{}}};vm.createContext(sandbox);vm.runInContext(fs.readFileSync('src/platform.js','utf8'),sandbox);
    const api=sandbox.module.exports,main=api.canvas(),surface=api.surface(40,48);
    assert.notEqual(main,surface);assert.equal(surface.width,40);assert.equal(surface.height,48);assert.equal(canvases.length,2);
    native.createCanvas=()=>{throw Error('unavailable');};assert.equal(api.surface(40,48),null);
  }
});
