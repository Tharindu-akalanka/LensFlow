import hashlib, json, sqlite3, sys
from pathlib import Path
from server import Engine
root = Path(sys.argv[1])
session = sys.argv[2]
backup = Path(sys.argv[3])
with sqlite3.connect(root / "sessions.sqlite3") as connection, sqlite3.connect(backup) as target:
    connection.backup(target)
engine = Engine(root, Path(__file__).parent / "models/face_landmarker.task")
photos = engine.store.snapshot(session)["photos"]
def hashes():
    return {p["id"]: hashlib.sha256(Path(p["source"]).read_bytes()).hexdigest() for p in photos}
before = hashes()
engine.retry(session)
engine.worker.join(120)
result = engine.store.snapshot(session)
assert not engine.worker.is_alive()
assert result["imported"] == result["total"] and result["failed"] == 0, result
assert hashes() == before
print(json.dumps({key:result[key] for key in ["status","total","imported","analyzed","failed"]} | {"originals_unchanged":True}))
