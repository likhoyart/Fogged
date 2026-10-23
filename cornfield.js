'use strict';
// Corn old — DisoftGD / Frice, CC BY-NC 4.0. Original 545-triangle silhouette retained.
const cornField={minX:21,maxX:91,minZ:-99,maxZ:-34,rows:.88,spacing:.72};
const cornCells=[],cornClock={value:0};let cornTemplate,cornCount=0,cornLast=null,cornSound=null;
function inCornField(x,z,margin=0){return x>cornField.minX-margin&&x<cornField.maxX+margin&&z>cornField.minZ-margin&&z<cornField.maxZ+margin;}
function clearCornFieldTrees(){
 for(let i=treeObjects.length-1;i>=0;i--){const g=treeObjects[i],r=g.userData.grounding.rootXZ;if(!inCornField(r[0],r[1],1.5))continue;
  const ci=colliders.findIndex(b=>Math.abs((b.min.x+b.max.x)/2-r[0])<.001&&Math.abs((b.min.z+b.max.z)/2-r[1])<.001&&Math.abs(b.max.x-b.min.x-.7)<.001);
  if(ci>=0)colliders.splice(ci,1);scene.remove(g);treeObjects.splice(i,1);const ti=townObjects.indexOf(g);if(ti>=0)townObjects.splice(ti,1);
 }
}
async function loadCorn(){
 const source=(await new THREE.GLTFLoader().parseAsync(JSON.stringify(CORN_MODEL),'')).scene;
 cornTemplate=mergeImported(source);const height=new THREE.Box3().setFromObject(cornTemplate).getSize(new THREE.Vector3()).y;
 // The source has 21 separate leaf/stem meshes sharing one material. Merge buffers without removing a triangle.
 const parts=cornTemplate.children.map(m=>m.geometry.index?m.geometry.toNonIndexed():m.geometry),merged=new THREE.BufferGeometry();
 for(const name of ['position','normal','uv']){const size=name==='uv'?2:3,total=parts.reduce((n,g)=>n+g.attributes[name].array.length,0),data=new Float32Array(total);let offset=0;for(const g of parts){data.set(g.attributes[name].array,offset);offset+=g.attributes[name].array.length;}merged.setAttribute(name,new THREE.BufferAttribute(data,size));}
 merged.setIndex(Array.from({length:merged.attributes.position.count},(_,i)=>i));merged.scale(1/height,1/height,1/height);merged.computeBoundingSphere();
 const material=cornTemplate.children[0].material;cornTemplate=new THREE.Group();cornTemplate.add(new THREE.Mesh(merged,material));
}
function cornSpring(p,dx,dz,distance,dt){
 const touch=Math.max(0,1-distance/.95),inv=distance>.01?1/distance:0;
 const tx=dx*inv*touch*.48,tz=dz*inv*touch*.48;
 // Critically damped recovery; contact does not teleport a stalk into a new pose.
 const k=55,damping=14;p.vx+=(k*(tx-p.bx)-damping*p.vx)*dt;p.vz+=(k*(tz-p.bz)-damping*p.vz)*dt;p.bx+=p.vx*dt;p.bz+=p.vz*dt;return touch;
}
// Exact interpolation on the existing 2 m terrain triangles, avoiding thousands of full-mesh raycasts.
function cornGroundHeight(x,z){
 const u=(x+240)/2,v=(z+235)/2,ix=Math.floor(u),iz=Math.floor(v),fx=u-ix,fz=v-iz;
 const a=terrainMesh.geometry.attributes.position,i=iz*241+ix;
 return fx+fz<=1?a.getY(i)*(1-fx-fz)+a.getY(i+1)*fx+a.getY(i+241)*fz:a.getY(i+242)*(fx+fz-1)+a.getY(i+1)*(1-fz)+a.getY(i+241)*(1-fx);
}
function prepareCorn(){
 let state=629731;const rand=()=>{state=(1664525*state+1013904223)>>>0;return state/4294967296;};const groups=new Map();
 for(let x=cornField.minX+.45;x<cornField.maxX-.4;x+=cornField.rows)for(let z=cornField.minZ+.4;z<cornField.maxZ-.4;z+=cornField.spacing){
  if(rand()<.018)continue;const px=x+(rand()-.5)*.15,pz=z+(rand()-.5)*.22,height=2.2+rand()*.6,yaw=rand()*Math.PI*2;
  const key=Math.floor(px/10)+','+Math.floor(pz/10);if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push({x:px,z:pz,height,yaw,bx:0,bz:0,vx:0,vz:0});cornCount++;
 }
 for(const plants of groups.values()){
  const materialMeshes=[];const bend=new THREE.InstancedBufferAttribute(new Float32Array(plants.length*2),2);bend.setUsage(THREE.DynamicDrawUsage);
  for(const template of cornTemplate.children){
   const geo=template.geometry.clone();geo.setAttribute('cornBend',bend);const mat=template.material.clone();mat.side=THREE.DoubleSide;mat.roughness=1;mat.metalness=0;mat.envMapIntensity=.1;
   mat.onBeforeCompile=shader=>{shader.uniforms.cornTime=cornClock;shader.vertexShader='attribute vec2 cornBend; uniform float cornTime;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
     float stalkWeight=pow(clamp(position.y,0.0,1.0),2.0);
     float phase=instanceMatrix[3].x*.37+instanceMatrix[3].z*.21;
     transformed.xz+=(cornBend+vec2(sin(cornTime*1.1+phase),cos(cornTime*.83+phase))*.014)*stalkWeight;
    `);};mat.customProgramCacheKey=()=> 'corn-contact-v29';
   const mesh=new THREE.InstancedMesh(geo,mat,plants.length),dummy=new THREE.Object3D();
   plants.forEach((p,i)=>{dummy.position.set(p.x,cornGroundHeight(p.x,p.z)-.015,p.z);dummy.rotation.set(0,p.yaw,0);dummy.scale.setScalar(p.height);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
   mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.boundingSphere.radius+=1.5;mesh.castShadow=false;mesh.receiveShadow=true;mesh.userData.atmosphere=true;mesh.name='corn_field_cell';scene.add(mesh);materialMeshes.push(mesh);
  }
  const sphere=materialMeshes[0].boundingSphere;cornCells.push({plants,bend,meshes:materialMeshes,x:sphere.center.x,z:sphere.center.z,r:sphere.radius});
 }
}
function updateCornRustle(contact,speed,time){
 if(!audio)return;const a=audio.ctx;
 if(!cornSound){const source=a.createBufferSource(),high=a.createBiquadFilter(),low=a.createBiquadFilter(),gain=a.createGain();source.buffer=audio.noise;source.loop=true;high.type='highpass';high.frequency.value=1250;low.type='lowpass';low.frequency.value=6500;gain.gain.value=0;source.connect(high);high.connect(low);low.connect(gain);gain.connect(audio.buses.steps);source.start();cornSound={gain,high};}
 const value=active?Math.min(1,contact)*Math.min(1,speed/1.8)*.17*(.7+.3*Math.sin(time*23)**2):0;
 cornSound.gain.gain.setTargetAtTime(value,a.currentTime,value>0?.035:.12);cornSound.high.frequency.setTargetAtTime(1100+Math.min(speed,4)*250,a.currentTime,.08);
}
function animateCorn(dt,time){
 cornClock.value=time;const x=camera.position.x,z=camera.position.z;let speed=cornLast&&dt>0?Math.hypot(x-cornLast.x,z-cornLast.z)/dt:0;if(speed>10)speed=0;cornLast={x,z};let contact=0;
 for(const cell of cornCells){const distance=Math.hypot(x-cell.x,z-cell.z);for(const m of cell.meshes)m.visible=distance-cell.r<43;
  if(dt<=0||(distance-cell.r>4&&!cell.disturbed))continue;let dirty=false;cell.disturbed=false;
  cell.plants.forEach((p,i)=>{const dx=p.x-x,dz=p.z-z,d=Math.hypot(dx,dz);if(d>1&&Math.abs(p.bx)+Math.abs(p.bz)+Math.abs(p.vx)+Math.abs(p.vz)<.0001)return;
   contact=Math.max(contact,cornSpring(p,dx,dz,d,dt));const c=Math.cos(p.yaw),s=Math.sin(p.yaw);cell.bend.setXY(i,c*p.bx-s*p.bz,s*p.bx+c*p.bz);dirty=true;if(Math.abs(p.bx)+Math.abs(p.bz)+Math.abs(p.vx)+Math.abs(p.vz)>.0001)cell.disturbed=true;
  });if(dirty)cell.bend.needsUpdate=true;
 }
 updateCornRustle(contact,speed,time);
}
function prepareCornCheck(){
 const button=document.createElement('button');button.textContent='Cornfield: technical check';button.id='corn-check';const result=document.createElement('output');result.id='corn-check-result';
 button.onclick=()=>{try{
  let bad=0,blockedPoints=0;for(let x=22;x<91;x+=2)for(let z=-98;z<-34;z+=2)if(blocked(x,z))blockedPoints++;
  for(const c of cornCells)for(const p of c.plants)if(!Number.isFinite(p.height+p.x+p.z)||!inCornField(p.x,p.z))bad++;
  const spring={bx:0,bz:0,vx:0,vz:0};for(let i=0;i<60;i++)cornSpring(spring,.2,0,.2,1/60);const bent=spring.bx;for(let i=0;i<240;i++)cornSpring(spring,3,0,3,1/60);
  const roots=treeObjects.filter(t=>inCornField(...t.userData.grounding.rootXZ)).length;
  result.textContent=JSON.stringify({pass:!bad&&!blockedPoints&&!roots&&bent>.3&&Math.abs(spring.bx)<.001,stalks:cornCount,cells:cornCells.length,invalid:bad,blockedPoints,treesInField:roots,bent,recovered:spring.bx,trianglesPerStalk:cornTemplate.children.reduce((s,m)=>s+m.geometry.index.count/3,0)});
 }catch(e){result.textContent='FAIL '+e.message;}};document.getElementById('light-lab-body').append(button,result);
}
