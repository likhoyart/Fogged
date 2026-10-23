'use strict';
// Shared ground plan for vegetation exclusions and the unlabelled pause map.
const roadRects=[[-18,-14,36,28],[-6,-78,8,64],[18,-4,61,8],[37,12.5,32,29],[47,4,12,8.5]];
let grassCount=0,grassMaterial,grassClock={value:0};
const grassCells=[],buildingFootprints=[];
let flashlightBursts=0,flashlightAge=-1,flashlightElapsed=0;
const flashlightEvents=[];let flashlightSamples=[];
function animateFlashlight(dt){
 flashlightElapsed+=dt;nextFlicker-=dt;
 if(nextFlicker<=0&&flashlightAge<0){nextFlicker+=60;flashlightBursts++;flashlightEvents.push(+flashlightElapsed.toFixed(3));flashlightSamples=[];flashlightAge=0;if(audio)audio.startFlashlight();}
 if(flashlightAge>=0){
  flashlightAge=audio?.electricalBuffer?audio.flashlightTime():flashlightAge+dt;
  if(flashlightAge>=ELECTRICAL_EFFECT.duration){flashlightAge=-1;lamp.intensity=72;}
  else {const i=Math.max(0,Math.min(ELECTRICAL_EFFECT.envelope.length-1,Math.floor(flashlightAge*ELECTRICAL_EFFECT.envelopeRate)));lamp.intensity=72*(1-.94*ELECTRICAL_EFFECT.envelope[i]);}
  if(debug&&flashlightAge>=0)flashlightSamples.push({time:+flashlightAge.toFixed(4),intensity:+lamp.intensity.toFixed(3),audioState:audio?.ctx.state});
 }else lamp.intensity=72;
}
function distanceToRect(x,z,r){return Math.hypot(Math.max(r[0]-x,0,x-r[0]-r[2]),Math.max(r[1]-z,0,z-r[1]-r[3]));}
function prepareGrass(){
 for(const obj of townObjects.filter(o=>townLayout.some(p=>o.name==='town_'+p.id))){const b=new THREE.Box3().setFromObject(obj);buildingFootprints.push([b.min.x,b.min.z,b.max.x-b.min.x,b.max.z-b.min.z]);}
 grassMaterial=new THREE.MeshStandardMaterial({color:0x737d57,vertexColors:true,roughness:1,metalness:0,side:THREE.DoubleSide});
 grassMaterial.onBeforeCompile=shader=>{shader.uniforms.grassTime=grassClock;shader.vertexShader='uniform float grassTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n float bend=position.y*position.y;transformed.x+=sin(grassTime*1.25+position.x*.34+position.z*.42)*bend*.10;transformed.z+=cos(grassTime*.85+position.x*.18)*bend*.06;');};
 const cells=new Map();seed=76321;
 for(let z=-102;z<53;z+=.42)for(let x=-93;x<94;x+=.42){
  const px=x+rr(-.19,.19),pz=z+rr(-.19,.19);
  const bDist=Math.min(...buildingFootprints.map(r=>distanceToRect(px,pz,r)));
  const rDist=Math.min(...roadRects.map(r=>distanceToRect(px,pz,r)));
  // Keep the forest route, lighthouse clearing and paved surfaces walkable.
  const path=pz-(px+40)*.65;
  if(bDist<.24||rDist<.22||(px<-25&&px>-81&&Math.abs(path)<2)||Math.hypot(px+77,pz+28)<5)continue;
  const growth=THREE.MathUtils.smoothstep(bDist,.3,15);
  const edge=THREE.MathUtils.smoothstep(rDist,.2,2.5);
  if(rnd()>(.12+growth*.63)*(.55+.45*edge))continue;
  const cellX=Math.floor(px/12),cellZ=Math.floor(pz/12),key=cellX+','+cellZ;
  if(!cells.has(key))cells.set(key,{positions:[],colors:[],indices:[],x:cellX*12+6,z:cellZ*12+6});
  const c=cells.get(key),height=(.13+growth*.63)*rr(.65,1.25)*(.7+.3*edge),shade=rr(.52,.95);
  grassCount++;
  for(let blade=0;blade<5;blade++){
   const ox=px+rr(-.10,.10),oz=pz+rr(-.10,.10),angle=rr(0,Math.PI),dx=Math.cos(angle),dz=Math.sin(angle),width=rr(.018,.035),lean=rr(-.14,.14),h=height*rr(.7,1.2),n=c.positions.length/3;
   c.positions.push(ox-dx*width,.025,oz-dz*width,ox+dx*width,.025,oz+dz*width,ox-dx*width*.48+lean,h*.55,oz-dz*width*.48,ox+dx*width*.48+lean,h*.55,oz+dz*width*.48,ox+lean*2,h,oz+.035);
   for(const tone of [.42,.42,.8,.8,1])c.colors.push(shade*tone,shade*tone*.99,shade*tone*.72);
   c.indices.push(n,n+1,n+2,n+1,n+3,n+2,n+2,n+3,n+4);
  }
  // Secondary lawn layer: short, dense blades only where the taller grass already exists.
  for(let blade=0;blade<3;blade++){
   const ox=px+rr(-.18,.18),oz=pz+rr(-.18,.18),angle=rr(0,Math.PI),dx=Math.cos(angle),dz=Math.sin(angle),width=rr(.026,.046),h=rr(.07,.15)*(.75+.25*edge),lean=rr(-.025,.025),n=c.positions.length/3;
   c.positions.push(ox-dx*width,.018,oz-dz*width,ox+dx*width,.018,oz+dz*width,ox-dx*width*.42+lean,h*.58,oz-dz*width*.42,ox+dx*width*.42+lean,h*.58,oz+dz*width*.42,ox+lean*1.4,h,oz+.018);
   for(const tone of [.34,.34,.58,.58,.72])c.colors.push(shade*tone*.88,shade*tone*.98,shade*tone*.66);
   c.indices.push(n,n+1,n+2,n+1,n+3,n+2,n+2,n+3,n+4);
  }
 }
 for(const c of cells.values()){
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(c.positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(c.colors,3));g.setIndex(c.indices);g.computeVertexNormals();g.computeBoundingSphere();
  const mesh=new THREE.Mesh(g,grassMaterial);mesh.receiveShadow=true;mesh.castShadow=false;mesh.userData.atmosphere=true;scene.add(mesh);grassCells.push({mesh,x:c.x,z:c.z});
 }
}
function animateGrass(time){grassClock.value=time;for(const c of grassCells)c.mesh.visible=Math.hypot(c.x-camera.position.x,c.z-camera.position.z)<43;}
function preparePauseMap(){
 const svg=$('town-map'),ns='http://www.w3.org/2000/svg';
 const make=(tag,attrs,parent=svg)=>{const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);parent.append(e);return e;};
 // No labels, tiles or backdrop: white geometry over the paused game.
 for(const r of roadRects)make('rect',{x:r[0],y:r[1],width:r[2],height:r[3],fill:'white',opacity:'.085'});
 const edges=[[-6,-78,-6,-14],[2,-78,2,-14],[-18,-14,-6,-14],[2,-14,18,-14],[18,-14,18,-4],[18,-4,79,-4],[79,-4,79,4],[79,4,59,4],[47,4,18,4],[18,4,18,14],[18,14,-18,14],[-18,14,-18,-14],[37,12.5,47,12.5],[59,12.5,69,12.5],[37,12.5,37,41.5],[37,41.5,69,41.5],[69,41.5,69,12.5]];
 for(const e of edges)make('line',{x1:e[0],y1:e[1],x2:e[2],y2:e[3],stroke:'white','stroke-width':1,opacity:'.32'});
 for(const r of buildingFootprints)make('rect',{x:r[0],y:r[1],width:r[2],height:r[3],rx:'.35',fill:'white','fill-opacity':'.12',stroke:'white','stroke-width':1.1,opacity:'.8'});
 for(const t of treeObjects)make('circle',{cx:t.position.x,cy:t.position.z,r:1.7,fill:'none',stroke:'white','stroke-width':'.7',opacity:'.22'});
 make('path',{d:'M -40 0 L -77 -24',fill:'none',stroke:'white','stroke-width':1,'stroke-dasharray':'2 4',opacity:'.3'});
 const marker=make('g',{id:'map-player'});make('circle',{r:4.4,fill:'none',stroke:'white',opacity:'.25'},marker);make('path',{d:'M 0 -3.4 L 2.1 2.5 L 0 1.2 L -2.1 2.5 Z',fill:'white'},marker);
 updatePauseMap();
}
function updatePauseMap(){const m=document.getElementById('map-player');if(m)m.setAttribute('transform',`translate(${camera.position.x} ${camera.position.z}) rotate(${-yaw*180/Math.PI})`);}

