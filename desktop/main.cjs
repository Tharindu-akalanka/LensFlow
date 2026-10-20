const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  session,
  screen,
  shell,
} = require("electron");
const { spawn } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const verifyingVisible = process.argv.includes("--verify-visible-startup");
const verifyingReopen = process.argv.includes("--verify-reopen");
const verifying = process.argv.includes("--verify-startup") || verifyingVisible || verifyingReopen;
let engine;
let origin;
let token;
let window;
let quitting = false;
let shutdownComplete = false;
const failures = [];
let revealRequested = false;
const lock = app.requestSingleInstanceLock();
if (!lock) app.quit();

function revealWindow() {
  if (!window || window.isDestroyed()) return;
  if (window.isMinimized()) window.restore();
  if (!window.isVisible()) window.center();
  window.show();
  window.focus();
}

function trusted(event) {
  if (
    !window ||
    event.senderFrame !== window.webContents.mainFrame ||
    new URL(event.senderFrame.url).origin !== origin
  ) {
    throw new Error("This action is available only in the SnapSort workspace");
  }
}

function startEngine() {
  const project = path.resolve(__dirname, "..");
  const data =
    process.env.LENSFLOW_DATA_DIR ||
    path.join(app.getPath("userData"), "library");
  const executable = app.isPackaged
    ? path.join(process.resourcesPath, "engine", process.platform === "win32" ? "lensflow-engine.exe" : "lensflow-engine")
    : process.env.LENSFLOW_PYTHON || "python";
  const args = app.isPackaged
    ? []
    : [path.join(project, "local-engine", "server.py")];
  const frontend = app.isPackaged
    ? path.join(process.resourcesPath, "frontend")
    : path.join(project, "frontend", "dist");
  const model = app.isPackaged
    ? path.join(process.resourcesPath, "models", "face_landmarker.task")
    : path.join(project, "local-engine", "models", "face_landmarker.task");
  if (!fs.existsSync(path.join(frontend, "index.html")))
    throw new Error(
      "Build the SnapSort interface before starting the desktop app.",
    );
  args.push(
    "--port",
    "0",
    "--data",
    data,
    "--frontend",
    frontend,
    "--model",
    model,
  );
  const legacy = [
    path.join(app.getPath("appData"), "LensFlow", "library"),
    path.join(app.getPath("appData"), "lensflow-desktop", "library"),
    ...(!app.isPackaged ? [path.join(project, "local-engine", ".local-data")] : []),
  ].find((directory) => fs.existsSync(path.join(directory, "sessions.sqlite3")));
  if (
    legacy &&
    !fs.existsSync(path.join(data, "sessions.sqlite3"))
  )
    args.push("--migrate", legacy);
  token = crypto.randomBytes(32).toString("hex");
  engine = spawn(executable, args, {
    windowsHide: true,
    cwd: app.isPackaged ? process.resourcesPath : project,
    env: {
      ...process.env,
      LENSFLOW_ENGINE_TOKEN: token,
      PYTHONUNBUFFERED: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  return new Promise((resolve, reject) => {
    let output = "";
    let stderr = "";
    let ready = false;
    const timer = setTimeout(
      () =>
        reject(
          new Error(
            `The local engine did not start in time. ${stderr.slice(-1000)}`,
          ),
        ),
      90000,
    );
    engine.stderr.on("data", (chunk) => {
      stderr = (stderr + chunk.toString()).slice(-5000);
    });
    engine.stdout.on("data", (chunk) => {
      output += chunk.toString();
      const match = output.match(/(?:LensFlow|SnapSort) local: (http:\/\/127\.0\.0\.1:\d+)/);
      if (match && !ready) {
        ready = true;
        clearTimeout(timer);
        origin = match[1];
        resolve(origin);
      }
    });
    engine.once("error", (error) => {
      clearTimeout(timer);
      reject(
        new Error(`Cannot start the local photo engine: ${error.message}`),
      );
    });
    engine.once("exit", (code) => {
      clearTimeout(timer);
      if (!ready)
        reject(
          new Error(`Local engine exited (${code}). ${stderr.slice(-1500)}`),
        );
      else if (!quitting) {
        failures.push(`Engine exited (${code})`);
        if (!verifying)
          dialog.showErrorBox(
            "SnapSort engine stopped",
            "Your saved projects are safe. Restart SnapSort to resume processing.",
          );
      }
    });
  });
}

async function stopEngine() {
  if (!engine || engine.exitCode !== null) return;
  try {
    await fetch(`${origin}/api/shutdown`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: "{}",
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    /* A failed startup may have no listening engine yet. */
  }
  await new Promise((resolve) => {
    if (engine.exitCode !== null) return resolve();
    const timer = setTimeout(() => {
      engine.kill();
      resolve();
    }, 7000);
    engine.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function installIpc() {
  const transfers = require('./lightroom-transfer.cjs');
  const transferRoot = path.join(app.getPath('userData'),'lightroom-transfers');
  ipcMain.handle('snapsort:lightroom-setup',async event=>{
    trusted(event);
    const source=app.isPackaged ? path.join(process.resourcesPath,'lightroom','SnapSort.lrplugin') : path.join(__dirname,'lightroom','SnapSort.lrplugin');
    const destination=path.join(app.getPath('userData'),'plugins','SnapSort.lrplugin');
    await fs.promises.cp(source,destination,{recursive:true});
    shell.showItemInFolder(path.join(destination,'Info.lua'));
    return destination;
  });
  ipcMain.handle('snapsort:lightroom-send',async(event,projectId)=>{
    trusted(event);
    if(typeof projectId!=='string'|| !/^[a-f0-9]{32}$/.test(projectId)) throw new Error('Invalid project.');
    const response=await fetch(`${origin}/api/sessions/${projectId}`,{headers:{Authorization:`Bearer ${token}`}});
    if(!response.ok) throw new Error('Could not read this project.');
    const project=await response.json();
    if(['running','importing','pausing'].includes(project.status)) throw new Error('Pause processing before sending to Lightroom.');
    const transfer=await transfers.createTransfer(transferRoot,project);
    // Only our fixed Lightroom scheme is opened; renderer cannot supply URLs.
    let launchError='';
    try { await shell.openExternal(transfer.url); } catch(error) { launchError=error.message; }
    return {id:transfer.id,launchError};
  });
  ipcMain.handle('snapsort:lightroom-status',async(event,id)=>{trusted(event);return transfers.status(transferRoot,id);});
  ipcMain.handle('snapsort:lightroom-reveal',async(event,id)=>{
    trusted(event);
    await transfers.status(transferRoot,id); // Validate identifier before resolving it.
    shell.showItemInFolder(path.join(transferRoot,`${id}.snapsort-transfer.tsv`));
  });
  ipcMain.handle("snapsort:choose-photos", async (event) => {
    trusted(event);
    const result = await dialog.showOpenDialog(window, {
      title: "Import shoot photographs",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Camera photographs", extensions: ["jpg", "jpeg", "heic", "heif", "cr3", "cr2", "arw", "nef", "nrw", "raf", "rw2", "orf", "dng", "pef", "srw"] }],
    });
    return result.canceled ? [] : result.filePaths;
  });
  ipcMain.handle("snapsort:choose-folder", async (event) => {
    trusted(event);
    const result = await dialog.showOpenDialog(window, {
      title: "Choose a shoot folder",
      properties: ["openDirectory"],
    });
    return result.canceled ? null : result.filePaths[0];
  });
  ipcMain.handle("snapsort:save-report", async (event, report) => {
    trusted(event);
    if (typeof report !== "string" || report.length > 50 * 1024 * 1024)
      throw new Error("Invalid selection report");
    JSON.parse(report);
    const result = await dialog.showSaveDialog(window, {
      title: "Save selection report",
      defaultPath: "SnapSort selections.json",
      filters: [{ name: "Selection report", extensions: ["json"] }],
    });
    if (result.canceled) return false;
    await fs.promises.writeFile(result.filePath, report, "utf8");
    return true;
  });
}

async function createWindow() {
  await startEngine();
  const partition = "persist:snapsort-workspace";
  const isolated = session.fromPartition(partition);
  await isolated.cookies.set({
    url: origin,
    name: "lensflow_engine",
    value: token,
    httpOnly: true,
    sameSite: "strict",
    path: "/",
  });
  isolated.setPermissionRequestHandler((_contents, _permission, callback) =>
    callback(false),
  );
  const workArea = screen.getPrimaryDisplay().workAreaSize;
  window = new BrowserWindow({
    width: Math.min(1500, workArea.width),
    height: Math.min(940, workArea.height),
    minWidth: Math.min(1100, workArea.width),
    minHeight: Math.min(720, workArea.height),
    show: false,
    title: "SnapSort",
    backgroundColor: "#252525",
    titleBarStyle: "hidden",
    titleBarOverlay: { color: "#202020", symbolColor: "#c8c8c8", height: 44 },
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition,
    },
  });
  installIpc();
  window.setIcon(
    path.join(
      app.isPackaged ? process.resourcesPath : path.resolve(__dirname, '..'),
      app.isPackaged ? "frontend" : "frontend/dist",
      "branding",
      "app-icon-128.png",
    ),
  );
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, url) => {
    if (new URL(url).origin !== origin) event.preventDefault();
  });
  window.webContents.on("render-process-gone", (_event, details) => {
    failures.push(`Renderer stopped: ${details.reason}`);
  });
  window.webContents.on("console-message", (details) => {
    if (details.level === "error") failures.push(details.message);
  });
  window.webContents.on("preload-error", (_event, _path, error) =>
    failures.push(`Desktop bridge failed: ${error.message}`),
  );
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: "File",
        submenu: [
          {
            label: "New Project",
            accelerator: "CmdOrCtrl+N",
            click: () => window.webContents.send("snapsort:new-project"),
          },
          { role: "quit" },
        ],
      },
      {
        label: "Edit",
        submenu: [
          {
            label: "Undo Selection",
            accelerator: "CmdOrCtrl+Z",
            click: () => window.webContents.send("snapsort:undo-selection"),
          },
          { type: "separator" },
          { role: "cut" },
          { role: "copy" },
          { role: "paste" },
          { role: "selectAll" },
        ],
      },
      {
        label: "View",
        submenu: [
          { role: "togglefullscreen" },
          { role: "resetZoom" },
          { role: "zoomIn" },
          { role: "zoomOut" },
        ],
      },
    ]),
  );
  await window.loadURL(origin);
  if (!verifying || verifyingVisible || revealRequested) revealWindow();
  if (verifyingReopen) {
    window.show();
    window.hide();
    const reopened = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("A second launch did not reveal the hidden window")), 15000);
      window.once("show", () => { clearTimeout(timer); resolve(); });
    });
    const secondary = spawn(process.execPath, app.isPackaged ? [] : [__dirname], { windowsHide: true, stdio: "ignore" });
    secondary.on("error", () => {});
    await reopened;
  }
  if (verifying) {
    const health = await fetch(`${origin}/api/health`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((response) => response.json());
    if (!health.local || !health.model_ready)
      failures.push("Local model or health check failed");
    if ((verifyingVisible || verifyingReopen) && !window.isVisible())
      failures.push("Desktop window did not become visible");
    console.log(
      JSON.stringify({
        desktop: true,
        packaged: app.isPackaged,
        rendererLoaded: !window.webContents.isLoading(),
        windowVisible: window.isVisible(),
        secondLaunchRevealed: verifyingReopen ? window.isVisible() : undefined,
        localEngine: health,
        failures,
      }),
    );
    app.exitCode = failures.length ? 1 : 0;
    app.quit();
  }
}

app.on("second-instance", () => {
  revealRequested = true;
  revealWindow();
});
app.on("activate", revealWindow);
app.on("window-all-closed", () => app.quit());
app.on("before-quit", (event) => {
  if (shutdownComplete) return;
  event.preventDefault();
  quitting = true;
  void stopEngine().finally(() => {
    shutdownComplete = true;
    app.exit(app.exitCode || 0);
  });
});
if (lock)
  app
    .whenReady()
    .then(createWindow)
    .catch(async (error) => {
      quitting = true;
      if (verifying) console.error(error);
      else dialog.showErrorBox("SnapSort could not start", error.message);
      await stopEngine();
      shutdownComplete = true;
      app.exit(1);
    });
