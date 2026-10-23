'use strict';
let travelLabRoot=null;
function travelLabIsOpen(){return travelLabRoot?.dataset.open==='true';}
function setTravelLabOpen(open){
 if(!travelLabRoot)return;travelLabRoot.dataset.open=String(open);$('travel-lab-body').hidden=!open;$('travel-lab-toggle').setAttribute('aria-expanded',String(open));keys.clear();vel.set(0,0);dragging=false;
 if(open){if(lightLabIsOpen())setLightLabOpen(false);if(document.pointerLockElement){dragLook=true;document.exitPointerLock();}}
 else $('travel-lab-toggle').focus({preventScroll:true});
}
function travelTo(value){
 const [x,z,a,look]=JSON.parse(value);if(![x,z,a,look].every(Number.isFinite))return;
 keys.clear();vel.set(0,0);feet=0;verticalVelocity=0;grounded=true;jumpRequested=false;landingKick=0;stride=0;bob=0;dragging=false;
 camera.position.set(x,1.7,z);yaw=a;pitch=look;camera.rotation.set(pitch,yaw,0,'YXZ');cornLast=null;updatePauseMap();updateTreeVisibility();
 $('inspection').value=value;setTravelLabOpen(false);
}
function prepareTravelLab(){
 const select=$('inspection');if(!select)return;const root=travelLabRoot=document.createElement('aside');root.id='travel-lab';root.dataset.open='false';root.setAttribute('aria-label','Quick travel');
 root.innerHTML='<button type="button" id="travel-lab-toggle" aria-label="Quick travel" title="Quick travel · T" aria-expanded="false" aria-controls="travel-lab-body"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15"/></svg></button><div id="travel-lab-body" hidden><h2>Quick travel</h2><p>Choose a location · T — collapse / expand</p><div id="travel-lab-places"></div><details><summary>All inspection points</summary><div id="travel-lab-all"></div></details></div>';
 document.body.append(root);
 const names=['Junction','Fire station','Fire engine front','Shops','Warehouse','Warehouse interior','Forest','Forest gate','Lighthouse','Cornfield entrance','Cornfield interior','Cornfield far edge','Parking','Puddles','Broken bicycle','Forest props'];
 for(const name of names){const opt=Array.from(select.options).find(o=>o.dataset.travelName===name);if(!opt)continue;const b=document.createElement('button');b.type='button';b.textContent=name;b.onclick=()=>travelTo(opt.value);$('travel-lab-places').append(b);}
 $('travel-lab-all').append(select);select.onchange=()=>travelTo(select.value);$('travel-lab-toggle').onclick=()=>setTravelLabOpen(!travelLabIsOpen());
 root.addEventListener('pointerdown',()=>{keys.clear();vel.set(0,0);dragging=false;});
 addEventListener('keydown',e=>{if(e.target.closest?.('input,textarea,[contenteditable=true]'))return;if(e.code==='KeyT'&&!e.repeat){e.preventDefault();e.stopImmediatePropagation();setTravelLabOpen(!travelLabIsOpen());}else if(e.code==='Escape'&&travelLabIsOpen()){e.preventDefault();e.stopImmediatePropagation();setTravelLabOpen(false);}else if(travelLabIsOpen()&&e.target.closest?.('#travel-lab')){e.stopImmediatePropagation();}},true);
}
