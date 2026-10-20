const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const asar=require('@electron/asar');
const desktop=path.resolve(__dirname,'..'),root=path.dirname(desktop);
const resources=path.join(desktop,'release/win-unpacked/resources');
const archive=path.join(resources,'app.asar');
const hash=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
const pkg=JSON.parse(fs.readFileSync(path.join(desktop,'package.json')));
assert.equal(JSON.parse(asar.extractFile(archive,'package.json')).version,pkg.version);
for(const name of ['main.cjs','preload.cjs','lightroom-transfer.cjs']) assert.equal(hash(asar.extractFile(archive,name)),hash(fs.readFileSync(path.join(desktop,name))),name);
function compare(source,destination){
 for(const entry of fs.readdirSync(source,{withFileTypes:true})){
  const from=path.join(source,entry.name),to=path.join(destination,entry.name);
  if(entry.isDirectory())compare(from,to);else assert.equal(hash(fs.readFileSync(from)),hash(fs.readFileSync(to)),from);
 }
}
compare(path.join(root,'frontend/dist'),path.join(resources,'frontend'));
compare(path.join(desktop,'lightroom'),path.join(resources,'lightroom'));
for(const name of ['nima-mobilenet.onnx','aesthetic-model-source.json','aesthetic-model-license.txt'])assert.equal(hash(fs.readFileSync(path.join(root,'local-engine/models',name))),hash(fs.readFileSync(path.join(resources,'models',name))),name);
const executable=path.join(desktop,'release',`SnapSort-${pkg.version}-x64.exe`);
console.log(JSON.stringify({version:pkg.version,sourceAndResourcesMatch:true,bytes:fs.statSync(executable).size,sha256:hash(fs.readFileSync(executable))}));
