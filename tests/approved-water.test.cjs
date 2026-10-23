const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..'),THREE=require(path.join(root,'three.min.js')),ctx=vm.createContext({THREE,console});const run=s=>vm.runInContext(s,ctx);
for(const file of ['environment.js','terrain.js','water-surface.js','water.js'])run(fs.readFileSync(path.join(root,file),'utf8'));
run(`let seed=99;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296},rr=(a,b)=>a+(b-a)*rnd();preparePuddles();`);
assert.equal(run('puddles.length'),54);assert.equal(run('seed'),99);
assert.equal(run('puddles.filter(p=>p.parent).length'),0,'No colored overlay meshes in world');
const result=run(`(()=>{const {data,width,height}=waterSurface.mask.value.image,s=waterSurface.size,c=waterSurface.center;let wet=0,water=0,bad=0,bank=0;for(let j=0;j<height;j++)for(let i=0;i<width;i++){const k=(j*width+i)*4;if(data[k+1])wet++;if(data[k]){water++;const x=c.x+((i+.5)/width-.5)*s.x,z=c.y+((j+.5)/height-.5)*s.y;if(terrainFields(x,z).asphalt<.94)bad++;}if(data[k]>data[k+1])bank++;}const coverage=puddles.map(p=>{const i=Math.floor(((p.position.x-c.x)/s.x+.5)*width),j=Math.floor(((p.position.z-c.y)/s.y+.5)*height);return data[(j*width+i)*4];});return {wet,water,bad,bank,coverage};})()`);
assert(result.water>10000);assert(result.wet>result.water);assert.equal(result.bad,0);assert.equal(result.bank,0);assert(result.coverage.every(v=>v>100),'All 54 puddles have water, including approved position');
for(const z of [-1.475,1.475])for(let x=-2.325;x<=2.325;x+=.02)assert(run(`surfaceDepth(${x},${z})`)<-.18,'No rectangular bank edge');
for(const x of [-2.325,2.325])for(let z=-1.475;z<=1.475;z+=.02)assert(run(`surfaceDepth(${x},${z})`)<-.18);
const settings=fs.readFileSync(path.join(root,'light-lab.js'),'utf8');
for(const legacy of [null,{settings:{flashlight:{brightness:123},rain:{density:5}},scene:{brightness:77},selected:'rain'}]){
 const c=vm.createContext({localStorage:{getItem:k=>k==='brain-fog-light-lab-v6'?JSON.stringify(legacy):null}});vm.runInContext(settings,c);const read=s=>JSON.parse(vm.runInContext(`JSON.stringify(${s})`,c));
 assert.deepEqual(read('sceneLabSettings'),{brightness:90,contrast:121,grain:15,vignette:78});assert.deepEqual(read('lightLabSettings.rain'),{density:300,speed:200,wind:100,length:250,glass:200});assert.equal(read('lightLabSettings.flashlight.brightness'),238);
}
console.log('PASS: all 54 approved water regions, asphalt exclusion, continuous wet banks, no overlay meshes, approved defaults and legacy migration',result.water);
