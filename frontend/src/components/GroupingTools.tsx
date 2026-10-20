import {useState} from 'react';
import type {Group, Photo, Session} from '../services/localEngine';

export default function GroupingTools({project,active,group,selected,disabled,act}:{
  project:Session;active?:Photo;group?:Group;selected:Photo[];disabled:boolean;
  act:(action:string,body:object)=>void;
}) {
  const [destination,setDestination]=useState('');
  const target=project.groups.find(g=>g.id===destination&&g.id!==group?.id);
  const blocked=disabled||project.watch.enabled||!project.options.grouping;
  const edit=(operation:string,photos?:string[])=>act('groups',{operation,photos});
  return <section id="grouping-tools" className="side-section grouping-tools">
    <details><summary>Correct photo groups</summary>
      <p>Combine related moments, move a photo, or split frames that belong apart. Your Keep / Reject choices stay saved.</p>
      {project.watch.enabled&&<p>Stop folder watching before correcting groups.</p>}
      {!project.options.grouping&&<p>Enable similar-shot grouping to edit groups.</p>}
      <button disabled={blocked||selected.length<2} onClick={()=>edit('combine',selected.map(p=>p.id))}>Group selected photos ({selected.length})</button>
      {active&&group&&<>
        <label>Destination group
          <select aria-label="Destination group" value={target?.id||''} disabled={blocked} onChange={event=>setDestination(event.target.value)}>
            <option value="">Choose a group</option>
            {project.groups.map((candidate,index)=>candidate.id!==group.id&&<option key={candidate.id} value={candidate.id}>Group {index+1} · {candidate.photos.length} photos · {candidate.photos[0]?.name}</option>)}
          </select>
        </label>
        <button disabled={blocked||!target} onClick={()=>target&&edit('combine',[active.id,...target.photos.map(p=>p.id)])}>Move this photo to group</button>
        <button disabled={blocked||!target} onClick={()=>target&&edit('combine',[...group.photos,...target.photos].map(p=>p.id))}>Merge both groups</button>
        <button disabled={blocked||group.photos.length<2} onClick={()=>edit('separate',[active.id])}>Separate this photo</button>
        <button disabled={blocked||group.photos.length<2} onClick={()=>edit('separate',group.photos.map(p=>p.id))}>Split this group into individual photos</button>
      </>}
      <p><small>Manual groups stay fixed when suggestions refresh. Group undo is separate from decision undo.</small></p>
      <button disabled={disabled||project.watch.enabled||!project.can_undo_groups} onClick={()=>edit('undo')}>Undo last group change</button>
      <button disabled={disabled||project.watch.enabled||!project.has_manual_groups} onClick={()=>edit('reset')}>Restore automatic groups for this project</button>
    </details>
  </section>;
}
