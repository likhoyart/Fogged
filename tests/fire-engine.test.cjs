const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const dir=path.join(__dirname,'..'),THREE=require(path.join(dir,'three.min.js'));
const ctx=vm.createContext({THREE,console});const run=s=>vm.runInContext(s,ctx);
run(fs.readFileSync(path.join(dir,'fire-engine.js'),'utf8'));
for(const d of [30,31,100])assert.equal(run(`engineDistanceGain(${d})`),0);
assert.equal(run('engineDistanceGain(3)'),1);
let previous=1;for(let d=3;d<=30;d+=.05){const g=run(`engineDistanceGain(${d})`);assert(g<=previous+1e-12&&g>=0);previous=g;}
for(let t=0;t<10;t+=.01){const [a,b]=run(`[emergencyPulse(${t},0),emergencyPulse(${t},1)]`);assert(a>=0&&b>=0&&a<=1&&b<=1);assert(a*b<1e-20,'Red lamps alternate without overlap');}
run(`const root=new THREE.Group(),parent=new THREE.Group();parent.rotation.x=Math.PI/2;root.add(parent);const mesh=new THREE.Mesh(new THREE.BoxGeometry(.4,1,.2),new THREE.MeshStandardMaterial());parent.add(mesh);const halves=splitLightbar(mesh,root);root.updateMatrixWorld(true);`);
assert(run('halves.every(m=>m.geometry.attributes.position.count>0)'));
assert(run('halves.every((m,i)=>Array.from({length:m.geometry.attributes.position.count},(_,j)=>m.localToWorld(new THREE.Vector3().fromBufferAttribute(m.geometry.attributes.position,j)).z).reduce((a,b)=>a+b,0)*(i?1:-1)>0)'),'Split uses vehicle width even with rotated imported nodes');
const asset=fs.readFileSync(path.join(dir,'assets/FIRE_ENGINE.js'),'utf8');const bytes=Buffer.from(asset.match(/"([A-Za-z0-9+/=]+)"/)[1],'base64');
const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
assert(!gltf.nodes.some(n=>n.name==='front_door_left'||n.name==='front_door_right'),'Original closed doors, no cut-out door groups');
assert.equal(gltf.images.length,15);assert(bytes.length<5e6);
assert.equal(gltf.meshes.reduce((n,m)=>n+m.primitives.reduce((k,p)=>k+gltf.accessors[p.indices].count/3,0),0),21325);
console.log('PASS: continuous 30 m engine fade, alternating red lamps, transformed lightbar split, original closed doors and optimized embedded GLB');

for(const start of [20,40,60]){let dips=0;const values=Array.from({length:481},(_,i)=>run(`headlightPower(${start+i*.001})`));for(let i=1;i<480;i++)if(values[i]<values[i-1]&&values[i]<values[i+1])dips++;assert.equal(dips,2);assert(Math.abs(values[0]-1)<1e-8&&Math.abs(values[480]-1)<1e-8);}
for(const t of [0,1,19.9,20.5,30,39.9])assert.equal(run(`headlightPower(${t})`),1);
console.log('PASS: exactly two headlight dips every 20 seconds; steady between bursts');
