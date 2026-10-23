'use strict';
// Touch overlay for Fogged: independent pointer captures allow walking, looking
// and jumping at the same time without emulating keyboard or mouse events.
class FoggedMobileControls {
 constructor({onLook,onJump,onPause,onSound}){
  this.enabled=matchMedia('(any-pointer: coarse)').matches || (navigator.maxTouchPoints>0&&innerWidth<1100) || new URLSearchParams(location.search).get('mobile')==='1';
  this.root=document.getElementById('mobile-controls');
  this.axes={x:0,y:0};this.running=false;this.active=false;
  this.joyPointer=null;this.lookPointer=null;this.lastLookX=0;this.lastLookY=0;
  this.onLook=onLook;this.onJump=onJump;this.onPause=onPause;this.onSound=onSound;
  if(!this.enabled)return;
  document.documentElement.classList.add('fogged-touch');
  const joystick=document.getElementById('mobile-joystick');
  const thumb=document.getElementById('mobile-stick');
  const look=document.getElementById('mobile-look');
  const jump=document.getElementById('mobile-jump');
  const run=document.getElementById('mobile-run');
  const pause=document.getElementById('mobile-pause');
  const sound=document.getElementById('mobile-sound');
  this.thumb=thumb;this.runButton=run;this.soundButton=sound;
  const suppress=e=>{e.preventDefault();e.stopPropagation();};
  const updateJoy=e=>{
   const r=joystick.getBoundingClientRect(),radius=Math.max(28,Math.min(r.width,r.height)*.38);
   const dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2;
   const distance=Math.hypot(dx,dy),factor=distance>radius?radius/distance:1;
   const x=dx*factor,y=dy*factor;
   this.axes.x=x/radius;this.axes.y=-y/radius;
   thumb.style.transform=`translate3d(${x}px,${y}px,0)`;
   joystick.classList.add('is-engaged');
  };
  const stopJoy=()=>{
   this.joyPointer=null;this.axes.x=0;this.axes.y=0;
   thumb.style.transform='translate3d(0,0,0)';joystick.classList.remove('is-engaged');
  };
  joystick.addEventListener('pointerdown',e=>{
   if(!this.active||this.joyPointer!==null)return;
   suppress(e);this.joyPointer=e.pointerId;
   try{joystick.setPointerCapture(e.pointerId);}catch{}updateJoy(e);
  });
  joystick.addEventListener('pointermove',e=>{if(e.pointerId!==this.joyPointer)return;suppress(e);updateJoy(e);});
  for(const kind of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(kind,e=>{
   if(e.pointerId!==this.joyPointer)return;stopJoy();
  });
  look.addEventListener('pointerdown',e=>{
   if(!this.active||this.lookPointer!==null)return;
   suppress(e);this.lookPointer=e.pointerId;this.lastLookX=e.clientX;this.lastLookY=e.clientY;
   try{look.setPointerCapture(e.pointerId);}catch{}
  });
  look.addEventListener('pointermove',e=>{
   if(e.pointerId!==this.lookPointer||!this.active)return;
   suppress(e);
   const dx=e.clientX-this.lastLookX,dy=e.clientY-this.lastLookY;
   this.lastLookX=e.clientX;this.lastLookY=e.clientY;
   this.onLook(dx,dy);
  });
  for(const kind of ['pointerup','pointercancel','lostpointercapture'])look.addEventListener(kind,e=>{
   if(e.pointerId===this.lookPointer)this.lookPointer=null;
  });
  jump.addEventListener('pointerdown',e=>{
   if(!this.active)return;suppress(e);jump.classList.add('is-engaged');
   this.onJump();try{jump.setPointerCapture(e.pointerId);}catch{}
  });
  for(const kind of ['pointerup','pointercancel','lostpointercapture'])jump.addEventListener(kind,()=>jump.classList.remove('is-engaged'));
  jump.addEventListener('click',e=>{if(e.detail===0&&this.active)this.onJump();});
  run.addEventListener('click',e=>{
   e.stopPropagation();if(!this.active)return;
   this.running=!this.running;run.classList.toggle('is-engaged',this.running);
   run.setAttribute('aria-pressed',String(this.running));
  });
  pause.addEventListener('click',e=>{e.stopPropagation();if(this.active)this.onPause();});
  sound.addEventListener('click',e=>{e.stopPropagation();if(this.active)this.onSound();});
 }
 setSoundMuted(muted){if(!this.enabled)return;this.soundButton.classList.toggle('is-muted',Boolean(muted));this.soundButton.setAttribute('aria-pressed',String(Boolean(muted)));this.soundButton.setAttribute('aria-label',muted?'Unmute sound':'Mute sound');}
 reset(){
  this.axes.x=0;this.axes.y=0;this.running=false;this.joyPointer=null;this.lookPointer=null;
  if(!this.enabled)return;
  this.thumb.style.transform='translate3d(0,0,0)';
  document.getElementById('mobile-joystick').classList.remove('is-engaged');
  document.getElementById('mobile-jump').classList.remove('is-engaged');
  this.runButton.classList.remove('is-engaged');this.runButton.setAttribute('aria-pressed','false');
 }
 setActive(value){this.active=Boolean(value);if(!this.active)this.reset();if(this.enabled)this.root.hidden=!this.active;}
}
if(typeof module!=='undefined'&&module.exports)module.exports=FoggedMobileControls;
