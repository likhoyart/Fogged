'use strict';
// v0.6.14: flashlight and scene defaults approved from screenshots, 2026-09-12 21:51–21:52.
const LIGHT_LAB_KEY='fogged-light-lab-v2';
const lightLabDefaults={"beacon": {"brightness": 219, "density": 245, "focus": 37, "range": 238, "clarity": 45}, "street": {"brightness": 173, "density": 53, "focus": 0, "range": 38, "clarity": 55}, "flashlight": {"brightness": 238, "density": 82, "focus": 8, "range": 36, "clarity": 72}, "headlights": {"brightness": 300, "density": 247, "focus": 38, "range": 12, "clarity": 29}, "emergency": {"brightness": 97, "density": 141, "focus": 100, "range": 25, "clarity": 76, "frequency": 14, "speed": 35}};
const lightLabNames={beacon:'Маяк',street:'Столбы',flashlight:'Фонарик',scene:'Сцена',headlights:'Фары',emergency:'Мигалки',music:'Музыка',rain:'Дождь',storm:'Молния'};
const lightLabFields={brightness:{label:'Яркость',min:0,max:300,unit:'%'},density:{label:'Плотность света',min:0,max:400,unit:'%'},focus:{label:'Фокус',min:0,max:100,unit:'%'},range:{label:'Дальность',min:1,max:300,unit:'м'},clarity:{label:'Чёткость края',min:0,max:100,unit:'%'}};
const sceneLabDefaults={brightness:90,contrast:121,grain:15,vignette:78};
const sceneLabFields={brightness:{label:'Общая яркость',min:25,max:300,unit:'%'},contrast:{label:'Контраст',min:50,max:150,unit:'%'},grain:{label:'Зернистость',min:0,max:100,unit:'%'},vignette:{label:'Виньетка',min:0,max:100,unit:'%'}};
function normalizeSceneLab(input){const out={};for(const [k,s] of Object.entries(sceneLabFields)){const v=input?.[k];out[k]=typeof v==='number'&&Number.isFinite(v)?Math.max(s.min,Math.min(s.max,v)):sceneLabDefaults[k];}return out;}
let sceneLabSettings=normalizeSceneLab(null);
function applySceneLab(){post.uniforms.sceneBrightness.value=sceneLabSettings.brightness/100;post.uniforms.sceneContrast.value=sceneLabSettings.contrast/100;post.uniforms.filmGrain.value=sceneLabSettings.grain/100;post.uniforms.vignetteStrength.value=sceneLabSettings.vignette/100;const readout=document.getElementById('light-lab-feedback');if(readout)readout.textContent=lightLabSave()?'Применено · сохранено в этом браузере':'Применено · сохранение недоступно';}
const emergencyLabFields={frequency:{label:'Частота циклов',min:5,max:120,unit:'/мин'},speed:{label:'Скорость пульсации',min:25,max:300,unit:'%'}};
const rainLabDefaults={density:300,speed:200,wind:100,length:250,glass:200};
const rainLabFields={density:{label:'Количество капель',min:0,max:300,unit:'%'},speed:{label:'Скорость дождя',min:25,max:200,unit:'%'},wind:{label:'Ветер',min:-200,max:200,unit:'%'},length:{label:'Длина капель',min:25,max:250,unit:'%'},glass:{label:'Капли на экране',min:0,max:200,unit:'%'}};
lightLabDefaults.rain=rainLabDefaults;
const stormLabDefaults={brightness:180,duration:65,gap:95,interval:65};
const stormLabFields={brightness:{label:'Яркость вспышек',min:0,max:300,unit:'%'},duration:{label:'Длительность вспышки',min:30,max:180,unit:'мс'},gap:{label:'Промежуток вспышек',min:30,max:300,unit:'мс'},interval:{label:'Интервал грозы',min:15,max:180,unit:'с'}};
lightLabDefaults.storm=stormLabDefaults;
function applyStormLab(){stormDelay=Math.min(stormDelay,lightLabSettings.storm.interval);lightLabSave();}
function applyRainLab(){post.uniforms.rainStrength.value=lightLabSettings.rain.glass/100;lightLabSave();}
function lightLabSpecs(kind){if(kind==='storm')return stormLabFields;if(kind==='rain')return rainLabFields;return kind==='scene'?sceneLabFields:kind==='emergency'?{...lightLabFields,...emergencyLabFields}:lightLabFields;}
function lightLabLimits(kind,key){if(kind==='storm')return [stormLabFields[key].min,stormLabFields[key].max];if(kind==='rain')return [rainLabFields[key].min,rainLabFields[key].max];if(emergencyLabFields[key])return [emergencyLabFields[key].min,emergencyLabFields[key].max];if(kind==='scene')return [sceneLabFields[key].min,sceneLabFields[key].max];return key==='range'?({beacon:[30,300],street:[4,40],flashlight:[4,60],headlights:[4,40],emergency:[2,30]})[kind]:[lightLabFields[key].min,lightLabFields[key].max];}
function normalizeLightLabSettings(input){
 const result={};for(const kind of Object.keys(lightLabDefaults)){result[kind]={};for(const key of Object.keys(lightLabDefaults[kind])){const value=input?.[kind]?.[key],[min,max]=lightLabLimits(kind,key);result[kind][key]=typeof value==='number'&&Number.isFinite(value)?Math.max(min,Math.min(max,value)):lightLabDefaults[kind][key];}}return result;
}
let lightLabSettings=normalizeLightLabSettings(null),lightLabSelected='beacon',lightLabRoot;
try{
 const saved=JSON.parse(localStorage.getItem(LIGHT_LAB_KEY)||'null');
 if(saved){lightLabSettings=normalizeLightLabSettings(saved.settings);sceneLabSettings=normalizeSceneLab(saved.scene);if(lightLabNames[saved.selected])lightLabSelected=saved.selected;}
 else{
  const current=localStorage.getItem('fogged-light-lab-v1')||localStorage.getItem('brain-fog-light-lab-v6');
  const recent=localStorage.getItem('brain-fog-light-lab-v5')||localStorage.getItem('brain-fog-light-lab-v4');
  const previous=JSON.parse(current||recent||localStorage.getItem('brain-fog-light-lab-v3')||'null');
  if(previous){
   lightLabSettings=normalizeLightLabSettings({...previous.settings,...(current?{}:{headlights:lightLabDefaults.headlights,emergency:lightLabDefaults.emergency}),rain:rainLabDefaults});
   if(!current&&!recent)lightLabSettings.flashlight={...lightLabDefaults.flashlight};
   if(lightLabNames[previous.selected])lightLabSelected=previous.selected;
  }
  // Apply approved scene/rain once when migrating; subsequent user edits persist.
  sceneLabSettings=normalizeSceneLab(null);
  for(const kind of ['beacon','street','flashlight'])lightLabSettings[kind]={...lightLabDefaults[kind]};
 }
}catch{}

