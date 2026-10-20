"""Stable-file polling for local tethering folders; no camera/cloud control."""
from pathlib import Path
import threading
from photo_io import PHOTO_EXTENSIONS


class FolderWatcher:
    def __init__(self, engine):
        self.engine = engine
        self.stop = threading.Event()
        self.stable = {}
        self.requested = set()
        self.errors = {}
        self.thread = None

    def start(self):
        if self.thread is None:
            self.thread = threading.Thread(target=self.loop, daemon=True)
            self.thread.start()

    def scan(self, session, folder):
        existing = {p['source'].casefold() for p in self.engine.store.snapshot(session)['photos']}
        ready = []
        seen = set()
        for source in sorted(Path(folder).iterdir()):
            if not source.is_file() or source.suffix.lower() not in PHOTO_EXTENSIONS or str(source.resolve()).casefold() in existing:
                continue
            seen.add(str(source))
            stat = source.stat()
            key = (session,str(source))
            previous = self.stable.get(key)
            value = (stat.st_size,stat.st_mtime_ns)
            count = previous[1] + 1 if previous and previous[0] == value else 0
            self.stable[key] = (value,count)
            if stat.st_size > 0 and count >= 2: ready.append(str(source))
        for key in list(self.stable):
            if key[0] == session and key[1] not in seen: self.stable.pop(key,None)
        return ready[:20000]

    def loop(self):
        while not self.stop.wait(1):
            for session in self.engine.store.sessions():
                config = self.engine.store.snapshot(session['id'])['watch']
                if not config.get('enabled'): continue
                try:
                    if self.engine.pause_requested.is_set(): continue
                    if self.engine.worker and self.engine.worker.is_alive(): continue
                    files = self.scan(session['id'],config['folder'])
                    if files:
                        self.engine.import_files(session['id'],files=files)
                        if config.get('auto_cull'): self.requested.add(session['id'])
                    elif session['id'] in self.requested:
                        state = self.engine.store.snapshot(session['id'])
                        if state['pending'] and not state['preview_pending']:
                            self.engine.start(session['id'])
                            self.requested.discard(session['id'])
                    self.errors.pop(session['id'],None)
                except (OSError,ValueError,KeyError) as error:
                    self.errors[session['id']] = str(error)

    def close(self):
        self.stop.set()
        if self.thread: self.thread.join(3)
