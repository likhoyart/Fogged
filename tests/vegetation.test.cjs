const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const dir=path.join(__dirname,'..'),THREE=require(path.join(dir,'three.min.js'));
const ctx=vm.createContext({THREE,console});const run=s=>vm.runInContext(s,ctx);
for(const file of ['environment.js','town.js'])run(fs.readFileSync(path.join(dir,file),'utf8'));
run(`const scene=new THREE.Scene(),colliders=[];let seed=99;
function rnd(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}function rr(a,b){return a+(b-a)*rnd();}
townTree=function(kind,x,z,height,yaw){const g=new THREE.Group();g.position.set(x,0,z);g.userData.grounding={rootXZ:[x,z],gap:-.075};treeObjects.push(g);townObjects.push(g);colliders.push(new THREE.Box3());scene.add(g);};
for(const [x,z] of treePositions)townTree('X2',x,z,20,0);
for(let i=0;i<48;i++)townTree('X2',-91+(i%6)*10,-96+Math.floor(i/6)*16,20,0);
const original=treeObjects.slice();densifyTrees();`);
const count=run('JSON.stringify(vegetationCounts)');assert.deepEqual(JSON.parse(count),{baseBorder:24,baseForest:48,border:48,forest:144});
assert.equal(run('seed'),99,'Independent layout seed does not move existing props');assert(run('original.every((g,i)=>g===treeObjects[i])'));
assert(run('treeObjects.slice(72).every(g=>!roadRects.some(r=>distanceToRect(...g.userData.grounding.rootXZ,r)<1.3))'));
assert(run('treeObjects.slice(72).every(g=>Math.hypot(g.position.x+40,g.position.z-2)>=3.5&&Math.hypot(g.position.x+77,g.position.z+28)>=9)'));
assert(run('treeObjects.slice(72).every(g=>g.position.x>=-30||Math.abs(g.position.z-(g.position.x+40)*.65)>=4.5)'));
assert.equal(run('extraTreeAllowed(-2,-50,[],[])'),false);assert.equal(run('extraTreeAllowed(-40,2,[],[])'),false);assert.equal(run('extraTreeAllowed(-77,-28,[],[])'),false);
console.log('PASS: 24→48 border trees, 48→144 forest trees, original transforms retained, roads/bench/lighthouse path clear');

run(`const geo=new THREE.BoxGeometry(1,20,1),mat=new THREE.MeshStandardMaterial();for(const g of treeObjects){g.add(new THREE.Mesh(geo,mat));}batchTreeRendering();`);
assert.equal(run('treeBatches.reduce((n,b)=>n+b.count,0)'),192,'Each tree rendered once');
assert(run('treeObjects.every(g=>g.visible===false)'),'No duplicate rendering from metadata groups');
assert(run('treeBatches.length>0&&treeBatches.length<192'));
assert(run('treeBatches.every(b=>b.castShadow&&b.receiveShadow&&Number.isFinite(b.boundingSphere.radius))'));
console.log('PASS: shared tree rendering, one instance per tree, finite fixed-world bounds and shadows');
