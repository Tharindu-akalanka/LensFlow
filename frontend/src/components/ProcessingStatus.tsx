import { useState } from 'react';
import { AlertTriangle, Check, ChevronDown, Image, Layers, Pause, Play, Sparkles } from 'lucide-react';
import { photoUrl } from '../services/localEngine';
import type { Session } from '../services/localEngine';
import './ProcessingStatus.css';

export default function ProcessingStatus({ project, submitting, disabled, act }: {
  project: Session;
  submitting: boolean;
  disabled: boolean;
  act: (action: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const preparing = project.status === 'importing';
  const analyzing = project.status === 'running' || project.status === 'pausing';
  const pausing = project.status === 'pausing';
  const paused = !submitting && !preparing && !analyzing && project.preview_pending > 0;
  const busy = submitting || preparing || analyzing;
  const failures = analyzing ? project.failed : project.import_errors;
  const ready = analyzing ? project.analyzed : project.imported;
  const processed = Math.min(project.total, ready + failures);
  const percent = project.total ? Math.round(processed / project.total * 100) : 0;
  const groups = project.groups.filter(group => group.photos.some(photo => photo.analysis)).length;
  const title = submitting ? 'Bringing your shoot into SnapSort'
    : pausing ? 'Saving progress before pausing'
    : paused ? 'Your shoot is waiting for you'
    : preparing ? 'Making your photos ready to review'
    : analyzing ? 'Finding the strongest moments'
    : project.import_errors ? 'Some previews need attention'
    : 'Your previews are ready';
  const description = submitting ? 'Checking your chosen files and adding them to this project.'
    : pausing ? 'Finishing the current photos. You can continue from here later.'
    : paused ? 'Prepared previews are saved. Resume whenever you are ready.'
    : preparing ? 'Creating clear, lightweight previews so browsing your shoot feels fast and smooth.'
    : analyzing ? `${project.options.faces && project.mode !== 'fast' ? 'Checking focus, eyes and lighting' : 'Checking focus and lighting'}, while finding nearby shots with similar scenes and framing.`
    : project.import_errors ? 'Available previews are saved. Retry the photos that could not be prepared.'
    : 'Take a look at your photos, choose your culling settings, then start finding your best shots.';
  const steps = [
    { label: 'Import shoot', detail: submitting ? 'Checking your chosen files' : `${project.total} photos in this project`, icon: Image, state: submitting ? 'active' : 'done' },
    { label: 'Prepare previews', detail: `${project.imported} ready${project.import_errors ? ` · ${project.import_errors} need retry` : ''}`, icon: Image, state: submitting ? 'waiting' : preparing || paused ? 'active' : project.import_errors ? 'attention' : 'done' },
    { label: 'Check photo quality', detail: project.analyzed ? `${project.analyzed} analyzed${project.failed ? ` · ${project.failed} failed` : ''}` : 'Starts when you begin culling', icon: Sparkles, state: analyzing ? 'active' : project.analyzed && !project.pending ? 'done' : 'waiting' },
    { label: project.options.grouping ? 'Build shot groups' : 'Individual photo picks', detail: !project.options.grouping ? `${project.analyzed} individual candidates` : groups ? `${groups} group${groups === 1 ? '' : 's'} from analyzed photos` : project.options.grouping ? 'Match similar scenes and framing' : 'Similar-shot grouping is off', icon: Layers, state: analyzing && project.analyzed ? 'active' : project.analyzed && !project.pending ? 'done' : 'waiting' },
  ];
  const action = busy ? 'pause' : paused || project.import_errors ? 'retry' : 'resume';
  const actionLabel = preparing ? 'Pause preparation' : analyzing ? 'Pause culling' : paused ? 'Resume preparation' : project.import_errors ? 'Retry failed previews' : 'Start Culling';

  return <section className={`processing-status ${busy ? 'is-processing' : 'is-ready'}`} aria-label="Shoot preparation progress" aria-busy={busy}>
    <div className="processing-hero">
      <div className="processing-emblem">{busy ? <Sparkles size={27}/> : paused ? <Pause size={27}/> : failures ? <AlertTriangle size={27}/> : <Check size={27}/>}</div>
      <div className="processing-intro">
        <span className="processing-eyebrow">{submitting ? 'IMPORTING YOUR SHOOT' : analyzing ? 'LOCAL PHOTO CULLING' : 'YOUR SHOOT, GETTING READY'}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <button className="processing-collapse" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} aria-label={expanded ? 'Hide processing details' : 'Show processing details'}>
        <ChevronDown size={18} className={expanded ? 'expanded' : ''}/>
      </button>
    </div>
    <div className="processing-progress-summary" role="status" aria-live="polite">
      <span>{submitting ? 'Registering your photos…' : `${ready} / ${project.total} ${analyzing ? 'analyzed' : 'previews ready'}`}</span>
      <strong>{submitting ? 'Getting started' : `${percent}% processed`}</strong>
    </div>
    {submitting ? <div className="processing-track indeterminate" aria-label="Checking imported files"><span/></div> :
      <div className="processing-track" role="progressbar" aria-label={analyzing ? 'Photo analysis' : 'Preview preparation'} aria-valuemin={0} aria-valuemax={project.total || 1} aria-valuenow={processed} aria-valuetext={`${ready} ready, ${failures} failed, out of ${project.total}`}><span style={{width:`${percent}%`}}/></div>}
    {expanded && <>
      <div className="processing-steps">{steps.map(step => <div key={step.label} className={`processing-step ${step.state}`}>
        <span className="processing-step-icon">{step.state === 'done' ? <Check size={15}/> : <step.icon size={15}/>}</span>
        <strong>{step.label}</strong><small>{step.detail}</small>
      </div>)}</div>
      <div className="processing-contact-sheet" aria-label="Your previews as they become ready">
        {Array.from({length:6}, (_, index) => {
          const photo = project.photos[index];
          return <div className={`processing-preview ${photo?.thumbnail ? 'ready' : photo?.status === 'error' ? 'failed' : photo && busy ? 'pending' : 'empty'}`} key={photo?.id || index}>
            {photo?.thumbnail ? <img src={photoUrl(photo,'thumbnail')} alt={photo.name} draggable={false}/> : photo?.status === 'error' ? <AlertTriangle size={22}/> : <Image size={22}/>}
            <span>{photo?.thumbnail ? <Check size={10}/> : photo?.status === 'error' ? '!' : photo ? index + 1 : '—'}</span>
          </div>;
        })}
        <div className="processing-preview-caption">{analyzing ? 'Your previews are ready. Quality hints and groups update as photos are analyzed.' : 'Previews appear here as they are prepared. Your original files stay untouched.'}</div>
      </div>
    </>}
    {!!failures && <p className="processing-warning" role="status">{failures} {analyzing ? 'photos could not be analyzed' : 'previews need attention'}. Completed photos are saved; failed photos can be retried.</p>}
    <footer className="processing-footer">
      <span><span className="processing-local-dot"/> Processing on your device{project.elapsed > 0 ? ` · ${Math.round(project.elapsed)}s processing time` : ''}</span>
      {!submitting && <button disabled={disabled || pausing} onClick={() => act(action)}>{busy ? <Pause size={13}/> : <Play size={13}/>} {pausing ? 'Pausing…' : actionLabel}</button>}
    </footer>
  </section>;
}
