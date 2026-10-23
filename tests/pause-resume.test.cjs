const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8');const fn=source.slice(source.indexOf('function handleGameEscape'),source.indexOf("addEventListener('keydown'",source.indexOf('function handleGameEscape')));
const state={menu:{hidden:true},enter:{disabled:false,click(){resumes++;}}};let resumes=0,pauses=0,now=1000;
const c=vm.createContext({$:(k)=>state[k],performance:{now:()=>now},document:{activeElement:{blur(){}}},leave(){pauses++;c.active=false;state.menu.hidden=false;},active:true,started:true,lastPointerUnlockAt:-Infinity});vm.runInContext(fn,c);const press=(repeat=false)=>c.handleGameEscape({repeat,preventDefault(){}});
press();assert.equal(pauses,1);press();assert.equal(resumes,1);press(true);assert.equal(resumes,1);
c.lastPointerUnlockAt=now;press();assert.equal(resumes,1,'Native unlock and same Escape must not instantly resume');now+=251;press();assert.equal(resumes,2);
c.started=false;press();assert.equal(resumes,2,'Escape cannot skip initial loading/start');c.started=true;state.enter.disabled=true;press();assert.equal(resumes,2,'No resume after a lost graphics context');
console.log('PASS: Escape pauses/resumes, ignores key repeats and same native unlock event, respects initial/loading state');
