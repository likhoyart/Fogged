// Local supplied font, including Cyrillic; diagnostic data never changes UI content.
document.fonts.ready.then(()=>{
 if(!new URLSearchParams(location.search).has('debug'))return;
 const faces=Array.from(document.fonts).filter(f=>f.family.replace(/["']/g,'')==='DotGothic16');
 document.documentElement.dataset.uiFontStatus=JSON.stringify(faces.map(f=>({family:f.family,weight:f.weight,status:f.status})));
 document.documentElement.dataset.uiCyrillic=String(document.fonts.check('16px "DotGothic16"','Яркость Дождь Ёё'));
});
// Interface flicker disabled by request; no timers or wave classes.
document.documentElement.dataset.uiFlicker='off';
