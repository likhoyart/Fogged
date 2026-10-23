class Ambience{
  constructor(){
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw new Error('Web Audio недоступен');
    const a=this.ctx=new Audio();this.muted=false;
    this.master=a.createGain();this.master.gain.value=0;
    const limiter=a.createDynamicsCompressor();limiter.threshold.value=-14;limiter.knee.value=12;limiter.ratio.value=5;
    this.master.connect(limiter);limiter.connect(a.destination);
    this.noise=a.createBuffer(1,a.sampleRate*3,a.sampleRate);
    const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    const impulse=a.createBuffer(2,a.sampleRate*1.7,a.sampleRate);
    for(let ch=0;ch<2;ch++){const d=impulse.getChannelData(ch);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,3)*.45;}
    this.buses={};this.verbs={};
    for(const name of ['steps','thunder','rain','ambience','electrical']){
      const bus=a.createGain();bus.gain.value=+$(name+'Volume').value;bus.connect(this.master);this.buses[name]=bus;
      if(['steps','thunder','ambience'].includes(name)){const verb=a.createConvolver(),wet=a.createGain();verb.buffer=impulse;wet.gain.value=name==='steps'?.07:.18;verb.connect(wet);wet.connect(bus);this.verbs[name]=verb;}
    }
    const src=a.createBufferSource();src.buffer=this.noise;src.loop=true;
    const filter=a.createBiquadFilter();filter.type='lowpass';filter.frequency.value=420;filter.Q.value=.5;
    const hp=a.createBiquadFilter();hp.type='highpass';hp.frequency.value=38;
    const wind=a.createGain();wind.gain.value=.18;
    src.connect(filter);filter.connect(hp);hp.connect(wind);wind.connect(this.buses.ambience);
    const rain=a.createBiquadFilter(),rainLevel=a.createGain();rain.type='bandpass';rain.frequency.value=1800;rain.Q.value=.4;rainLevel.gain.value=.033;src.connect(rain);rain.connect(rainLevel);rainLevel.connect(this.buses.rain);
    const lfo=a.createOscillator(),depth=a.createGain();lfo.frequency.value=.071;depth.gain.value=.07;
    lfo.connect(depth);depth.connect(wind.gain);
    const gust=a.createOscillator(),gd=a.createGain();gust.frequency.value=.043;gd.gain.value=210;
    gust.connect(gd);gd.connect(filter.frequency);src.start();lfo.start();gust.start();
    this.next=10+Math.random()*10;
    this.flashOffset=0;this.flashPaused=false;this.flashRunning=false;
    const bytes=Uint8Array.from(atob(ELECTRICAL_EFFECT.data),c=>c.charCodeAt(0));
    this.electricalReady=a.decodeAudioData(bytes.buffer).then(buffer=>{this.electricalBuffer=buffer;}).catch(error=>{console.error('Electrical recording could not be decoded',error);});
  }
  outputTime(){
    const a=this.ctx,stamp=a.getOutputTimestamp?.();
    if(stamp&&stamp.contextTime>0&&stamp.performanceTime>0)return Math.min(a.currentTime,stamp.contextTime+Math.max(0,performance.now()-stamp.performanceTime)/1000);
    return Math.max(0,a.currentTime-(a.outputLatency||0));
  }
  playFlashlight(offset){
    if(!this.electricalBuffer)return;
    const source=this.ctx.createBufferSource();source.buffer=this.electricalBuffer;source.connect(this.buses.electrical);
    this.flashStartedAt=this.ctx.currentTime+.035-offset;this.flashOffset=offset;this.flashRunning=true;this.flashPaused=false;this.flashSource=source;
    source.start(this.ctx.currentTime+.035,offset);source.onended=()=>source.disconnect();
  }
  startFlashlight(){this.flashSource?.stop();this.playFlashlight(0);}
  flashlightTime(){return this.flashPaused?this.flashOffset:Math.max(0,this.outputTime()-this.flashStartedAt);}
  pauseFlashlight(){
    if(!this.flashRunning)return;
    this.flashOffset=Math.min(ELECTRICAL_EFFECT.duration,this.flashlightTime());
    this.flashSource?.stop();this.flashSource=null;this.flashPaused=true;
    if(this.flashOffset>=ELECTRICAL_EFFECT.duration)this.flashRunning=false;
  }
  resumeFlashlight(){if(this.flashRunning&&this.flashPaused)this.playFlashlight(this.flashOffset);}
  mix(name,value){this.buses[name].gain.setTargetAtTime(Math.max(0,Math.min(1,value)),this.ctx.currentTime,.025);}
  level(active){const a=this.ctx;this.master.gain.setTargetAtTime(active&&!this.muted?+$('volume').value:0,a.currentTime,.18);}
  listener(){
    const l=this.ctx.listener,p=camera.position,f=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion),u=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion);
    if(l.positionX){for(const [key,v] of Object.entries({positionX:p.x,positionY:p.y,positionZ:p.z,forwardX:f.x,forwardY:f.y,forwardZ:f.z,upX:u.x,upY:u.y,upZ:u.z}))l[key].value=v;}
    else{l.setPosition(p.x,p.y,p.z);l.setOrientation(f.x,f.y,f.z,u.x,u.y,u.z);}
  }
  sound(kind,position){
    const a=this.ctx,t=a.currentTime,duration=kind===0?3.6:kind===1?1.8:kind===2?1.4:.16;
    const envelope=a.createGain(),pan=a.createPanner();pan.panningModel='HRTF';pan.distanceModel='inverse';pan.refDistance=6;pan.rolloffFactor=.8;
    pan.positionX.value=position.x;pan.positionY.value=position.y;pan.positionZ.value=position.z;
    const channel=kind===3?'steps':'ambience';envelope.connect(pan);pan.connect(this.buses[channel]);pan.connect(this.verbs[channel]);
    const peak=kind===0?.085:kind===1?.075:kind===2?.16:.28;
    envelope.gain.setValueAtTime(0,t);envelope.gain.linearRampToValueAtTime(peak,t+(kind===0?.55:kind===3?.025:.12));
    envelope.gain.exponentialRampToValueAtTime(.0001,t+duration);envelope.gain.linearRampToValueAtTime(0,t+duration+.04);
    const nodes=[envelope,pan],sources=[];
    if(kind===0||kind===1){
      for(const ratio of [1,1.47,2.13]){
        const o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.setValueAtTime((kind===0?175:330)*ratio,t);
        o.frequency.exponentialRampToValueAtTime((kind===0?112:245)*ratio,t+duration);
        g.gain.value=1/(ratio*5);o.connect(g);g.connect(envelope);nodes.push(o,g);sources.push(o);
        if(kind===0){const vibrato=a.createOscillator(),v=a.createGain();vibrato.frequency.value=7.3;v.gain.value=ratio*4;vibrato.connect(v);v.connect(o.frequency);nodes.push(vibrato,v);sources.push(vibrato);}
      }
    }else{
      const o=a.createBufferSource(),f=a.createBiquadFilter();o.buffer=this.noise;f.type='lowpass';f.frequency.value=kind===3?480:145;
      o.connect(f);f.connect(envelope);nodes.push(o,f);sources.push(o);
      if(kind===2){const sub=a.createOscillator();sub.frequency.setValueAtTime(66,t);sub.frequency.exponentialRampToValueAtTime(31,t+duration);sub.connect(envelope);nodes.push(sub);sources.push(sub);}
    }
    for(const s of sources){s.start(t);s.stop(t+duration+.05);}
    // onended освобождает временные узлы даже при долгой игровой сессии.
    sources[0].onended=()=>nodes.forEach(n=>n.disconnect());
  }
  thunder(){
    const a=this.ctx,t=a.currentTime,duration=6.5,source=a.createBufferSource(),filter=a.createBiquadFilter(),gain=a.createGain(),pan=a.createStereoPanner();
    source.buffer=this.noise;source.loop=true;filter.type='lowpass';filter.frequency.setValueAtTime(700,t);filter.frequency.exponentialRampToValueAtTime(75,t+duration);
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.85,t+.10);gain.gain.exponentialRampToValueAtTime(.24,t+1.1);gain.gain.exponentialRampToValueAtTime(.001,t+duration);
    pan.pan.value=.35;source.connect(filter);filter.connect(gain);gain.connect(pan);pan.connect(this.buses.thunder);gain.connect(this.verbs.thunder);
    source.start(t);source.stop(t+duration);source.onended=()=>[source,filter,gain,pan].forEach(n=>n.disconnect());
  }
  update(dt){this.listener();this.next-=dt;if(this.next<=0){
    const angle=Math.random()*Math.PI*2,r=10+Math.random()*7;
    this.sound(Math.floor(Math.random()*3),new THREE.Vector3(camera.position.x+Math.sin(angle)*r,1.2,camera.position.z+Math.cos(angle)*r));
    this.next=13+Math.random()*23;
  }}
}