function lightLabSave(){try{localStorage.setItem(LIGHT_LAB_KEY,JSON.stringify({schema:2,settings:lightLabSettings,scene:sceneLabSettings,selected:lightLabSelected}));return true;}catch{return false;}}
function lightLabShape(kind){const p=lightLabSettings[kind];return {angle:Math.min(1.40,({beacon:.1475,street:.70,flashlight:.16,headlights:.28,emergency:.85})[kind]*Math.pow(2,(50-p.focus)/(kind==='street'||kind==='emergency'?100:50))),penumbra:Math.max(.01,1-p.clarity/100)};}
function flashlightBaseIntensity(){return 48*lightLabSettings.flashlight.brightness/100;}
function applyLightLab(){
 const b=lightLabSettings.beacon,t=lightLabSettings.flashlight,s=lightLabSettings.street,bs=lightLabShape('beacon'),ts=lightLabShape('flashlight'),ss=lightLabShape('street');
 const age=flashlightAge,ix=Math.max(0,Math.min(ELECTRICAL_EFFECT.envelope.length-1,Math.floor(age*ELECTRICAL_EFFECT.envelopeRate))),flicker=age>=0?1-.94*ELECTRICAL_EFFECT.envelope[ix]:1;
 lamp.intensity=flashlightBaseIntensity()*flicker;lamp.angle=ts.angle;lamp.penumbra=ts.penumbra;lamp.distance=t.range;lamp.shadow.camera.far=t.range;
 beaconLight.intensity=54500*b.brightness/100;beaconLight.angle=bs.angle;beaconLight.penumbra=bs.penumbra;beaconLight.distance=b.range;beaconLight.shadow.camera.far=b.range;
 beaconLens.material.color.setRGB(4*b.brightness/100,2.65*b.brightness/100,1.5*b.brightness/100);
 for(const source of streetLightSources){source.power=source.base*s.brightness/100;source.light.intensity=source.power;source.light.distance=s.range;source.light.decay=2;source.light.angle=ss.angle;source.light.penumbra=ss.penumbra;for(const m of source.bulbMaterials)m.emissiveIntensity=4.5*s.brightness/100;}
 post.uniforms.beaconTuning.value.set(b.density*b.brightness/10000,b.range,Math.tan(bs.angle),b.brightness/100);
 post.uniforms.beaconCone.value.set(Math.cos(bs.angle),Math.cos(bs.angle*(1-bs.penumbra)));
 post.uniforms.torchTuning.value.set(t.density/100,t.range,Math.cos(ts.angle),Math.cos(ts.angle*(1-ts.penumbra)));
 post.uniforms.streetTuning.value.set(s.density*s.brightness/10000,s.range,Math.cos(ss.angle),Math.cos(ss.angle*(1-ss.penumbra)));
 if(typeof applyVehicleLightLab==='function')applyVehicleLightLab();const readout=document.getElementById('light-lab-feedback');if(readout)readout.textContent=lightLabSave()?'Применено · сохранено в этом браузере':'Применено · сохранение недоступно';
}
function lightLabIsOpen(){return !!lightLabRoot&&lightLabRoot.dataset.open==='true';}
function setLightLabOpen(open){
 if(open&&typeof travelLabIsOpen==='function'&&travelLabIsOpen())setTravelLabOpen(false);
 lightLabRoot.dataset.open=String(open);document.getElementById('light-lab-toggle').setAttribute('aria-expanded',String(open));document.getElementById('light-lab-body').hidden=!open;
 keys.clear();vel.set(0,0);dragging=false;
 if(!open&&lightLabRoot.contains(document.activeElement))document.getElementById('light-lab-toggle').focus({preventScroll:true});
 if(open&&document.pointerLockElement){dragLook=true;document.exitPointerLock();}
}
function renderLightLabFields(){
 const fields=document.getElementById('light-lab-fields');fields.replaceChildren();
 const isMusic=lightLabSelected==='music';document.getElementById('lab-music').hidden=!isMusic;for(const id of ['light-lab-fields','light-lab-hint','light-lab-reset','light-lab-feedback'])document.getElementById(id).hidden=isMusic;lightLabRoot.querySelector('.light-lab-help').hidden=isMusic;for(const button of lightLabRoot.querySelectorAll('[data-source]'))button.setAttribute('aria-pressed',String(button.dataset.source===lightLabSelected));if(isMusic)return;
 const isScene=lightLabSelected==='scene',settings=isScene?sceneLabSettings:lightLabSettings[lightLabSelected],defaults=isScene?sceneLabDefaults:lightLabDefaults[lightLabSelected];
 for(const [key,spec] of Object.entries(lightLabSpecs(lightLabSelected))){
  const row=document.createElement('div');row.className='light-lab-row';const text=document.createElement('span');text.textContent=spec.label;
  const value=document.createElement('span');value.className='light-lab-value';const input=document.createElement('input');input.type='number';const [min,max]=lightLabLimits(lightLabSelected,key);Object.assign(input,{min,max,step:1,value:settings[key]});input.setAttribute('aria-label',lightLabNames[lightLabSelected]+': '+spec.label+' — значение');
  value.append(input,document.createTextNode(spec.unit));const range=document.createElement('input');range.type='range';Object.assign(range,{min,max,step:1,value:settings[key]});range.setAttribute('aria-label',lightLabNames[lightLabSelected]+': '+spec.label);
  const commit=v=>{if(!Number.isFinite(v))return;settings[key]=Math.max(min,Math.min(max,v));input.value=range.value=settings[key];if(isScene)applySceneLab();else if(lightLabSelected==='rain')applyRainLab();else if(lightLabSelected==='storm')applyStormLab();else applyLightLab();};
  range.addEventListener('input',()=>commit(+range.value));input.addEventListener('input',()=>{if(input.value!==''&&input.validity.valid)commit(input.valueAsNumber);});input.addEventListener('change',()=>commit(input.value===''?defaults[key]:input.valueAsNumber));
  row.append(text,value,range);fields.append(row);
 }
 for(const button of lightLabRoot.querySelectorAll('[data-source]'))button.setAttribute('aria-pressed',String(button.dataset.source===lightLabSelected));
 lightLabRoot.querySelector('.light-lab-help').textContent=lightLabSelected==='storm'?'Гром звучит после обеих вспышек. G — свернуть / развернуть.':lightLabSelected==='rain'?'Отрицательный ветер меняет направление. G — свернуть / развернуть.':isScene?'Настройки сцены не меняют силу отдельных источников света. G — свернуть / развернуть.':'Плотность — видимость света в воздухе. Яркость — сила источника. G — свернуть / развернуть.';
 document.getElementById('light-lab-reset').textContent=lightLabSelected==='storm'?'Сбросить молнию':lightLabSelected==='rain'?'Сбросить дождь':isScene?'Сбросить сцену':'Сбросить свет';
 document.getElementById('light-lab-hint').textContent=lightLabSelected==='storm'?'Две короткие вспышки за один удар. Интервал грозы слегка меняется, чтобы избежать повторяемости.':lightLabSelected==='rain'?'Количество, скорость, ветер и длина капель меняются в реальном времени. Громкость дождя — в меню паузы.':lightLabSelected==='emergency'?'Свет расходится от плафонов во все стороны. Фокус — концентрация свечения у источника, чёткость — мягкость внешнего затухания. Частота задаёт циклы в минуту, скорость — нарастание и затухание. Огни чередуются.':isScene?'По умолчанию: яркость 90%, контраст 121%. Яркость меняет весь кадр, контраст — различие светлых и тёмных участков.':'Больше фокус — уже конус. Больше чёткость — резче края луча и пятна.';
}
function prepareLightLab(){
 const root=lightLabRoot=document.createElement('aside');root.id='light-lab';root.dataset.open='false';root.setAttribute('aria-label','Тестовая настройка освещения');
 root.innerHTML='<button id="light-lab-toggle" type="button" aria-expanded="false" aria-controls="light-lab-body" aria-label="Тестовые настройки" title="Тестовые настройки · G"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z"/><circle cx="12" cy="12" r="3"/></svg></button><div id="light-lab-body" hidden><div class="light-lab-heading">ТЕСТОВЫЙ РЕЖИМ <span>В реальном времени</span></div><div id="light-lab-sources" role="group" aria-label="Источник света"></div><div id="light-lab-fields"></div><section id="lab-music" hidden aria-label="Музыка"></section><p id="light-lab-hint"></p><p class="light-lab-help">Плотность — видимость света в воздухе. Яркость — сила источника. G — свернуть / развернуть.</p><div class="light-lab-actions"><button type="button" id="light-lab-reset">Сбросить свет</button></div><output id="light-lab-feedback" aria-live="polite"></output></div>';
 document.body.append(root);const musicRoot=document.getElementById('lab-music');musicRoot.innerHTML=document.getElementById('music-settings').innerHTML;music.bindControls(musicRoot);
 for(const [kind,name] of Object.entries(lightLabNames)){const button=document.createElement('button');button.type='button';button.textContent=name;button.dataset.source=kind;button.addEventListener('click',()=>{lightLabSelected=kind;renderLightLabFields();lightLabSave();});document.getElementById('light-lab-sources').append(button);}
 document.getElementById('light-lab-toggle').onclick=()=>setLightLabOpen(!lightLabIsOpen());
 document.getElementById('light-lab-reset').onclick=()=>{if(lightLabSelected==='scene'){sceneLabSettings=normalizeSceneLab(null);applySceneLab();}else if(lightLabDefaults[lightLabSelected]){lightLabSettings[lightLabSelected]={...lightLabDefaults[lightLabSelected]};if(lightLabSelected==='rain')applyRainLab();else if(lightLabSelected==='storm')applyStormLab();else applyLightLab();}renderLightLabFields();};
 root.addEventListener('pointerdown',()=>{keys.clear();vel.set(0,0);dragging=false;});
 addEventListener('keydown',e=>{const form=e.target.closest?.('#light-lab input');if(e.code==='KeyG'&&!form&&!e.repeat){e.preventDefault();e.stopImmediatePropagation();setLightLabOpen(!lightLabIsOpen());}else if(e.code==='Escape'&&lightLabIsOpen()){e.preventDefault();setLightLabOpen(false);if(active||!started)e.stopImmediatePropagation();}else if(lightLabIsOpen()&&e.target.closest?.('#light-lab')){e.stopPropagation();}},true);
 renderLightLabFields();applyLightLab();applySceneLab();applyRainLab();
}
function lightLabDiagnostics(){
 const b=lightLabShape('beacon'),t=lightLabShape('flashlight');
 return {scene:{settings:{...sceneLabSettings},brightness:post.uniforms.sceneBrightness.value,contrast:post.uniforms.sceneContrast.value,grain:post.uniforms.filmGrain.value,vignette:post.uniforms.vignetteStrength.value},settings:JSON.parse(JSON.stringify(lightLabSettings)),playing:active,open:lightLabIsOpen(),beacon:{intensity:beaconLight.intensity,range:beaconLight.distance,angle:beaconLight.angle,penumbra:beaconLight.penumbra,uniform:post.uniforms.beaconTuning.value.toArray(),cone:post.uniforms.beaconCone.value.toArray()},flashlight:{intensity:lamp.intensity,range:lamp.distance,angle:lamp.angle,penumbra:lamp.penumbra,uniform:post.uniforms.torchTuning.value.toArray()},street:{count:streetLightSources.length,intensities:streetLightSources.map(s=>s.light.intensity),range:streetLightSources[0]?.light.distance,decay:streetLightSources[0]?.light.decay,angle:streetLightSources[0]?.light.angle,penumbra:streetLightSources[0]?.light.penumbra,downward:streetLightSources.every(s=>s.light.target.position.x===s.light.position.x&&s.light.target.position.z===s.light.position.z&&s.light.target.position.y<s.light.position.y),uniform:post.uniforms.streetTuning.value.toArray()},matched:Math.abs(beaconLight.angle-b.angle)<1e-9&&Math.abs(lamp.angle-t.angle)<1e-9};
}
