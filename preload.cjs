// preload.cjs — must be CommonJS (package.json is "type": "module")
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('widget', {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    close: () => ipcRenderer.invoke('window:close'),
    setMode: (mode) => ipcRenderer.invoke('window:set-mode', mode),
    togglePin: () => ipcRenderer.invoke('window:toggle-pin'),
    onMediaCommand: (callback) => {
        const listener = (_event, command) => callback(command);
        ipcRenderer.on('media:command', listener);
        return () => ipcRenderer.removeListener('media:command', listener);
    },
});
