import {useEffect,useState} from 'react';
import type {Session} from '../services/localEngine';

type TransferStatus = {state:string;added?:number;existing?:number;failed?:number;total?:number;catalog?:string;errors?:string[]};
export default function LightroomHandoff({project,disabled,selectedIds=[]}:{project:Session;disabled:boolean;selectedIds?:string[]}) {
  const [scope,setScope]=useState<'keepers'|'selected'|'suggested'>('keepers');
  const kept=project.photos.filter(photo=>photo.decision==='keep');
  const suggestions=new Set(project.preferences.workflow==='automated'?project.recommendations:project.groups.flatMap(group=>(group.variants||[{suggested:group.suggested}]).map(variant=>variant.suggested)));
  const suggested=project.photos.filter(photo=>photo.decision!=='reject'&&suggestions.has(photo.id));
  const photos=scope==='keepers'?kept:scope==='selected'?project.photos.filter(photo=>selectedIds.includes(photo.id)):suggested;
  const key=`snapsort.lightroom.${project.id}`;
  const [job,setJob]=useState(()=>localStorage.getItem(key)||'');
  const [status,setStatus]=useState<TransferStatus>({state:'idle'});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [path,setPath]=useState('');
  const [guide,setGuide]=useState(false);
  const [waiting,setWaiting]=useState(false);
  const desktop=window.snapsortDesktop;
  useEffect(()=>{
    if(!job || !desktop) return;
    let active=true;
    let timer:ReturnType<typeof setTimeout>;
    const poll=async()=>{
      try {
        const next=await desktop.lightroomStatus(job);
        if(!active) return;
        setStatus(next);
        if(['waiting','confirming','running'].includes(next.state)) timer=setTimeout(()=>void poll(),1500);
      } catch(e) {if(active)setError(e instanceof Error?e.message:'Could not check Lightroom.');}
    };
    void poll();
    const timeout=setTimeout(()=>{if(active)setWaiting(true);},15000);
    return ()=>{active=false;clearTimeout(timer);clearTimeout(timeout);};
  },[job,desktop]);
  async function setup() {
    try {setPath(await desktop!.lightroomSetup());setGuide(true);setError('');}
    catch(e){setError(e instanceof Error?e.message:'Could not prepare the Lightroom plug-in.');}
  }
  async function send() {
    setBusy(true);setError('');setWaiting(false);
    try {
      const result=await desktop!.lightroomSend(project.id,photos.map(photo=>photo.id));
      localStorage.setItem(key,result.id);setJob(result.id);setStatus({state:'waiting'});
      if(result.launchError) {setGuide(true);setError('Lightroom could not open automatically. Open Lightroom Classic, then use Library → Plug-in Extras → Import SnapSort transfer. No photo folder needs to be selected.');}
    } catch(e){setError(e instanceof Error?e.message:'Could not prepare the transfer.');}
    finally {setBusy(false);}
  }
  const active=['waiting','confirming','running'].includes(status.state);
  return <section id="lightroom-handoff" className="lightroom-handoff" aria-label="Lightroom handoff">
    <span className="eyebrow">CONTINUE YOUR EDIT</span><h3>Add to Lightroom Classic</h3>
    <label>Photos to send<select aria-label="Lightroom photo selection" value={scope} disabled={busy||active} onChange={event=>setScope(event.target.value as typeof scope)}>
      <option value="keepers">My Keepers ({kept.length})</option>
      <option value="selected">Selected in grid ({selectedIds.length})</option>
      <option value="suggested">SnapSort suggestions ({suggested.length})</option>
    </select></label>
    <p>{photos.length} photo{photos.length===1?'':'s'} will be sent. Only this set opens in Lightroom; your shoot folder is not imported.</p>
    {!photos.length&&<small>Mark photos Keep, select frames in the grid, or choose SnapSort suggestions above.</small>}
    {!desktop ? <p>Open the SnapSort desktop app to connect Lightroom Classic.</p> : <>
      <button className="primary" disabled={disabled||busy||!photos.length||active} onClick={()=>void send()}>{busy?'Preparing transfer…':active?'Transfer in progress…':'Add to Lightroom'}</button>
      <button onClick={()=>setGuide(!guide)} aria-expanded={guide}>Setup & help</button>
      {guide&&<div className="handoff-guide"><ol>
        <li><button onClick={()=>void setup()}>Show SnapSort plug-in folder</button>{path&&<small className="folder-path">{path}</small>}</li>
        <li>In Lightroom Classic, open File → Plug-in Manager → Add. Choose the SnapSort.lrplugin folder above.</li>
        <li>Open the catalog you want to use. Return here and choose Add to Lightroom.</li>
        <li>Confirm the catalog in Lightroom. Transferred Photos opens with only the photos you sent. Do not use Lightroom’s regular Import folder dialog.</li>
        <li>If automatic opening does not work, use Library → Plug-in Extras → Import SnapSort transfer. It reads the pending selection directly; no folder or file picker is needed.</li>
      </ol><small>One-time setup for Lightroom Classic. Lightroom cloud uses a different workflow.</small></div>}
      {job&&<div role="status" aria-live="polite">
        {status.state==='waiting'&&<p>{waiting?'Waiting for Lightroom. Check that the SnapSort plug-in is enabled, then import the transfer from Library → Plug-in Extras.':'Opening Lightroom. Waiting for the SnapSort plug-in…'}</p>}
        {status.state==='confirming'&&<p>Confirm the destination catalog in Lightroom.</p>}
        {status.catalog&&<p className="folder-path" title={status.catalog}>Catalog: {status.catalog}</p>}
        {status.state==='running'&&<><progress max={status.total||1} value={(status.added||0)+(status.existing||0)+(status.failed||0)}/><p>{status.added||0} added · {status.existing||0} already in catalog · {status.failed||0} failed</p></>}
        {status.state==='complete'&&<p>{status.failed?'Transfer finished with some photos needing attention.':'Your Lightroom collections are ready.'} {status.added} added · {status.existing} already in catalog · {status.failed} failed.</p>}
        {status.state==='cancelled'&&<p>Transfer cancelled. Photos already added remain in the catalog. You can send this project again.</p>}
        {status.state==='failed'&&<p>Transfer stopped. Check the details below and retry.</p>}
        {!!status.errors?.length&&<details><summary>Photos needing attention ({status.errors.length})</summary><ul>{status.errors.map((e,i)=><li key={i}>{e}</li>)}</ul></details>}
        <button onClick={()=>void desktop.lightroomReveal(job).catch(e=>setError(String(e)))}>Show transfer file</button>
        {status.state==='waiting'&&waiting&&<button onClick={()=>{localStorage.removeItem(key);setJob('');setStatus({state:'idle'});}}>Reset waiting status</button>}
      </div>}
    </>}
    {error&&<p role="alert">{error}</p>}
  </section>;
}
