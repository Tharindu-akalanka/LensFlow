const { execFileSync } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const root = path.resolve(__dirname, "../..");
const desktop = path.join(root, "desktop");
const model = path.join(root, "local-engine/models/face_landmarker.task");
if (!fs.existsSync(model))
  throw new Error("Run python local-engine/setup_model.py first.");
const build = path.join(desktop, ".build");
fs.mkdirSync(build, { recursive: true });
execFileSync(
  process.env.LENSFLOW_PYTHON || "python",
  [
    "-m",
    "PyInstaller",
    "--noconfirm",
    "--onedir",
    "--name",
    "lensflow-engine",
    "--distpath",
    path.join(desktop, "engine"),
    "--workpath",
    build,
    "--specpath",
    build,
    "--paths",
    path.join(root, "local-engine"),
    "--collect-all",
    "mediapipe",
    "--collect-all", "pillow_heif",
    "--collect-all", "rawpy",
    "--collect-all", "onnxruntime",
    "--exclude-module",
    "torch",
    "--exclude-module",
    "tensorflow",
    "--exclude-module",
    "IPython",
    "--exclude-module",
    "pytest",
    "--exclude-module",
    "pandas",
    path.join(root, "local-engine/server.py"),
  ],
  { cwd: root, stdio: "inherit", windowsHide: true },
);
