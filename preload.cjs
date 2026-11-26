// preload.cjs — must be CommonJS (package.json is "type": "module")
const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('widget', {
    quit: () => ipcRenderer.invoke('app:quit'),
    setMode: (mode) => ipcRenderer.invoke('window:set-mode', mode),
    togglePin: () => ipcRenderer.invoke('window:toggle-pin'),
    getSettings: () => ipcRenderer.invoke('settings:get'),
    updateSettings: (patch) => ipcRenderer.invoke('settings:update', patch),
    setShortcut: (action, accelerator) => ipcRenderer.invoke('settings:set-shortcut', action, accelerator),
    toggleGhost: () => ipcRenderer.invoke('ghost:toggle'),
    pickFiles: () => ipcRenderer.invoke('files:pick'),
    describeFiles: (paths) => ipcRenderer.invoke('files:describe', paths),
    // Dropped files only expose their path through webUtils.
    pathForFile: (file) => webUtils.getPathForFile(file),
    getSystemSessions: () => ipcRenderer.invoke('system:get'),
    systemCommand: (command) => ipcRenderer.invoke('system:command', command),
    onSystemSessions: (callback) => {
        const listener = (_event, sessions) => callback(sessions);
        ipcRenderer.on('system:sessions', listener);
        return () => ipcRenderer.removeListener('system:sessions', listener);
    },
    onMediaCommand: (callback) => {
        const listener = (_event, command) => callback(command);
        ipcRenderer.on('media:command', listener);
        return () => ipcRenderer.removeListener('media:command', listener);
    },
});
