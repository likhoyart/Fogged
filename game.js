'use strict';
// BRAIN FOG v0.6.9 / Ash Street. Three.js r160.1, world units = metres.
// Imported assets: Sketchfab CC BY 4.0 and Poly Haven CC0. See CREDITS.md.
const $=id=>document.getElementById(id),clamp=THREE.MathUtils.clamp;
let seed=48196;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296},rr=(a,b)=>a+(b-a)*rnd();
const scene=new THREE.Scene();scene.background=new THREE.Color(0x111b22);scene.fog=new THREE.Fog(0x111b22,1000,2000);
const camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.07,120);camera.position.set(51,1.7,18);camera.rotation.order='YXZ';scene.add(camera);
const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;document.body.prepend(renderer.domElement);
const skyLight=new THREE.HemisphereLight(0x9cbbcc,0x11171b,.14);scene.add(skyLight);
const skyKey=new THREE.DirectionalLight(0xa8bdc4,.19);skyKey.position.set(-9,20,8);skyKey.castShadow=false;skyKey.shadow.mapSize.set(2048,2048);Object.assign(skyKey.shadow.camera,{left:-26,right:26,top:28,bottom:-28,near:1,far:60});skyKey.shadow.normalBias=.035;skyKey.shadow.bias=-.0002;scene.add(skyKey,skyKey.target);
const lamp=new THREE.SpotLight(0xffe3ad,72,24,.16,.30,1.4);lamp.position.set(.17,-.13,-.08);lamp.target.position.set(0,-.08,-1);lamp.castShadow=true;lamp.shadow.mapSize.set(1024,1024);lamp.shadow.normalBias=.075;lamp.shadow.bias=-.00065;lamp.shadow.camera.near=.12;camera.add(lamp,lamp.target);
// Generated sky reflection: no visible second sun, soft wet-material reflections.
const skyCanvas=document.createElement('canvas');skyCanvas.width=512;skyCanvas.height=256;const skyCtx=skyCanvas.getContext('2d');let gradient=skyCtx.createLinearGradient(0,0,0,256);gradient.addColorStop(0,'#182832');gradient.addColorStop(.48,'#15212a');gradient.addColorStop(.53,'#090f12');gradient.addColorStop(1,'#06090b');skyCtx.fillStyle=gradient;skyCtx.fillRect(0,0,512,256);
const skyTex=new THREE.CanvasTexture(skyCanvas);skyTex.colorSpace=THREE.SRGBColorSpace;skyTex.mapping=THREE.EquirectangularReflectionMapping;const pmrem=new THREE.PMREMGenerator(renderer),envRT=pmrem.fromEquirectangular(skyTex);scene.environment=envRT.texture;skyTex.dispose();pmrem.dispose();
const streetBuildings=[];
const colliders=[],boxGeo=new THREE.BoxGeometry(1,1,1),materials={},animatedFog=[];
function collision(o){o.updateWorldMatrix(true,true);const b=new THREE.Box3().setFromObject(o);if(b.max.y>.30)colliders.push(b);return o;}
function box(parent,w,h,d,x,y,z,m,solid=false){const o=new THREE.Mesh(boxGeo,m);o.scale.set(w,h,d);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);if(solid)collision(o);return o;}
function group(x,y,z,angle=0){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=angle;scene.add(g);return g;}
function metal(color=0x4b514a,roughness=.7){return new THREE.MeshStandardMaterial({color,roughness,metalness:.55,envMapIntensity:.45});}
const trim=new THREE.MeshStandardMaterial({color:0x7a7b67,roughness:.92}),dark=new THREE.MeshStandardMaterial({color:0x101817,roughness:.92}),rust=metal(0x514033,.93),iron=metal(0x333e3c),glass=new THREE.MeshStandardMaterial({color:0x203235,roughness:.29,metalness:.32,envMapIntensity:.55}),rubber=new THREE.MeshStandardMaterial({color:0x131916,roughness:.98}),wood=new THREE.MeshStandardMaterial({color:0x48473a,roughness:.98});
function rod(parent,a,b,r,m=iron,sides=8){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),v=bv.clone().sub(av);const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,v.length(),sides),m);o.position.copy(av.add(bv).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());o.castShadow=true;parent.add(o);return o;}
function uvScale(o,w,h,d,tile=2){const geometry=o.geometry.clone(),uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++){const face=Math.floor(i/4);uv.setXY(i,(uv.getX(i)*(face<2?d:w)+(face<2?o.position.z-d/2:o.position.x-w/2))/tile,(uv.getY(i)*(face===2||face===3?d:h)+(face===2||face===3?o.position.z-d/2:o.position.y-h/2))/tile);}o.geometry=geometry;return o;}
function wall(parent,w,h,d,x,y,z,m,solid=true){return uvScale(box(parent,w,h,d,x,y,z,m,solid),w,h,d,2.4);}
function car(x,z,angle){return putProp('coveredCar',x,0,z,angle,1,true);}
function chainFence(x,z,length,angle){return importedFence(x,z,length,angle);}
function puddle(x,z,w,d){
 // A simple, free-form water surface: 40 triangles, no extra scene render.
 const vertices=[0,0,0],uv=[.5,.5],indices=[],N=40;
 for(let i=0;i<N;i++){const a=i/N*Math.PI*2,r=1+.085*Math.sin(a*5)+.06*Math.cos(a*9);vertices.push(Math.cos(a)*w*.5*r,0,Math.sin(a)*d*.5*r);uv.push(.5+Math.cos(a)*.5,.5+Math.sin(a)*.5);}
 for(let i=0;i<N;i++)indices.push(0,(i+1)%N+1,i+1);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
 const m=new THREE.MeshPhysicalMaterial({color:0x526061,roughness:.14,metalness:.18,clearcoat:.8,clearcoatRoughness:.15,envMapIntensity:.6,transparent:true,opacity:.8,depthWrite:false,normalMap:materials.asphalt.normalMap,normalScale:new THREE.Vector2(.012,.012)});
 m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <alphamap_fragment>','#include <alphamap_fragment>\n diffuseColor.a *= 1.0-smoothstep(0.35,0.5,length(vUv-0.5));');};
 m.defines={USE_UV:''};const o=new THREE.Mesh(g,m);o.position.set(x,.046,z);o.receiveShadow=true;o.userData.atmosphere=true;scene.add(o);
}
// Merge static opaque meshes by material and spatial cell to reduce draw calls.
function mergeStatic(){
 scene.updateMatrixWorld(true);const batches=new Map(),position=new THREE.Vector3();
 scene.traverse(o=>{if(!o.isMesh||o.userData.importedAsset||o.userData.viewmodel||o.userData.atmosphere||Array.isArray(o.material)||o.material.transparent)return;
  o.getWorldPosition(position);const key=o.material.uuid+':'+Math.floor(position.x/12)+':'+Math.floor(position.z/12);
  if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o);
 });
 for(const objects of batches.values()){
  if(objects.length<2)continue;const positions=[],normals=[],uvs=[],indices=[];let offset=0;
  for(const o of objects){const g=o.geometry.clone().applyMatrix4(o.matrixWorld),p=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv;
   positions.push(...p.array);if(n)normals.push(...n.array);else for(let i=0;i<p.count;i++)normals.push(0,1,0);
   if(u)uvs.push(...u.array);else for(let i=0;i<p.count;i++)uvs.push(0,0);
   if(g.index)for(const ix of g.index.array)indices.push(ix+offset);else for(let i=0;i<p.count;i++)indices.push(i+offset);
   offset+=p.count;g.dispose();o.removeFromParent();
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeBoundingSphere();
  const merged=new THREE.Mesh(geometry,objects[0].material);merged.castShadow=objects.some(o=>o.castShadow);merged.receiveShadow=true;scene.add(merged);
 }
}

