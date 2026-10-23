'use strict';
// Weather is driven by game time. One physical beacon light, one shadow map;
// its matching fog cone uses the SAME origin, direction and shadow projection.
let beaconLight,beaconLens,rainLines,rainGlassTexture;
const beaconOrigin=new THREE.Vector3(),beaconDirection=new THREE.Vector3(1,-.04,0).normalize();
const beaconMatrix=new THREE.Matrix4(),rainDrops=[],glassDrops=[];
const glassWidth=768,glassHeight=432,glassPixels=new Uint8Array(glassWidth*glassHeight*4),glassHeights=new Float32Array(glassWidth*glassHeight);
const glassNeutral=new Uint8Array(glassPixels.length);for(let i=0;i<glassNeutral.length;i+=4){glassNeutral[i]=glassNeutral[i+1]=128;}
let debugHoldBeacon=false;
let glassTick=0,weatherTime=0,stormDelay=18,stormAge=10,thunderDelay=-1;
function prepareWeather(){
 const tower=townObjects.find(o=>o.name==='town_09');
 if(!tower)throw new Error('Lighthouse model is missing');
 // Attach the light to the actual optical element, not an estimate from roof height.
 let opticalMesh;tower.traverse(o=>{if(o.isMesh&&o.material.name==='LIGHT')opticalMesh=o;});
 if(!opticalMesh)throw new Error('Lighthouse optical element is missing');
 tower.updateWorldMatrix(true,true);new THREE.Box3().setFromObject(opticalMesh).getCenter(beaconOrigin);
 beaconLight=new THREE.SpotLight(0xffd39b,54500,210,.1475,.45,2);
 beaconLight.position.copy(beaconOrigin);beaconLight.castShadow=true;
 beaconLight.shadow.mapSize.set(2048,2048);beaconLight.shadow.camera.near=2;beaconLight.shadow.camera.far=210;
 beaconLight.shadow.bias=-.000035;beaconLight.shadow.normalBias=.025;
 scene.add(beaconLight,beaconLight.target);
 beaconLens=opticalMesh;beaconLens.material=new THREE.MeshBasicMaterial({color:0xfff1c8,toneMapped:false});beaconLens.material.color.setRGB(4.,2.65,1.5);
 // Transparent lantern glass must not write a solid depth barrier over the emitter.
 tower.traverse(o=>{if(!o.isMesh)return;o.castShadow=false;if(o.material.name==='glass'){o.material=o.material.clone();o.material.transparent=true;o.material.opacity=.12;o.material.depthWrite=false;}});
 const positions=new Float32Array(960*6);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
 const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{flash:{value:0}},vertexShader:`varying float fade;void main(){vec4 p=modelViewMatrix*vec4(position,1.);fade=(1.-smoothstep(6.,16.,length(p.xyz)))*.14;gl_Position=projectionMatrix*p;}`,fragmentShader:`uniform float flash;varying float fade;void main(){gl_FragColor=vec4(vec3(.38,.43,.45)+flash*.5,fade);}`});
 rainLines=new THREE.LineSegments(geometry,mat);rainLines.frustumCulled=false;rainLines.userData.atmosphere=true;scene.add(rainLines);
 for(let i=0;i<960;i++)rainDrops.push({x:Math.random()*28-14,y:Math.random()*13,z:Math.random()*28-14,speed:7+Math.random()*3,len:.10+Math.random()*.12});
 for(let i=0;i<32;i++)glassDrops.push(newGlassDrop(true,i<24));
 rainGlassTexture=new THREE.DataTexture(glassPixels,glassWidth,glassHeight,THREE.RGBAFormat);rainGlassTexture.minFilter=rainGlassTexture.magFilter=THREE.LinearFilter;rainGlassTexture.generateMipmaps=false;
 post.uniforms.rainGlass.value=rainGlassTexture;updateRainGlass(0);animateBeacon(0);
}
function animateBeacon(dt){
 if(!beaconLight)return;if(!debugHoldBeacon)weatherTime+=dt;
 // A full revolution every 30 seconds. Beam crosses the town once per revolution.
 const angle=weatherTime*Math.PI*2/30;
 beaconDirection.set(Math.cos(angle),-.04,Math.sin(angle)).normalize();
 beaconLight.target.position.copy(beaconOrigin).addScaledVector(beaconDirection,150);
 beaconLight.intensity=54500*lightLabSettings.beacon.brightness/100;
}
function syncBeaconShadow(){
 if(!beaconLight)return;
 post.uniforms.beaconShadow.value=beaconLight.shadow.map?.texture||null;
 beaconMatrix.copy(beaconLight.shadow.matrix);post.uniforms.beaconTexel.value.set(1/beaconLight.shadow.mapSize.x,1/beaconLight.shadow.mapSize.y);
 post.uniforms.beaconReady.value=beaconLight.shadow.map?1:0;
}
function newGlassDrop(initial=false,small=Math.random()<.75){
 return {x:.025+Math.random()*.95,y:initial?Math.random():.25+Math.random()*.78,r:small?.0018+Math.random()*.0035:.0055+Math.random()*.0055,pinned:small,wait:2+Math.random()*7,age:0,life:9+Math.random()*18,phase:Math.random()*6.28,trail:[]};
}
function updateRainGlass(dt){
 // Height-field lens atlas: correct screen aspect, random pinned beads and gravity-driven drops.
 glassPixels.set(glassNeutral);glassHeights.fill(0);
 const aspect=typeof innerWidth==='number'?innerWidth/Math.max(1,innerHeight):16/9,regions=[];
 function stamp(x,y,r,stretch=1,amount=1){
  const cx=x*glassWidth,cy=y*glassHeight,rx=Math.max(1,r*glassWidth/aspect),ry=Math.max(1,r*glassHeight*stretch);
  const x0=Math.max(0,Math.floor(cx-rx*1.15)-1),x1=Math.min(glassWidth-1,Math.ceil(cx+rx*1.15)+1),y0=Math.max(0,Math.floor(cy-ry)-1),y1=Math.min(glassHeight-1,Math.ceil(cy+ry)+1);
  if(x1<x0||y1<y0)return;regions.push([x0,x1,y0,y1]);
  for(let j=y0;j<=y1;j++)for(let i=x0;i<=x1;i++){
   const ny=(j+.5-cy)/ry,nx=(i+.5-cx)/(rx*(1-.12*ny)),q=nx*nx+ny*ny;
   if(q<1){const h=(1-q)*(1-q)*Math.min(rx,ry)*.32*amount,k=j*glassWidth+i;glassHeights[k]=Math.max(glassHeights[k],h);}
  }
 }
 for(const d of glassDrops){
  d.age+=dt;d.wait-=dt;
  if(d.y<-.025||d.age>d.life){Object.assign(d,newGlassDrop());continue;}
  if(d.wait<=0&&!d.pinned){
   d.trail.unshift({x:d.x,y:d.y,age:0});if(d.trail.length>14)d.trail.pop();
   const speed=.008+Math.pow(d.r/.01,2)*.045;
   d.y-=speed*dt;d.x+=Math.sin(d.age*2.1+d.phase)*dt*.0009;
  }
  for(const t of d.trail){t.age+=dt;const fade=Math.max(0,1-t.age/.65);if(fade)stamp(t.x,t.y,d.r*.18,1.6,fade*.24);}
  const birth=THREE.MathUtils.smoothstep(d.age,0,.22),death=1-THREE.MathUtils.smoothstep(d.age,d.life-1,d.life);
  stamp(d.x,d.y,d.r,d.pinned?1:1.2,birth*death);
 }
 // Coalescence conserves approximate droplet volume and releases large beads.
 for(let i=0;i<glassDrops.length;i++)for(let j=i+1;j<glassDrops.length;j++){
  const a=glassDrops[i],b=glassDrops[j];if(a.age<.3||b.age<.3)continue;
  if(Math.hypot((a.x-b.x)*aspect,a.y-b.y)<(a.r+b.r)*.65){a.r=Math.min(.014,Math.cbrt(a.r**3+b.r**3));a.pinned=false;a.wait=0;Object.assign(b,newGlassDrop());}
 }
 for(const [x0,x1,y0,y1] of regions)for(let j=Math.max(1,y0);j<=Math.min(glassHeight-2,y1);j++)for(let i=Math.max(1,x0);i<=Math.min(glassWidth-2,x1);i++){
  const k=j*glassWidth+i,h=glassHeights[k],coverage=Math.floor(255*THREE.MathUtils.smoothstep(h,0,.12));if(coverage===0)continue;
  const gx=(glassHeights[k+1]-glassHeights[k-1])*.5,gy=(glassHeights[k+glassWidth]-glassHeights[k-glassWidth])*.5,o=k*4;
  glassPixels[o]=128+THREE.MathUtils.clamp(gx,-1,1)*100;glassPixels[o+1]=128+THREE.MathUtils.clamp(gy,-1,1)*100;
  glassPixels[o+2]=coverage;
  glassPixels[o+3]=255*Math.pow(Math.max(0,(-gx+gy)*.7),2);
 }
 rainGlassTexture.needsUpdate=true;
}
function animateRain(dt,flash){
 if(!rainLines)return;
 const a=rainLines.geometry.attributes.position,p=lightLabSettings.rain,count=Math.round(320*p.density/100);rainLines.geometry.setDrawRange(0,count*2);
 for(let i=0;i<count;i++){const d=rainDrops[i];d.y-=d.speed*dt*p.speed/100;d.x+=dt*.25*p.wind/100;if(d.y<0){d.y=12+Math.random();d.x=Math.random()*28-14;d.z=Math.random()*28-14;}
  const x=camera.position.x+d.x,z=camera.position.z+d.z,y=d.y;
  // Do not draw rain through solid roofs, interiors or the player's hand.
  const hidden=colliders.some(b=>x>b.min.x&&x<b.max.x&&z>b.min.z&&z<b.max.z&&y<b.max.y&&b.max.y>2);
  a.setXYZ(i*2,x,hidden?-10:y,z);a.setXYZ(i*2+1,x+.016*p.wind/100,hidden?-10:y+d.len*p.length/100,z);
 }
 a.needsUpdate=true;rainLines.material.uniforms.flash.value=flash;
 glassTick+=dt;if(glassTick>=1/30){updateRainGlass(glassTick);glassTick=0;}
}
function stormFlashAt(age,p){const d=p.duration/1000,g=p.gap/1000;function pulse(t){if(t<0||t>=d)return 0;return Math.sin(Math.PI*t/d)**.65;}return (pulse(age)+pulse(age-d-g))*p.brightness/100;}
function animateStorm(dt){
 if(!$('lightning').checked){stormAge=10;thunderDelay=-1;post.uniforms.flash.value=0;skyKey.intensity=.32;skyLight.intensity=.14;if(nightSky)nightSky.material.uniforms.lightning.value=0;return 0;}
 if(dt>0){stormDelay-=dt;stormAge+=dt;
  if(stormDelay<=0){stormAge=0;stormDelay=lightLabSettings.storm.interval*(.8+Math.random()*.4);thunderDelay=1.4+Math.random()*2.0;}
  if(thunderDelay>=0){thunderDelay-=dt;if(thunderDelay<0&&audio)audio.thunder();}
 }
 // One sharp strike followed by a brief tail, not a repeating strobe.
 const flash=stormFlashAt(stormAge,lightLabSettings.storm);
 skyKey.intensity=.32+flash*5;skyLight.intensity=.14+flash*.9;post.uniforms.flash.value=flash;
 if(nightSky)nightSky.material.uniforms.lightning.value=flash;return flash;
}
