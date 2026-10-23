'use strict';
let warehouseBounds=null;
function prepareWarehouseAccess(g){
 const b=new THREE.Box3().setFromObject(g);warehouseBounds=b.clone();
 const floor=b.min.y+.024,roof=b.min.y+2.88,front=b.min.x+.10,back=b.max.x-.04,cz=(b.min.z+b.max.z)/2;
 const add=(x0,y0,z0,x1,y1,z1)=>colliders.push(new THREE.Box3(new THREE.Vector3(x0,y0,z0),new THREE.Vector3(x1,y1,z1)));
 add(front-.12,b.min.y,b.min.z,back+.1,b.max.y,b.min.z+.16);
 add(front-.12,b.min.y,b.max.z-.16,back+.1,b.max.y,b.max.z);
 add(back-.10,b.min.y,b.min.z,back+.12,b.max.y,b.max.z);
 add(front-.14,b.min.y,b.min.z,front+.10,roof,cz-3.95);
 add(front-.14,b.min.y,cz+3.95,front+.10,roof,b.max.z);
 add(front-.14,roof,b.min.z,front+.10,b.max.y,b.max.z);
 add(front,-.2,b.min.z,back,floor,b.max.z);
 // Keep the original perimeter, with a narrow extension enclosing the rotated warehouse.
 const east=colliders.findIndex(c=>c.min.x===95.5&&c.max.x===96.5);if(east>=0)colliders.splice(east,1);
 add(95.5,-1,-105,96.5,20,b.min.z-.3);add(95.5,-1,b.max.z+.3,96.5,20,55);
 add(b.max.x+.5,-1,b.min.z-.3,b.max.x+1.5,20,b.max.z+.3);
}
const stationReflection={target:null,map:{value:null},camera:new THREE.PerspectiveCamera(),matrix:new THREE.Matrix4(),ready:{value:0},last:-Infinity,frames:0,windowBounds:[]};
function prepareStationWindows(){
 const station=townObjects.find(g=>g.name==='town_07');station.updateMatrixWorld(true);
 // Find the real front window quads by their original atlas and facade position.
 for(const mesh of station.children){const geo=mesh.geometry,p=geo.attributes.position,uv=geo.attributes.uv,idx=geo.index;const selected=[];
  for(let i=0;i<(idx?idx.count:p.count);i+=3){const ix=[0,1,2].map(j=>idx?idx.getX(i+j):i+j);
   if(!ix.every(k=>uv.getX(k)>.812&&uv.getY(k)>.18&&uv.getY(k)<.32))continue;
   const points=ix.map(k=>new THREE.Vector3().fromBufferAttribute(p,k).applyMatrix4(mesh.matrixWorld));
   if(points.every(v=>v.y<2.3&&v.z<20))selected.push(...points);
  }
  if(!selected.length)continue;
  const bounds=new THREE.Box3().setFromPoints(selected);stationReflection.windowBounds.push(bounds);stationReflection.z=bounds.max.z;
  const mat=mesh.material,previous=mat.onBeforeCompile;
  mat.onBeforeCompile=shader=>{
   previous(shader);Object.assign(shader.uniforms,{stationReflectionMap:stationReflection.map,stationReflectionMatrix:{value:stationReflection.matrix},stationReflectionReady:stationReflection.ready,stationGlassZ:{value:stationReflection.z}});
   shader.vertexShader='varying vec3 stationWorld;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n stationWorld=(modelMatrix*vec4(position,1.0)).xyz;');
   shader.fragmentShader='varying vec3 stationWorld;uniform sampler2D stationReflectionMap;uniform mat4 stationReflectionMatrix;uniform float stationReflectionReady,stationGlassZ;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
    vec3 originalGlass=texture2D(map,vMapUv).rgb;
    float glassMask=step(.812,vMapUv.x)*step(.18,vMapUv.y)*step(vMapUv.y,.32)*step(abs(stationWorld.z-stationGlassZ),.03)*step(stationWorld.y,2.3)*smoothstep(.018,.065,originalGlass.b-originalGlass.r);
    vec4 reflectedCoord=stationReflectionMatrix*vec4(stationWorld,1.0);vec2 ruv=reflectedCoord.xy/reflectedCoord.w;
    float valid=step(0.,ruv.x)*step(ruv.x,1.)*step(0.,ruv.y)*step(ruv.y,1.)*stationReflectionReady;
    vec3 reflection=texture2D(stationReflectionMap,clamp(ruv,vec2(.001),vec2(.999))).rgb;
    float fresnel=.06+.70*pow(1.-abs(normalize(cameraPosition-stationWorld).z),5.);
    vec3 glass=vec3(.004,.006,.008)+reflection*valid*(.18+fresnel)*.8;
    outgoingLight=mix(outgoingLight,glass,glassMask);
    #include <opaque_fragment>`);
  };
  mat.customProgramCacheKey=()=> 'station-numbers-and-dark-reflecting-windows-v28';mat.needsUpdate=true;
 }
 if(stationReflection.windowBounds.length!==1)throw new Error('Front station windows not located');
 stationReflection.target=new THREE.WebGLRenderTarget(256,144,{type:THREE.HalfFloatType,depthBuffer:true});stationReflection.map.value=stationReflection.target.texture;
}
function renderStationReflection(time){
 const w=stationReflection;if(!w.target||time-w.last<1/12||camera.position.z>=w.z)return;
 const bounds=w.windowBounds[0],center=bounds.getCenter(new THREE.Vector3());if(camera.position.distanceTo(center)>28)return;
 camera.updateMatrixWorld();const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));if(!frustum.intersectsBox(bounds))return;
 const c=w.camera,n=new THREE.Vector3(0,0,-1),look=camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()));c.position.copy(camera.position);c.position.z=2*w.z-c.position.z;look.z=2*w.z-look.z;c.up.set(0,1,0).applyQuaternion(camera.quaternion).reflect(n);c.lookAt(look);c.near=camera.near;c.far=camera.far;c.updateMatrixWorld();c.projectionMatrix.copy(camera.projectionMatrix);
 w.matrix.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1).multiply(c.projectionMatrix).multiply(c.matrixWorldInverse);
 const plane=new THREE.Plane(n,w.z).applyMatrix4(c.matrixWorldInverse),clip=new THREE.Vector4(plane.normal.x,plane.normal.y,plane.normal.z,plane.constant),e=c.projectionMatrix.elements,q=new THREE.Vector4((Math.sign(clip.x)+e[8])/e[0],(Math.sign(clip.y)+e[9])/e[5],-1,(1+e[10])/e[14]);clip.multiplyScalar(2/clip.dot(q));e[2]=clip.x;e[6]=clip.y;e[10]=clip.z+1-.002;e[14]=clip.w;
 const oldTarget=renderer.getRenderTarget(),oldShadow=renderer.shadowMap.autoUpdate,oldFog=scene.fog,oldSky=nightSky.position.clone(),hidden=[];
 for(const o of [viewHand,rainLines,...grassCells.map(c=>c.mesh)])if(o?.visible){hidden.push(o);o.visible=false;}
 try{w.ready.value=0;w.map.value=null;renderer.shadowMap.autoUpdate=false;scene.fog=new THREE.FogExp2(0x111b22,.038);nightSky.position.copy(c.position);renderer.setRenderTarget(w.target);renderer.render(scene,c);w.ready.value=1;w.last=time;w.frames++;}
 finally{w.map.value=w.target.texture;hidden.forEach(o=>o.visible=true);nightSky.position.copy(oldSky);scene.fog=oldFog;renderer.shadowMap.autoUpdate=oldShadow;renderer.setRenderTarget(oldTarget);}
}
