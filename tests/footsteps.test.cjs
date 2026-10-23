const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const p=path.join(__dirname,'..'),THREE=require(path.join(p,'three.min.js')),ctx=vm.createContext({THREE,console});const run=s=>vm.runInContext(s,ctx);
for(const f of ['environment.js','terrain.js'])run(fs.readFileSync(path.join(p,f),'utf8'));
assert.equal(run('footstepSurface(0,-24)'), 'asphalt');assert.equal(run('footstepSurface(-40,0)'), 'ground');assert.equal(run('footstepSurface(-14,-50)'), 'grass');
for(let z=-24;z>-29;z-=.1)assert.equal(run(`footstepSurface(0,${z})`),'asphalt');
for(let t=0;t<4;t+=.1)assert.equal(run(`footstepSurface(${-40-Math.sin(.994)*t},${-Math.cos(.994)*t})`),'ground');
const manifest=JSON.parse(fs.readFileSync(path.join(p,'footstep-manifest.json')));
for(const [surface,data] of Object.entries(manifest)){assert.equal(data.clips.length,6);for(const clip of data.clips){const b=fs.readFileSync(path.join(p,clip.file));assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.readUInt32LE(24),24000);assert.equal(b.readInt16LE(44),0);assert.equal(b.readInt16LE(b.length-2),0);assert(clip.duration<.5&&clip.sourceStart>=0&&clip.sourceStart+clip.duration<data.sourceDuration);}}
console.log('PASS: visual terrain masks select three supplied surfaces; road/path routes remain stable; 18 individual faded samples valid');
