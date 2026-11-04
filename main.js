// main.js
import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import * as path from 'path';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const LOCAL_HOST = 'localhost';
const MIME = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
};
const MODES = {
    full: { width: 360, height: 470, minWidth: 300, minHeight: 420, resizable: true },
    mini: { width: 340, height: 84, minWidth: 0, minHeight: 0, resizable: false },
};
const MEDIA_KEYS = {
    MediaPlayPause: 'toggle',
    MediaNextTrack: 'next',
    MediaPreviousTrack: 'prev',
};

let mainWindow = null;

async function createWindow() {
    mainWindow = new BrowserWindow({
        width: MODES.full.width,
        height: MODES.full.height,
        minWidth: MODES.full.minWidth,
        minHeight: MODES.full.minHeight,
        maximizable: false,
        fullscreenable: false,
        frame: false,
        alwaysOnTop: true,
        backgroundColor: '#0f0f14',
        icon: path.join(__dirname, 'src/assets/icons/my-icon.ico'),
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            backgroundThrottling: false, // keep playback/progress alive when hidden or minimized
            preload: path.join(__dirname, 'preload.cjs'),
        },
    });

    const devUrl = process.env.VITE_DEV_SERVER_URL;
    if (devUrl) mainWindow.loadURL(devUrl);
    else mainWindow.loadURL(await serveDist());

    mainWindow.on('closed', () => (mainWindow = null));
}

// YouTube embeds reject file:// parents (errors 152/153) → serve dist/ over http://localhost.
function serveDist() {
    const root = path.join(__dirname, 'dist');
    const server = http.createServer(async (req, res) => {
        const rel = path.normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
        const file = path.join(root, rel === path.sep ? 'index.html' : rel);
        if (!file.startsWith(root)) return res.writeHead(403).end();
        try {
            const body = await readFile(file);
            res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' }).end(body);
        } catch {
            res.writeHead(404).end();
        }
    });
    app.on('quit', () => server.close());
    return new Promise((resolve) =>
        server.listen(0, LOCAL_HOST, () => resolve(`http://${LOCAL_HOST}:${server.address().port}/`)),
    );
}

function registerMediaKeys() {
    for (const [key, command] of Object.entries(MEDIA_KEYS)) {
        globalShortcut.register(key, () => mainWindow?.webContents.send('media:command', command));
    }
}

function registerIpc() {
    ipcMain.handle('window:minimize', () => mainWindow?.minimize());
    ipcMain.handle('window:close', () => mainWindow?.close());
    ipcMain.handle('window:set-mode', (_event, mode) => {
        const m = MODES[mode];
        if (!m || !mainWindow) return;
        mainWindow.setResizable(true); // required to apply size constraints
        mainWindow.setMinimumSize(m.minWidth, m.minHeight);
        mainWindow.setSize(m.width, m.height);
        mainWindow.setResizable(m.resizable);
    });
    ipcMain.handle('window:toggle-pin', () => {
        const pinned = !mainWindow.isAlwaysOnTop();
        mainWindow.setAlwaysOnTop(pinned);
        return pinned;
    });
}

if (!app.requestSingleInstanceLock()) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (!mainWindow) return;
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    });

    app.whenReady().then(() => {
        registerIpc();
        registerMediaKeys();
        createWindow();
    });

    app.on('will-quit', () => globalShortcut.unregisterAll());
    app.on('window-all-closed', () => app.quit());
}
