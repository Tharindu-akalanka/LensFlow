/* Integration check of the frozen engine: no system Python is launched. */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const packaged = process.argv.includes('--packaged');
const resources = path.join(root, 'desktop/release/win-unpacked/resources');
const executable = packaged ? path.join(resources, 'engine/lensflow-engine.exe') : path.join(root, 'desktop/engine/lensflow-engine/lensflow-engine.exe');
const model = packaged ? path.join(resources, 'models/face_landmarker.task') : path.join(root, 'local-engine/models/face_landmarker.task');
const frontend = packaged ? path.join(resources, 'frontend') : path.join(root, 'frontend/dist');
const data = path.join(root, 'desktop/.build', `verify-${crypto.randomUUID()}`);
const token = crypto.randomBytes(24).toString('hex');
const child = spawn(executable, ['--port', '0', '--data', data, '--model', model, '--frontend', frontend], { windowsHide: true, stdio: ['ignore','pipe','pipe'], env: { ...process.env, LENSFLOW_ENGINE_TOKEN: token } });
let origin;
let stderr = '';
child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-5000); });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function api(route, body) {
  const response = await fetch(`${origin}/api${route}`, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, ...(body ? {'Content-Type':'application/json'} : {}) }, ...(body ? {body:JSON.stringify(body)} : {}), signal: AbortSignal.timeout(10000) });
  const json = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(json));
  return json;
}
async function until(id, status) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    const project = await api(`/sessions/${id}`);
    if (project.status === status) return project;
    await delay(150);
  }
  throw new Error(`Project did not reach ${status}`);
}
(async () => {
  try {
    origin = await new Promise((resolve, reject) => {
      let stdout = '';
      const timer = setTimeout(() => reject(new Error(`Frozen engine startup timed out: ${stderr}`)), 60000);
      child.stdout.on('data', chunk => { stdout += chunk; const match=stdout.match(/LensFlow local: (http:\/\/127\.0\.0\.1:\d+)/); if (match) {clearTimeout(timer);resolve(match[1]);} });
      child.once('error', error => {clearTimeout(timer);reject(error);});
      child.once('exit', code => {clearTimeout(timer);reject(new Error(`Frozen engine exited (${code}): ${stderr}`));});
    });
    assert.equal((await api('/health')).model_ready, true);
    assert.equal((await fetch(`${origin}/api/health`)).status, 403);
    const { id } = await api('/sessions', { name:'Desktop bundle verification', mode:'detailed' });
    assert.equal((await api(`/sessions/${id}`)).total, 0);
    const fixture = path.join(root, 'local-engine/.local-data/QA sample shoot');
    const source = path.join(data,'shoot');
    fs.mkdirSync(source,{recursive:true});
    for(const name of fs.readdirSync(fixture)) if(/\.jpg$/i.test(name)) fs.copyFileSync(path.join(fixture,name),path.join(source,name));
    if (!fs.existsSync(source)) throw new Error('Prepare the optional QA shoot before running the bundle verification.');
    await api(`/sessions/${id}/import`, { folder: source });
    let project = await until(id, 'previews_ready');
    assert.equal(project.imported, 5);
    assert.equal(project.completed, 0);
    assert.equal(project.analyzed, 0);
    assert.equal(project.failed, 0);
    const cameraPhoto = project.photos.find(p=>p.name==='sample-3.jpg');
    assert.equal(cameraPhoto.source_format, 'MPO');
    assert.ok(cameraPhoto.thumbnail);
    const cameraOriginal = await fetch(`${origin}/api/photos/${cameraPhoto.id}/original`, {headers:{Authorization:`Bearer ${token}`}}).then(r=>r.arrayBuffer());
    assert.deepEqual(Buffer.from(cameraOriginal), fs.readFileSync(path.join(source,'sample-3.jpg')));
    await api(`/sessions/${id}/resume`, {});
    project = await until(id, 'complete');
    assert.equal(project.failed, 0);
    assert.equal(project.groups.length, 2);
    await api(`/sessions/${id}/preferences`,{preferences:{...project.preferences,workflow:'automated',target:0}});
    const groupedPicks=await api(`/sessions/${id}`);
    assert.equal(groupedPicks.recommendation_count,2);
    assert.equal(groupedPicks.recommendation_summary.additional_from_groups,0);
    await api(`/sessions/${id}/groups`,{operation:'combine',photos:project.photos.map(p=>p.id)});
    assert.equal((await api(`/sessions/${id}`)).groups.length,1);
    await api(`/sessions/${id}/groups`,{operation:'undo'});
    assert.equal((await api(`/sessions/${id}`)).groups.length,2);
    const photo = project.photos.find(photo => photo.name==='sample-1.jpg');
    assert.equal(photo.analysis.face_status, 'analyzed');
    assert.equal(photo.analysis.aesthetics.status,'available');
    assert.ok(photo.analysis.aesthetics.score>=1 && photo.analysis.aesthetics.score<=10);
    assert.equal(photo.analysis.local_descriptors,undefined);
    assert.ok(photo.analysis.faces.length >= 2);
    const original = await fetch(`${origin}/api/photos/${photo.id}/original`, {headers:{Authorization:`Bearer ${token}`}}).then(response=>response.arrayBuffer());
    assert.deepEqual(Buffer.from(original), fs.readFileSync(path.join(source,'sample-1.jpg')));
    await api(`/sessions/${id}/decision`, {photo:photo.id,decision:'keep'});
    await api(`/sessions/${id}/options`, {options:{grouping:false,faces:true,alternatives:false}});
    project=await api(`/sessions/${id}`);
    assert.equal(project.groups.length,5);
    assert.equal(project.photos.find(p=>p.id===photo.id).decision,'keep');
    await api(`/sessions/${id}/undo`,{});
    assert.equal((await api(`/sessions/${id}`)).photos.find(p=>p.id===photo.id).decision,'undecided');
    await api(`/sessions/${id}/rating`,{photo:photo.id,rating:5,label:'Green'});
    let preferences=(await api(`/sessions/${id}`)).preferences;
    await api(`/sessions/${id}/preferences`,{preferences:{...preferences,workflow:'automated',target:2,auto_xmp:true}});
    project=await api(`/sessions/${id}`);
    assert.equal(project.recommendation_count,2);
    assert.equal(project.recommendation_summary.shortfall,0);
    const sidecar=path.join(source,'sample-1.xmp');
    const xmpDeadline=Date.now()+10000;
    while(!fs.existsSync(sidecar) && Date.now()<xmpDeadline) await delay(100);
    assert.match(fs.readFileSync(sidecar,'utf8'),/Rating="5"/);
    assert.match(fs.readFileSync(sidecar,'utf8'),/Label="Green"/);
    assert.equal((await api(`/sessions/${id}/xmp`,{})).failed,0);
    const {id:liveId}=await api('/sessions',{name:'Watched folder verification',mode:'fast'});
    const liveFolder=path.join(data,'live');fs.mkdirSync(liveFolder);
    await api(`/sessions/${liveId}/watch`,{watch:{enabled:true,folder:liveFolder,auto_cull:true}});
    fs.copyFileSync(path.join(source,'sample-1.jpg'),path.join(liveFolder,'live-shot.jpg'));
    const liveProject=await until(liveId,'complete');assert.equal(liveProject.total,1);
    await api(`/sessions/${liveId}/watch`,{watch:{enabled:false,folder:liveFolder,auto_cull:true}});
    const rawNames=['public-sample.cr3','public-sample.arw','iss030e122639.NEF'];
    const rawPaths=rawNames.map(name=>path.join(root,'local-engine/.local-data/raw-fixtures',name));
    let realRawVerified=false;
    if(rawPaths.every(name=>fs.existsSync(name))) {
      const checksums=rawPaths.map(name=>crypto.createHash('sha256').update(fs.readFileSync(name)).digest('hex'));
      const {id:rawId}=await api('/sessions',{name:'Real RAW preview verification',mode:'fast'});
      await api(`/sessions/${rawId}/import`,{files:rawPaths});
      let rawProject=await until(rawId,'previews_ready');
      assert.equal(rawProject.imported,3);assert.equal(rawProject.failed,0);
      assert.ok(rawProject.photos.every(p=>p.preview_basis==='embedded_jpeg' && p.captured_at));
      await api(`/sessions/${rawId}/resume`,{});rawProject=await until(rawId,'complete');
      assert.equal(rawProject.analyzed,3);
      assert.ok(rawProject.photos.every(p=>p.analysis.embedding_provider!=='not_loaded'));
      assert.deepEqual(rawPaths.map(name=>crypto.createHash('sha256').update(fs.readFileSync(name)).digest('hex')),checksums);
      realRawVerified=true;
    }
    console.log(JSON.stringify({frozenEngine:true,packaged,imported:5,groups:2,detectedFaces:photo.analysis.faces.length,originalBytesPreserved:true,authRequired:true,projectFlow:'passed',cameraMpoPreview:true,xmp:true,target:2,watchedImport:true,realRawVerified}));
  } catch(error) { console.error(error, stderr); process.exitCode=1; }
  finally {
    if(origin) { try {await api('/shutdown',{});} catch {} }
    await Promise.race([new Promise(resolve=>child.once('exit',resolve)),delay(5000)]);
    if(child.exitCode===null) child.kill();
  }
})();
