const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("snapsortDesktop", {
  platform: process.platform,
  lightroomSetup: () => ipcRenderer.invoke('snapsort:lightroom-setup'),
  lightroomSend: id => ipcRenderer.invoke('snapsort:lightroom-send',id),
  lightroomStatus: id => ipcRenderer.invoke('snapsort:lightroom-status',id),
  lightroomReveal: id => ipcRenderer.invoke('snapsort:lightroom-reveal',id),
  choosePhotos: () => ipcRenderer.invoke("snapsort:choose-photos"),
  chooseFolder: () => ipcRenderer.invoke("snapsort:choose-folder"),
  saveReport: (report) => ipcRenderer.invoke("snapsort:save-report", report),
  onNewProject: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("snapsort:new-project", listener);
    return () => ipcRenderer.removeListener("snapsort:new-project", listener);
  },
  onUndoSelection: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("snapsort:undo-selection", listener);
    return () =>
      ipcRenderer.removeListener("snapsort:undo-selection", listener);
  },
});
