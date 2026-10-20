"""Loopback-only local culling API and packaged frontend server."""
import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
import itertools
import hmac
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import shutil
import sqlite3
import threading
import time
from urllib.parse import parse_qs, urlparse

from analysis import Analyzer
from import_photos import import_photo
from store import Store
from watching import FolderWatcher
from xmp import export_sidecars
from metadata_sync import MetadataSync


class Engine:
    def __init__(self, root, model):
        self.store = Store(root)
        self.analyzer = Analyzer(model)
        self.lock = threading.RLock()
        self.worker = None
        self.active = None
        self.pause_requested = threading.Event()
        self.watcher = FolderWatcher(self)
        self.metadata_sync = MetadataSync()
        self.xmp_conflicts = {}

    def start(self, session):
        with self.lock:
            if self.worker and self.worker.is_alive():
                raise ValueError("Another analysis is running; pause it first")
            snapshot = self.store.snapshot(session)
            if not snapshot["total"]:
                raise ValueError("Import photos before starting culling")
            if not snapshot["pending"]:
                self.store.update_status(session, "partial" if snapshot["analyzed"] and snapshot["failed"] else "failed" if snapshot["failed"] else "complete")
                return
            if snapshot["preview_pending"]:
                raise ValueError("Prepare previews before culling. Use Prepare previews or Retry failed photos.")
            self.pause_requested.clear()
            self.active = session
            self.store.update_status(session, "running")
            self.worker = threading.Thread(target=self.run, args=(session, snapshot["mode"], snapshot["options"]["faces"]), daemon=True)
            self.worker.start()

    def pause(self, session):
        self.watcher.requested.discard(session)
        with self.lock:
            if self.active == session and self.worker and self.worker.is_alive():
                self.pause_requested.set()
                self.store.update_status(session, "pausing")
            elif self.store.snapshot(session)["status"] != "complete":
                self.store.update_status(session, "paused")

    def change_mode(self, session, mode, force=False):
        with self.lock:
            if self.active == session and self.worker and self.worker.is_alive():
                raise ValueError("Wait for the current photo to finish pausing")
            self.store.change_mode(session, mode, force)

    def import_files(self, session, files=None, folder=None):
        with self.lock:
            if self.worker and self.worker.is_alive():
                raise ValueError("Finish or pause the current import / culling job first")
            added = self.store.import_files(session, files, folder)
            if added:
                self.pause_requested.clear()
                self.active = session
                self.store.update_status(session, "importing")
                self.worker = threading.Thread(target=self.prepare, args=(session,), daemon=True)
                self.worker.start()
            return added

    def prepare(self, session):
        try:
            photos = iter(p for p in self.store.pending(session) if not p['data'])
            with ThreadPoolExecutor(max_workers=2) as pool:
                while not self.pause_requested.is_set():
                    batch = list(itertools.islice(photos,2))
                    if not batch: break
                    started = time.perf_counter()
                    futures = [pool.submit(import_photo,Path(p['source']),self.store.root / 'previews') for p in batch]
                    for photo,future in zip(batch,futures):
                        try: self.store.save_preview(photo['id'],future.result())
                        except Exception as error: self.store.fail_photo(photo['id'],str(error))
                    self.store.add_elapsed(session,time.perf_counter()-started)
            state = self.store.snapshot(session)
            status = "paused" if state["preview_pending"] else "previews_ready" if state["imported"] else "failed"
            self.store.update_status(session, status)
        except Exception as error:
            self.store.update_status(session, "paused", str(error))

    def change_options(self, session, options):
        with self.lock:
            if self.active == session and self.worker and self.worker.is_alive():
                raise ValueError("Wait until the current photo finishes pausing")
            self.store.change_options(session, options)

    def retry(self, session):
        with self.lock:
            if self.worker and self.worker.is_alive():
                raise ValueError("Wait for the current job to stop before retrying")
            self.store.snapshot(session)
            self.store.retry_errors(session)
            self.pause_requested.clear()
            self.active = session
            self.store.update_status(session, "importing")
            self.worker = threading.Thread(target=self.prepare, args=(session,), daemon=True)
            self.worker.start()

    def run(self, session, mode, check_faces=True):
        try:
            for photo in self.store.pending(session):
                if self.pause_requested.is_set():
                    break
                started = time.perf_counter()
                try:
                    source = Path(photo["source"])
                    record = import_photo(source, self.store.root / "previews")
                    analysis = self.analyzer.analyze(record, mode) if check_faces else self.analyzer.analyze(record, mode, check_faces=False)
                    # Source mutation during processing must not attach stale analysis.
                    stat = source.stat()
                    if stat.st_size != record["original_bytes"] or stat.st_mtime_ns != record["original_modified_ns"]:
                        raise ValueError("Source changed during analysis; import a new session")
                    self.store.save_analysis(photo["id"], record, analysis)
                except Exception as error:
                    self.store.fail_photo(photo["id"], str(error))
                finally:
                    self.store.add_elapsed(session, time.perf_counter() - started)
            with self.lock:
                state = self.store.snapshot(session)
                status = "paused" if state["pending"] else "partial" if state["failed"] and state["analyzed"] else "failed" if state["failed"] else "complete"
                self.store.update_status(session, status)
            self.sync_xmp(session)
        except Exception as error:
            self.store.update_status(session, "paused", str(error))

    def sync_xmp(self,session,photo=None):
        state = self.store.snapshot(session)
        if state['preferences']['auto_xmp']:
            paths = [str(Path(p['source']).with_suffix('.xmp')).casefold() for p in state['photos']]
            collisions = {key for key,count in Counter(paths).items() if count>1}
            if collisions: self.xmp_conflicts[session] = 'RAW/JPEG files share sidecar names; conflicting metadata was not written.'
            self.metadata_sync.submit(session,[p for p in state['photos'] if (photo is None or p['id'] == photo) and str(Path(p['source']).with_suffix('.xmp')).casefold() not in collisions],state['recommendations'])

    def close(self):
        self.watcher.close()
        self.pause_requested.set()
        if self.worker:
            self.worker.join()
        self.analyzer.close()
        self.metadata_sync.close()


