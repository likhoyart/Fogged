'use strict';
// One shared planar reflection for every coplanar puddle. Based on Three.js Reflector (MIT).
const puddles=[],waterReflection={target:null,camera:null,matrix:new THREE.Matrix4(),time:{value:0},ready:{value:0},lastUpdate:-Infinity,frames:0};
function puddleOutline(w,d,phase){const outline=[];for(let i=0;i<48;i++){const a=i/48*Math.PI*2,r=.85+.08*Math.sin(3*a+phase)+.09*Math.sin(5*a+phase*2.1)+.05*Math.cos(8*a-phase);outline.push([Math.cos(a)*w*.5*r,Math.sin(a)*d*.5*r]);}return outline;}
function createPuddle(x,z,w,d,phase){
 if(!waterReflection.target){waterReflection.target=new THREE.WebGLRenderTarget(384,216,{type:THREE.HalfFloatType,depthBuffer:true});waterReflection.camera=new THREE.PerspectiveCamera();}
 const outline=puddleOutline(w,d,phase),vertices=[0,0,0],uv=[.5,.5],indices=[];
 for(const [px,pz] of outline){vertices.push(px,0,pz);uv.push(px/w+.5,pz/d+.5);}
 for(let i=0;i<48;i++)indices.push(0,(i+1)%48+1,i+1);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
 // Footprints remain for visibility/diagnostics. Water is shaded on the existing terrain.
 const mesh=new THREE.Mesh(g);mesh.position.set(x,.028,z);mesh.userData.size=[w,d];mesh.userData.phase=phase;mesh.name='asphalt_puddle_footprint';mesh.geometry.computeBoundingSphere();mesh.updateMatrixWorld(true);puddles.push(mesh);return mesh;
}

function preparePuddles(){
 const savedSeed=seed;seed=190915;
 for(let attempt=0;puddles.length<52&&attempt<10000;attempt++){
  const r=roadRects[Math.floor(rnd()*roadRects.length)],x=rr(r[0]+.7,r[0]+r[2]-.7),z=rr(r[1]+.7,r[1]+r[3]-.7),w=rr(1,4.6),d=rr(.7,2.6),phase=rr(0,6.28);
  const outline=puddleOutline(w,d,phase);if(outline.some(([a,b])=>terrainFields(x+a,z+b).asphalt<.96))continue;
  if(puddles.some(p=>Math.hypot(p.position.x-x,p.position.z-z)<Math.max(w,d)*.6+1))continue;
  createPuddle(x,z,w,d,phase);
 }seed=savedSeed;
 // Fixed additions beside the parked engine; preserve all 52 existing seeded puddles.
 createPuddle(5.4,10.7,2.4,1.35,1.73);
 createPuddle(11.1,7.4,2.0,1.3,4.21);
 prepareWaterSurface();
}
function renderWaterReflection(time){
 const w=waterReflection;w.time.value=time;waterSurface.time.value=elapsed;if(!w.target||time-w.lastUpdate<.05)return;
 camera.updateMatrixWorld();const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
 if(!puddles.some(p=>p.position.distanceToSquared(camera.position)<900&&frustum.intersectsObject(p)))return;
 const c=w.camera,y=.028,n=new THREE.Vector3(0,1,0),direction=camera.getWorldDirection(new THREE.Vector3()),look=camera.position.clone().add(direction);c.position.copy(camera.position);c.position.y=2*y-c.position.y;look.y=2*y-look.y;c.up.set(0,1,0).applyQuaternion(camera.quaternion).reflect(n);c.lookAt(look);c.near=camera.near;c.far=camera.far;c.updateMatrixWorld();c.projectionMatrix.copy(camera.projectionMatrix);
 w.matrix.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1).multiply(c.projectionMatrix).multiply(c.matrixWorldInverse);
 // Oblique near plane excludes geometry below the water (Lengyel / Three.js Reflector).
 const plane=new THREE.Plane(n,-y).applyMatrix4(c.matrixWorldInverse),clip=new THREE.Vector4(plane.normal.x,plane.normal.y,plane.normal.z,plane.constant),e=c.projectionMatrix.elements,q=new THREE.Vector4((Math.sign(clip.x)+e[8])/e[0],(Math.sign(clip.y)+e[9])/e[5],-1,(1+e[10])/e[14]);clip.multiplyScalar(2/clip.dot(q));e[2]=clip.x;e[6]=clip.y;e[10]=clip.z+1-.001;e[14]=clip.w;
 const oldTarget=renderer.getRenderTarget(),oldShadow=renderer.shadowMap.autoUpdate,oldFog=scene.fog,oldSky=nightSky.position.clone(),hidden=[];
 for(const object of [...puddles,viewHand,rainLines,...terrainCells,...grassCells.map(c=>c.mesh)])if(object?.visible){hidden.push(object);object.visible=false;}
 try{waterSurface.reflectionPass.value=1;waterSurface.reflectionTexture.value=null;renderer.shadowMap.autoUpdate=false;scene.fog=new THREE.FogExp2(0x111b22,.038);nightSky.position.copy(c.position);renderer.setRenderTarget(w.target);renderer.render(scene,c);w.ready.value=1;w.lastUpdate=time;w.frames++;}
 finally{waterSurface.reflectionPass.value=0;waterSurface.reflectionTexture.value=w.target.texture;for(const object of hidden)object.visible=true;nightSky.position.copy(oldSky);scene.fog=oldFog;renderer.shadowMap.autoUpdate=oldShadow;renderer.setRenderTarget(oldTarget);}
}
function worldDetailDiagnostics(){return {stars:{count:starField.geometry.attributes.position.count,depthTest:starField.material.depthTest,depthWrite:starField.material.depthWrite,constellations:0},rain:{screenDrops:{count:glassDrops.length,pinned:glassDrops.filter(d=>d.pinned).length,atlas:[glassWidth,glassHeight]},...lightLabSettings.rain,visibleDrops:rainLines.geometry.drawRange.count/2,capacity:rainDrops.length},puddles:{count:puddles.length,reflectionFrames:waterReflection.frames,resolution:[384,216],maxHz:20,surfaceAtlas:waterSurface.atlasStats,allOnAsphalt:puddles.every(p=>{const a=p.geometry.attributes.position;for(let i=0;i<a.count;i++)if(terrainFields(p.position.x+a.getX(i),p.position.z+a.getZ(i)).asphalt<.95)return false;return true;})},boxes:roadsideBoxes,forest:{...vegetationCounts,coverage:forestCoverage},condensedWindows:fireEngine.condensedWindows};}
