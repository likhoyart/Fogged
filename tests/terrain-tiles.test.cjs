const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');const root=path.join(__dirname,'..'),THREE=require(path.join(root,'three.min.js'));const ctx=vm.createContext({THREE,console}),run=s=>vm.runInContext(s,ctx);
run(fs.readFileSync(path.join(root,'environment.js'),'utf8'));run(fs.readFileSync(path.join(root,'terrain.js'),'utf8'));
run(`const scene=new THREE.Scene(),materials={asphalt:{map:null,normalMap:null}},camera={position:new THREE.Vector3(0,1.7,0)};buildTerrain();animateTerrain();`);
assert.equal(run('terrainCells.reduce((n,m)=>n+m.geometry.index.count,0)'),240*210*6);
assert(run('terrainCells.every(m=>m.geometry.attributes.position===terrainMesh.geometry.attributes.position&&m.geometry.attributes.normal===terrainMesh.geometry.attributes.normal)'));
assert(run('terrainCells.filter(m=>m.visible).length')<50);
assert(run('terrainCells.filter(m=>m.visible).reduce((n,m)=>n+m.geometry.index.count/3,0)')<15000);
for(const [x,z] of [[0,0],[-40,0],[-77,-28],[10,12]])assert(Number.isFinite(run(`terrainHeightAt(${x},${z})`)));
console.log('PASS: ground tiles preserve all triangles and exact source positions/normals; local draw budget below 15k triangles; grounding raycasts intact');
