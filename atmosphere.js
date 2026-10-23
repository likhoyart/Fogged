'use strict';
let nightSky,starField,viewHand,wetMirror;
function createStarCatalogue(count=1100){
 let state=193019;const random=()=>{state=(1664525*state+1013904223)>>>0;return state/4294967296;};
 const stars=[];
 for(let i=0;i<count;i++){const az=random()*Math.PI*2,y=.14+random()*.86,r=Math.sqrt(1-y*y),bright=random();stars.push({direction:[Math.cos(az)*r,y,Math.sin(az)*r],brightness:.18+Math.pow(bright,8)*.82,size:bright>.975?2.2:1.15+random()*.5,phase:random()*Math.PI*2,speed:.35+random()*.6});}
 return stars;
}
function prepareStars(){
 const stars=createStarCatalogue(),g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(stars.flatMap(s=>s.direction.map(x=>x*100)),3));
 g.setAttribute('starData',new THREE.Float32BufferAttribute(stars.flatMap(s=>[s.brightness,s.size,s.phase,s.speed]),4));
 const material=new THREE.ShaderMaterial({transparent:true,depthTest:true,depthWrite:false,toneMapped:false,fog:false,uniforms:{time:{value:0},pixelRatio:{value:1}},vertexShader:`attribute vec4 starData;uniform float time,pixelRatio;varying float glow;varying vec3 direction;
 void main(){direction=normalize(position);glow=starData.x*(.92+.08*sin(time*starData.w+starData.z));vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_Position.z=gl_Position.w*.999999;gl_PointSize=max(1.,starData.y*pixelRatio);}`,
 fragmentShader:`uniform float time;varying float glow;varying vec3 direction;
 float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}float fb(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=n(p)*a;p=p*2.03+7.1;a*=.5;}return v;}
 void main(){vec2 p=gl_PointCoord-.5;float circle=1.-smoothstep(.12,.5,length(p));vec3 d=normalize(direction);float cloud=fb(d.xz/max(.14,d.y+.28)*2.6+vec2(time*.0012,0.));float clear=1.-smoothstep(.32,.68,cloud);float horizon=smoothstep(.14,.28,d.y);float moon= smoothstep(.035,.052,length(d-normalize(vec3(-.17,.42,-.89))));gl_FragColor=vec4(vec3(.86,.92,1.)*glow*5.5,circle*clear*horizon*moon);}`});
 starField=new THREE.Points(g,material);starField.name='irregular_stars';starField.renderOrder=-9;starField.frustumCulled=false;starField.userData.atmosphere=true;nightSky.add(starField);
}
function prepareAtmosphere(){
 // Readable cold moon behind moving dark clouds, sparse stars and a short lightning strike.
 const skyMaterial=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{time:{value:0},lightning:{value:0}},vertexShader:'varying vec3 dir;void main(){dir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 dir;uniform float time,lightning;
 float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}float fb(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=n(p)*a;p=p*2.03+7.1;a*=.5;}return v;}
 void main(){vec3 d=normalize(dir),moon=normalize(vec3(-.17,.42,-.89));vec2 p=d.xz/max(.14,d.y+.28)*2.6+vec2(time*.0012,0.);float cloud=fb(p);float cover=smoothstep(.23,.8,cloud);float a=length(d-moon);float disk=1.-smoothstep(.0325,.0345,a);vec3 mx=normalize(cross(vec3(0.,1.,0.),moon)),my=normalize(cross(moon,mx));vec2 muv=vec2(dot(d,mx),dot(d,my))/.034;float lunar=.82+.16*fb(muv*3.8+vec2(7.1,2.7));lunar*=1.-.10*exp(-length(muv-vec2(-.26,.12))*5.2)-.07*exp(-length(muv-vec2(.22,-.28))*7.0);float halo=exp(-a*72.)*.025;float moonClear=1.-cover*.28;vec3 c=mix(vec3(.004,.007,.010),vec3(.0015,.003,.006),clamp(d.y,0.,1.));c+=vec3(.93,.99,1.04)*(disk*lunar+halo)*moonClear;c+=vec3(.002,.003,.004)*(1.-cloud);float az=atan(d.x,-d.z);float boltX=.48+n(vec2(d.y*37.,2.))*.075+n(vec2(d.y*91.,5.))*.025;float bolt=1.-smoothstep(.001,.006,abs(az-boltX));bolt*=smoothstep(.05,.10,d.y)*(1.-smoothstep(.65,.72,d.y));c+=vec3(.65,.74,.85)*lightning*(.4+cloud*.6)+vec3(3.,3.4,4.)*bolt*lightning;gl_FragColor=vec4(c,1.);}`});
 nightSky=new THREE.Mesh(new THREE.SphereGeometry(29,32,20),skyMaterial);nightSky.renderOrder=-10;nightSky.userData.atmosphere=true;scene.add(nightSky);
 prepareStars();
}

function createHand(){
 viewHand=new THREE.Group();camera.add(viewHand);
 const torch=propTemplates.torch.clone(true);torch.scale.setScalar(.38/propTemplates.torch.userData.size[0]);torch.rotation.y=Math.PI/2;torch.position.set(.30,-.31,-.45);torch.name='player_flashlight';viewHand.add(torch);
 torch.traverse(o=>{if(o.isMesh&&o.material.name==='Glass'){o.material=o.material.clone();o.material.opacity=.22;o.material.depthWrite=false;o.material.emissive.set(0x7d7055);o.material.emissiveIntensity=.12;}});

 viewHand.traverse(o=>{if(o.isMesh){o.userData.viewmodel=true;o.castShadow=false;o.frustumCulled=false;}});
 lamp.position.set(.30,-.278,-.645);lamp.target.position.set(.05,-.10,-6);
}
function animateAtmosphere(dt,time,running,moving){
 nightSky.position.copy(camera.position);nightSky.material.uniforms.time.value=time;starField.material.uniforms.time.value=time;starField.material.uniforms.pixelRatio.value=target.height/720;
 if(viewHand){viewHand.position.set(Math.sin(bob*.5)*.006*moving,Math.sin(bob)*.009*moving,0);viewHand.rotation.z=Math.sin(bob*.5)*.008*moving;lamp.position.set(.30+viewHand.position.x,-.278+viewHand.position.y,-.645);}
}