function preparePlaytest(){
 const root=document.createElement('details');root.id='playtest';root.innerHTML='<summary>Playtest tools</summary>';document.querySelector('.options').append(root);
 const button=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;root.append(b);};
 const lightSignature=()=>JSON.stringify(streetLightSources.map(s=>[s.light.position.toArray(),s.light.intensity,s.light.distance,s.bulbMaterials.map(m=>m.emissiveIntensity)]));
 let walkCheck=null;
 button('Walk forward for 3 seconds',()=>{const before=lightSignature(),from=camera.position.clone();lockError();keys.add('KeyW');setTimeout(()=>{keys.delete('KeyW');walkCheck={fixedLights:before===lightSignature(),distance:+from.distanceTo(camera.position).toFixed(3)};},3000);});
 button('Jump once',()=>{lockError();jumpRequested=true;});
 button('Preview flashlight',()=>{lockError();nextFlicker=.1;});
 button('Preview thunder',()=>{lockError();stormDelay=.15;});
 button('Finish current track',()=>{const a=music.decks?.[music.index]?.audio;if(a&&Number.isFinite(a.duration))a.currentTime=a.duration-6.2;});
 const report=document.createElement('pre');report.id='playtest-report';report.style.cssText='font-size:12px;white-space:pre-wrap';root.append(report);
 button('Check scene and audio',()=>{
  const issues=[];const check=(ok,label)=>{if(!ok)issues.push(label);};
  check(streetLightSources.length===lampPositions.length&&streetLightSources.every(s=>s.base>0&&s.light.isPointLight),'All lanterns');
  check(grassCount>50000&&grassCells.every(c=>c.mesh.geometry.boundingSphere.radius>0),'Grass geometry');
  check(buildingFootprints.length===townLayout.length,'Map footprints');
  check(!document.querySelector('#town-map text'),'No map text');
  check(!document.getElementById('breathVolume')&&!audio?.buses.breath,'Breathing removed');
  check(rainDrops.length===320&&rainLines.geometry.attributes.position.count===640,'Double rain');
  check(lamp.penumbra===.30&&streetLightSources.every(s=>s.light.isPointLight),'Soft light edges and diffuse streetlights');
  check(streetFogPositions.length===10&&streetLightSources.every((s,i)=>s.light.position.equals(streetFogPositions[i])),'Fixed volumetric origins');
  check(beaconLight.angle===.1475&&beaconLight.intensity===109000&&lamp.angle===.16&&lamp.intensity<=72,'Narrow brighter beams');check(!townObjects.some(o=>o.name==='town_02')&&!townObjects.some(o=>o.name==='town_05A'),'Removed problem buildings');check(!document.getElementById('coughVolume'),'No cough control');check(audio?.electricalBuffer?.duration>0,'Stock crackle decoded');
  check(stationLights.length===4&&stationLights.every(s=>s.light.isSpotLight&&s.fixture.name.startsWith('station_gate_led_'))&&stationLights[0].group===stationLights[1].group&&stationLights[2].group===stationLights[3].group&&stationLights[0].group!==stationLights[2].group,'Four grouped LED gate lights');
  check(camera.far===120&&post.uniforms.far.value===120,'Distant lighthouse visibility');
  check(renderer.info.programs.every(p=>p.diagnostics?.runnable!==false),'Shader programs');
  check(music.decks?.length===4&&music.decks.every(d=>Number.isFinite(d.audio.duration)&&!d.audio.error),'Four decoded tracks');
  if(audio)for(const name of Object.keys(audio.buses))check(Math.abs(audio.buses[name].gain.value-+$(name+'Volume').value)<.01,name+' volume');
  report.textContent=(issues.length?'FAIL: '+issues.join(', '):'PASS: scene, map, lights, grass, shaders, four tracks, mixer')+'\n'+JSON.stringify({music:music.state,tracks:music.decks?.map((d,i)=>({title:music.tracks[i].title,duration:Math.round(d.audio.duration),time:Math.round(d.audio.currentTime),paused:d.audio.paused})),nextFlicker:Math.ceil(nextFlicker),flashlightBursts,flashlightEvents,flashlightElapsed:+flashlightElapsed.toFixed(3),flashlightSampleCount:flashlightSamples.length,flashlightIntensityRange:flashlightSamples.length?[Math.min(...flashlightSamples.map(s=>s.intensity)),Math.max(...flashlightSamples.map(s=>s.intensity))]:[],stockDuration:audio?.electricalBuffer?.duration,stockAudioState:audio?.ctx.state,walkCheck,buildings:buildingFootprints.length,breathingRemoved:!document.getElementById('breathVolume'),lamps:streetLightSources.length,volumetricOrigins:streetFogPositions.map(v=>v.toArray()),rainDrops:rainDrops.length,penumbra:{flashlight:lamp.penumbra},streetType:'diffuse point lights',stationFlickerFrames,stationMinimumPower,stationSyncError,stationLights:stationLights.map(s=>({position:s.light.position.toArray(),power:s.power,group:s.group,type:s.light.type})),beacon:{angle:beaconLight.angle,intensity:beaconLight.intensity,position:beaconOrigin.toArray(),cameraFar:camera.far},grass:grassCount,resolution:[target.width,target.height]},null,2);
 });
}
