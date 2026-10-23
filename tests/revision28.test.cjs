const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');const root=path.join(__dirname,'..'),THREE=require(path.join(root,'three.min.js'));
const previous={settings:{beacon:{brightness:1},headlights:{brightness:123},emergency:{frequency:22},rain:{density:250}},scene:{brightness:7}};
const ctx=vm.createContext({THREE,console,localStorage:{getItem:k=>k==='fogged-light-lab-v1'?JSON.stringify(previous):null}}),run=s=>vm.runInContext(s,ctx);
for(const file of ['light-lab.js','weather.js','fire-engine.js','building-updates.js'])run(fs.readFileSync(path.join(root,file),'utf8'));
assert.equal(run('lightLabSettings.beacon.brightness'),219);assert.equal(run('lightLabSettings.street.density'),53);assert.equal(run('lightLabSettings.flashlight.range'),36);assert.equal(run('sceneLabSettings.brightness'),90);assert.equal(run('sceneLabSettings.contrast'),121);assert.equal(run('lightLabSettings.headlights.brightness'),123);
for(const duration of [30,65,180])for(const gap of [30,95,300]){
 let pulses=0,on=false;for(let t=0;t<1;t+=.001){const v=run(`stormFlashAt(${t},{duration:${duration},gap:${gap},brightness:180})`);assert(Number.isFinite(v)&&v>=0&&v<=1.8);if(v>0&&!on)pulses++;on=v>0;}assert.equal(pulses,2);
}
assert.equal(run('engineDistanceGain(20)'),0);assert.equal(run('engineDistanceGain(30)'),0);assert.equal(run('engineDistanceGain(3)'),1);assert(run('engineDistanceGain(19.9)<.001'));for(let d=0;d<21;d+=.1)assert(run(`engineDistanceGain(${d})>=engineDistanceGain(${d+.1})`));
run(`const colliders=[new THREE.Box3(new THREE.Vector3(95.5,-1,-105),new THREE.Vector3(96.5,20,55))];const g=new THREE.Mesh(new THREE.BoxGeometry(46.27,5,16),new THREE.MeshBasicMaterial());g.position.set(104,2.5,0);prepareWarehouseAccess(g);`);
assert(run(`(()=>{for(let x=79;x<126;x+=.1)if(colliders.some(b=>b.max.y>.06&&b.min.y<1.7&&Math.hypot(x-THREE.MathUtils.clamp(x,b.min.x,b.max.x),THREE.MathUtils.clamp(0,b.min.z,b.max.z))<.28))return false;return true;})()`),'Open warehouse passage extends beyond old boundary');
assert(run('colliders.some(b=>b.min.z>7&&b.max.y>4)'),'Side walls remain solid');
assert(!fs.readFileSync(path.join(root,'interface.js'),'utf8').includes('setTimeout'),'No UI flicker timers');
console.log('PASS: approved-default migration, 2 isolated lightning pulses, smooth 20m audio envelope, accessible warehouse past old boundary, UI flicker disabled');
