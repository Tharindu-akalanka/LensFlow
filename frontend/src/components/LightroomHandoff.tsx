import {useEffect,useState} from 'react';
import type {Session} from '../services/localEngine';

type TransferStatus = {state:string;added?:number;existing?:number;failed?:number;total?:number;catalog?:string;errors?:string[]};
export default function LightroomHandoff({project,disabled}:{project:Session;disabled:boolean}) {
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
      const result=await desktop!.lightroomSend(project.id);
      localStorage.setItem(key,result.id);setJob(result.id);setStatus({state:'waiting'});
      if(result.launchError) {setGuide(true);setError('Lightroom could not open automatically. Open Lightroom Classic, then use Library → Plug-in Extras → Import SnapSort transfer.');}
    } catch(e){setError(e instanceof Error?e.message:'Could not prepare the transfer.');}
    finally {setBusy(false);}
  }
  const active=['waiting','confirming','running'].includes(status.state);
  return <section id="lightroom-handoff" className="lightroom-handoff" aria-label="Lightroom handoff">
    <span className="eyebrow">CONTINUE YOUR EDIT</span><h3>Add to Lightroom Classic</h3>
    <p>Send all {project.total} photos with collections for your picks, keepers and photos needing review.</p>
    {!desktop ? <p>Open the SnapSort desktop app to connect Lightroom Classic.</p> : <>
      <button className="primary" disabled={disabled||busy||!project.total||active} onClick={()=>void send()}>{busy?'Preparing transfer…':active?'Transfer in progress…':'Add to Lightroom'}</button>
      <button onClick={()=>setGuide(!guide)} aria-expanded={guide}>Setup & help</button>
      {guide&&<div className="handoff-guide"><ol>
        <li><button onClick={()=>void setup()}>Show SnapSort plug-in folder</button>{path&&<small className="folder-path">{path}</small>}</li>
        <li>In Lightroom Classic, open File → Plug-in Manager → Add. Choose the SnapSort.lrplugin folder above.</li>
        <li>Open the catalog you want to use. Return here and choose Add to Lightroom.</li>
        <li>Confirm the catalog in Lightroom. Your SnapSort collections appear when the transfer finishes.</li>
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
