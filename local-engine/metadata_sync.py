"""Coalesce metadata edits and write sidecars outside the UI request thread."""
import threading
from xmp import export_sidecars


class MetadataSync:
    def __init__(self):
        self.condition = threading.Condition()
        self.pending = {}
        self.errors = {}
        self.failures = {}
        self.stopping = False
        self.thread = None

    def submit(self, session, photos, recommended):
        with self.condition:
            for photo in photos:
                self.pending[photo['id']] = (session, photo, photo['id'] in recommended)
            if self.thread is None:
                self.thread = threading.Thread(target=self.run, daemon=True)
                self.thread.start()
            self.condition.notify()

    def run(self):
        while True:
            with self.condition:
                self.condition.wait_for(lambda:self.pending or self.stopping)
                if not self.pending and self.stopping: return
                batch = list(self.pending.values())
                self.pending.clear()
            for session, photo, suggested in batch:
                result = export_sidecars([photo],[photo['id']] if suggested else [])
                if result['failed']: self.failures[photo['id']] = (session,photo['name']+': '+result['errors'][0]['error'])
                else: self.failures.pop(photo['id'],None)
                errors = [message for project,message in self.failures.values() if project==session]
                if errors: self.errors[session] = errors[0]
                else: self.errors.pop(session,None)

    def close(self):
        with self.condition:
            self.stopping=True
            self.condition.notify()
        if self.thread: self.thread.join()
