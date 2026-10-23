const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const dir=path.join(__dirname,'..'),THREE=require(path.join(dir,'three.min.js'));
let saved=null;const ctx=vm.createContext({THREE,console,localStorage:{getItem:()=>null,setItem:(k,v)=>saved=v},document:{getElementById:()=>null}});
const run=s=>vm.runInContext(s,ctx);
vm.runInContext(fs.readFileSync(path.join(dir,'light-lab.js'),'utf8'),ctx);
run('const post={uniforms:{sceneBrightness:{value:1},sceneContrast:{value:1},filmGrain:{value:0},vignetteStrength:{value:.48}}};');
assert.equal(run('sceneLabSettings.brightness'),90);assert.equal(run('normalizeSceneLab({brightness:Infinity,contrast:-2}).brightness'),90);
assert.equal(run('normalizeSceneLab({brightness:999,contrast:0}).contrast'),50);
const lightBefore=run('JSON.stringify(lightLabSettings)');run('sceneLabSettings={brightness:175,contrast:85,grain:35,vignette:20};applySceneLab();lightLabSave();');
assert.equal(run('post.uniforms.filmGrain.value'),.35);assert.equal(run('post.uniforms.vignetteStrength.value'),.2);assert.equal(run('normalizeSceneLab({grain:999,vignette:-1}).grain'),100);assert.equal(run('normalizeSceneLab({grain:999,vignette:-1}).vignette'),0);assert.equal(run('post.uniforms.sceneBrightness.value'),1.75);assert.equal(run('post.uniforms.sceneContrast.value'),.85);assert.equal(run('JSON.stringify(lightLabSettings)'),lightBefore,'Global appearance does not change physical light settings');assert.equal(JSON.parse(saved).scene.brightness,175);
const restored=vm.createContext({localStorage:{getItem:()=>saved},document:{getElementById:()=>null}});vm.runInContext(fs.readFileSync(path.join(dir,'light-lab.js'),'utf8'),restored);assert.equal(vm.runInContext('sceneLabSettings.contrast',restored),85);
// A foliage card below a trunk must not determine planting height, including after scaling/rotation.
vm.runInContext(fs.readFileSync(path.join(dir,'town.js'),'utf8'),ctx);
run(`const scene=new THREE.Scene(),colliders=[];function terrainHeightAt(){return .012;}
placeTownAsset=function(){const g=new THREE.Group();const bark=new THREE.Mesh(new THREE.BoxGeometry(.4,8,.4),new THREE.MeshStandardMaterial());bark.material.name='bark';bark.geometry.translate(0,5,0);g.add(bark);const leaf=new THREE.Mesh(new THREE.BoxGeometry(2,.1,2),new THREE.MeshStandardMaterial());leaf.material.name='foliage';g.add(leaf);g.position.set(3,0,2);g.scale.setScalar(2);g.rotation.y=.7;scene.add(g);return g;};townTree('OAK0',3,2,16,.7);`);
assert(Math.abs(run('treeObjects[0].userData.grounding.gap')+.075)<1e-9);assert(run('treeObjects[0].userData.grounding.shift')< -2,'Floating trunk is lowered independently of foliage');assert.equal(run('colliders[0].min.y'),.012);
run(`placeTownAsset=function(){const g=new THREE.Group(),geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([0,1,0,-1,1.3,-1,1,1.3,-1,1,1.3,1,-1,1.3,1,0,9,0],3));const m=new THREE.MeshStandardMaterial();m.name='fir_tree_trunk_b';g.add(new THREE.Mesh(geo,m));scene.add(g);return g;};townTree('X2',0,0,9,0);`);
assert(Math.abs(run('treeObjects[1].userData.grounding.contactBefore')-1.3)<1e-6,'Root skirt outer rim defines contact');
assert(run('treeObjects[1].userData.grounding.lowestRootGap')<-.3,'Protruding underside is buried');
// The source LAMP really was a partly transparent solid; reproduce corrected emitter from its geometry.
const asset=fs.readFileSync(path.join(dir,'assets/LAMP.js'),'utf8').match(/=\s*['"]([A-Za-z0-9+/=]+)['"]/)[1],glb=Buffer.from(asset,'base64'),n=glb.readUInt32LE(12),gltf=JSON.parse(glb.subarray(20,20+n)),bytes=glb.subarray(n+28),primitive=gltf.meshes[0].primitives[0];
assert.equal(gltf.materials[0].alphaMode,'BLEND');
function attr(name){const a=gltf.accessors[primitive.attributes[name]],v=gltf.bufferViews[a.bufferView],out=[];for(let i=0;i<a.count;i++)for(let j=0;j<3;j++)out.push(bytes.readFloatLE((v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||12)+j*4));return new THREE.Float32BufferAttribute(out,3);}
const geo=new THREE.BufferGeometry();geo.setAttribute('position',attr('POSITION'));geo.setAttribute('normal',attr('NORMAL'));geo.computeBoundingBox();const box=geo.boundingBox,center=box.getCenter(new THREE.Vector3());geo.translate(-center.x,-box.min.y,-center.z);ctx.fixtureGeometry=geo;
vm.runInContext(fs.readFileSync(path.join(dir,'streetlights.js'),'utf8'),ctx);
run(`const fixtureTemplate=new THREE.Group();const sourceMaterial=new THREE.MeshStandardMaterial({transparent:true,opacity:.8});fixtureTemplate.add(new THREE.Mesh(fixtureGeometry,sourceMaterial));fixtureTemplate.userData.size=[4.35,9.1969924,.587];const propTemplates={streetLamp:fixtureTemplate};function putProp(k,x,y,z,a,s){const g=fixtureTemplate.clone(true);g.position.set(x,y,z);g.scale.setScalar(s);scene.add(g);return g;}streetLamp(-8,-44,.006);`);
assert(run('streetLightSources[0].fixture.children.every(m=>!m.material.transparent&&m.material.depthWrite)'));
assert.equal(run('streetLightSources[0].bulb.geometry.attributes.position.count'),405);
assert(run('streetLightSources[0].bulb.material.emissiveIntensity')>0);
assert(run('streetLightSources[0].position.y')>6.6);assert(run('streetLightSources[0].position.y')<7.3);
console.log('PASS: scene controls/persistence/independence, woody-root anchoring, opaque imported pole, real diffuser geometry and source alignment');
