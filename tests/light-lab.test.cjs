const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),code=fs.readFileSync(path.join(root,'light-lab.js'),'utf8');
const context=vm.createContext({localStorage:{getItem:()=>'{invalid',setItem:()=>{throw Error('disabled');}},document:{getElementById:()=>null}});
vm.runInContext(code,context);
const run=s=>vm.runInContext(s,context);
assert.equal(run('lightLabSettings.beacon.range'),238,'Invalid storage falls back safely');
assert.equal(run('lightLabSave()'),false,'Unavailable storage does not stop live controls');
assert.equal(run('normalizeLightLabSettings({street:{range:-20},flashlight:{brightness:Infinity}}).street.range'),4);
assert.equal(run('normalizeLightLabSettings({street:{range:999}}).street.range'),40);
assert.equal(run('normalizeLightLabSettings({flashlight:{brightness:Infinity}}).flashlight.brightness'),238);
assert.equal(run('normalizeLightLabSettings({beacon:{density:0}}).beacon.density'),0);
run(`
const vector=()=>({values:[],set(...v){this.values=v;},toArray(){return this.values;}});
const lamp={shadow:{camera:{}}},beaconLight={shadow:{camera:{}}},beaconLens={material:{color:{setRGB(){}}}};
const streetLightSources=Array.from({length:10},()=>({base:245,light:{},bulbMaterials:[{}]}));
const post={uniforms:Object.fromEntries(['beaconTuning','beaconCone','torchTuning','streetTuning'].map(k=>[k,{value:vector()}]))};
const active=true,debug=false;let nextFlicker=60,audio=null;
`);
vm.runInContext(fs.readFileSync(path.join(root,'electrical-assets.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'environment.js'),'utf8'),context);
run('applyLightLab()');
assert(Math.abs(run('streetLightSources[0].light.angle')-.70*Math.pow(2,.5))<1e-9);assert.equal(run('post.uniforms.streetTuning.value.values[1]'),38);
assert.equal(run('lamp.intensity'),114.24);assert.equal(run('beaconLight.intensity'),119355);
assert.equal(run('streetLightSources.every(s=>s.light.intensity===423.85&&s.light.distance===38)'),true);
run('lightLabSettings.flashlight.brightness=175; lightLabSettings.street.density=0; applyLightLab()');
assert.equal(run('lamp.intensity'),84);assert.equal(run('post.uniforms.streetTuning.value.values[0]'),0);
assert.equal(run('streetLightSources[0].light.intensity'),423.85,'Density must not dim surface lighting');
run('for(let i=0;i<1201;i++)animateFlashlight(.05)');
assert.equal(run('flashlightBursts'),1,'One flicker event after 60 seconds');
assert.equal(run('lamp.intensity>=0&&lamp.intensity<=84'),true);
run('for(let i=0;i<50;i++)animateFlashlight(.05)');
assert.equal(run('lamp.intensity'),84,'Brightness survives flicker completion');
run('lightLabSettings.flashlight.brightness=0; applyLightLab(); animateFlashlight(.05)');
assert.equal(run('lamp.intensity'),0,'Off stays off during animation');
for(const source of ['beacon','flashlight','street'])for(const focus of [0,100])for(const clarity of [0,100]){
 run(`lightLabSettings.${source}.focus=${focus};lightLabSettings.${source}.clarity=${clarity};applyLightLab()`);
 const pair=run(source==='beacon'?'post.uniforms.beaconCone.value.values':source==='street'?'post.uniforms.streetTuning.value.values.slice(2)':'post.uniforms.torchTuning.value.values.slice(2)');
 assert(pair.every(Number.isFinite)&&pair[0]<pair[1],'Extreme sliders retain valid smoothstep edges');
}
run('lightLabSettings.beacon.brightness=0;lightLabSettings.street.brightness=0;applyLightLab()');
assert.equal(run('beaconLight.intensity+streetLightSources[0].light.intensity+post.uniforms.beaconTuning.value.values[0]+post.uniforms.streetTuning.value.values[0]'),0);
console.log('PASS: storage recovery, limits, independent density, 60-second flicker, brightness restoration, zero power, valid cone extremes');

const previous={settings:{beacon:{brightness:231},street:{brightness:99},flashlight:{brightness:120}},scene:{brightness:100,contrast:100},selected:'scene'};
const migrated=vm.createContext({localStorage:{getItem:k=>k==='brain-fog-light-lab-v3'?JSON.stringify(previous):null},document:{getElementById:()=>null}});vm.runInContext(code,migrated);
const read=s=>vm.runInContext(s,migrated);
assert.equal(read('lightLabSettings.beacon.brightness'),219);assert.equal(read('lightLabSettings.street.brightness'),173);
assert.equal(read('lightLabSettings.flashlight.brightness'),238);assert.equal(read('sceneLabSettings.brightness'),90);assert.equal(read('sceneLabSettings.contrast'),121);
console.log('PASS: approved defaults migrate while applying the newly approved scene and light settings');
