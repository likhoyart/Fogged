'use strict';
let junctionMarkings;
function prepareJunctionMarkings(){
 const vertices=[],indices=[];
 const stripe=(x,z,w,d)=>{const i=vertices.length/3;vertices.push(x-w/2,.024,z-d/2,x+w/2,.024,z-d/2,x+w/2,.024,z+d/2,x-w/2,.024,z+d/2);indices.push(i,i+2,i+1,i,i+3,i+2);};
 // Broken centre lines approach the junction; its turning area remains clear.
 for(const z of [-12,-8,8,12])stripe(-2,z,.12,2);
 for(const x of [9,15])stripe(x,0,2,.12);
 // Stop lines on the two incoming road lanes, set back from the turning area.
 stripe(-4,-6.2,3.2,.32);stripe(6.2,-2,.32,3.2);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const material=new THREE.MeshStandardMaterial({color:0xc9c9c2,roughness:.96,metalness:0,transparent:true,opacity:.54,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
 material.onBeforeCompile=s=>{
  s.vertexShader='varying vec2 paintWorld;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n paintWorld=(modelMatrix*vec4(position,1.)).xz;');
  s.fragmentShader='varying vec2 paintWorld;\n'+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <alphatest_fragment>',`float wear=fract(sin(dot(floor(paintWorld*110.0),vec2(12.9898,78.233)))*43758.5453);diffuseColor.a*=smoothstep(.12,.45,wear)*(.5+.5*sin(paintWorld.x*7.+paintWorld.y*11.)*sin(paintWorld.y*15.));\n#include <alphatest_fragment>`);
 };
 junctionMarkings=new THREE.Mesh(geometry,material);junctionMarkings.name='worn_junction_lane_and_stop_lines';junctionMarkings.receiveShadow=true;junctionMarkings.userData.atmosphere=true;scene.add(junctionMarkings);
}
