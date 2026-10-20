import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Copy,
  Flag,
  FolderOpen,
  Grid2X2,
  Image,
  Images,
  Keyboard,
  Layers,
  Library,
  PanelLeft,
  Pause,
  Play,
  Plus,
  ScanFace,
  SlidersHorizontal,
  Sparkles,
  Undo2,
  X,
} from 'lucide-react';
import SyncPreview from '../components/SyncPreview';
import Survey from '../components/Survey';
import ProcessingStatus from '../components/ProcessingStatus';
import WorkflowGuide from '../components/WorkflowGuide';
import GroupingTools from '../components/GroupingTools';
import LightroomHandoff from '../components/LightroomHandoff';
import '../components/WorkflowGuide.css';
import {AdvancedCulling, PhotoMetadata} from '../components/AdvancedCulling';
import type { Viewport } from '../components/SyncPreview';
import { photoUrl, request, SHOOT_LABELS } from '../services/localEngine';
import type {
  CullingOptions,
  ShootType,
  Decision,
  Mode,
  Photo,
  Session,
  SessionSummary,
} from '../services/localEngine';
import './Culling.css';
import './Culling.motion.css';

type View = 'grid' | 'loupe' | 'compare' | 'survey';
const EMPTY_PHOTOS: Photo[] = [];
const MODE_HELP: Record<Mode, string> = {
  fast: 'Quick grouping and sharpness. Face analysis is skipped.',
  balanced: 'Grouping, sharpness and face / eye hints.',
  detailed: 'Detailed analysis with original face crops for focus.',
};

