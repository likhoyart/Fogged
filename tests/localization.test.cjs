const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),ctx=vm.createContext({localStorage:{getItem:()=>null}});
vm.runInContext(fs.readFileSync(path.join(root,'i18n.js'),'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx),pairs=run('I18n.pairs'),t=run('I18n.translate');
for(const [en,ru] of pairs){assert.equal(t(en,'ru'),ru);assert.equal(t(ru,'en'),en);assert.equal(t(en,'en'),en);assert.equal(t(ru,'ru'),ru);}
assert.equal(t('Маяк: Яркость — значение','en'),'Beacon: Brightness — value');
assert.equal(t('Scene: Grain — value','ru'),'Сцена: Зернистость — значение');
assert.equal(t('Loading town · 07','ru'),'Загрузка города · 07');
assert.equal(t('VERSION 0.6.15 · NORTH DISTRICT','ru'),'ВЕРСИЯ 0.6.15 · СЕВЕРНЫЙ РАЙОН');
assert.equal(t('  Effects volume ','ru'),'  Громкость эффектов ');
assert.equal(t('960 × 540','ru'),'960 × 540');
// Translation never changes interactive DOM nodes or values. Exercise text node update in isolation.
let change;const el={value:'en',addEventListener:(name,fn)=>change=fn};
const text={nodeType:3,nodeValue:'Effects volume',parentElement:{closest:()=>false}};
const body={nodeType:1,matches:()=>false,hasAttribute:()=>false,childNodes:[text]};
let saved,mutations=0;
ctx.document={body,documentElement:{lang:''},querySelectorAll:()=>[el]};ctx.window={dispatchEvent:()=>{}};ctx.CustomEvent=function(){};ctx.MutationObserver=function(){this.observe=()=>mutations++;};ctx.localStorage={getItem:()=>null,setItem:(k,v)=>saved=v};
run('I18n.init()');assert.equal(text.nodeValue,'Громкость эффектов');el.value='en';change();assert.equal(saved,'en');assert.equal(text.nodeValue,'Effects volume');assert.equal(ctx.document.documentElement.lang,'en');assert.equal(mutations,1);
run('I18n.setLanguage("ru")');assert.equal(text.nodeValue,'Громкость эффектов');assert.equal(el.value,'ru');
console.log(`PASS: ${pairs.length} bilingual phrases, numeric labels, loading, language persistence and non-destructive DOM updates`);
