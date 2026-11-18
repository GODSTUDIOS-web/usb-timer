const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  onState: (cb) => ipcRenderer.on('state', (_e, s) => cb(s)),
  getState: () => ipcRenderer.invoke('get-state'),
  usbOn: () => ipcRenderer.invoke('usb-on'),
  usbOff: () => ipcRenderer.invoke('usb-off'),
  toggleAuto: (v) => ipcRenderer.invoke('toggle-auto', v),
  saveSettings: (s) => ipcRenderer.invoke('save-settings', s),
  restartCycle: () => ipcRenderer.invoke('restart-cycle')
});
