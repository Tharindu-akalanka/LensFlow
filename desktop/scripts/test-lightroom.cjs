const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {manifest,createTransfer,status}=require('../lightroom-transfer.cjs');
const project={id:'a'.repeat(32),name:'Portrait café',preferences:{workflow:'assisted'},groups:[{variants:[{suggested:'one'},{suggested:'two'}]}],photos:[{id:'one',source:path.resolve('photo one.jpg'),decision:'keep',rating:5},{id:'two',source:path.resolve('photo two.jpg'),decision:'undecided',selection_warnings:['Possible closed eyes']}]};
test('data protocol retains Unicode, paths and selection categories',()=>{
 const text=manifest(project);assert.match(text,/SNAPSORT_TRANSFER_1/);assert.match(text,/keep\t5/);assert.match(text,/review\t4/);assert.match(decodeURIComponent(text),/Portrait café/);
});
test('invalid source paths and empty transfers are refused',()=>{
 assert.throws(()=>manifest({...project,photos:[]}));
 assert.throws(()=>manifest({...project,photos:[{...project.photos[0],source:'../unsafe.jpg'}]}));
});
test('job status is bounded to generated transfer directory',async()=>{
 const root=await fs.mkdtemp(path.resolve(__dirname,'../.build/lightroom-test-'));
 try {
  const job=await createTransfer(root,project);
  assert.match(job.url,/^lightroom:\/\/com.snapsort.bridge\/import\?file=/);
  assert.deepEqual(await status(root,job.id),{state:'waiting'});
  await fs.writeFile(job.file+'.status','complete\n1\n1\n0\n2\nCatalog%20One');
  assert.equal((await status(root,job.id)).catalog,'Catalog One');
  await assert.rejects(status(root,'../../secrets'));
  await fs.writeFile(job.file+'.status','run');assert.equal((await status(root,job.id)).state,'waiting');
 } finally {assert.ok(path.resolve(root).startsWith(path.resolve(__dirname,'../.build')+path.sep));await fs.rm(root,{recursive:true,force:true});}
});
