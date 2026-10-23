'use strict';
let nightSky,constellationSky,frostMaterial,viewHand,wetMirror;
function skyDirection(az,el){const ce=Math.cos(el);return new THREE.Vector3(Math.sin(az)*ce,Math.sin(el),-Math.cos(az)*ce);}
function addConstellation(parent,az,el,scale,points){
 const center=skyDirection(az,el),east=new THREE.Vector3(Math.cos(az),0,Math.sin(az));
 const north=new THREE.Vector3(-Math.sin(az)*Math.sin(el),Math.cos(el),Math.cos(az)*Math.sin(el));
 const dirs=points.map(([x,y])=>center.clone().addScaledVector(east,x*scale).addScaledVector(north,y*scale).normalize().multiplyScalar(28.15));
 const pg=new THREE.BufferGeometry().setFromPoints(dirs),colors=[];
 for(let i=0;i<dirs.length;i++){const b=.49+(i%4)*.025;colors.push(b*.90,b*.95,b);}
 pg.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 const stars=new THREE.Points(pg,new THREE.PointsMaterial({size:1.62,sizeAttenuation:false,vertexColors:true,transparent:true,opacity:.54,depthWrite:false,depthTest:false,fog:false,toneMapped:false}));
 stars.renderOrder=-8;stars.userData.atmosphere=true;parent.add(stars);return dirs;
}
function prepareAtmosphere(){
 // Crisp waxing moon, sparse background stars and ONLY the Northern Cross constellation.
 const skyMaterial=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{time:{value:0},lightning:{value:0}},vertexShader:'varying vec3 dir;void main(){dir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 dir;uniform float time,lightning;
 float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}float fb(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=n(p)*a;p=p*2.03+7.1;a*=.5;}return v;}
 void main(){vec3 d=normalize(dir),moon=normalize(vec3(-.17,.42,-.89));vec2 p=d.xz/max(.14,d.y+.28)*2.6+vec2(time*.0012,0.);float cloud=fb(p);float cover=smoothstep(.23,.8,cloud);float a=length(d-moon);float disk=1.-smoothstep(.0344,.0354,a);vec3 mx=normalize(cross(vec3(0.,1.,0.),moon)),my=normalize(cross(moon,mx));vec2 muv=vec2(dot(d,mx),dot(d,my))/.035;float lunar=.86+.14*fb(muv*4.2+vec2(7.1,2.7));lunar*=1.-.09*exp(-length(muv-vec2(-.26,.12))*5.2)-.065*exp(-length(muv-vec2(.22,-.28))*7.0);float limb=sqrt(max(0.,1.-muv.y*muv.y));float terminator=-.14*limb;float phase=smoothstep(terminator-.035,terminator+.035,muv.x);float lit=disk*lunar*phase;float earth=disk*(1.-phase)*.055;float halo=exp(-a*96.)*.016;float moonClear=1.-cover*.18;vec3 c=mix(vec3(.004,.007,.010),vec3(.0015,.003,.006),clamp(d.y,0.,1.));c+=vec3(1.06,1.10,1.13)*(lit*1.22+earth+halo)*moonClear;c+=vec3(.002,.003,.004)*(1.-cloud);float stars=step(.99990,h(floor(d.xz*950.)))*step(.22,d.y)*(1.-cover*.72)*.0068;c+=stars;float az=atan(d.x,-d.z);float boltX=.48+n(vec2(d.y*37.,2.))*.075+n(vec2(d.y*91.,5.))*.025;float bolt=1.-smoothstep(.001,.006,abs(az-boltX));bolt*=smoothstep(.05,.10,d.y)*(1.-smoothstep(.65,.72,d.y));c+=vec3(.65,.74,.85)*lightning*(.4+cloud*.6)+vec3(3.,3.4,4.)*bolt*lightning;gl_FragColor=vec4(c,1.);}`});
 nightSky=new THREE.Mesh(new THREE.SphereGeometry(29,32,20),skyMaterial);nightSky.renderOrder=-10;nightSky.userData.atmosphere=true;scene.add(nightSky);
 constellationSky=new THREE.Group();constellationSky.name='northern_cross_only';nightSky.add(constellationSky);
 // Cygnus / Northern Cross. No connecting lines, no other named constellations.
 addConstellation(constellationSky,1.05,.58,.030,[[0,2.25],[0,1.10],[0,0],[0,-1.25],[0,-2.35],[-1.38,.05],[1.42,.12]]);
 const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');
 // Frost crystals grow from edges; the middle of the glass remains transparent.
 for(let i=0;i<360;i++){const edge=Math.floor(rr(0,4));let x=rr(0,256),y=edge<2?(edge?256:0):rr(0,256);if(edge>=2)x=edge===2?0:256;const dx=edge<2?rr(-.5,.5):(edge===2?1:-1),dy=edge<2?(edge? -1:1):rr(-.5,.5),len=rr(7,60);ctx.strokeStyle='rgba(175,194,197,'+rr(.1,.42)+')';ctx.lineWidth=rr(.4,1.4);ctx.beginPath();ctx.moveTo(x,y);for(let j=0;j<6;j++){x+=dx*len/6;y+=dy*len/6;ctx.lineTo(x,y);ctx.moveTo(x,y);ctx.lineTo(x-dy*4-dx*5,y+dx*4-dy*5);ctx.moveTo(x,y);}ctx.stroke();}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;frostMaterial=new THREE.MeshStandardMaterial({map:t,transparent:true,depthWrite:false,roughness:.9,metalness:.03,color:0x9baeb1,opacity:.75,polygonOffset:true,polygonOffsetFactor:-1});
}

function frostPatch(parent,w,h,x,y,z,rotationX=0){const o=new THREE.Mesh(new THREE.PlaneGeometry(w,h),frostMaterial);o.position.set(x,y,z);o.rotation.x=rotationX;o.receiveShadow=true;parent.add(o);return o;}
function createHand(){
 viewHand=new THREE.Group();camera.add(viewHand);
 const torch=propTemplates.torch.clone(true);torch.scale.setScalar(.38/propTemplates.torch.userData.size[0]);torch.rotation.y=Math.PI/2;torch.position.set(.30,-.31,-.45);torch.name='player_flashlight';viewHand.add(torch);
 torch.traverse(o=>{if(o.isMesh&&o.material.name==='Glass'){o.material=o.material.clone();o.material.opacity=.22;o.material.depthWrite=false;o.material.emissive.set(0x7d7055);o.material.emissiveIntensity=.12;}});

 viewHand.traverse(o=>{if(o.isMesh){o.userData.viewmodel=true;o.castShadow=false;o.frustumCulled=false;}});
 lamp.position.set(.30,-.278,-.645);lamp.target.position.set(.05,-.10,-6);
}
function animateAtmosphere(dt,time,running,moving){
 nightSky.position.copy(camera.position);nightSky.material.uniforms.time.value=time;
 if(viewHand){viewHand.position.set(Math.sin(bob*.5)*.006*moving,Math.sin(bob)*.009*moving,0);viewHand.rotation.z=Math.sin(bob*.5)*.008*moving;lamp.position.set(.30+viewHand.position.x,-.278+viewHand.position.y,-.645);}
}
