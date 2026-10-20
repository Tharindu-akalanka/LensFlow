import {useState} from 'react';
import type {Session} from '../services/localEngine';
export default function WorkflowGuide({project,disabled,act,importPhotos,review}:{project:Session;disabled:boolean;act:(action:string)=>void;importPhotos:()=>void;review:(filter:string)=>void}) {
  const [expanded,setExpanded]=useState(()=>localStorage.getItem('snapsort.guide.v1')!=='seen');
  const toggle=()=>{setExpanded(!expanded);localStorage.setItem('snapsort.guide.v1','seen');};
  const busy=['running','pausing','importing'].includes(project.status);
  const picks=project.preferences.workflow==='automated'?project.recommendations.length:new Set(project.groups.flatMap(g=>(g.variants||[{suggested:g.suggested}]).map(v=>v.suggested)).filter(Boolean)).size;
  const close=project.groups.filter(g=>g.close_call).length;
  const title=!project.total?'Start with your shoot':busy?'Your shoot is taking shape':project.preview_pending?'Continue where you left off':project.pending?'Ready to find your best shots':project.analyzed?'Your shortlist is ready to review':'Some photos need attention';
  return <section className="workflow-guide" aria-label="Your next step">
    <div className="guide-heading"><div><span className="eyebrow">YOUR NEXT STEP</span><h2>{title}</h2></div><button aria-expanded={expanded} onClick={toggle}>{expanded?'Hide guide':'Help & guide'}</button></div>
    {!busy&&<div className="guide-next">
      {!project.total?<><p>Add a folder or choose photos. SnapSort prepares previews before finding similar moments.</p><button className="primary" disabled={disabled} onClick={importPhotos}>Add photos</button></>
      :project.preview_pending||project.pending?<><p>{project.analyzed?'Your progress and saved choices are here. Continue processing the remaining photos.':'Balanced settings are ready. You can adjust eye and focus checks in Culling settings.'}</p><button className="primary" disabled={disabled} onClick={()=>act(project.preview_pending?'retry':'resume')}>{project.preview_pending?'Resume preparation':project.analyzed?'Resume culling':'Find best shots'}</button></>
      :<><p>{picks} suggested picks · {project.groups.length} moments · {project.kept||project.photos.filter(p=>p.decision==='keep').length} keepers{close?` · ${close} close calls to compare`:''}</p><button onClick={()=>review('ai')}>Review SnapSort Picks</button><button onClick={()=>review('review')}>Check yellow picks</button></>}
      {!!project.failed&&<p className="guide-recovery" role="status">{project.failed} photos need attention. Available photos can still be reviewed. <button disabled={disabled} onClick={()=>act('retry')}>Retry failed photos</button></p>}
    </div>}
    {expanded&&<div className="guide-lessons">
      <div><strong>1. Find your moments</strong><p>Similar frames are grouped. Different zoom and framing options can have their own suggested pick.</p></div>
      <div><strong>2. Make the final choice</strong><p><span className="legend-green">✓ Green: suggested pick or your Keep.</span> <span className="legend-yellow">△ Yellow: check quality.</span> Blue checkmarks show photos selected for a batch action.</p></div>
      <div><strong>3. Continue editing</strong><p>Use Add to Lightroom in the side panel. The setup guide connects Lightroom Classic and keeps your selection in collections.</p></div>
      <details><summary>Preview, compare and shortcuts</summary><p>Space opens a quick preview. Arrow keys move between photos. Double-click for a full preview. Compare view links zoom and movement across both photos.</p><p>Use Ctrl/Cmd-click to select several photos, Shift-click for a range, and K / R / U to Keep / Reject / clear a decision. Ctrl/Cmd+Z undoes your last decision, including a batch.</p><p>Not chosen by SnapSort does not mean rejected. Close choices are shown for you to compare. Your decisions are saved automatically.</p></details>
    </div>}
  </section>;
}
