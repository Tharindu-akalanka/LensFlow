"""Durable local sessions, atomic decisions and resumable photo jobs."""
from contextlib import contextmanager
import json
from pathlib import Path
import sqlite3
import uuid

from analysis import MODES, group_photos, selection_warnings, grouping_features
from photo_io import PHOTO_EXTENSIONS, render_original, upright_embedded, camera_metadata
from selection import recommend, recommendation_summary
from xmp import read_sidecar


SHOOT_TYPES = ('wedding', 'portrait', 'sports', 'events', 'other')


class Store:
    def __init__(self, root):
        self.root = Path(root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        self.database = self.root / "sessions.sqlite3"
        with self.connect() as db:
            db.executescript("""
                PRAGMA journal_mode=WAL;
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY, name TEXT NOT NULL, folder TEXT NOT NULL,
                    mode TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'paused',
                    elapsed REAL NOT NULL DEFAULT 0, error TEXT,
                    created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS photos (
                    id TEXT PRIMARY KEY, session TEXT NOT NULL REFERENCES sessions(id),
                    source TEXT NOT NULL, name TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'pending', data TEXT, analysis TEXT,
                    decision TEXT NOT NULL DEFAULT 'undecided', error TEXT
                );
                CREATE INDEX IF NOT EXISTS session_photos ON photos(session);
                CREATE TABLE IF NOT EXISTS history (
                    sequence INTEGER PRIMARY KEY AUTOINCREMENT, session TEXT NOT NULL,
                    photo TEXT NOT NULL, previous TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS group_history (
                    sequence INTEGER PRIMARY KEY AUTOINCREMENT, session TEXT NOT NULL,
                    previous TEXT NOT NULL
                );
            """)
            columns = {row["name"] for row in db.execute("PRAGMA table_info(sessions)")}
            if "options" not in columns:
                db.execute("ALTER TABLE sessions ADD COLUMN options TEXT NOT NULL DEFAULT '{}' ")
            if 'shoot_type' not in columns:
                db.execute("ALTER TABLE sessions ADD COLUMN shoot_type TEXT NOT NULL DEFAULT 'other'")
            history_columns = {row['name'] for row in db.execute('PRAGMA table_info(history)')}
            if 'batch' not in history_columns:
                db.execute('ALTER TABLE history ADD COLUMN batch TEXT')
            if 'previous_reason' not in history_columns:
                db.execute('ALTER TABLE history ADD COLUMN previous_reason TEXT')
            photo_columns = {row['name'] for row in db.execute('PRAGMA table_info(photos)')}
            if 'manual_group' not in photo_columns:
                db.execute('ALTER TABLE photos ADD COLUMN manual_group TEXT')
            for name, definition in [('rejection_reason',"TEXT NOT NULL DEFAULT ''"),('rating','INTEGER NOT NULL DEFAULT 0'),('label',"TEXT NOT NULL DEFAULT ''"),('metadata_touched','INTEGER NOT NULL DEFAULT 0')]:
                if name not in photo_columns: db.execute(f'ALTER TABLE photos ADD COLUMN {name} {definition}')
            if 'watch' not in columns: db.execute("ALTER TABLE sessions ADD COLUMN watch TEXT NOT NULL DEFAULT '{}' " )
            if 'preferences' not in columns: db.execute("ALTER TABLE sessions ADD COLUMN preferences TEXT NOT NULL DEFAULT '{}' ")
            db.execute("UPDATE sessions SET status='paused' WHERE status IN ('running', 'pausing', 'importing')")
            db.execute("""UPDATE sessions SET status='failed' WHERE status='complete'
                AND EXISTS(SELECT 1 FROM photos WHERE session=sessions.id AND status='error')
                AND NOT EXISTS(SELECT 1 FROM photos WHERE session=sessions.id AND status='ready')""")
            db.execute("""UPDATE sessions SET status='partial' WHERE status='complete'
                AND EXISTS(SELECT 1 FROM photos WHERE session=sessions.id AND status='error')""")

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.database, timeout=30)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys=ON")
        try:
            with db:
                yield db
        finally:
            db.close()

    def create(self, folder, mode):
        if mode not in MODES:
            raise ValueError("Choose Fast, Balanced or Detailed mode")
        folder = Path(folder).expanduser().resolve(strict=True)
        if not folder.is_dir():
            raise ValueError("Choose an existing local photo folder")
        files = sorted(p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in PHOTO_EXTENSIONS)
        if not files:
            raise ValueError("This folder has no JPEG/HEIC/RAW photographs")
        session = uuid.uuid4().hex
        with self.connect() as db:
            db.execute("INSERT INTO sessions(id,name,folder,mode) VALUES (?,?,?,?)", (session, folder.name, str(folder), mode))
            db.executemany("INSERT INTO photos(id,session,source,name) VALUES (?,?,?,?)", [(uuid.uuid4().hex, session, str(path), path.name) for path in files])
        return session

    def create_project(self, name, mode="balanced", shoot_type="other"):
        if not isinstance(name, str) or not name.strip() or len(name.strip()) > 120:
            raise ValueError("Enter a project name (up to 120 characters)")
        if mode not in MODES:
            raise ValueError("Invalid performance mode")
        if shoot_type not in SHOOT_TYPES:
            raise ValueError("Choose a supported shoot type")
        # Sports prioritizes action/focus; face checks remain available to enable.
        faces = shoot_type != 'sports'
        options = {'grouping': True, 'faces': faces, 'alternatives': True}
        preferences = {'workflow': 'assisted', 'target': 0, 'avoid_blur': True,
                       'avoid_closed': faces, 'avoid_exposure': True, 'auto_xmp': False}
        session = uuid.uuid4().hex
        with self.connect() as db:
            db.execute("INSERT INTO sessions(id,name,folder,mode,shoot_type,options,preferences) VALUES (?,?,?,?,?,?,?)",
                       (session, name.strip(), "", mode, shoot_type, json.dumps(options), json.dumps(preferences)))
        return session

    def import_files(self, session, files=None, folder=None):
        if folder:
            source_folder = Path(folder).expanduser().resolve(strict=True)
            if not source_folder.is_dir():
                raise ValueError("Choose a photo folder")
            files = [str(p) for p in sorted(source_folder.iterdir()) if p.is_file() and p.suffix.lower() in PHOTO_EXTENSIONS]
        if not isinstance(files, list) or not files or len(files) > 20000:
            raise ValueError("Choose JPEG/HEIC/RAW photos to import (up to 20,000 per import)")
        sources = []
        for file in files:
            path = Path(file).resolve(strict=True)
            if not path.is_file() or path.suffix.lower() not in PHOTO_EXTENSIONS:
                raise ValueError("Only existing JPEG/HEIC/RAW photographs can be imported")
            sources.append(path)
        with self.connect() as db:
            row = db.execute("SELECT status FROM sessions WHERE id=?", (session,)).fetchone()
            if row is None:
                raise KeyError("Project not found")
            if row["status"] in ("running", "pausing", "importing"):
                raise ValueError("Pause culling before importing more photos")
            existing = {p["source"].casefold() for p in db.execute("SELECT source FROM photos WHERE session=?", (session,))}
            added = []
            for source in sources:
                if str(source).casefold() not in existing:
                    metadata=read_sidecar(source)
                    added.append((uuid.uuid4().hex, session, str(source), source.name,metadata["rating"],metadata["label"],metadata["decision"],int(metadata["metadata_touched"])))
                    existing.add(str(source).casefold())
            db.executemany("INSERT INTO photos(id,session,source,name,rating,label,decision,metadata_touched) VALUES (?,?,?,?,?,?,?,?)", added)
            if added:
                db.execute("UPDATE sessions SET status='paused',error=NULL WHERE id=?", (session,))
            return len(added)

    def change_options(self, session, options):
        if not isinstance(options, dict) or set(options) != {"grouping", "faces", "alternatives"} or any(type(value) is not bool for value in options.values()):
            raise ValueError("Invalid culling options")
        with self.connect() as db:
            row = db.execute("SELECT status,options FROM sessions WHERE id=?", (session,)).fetchone()
            if row is None:
                raise KeyError("Project not found")
            if row["status"] in ("running", "pausing", "importing"):
                raise ValueError("Pause culling before changing options")
            before = {"grouping": True, "faces": True, "alternatives": True, **json.loads(row["options"])}
            db.execute("UPDATE sessions SET options=? WHERE id=?", (json.dumps(options), session))
            if before["faces"] != options["faces"]:
                db.execute("UPDATE sessions SET status='paused',elapsed=0,error=NULL WHERE id=?", (session,))
                db.execute("UPDATE photos SET status='pending',analysis=NULL,error=NULL WHERE session=?", (session,))

    def edit_groups(self, session, operation, identifiers=None):
        if operation not in ('combine', 'separate', 'reset', 'undo'):
            raise ValueError('Choose a supported group action')
        if operation in ('combine','separate'):
            if not isinstance(identifiers,list) or not identifiers or len(identifiers)>20000 or any(not isinstance(i,str) for i in identifiers):
                raise ValueError('Choose photos to regroup')
            identifiers = set(identifiers)
            if operation == 'combine' and len(identifiers)<2:
                raise ValueError('Choose at least two photos to combine')
        # Snapshot before opening the write transaction; the API serializes this
        # with engine state changes. Membership and status are rechecked below.
        snapshot = self.snapshot(session)
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            row = db.execute('SELECT status FROM sessions WHERE id=?',(session,)).fetchone()
            if row['status'] in ('running','pausing','importing') or snapshot['watch']['enabled']:
                raise ValueError('Pause processing and stop folder watching before editing groups')
            current = {p['id']:p['manual_group'] for p in db.execute('SELECT id,manual_group FROM photos WHERE session=?',(session,))}
            if operation == 'undo':
                previous = db.execute('SELECT sequence,previous FROM group_history WHERE session=? ORDER BY sequence DESC LIMIT 1',(session,)).fetchone()
                if previous:
                    db.executemany('UPDATE photos SET manual_group=? WHERE id=? AND session=?',[(value,key,session) for key,value in json.loads(previous['previous']).items()])
                    db.execute('DELETE FROM group_history WHERE sequence=?',(previous['sequence'],))
                return
            updated = dict(current)
            if operation == 'reset':
                updated = dict.fromkeys(current)
            else:
                if not identifiers.issubset(current):
                    raise KeyError('Every photo must belong to this project')
                if not snapshot['options']['grouping']:
                    raise ValueError('Enable similar-shot grouping first')
                # Freeze all affected source groups, so split-out photos cannot
                # silently regroup during the next snapshot or reanalysis.
                for group in snapshot['groups']:
                    if identifiers.intersection(p['id'] for p in group['photos']):
                        remainder = uuid.uuid4().hex
                        for photo in group['photos']:
                            if photo['id'] not in identifiers:
                                updated[photo['id']] = remainder
                destination = uuid.uuid4().hex
                for identifier in identifiers:
                    updated[identifier] = destination if operation=='combine' else uuid.uuid4().hex
            changes = {key:current[key] for key in current if current[key]!=updated[key]}
            if changes:
                db.execute('INSERT INTO group_history(session,previous) VALUES (?,?)',(session,json.dumps(changes)))
                db.executemany('UPDATE photos SET manual_group=? WHERE id=? AND session=?',[(updated[key],key,session) for key in changes])

    def set_watch(self, session, config):
        if not isinstance(config,dict) or set(config) != {'enabled','folder','auto_cull'} or type(config['enabled']) is not bool or type(config['auto_cull']) is not bool:
            raise ValueError('Invalid watched-folder settings')
        if config['enabled']:
            folder = Path(config['folder']).expanduser().resolve(strict=True)
            if not folder.is_dir(): raise ValueError('Choose an existing tethering folder')
            config = {**config,'folder':str(folder)}
        with self.connect() as db:
            if not db.execute('UPDATE sessions SET watch=? WHERE id=?',(json.dumps(config),session)).rowcount: raise KeyError('Project missing')

    def preferences(self, session, values):
        if not isinstance(values,dict) or set(values) != {'workflow','target','avoid_blur','avoid_closed','avoid_exposure','auto_xmp'}:
            raise ValueError('Invalid selection preferences')
        if values['workflow'] not in ('automated','assisted') or type(values['target']) is not int or not 0 <= values['target'] <= 20000:
            raise ValueError('Target must be 0 (automatic) to 20,000')
        if any(type(values[k]) is not bool for k in ['avoid_blur','avoid_closed','avoid_exposure','auto_xmp']): raise ValueError('Invalid threshold preferences')
        with self.connect() as db:
            if not db.execute('UPDATE sessions SET preferences=? WHERE id=?',(json.dumps(values),session)).rowcount: raise KeyError('Project missing')

    def rate(self, session, photo, rating, label):
        if type(rating) is not int or not 0 <= rating <= 5 or label not in ('','Red','Yellow','Green','Blue','Purple'):
            raise ValueError('Choose 0-5 stars and a supported color label')
        with self.connect() as db:
            if not db.execute('UPDATE photos SET rating=?,label=?,metadata_touched=1 WHERE session=? AND id=?',(rating,label,session,photo)).rowcount: raise KeyError('Photo missing')

    def sessions(self):
        with self.connect() as db:
            return [dict(row) for row in db.execute("""SELECT s.*, COUNT(p.id) total,
                SUM(CASE WHEN p.decision='keep' THEN 1 ELSE 0 END) kept,
                SUM(CASE WHEN p.status='ready' THEN 1 ELSE 0 END) completed,
                (SELECT id FROM photos WHERE session=s.id AND data IS NOT NULL ORDER BY CASE WHEN decision='keep' THEN 0 ELSE 1 END,name LIMIT 1) cover
                FROM sessions s LEFT JOIN photos p ON p.session=s.id GROUP BY s.id
                ORDER BY s.created DESC, s.rowid DESC""")]

    def snapshot(self, session):
        with self.connect() as db:
            row = db.execute("SELECT * FROM sessions WHERE id=?", (session,)).fetchone()
            if row is None:
                raise KeyError("Session not found")
            result = dict(row)
            result["options"] = {"grouping": True, "faces": True, "alternatives": True, **json.loads(result["options"])}
            photos = []
            for photo_row in db.execute("SELECT * FROM photos WHERE session=? ORDER BY name,id", (session,)):
                photo = dict(photo_row)
                analysis_json = photo.pop("analysis")
                data = json.loads(photo.pop("data") or "{}")
                # Repair older JPEG records that missed timestamps in the nested
                # EXIF IFD. Persist once; no quality reanalysis or decision reset.
                if data and data.get('capture_metadata_version', 0) < 2:
                    if not data.get('captured_at'):
                        try:
                            source = Path(photo['source'])
                            stat = source.stat()
                            if stat.st_size == data.get('original_bytes') and stat.st_mtime_ns == data.get('original_modified_ns'):
                                data['captured_at'] = camera_metadata(source)['captured_at']
                        except (OSError,ValueError):
                            pass
                    data['capture_metadata_version'] = 2
                    db.execute('UPDATE photos SET data=? WHERE id=?', (json.dumps(data),photo['id']))
                # The importer cache id must not replace the session's durable photo id.
                data.pop("id", None)
                photo.update(data)
                photo["analysis"] = json.loads(analysis_json) if analysis_json else None
                if photo['analysis'] and photo['analysis'].get('grouping_version',0)<2 and photo.get('thumbnail'):
                    try:
                        import numpy as np
                        from PIL import Image
                        with Image.open(data.get('analysis') or photo['thumbnail']) as image:
                            photo['analysis'].update(grouping_features(np.asarray(image.convert('RGB'))))
                        db.execute('UPDATE photos SET analysis=? WHERE id=?', (json.dumps(photo['analysis']),photo['id']))
                    except (OSError,ValueError):
                        pass
                photos.append(photo)
            result['watch'] = {'enabled':False,'folder':'','auto_cull':True, **json.loads(result['watch'])}
            result['preferences'] = {'workflow':'assisted', 'target':0, 'avoid_blur':True, 'avoid_closed':True, 'avoid_exposure':True, 'auto_xmp':False, **json.loads(result['preferences'])}
            for photo in photos:
                photo['selection_warnings'] = selection_warnings(photo, result['preferences']) if photo.get('analysis') else []
            result["photos"] = photos
            result["groups"] = group_photos(photos, result["options"]["grouping"], result["options"]["alternatives"], result["preferences"])
            result['recommendations'] = recommend(photos, result['groups'], result['preferences']['target'],result['preferences']) if result['preferences']['workflow'] == 'automated' else []
            result['recommendation_count'] = len(result['recommendations'])
            result['recommendation_summary'] = recommendation_summary(photos, result['groups'], result['recommendations'], result['preferences']['target'])
            result['review_recommendations'] = [p['id'] for p in photos if p['id'] in result['recommendations'] and p['selection_warnings']]
            # Learned descriptors stay local in SQLite; keep renderer responses small.
            for photo in photos:
                if photo.get('analysis'):
                    for field in ('embedding','local_points','local_descriptors'):
                        photo['analysis'].pop(field,None)
            result["completed"] = sum(p["status"] in ("ready", "error") for p in photos)
            result["failed"] = sum(p["status"] == "error" for p in photos)
            result["analyzed"] = sum(p["status"] == "ready" and p["analysis"] is not None for p in photos)
            result["total"] = len(photos)
            result["imported"] = sum(bool(p.get("thumbnail")) for p in photos)
            result["pending"] = sum(p["status"] == "pending" for p in photos)
            result["import_errors"] = sum(p["status"] == "error" and not p.get("thumbnail") for p in photos)
            result["preview_pending"] = sum(p["status"] == "pending" and not p.get("thumbnail") for p in photos)
            result["can_undo"] = db.execute("SELECT 1 FROM history WHERE session=? LIMIT 1", (session,)).fetchone() is not None
            result['can_undo_groups'] = db.execute('SELECT 1 FROM group_history WHERE session=?',(session,)).fetchone() is not None
            result['has_manual_groups'] = any(p.get('manual_group') for p in photos)
            return result

    def update_status(self, session, status, error=None):
        with self.connect() as db:
            cursor = db.execute("UPDATE sessions SET status=?, error=? WHERE id=?", (status, error, session))
            if not cursor.rowcount:
                raise KeyError("Session not found")

    def add_elapsed(self, session, seconds):
        with self.connect() as db:
            db.execute("UPDATE sessions SET elapsed=elapsed+? WHERE id=?", (seconds, session))

    def pending(self, session):
        with self.connect() as db:
            return [dict(row) for row in db.execute("SELECT * FROM photos WHERE session=? AND status='pending' ORDER BY name,id", (session,))]

    def save_analysis(self, photo, record, analysis):
        with self.connect() as db:
            db.execute("UPDATE photos SET status='ready',data=?,analysis=?,error=NULL WHERE id=?", (json.dumps(record), json.dumps(analysis), photo))

    def save_preview(self, photo, record):
        with self.connect() as db:
            db.execute("UPDATE photos SET data=?,error=NULL WHERE id=?", (json.dumps(record), photo))

    def fail_photo(self, photo, error):
        with self.connect() as db:
            db.execute("UPDATE photos SET status='error',error=? WHERE id=?", (error, photo))

    def retry_errors(self, session):
        with self.connect() as db:
            row = db.execute("SELECT status FROM sessions WHERE id=?", (session,)).fetchone()
            if row is None:
                raise KeyError("Project not found")
            if row["status"] in ("running", "pausing", "importing"):
                raise ValueError("Pause processing before retrying failed photos")
            cursor = db.execute("UPDATE photos SET status='pending',analysis=NULL,error=NULL WHERE session=? AND status='error'", (session,))
            if cursor.rowcount:
                db.execute("UPDATE sessions SET status='paused',error=NULL WHERE id=?", (session,))
            return cursor.rowcount

    def change_mode(self, session, mode, force=False):
        if mode not in MODES:
            raise ValueError("Invalid performance mode")
        with self.connect() as db:
            row = db.execute("SELECT status,mode FROM sessions WHERE id=?", (session,)).fetchone()
            if row is None:
                raise KeyError("Session not found")
            if row["status"] in ("running", "pausing", "importing"):
                raise ValueError("Pause processing before changing the mode")
            if row["mode"] != mode or force:
                db.execute("UPDATE sessions SET mode=?,status='paused',elapsed=0,error=NULL WHERE id=?", (mode, session))
                db.execute("UPDATE photos SET status='pending',analysis=NULL,error=NULL WHERE session=?", (session,))

    def decide(self, session, photo, decision, reason=None):
        self.decide_many(session, [photo], decision, reason)

    def decide_many(self, session, photos, decision, reason=None):
        if decision not in ('keep', 'reject', 'undecided'):
            raise ValueError('Invalid selection')
        if reason is not None and (not isinstance(reason,str) or len(reason.strip()) > 400):
            raise ValueError('Rejection reason must be text up to 400 characters')
        if not isinstance(photos, list) or not 1 <= len(photos) <= 20000 or any(not isinstance(p, str) or not p for p in photos):
            raise ValueError('Choose 1 to 20,000 photos')
        ids = list(dict.fromkeys(photos))
        with self.connect() as db:
            rows = []
            for photo in ids:
                row = db.execute('SELECT decision,rejection_reason FROM photos WHERE id=? AND session=?', (photo, session)).fetchone()
                if row is None:
                    raise KeyError('Photo not found in this project')
                rows.append((photo, row['decision'], row['rejection_reason']))
            batch = uuid.uuid4().hex
            for photo, previous, previous_reason in rows:
                saved_reason = (reason.strip() if reason is not None else previous_reason if previous == 'reject' else '') or 'Rejected by you'
                if decision != 'reject': saved_reason = ''
                if previous != decision or previous_reason != saved_reason:
                    db.execute('INSERT INTO history(session,photo,previous,batch,previous_reason) VALUES (?,?,?,?,?)', (session,photo,previous,batch,previous_reason))
                    db.execute('UPDATE photos SET decision=?,rejection_reason=? WHERE id=?', (decision,saved_reason,photo))

    def undo(self, session):
        with self.connect() as db:
            history = db.execute('SELECT * FROM history WHERE session=? ORDER BY sequence DESC LIMIT 1', (session,)).fetchone()
            if history:
                rows = db.execute('SELECT * FROM history WHERE session=? AND batch=? ORDER BY sequence DESC', (session,history['batch'])).fetchall() if history['batch'] else [history]
                for row in rows:
                    db.execute('UPDATE photos SET decision=?,rejection_reason=? WHERE id=?', (row['previous'],row['previous_reason'] or '',row['photo']))
                    db.execute('DELETE FROM history WHERE sequence=?', (row['sequence'],))

    def file(self, photo, kind, face_index=None):
        with self.connect() as db:
            row = db.execute("SELECT source,data,analysis FROM photos WHERE id=?", (photo,)).fetchone()
            if row is None:
                raise KeyError("Photo not found")
            data = json.loads(row["data"] or "{}")
            if kind == "original":
                path = render_original(Path(row["source"]), data)
            elif kind == "embedded" and data.get("inspection_source"):
                path = upright_embedded(Path(row["source"]), Path(data["analysis"]).parent)
            elif kind in ("thumbnail", "analysis") and kind in data:
                path = Path(data[kind])
            elif kind == "face":
                analysis = json.loads(row["analysis"] or "{}")
                faces = analysis.get("faces", [])
                if face_index is None or face_index < 0 or face_index >= len(faces):
                    raise KeyError("Face crop not found")
                path = Path(faces[face_index]["crop"])
            else:
                raise KeyError("Preview not ready")
            if not path.is_file():
                raise FileNotFoundError("Source or preview is missing; check the photo folder")
            return path