function FaceStrip({
  photos,
  select,
}: {
  photos: Photo[];
  select: (photo: Photo, box: number[]) => void;
}) {
  return (
    <div className="face-strip">
      {photos.map((photo) => (
        <div className="face-column" key={photo.id}>
          <strong>{photo.name}</strong>
          {photo.analysis?.faces.length ? (
            photo.analysis.faces.map((face, index) => (
              <button
                key={index}
                className={`face-crop ${face.eyes}`}
                onClick={() => select(photo, face.box)}
              >
                <img
                  src={photoUrl(photo, 'face', index)}
                  alt={`Face ${index + 1} in ${photo.name}`}
                  loading="lazy"
                />
                <span>
                  Face {index + 1} · {face.eyes.replaceAll('_', ' ')}
                </span>
              </button>
            ))
          ) : (
            <small>
              {photo.analysis?.face_status === 'skipped_in_fast_mode'
                ? 'Skipped in Fast mode'
                : photo.analysis?.face_status === 'disabled_in_options'
                  ? 'Face checks disabled'
                  : photo.analysis
                    ? 'No detected faces'
                    : 'Not analyzed yet'}
            </small>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Culling() {
  const [projects, setProjects] = useState<SessionSummary[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [project, setProject] = useState<Session | null>(null);
  const [connected, setConnected] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [working, setWorking] = useState(false);
  const [importSubmitting, setImportSubmitting] = useState(false);
  const canvasScroll = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('All changes are saved locally');
  const [newProject, setNewProject] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [quickPreview, setQuickPreview] = useState(false);
  const [shootType, setShootType] = useState<ShootType>('other');
  const [newMode, setNewMode] = useState<Mode>('balanced');
  const [importModal, setImportModal] = useState(false);
  const [importPath, setImportPath] = useState('');
  const [shortcuts, setShortcuts] = useState(false);
  const [view, setView] = useState<View>('grid');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [multiSelect, setMultiSelect] = useState(false);
  const selectionAnchor = useRef<string | null>(null);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showFaces, setShowFaces] = useState(true);
  const [faceStrip, setFaceStrip] = useState(false);
  const [viewport, setViewport] = useState<Viewport>({ zoom: 1, x: 0, y: 0 });
  const previewTrigger = useRef<HTMLElement | null>(null);
  const revision = useRef(0);
  const queue = useRef<Promise<void>>(Promise.resolve());

  const refresh = useCallback(async () => {
    const current = ++revision.current;
    try {
      const [health, list, snapshot] = await Promise.all([
        request<{ model_ready: boolean }>('/health'),
        request<SessionSummary[]>('/sessions'),
        projectId
          ? request<Session>(`/sessions/${projectId}`)
          : Promise.resolve(null),
      ]);
      if (current !== revision.current) return;
      setConnected(true);
      setModelReady(health.model_ready);
      setProjects(list);
      setProject(snapshot);
    } catch (failure) {
      if (current !== revision.current) return;
      setConnected(false);
      setError(
        failure instanceof Error
          ? failure.message
          : 'The photo engine is unavailable. Restart SnapSort.',
      );
    }
  }, [projectId]);
  useEffect(() => {
    if (!quickPreview) return;
    return () => { previewTrigger.current?.focus(); };
  }, [quickPreview]);
  const invalidate = useCallback(() => {
    revision.current++;
  }, []);
  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(), 2000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
      invalidate();
    };
  }, [refresh, invalidate]);

  const openProject = (id: string) => {
    setQuickPreview(false);
    setSelectedIds(new Set());
    setMultiSelect(false);
    selectionAnchor.current = null;
    setProjectId(id);
    setProject(null);
    setGroupId(null);
    setActiveId(null);
    setCompareId(null);
    setFilter('all');
    setSearch('');
    setView('grid');
    setError('');
    setViewport({ zoom: 1, x: 0, y: 0 });
  };
  const library = () => {
    setQuickPreview(false);
    setSelectedIds(new Set());
    setProjectId(null);
    setProject(null);
    setError('');
  };

  const act = useCallback(
    (action: string, body: object = {}) => {
      if (!projectId) return;
      queue.current = queue.current.then(async () => {
        setWorking(true);
        setError('');
        try {
          await request(`/sessions/${projectId}/${action}`, body);
          setMessage(
            action === 'decision' || action === 'undo'
              ? 'Selection saved locally'
              : 'Project updated',
          );
          await refresh();
        } catch (failure) {
          setError(
            failure instanceof Error
              ? failure.message
              : 'This change could not be saved. Please retry.',
          );
        } finally {
          setWorking(false);
        }
      });
    },
    [projectId, refresh],
  );

  async function createProject(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setError('');
    try {
      const result = await request<{ id: string }>('/sessions', {
        name: projectName,
        mode: newMode,
        shoot_type: shootType,
      });
      setNewProject(false);
      setProjectName('');
      setShootType('other');
      openProject(result.id);
      setMessage('Project created. Import your shoot to begin.');
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Could not create the project',
      );
    } finally {
      setWorking(false);
    }
  }

  async function importPhotos(kind: 'photos' | 'folder') {
    if (!projectId || working) return;
    if (!window.snapsortDesktop) {
      setImportModal(true);
      return;
    }
    setWorking(true);
    setError('');
    try {
      const body =
        kind === 'folder'
          ? { folder: await window.snapsortDesktop.chooseFolder() }
          : { files: await window.snapsortDesktop.choosePhotos() };
      if (
        ('folder' in body && !body.folder) ||
        ('files' in body && !body.files?.length)
      )
        return;
      setImportSubmitting(true);
      const result = await request<{ added: number }>(
        `/sessions/${projectId}/import`,
        body,
      );
      setMessage(`${result.added} photographs added. Preparing previews...`);
      await refresh();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Could not import these photographs',
      );
    } finally {
      setImportSubmitting(false);
      setWorking(false);
    }
  }

  async function importLocalPath(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId) return;
    setWorking(true);
    setError('');
    try {
      setImportModal(false);
      setImportSubmitting(true);
      const result = await request<{ added: number }>(
        `/sessions/${projectId}/import`,
        { folder: importPath },
      );
      setImportModal(false);
      setMessage(`${result.added} photographs imported`);
      await refresh();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Could not import this folder',
      );
    } finally {
      setImportSubmitting(false);
      setWorking(false);
    }
  }

  const allPhotos = project?.photos || EMPTY_PHOTOS;
  const groups = project?.groups || [];
  const selectedGroup = groups.find((group) => group.id === groupId);
  const suggested = new Set(groups.map((group) => group.suggested));
  const closeCandidates = new Set(groups.flatMap(group=>group.close_candidates||[]));
  const aiPicks = new Set(project?.preferences.workflow === 'automated'
    ? project.recommendations : groups.flatMap(group => (group.variants || [{suggested:group.suggested}]).map(variant=>variant.suggested)));
  const isSelected = (photo: Photo) => photo.decision === 'keep' || (photo.decision !== 'reject' && aiPicks.has(photo.id));
  const isReviewPick = (photo: Photo) => photo.decision !== 'keep' && isSelected(photo) && !!photo.selection_warnings?.length;
  const visible = (selectedGroup?.photos || allPhotos).filter(
    (photo) =>
      photo.name.toLowerCase().includes(search.toLowerCase()) &&
      (filter === 'all' ||
        (filter === 'close' ? closeCandidates.has(photo.id) : filter === 'ai' ? photo.decision !== 'reject' && aiPicks.has(photo.id) : filter === 'review' ? isReviewPick(photo) : filter === 'target' ? !!project?.recommendations.includes(photo.id) : filter === 'suggested'
          ? suggested.has(photo.id)
          : photo.decision === filter)),
  );
  const active = visible.find((photo) => photo.id === activeId) || visible[0];
  const activeGroup = groups.find((group) =>
    group.photos.some((photo) => photo.id === active?.id),
  );
  const burstPhotos = activeGroup?.photos || EMPTY_PHOTOS;
  const comparison =
    burstPhotos.find(
      (photo) => photo.id === compareId && photo.id !== active?.id,
    ) ||
    burstPhotos.find(
      (photo) =>
        photo.id === activeGroup?.alternatives[0] && photo.id !== active?.id,
    ) ||
    burstPhotos.find((photo) => photo.id !== active?.id);
  const importing = project?.status === 'importing';
  const running =
    project?.status === 'running' || project?.status === 'pausing' || importing;
  const preparedGroups = groups.filter(group => group.photos.some(photo => photo.analysis));
  const showProcessing = !!project && (importSubmitting || importing || project.status === 'running' || project.status === 'pausing' || project.preview_pending > 0 || ((!project.analyzed) && (project.status === 'previews_ready' || project.import_errors > 0)));
  useEffect(() => {
    if (importSubmitting || project?.status === 'importing' || project?.status === 'running') canvasScroll.current?.scrollTo({top:0});
  }, [importSubmitting, project?.status]);
  const needsPreviews = !!project && (project.preview_pending > 0 || project.import_errors > 0);
  const canCull = !!project && project.pending > 0 && project.preview_pending === 0;
  const workflowMessage = !project?.total ? 'Import your shoot to begin.' : importing ? `Preparing previews: ${project.imported} of ${project.total}. Originals stay untouched.` : project.import_errors ? `${project.import_errors} previews failed. Retry to prepare them again.` : project.preview_pending ? 'Prepare the remaining previews before culling.' : running ? `Analyzing: ${project.analyzed} of ${project.total}. You can pause and continue later.` : project.pending ? 'Previews are ready. Choose your options, then Start Culling.' : project.failed ? `${project.analyzed} analyzed / ${project.failed} failed. Retry failed photos, or review available results.` : 'Culling finished. Review suggestions, mark Keep / Reject, then export your selection.';
  const kept = allPhotos.filter((photo) => photo.decision === 'keep').length;
  const selectedPhotos = visible.filter(photo => selectedIds.has(photo.id));
  const selectPhoto = useCallback((photo: Photo) => {
    setSelectedIds(new Set([photo.id]));
    selectionAnchor.current = photo.id;
    setActiveId(photo.id);
    setViewport({ zoom: 1, x: 0, y: 0 });
  }, []);
  const selectMultiple = (photo: Photo, event: React.MouseEvent, candidates: Photo[] = visible) => {
    window.getSelection()?.removeAllRanges();
    if (event.shiftKey && selectionAnchor.current) {
      const start = candidates.findIndex(p => p.id === selectionAnchor.current);
      const end = candidates.findIndex(p => p.id === photo.id);
      if (start >= 0 && end >= 0) {
        const range = candidates.slice(Math.min(start,end), Math.max(start,end)+1).map(p => p.id);
        setSelectedIds(previous => new Set([...(event.ctrlKey || event.metaKey ? previous : []), ...range]));
      }
    } else if (multiSelect || event.ctrlKey || event.metaKey) {
      setSelectedIds(previous => { const next = new Set(previous); if (next.has(photo.id)) next.delete(photo.id); else next.add(photo.id); return next; });
      selectionAnchor.current = photo.id;
    } else { selectPhoto(photo); }
    setActiveId(photo.id);
    setViewport({zoom:1,x:0,y:0});
  };
  const selectedKey = selectedPhotos.map(photo => photo.id).join(',');
  const visibleKey = visible.map(photo => photo.id).join(',');
  const activePhotoId = active?.id;
  const decide = (decision: Decision) => {
    const ids = selectedKey ? selectedKey.split(',') : activePhotoId ? [activePhotoId] : [];
    if (ids.length > 1) act('decision', { photos: ids, decision });
    else if (ids[0]) act('decision', { photo: ids[0], decision });
  };
  const movePhoto = (direction: number) => {
    const ids = visibleKey ? visibleKey.split(',') : [];
    if (!ids.length) return;
    const index = ids.indexOf(activePhotoId || '');
    const next = ids[(index + direction + ids.length) % ids.length];
    setSelectedIds(new Set([next]));
    selectionAnchor.current = next;
    setActiveId(next);
    setViewport({zoom:1,x:0,y:0});
  };

  useEffect(
    () => window.snapsortDesktop?.onNewProject(() => setNewProject(true)),
    [],
  );
  useEffect(
    () =>
      window.snapsortDesktop?.onUndoSelection(() => {
        const target = document.activeElement;
        if (
          !newProject &&
          !importModal &&
          !shortcuts &&
          !(
            target instanceof HTMLElement &&
            (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
              target.isContentEditable)
          )
        )
          act('undo');
      }),
    [act, newProject, importModal, shortcuts],
  );
  useEffect(() => {
    const decide = (decision: Decision) => {
      const ids = selectedKey ? selectedKey.split(',') : activePhotoId ? [activePhotoId] : [];
      if (ids.length > 1) act('decision', { photos: ids, decision });
      else if (ids[0]) act('decision', { photo: ids[0], decision });
    };
    const movePhoto = (direction: number) => {
      const ids = visibleKey ? visibleKey.split(',') : [];
      if (!ids.length) return;
      const next = ids[(ids.indexOf(activePhotoId || '') + direction + ids.length) % ids.length];
      setSelectedIds(new Set([next]));
      selectionAnchor.current = next;
      setActiveId(next);
      setViewport({zoom:1,x:0,y:0});
    };
    const handler = (event: KeyboardEvent) => {
      if (newProject || importModal || shortcuts) {
        if (event.key === 'Escape') {
          setNewProject(false);
          setImportModal(false);
          setShortcuts(false);
        }
        return;
      }
      if (
        event.target instanceof HTMLElement &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName) ||
          event.target.isContentEditable)
      )
        return;
      if (quickPreview && (event.key === 'Escape' || event.key === ' ')) {
        event.preventDefault();
        if (!event.repeat) setQuickPreview(false);
        return;
      }
      if (quickPreview && event.key === 'Tab') { event.preventDefault(); return; }
      if (quickPreview && !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        setSelectedIds(new Set(visible.map(photo => photo.id)));
        return;
      }
      if (event.key === 'Escape') { setSelectedIds(new Set()); return; }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        act('undo');
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        setNewProject(true);
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey || !projectId) return;
      switch (event.key.toLowerCase()) {
        case 'k':
          decide('keep');
          break;
        case 'r':
          decide('reject');
          break;
        case 'u':
          decide('undecided');
          break;
        case 'arrowright':
          event.preventDefault();
          movePhoto(1);
          break;
        case 'arrowleft':
          event.preventDefault();
          movePhoto(-1);
          break;
        case 'g':
          setView('grid');
          break;
        case 'e':
          setView('loupe');
          break;
        case 'c':
          setView('compare');
          break;
        case '0':
          setViewport({ zoom: 1, x: 0, y: 0 });
          break;
        case ' ':
          if (active?.thumbnail && !event.repeat) {
            event.preventDefault();
            previewTrigger.current = event.target instanceof HTMLElement ? event.target : null;
            setQuickPreview(true);
          }
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    newProject,
    quickPreview,
    visible,
    active,
    importModal,
    shortcuts,
    act,
    selectedKey,
    visibleKey,
    activePhotoId,
    projectId,
    project,
    running,
  ]);

  function changeOption(key: keyof CullingOptions, value: boolean) {
    if (project)
      act('options', { options: { ...project.options, [key]: value } });
  }
  async function exportReport() {
    if (!project) return;
    const report = JSON.stringify(
      {
        schema_version: 2,
        id: project.id,
        name: project.name,
        mode: project.mode,
        shoot_type: project.shoot_type,
        options: project.options,
        preferences: project.preferences,
        groups: project.groups.map(group=>({id:group.id,photos:group.photos.map(photo=>photo.id),suggested:group.suggested,alternatives:group.alternatives,variants:group.variants,close_call:group.close_call})),
        photos: allPhotos.map((photo) => ({
          id: photo.id,
          name: photo.name,
          decision: photo.decision,
          selection_warnings: photo.selection_warnings,
          rejection_reason: photo.rejection_reason,
          analysis: photo.analysis,
        })),
      },
      null,
      2,
    );
    try {
      if (window.snapsortDesktop) {
        if (await window.snapsortDesktop.saveReport(report))
          setMessage('Selection report exported');
      } else {
        const url = URL.createObjectURL(
          new Blob([report], { type: 'application/json' }),
        );
        const link = document.createElement('a');
        link.href = url;
        link.download = `${project.name}-selections.json`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Could not export the report',
      );
    }
  }

  const errorBanner = error && (
    <div role="alert" className="error-banner">
      <span>{error}</span>
      <button
        onClick={() => {
          setError('');
          void refresh();
        }}
        aria-label="Dismiss error"
      >
        <X size={15} />
      </button>
    </div>
  );

  return (
    <div
      className={`desktop-app ${projectId ? 'project-open' : 'library-open'}`}
    >
      <header className="desktop-titlebar">
        <div className="desktop-brand">
          <img
            className="brand-logo"
            src="/branding/app-icon-128.png"
            alt="SnapSort"
          />
          <strong>SnapSort</strong>
          <span className="edition">PHOTO CULLING</span>
        </div>
        <span className="titlebar-project">
          {project?.name || 'Your project library'}
        </span>
        <div className="titlebar-status">
          <span className={connected ? 'status-dot connected' : 'status-dot'} />
          {connected ? 'Local workspace' : 'Connecting…'}
        </div>
      </header>
      <div className="module-bar">
        <button
          className={!projectId ? 'module active' : 'module'}
          onClick={library}
        >
          <Library size={16} /> Library
        </button>
        {projectId && (
          <>
            <button
              className={view !== 'compare' ? 'module active' : 'module'}
              onClick={() => setView('grid')}
            >
              Cull
            </button>
            <button
              className={view === 'compare' ? 'module active' : 'module'}
              onClick={() => setView('compare')}
            >
              Compare
            </button>
          </>
        )}
        <div className="module-spacer" />
        <button
          className="quiet"
          onClick={() => setShortcuts(true)}
          aria-label="Keyboard shortcuts"
        >
          <Keyboard size={16} />
        </button>
        <button
          className="new-project-button"
          onClick={() => setNewProject(true)}
          disabled={working}
        >
          <Plus size={14} /> New Project
        </button>
      </div>
      {!projectId ? (
        <div className="library-layout">
          <aside className="library-sidebar">
            <div className="sidebar-title">CATALOG</div>
            <button className="nav-row selected">
              <Library size={15} /> All Projects <span>{projects.length}</span>
            </button>
            <div className="sidebar-title spaced">WORKSPACE</div>
            <p className="sidebar-description">
              Your projects, selections and previews stay on this computer.
            </p>
            <div className="library-local">
              <Check size={14} /> Originals remain untouched
            </div>
          </aside>
          <main className="library-main">
            <div className="library-heading">
              <div>
                <p className="eyebrow">YOUR PHOTOGRAPHY WORKSPACE</p>
                <h1>Projects</h1>
                <p>Pick up where you left off, or bring in a new shoot.</p>
              </div>
              <button
                className="primary"
                onClick={() => setNewProject(true)}
                disabled={!connected || working}
              >
                <Plus size={16} /> Create New Project
              </button>
            </div>
            {errorBanner}
            <div className="library-filter">
              <span>
                {projects.length} project{projects.length === 1 ? '' : 's'}
              </span>
              <input
                aria-label="Search projects"
                placeholder="Search projects…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <span>Newest first</span>
            </div>
            <div className="project-grid">
              <button
                className="create-project-card"
                onClick={() => setNewProject(true)}
                disabled={!connected || working}
              >
                <span>
                  <Plus size={26} />
                </span>
                <strong>Start a new project</strong>
                <small>Import a shoot. Find your keepers.</small>
              </button>
              {projects
                .filter((item) =>
                  item.name.toLowerCase().includes(search.toLowerCase()),
                )
                .map((item) => (
                  <button
                    key={item.id}
                    className="project-card"
                    onClick={() => openProject(item.id)}
                  >
                    <div className="project-cover">
                      {item.cover ? (
                        <img
                          src={`/api/photos/${item.cover}/thumbnail`}
                          alt={item.name}
                          loading="lazy"
                        />
                      ) : (
                        <Images size={38} />
                      )}
                      <span className={`project-status ${item.status}`}>
                        {item.total === 0
                          ? 'Ready to import'
                          : item.status === 'complete'
                            ? 'Analyzed'
                            : item.status === 'previews_ready' ? 'Ready to cull' : item.status === 'failed' ? 'Needs retry' : item.status === 'partial' ? 'Review / retry' : item.status}
                      </span>
                    </div>
                    <div className="project-card-info">
                      <strong>{item.name}</strong>
                      <small>{SHOOT_LABELS[item.shoot_type] || 'Other'} shoot</small>
                      <p>
                        {item.total} photos <span>·</span> {item.kept || 0}{' '}
                        keepers
                      </p>
                      <div>
                        <span>
                          {new Date(
                            item.created.replace(' ', 'T') + 'Z',
                          ).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  </button>
                ))}
            </div>
            {!projects.length && (
              <p className="library-empty-note">
                Your first project starts with a name. Import photos whenever
                you are ready.
              </p>
            )}
          </main>
        </div>
      ) : !project ? (
        <div className="loading-project">Opening project…{errorBanner}</div>
      ) : (
        <>
          <div className="project-header">
            <div>
              <button className="quiet breadcrumb" onClick={library}>
                Projects
              </button>
              <ChevronRight size={14} />
              <h1>{project.name}</h1>
              <span className="photo-count">{project.total} photos</span>
            </div>
            <div>
              <button
                onClick={() => void importPhotos('folder')}
                disabled={running || working}
              >
                <FolderOpen size={14} /> Import Folder
              </button>
              <button
                className="primary"
                onClick={() => void importPhotos('photos')}
                disabled={running || working}
              >
                <Plus size={14} /> Import Photos
              </button>
            </div>
          </div>
          {errorBanner}
          <div className="shoot-workflow" aria-live="polite">
            <div className="workflow-stages">
              <span className={project.total ? 'done' : 'current'}>1 · Import</span>
              <span className={importing || needsPreviews ? 'current' : project.imported ? 'done' : ''}>2 · Previews</span>
              <span className={project.status === 'running' || (!needsPreviews && project.pending > 0) ? 'current' : project.analyzed ? 'done' : ''}>3 · Cull</span>
              <span className={!project.pending && project.analyzed ? 'current' : ''}>4 · Review</span>
              <button onClick={()=>document.getElementById('lightroom-handoff')?.scrollIntoView({block:'center'})}>5 · Lightroom</button>
            </div>
            <p>{workflowMessage} Double-click a photo to open its full preview.</p>
            {!!project.total && !running && (needsPreviews || project.failed > 0 || canCull) && <button className="primary" disabled={working} onClick={() => act(needsPreviews || project.failed > 0 ? 'retry' : 'resume')}>{needsPreviews || project.failed > 0 ? project.failed ? 'Retry Failed Photos' : 'Prepare Previews' : 'Start Culling'}</button>}
          </div>
          <div className="workspace-layout">
            <aside className="collection-sidebar">
              <div className="sidebar-title">
                <PanelLeft size={13} /> PROJECT
              </div>
              <button
                className={`nav-row ${!groupId && filter === 'all' ? 'selected' : ''}`}
                onClick={() => {
                  setGroupId(null);
                  setFilter('all');
                }}
              >
                <Images size={14} /> All photographs{' '}
                <span>{project.total}</span>
              </button>
              <button className={`nav-row ${filter === 'ai' && !groupId ? 'selected' : ''}`} onClick={() => { setGroupId(null); setFilter('ai'); }}>
                <Sparkles size={14}/> SnapSort Picks <span>{allPhotos.filter(photo => photo.decision !== 'reject' && aiPicks.has(photo.id)).length}</span>
              </button>
              <button className={`nav-row ${filter === 'review' && !groupId ? 'selected' : ''}`} onClick={() => { setGroupId(null); setFilter('review'); }}>
                <ScanFace size={14}/> Needs Review <span>{allPhotos.filter(isReviewPick).length}</span>
              </button>
              <button
                className={`nav-row ${filter === 'keep' ? 'selected' : ''}`}
                onClick={() => {
                  setGroupId(null);
                  setFilter('keep');
                }}
              >
                <Flag size={14} /> Keepers <span>{kept}</span>
              </button>
              <div className="sidebar-title spaced">
                <Layers size={13} /> SHOT GROUPS <span>{preparedGroups.length || (importing ? '…' : 0)}</span>
              </div>
              <div className="group-list">
                <button className={`nav-row ${filter==='close'&&!groupId?'selected':''}`} onClick={()=>{setGroupId(null);setFilter('close');}}>Close choices <span>{closeCandidates.size}</span></button>
                {!preparedGroups.length && !!project.total && <p className="group-preparing-note">{importing ? 'Preparing previews first. Similar-shot groups appear during culling.' : project.status === 'running' ? 'Finding the first similar moments…' : 'Start Culling to find similar scenes and frames.'}</p>}
                {preparedGroups.map((group, index) => (
                  <button
                    key={group.id}
                    className={`group-row ${groupId === group.id ? 'selected' : ''}`}
                    onClick={() => {
                      setGroupId(group.id);
                      setFilter('all');
                      const photo =
                        group.photos.find((p) => p.id === group.suggested) ||
                        group.photos[0];
                      if (photo) selectPhoto(photo);
                    }}
                  >
                    <span className="group-thumb">
                      {group.photos[0].thumbnail ? (
                        <img
                          src={photoUrl(group.photos[0], 'thumbnail')}
                          alt=""
                          loading="lazy"
                        />
                      ) : (
                        <Image size={14} />
                      )}
                    </span>
                    <span>
                      <strong>Group {index + 1}</strong>
                      <small>
                        {group.photos.length} shot
                        {group.photos.length === 1 ? '' : 's'}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
              <p className="sidebar-footnote">
                Selections are yours.
                <br />
                Suggestions never overwrite them.
              </p>
            </aside>
            <main className="photo-workspace">
              <div className="workspace-toolbar">
                <div className="view-switch">
                  {(
                    [
                      { value: 'grid', label: 'Grid view', icon: Grid2X2 },
                      {
                        value: 'loupe',
                        label: 'Single photo view',
                        icon: Image,
                      },
                      { value: 'compare', label: 'Compare view', icon: Copy },
                      { value: 'survey', label: 'Survey view (16 photos)', icon: Grid2X2 },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.value}
                      className={view === item.value ? 'active' : ''}
                      onClick={() => setView(item.value)}
                      aria-label={item.label}
                      aria-pressed={view === item.value}
                    >
                      <item.icon size={16} />
                    </button>
                  ))}
                </div>
                <select
                  aria-label="Filter photographs"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                >
                  <option value="all">All photographs</option>
                  <option value="ai">SnapSort Picks</option>
                  <option value="review">Needs Review</option>
                  <option value="close">Close choices</option>
                  <option value="suggested">Suggested picks</option>
                  <option value="target">AI Recommended Set</option>
                  <option value="keep">Keepers</option>
                  <option value="reject">Rejected</option>
                  <option value="undecided">Unreviewed</option>
                </select>
                <span>{visible.length} shown · {selectedPhotos.length} selected</span>
                <button aria-pressed={multiSelect} onClick={() => setMultiSelect(!multiSelect)}>Select multiple</button>
                <button disabled={!visible.length} onClick={() => setSelectedIds(new Set(visible.map(photo => photo.id)))}>Select All</button>
                <button disabled={!selectedPhotos.length} onClick={() => setSelectedIds(new Set())}>Clear</button>
                <div className="toolbar-spacer" />
                <button
                  className="quiet"
                  onClick={() => act('undo')}
                  disabled={!project.can_undo || working}
                  aria-label="Undo selection"
                >
                  <Undo2 size={15} />
                </button>
              </div>
              {active?.decision === 'reject' && <div className="rejection-notice" role="status">
                <strong>{active.name} · Rejected: {active.rejection_reason || 'by you'}</strong>
                {!!active.selection_warnings?.length && <small>Detected issues: {active.selection_warnings.join(' · ')}</small>}
              </div>}
              {!project.total && !showProcessing ? (
                <section className="empty-project">
                  <img
                    className="empty-project-art"
                    src="/branding/empty-project.webp"
                    alt="Camera and photo contact sheets"
                  />
                  <h2>Bring your shoot into {project.name}.</h2>
                  <p>
                    Import JPEG, HEIC or RAW photographs, choose your culling options,
                    <br />
                    and start finding the shots worth keeping.
                  </p>
                  <button
                    className="primary"
                    onClick={() => void importPhotos('photos')}
                    disabled={working}
                  >
                    <Plus size={16} /> Import Photos
                  </button>
                  <button
                    className="text-button"
                    onClick={() => void importPhotos('folder')}
                    disabled={working}
                  >
                    Or choose a shoot folder
                  </button>
                </section>
              ) : (
                <>
                  <div ref={canvasScroll} className={`canvas-scroll ${view === 'survey' ? 'survey-canvas' : ''}`}>
                    <WorkflowGuide key={`guide-${project.id}`} project={project} disabled={working} act={action=>act(action)} importPhotos={()=>void importPhotos('photos')} review={value=>{setGroupId(null);setFilter(value);setView('grid');}}/>
                    {showProcessing && <ProcessingStatus key={project.id} project={project} submitting={importSubmitting} disabled={working} act={action => act(action)}/>}
                    {view === 'survey' ? (<Survey isReviewPick={isReviewPick} isSelected={isSelected} key={groupId || 'all'} photos={groupId ? burstPhotos : visible} active={active?.id} select={photo=>{selectPhoto(photo);setView('loupe');}}/>) : view === 'grid' ? (
                      <div className="photo-grid">
                        {visible.map((photo, index) => (
                          <button
                            key={photo.id}
                            className={`photo-tile ${photo.id === active?.id ? 'active' : ''} ${photo.decision} ${isSelected(photo) ? 'cull-selected' : ''} ${isReviewPick(photo) ? 'cull-warning' : ''} ${selectedIds.has(photo.id) ? 'batch-selected' : ''}`}
                            title={photo.decision === 'reject' ? `Rejected: ${photo.rejection_reason || 'by you'}` : photo.selection_warnings?.join(' · ')}
                            aria-pressed={selectedIds.has(photo.id)}
                            onClick={event => selectMultiple(photo, event)}
                            onDoubleClick={() => {
                              selectPhoto(photo);
                              setView('loupe');
                            }}
                          >
                            <div className="tile-header">
                              <span>{index + 1}</span>
                              {(multiSelect || selectedIds.has(photo.id)) && <span className="batch-check" aria-label={selectedIds.has(photo.id) ? 'Selected' : 'Not selected'}>{selectedIds.has(photo.id) ? <Check size={12}/> : null}</span>}
                              {(photo.decision !== 'reject' && aiPicks.has(photo.id)) && (
                                <span className="pick-badge" title={photo.selection_warnings?.join(' · ') || 'AI quality pick'}>
                                  <Sparkles size={10} /> {isReviewPick(photo) ? 'Review pick' : 'AI pick'}
                                </span>
                              )}
                              <span>
                                {photo.decision === 'keep' ? (
                                  <Flag size={12} />
                                ) : photo.decision === 'reject' ? (
                                  <X size={12} />
                                ) : null}
                              </span>
                            </div>
                            <div className="tile-image">
                              {photo.thumbnail ? (
                                <img
                                  src={photoUrl(photo, 'thumbnail')}
                                  alt={photo.name}
                                  loading="lazy"
                                />
                              ) : (
                                <div className="tile-placeholder">
                                  <Image size={27} />
                                  <small>
                                    {photo.status === 'error'
                                      ? 'Preview failed - use Retry'
                                      : importing ? 'Preparing preview...' : 'Preview not prepared'}
                                  </small>
                                </div>
                              )}
                            </div>
                            <strong>{photo.name}</strong>
                            <div className="tile-footer">
                              <span>
                                {photo.analysis
                                  ? `${photo.analysis.faces.length} face${photo.analysis.faces.length === 1 ? '' : 's'}`
                                  : 'Unanalyzed'}
                              </span>
                              <span>
                                {photo.decision === 'undecided'
                                  ? 'Unreviewed'
                                  : photo.decision === 'reject' ? `Rejected: ${photo.rejection_reason || 'by you'}` : photo.decision}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      active && (
                        <>
                          <div className="compare-toolbar">
                            <button
                              onClick={() => movePhoto(-1)}
                              aria-label="Previous photograph"
                            >
                              <ChevronLeft size={15} />
                            </button>
                            <strong>{active.name}</strong>
                            <button
                              onClick={() => movePhoto(1)}
                              aria-label="Next photograph"
                            >
                              <ChevronRight size={15} />
                            </button>
                            <div className="toolbar-spacer" />
                            {view === 'compare' && (
                              <select
                                aria-label="Compare with"
                                value={comparison?.id || ''}
                                onChange={(event) =>
                                  setCompareId(event.target.value)
                                }
                                disabled={!comparison}
                              >
                                <option value="" disabled>
                                  No alternative in this group
                                </option>
                                {burstPhotos
                                  .filter((photo) => photo.id !== active.id)
                                  .map((photo) => (
                                    <option value={photo.id} key={photo.id}>
                                      {photo.name}
                                    </option>
                                  ))}
                              </select>
                            )}
                            <button
                              onClick={() =>
                                setViewport({ zoom: 1, x: 0, y: 0 })
                              }
                            >
                              Fit
                            </button>
                          </div>
                          <div
                            className={`comparison ${view === 'loupe' || !comparison ? 'single' : ''}`}
                          >
                            <SyncPreview
                              key={active.id}
                              photo={active}
                              viewport={viewport}
                              onChange={setViewport}
                              showFaces={showFaces}
                            />
                            {view === 'compare' && comparison && (
                              <SyncPreview
                                key={comparison.id}
                                photo={comparison}
                                viewport={viewport}
                                onChange={setViewport}
                                showFaces={showFaces}
                              />
                            )}
                          </div>
                          <p className="compare-hint">
                            Original photographs ·{' '}
                            {view === 'compare' && comparison
                              ? 'Linked zoom and pan'
                              : 'Scroll to zoom, drag to pan'}{' '}
                            · {viewport.zoom.toFixed(1)}× fit
                          </p>
                          {view === 'compare' && !comparison && (
                            <p className="no-alternative">
                              This shot has no grouped alternative. Choose
                              another shot group to compare.
                            </p>
                          )}
                        </>
                      )
                    )}
                    {view === 'grid' && !visible.length && (
                      <p className="no-alternative">
                        No photographs match this filter.
                      </p>
                    )}
                    {faceStrip && view !== 'survey' && !!burstPhotos.length && (
                      <section className="face-comparison">
                        <h3>
                          <ScanFace size={15} /> Face comparison{' '}
                          <small>
                            Face numbers are per-photo, not person identities.
                          </small>
                        </h3>
                        <FaceStrip
                          photos={burstPhotos}
                          select={(photo, box) => {
                            setActiveId(photo.id);
                            setView('compare');
                            setViewport({
                              zoom: 3,
                              x: (0.5 - (box[0] + box[2]) / 2) * 3,
                              y: (0.5 - (box[1] + box[3]) / 2) * 3,
                            });
                          }}
                        />
                      </section>
                    )}
                  </div>
                  <div className="selection-toolbar">
                    <span>{selectedPhotos.length > 1 ? `${selectedPhotos.length} photos selected · actions apply to all` : active?.name || 'No photograph selected'}</span>
                    <div>
                      {(['keep', 'reject', 'undecided'] as Decision[]).map(
                        (decision) => (
                          <button
                            key={decision}
                            className={
                              (selectedPhotos.length ? selectedPhotos.every(photo => photo.decision === decision) : active?.decision === decision)
                                ? `chosen-${decision}`
                                : ''
                            }
                            aria-pressed={selectedPhotos.length ? selectedPhotos.every(photo => photo.decision === decision) : active?.decision === decision}
                            disabled={!active}
                            onClick={() => decide(decision)}
                          >
                            {decision === 'keep' ? (
                              <Flag size={13} />
                            ) : decision === 'reject' ? (
                              <X size={13} />
                            ) : (
                              <Image size={13} />
                            )}
                            {decision === 'undecided' ? 'Unreviewed' : decision}
                            <kbd>
                              {decision === 'keep'
                                ? 'K'
                                : decision === 'reject'
                                  ? 'R'
                                  : 'U'}
                            </kbd>
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                </>
              )}
            </main>
            <aside className="culling-sidebar">
              <div className="sidebar-title">
                <SlidersHorizontal size={14} /> CULLING OPTIONS
              </div>
              <section className="side-section">
                <h3>Processing</h3>
                <div className="mode-switch">
                  {(['fast', 'balanced', 'detailed'] as Mode[]).map((mode) => (
                    <button
                      key={mode}
                      disabled={running || working}
                      className={project.mode === mode ? 'active' : ''}
                      aria-pressed={project.mode === mode}
                      onClick={() => act('mode', { mode })}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                <p>{MODE_HELP[project.mode]}</p>
              </section>
              <section className="side-section">
                <h3>Culling settings</h3>
                  <p>Balanced and Detailed also consider overall visual appeal using an offline model. Your style and final choices stay yours.</p>
                <label className="option-row">
                  <input type="checkbox" checked={project.options.faces && project.preferences.avoid_closed}
                    disabled={running || working || project.mode === 'fast'}
                    onChange={event => {
                      changeOption('faces', event.target.checked);
                      act('preferences', { preferences: { ...project.preferences, avoid_closed: event.target.checked } });
                    }} />
                  <span>Detect closed eyes<small>{project.mode === 'fast' ? 'Choose Balanced or Detailed to check eyes' : 'Favor open eyes when choosing AI picks'}</small></span>
                </label>
                <label className="option-row">
                  <input type="checkbox" checked={project.preferences.avoid_blur} disabled={running || working}
                    onChange={event => act('preferences', { preferences: { ...project.preferences, avoid_blur: event.target.checked } })} />
                  <span>Avoid blurry or missed-focus shots<small>Favor sharper photos; review possible shake or soft focus</small></span>
                </label>
                <label className="option-row">
                  <input type="checkbox" checked={project.options.grouping} disabled={running || working}
                    onChange={event => changeOption('grouping', event.target.checked)} />
                  <span>Choose the best shot from similar photos<small>Group similar moments and suggest the strongest quality candidate</small></span>
                </label>
                <label className="option-row">
                  <input type="checkbox" checked={project.options.alternatives} disabled={running || working}
                    onChange={event => changeOption('alternatives', event.target.checked)} />
                  <span>Show backup choices<small>Keep up to two alternatives for comparison</small></span>
                </label>
                <label className="option-row">
                  <input type="checkbox" checked={project.preferences.avoid_exposure} disabled={running || working}
                    onChange={event => act('preferences', { preferences: { ...project.preferences, avoid_exposure: event.target.checked } })} />
                  <span>Prefer balanced lighting</span>
                </label>
                {!!project.analyzed && <button disabled={running||working} onClick={()=>act('reanalyze')}>Refresh suggestions</button>}
                <small>Green = AI quality pick or Keep. Yellow = lower-confidence pick; review before keeping.</small>
                {!modelReady && (
                  <p className="warning">
                    The local face model is not installed.
                  </p>
                )}
                <small>
                  Pause before changing settings. Face settings and processing
                  mode changes reanalyze photos without changing your
                  selections.
                </small>
              </section>
              <section className="side-section">
                <h3>Review tools</h3>
                <label className="option-row">
                  <input
                    type="checkbox"
                    checked={showFaces}
                    onChange={(event) => setShowFaces(event.target.checked)}
                  />
                  <span>Show face outlines</span>
                </label>
                <label className="option-row">
                  <input
                    type="checkbox"
                    checked={faceStrip}
                    onChange={(event) => setFaceStrip(event.target.checked)}
                  />
                  <span>Face comparison strip</span>
                </label>
              </section>
              {active && (
                <section className="side-section photo-insights">
                  <h3>Selected photograph</h3>
                  <strong className="insight-filename">{active.name}</strong>
                  {activeGroup&&active.analysis&&<div className="moment-insight">
                    <strong>{active.decision==='keep'?'Your keep':isReviewPick(active)?'Needs review':aiPicks.has(active.id)?'Suggested pick':'Alternative frame'}</strong>
                    <small>{active.framing||'Frame'} · {activeGroup.photos.length} photos in this moment</small>
                    {activeGroup.manual&&<small>Manually grouped · refresh keeps this grouping</small>}
                    <button onClick={()=>{const tools=document.getElementById('grouping-tools');const details=tools?.querySelector('details');if(details)details.open=true;tools?.scrollIntoView({block:'center'});}}>Correct this group</button>
                    {activeGroup.close_candidates?.includes(active.id)&&<><strong>Both are strong choices</strong><p>Similar measured quality. Compare these two and choose your preferred expression or framing.</p><button onClick={()=>{setFilter('all');setGroupId(activeGroup.id);setCompareId(activeGroup.close_candidates?.find(id=>id!==active.id)||null);setView('compare');}}>Compare close choices</button></>}
                    {activeGroup.review_reasons?.filter(reason=>!reason.startsWith('These are close')).map(reason=><p key={reason}>{reason}</p>)}
                    {active.framing_hints?.map(reason=><p key={reason}>{reason}</p>)}
                    <small>{active.analysis.aesthetics?.status==='available'?'Visual appeal considered alongside focus and eye checks.':active.analysis.aesthetics?.status==='skipped_in_fast_mode'?'Choose Balanced for visual-appeal hints.':active.analysis.aesthetics?.status==='unavailable'?'Visual-appeal model unavailable. Focus and eye hints still work.':'Refresh suggestions to use the latest analysis.'}</small>
                    {activeGroup.photos.length>1&&<button onClick={()=>{setGroupId(activeGroup.id);setCompareId(activeGroup.photos.find(p=>p.id!==active.id)?.id||null);setView('compare');}}>Compare this moment</button>}
                    {activeGroup.variants?.map(variant=><button key={variant.framing} onClick={()=>{const photo=activeGroup.photos.find(p=>p.id===variant.suggested);if(photo)selectPhoto(photo);}}>{variant.framing} pick</button>)}
                  </div>}
                  {active.analysis?.luminance_histogram && (
                    <svg
                      className="histogram"
                      viewBox="0 0 256 60"
                      role="img"
                      aria-label="Photograph brightness histogram"
                    >
                      {active.analysis.luminance_histogram.map(
                        (height, index) => (
                          <rect
                            key={index}
                            x={index * 8}
                            y={60 - height * 58}
                            width="7"
                            height={height * 58}
                            fill="#979797"
                          />
                        ),
                      )}
                    </svg>
                  )}
                  {active.analysis ? (
                    <>
                      <p>
                        {active.analysis.faces.length} detected faces ·
                        sharpness {active.analysis.sharpness.toFixed(0)}
                      </p>
                      <details>
                        <summary>
                          Why this recommendation? <ChevronDown size={13} />
                        </summary>
                        <p>{activeGroup?.explanation}</p>
                        <ul>
                          {active.analysis.reasons.map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                        {active.analysis.model_error && (
                          <p className="warning">
                            {active.analysis.model_error}
                          </p>
                        )}
                        {active.analysis.face_limit_reached && (
                          <p className="warning">
                            20-face limit reached. Additional people may not be
                            analyzed.
                          </p>
                        )}
                      </details>
                    </>
                  ) : (
                    <p>
                      {active.error ||
                        'Start culling to see analysis and recommendations.'}
                    </p>
                  )}
                  <PhotoMetadata photo={active} act={act}/>
                  <small>Quality and eye hints need your review.</small>
                </section>
              )}
              <AdvancedCulling key={project.id} project={project} act={act} disabled={running || working}/>
              <GroupingTools project={project} active={active} group={activeGroup} selected={selectedPhotos} disabled={running||working} act={(action,body)=>{setGroupId(null);setFilter('all');act(action,body);}}/>
              <LightroomHandoff key={`lightroom-${project.id}`} project={project} disabled={running || working}/>
              <div className="processing-summary">
                <div>
                  <span>
                    {importing ? project.imported : project.analyzed} /{' '}
                    {project.total} {importing ? 'previews ready' : 'analyzed'}
                  </span>
                  <span>{project.elapsed.toFixed(1)}s</span>
                </div>
                <progress
                  aria-label="Culling progress"
                  max={Math.max(1, project.total)}
                  value={importing ? project.imported : project.analyzed}
                />
                <p>{workflowMessage}</p>
                {project.failed > 0 && <p className="processing-errors">{project.failed} failed · originals remain available</p>}
                <button className="primary start-culling"
                  disabled={!project.total || working || importing || project.status === 'pausing' || (!running && !canCull && !needsPreviews && !project.failed)}
                  onClick={() => act(running ? 'pause' : needsPreviews || project.failed ? 'retry' : 'resume')}>
                  {running ? <Pause size={15} /> : <Play size={15} />}
                  {importing ? 'Preparing Previews...' : running ? 'Pause Culling' : needsPreviews || project.failed ? project.failed ? 'Retry Failed Photos' : 'Prepare Previews' : canCull ? project.analyzed ? 'Resume Culling' : 'Start Culling' : 'Culling Finished'}
                </button>
                <button
                  className="export-button"
                  disabled={!project.total}
                  onClick={() => void exportReport()}
                >
                  Export Selection Report
                </button>
              </div>
            </aside>
          </div>
          {!!allPhotos.length && (
            <div className="filmstrip">
              <div className="filmstrip-heading">
                <span>
                  <Images size={13} /> {project.name}
                </span>
                <span>
                  {allPhotos.length} photos · {kept} keepers
                </span>
              </div>
              <div className="filmstrip-photos">
                {allPhotos.map((photo) => (
                  <button
                    key={photo.id}
                    className={`film-photo ${active?.id === photo.id ? 'active' : ''} ${photo.decision} ${isSelected(photo) ? 'cull-selected' : ''} ${isReviewPick(photo) ? 'cull-warning' : ''} ${selectedIds.has(photo.id) ? 'batch-selected' : ''}`}
                    onClick={(event) => {
                      selectMultiple(photo, event, allPhotos);
                      setGroupId(null);
                      setFilter('all');
                      setViewport({ zoom: 1, x: 0, y: 0 });
                    }}
                    onDoubleClick={() => setView('loupe')}
                    aria-pressed={selectedIds.has(photo.id)}
                    aria-label={`Select ${photo.name}`}
                    title={photo.name}
                  >
                    {photo.thumbnail ? (
                      <img
                        src={photoUrl(photo, 'thumbnail')}
                        alt={photo.name}
                        loading="lazy"
                      />
                    ) : (
                      <Image size={18} />
                    )}
                    {photo.decision === 'keep' && <Flag size={11} />}
                    {(photo.decision !== 'reject' && aiPicks.has(photo.id)) && (
                      <span className="film-pick">★</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      <footer className="desktop-statusbar">
        <span>{working ? 'Saving…' : message}</span>
        <span>
          {project
            ? `${kept} keepers · ${project.total - kept} remaining`
            : 'Private by design. Fully local.'}
        </span>
      </footer>
      {quickPreview && active?.thumbnail && (
        <div className="quick-preview-backdrop" onClick={() => setQuickPreview(false)}>
          <section className="quick-preview" role="dialog" aria-modal="true" aria-label={`Preview ${active.name}`} onClick={event => event.stopPropagation()}>
            <header><strong>{active.name}</strong><button autoFocus onClick={() => setQuickPreview(false)} aria-label="Close preview"><X size={20}/></button></header>
            <img key={active.id} src={photoUrl(active, 'analysis')} alt={active.name}/>
            <footer>{active.decision === 'reject' && <span>Rejected: {active.rejection_reason || 'by you'} · </span>}← → Browse photos · Space or Esc to close</footer>
          </section>
        </div>
      )}
      {newProject && (
        <div className="modal-backdrop">
          <form
            className="desktop-modal"
            onSubmit={(event) => void createProject(event)}
          >
            <div className="modal-heading">
              <h2>New Project</h2>
              <button
                type="button"
                className="quiet"
                onClick={() => setNewProject(false)}
                aria-label="Close new project"
              >
                <X size={17} />
              </button>
            </div>
            <p>
              Give your shoot a home. Import photos after creating the project.
            </p>
            <label>
              Project name
              <input
                autoFocus
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="e.g. Maya & Daniel — Wedding"
                required
                maxLength={120}
              />
            </label>
            <label>
              Shoot type
              <select value={shootType} onChange={event => setShootType(event.target.value as ShootType)}>
                {Object.entries(SHOOT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <small>{shootType === 'sports' ? 'Action preset: prioritize focus; eye checks start off.' : 'Focus, eye checks and similar-shot grouping start on.'}</small>
            <label>
              Processing mode
              <select
                value={newMode}
                onChange={(event) => setNewMode(event.target.value as Mode)}
              >
                <option value="fast">Fast</option>
                <option value="balanced">Balanced</option>
                <option value="detailed">Detailed</option>
              </select>
            </label>
            <small>{MODE_HELP[newMode]} You can change this later.</small>
            {errorBanner}
            <div className="modal-actions">
              <button type="button" onClick={() => setNewProject(false)}>
                Cancel
              </button>
              <button
                className="primary"
                disabled={working || !connected || !projectName.trim()}
              >
                <Plus size={14} /> Create Project
              </button>
            </div>
          </form>
        </div>
      )}
      {importModal && (
        <div className="modal-backdrop">
          <form
            className="desktop-modal"
            onSubmit={(event) => void importLocalPath(event)}
          >
            <div className="modal-heading">
              <h2>Import shoot folder</h2>
              <button
                type="button"
                className="quiet"
                onClick={() => setImportModal(false)}
                aria-label="Close import"
              >
                <X size={17} />
              </button>
            </div>
            <p>
              The desktop edition opens a native file picker. This development
              preview accepts a local folder path.
            </p>
            <label>
              Photo folder
              <input
                autoFocus
                value={importPath}
                onChange={(event) => setImportPath(event.target.value)}
                placeholder="D:\Photos\Shoot"
                required
              />
            </label>
            {errorBanner}
            <div className="modal-actions">
              <button type="button" onClick={() => setImportModal(false)}>
                Cancel
              </button>
              <button className="primary" disabled={working}>
                Import Photographs
              </button>
            </div>
          </form>
        </div>
      )}
      {shortcuts && (
        <div className="modal-backdrop">
          <section
            className="desktop-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
          >
            <div className="modal-heading">
              <h2>Keyboard shortcuts</h2>
              <button
                autoFocus
                className="quiet"
                onClick={() => setShortcuts(false)}
                aria-label="Close shortcuts"
              >
                <X size={17} />
              </button>
            </div>
            <dl>
              <dt>K / R / U</dt>
              <dd>Keep / Reject / Unreviewed</dd>
              <dt>← / →</dt>
              <dd>Previous / next photo</dd>
              <dt>G / E / C</dt>
              <dd>Grid / Single photo / Compare</dd>
              <dt>Ctrl / Cmd + Z</dt>
              <dd>Undo selection</dd>
              <dt>Ctrl / Cmd + N</dt>
              <dd>New project</dd>
              <dt>Ctrl/Cmd + click</dt><dd>Add or remove a photo from selection</dd>
              <dt>Shift + click</dt><dd>Select a range of photos</dd>
              <dt>Ctrl/Cmd + A</dt><dd>Select all visible photos</dd>
              <dt>Space</dt>
              <dd>Open / close Quick Preview</dd>
              <dt>0</dt>
              <dd>Fit original photos</dd>
            </dl>
          </section>
        </div>
      )}
    </div>
  );
}
