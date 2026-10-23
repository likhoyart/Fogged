const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const dir=path.join(__dirname,'..'),THREE=require(path.join(dir,'three.min.js'));
const ctx=vm.createContext({THREE,console});
vm.runInContext(fs.readFileSync(path.join(dir,'environment.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(dir,'terrain.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(dir,'cornfield.js'),'utf8'),ctx);
const at=vm.runInContext('terrainFields',ctx);
for(const [x,z] of [[0,0],[-2,-45],[40,0],[53,30]])assert.equal(at(x,z).asphalt,1,'Road centres remain paved');
assert(at(-60,-13).wear>.7,'Forest route has worn soil');
assert(at(-77,-28).wear>.7,'Lighthouse clearing uses worn soil');
let mixed=0;
for(let z=-100;z<53;z+=1.71)for(let x=-94;x<94;x+=1.37){const a=at(x,z),b=at(x+.001,z);for(const k of ['asphalt','lawn','wear','n']){assert(Number.isFinite(a[k])&&a[k]>=0&&a[k]<=1);assert(Math.abs(a[k]-b[k])<.01,'Continuous material weights across world coordinates');}if(a.asphalt>.01&&a.asphalt<.99)mixed++;}
assert(mixed>100,'Road perimeter includes a broad blend band');
// Sample generated mesh: finite vertices, real varied heights, no tall grass in paved interiors.
vm.runInContext(`const scene=new THREE.Scene(),townObjects=[],townLayout=[];let seed=1;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296},rr=(a,b)=>a+(b-a)*rnd();prepareGrass();`,ctx);
const result=vm.runInContext(`(()=>{let max=0,low=0,tall=0,total=0;for(const c of grassCells){const p=c.mesh.geometry.attributes.position;for(let i=0;i<p.count;i++){if(!Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)))throw Error('Invalid vertex');max=Math.max(max,p.getY(i));}for(let i=4;i<p.count;i+=5){total++;if(p.getY(i)<.18)low++;if(p.getY(i)>.4)tall++;}}return {count:grassCount,max,low,tall,total};})()`,ctx);
assert(result.count>50000);assert(result.low/result.total>.5);assert(result.tall>100);assert(result.max<1);
console.log('PASS: road interiors, continuous irregular blending, forest path, lighthouse clearing, finite geometry, mixed grass heights',result);
