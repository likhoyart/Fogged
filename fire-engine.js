'use strict';
let fireEngine;
const fireEnginePosition=new THREE.Vector3(9,.025,11);
function engineDistanceGain(distance){const t=Math.max(0,Math.min(1,(20-distance)/17));return t*t*(3-2*t);}
const vehicleFogPositions=Array.from({length:4},()=>new THREE.Vector3()),vehicleFogDirections=Array.from({length:4},()=>new THREE.Vector3(0,0,-1)),vehicleFogTuning=Array.from({length:4},()=>new THREE.Vector4()),vehicleFogColors=Array.from({length:4},()=>new THREE.Vector3());
function emergencyPulse(time,side,frequency=21,speed=100){const wave=Math.sin(time*Math.PI*2*frequency/60+side*Math.PI);return Math.pow(Math.max(0,wave),2*speed/100);}
// Two complete dips in a 480 ms burst, starting every 20 seconds of active play.
function headlightPower(time){const phase=time%20;return time<20||phase>=.48?1:.20+.80*Math.pow(Math.cos(phase/.48*Math.PI*2),2);}
function splitLightbar(mesh,root){
 root.updateMatrixWorld(true);const toVehicle=new THREE.Matrix4().copy(root.matrixWorld).invert().multiply(mesh.matrixWorld),vertex=new THREE.Vector3();
 const source=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone(),parts=[];
 for(const side of [-1,1]){
  const geometry=new THREE.BufferGeometry(),attrs={};for(const [key,a] of Object.entries(source.attributes))attrs[key]=[];
  const pos=source.attributes.position;
  for(let i=0;i<pos.count;i+=3){let lateral=0;for(let j=0;j<3;j++)lateral+=vertex.fromBufferAttribute(pos,i+j).applyMatrix4(toVehicle).z;if(lateral*side<0)continue;for(const [key,a] of Object.entries(source.attributes))for(let j=0;j<3;j++)for(let c=0;c<a.itemSize;c++)attrs[key].push(a.array[(i+j)*a.itemSize+c]);}
  for(const [key,values] of Object.entries(attrs))geometry.setAttribute(key,new THREE.Float32BufferAttribute(values,source.attributes[key].itemSize));
  geometry.computeBoundingSphere();const material=new THREE.MeshStandardMaterial({color:0x850b08,emissive:0xff0903,emissiveIntensity:0,roughness:.25,metalness:.1,transparent:true,opacity:.86,depthWrite:false});
  const lens=new THREE.Mesh(geometry,material);lens.name=side<0?'emergency_left':'emergency_right';lens.matrix.copy(mesh.matrix);lens.matrix.decompose(lens.position,lens.quaternion,lens.scale);lens.userData.importedAsset=true;mesh.parent.add(lens);parts.push(lens);
 }mesh.visible=false;return parts;
}
function batchVehicle(root){
 // Bake original closed-body transforms; combine static parts by material without changing vertices.
 root.updateMatrixWorld(true);const groups=new Map(),inverse=new THREE.Matrix4().copy(root.matrixWorld).invert(),remove=[];
 root.traverse(m=>{if(!m.isMesh||!m.visible||m.userData.dynamicVehicle)return;const key=m.material.uuid;if(!groups.has(key))groups.set(key,{material:m.material,geometries:[]});groups.get(key).geometries.push(m.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,m.matrixWorld)));remove.push(m);});
 for(const m of remove)m.parent.remove(m);
 for(const group of groups.values()){
  const geometries=group.geometries.map(g=>g.index?g.toNonIndexed():g),geometry=new THREE.BufferGeometry();
  const keys=Object.keys(geometries[0].attributes).filter(k=>geometries.every(g=>g.attributes[k]));
  for(const key of keys){const size=geometries[0].attributes[key].itemSize,total=geometries.reduce((n,g)=>n+g.attributes[key].array.length,0),data=new Float32Array(total);let offset=0;for(const g of geometries){data.set(g.attributes[key].array,offset);offset+=g.attributes[key].array.length;}geometry.setAttribute(key,new THREE.BufferAttribute(data,size));}
  geometry.computeBoundingSphere();const mesh=new THREE.Mesh(geometry,group.material);mesh.name='fire_engine_material_batch';mesh.castShadow=mesh.receiveShadow=true;mesh.userData.importedAsset=true;root.add(mesh);
  for(const g of group.geometries)g.dispose();for(const g of geometries)g.dispose();
 }
}
// Condensation belongs only to cabin/body windows, never to the lamp lenses.
function isVehicleWindow(name){return /_(Glass_Driver|Glass_Passanger|Windshield|Glass_Body|Glass_Rear)/i.test(name);}
function fogVehicleWindows(root){
 let count=0;
 root.traverse(mesh=>{if(!mesh.isMesh||!isVehicleWindow(mesh.name))return;count++;
 const m=mesh.material=mesh.material.clone();m.name='condensed_vehicle_window';m.transparent=true;m.depthWrite=false;m.opacity=.9;m.roughness=.60;m.metalness=0;m.envMapIntensity=.25;mesh.castShadow=false;
 mesh.geometry.computeBoundingBox();const bounds=mesh.geometry.boundingBox,extent=bounds.getSize(new THREE.Vector3());
 // Use each window's own physical coordinates. Original UVs share a tiny atlas swatch.
 const axes=['x','y','z'].sort((a,b)=>extent[b]-extent[a]).slice(0,2),a=mesh.geometry.attributes.position,uv=[];
 for(let i=0;i<a.count;i++){const v=new THREE.Vector3().fromBufferAttribute(a,i);uv.push((v[axes[0]]-bounds.min[axes[0]])/extent[axes[0]],(v[axes[1]]-bounds.min[axes[1]])/extent[axes[1]]);}
 mesh.geometry=mesh.geometry.clone();mesh.geometry.setAttribute('condensationUV',new THREE.Float32BufferAttribute(uv,2));mesh.userData.dynamicVehicle=true;
 m.onBeforeCompile=shader=>{
 shader.vertexShader='attribute vec2 condensationUV;varying vec2 mistUV;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n mistUV=condensationUV;');
 shader.fragmentShader='varying vec2 mistUV;\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
 vec2 u=mistUV;float edge=1.-smoothstep(.02,.25,min(min(u.x,1.-u.x),min(u.y,1.-u.y)));
 float cloud=.5+.2*sin(u.x*13.+sin(u.y*17.))+.16*sin(u.y*23.-u.x*7.);
 float micro=fract(sin(dot(floor(u*vec2(240.,180.)),vec2(12.9898,78.233)))*43758.5453);
 float mist=clamp(.3+edge*.45+cloud*.2,0.,1.);
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.055,.062,.063),mist*.72);
 diffuseColor.rgb*=.96+.08*micro;diffuseColor.a=clamp(.75+mist*.25,.75,.97);`);
 // Divide both the glass contribution and transmitted cabin light by three.
 // Normal blending: C*a + background*(1-a), with a' = 1-(1-a)/3.
 shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
 float untintedAlpha=diffuseColor.a;
 diffuseColor.a=1.-(1.-untintedAlpha)/3.;
 outgoingLight*=untintedAlpha/(3.*max(diffuseColor.a,.0001));
 #include <opaque_fragment>`);
 };
 m.customProgramCacheKey=()=> 'vehicle-condensation-dark-v21';
 });return count;
}
async function prepareFireEngine(){
 const bytes=Uint8Array.from(atob(FIRE_ENGINE_ASSET),c=>c.charCodeAt(0));
 const root=(await new THREE.GLTFLoader().parseAsync(bytes.buffer,'')).scene;root.name='fairheaven_fire_engine';
 root.traverse(m=>{if(!m.isMesh)return;m.userData.importedAsset=true;m.castShadow=m.receiveShadow=true;for(const key of ['map','normalMap','roughnessMap','metalnessMap','emissiveMap'])if(m.material[key])m.material[key].anisotropy=2;if(m.material.transparent)m.material.depthWrite=false;if(m.material.emissive)m.material.emissiveIntensity=0;});
 let headlights,lightbar;root.traverse(m=>{if(m.isMesh&&m.name.includes('Headlights005'))headlights=m;if(m.isMesh&&m.name.includes('LightbarEMS')&&m.material.name.includes('Transperent'))lightbar=m;});
 if(!headlights||!lightbar)throw new Error('Missing vehicle lighting geometry');
 headlights.material=headlights.material.clone();headlights.material.emissive.set(0xffe9c4);headlights.material.emissiveMap=headlights.material.map;headlights.userData.dynamicVehicle=true;
 const condensedWindows=fogVehicleWindows(root);
 const lenses=splitLightbar(lightbar,root);for(const lens of lenses)lens.userData.dynamicVehicle=true;
 root.position.copy(fireEnginePosition);root.rotation.y=Math.PI*.75;scene.add(root);root.updateMatrixWorld(true);
 const doorBounds=[];
 // Several short blocks follow the diagonal body; an oversized square must not block its corners.
 for(let x=-2.05;x<2.1;x+=.82){const box=new THREE.Box3();for(const dx of [-.46,.46])for(const z of [-.77,.77])for(const y of [0,1.3])box.expandByPoint(root.localToWorld(new THREE.Vector3(x+dx,y,z)));colliders.push(box);}
 const lamps=[];
 for(const side of [-1,1]){const light=new THREE.SpotLight(0xffe6ba,45,17,.28,.7,2);light.position.copy(root.localToWorld(new THREE.Vector3(2.28,.67,side*.62)));light.target.position.copy(root.localToWorld(new THREE.Vector3(14,.12,side*.62)));scene.add(light,light.target);lamps.push(light);}
 const emergency=[];
 for(const lens of lenses){const light=new THREE.PointLight(0xff0802,0,9,2);new THREE.Box3().setFromObject(lens).getCenter(light.position);scene.add(light);emergency.push(light);}
 // A short visible tailpipe connects the smoke emitter to the underside of the rear bumper.
 const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.037,.037,.32,10,1,true),new THREE.MeshStandardMaterial({color:0x333638,metalness:.8,roughness:.8,side:THREE.DoubleSide}));pipe.rotation.z=Math.PI/2;pipe.position.set(-2.43,.23,.57);pipe.userData.importedAsset=true;root.add(pipe);
 const count=26,g=new THREE.BufferGeometry(),seeds=Float32Array.from({length:count},(_,i)=>i/count);g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*3),3));g.setAttribute('seed',new THREE.BufferAttribute(seeds,1));
 const smokeMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0},pixelHeight:{value:720}},vertexShader:`attribute float seed;uniform float time,pixelHeight;varying float life;varying float pattern;void main(){float a=mod(time+seed*2.8,2.8);life=a/2.8;pattern=seed;vec3 p=vec3(-2.60-a*.22,.23+a*.34,.57)+vec3(sin(a*2.+seed*51.)*.035,0.,sin(a*1.7+seed*37.)*.09);vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;gl_PointSize=min(90.,pixelHeight*(.045+a*.15)/max(.3,-view.z));}`,
 fragmentShader:`varying float life,pattern;void main(){vec2 p=gl_PointCoord-.5;float r=length(p);float edge=exp(-r*r*18.)*(1.-smoothstep(.36,.5,r));float wisps=.7+.3*sin(p.x*18.+pattern*31.)*sin(p.y*15.-pattern*23.);float alpha=edge*wisps*smoothstep(0.,.10,life)*(1.-smoothstep(.25,1.,life))*.12;gl_FragColor=vec4(.15,.16,.16,alpha);}`});
 const smoke=new THREE.Points(g,smokeMaterial);smoke.name='tailpipe_exhaust';smoke.frustumCulled=false;smoke.renderOrder=3;smoke.userData.atmosphere=true;smoke.userData.dynamicVehicle=true;root.add(smoke);
 batchVehicle(root);
 fireEngine={condensedWindows,root,headlights,lenses,lamps,emergency,smoke,doorBounds,time:0,headlightPowers:[1,1],emergencyPowers:[0,0],position:fireEnginePosition,sourceTriangles:21325};applyVehicleLightLab();
}
function applyVehicleLightLab(){
 if(!fireEngine)return;const f=fireEngine;
 for(const [kind,lights] of [['headlights',f.lamps],['emergency',f.emergency]]){const p=lightLabSettings[kind],shape=lightLabShape(kind);for(const light of lights){light.distance=p.range;if(light.isSpotLight){light.angle=shape.angle;light.penumbra=shape.penumbra;}}}
 animateFireEngine(0);
}
function animateFireEngine(dt){
 if(!fireEngine)return;const f=fireEngine;f.time+=dt;const h=lightLabSettings.headlights,e=lightLabSettings.emergency;
 for(let i=0;i<2;i++){f.headlightPowers[i]=headlightPower(f.time,0);f.lamps[i].intensity=45*f.headlightPowers[i]*h.brightness/100;f.emergencyPowers[i]=emergencyPulse(f.time,i,e.frequency,e.speed);f.lenses[i].material.emissiveIntensity=(.015+9*f.emergencyPowers[i])*e.brightness/100;f.emergency[i].intensity=18*f.emergencyPowers[i]*e.brightness/100;}
 f.headlights.material.emissiveIntensity=4*f.headlightPowers[0]*h.brightness/100;
 for(let i=0;i<4;i++){const light=i<2?f.lamps[i]:f.emergency[i-2],p=i<2?h:e,power=i<2?f.headlightPowers[i]:f.emergencyPowers[i-2];vehicleFogPositions[i].copy(light.position);if(i<2){vehicleFogDirections[i].subVectors(light.target.position,light.position).normalize();vehicleFogTuning[i].set(p.density/100,p.range,Math.cos(light.angle),Math.cos(light.angle*(1-light.penumbra)));}else{vehicleFogDirections[i].set(0,0,0);vehicleFogTuning[i].set(p.density/100,p.range,.1+p.focus*.018,p.clarity/100);}vehicleFogColors[i].set(i<2?.16:.22,i<2?.13:.003,i<2?.08:.001).multiplyScalar(power*p.brightness/100);}
 f.smoke.material.uniforms.time.value=f.time;f.smoke.material.uniforms.pixelHeight.value=target.height;
}
function fireEngineDiagnostics(){if(!fireEngine)return {ready:false};const f=fireEngine,d=camera.position.distanceTo(f.position);return {ready:true,condensedWindows:f.condensedWindows,allDoorsClosed:true,settings:{headlights:{...lightLabSettings.headlights},emergency:{...lightLabSettings.emergency}},lights:[...f.lamps,...f.emergency].map(l=>({type:l.type,position:l.position.toArray(),intensity:l.intensity,range:l.distance,angle:l.angle,penumbra:l.penumbra})),position:f.position.toArray(),doors:f.doorBounds.map(b=>({min:b.min.toArray(),max:b.max.toArray()})),lightbarParts:f.lenses.map(m=>({vertices:m.geometry.attributes.position.count,center:new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3()).toArray()})),headlights:f.headlightPowers,redBeacons:f.emergencyPowers,smokeParticles:f.smoke.geometry.attributes.position.count,distance:d,audibility:engineDistanceGain(d),engineDecoded:!!audio?.engineBuffer,loop:audio?.engineSource?.loop,gain:audio?.engineGain?.gain.value,time:f.time};}
