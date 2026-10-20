import { useState } from 'react';
import type { Photo } from '../services/localEngine';
import { photoUrl } from '../services/localEngine';

export default function Survey({photos,active,select,isSelected,isReviewPick}:{photos:Photo[];active?:string;select:(photo:Photo)=>void;isSelected:(photo:Photo)=>boolean;isReviewPick:(photo:Photo)=>boolean}) {
  const [page,setPage]=useState(0);
  const [capacity,setCapacity]=useState(4);
  const lastPage=Math.max(0,Math.ceil(photos.length/capacity)-1);
  const current=Math.min(page,lastPage);
  return <section className="survey-mode">
    <div className="survey-toolbar"><strong>Survey</strong><select aria-label="Survey image count" value={capacity} onChange={e=>{setCapacity(Number(e.target.value));setPage(0);}}>{[4,9,16].map(count=><option key={count} value={count}>{count} photos</option>)}</select><button disabled={!current} onClick={()=>setPage(current-1)}>Previous {capacity}</button><span>{photos.length ? current*capacity+1 : 0}–{Math.min(photos.length,(current+1)*capacity)} of {photos.length}</span><button disabled={current===lastPage} onClick={()=>setPage(current+1)}>Next {capacity}</button></div>
    <div className="survey-grid" style={{gridTemplateColumns:`repeat(${Math.sqrt(capacity)},minmax(0,1fr))`}}>{photos.slice(current*capacity,(current+1)*capacity).map(photo=><button className={`${active===photo.id?'active':''} ${isSelected(photo)?'cull-selected':''} ${isReviewPick(photo)?'cull-warning':''}`} key={photo.id} onClick={()=>select(photo)} title="Open full-resolution inspection">{photo.thumbnail ? <img src={photoUrl(photo,'analysis')} alt={photo.name}/> : <p>{photo.error || 'Preparing preview...'}</p>}<strong>{photo.name}</strong>{isReviewPick(photo) && <small title={photo.selection_warnings?.join(' · ')}>Review pick</small>}<small>{photo.rating ? `${photo.rating} ★ · ` : ''}{photo.analysis ? `${photo.analysis.sharpness.toFixed(0)} sharpness · ${photo.analysis.faces.length} faces` : 'Not analyzed'}</small></button>)}</div>
    <p>Click a photo for full inspection. Survey uses lightweight analysis previews.</p>
  </section>;
}
