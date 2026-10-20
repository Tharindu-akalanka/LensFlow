import { useState } from 'react';
import type { Photo, Session, SelectionPreferences } from '../services/localEngine';
import { request } from '../services/localEngine';

export function AdvancedCulling({project, act, disabled}:{project:Session;act:(action:string,body?:object)=>void;disabled:boolean}) {
  const [target,setTarget] = useState(String(project.preferences.target));
  const [notice,setNotice] = useState('');
  const [busy,setBusy] = useState(false);
  const reviewCount = project.photos.filter(photo => project.review_recommendations?.includes(photo.id) && photo.decision !== 'keep').length;
  const change = (patch:Partial<SelectionPreferences>) => act('preferences',{preferences:{...project.preferences,...patch}});
  const watch = async () => {
    if(project.watch.enabled) { act('watch',{watch:{...project.watch,enabled:false}}); return; }
    if(!window.snapsortDesktop) { setNotice('Watched folders use the desktop folder picker.'); return; }
    const folder = await window.snapsortDesktop.chooseFolder();
    if(folder) act('watch',{watch:{folder,enabled:true,auto_cull:true}});
  };
  const exportXmp = async () => {
    setBusy(true);
    try {
      const result=await request<{written:number;failed:number;errors:{name:string;error:string}[]}>(`/sessions/${project.id}/xmp`,{});
      setNotice(`${result.written} XMP sidecars saved${result.failed ? `; ${result.failed} failed: ${result.errors[0]?.error}` : '.'}`);
    } catch(error) { setNotice(error instanceof Error ? error.message : 'XMP export failed'); }
    finally { setBusy(false); }
  };
  return <section className="advanced-culling">
    <h3>Selection workflow</h3>
    <div className="segmented">{(['assisted','automated'] as const).map(value=><button key={value} disabled={disabled} aria-pressed={project.preferences.workflow===value} onClick={()=>change({workflow:value})}>{value==='assisted'?'AI Assisted':'AI Automated'}</button>)}</div>
    <p>{project.preferences.workflow==='assisted'?'You choose every keeper. AI provides quality hints and groups.':'AI recommends a set. Your saved decisions stay independent.'}</p>
    {project.preferences.workflow==='automated' && <>
      <label>Final image target <input aria-label="Final image target" type="number" min="0" max="20000" value={target} onChange={e=>setTarget(e.target.value)} disabled={disabled}/></label>
      <button disabled={disabled || !Number.isInteger(Number(target)) || Number(target)<0 || Number(target)>20000} onClick={()=>change({target:Number(target)})}>Set Target</button>
      <small>0 = a best candidate for each framing in a moment. Exact duplicates count once.</small>
      <p>{project.recommendation_count} recommended{project.preferences.target ? ` / ${project.preferences.target} requested` : ''}. {reviewCount ? `${reviewCount} yellow picks need review to meet the target.` : 'Quality picks are green.'}</p>
    </>}
    <h3>Live shoot</h3>
    <button disabled={busy || (disabled && !project.watch.enabled)} onClick={()=>void watch()}>{project.watch.enabled?'Stop Watching Folder':'Watch Tethering Folder'}</button>
    {project.watch.enabled && <><p className="folder-path" title={project.watch.folder}>{project.watch.folder}</p><small>Stable new files are imported and analyzed automatically.</small></>}
    {project.watch_error && <p role="alert">{project.watch_error}</p>}
    <h3>Lightroom / Capture One</h3>
    <label className="option-row"><input type="checkbox" checked={project.preferences.auto_xmp} disabled={disabled} onChange={e=>change({auto_xmp:e.target.checked})}/><span>Auto-save XMP beside originals</span></label>
    {project.xmp_error && <p role="alert">XMP sync: {project.xmp_error}</p>}
    <button disabled={busy || !project.total} onClick={()=>void exportXmp()}>{busy?'Saving XMP...':'Export XMP Sidecars'}</button>
    <small>Default XMP: Keep = 5 stars / Green; Reject = Red; AI recommendation = 4 stars / Yellow. Manual stars/colors override these. Existing edits are preserved with a backup. JPEG/HEIC sidecar support depends on the editor.</small>
    {notice && <p role="status">{notice}</p>}
  </section>;
}

export function PhotoMetadata({photo,act}:{photo:Photo;act:(action:string,body?:object)=>void}) {
  return <div className="photo-metadata">
    <label>Stars <select aria-label="Photo star rating" value={photo.rating} onChange={e=>act('rating',{photo:photo.id,rating:Number(e.target.value),label:photo.label})}>{[0,1,2,3,4,5].map(n=><option key={n} value={n}>{n ? '★'.repeat(n) : 'Unrated'}</option>)}</select></label>
    {photo.decision === 'reject' && <section className="rejection-details">
      <h4>Why this photo was rejected</h4>
      <p>{photo.rejection_reason || 'Rejected by you'}</p>
      <label>Rejection reason <select aria-label="Rejection reason" value={photo.rejection_reason || 'Rejected by you'}
        onChange={event => act('decision',{photo:photo.id,decision:'reject',reason:event.target.value})}>
        {Array.from(new Set(['Rejected by you','Closed eyes','Blur or missed focus','Poor exposure','Duplicate or less preferred shot','Composition or pose','Not needed',photo.rejection_reason || 'Rejected by you'])).map(reason => <option key={reason} value={reason}>{reason}</option>)}
      </select></label>
      {!!photo.selection_warnings?.length && <><small>Detected quality issues</small><ul>{photo.selection_warnings.map(reason => <li key={reason}>{reason}</li>)}</ul></>}
    </section>}
    {photo.analysis && <p>{photo.analysis.blur_hint || 'Focus measured'} · {photo.analysis.exposure_hint?.replaceAll('_',' ') || 'Exposure measured'}</p>}
  </div>;
}
