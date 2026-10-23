global.ProgressEvent=class ProgressEvent { constructor(type,props){this.type=type;Object.assign(this,props);} };
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),THREE=require(path.join(root,'three.min.js'));
const context=vm.createContext({THREE,console,TextDecoder,TextEncoder,URL,Blob,fetch,performance});const run=s=>vm.runInContext(s,context);
for(const file of ['GLTFLoader.js','environment.js','terrain.js','town.js','props.js','street-props.js'])run(fs.readFileSync(path.join(root,file),'utf8'));
run(`const scene=new THREE.Scene(),colliders=[];function collision(o){o.updateWorldMatrix(true,true);const b=new THREE.Box3().setFromObject(o);if(b.max.y>.30)colliders.push(b);}terrainHeightAt=()=>.02;`);
(async()=>{
 for(const type of ['barrier','gate','manhole','stump','trunk','broken-bicycle']){
  const b=fs.readFileSync(path.join(root,'assets/street',type+'.glb')),n=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+n));
  assert(j.meshes.length>0);for(const m of j.meshes)for(const p of m.primitives)delete p.material;
  delete j.materials;delete j.textures;delete j.images;
  j.buffers[0].uri='data:application/octet-stream;base64,'+b.subarray(28+n).toString('base64');
  context.json=JSON.stringify(j);const source=(await run(`new THREE.GLTFLoader().parseAsync(json,'')`)).scene;context.source=source;
  run(`{const bounds=new THREE.Box3().setFromObject(source),center=bounds.getCenter(new THREE.Vector3()),g=mergeImported(source);if('${type}'==='gate')for(const m of g.children){m.geometry.translate(center.x,bounds.min.y,center.z);m.geometry.computeBoundingBox();}streetPropTemplates['${type}']=g;}`);
 }
 run(`for(const [name,size] of [['fence',[1.85,2,.08]],['post',[.07,2,.07]]]){const g=new THREE.Group();g.add(new THREE.Mesh(new THREE.BoxGeometry(...size).translate(0,1,0),new THREE.MeshStandardMaterial()));g.userData.size=size;propTemplates[name]=g;}buildStreetProps();`);
 const counts=JSON.parse(run('JSON.stringify(streetPropDiagnostics().counts)'));assert.deepEqual(counts,{'broken-bicycle':1,barrier:3,manhole:6,stump:8,trunk:4,gate:1});
 assert.equal(run('streetPropFences.length'),2);
 assert(run(`streetPropObjects.filter(g=>g.userData.streetType==='manhole').every(g=>Math.abs(streetBounds(g).max.y-.029)<.00001&&terrainFields(g.position.x,g.position.z).asphalt>.99)`),'Six flush asphalt covers');
 assert(run(`streetPropObjects.every(g=>{const b=streetBounds(g);return Number.isFinite(b.min.y)&&b.max.y>b.min.y;})`));
 const blocked=run(`(()=>{const p=streetPropLayout.find(p=>p.type==='gate'),a=[];for(let t=-4;t<=4;t+=.1){const x=p.x+Math.sin(p.yaw)*t,z=p.z+Math.cos(p.yaw)*t;for(const b of colliders)if(b.max.y>.08&&b.min.y<1.72&&Math.hypot(x-THREE.MathUtils.clamp(x,b.min.x,b.max.x),z-THREE.MathUtils.clamp(z,b.min.z,b.max.z))<.28)a.push({t,x,z,min:b.min.toArray(),max:b.max.toArray()});}return a;})()`);
 assert.equal(blocked.length,0,'Gate route blocked: '+JSON.stringify(blocked.slice(0,2)));
 for(const r of JSON.parse(fs.readFileSync(path.join(root,'assets/street/optimization.json')))){assert(r.maxSurfaceErrorMeters<.025);assert(r.optimizedTriangles<=r.originalTriangles);assert(r.textures.every(t=>t.optimized.every(n=>n===341)));}
 console.log('PASS: six asset types, 6 flush asphalt covers, 3 barriers, 8 stumps, 4 logs, 1 bike, open gate with 2 fence sections, 56 cm player passage, bounded mesh deviation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