class Handler(BaseHTTPRequestHandler):
    server_version = "LensFlowLocal/1"

    def log_message(self, *_args):
        pass

    def json_response(self, data, status=200):
        payload = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(payload)

    def local_request(self):
        host = self.headers.get("Host", "").split(":")[0]
        origin = self.headers.get("Origin")
        allowed = host in ("localhost", "127.0.0.1") and (not origin or origin in self.server.allowed_origins)
        token = getattr(self.server, "token", None)
        if token:
            from http.cookies import SimpleCookie
            cookies = SimpleCookie()
            cookies.load(self.headers.get("Cookie", ""))
            cookie = cookies.get("lensflow_engine")
            provided = cookie.value if cookie else self.headers.get("Authorization", "").removeprefix("Bearer ")
            allowed = allowed and hmac.compare_digest(provided, token)
        return allowed

    def stream(self, path, content_type):
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(path.stat().st_size))
        self.send_header("Cache-Control", "private, max-age=0")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        with path.open("rb") as handle:
            shutil.copyfileobj(handle, self.wfile, length=1024 * 1024)

    def do_GET(self):
        if not self.local_request():
            self.json_response({"error": "Only local app requests are accepted"}, 403)
            return
        parsed = urlparse(self.path)
        parts = parsed.path.strip("/").split("/")
        store = self.server.engine.store
        try:
            if parts == ["api", "health"]:
                self.json_response({"local": True, "model_ready": self.server.engine.analyzer.model_path.is_file(), "visual_model_ready": self.server.engine.analyzer.visual.model.is_file()})
            elif parts == ["api", "sessions"]:
                self.json_response(store.sessions())
            elif len(parts) == 3 and parts[:2] == ["api", "sessions"]:
                snapshot = store.snapshot(parts[2])
                snapshot['xmp_error'] = self.server.engine.xmp_conflicts.get(parts[2]) or self.server.engine.metadata_sync.errors.get(parts[2])
                snapshot['watch_error'] = self.server.engine.watcher.errors.get(parts[2])
                self.json_response(snapshot)
            elif len(parts) == 4 and parts[:2] == ["api", "photos"]:
                index = parse_qs(parsed.query).get("index", [None])[0]
                path = store.file(parts[2], parts[3], int(index) if index is not None else None)
                self.stream(path, "image/jpeg")
            elif parts[0] != "api" and self.server.frontend.is_dir():
                import mimetypes
                path = (self.server.frontend / parsed.path.lstrip("/")).resolve()
                if not path.is_relative_to(self.server.frontend):
                    raise KeyError("Not found")
                if not path.is_file():
                    path = self.server.frontend / "index.html"
                self.stream(path, mimetypes.guess_type(path)[0] or "application/octet-stream")
            else:
                raise KeyError("Not found")
        except (KeyError, FileNotFoundError) as error:
            self.json_response({"error": str(error)}, 404)
        except (ValueError, OSError) as error:
            self.json_response({"error": str(error)}, 400)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_POST(self):
        if not self.local_request() or self.headers.get("Content-Type", "").split(";")[0] != "application/json":
            self.json_response({"error": "Use the local app with JSON requests"}, 403)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 10 * 1024 * 1024:
                raise ValueError("Invalid request size")
            body = json.loads(self.rfile.read(length))
            if not isinstance(body, dict):
                raise ValueError("Expected a JSON object")
            parts = urlparse(self.path).path.strip("/").split("/")
            engine = self.server.engine
            if parts == ["api", "sessions"]:
                session = engine.store.create(body["folder"], body.get("mode", "balanced")) if "folder" in body else engine.store.create_project(body["name"], body.get("mode", "balanced"), body.get("shoot_type", "other"))
                self.json_response({"id": session}, 201)
            elif parts == ["api", "shutdown"] and self.server.token:
                self.json_response({"ok": True})
                threading.Thread(target=self.server.shutdown, daemon=True).start()
            elif len(parts) == 4 and parts[:2] == ["api", "sessions"]:
                session, action = parts[2:]
                if action == "resume":
                    engine.start(session)
                elif action == "pause":
                    engine.pause(session)
                elif action == "retry":
                    engine.retry(session)
                elif action == "mode":
                    engine.change_mode(session, body["mode"])
                elif action == 'reanalyze':
                    engine.change_mode(session, engine.store.snapshot(session)['mode'], force=True)
                    engine.start(session)
                elif action == "import":
                    added = engine.import_files(session, body.get("files"), body.get("folder"))
                    self.json_response({"added": added})
                    return
                elif action == "options":
                    engine.change_options(session, body["options"])
                elif action == 'groups':
                    with engine.lock:
                        engine.store.edit_groups(session,body['operation'],body.get('photos'))
                    engine.sync_xmp(session)
                elif action == 'preferences':
                    engine.store.preferences(session,body['preferences'])
                    engine.sync_xmp(session)
                elif action == 'rating':
                    engine.store.rate(session,body['photo'],body['rating'],body['label'])
                    engine.sync_xmp(session,body['photo'])
                elif action == 'watch':
                    engine.store.set_watch(session,body['watch'])
                    engine.watcher.start()
                    if body['watch']['enabled']: engine.pause_requested.clear()
                    if not body['watch']['enabled']: engine.watcher.requested.discard(session)
                elif action == 'xmp':
                    snapshot = engine.store.snapshot(session)
                    self.json_response(export_sidecars(snapshot['photos'],snapshot['recommendations']))
                    return
                elif action == "decision":
                    if 'photos' in body:
                        engine.store.decide_many(session, body['photos'], body['decision'], body.get('reason'))
                        engine.sync_xmp(session)
                    else:
                        engine.store.decide(session, body["photo"], body["decision"], body.get("reason"))
                        engine.sync_xmp(session,body["photo"])
                elif action == "undo":
                    engine.store.undo(session)
                    engine.sync_xmp(session)
                else:
                    raise KeyError("Unknown action")
                self.json_response({"ok": True})
            else:
                raise KeyError("Not found")
        except KeyError as error:
            self.json_response({"error": str(error)}, 404)
        except (ValueError, OSError, TypeError) as error:
            self.json_response({"error": str(error)}, 400)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    base = Path(__file__).parent
    parser.add_argument("--data", type=Path, default=base / ".local-data")
    parser.add_argument("--model", type=Path, default=base / "models" / "face_landmarker.task")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--frontend", type=Path, default=base.parent / "frontend" / "dist")
    parser.add_argument("--migrate", type=Path, help="Copy a legacy local database into a fresh data directory")
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    # Bind first: a duplicate launch must not reset an already running session.
    try:
        target_db = args.data / "sessions.sqlite3"
        if args.migrate and not target_db.exists() and (args.migrate / "sessions.sqlite3").is_file():
            args.data.mkdir(parents=True, exist_ok=True)
            with sqlite3.connect(args.migrate / "sessions.sqlite3") as source_db, sqlite3.connect(target_db) as destination_db:
                source_db.backup(destination_db)
            # Preserve cached previews as well as decisions when moving from the prototype.
            for directory in ("previews",):
                legacy_cache = args.migrate / directory
                if legacy_cache.is_dir():
                    shutil.copytree(legacy_cache, args.data / directory, dirs_exist_ok=True)
            with sqlite3.connect(target_db) as db:
                for photo_id, data, analysis in db.execute("SELECT id,data,analysis FROM photos").fetchall():
                    def relocate(value):
                        if isinstance(value, dict):
                            return {key: item if key in ("original", "source") else relocate(item) for key, item in value.items()}
                        if isinstance(value, list):
                            return [relocate(item) for item in value]
                        if isinstance(value, str):
                            for old in (str(args.migrate.resolve()), str(args.migrate.resolve()).replace('\\', '/')):
                                if value.startswith(old + '\\') or value.startswith(old + '/'):
                                    return str(args.data.resolve()) + value[len(old):]
                        return value
                    db.execute("UPDATE photos SET data=?,analysis=? WHERE id=?", (json.dumps(relocate(json.loads(data))) if data else None, json.dumps(relocate(json.loads(analysis))) if analysis else None, photo_id))
        engine = Engine(args.data, args.model)
        engine.watcher.start()
    except Exception:
        server.server_close()
        raise
    server.engine = engine
    server.token = os.environ.get("LENSFLOW_ENGINE_TOKEN")
    server.frontend = args.frontend.resolve()
    port = server.server_address[1]
    server.allowed_origins = {f"http://127.0.0.1:{port}", f"http://localhost:{port}", "http://localhost:5173", "http://127.0.0.1:5173"}
    print(f"LensFlow local: http://127.0.0.1:{port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        engine.close()


if __name__ == "__main__":
    main()