// Uncorrelated noise avoids the diagonal moire of analytic interleaved gradients.
const fogNoisePixels=new Uint8Array(256*256*4);let noiseSeed=1940763;
for(let i=0;i<fogNoisePixels.length;i+=4){noiseSeed^=noiseSeed<<13;noiseSeed^=noiseSeed>>>17;noiseSeed^=noiseSeed<<5;const v=noiseSeed>>>24;fogNoisePixels[i]=fogNoisePixels[i+1]=fogNoisePixels[i+2]=v;fogNoisePixels[i+3]=255;}
const fogNoiseTexture=new THREE.DataTexture(fogNoisePixels,256,256,THREE.RGBAFormat);fogNoiseTexture.wrapS=fogNoiseTexture.wrapT=THREE.RepeatWrapping;fogNoiseTexture.minFilter=fogNoiseTexture.magFilter=THREE.NearestFilter;fogNoiseTexture.needsUpdate=true;
// Post: high-resolution, restrained film grain, subtle cold shadows and warm lights.
const target=new THREE.WebGLRenderTarget(1,1,{depthBuffer:true,type:THREE.HalfFloatType});target.depthTexture=new THREE.DepthTexture(1,1);const postScene=new THREE.Scene(),postCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
const post=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{fogNoise:{value:fogNoiseTexture},image:{value:target.texture},depthMap:{value:target.depthTexture},time:{value:0},resolution:{value:new THREE.Vector2(1,1)},near:{value:.07},far:{value:120},inverseProjection:{value:camera.projectionMatrixInverse},cameraWorld:{value:camera.matrixWorld},eye:{value:camera.position},beamPosition:{value:new THREE.Vector3()},beamDirection:{value:new THREE.Vector3()},fogSteps:{value:12},gradeTint:{value:new THREE.Vector3(1,1.025,.94)},gradeSaturation:{value:.52},gradeContrast:{value:1.06},fogTint:{value:new THREE.Vector3(.016,.022,.019)},flash:{value:0},beamPower:{value:1},streetPositions:{value:streetFogPositions},beaconPosition:{value:beaconOrigin},beaconDirection:{value:beaconDirection},beaconShadow:{value:null},beaconMatrix:{value:beaconMatrix},beaconReady:{value:0},rainGlass:{value:null}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`uniform sampler2D image,depthMap,rainGlass,beaconShadow,fogNoise;uniform mat4 beaconMatrix;uniform vec3 beaconPosition,beaconDirection;uniform float beaconReady;
 #include <packing>
uniform float time,near,far;uniform vec2 resolution;varying vec2 vUv;
 uniform mat4 inverseProjection,cameraWorld;uniform vec3 eye,beamPosition,beamDirection;uniform float fogSteps;uniform vec3 gradeTint,fogTint;uniform float gradeSaturation,gradeContrast,flash,beamPower;uniform vec3 streetPositions[10];
 float beaconVisibility(vec3 p){if(beaconReady<.5)return 0.;vec4 q=beaconMatrix*vec4(p,1.);q.xyz/=q.w;if(q.x<0.||q.x>1.||q.y<0.||q.y>1.||q.z<0.||q.z>1.)return 0.;return step(q.z-.001,unpackRGBAToDepth(texture2D(beaconShadow,q.xy)));}
 // World-space extinction integrated only up to the visible surface. No fog cards.
 float hash3(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
 float densityNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);}
 // Soft local halos use smooth ellipsoidal density, with no conical boundary.
 // All ten lamps remain fixed; integrate only the visible part of each halo.
 vec3 streetScattering(vec3 ray,float lengthRay){
  vec3 result=vec3(0.);const vec3 radii=vec3(4.8,5.8,4.8);
  for(int j=0;j<10;j++){
   vec3 center=streetPositions[j]+vec3(0.,-1.6,0.);
   vec3 origin=(eye-center)/radii,direction=ray/radii;
   float a=dot(direction,direction),b=dot(origin,direction),c=dot(origin,origin)-1.;
   float d=b*b-a*c;if(d<=0.)continue;
   float lo=max(0.,(-b-sqrt(d))/a),hi=min(lengthRay,(-b+sqrt(d))/a);
   if(hi<=lo)continue;float stepSize=(hi-lo)/12.;
   for(int tap=0;tap<12;tap++){
    float t=lo+(float(tap)+.5)*stepSize;vec3 p=eye+ray*t;
    vec3 q=(p-center)/radii;float r2=dot(q,q);
    float softness=exp(-r2*3.)*(1.-smoothstep(.45,1.,r2));
    float radius=max(.35,length(p-streetPositions[j]));
    float falloff=exp(-radius*.14)/(1.+radius*radius*.6);
    result+=vec3(.009,.008,.0055)*245.*2.*falloff*softness*exp(-t*.09)*(1.-exp(-stepSize*.09));
   }
  }
  return result;
 }
 // Ray-cone intersection provides stable samples throughout the distant lighthouse beam.
 vec3 beaconScattering(vec3 ray,float visibleDistance){
  vec3 origin=eye-beaconPosition;float h=dot(origin,beaconDirection),dh=dot(ray,beaconDirection);
  vec3 radial=origin-beaconDirection*h,dr=ray-beaconDirection*dh;
  float lo=0.,hi=visibleDistance;const float k=0.148579074;
  if(abs(dh)<.00001){if(h<0.||h>210.)return vec3(0.);}
  else {float x=-h/dh,y=(210.-h)/dh;lo=max(lo,min(x,y));hi=min(hi,max(x,y));}
  if(hi<=lo)return vec3(0.);
  float a=dot(dr,dr)-k*k*dh*dh,b=2.*(dot(radial,dr)-k*k*h*dh),c=dot(radial,radial)-k*k*h*h;
  if(abs(a)<.00001){if(abs(b)<.00001){if(c>0.)return vec3(0.);}else if(b>0.)hi=min(hi,-c/b);else lo=max(lo,-c/b);}
  else {float d=b*b-4.*a*c;if(d<0.){if(a>0.)return vec3(0.);}else{
   float r0=(-b-sqrt(d))/(2.*a),r1=(-b+sqrt(d))/(2.*a),rn=min(r0,r1),rf=max(r0,r1);
   if(a>0.){lo=max(lo,rn);hi=min(hi,rf);}else if(lo<rn)hi=min(hi,rn);else lo=max(lo,rf);
  }}
  if(hi<=lo)return vec3(0.);vec3 light=vec3(0.);float stepSize=(hi-lo)/20.;
  for(int tap=0;tap<20;tap++){
   float t=lo+(float(tap)+.5)*stepSize;vec3 p=eye+ray*t,delta=p-beaconPosition;float distance=max(.1,length(delta));
   float cone=smoothstep(0.989141583,0.9928,dot(delta/distance,beaconDirection));
   float visibility=beaconVisibility(p);float falloff=min(3.,6500./max(64.,distance*distance));
   // Height-weighted transmission preserves ground fog while revealing the elevated landmark.
   float opticalDepth=.035*t+.085*exp(-max(0.,eye.y)*.24)*(abs(ray.y)>.0001?(1.-exp(-ray.y*t*.24))/(ray.y*.24):t);
   light+=vec3(.0670,.0502,.0308)*cone*visibility*falloff*exp(-max(0.,opticalDepth))*(1.-exp(-stepSize*.06));
  }
  return light;
 }
 vec3 integrateFog(vec3 surface,float distanceZ){
  vec4 v=inverseProjection*vec4(vUv*2.-1.,1.,1.);vec3 rayV=normalize(v.xyz/v.w);
  vec3 ray=normalize((cameraWorld*vec4(rayV,0.)).xyz);float visibleDistance=min(160.,distanceZ/max(.05,-rayV.z));float lengthRay=min(42.,visibleDistance);
  float transmittance=1.;vec3 scattering=vec3(0.);float jitter=texture2D(fogNoise,(floor(gl_FragCoord.xy)+.5)/256.).r;
  for(int i=0;i<18;i++){if(float(i)>=fogSteps)break;float a=float(i)/fogSteps,b=(float(i)+1.)/fogSteps;float segmentStart=a*a*lengthRay,stepSize=(b*b-a*a)*lengthRay;float t=segmentStart+(.45+.1*jitter)*stepSize;vec3 p=eye+ray*t;
   float lowLayer=exp(-max(0.,p.y)*.24);float drift=densityNoise(p*vec3(.13,.21,.13)+vec3(time*.012,0.,time*.006));
   float density=(.025+.115*lowLayer)*mix(.72,1.25,drift);
   density*=smoothstep(.25,1.25,t);float absorb=1.-exp(-density*stepSize);
   vec3 toPoint=p-beamPosition;float beamRange=length(toPoint);float cone=smoothstep(.987227,.993734,dot(normalize(toPoint),beamDirection));
   float beam=cone*exp(-beamRange*.12)/(1.+beamRange*beamRange*.2);
   vec3 incident=fogTint+vec3(.042,.0345,.024)*beam*beamPower+vec3(.04,.047,.054)*flash;
   scattering+=transmittance*absorb*incident;transmittance*=1.-absorb;
  }
  return surface*transmittance+scattering+streetScattering(ray,lengthRay)+beaconScattering(ray,visibleDistance);
 }
 float noise(vec2 p){return texture2D(fogNoise,(p+.5)/256.).r;}float depth(vec2 p){float z=texture2D(depthMap,p).x;return near*far/(far-z*(far-near));}
 void main(){vec2 p=vUv-.5;vec3 rain=texture2D(rainGlass,vUv).rgb;vec2 refractUV=vUv+(rain.rg-vec2(.502))*.026;vec2 offset=p*dot(p,p)*.001;vec3 c=vec3(texture2D(image,refractUV+offset).r,texture2D(image,refractUV).g,texture2D(image,refractUV-offset).b);
 float d=depth(refractUV),occlusion=0.;for(int i=0;i<8;i++){float a=float(i)*.7854;float nd=depth(vUv+vec2(cos(a),sin(a))*4./resolution);float delta=d-nd;occlusion+=smoothstep(.025,.18,delta)*(1.-smoothstep(.2,.7,delta));}c*=1.-occlusion*.018;
 c=integrateFog(c,d);c+=rain.b*vec3(.018,.023,.025)*(1.+flash*5.);
 float l=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(l),c,gradeSaturation)*gradeTint;c=max(vec3(0.),(c-.025)*gradeContrast+.025);c*=1.-smoothstep(.18,.71,length(p))*.48;
 c+=(noise(floor(vUv*resolution)+floor(time*24.))-.5)*.0035;gl_FragColor=vec4(max(c,vec3(0.)),1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),post));
const palettePresets={
 homecoming:{tint:[1,1.025,.92],saturation:.52,contrast:1.06,fog:[.017,.022,.019]},
 cold:{tint:[.86,.97,1.08],saturation:.55,contrast:1.04,fog:[.014,.020,.028]},
 rust:{tint:[1.08,.96,.82],saturation:.46,contrast:1.08,fog:[.024,.019,.014]},
 neutral:{tint:[1,1,1],saturation:.80,contrast:1,fog:[.019,.022,.023]}
};
function saveSettings(){try{localStorage.setItem('brain-fog-settings',JSON.stringify(Object.fromEntries(['quality','screenResolution','palette','showFPS','lightning','volume','stepsVolume','thunderVolume','rainVolume','ambienceVolume','electricalVolume'].map(k=>[k,$(k).type==='checkbox'?$(k).checked:$(k).value]))));}catch{}}
try{const saved=JSON.parse(localStorage.getItem('brain-fog-settings')||'{}');for(const [k,v] of Object.entries(saved)){const el=$(k);if(!el)continue;if(el.type==='checkbox')el.checked=Boolean(v);else if(el.tagName!=='SELECT'||[...el.options].some(o=>o.value===v))el.value=v;}}catch{}
function applyPalette(){const p=palettePresets[$('palette').value]||palettePresets.homecoming;post.uniforms.gradeTint.value.fromArray(p.tint);post.uniforms.gradeSaturation.value=p.saturation;post.uniforms.gradeContrast.value=p.contrast;post.uniforms.fogTint.value.fromArray(p.fog);saveSettings();}
function resize(){const high=$('quality').value==='high';post.uniforms.fogSteps.value=high?18:12;const selected=$('screenResolution').value;let [w,h]=selected==='native'?[Math.round(innerWidth*Math.min(devicePixelRatio,1.5)),Math.round(innerHeight*Math.min(devicePixelRatio,1.5))]:selected.split('x').map(Number);const cap=Math.min(1,2560/w,1440/h);w=Math.max(2,Math.round(w*cap));h=Math.max(2,Math.round(h*cap));renderer.setPixelRatio(1);renderer.setSize(w,h,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();target.setSize(w,h);post.uniforms.resolution.value.set(w,h);lamp.castShadow=true;lamp.shadow.mapSize.set(high?1024:512,high?1024:512);if(lamp.shadow.map){lamp.shadow.map.dispose();lamp.shadow.map=null;}saveSettings();}
addEventListener('resize',resize);for(const k of ['quality','screenResolution'])$(k).addEventListener('change',resize);$('palette').addEventListener('change',applyPalette);$('showFPS').addEventListener('change',()=>{$('fps').hidden=!$('showFPS').checked;saveSettings();});$('lightning').addEventListener('change',saveSettings);$('volume').addEventListener('change',saveSettings);$('fps').hidden=!$('showFPS').checked;resize();applyPalette();
let fpsElapsed=0,fpsFrames=0,drawCalls=0,drawTriangles=0;
// Controller: substeps, circular footprint, axis-separated sliding, sprint and jump.
const music=new HorrorMusic();music.bindControls($('music-settings'));
let audio=null,active=false,started=false,yaw=-.12,pitch=-.045,elapsed=0,bob=0,stride=0,last=performance.now(),nextFlicker=60,feet=0,verticalVelocity=0,grounded=true,jumpRequested=false,landingKick=0;
const keys=new Set(),vel=new THREE.Vector2();
function blocked(x,z){return colliders.some(b=>{if(b.max.y<=feet+.06||b.min.y>=feet+1.7)return false;const dx=x-clamp(x,b.min.x,b.max.x),dz=z-clamp(z,b.min.z,b.max.z);return dx*dx+dz*dz<.28*.28;});}
function move(dx,dz){const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.085));for(let i=0;i<count;i++){if(!blocked(camera.position.x+dx/count,camera.position.z))camera.position.x+=dx/count;if(!blocked(camera.position.x,camera.position.z+dz/count))camera.position.z+=dz/count;}}
function pause(){active=false;dragging=false;updatePauseMap();keys.clear();vel.set(0,0);jumpRequested=false;$('menu').hidden=false;$('enter').textContent=started?'Return to the fog':'Enter the fog';if(audio){audio.pauseFlashlight();audio.level(false);}}
let dragLook=false,dragging=false;
function beginPlay(){active=true;started=true;keys.clear();$('menu').hidden=true;$('status').textContent='';last=performance.now();if(audio){audio.resumeFlashlight();audio.level(true);}}
function lockError(){dragLook=true;beginPlay();$('soundLabel').textContent='DRAG TO LOOK · ESC TO PAUSE';}
for(const name of ['steps','thunder','rain','ambience','electrical']){const el=$(name+'Volume'),out=$(name+'Percent');const sync=()=>{out.value=Math.round(+el.value*100)+'%';if(audio)audio.mix(name,+el.value);saveSettings();};el.addEventListener('input',sync);sync();}
$('enter').onclick=()=>{music.start().catch(e=>console.warn('Music:',e.message));try{if(!audio)audio=new Ambience();audio.ctx.resume().catch(()=>{});}catch(e){$('status').textContent='Audio is unavailable. You can continue without sound.';}try{const p=renderer.domElement.requestPointerLock();if(p?.catch)p.catch(lockError);}catch(e){lockError();}};
document.addEventListener('pointerlockchange',()=>{active=document.pointerLockElement===renderer.domElement;if(active){dragLook=false;beginPlay();}else if(!dragLook)pause();});document.addEventListener('pointerlockerror',lockError);
document.addEventListener('mousemove',e=>{if(active&&(!dragLook||dragging)){yaw-=e.movementX*.00165;pitch=clamp(pitch-e.movementY*.00165,-1.35,1.35);}});
renderer.domElement.addEventListener('pointerdown',e=>{if(active&&dragLook){dragging=true;renderer.domElement.setPointerCapture(e.pointerId);}});
addEventListener('pointerup',()=>dragging=false);
addEventListener('keydown',e=>{if(!active)return;if(e.code==='Escape'){leave();return;}if(['KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight','Space'].includes(e.code)){e.preventDefault();keys.add(e.code);if(e.code==='Space'&&!e.repeat&&grounded)jumpRequested=true;}if(e.code==='KeyM'&&!e.repeat&&audio){audio.muted=!audio.muted;audio.level(active);$('soundLabel').textContent=audio.muted?'M · SOUND OFF':'ESC · PAUSE';}});addEventListener('keyup',e=>keys.delete(e.code));
function leave(){dragLook=false;dragging=false;fpsElapsed=0;fpsFrames=0;if(document.pointerLockElement)document.exitPointerLock();pause();}addEventListener('blur',leave);document.addEventListener('visibilitychange',()=>{if(document.hidden)leave();});$('volume').oninput=()=>{if(audio)audio.level(active);};
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();leave();$('enter').disabled=true;$('status').textContent='Graphics context lost. Reload this page.';});
const events=[];let noteUntil=0;const debug=new URLSearchParams(location.search).has('debug');$('debug').hidden=!debug;
function frame(now){requestAnimationFrame(frame);const frameSeconds=Math.max(.0001,(now-last)/1000),dt=Math.min(frameSeconds,.05);last=now;if(document.hidden)return;
 if(active){elapsed+=dt;const sx=Number(keys.has('KeyD'))-Number(keys.has('KeyA')),sz=Number(keys.has('KeyW'))-Number(keys.has('KeyS'));const wish=new THREE.Vector2(Math.cos(yaw)*sx-Math.sin(yaw)*sz,-Math.sin(yaw)*sx-Math.cos(yaw)*sz);const running=keys.has('ShiftLeft')||keys.has('ShiftRight'),speed=running?3.55:1.72;if(wish.lengthSq())wish.normalize().multiplyScalar(speed);vel.lerp(wish,1-Math.exp(-dt*(wish.lengthSq()?4:8)));const x=camera.position.x,z=camera.position.z;move(vel.x*dt,vel.y*dt);const distance=Math.hypot(camera.position.x-x,camera.position.z-z),weight=clamp(distance/Math.max(dt,.001)/speed,0,1);
 // Jump is a physical vertical arc. Collision tests follow the player's height.
 if(jumpRequested&&grounded){verticalVelocity=4.6;grounded=false;}jumpRequested=false;
 const oldFeet=feet;verticalVelocity-=13.8*dt;let nextFeet=feet+verticalVelocity*dt,landed=false;
 for(const b of colliders){const dx=camera.position.x-clamp(camera.position.x,b.min.x,b.max.x),dz=camera.position.z-clamp(camera.position.z,b.min.z,b.max.z);if(dx*dx+dz*dz>=.28*.28)continue;
  if(verticalVelocity<=0&&oldFeet>=b.max.y-.035&&nextFeet<=b.max.y){nextFeet=Math.max(nextFeet,b.max.y);landed=true;}
  if(verticalVelocity>0&&oldFeet+1.7<=b.min.y+.02&&nextFeet+1.7>=b.min.y){nextFeet=b.min.y-1.7;verticalVelocity=0;}
 }
 if(nextFeet<=0){nextFeet=0;landed=true;}if(landed){if(!grounded){landingKick=-.075;if(audio)audio.sound(3,new THREE.Vector3(camera.position.x,.08,camera.position.z));}verticalVelocity=0;}grounded=landed;feet=nextFeet;
 if(grounded){bob+=distance*(running?8:7);stride+=distance;}else stride=0;
 landingKick=THREE.MathUtils.damp(landingKick,0,11,dt);const shake=grounded?weight:0;
 camera.position.y=feet+1.70+Math.sin(bob)*(running?.054:.038)*shake+landingKick;
 camera.rotation.set(pitch+Math.cos(bob*.5)*.007*shake,yaw,Math.sin(bob*.5)*(running?.010:.006)*shake,'YXZ');
 if(audio){audio.update(dt);if(grounded&&stride>.86){audio.sound(3,new THREE.Vector3(camera.position.x,feet+.08,camera.position.z));stride=0;}}
 animateFlashlight(frameSeconds);for(const e of events)if(!e.done&&Math.hypot(camera.position.x-e.x,camera.position.z-e.z)<e.r){e.done=true;$('note').textContent=e.text;$('note').style.opacity=1;noteUntil=elapsed+6;}if(elapsed>noteUntil)$('note').style.opacity=0;}
 animateGrass(elapsed);
 const isRunning=keys.has('ShiftLeft')||keys.has('ShiftRight');animateAtmosphere(active?frameSeconds:0,elapsed,isRunning,active?clamp(vel.length()/1.72,0,1):0);skyKey.position.set(camera.position.x-12,26,camera.position.z-22);skyKey.target.position.set(camera.position.x,0,camera.position.z);

 animateStreetLights(active?frameSeconds:0,elapsed);animateStationLights();animateBeacon(active?frameSeconds:0);const stormFlash=animateStorm(active?frameSeconds:0);animateRain(active?Math.min(frameSeconds,.25):0,stormFlash);
 // Let the renderer cull trees per light's frustum; camera movement must not change street shadows.
 for(const g of treeObjects){g.visible=true;for(const m of g.children)m.castShadow=true;}
 renderer.info.autoReset=false;renderer.info.reset();renderer.setRenderTarget(target);renderer.render(scene,camera);drawCalls=renderer.info.render.calls;drawTriangles=renderer.info.render.triangles;renderer.setRenderTarget(null);syncBeaconShadow();post.uniforms.time.value=now*.001;
 lamp.getWorldPosition(post.uniforms.beamPosition.value);lamp.target.getWorldPosition(post.uniforms.beamDirection.value);post.uniforms.beamDirection.value.sub(post.uniforms.beamPosition.value).normalize();post.uniforms.beamPower.value=lamp.intensity/48;renderer.render(postScene,postCam);fpsElapsed+=frameSeconds;fpsFrames++;if(fpsElapsed>=.5){$('fps').textContent=`${Math.round(fpsFrames/fpsElapsed)} FPS`;fpsElapsed=0;fpsFrames=0;}
 if(debug)$('debug').textContent=`v0.6.9 ${active?'PLAY':'PAUSE'} ${grounded?'GROUND':'AIR'} y ${feet.toFixed(2)} x ${camera.position.x.toFixed(2)} z ${camera.position.z.toFixed(2)}\n${drawCalls} calls · ${drawTriangles} triangles · ${colliders.length} colliders · ${audio?audio.ctx.state:'audio off'} · next flicker ${Math.ceil(nextFlicker)}s · flicker ${flashlightBursts} · grass ${grassCount}`;
}
async function init(){try{const loader=new THREE.TextureLoader();for(const [name,data] of Object.entries(MATERIAL_ASSETS)){const maps={};await Promise.all(Object.entries(data).map(async([key,url])=>{const t=await loader.loadAsync(url);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());if(key==='map')t.colorSpace=THREE.SRGBColorSpace;maps[key]=t;}));materials[name]=new THREE.MeshStandardMaterial({...maps,color:name==='brick'?0x8b8d7d:name==='plaster'?0xb4b4a1:0x8b9695,roughness:name==='asphalt'?.65:.95,metalness:name==='asphalt'?.09:0,normalScale:new THREE.Vector2(.55,.55),envMapIntensity:.32});}
 await loadProps();if(document.fonts)await document.fonts.ready;prepareAtmosphere();prepareStreetLights();await loadTownAssets();buildTown();prepareGrass();createHand();prepareWeather();prepareStationLights();mergeStatic();preparePauseMap();camera.rotation.set(pitch,yaw,0,'YXZ');if(debug){const select=document.createElement('select');select.id='inspection';select.setAttribute('aria-label','Inspect location');for(const [name,x,z,angle,look=0] of [['Parking',51,18,0],['Junction',0,0,0],['Fire station',0,11,Math.PI],['Station all gates',-3.9,6,Math.PI,.12],['Station gate left',-11.019,12,Math.PI,.25],['Shops',45,1,0],['House 01',0,-72,0],['Streetlight glow',0,-72,2.23,-.10],['Streetlight ground',0,-72,2.23,-.45],['Cleared house site',15,-61,0],['House 03',2,-34,-Math.PI/2],['Warehouse',76,0,-Math.PI/2],['Forest',-39,0,0],['Lighthouse',-77,-15,0],['Lighthouse approach',-40,0,.923,.34],['Lighthouse south 42m',-77,14,0,.40],['Lighthouse north 42m',-77,-70,Math.PI,.40],['Lighthouse distant',-16,-5,1.21,.25],['Lighthouse sky',-77,-15,0,.825],['Grass edge',-9,-50,Math.PI/2,-.35]]){const opt=document.createElement('option');opt.textContent=name;opt.value=JSON.stringify([x,z,angle,look]);select.append(opt);}select.onchange=()=>{const [x,z,a,look]=JSON.parse(select.value);camera.position.set(x,1.7,z);feet=0;yaw=a;pitch=look;camera.rotation.set(pitch,yaw,0,'YXZ');updatePauseMap();};document.querySelector('.options').append(select);} if(debug)preparePlaytest(); $('enter').disabled=false;$('enter').textContent='Enter the fog';$('status').textContent='';requestAnimationFrame(frame);
 }catch(e){console.error(e);$('status').textContent='Could not load resources. Extract the complete archive and open index.html.';}}
init();
