'use strict';
// Shared ground plan for vegetation exclusions and the unlabelled pause map.
const roadRects=[[-18,-14,36,28],[-6,-78,8,64],[18,-4,61,8],[37,12.5,32,29],[47,4,12,8.5]];
let terrainDaylight=false;
let grassCount=0,grassMaterial,grassClock={value:0};
const grassCells=[],buildingFootprints=[];let tallGrassCount=0;
let flashlightBursts=0,flashlightAge=-1,flashlightElapsed=0;
const flashlightEvents=[];let flashlightSamples=[];
function animateFlashlight(dt){
 const baseIntensity=flashlightBaseIntensity();
 flashlightElapsed+=dt;nextFlicker-=dt;
 if(nextFlicker<=0&&flashlightAge<0){nextFlicker+=60;flashlightBursts++;flashlightEvents.push(+flashlightElapsed.toFixed(3));flashlightSamples=[];flashlightAge=0;if(audio)audio.startFlashlight();}
 if(flashlightAge>=0){
  flashlightAge=audio?.electricalBuffer?audio.flashlightTime():flashlightAge+dt;
  if(flashlightAge>=ELECTRICAL_EFFECT.duration){flashlightAge=-1;lamp.intensity=baseIntensity;}
  else {const i=Math.max(0,Math.min(ELECTRICAL_EFFECT.envelope.length-1,Math.floor(flashlightAge*ELECTRICAL_EFFECT.envelopeRate)));lamp.intensity=baseIntensity*(1-.94*ELECTRICAL_EFFECT.envelope[i]);}
  if(debug&&flashlightAge>=0)flashlightSamples.push({time:+flashlightAge.toFixed(4),intensity:+lamp.intensity.toFixed(3),audioState:audio?.ctx.state});
 }else lamp.intensity=baseIntensity;
}
function distanceToRect(x,z,r){return Math.hypot(Math.max(r[0]-x,0,x-r[0]-r[2]),Math.max(r[1]-z,0,z-r[1]-r[3]));}
function prepareGrass(){
 for(const obj of townObjects.filter(o=>townLayout.some(p=>o.name==='town_'+p.id))){const b=new THREE.Box3().setFromObject(obj);buildingFootprints.push([b.min.x,b.min.z,b.max.x-b.min.x,b.max.z-b.min.z]);}
 grassMaterial=new THREE.MeshStandardMaterial({color:0xa9b88a,vertexColors:true,roughness:1,metalness:0,side:THREE.DoubleSide});
 grassMaterial.onBeforeCompile=shader=>{
  shader.uniforms.grassTime=grassClock;
  // Up-biased foliage normals keep thin, double-sided blades softly lit instead of black needles.
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\n normal=normalize(mix(normal,normalize(mat3(viewMatrix)*vec3(0.0,1.0,0.0)),.68));');
  shader.vertexShader='uniform float grassTime;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   float rootY=(.24*sin(position.x*.7*.37+sin(position.z*.7*.21))+.18*sin(position.z*.7*.49-position.x*.7*.17)+.08*sin(position.x*.7*1.73+position.z*.7*1.31))*.028;
   float h=max(0.0,position.y-rootY);
   float distanceFade=1.0-smoothstep(27.0,42.0,length(position.xz-cameraPosition.xz));
   transformed.y=rootY+h*distanceFade;
   float bend=h*h*distanceFade;
   transformed.x+=sin(grassTime*1.25+position.x*.34+position.z*.42)*bend*.10;
   transformed.z+=cos(grassTime*.85+position.x*.18)*bend*.06;
  `);
 };
 grassMaterial.customProgramCacheKey=()=> 'lawn-height-fade-v1';
 const boxGround=typeof roadsideBoxes==='undefined'?[]:roadsideBoxes.map(b=>{const c=Math.abs(Math.cos(b.angle)),s=Math.abs(Math.sin(b.angle));const w=b.w*c+b.d*s+.28,d=b.d*c+b.w*s+.28;return [b.x-w/2,b.z-d/2,w,d];});
 const cells=new Map();seed=76321;
 for(let z=-118;z<69;z+=.34/Math.SQRT2)for(let x=-109;x<110;x+=.34/Math.SQRT2){
  const px=x+rr(-.16,.16)/Math.SQRT2,pz=z+rr(-.16,.16)/Math.SQRT2;
  const bDist=Math.min(...buildingFootprints.map(r=>distanceToRect(px,pz,r)));
  const f=terrainFields(px,pz);
  // Density follows the same irregular blend as the soil, including the forest route.
  if(inCornField(px,pz)&&rnd()>.08)continue;
  if(bDist<.24||f.asphalt>.65||boxGround.some(r=>distanceToRect(px,pz,r)===0))continue;
  const growth=THREE.MathUtils.smoothstep(bDist,.3,15);
  const edge=(1-f.asphalt)*(1-f.wear);
  const boundary=THREE.MathUtils.smoothstep(Math.min(px+109,110-px,pz+118,69-pz)+(f.n-.5)*4,0,7);
  if(rnd()>1.4*(.17+.43*f.lawn)*edge*boundary)continue;
  const cellX=Math.floor(px/12),cellZ=Math.floor(pz/12),key=cellX+','+cellZ;
  if(!cells.has(key))cells.set(key,{positions:[],colors:[],indices:[],x:cellX*12+6,z:cellZ*12+6});
  const c=cells.get(key),kind=rnd();
  // Low lawn dominates; medium clumps and occasional taller stems grow farther from buildings.
  const tallPatch=!inCornField(px,pz)&&bDist>3&&f.wear<.18&&f.asphalt<.1&&terrainNoise(px*.19+11,pz*.19-7)>.65&&kind>.55;
  if(tallPatch)tallGrassCount++;
  const height=tallPatch?rr(.72,.9):(kind<.58?rr(.045,.16):kind<.90?rr(.16,.40):rr(.40,.78))*(.55+.45*growth)*(.65+.35*edge);
  const patch=terrainNoise(px*.16,pz*.16),shade=rr(.65,1),dry=rnd()<.07+.27*patch,baseY=(terrainNoise(px*.7,pz*.7)-.5)*.028;
  grassCount++;
  for(let blade=0;blade<3;blade++){
   const ox=px+rr(-.10,.10),oz=pz+rr(-.10,.10),angle=rr(0,Math.PI),dx=Math.cos(angle),dz=Math.sin(angle),width=kind<.58?rr(.006,.012):kind<.90?rr(.012,.024):rr(.004,.009),lean=rr(-.38,.38)*height,h=height*(tallPatch?rr(.85,1.10):rr(.7,1.2)),n=c.positions.length/3;
   c.positions.push(ox-dx*width,baseY,oz-dz*width,ox+dx*width,baseY,oz+dz*width,ox-dx*width*.48+lean,baseY+h*.55,oz-dz*width*.48,ox+dx*width*.48+lean,baseY+h*.55,oz+dz*width*.48,ox+lean*2,baseY+h,oz+.035);
   for(const tone of [.42,.42,.8,.8,1])c.colors.push(shade*tone*(dry?1.08:.84),shade*tone,shade*tone*(dry?.7:.62));
   c.indices.push(n,n+1,n+2,n+1,n+3,n+2,n+2,n+3,n+4);
  }
 }
 for(const c of cells.values()){
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(c.positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(c.colors,3));g.setIndex(c.indices);g.computeVertexNormals();g.computeBoundingSphere();g.boundingSphere.radius+=.3;
  const mesh=new THREE.Mesh(g,grassMaterial);mesh.receiveShadow=true;mesh.castShadow=false;mesh.userData.atmosphere=true;scene.add(mesh);const low=new THREE.BufferGeometry();low.attributes=g.attributes;low.boundingSphere=g.boundingSphere.clone();const simple=[];for(let n=0;n<g.attributes.position.count;n+=5)simple.push(n,n+1,n+4);low.setIndex(simple);grassCells.push({mesh,highGeometry:g,lowGeometry:low,lod:false,x:c.x,z:c.z});
 }
}
function animateGrass(time){grassClock.value=time;for(const c of grassCells){const sphere=c.highGeometry.boundingSphere,d=Math.hypot(sphere.center.x-camera.position.x,sphere.center.z-camera.position.z),near=d-sphere.radius;c.mesh.visible=near<42;const low=near>(c.lod?16:18);if(low!==c.lod){c.lod=low;c.mesh.geometry=low?c.lowGeometry:c.highGeometry;}}}
function preparePauseMap(){
 const svg=$('town-map'),ns='http://www.w3.org/2000/svg';
 const make=(tag,attrs,parent=svg)=>{const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);parent.append(e);return e;};
 // No labels, tiles or backdrop: white geometry over the paused game.
 make('rect',{x:cornField.minX,y:cornField.minZ,width:cornField.maxX-cornField.minX,height:cornField.maxZ-cornField.minZ,fill:'white','fill-opacity':'.045',stroke:'white','stroke-width':'.6',opacity:'.4'});
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
 button('Terrain daylight check',()=>{terrainDaylight=!terrainDaylight;skyLight.intensity=terrainDaylight?1.3:.14;skyKey.intensity=terrainDaylight?2:.19;lockError();});
 button('Jump once',()=>{lockError();jumpRequested=true;});
 button('Preview flashlight',()=>{lockError();nextFlicker=.1;});
 button('Hold beacon across trees',()=>{debugHoldBeacon=!debugHoldBeacon;if(debugHoldBeacon){weatherTime=0;camera.position.set(-12,1.7,-18);feet=0;yaw=.675;pitch=.83;camera.rotation.set(pitch,yaw,0,'YXZ');}lockError();});
 button('Preview thunder',()=>{lockError();stormDelay=.15;});
 button('Finish current track',()=>{const a=music.decks?.[music.index]?.audio;if(a&&Number.isFinite(a.duration))a.currentTime=a.duration-6.2;});
 const report=document.createElement('pre');report.id='playtest-report';report.style.cssText='font-size:12px;white-space:pre-wrap';root.append(report);
 button('Check scene and audio',()=>{
  const issues=[];const check=(ok,label)=>{if(!ok)issues.push(label);};
  const propCounts=streetPropDiagnostics().counts;check(propCounts.manhole===6&&propCounts.barrier===3&&propCounts.stump===8&&propCounts.trunk===4&&propCounts.gate===1&&propCounts['broken-bicycle']===1&&streetPropFences.length===2,'Approved street objects');
  check(fireEngine?.doorBounds.length===0&&fireEngine.smoke.geometry.attributes.position.count===26,'Fire engine doors and exhaust');
  check(['asphalt','ground'].every(s=>audio?.stepBuffers[s]?.length===6)&&!audio?.stepBuffers.grass,'Grass uses ground footsteps');
  check(audio?.engineBuffer?.duration>7&&audio?.engineSource?.loop,'Looping engine audio');
  check(streetLightSources.length===lampPositions.length&&streetLightSources.every(s=>s.base>0&&s.light.isSpotLight),'All lanterns');
  check(streetLightSources.every(s=>s.fixture.children.filter(m=>m.isMesh).every(m=>!m.material.transparent&&m.material.depthWrite)&&s.bulb.geometry.attributes.position.count>0),'Opaque poles and glowing bulbs');
  check(treeObjects.every(g=>Math.abs(g.userData.grounding?.gap+.075)<.001),'Trees rooted in terrain');
  check(vegetationCounts.border===vegetationCounts.baseBorder*2&&vegetationCounts.forest===vegetationCounts.baseForest*3,'Vegetation density and clear paths');
  check(grassCount>250000&&grassCells.every(c=>c.mesh.geometry.boundingSphere.radius>0),'Grass geometry');
  check(Object.keys(terrainTextures).length===3&&Object.values(terrainTextures).every(m=>m.map.image.width===1024&&m.normalMap.image.width===1024),'Six terrain maps');
  check(terrainMesh?.geometry.parameters.width===480,'Continuous ground');
  check(buildingFootprints.length===townLayout.length,'Map footprints');
  check(!document.querySelector('#town-map text'),'No map text');
  check(!document.getElementById('breathVolume')&&!audio?.buses.breath,'Breathing removed');
  check(rainDrops.length===960&&rainLines.geometry.drawRange.count===Math.round(320*lightLabSettings.rain.density/100)*2,'Double rain');
  check(streetLightSources.every(s=>s.light.isSpotLight&&s.light.target.position.y<s.light.position.y),'Downward streetlights');
  check(streetFogPositions.length===10&&streetLightSources.every((s,i)=>s.light.position.equals(streetFogPositions[i])),'Fixed volumetric origins');
  check(lightLabDiagnostics().matched,'Live light controls');check(!townObjects.some(o=>['town_02','town_03'].includes(o.name)),'Both damaged houses removed');check(!document.getElementById('coughVolume'),'No cough control');check(audio?.electricalBuffer?.duration>0,'Stock crackle decoded');
  check(stationLights.length===4&&stationLights.every(s=>s.light.isSpotLight&&s.fixture.name.startsWith('station_gate_led_'))&&stationLights[0].group===stationLights[1].group&&stationLights[2].group===stationLights[3].group&&stationLights[0].group!==stationLights[2].group,'Four grouped LED gate lights');
  check(camera.far===120&&post.uniforms.far.value===120,'Distant lighthouse visibility');
  check(renderer.info.programs.every(p=>p.diagnostics?.runnable!==false),'Shader programs');
  check(music.decks?.length===4&&music.decks.every(d=>Number.isFinite(d.audio.duration)&&!d.audio.error),'Four decoded tracks');
  if(audio)for(const name of Object.keys(audio.buses))check(Math.abs(audio.buses[name].gain.value-+$(name+'Volume').value)<.01,name+' volume');
  report.textContent=(issues.length?(I18n.language==='en'?'FAIL: ':'ОШИБКИ: ')+issues.map(x=>I18n.translate(x)).join(', '):I18n.translate('PASS: scene, map, lights, grass, shaders, four tracks, mixer'))+'\n'+JSON.stringify({buildingUpdates:{warehouse:warehouseBounds?.getSize(new THREE.Vector3()).toArray(),stationWindowBounds:stationReflection.windowBounds.map(b=>({min:b.min.toArray(),max:b.max.toArray()})),reflectionFrames:stationReflection.frames,tallGrassCount},storm:{...lightLabSettings.storm,flash:stormFlashAt(stormAge,lightLabSettings.storm)},streetProps:streetPropDiagnostics(),worldDetails:worldDetailDiagnostics(),footsteps:{surface:footstepSurface(camera.position.x,camera.position.z,audio?.lastSurface),decoded:Object.fromEntries(Object.entries(audio?.stepBuffers||{}).map(([k,v])=>[k,v.length])),counts:audio?.stepCounts,history:audio?.stepHistory},fireEngine:fireEngineDiagnostics(),vegetation:{...vegetationCounts,batches:treeBatches.length},graphics:{fogBuffer:[fogTarget.width,fogTarget.height],visibleTreeInstances:visibleTreeBatches.reduce((n,b)=>n+b.main.count,0),shadowTreeInstances:treeBatches.reduce((n,b)=>n+b.count,0),filmGrain:sceneLabSettings.grain,vignette:sceneLabSettings.vignette,analyticHeightFog:true,coneClippedTorch:true,beaconShadowFilter:'16 comparisons, bilinear PCF',beaconHeld:debugHoldBeacon,beaconShadowSize:beaconLight.shadow.mapSize.toArray(),beaconNormalBias:beaconLight.shadow.normalBias,beaconEmitterPosition:beaconOrigin.toArray(),removedBlueHouse:!townObjects.some(o=>o.name==='town_03'),roadFrostPatches:0,foliageAlphaTests:[...new Set(treeObjects.flatMap(g=>g.children.filter(m=>/foliage|twig/.test(m.material.name)).map(m=>m.material.alphaTest)))]},lightLab:lightLabDiagnostics(),music:music.state,tracks:music.decks?.map((d,i)=>({title:music.tracks[i].title,duration:Math.round(d.audio.duration),time:Math.round(d.audio.currentTime),paused:d.audio.paused})),nextFlicker:Math.ceil(nextFlicker),flashlightBursts,flashlightEvents,flashlightElapsed:+flashlightElapsed.toFixed(3),flashlightSampleCount:flashlightSamples.length,flashlightIntensityRange:flashlightSamples.length?[Math.min(...flashlightSamples.map(s=>s.intensity)),Math.max(...flashlightSamples.map(s=>s.intensity))]:[],stockDuration:audio?.electricalBuffer?.duration,stockAudioState:audio?.ctx.state,walkCheck,buildings:buildingFootprints.length,breathingRemoved:!document.getElementById('breathVolume'),lamps:streetLightSources.length,volumetricOrigins:streetFogPositions.map(v=>v.toArray()),rainDrops:rainDrops.length,penumbra:{flashlight:lamp.penumbra},streetType:'wide downward spotlights',stationFlickerFrames,stationMinimumPower,stationSyncError,stationLights:stationLights.map(s=>({position:s.light.position.toArray(),power:s.power,group:s.group,type:s.light.type})),beacon:{angle:beaconLight.angle,intensity:beaconLight.intensity,position:beaconOrigin.toArray(),cameraFar:camera.far},treeGrounding:treeObjects.map(g=>({kind:g.name,...g.userData.grounding})),streetBulbs:streetLightSources.map(s=>({vertices:s.bulb.geometry.attributes.position.count,emissive:s.bulb.material.emissiveIntensity,position:s.position.toArray()})),terrain:{maps:Object.keys(terrainTextures),size:[480,420],fade:[27,42]},grass:grassCount,resolution:[target.width,target.height]},null,2);
 });
}
