const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', {
  version: '2.2.0',
  quit: () => ipcRenderer.invoke('window:quit'),
  toggleFullscreen: () => ipcRenderer.invoke('window:fullscreen')
});
