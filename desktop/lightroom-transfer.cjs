// Data-only transfer protocol. No generated Lua, shell commands or source writes.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const encode = value => encodeURIComponent(String(value));

function manifest(project) {
  if (!project || !Array.isArray(project.photos) || !project.photos.length || project.photos.length > 20000) throw new Error('Choose a project with 1–20,000 photos.');
  const picks = new Set(project.preferences.workflow === 'automated' ? project.recommendations : project.groups.flatMap(g => (g.variants || [{suggested:g.suggested}]).map(v => v.suggested)));
  const rows = project.photos.map(photo => {
    if (!path.isAbsolute(photo.source) || /[\r\n\0]/.test(photo.source)) throw new Error('A photo has an invalid source path.');
    const category = photo.decision === 'keep' ? 'keep' : photo.decision === 'reject' ? 'reject' : picks.has(photo.id) ? photo.selection_warnings?.length ? 'review' : 'pick' : 'other';
    return [photo.source, category, photo.rating || (category==='keep'?5:category==='pick'||category==='review'?4:0)].map(encode).join('\t');
  });
  return ['SNAPSORT_TRANSFER_1', [project.id,project.name].map(encode).join('\t'), ...rows].join('\n');
}

async function createTransfer(root, project) {
  const contents = manifest(project);
  await fs.mkdir(root,{recursive:true});
  const id = crypto.randomUUID();
  const file = path.join(root,`${id}.snapsort-transfer.tsv`);
  await fs.writeFile(file,contents,{encoding:'utf8',flag:'wx'});
  return {id,file,url:`lightroom://com.snapsort.bridge/import?file=${encode(file)}`};
}

async function status(root,id) {
  if (typeof id!=='string' || !/^[a-f0-9-]{36}$/.test(id)) throw new Error('Invalid transfer identifier.');
  try {
    const data = await fs.readFile(path.join(root,`${id}.snapsort-transfer.tsv.status`),'utf8');
    const [state,added,existing,failed,total,catalog,...errors] = data.split('\n').map(line=>line.split('\t').map(decodeURIComponent));
    const result = {state:state[0],added:Number(added?.[0]),existing:Number(existing?.[0]),failed:Number(failed?.[0]),total:Number(total?.[0]),catalog:catalog?.[0]||'',errors:errors.map(row=>row.join(': '))};
    if (!['confirming','running','complete','cancelled','failed'].includes(result.state) || ![result.added,result.existing,result.failed,result.total].every(Number.isFinite)) return {state:'waiting'};
    return result;
  } catch(error) { if(error.code==='ENOENT' || error instanceof URIError) return {state:'waiting'}; throw error; }
}
module.exports = {manifest,createTransfer,status};
