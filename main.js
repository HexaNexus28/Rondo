// main.js
import { app, BrowserWindow, globalShortcut, ipcMain, Menu, screen, Tray } from 'electron';
import * as path from 'path';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { fileURLToPath } from 'url';
import { initUpdater, installOnOpen, installUpdate, readyVersion } from './electron/updater.js';
import { DEFAULT_SHORTCUTS, flushSettings, getSettings, loadSettings, updateSettings } from './electron/settings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const LOCAL_HOST = 'localhost';
// Fixed port: localStorage is per-origin, a random port would wipe the queue at every launch.
const PREFERRED_PORT = 47615;
const MIME = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
};
const MODES = {
    full: { width: 360, height: 470, minWidth: 300, minHeight: 420, resizable: true },
    // Video card: 360 px wide keeps the 16:9 player above YouTube's 200 px minimum height.
    miniVideo: { width: 360, height: 290, minWidth: 0, minHeight: 0, resizable: false },
    mini: { width: 340, height: 84, minWidth: 0, minHeight: 0, resizable: false },
};
const MEDIA_KEYS = {
    MediaPlayPause: 'toggle',
    MediaNextTrack: 'next',
    MediaPreviousTrack: 'prev',
};
const ICON = path.join(__dirname, 'src/assets/icons/my-icon.ico');
const SNAP_PX = 16;
const MOVE_SETTLE_MS = 120;
const MIN_VISIBLE_PX = 40;
// At fractional DPI the window width/height wobble by a few px depending on its position.
const RESIZE_NOISE_PX = 3;
const OPACITY = { min: 0.2, max: 0.9 };

let mainWindow = null;
let tray = null;
let ghost = false;
let quitting = false;
let currentMode = 'full';
let knownSize = [0, 0]; // last real window size, DIP
const bound = {}; // action → accelerator currently registered

const debounce = (fn, ms) => {
    let t;
    return () => {
        clearTimeout(t);
        t = setTimeout(fn, ms);
    };
};

// A saved position is only reused if it still lands on a connected screen.
function visiblePosition(pos) {
    if (!pos) return null;
    const onScreen = screen.getAllDisplays().some(({ workArea: a }) =>
        pos.x + MIN_VISIBLE_PX >= a.x && pos.x + MIN_VISIBLE_PX <= a.x + a.width &&
        pos.y + MIN_VISIBLE_PX >= a.y && pos.y + MIN_VISIBLE_PX <= a.y + a.height);
    return onScreen ? pos : null;
}

async function createWindow() {
    const { position, fullSize } = getSettings();
    const size = fullSize ?? MODES.full;
    mainWindow = new BrowserWindow({
        width: size.width,
        height: size.height,
        ...visiblePosition(position),
        minWidth: MODES.full.minWidth,
        minHeight: MODES.full.minHeight,
        maximizable: false,
        fullscreenable: false,
        frame: false,
        alwaysOnTop: true,
        backgroundColor: '#0f0f14',
        icon: ICON,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            backgroundThrottling: false, // keep playback/progress alive when hidden or minimized
            preload: path.join(__dirname, 'preload.cjs'),
        },
    });

    // Only a real 'resize' may save the size: on fractional DPI scaling a plain move makes
    // getBounds() drift by 1px, which would slowly grow the saved size.
    let resized = false;
    const settle = debounce(() => {
        const didResize = resized;
        resized = false;
        if (!didResize) snapToEdges(); // a left/top resize also fires 'move': don't snap then
        const b = mainWindow.getBounds();
        updateSettings({
            position: { x: b.x, y: b.y },
            ...(didResize && currentMode === 'full' && { fullSize: { width: b.width, height: b.height } }),
        });
    }, MOVE_SETTLE_MS);

    // Fractional DPI scaling also fires spurious 'resize' events after a plain move.
    knownSize = mainWindow.getSize();
    mainWindow.on('resize', () => {
        const [w, h] = mainWindow.getSize();
        if (Math.abs(w - knownSize[0]) <= RESIZE_NOISE_PX && Math.abs(h - knownSize[1]) <= RESIZE_NOISE_PX) return;
        knownSize = [w, h];
        resized = true;
        settle();
    });
    mainWindow.on('move', settle);
    mainWindow.on('show', refreshTray);
    mainWindow.on('hide', refreshTray);
    // The X button hides to the tray; only the tray menu really quits.
    mainWindow.on('close', (event) => {
        if (quitting) return;
        event.preventDefault();
        mainWindow.hide();
    });
    mainWindow.on('closed', () => (mainWindow = null));

    const devUrl = process.env.VITE_DEV_SERVER_URL;
    if (devUrl) mainWindow.loadURL(devUrl);
    else mainWindow.loadURL(await serveDist());
}

// Magnetic edges: after a move settles, stick to the work area border if within SNAP_PX.
function snapToEdges() {
    if (!getSettings().snap || ghost) return;
    const b = mainWindow.getBounds();
    const wa = screen.getDisplayMatching(b).workArea;
    const stick = (pos, size, min, span) => {
        if (Math.abs(pos - min) <= SNAP_PX) return min;
        if (Math.abs(pos + size - (min + span)) <= SNAP_PX) return min + span - size;
        return pos;
    };
    const x = stick(b.x, b.width, wa.x, wa.width);
    const y = stick(b.y, b.height, wa.y, wa.height);
    // setPosition alone re-rounds the size at fractional DPI (the window grows ~1px per call):
    // pass the size we know explicitly.
    if (x !== b.x || y !== b.y) mainWindow.setBounds({ x, y, width: knownSize[0], height: knownSize[1] });
}

// Where a window must sit to change size without leaving the screen: an edge it was stuck to stays stuck.
function anchoredPosition(width, height) {
    const b = mainWindow.getBounds();
    const wa = screen.getDisplayMatching(b).workArea;
    const anchor = (pos, oldSize, newSize, min, span) => {
        const end = min + span;
        const kept = pos + oldSize >= end - RESIZE_NOISE_PX ? end - newSize : pos;
        return Math.max(min, Math.min(kept, end - newSize));
    };
    return { x: anchor(b.x, b.width, width, wa.x, wa.width), y: anchor(b.y, b.height, height, wa.y, wa.height) };
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
    return new Promise((resolve) => {
        const ready = () => resolve(`http://${LOCAL_HOST}:${server.address().port}/`);
        const fallBackToAnyPort = () => server.listen(0, LOCAL_HOST, ready);
        server.once('error', fallBackToAnyPort);
        server.listen(PREFERRED_PORT, LOCAL_HOST, () => {
            server.off('error', fallBackToAnyPort);
            ready();
        });
    });
}

function runAction(action) {
    if (action === 'ghost') setGhost(!ghost);
    else mainWindow?.webContents.send('media:command', action);
}

function setGhost(on) {
    if (!mainWindow) return;
    ghost = on;
    mainWindow.setIgnoreMouseEvents(on);
    mainWindow.setOpacity(on ? getSettings().ghostOpacity : 1);
    refreshTray();
}

function showWindow() {
    if (!mainWindow || installOnOpen()) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
}

function createTray() {
    tray = new Tray(ICON);
    tray.setToolTip('Rondo');
    tray.on('click', () => (mainWindow?.isVisible() ? mainWindow.hide() : showWindow()));
    refreshTray();
}

function refreshTray() {
    if (!tray || !mainWindow) return;
    const update = readyVersion();
    tray.setContextMenu(Menu.buildFromTemplate([
        { label: 'Lecture / Pause', click: () => runAction('toggle') },
        { label: 'Suivant', click: () => runAction('next') },
        { label: 'Précédent', click: () => runAction('prev') },
        { type: 'separator' },
        { label: mainWindow.isVisible() ? 'Masquer' : 'Afficher', click: () => (mainWindow.isVisible() ? mainWindow.hide() : showWindow()) },
        { label: 'Mode fantôme', type: 'checkbox', checked: ghost, click: () => setGhost(!ghost) },
        { type: 'separator' },
        ...(update ? [{ label: `Redémarrer pour installer la ${update}`, click: installUpdate }] : []),
        { label: 'Quitter', click: () => app.quit() },
    ]));
}

// register() throws on a malformed accelerator and returns false when another app owns it.
function tryRegister(accelerator, handler) {
    try {
        return globalShortcut.register(accelerator, handler);
    } catch {
        return false;
    }
}

function registerShortcuts() {
    for (const [key, command] of Object.entries(MEDIA_KEYS)) tryRegister(key, () => runAction(command));
    for (const [action, accelerator] of Object.entries(getSettings().shortcuts)) {
        if (tryRegister(accelerator, () => runAction(action))) bound[action] = accelerator;
    }
}

function setShortcut(action, accelerator) {
    const { shortcuts } = getSettings();
    if (!(action in DEFAULT_SHORTCUTS)) return { ok: false, error: 'Action inconnue' };
    const taken = Object.entries(shortcuts).some(([a, acc]) => a !== action && acc.toLowerCase() === accelerator.toLowerCase());
    if (taken) return { ok: false, error: 'Déjà utilisé par une autre action' };
    const previous = bound[action];
    if (previous) globalShortcut.unregister(previous);
    if (!tryRegister(accelerator, () => runAction(action))) {
        if (previous) tryRegister(previous, () => runAction(action));
        return { ok: false, error: 'Indisponible (pris par une autre application ?)' };
    }
    bound[action] = accelerator;
    updateSettings({ shortcuts: { ...shortcuts, [action]: accelerator } });
    return { ok: true };
}

const readSettings = () => {
    const { ghostOpacity, snap, shortcuts } = getSettings();
    const unavailable = Object.keys(shortcuts).filter((action) => bound[action] !== shortcuts[action]);
    return { ghostOpacity, snap, shortcuts, unavailable, ghost };
};

function registerIpc() {
    ipcMain.handle('window:minimize', () => mainWindow?.minimize());
    ipcMain.handle('window:close', () => mainWindow?.hide());
    ipcMain.handle('window:set-mode', (_event, mode) => {
        const m = MODES[mode];
        if (!m || !mainWindow) return;
        currentMode = mode;
        const { fullSize } = getSettings();
        const size = mode === 'full' && fullSize ? fullSize : m;
        mainWindow.setResizable(true); // required to apply size constraints
        mainWindow.setMinimumSize(m.minWidth, m.minHeight);
        mainWindow.setBounds({ ...anchoredPosition(size.width, size.height), width: size.width, height: size.height });
        mainWindow.setResizable(m.resizable);
    });
    ipcMain.handle('window:toggle-pin', () => {
        const pinned = !mainWindow.isAlwaysOnTop();
        mainWindow.setAlwaysOnTop(pinned);
        return pinned;
    });
    ipcMain.handle('settings:get', readSettings);
    ipcMain.handle('settings:update', (_event, patch) => {
        const next = {};
        if (typeof patch.snap === 'boolean') next.snap = patch.snap;
        if (typeof patch.ghostOpacity === 'number') {
            next.ghostOpacity = Math.min(OPACITY.max, Math.max(OPACITY.min, patch.ghostOpacity));
        }
        updateSettings(next);
        if (ghost) mainWindow.setOpacity(getSettings().ghostOpacity);
        return readSettings();
    });
    ipcMain.handle('settings:set-shortcut', (_event, action, accelerator) => setShortcut(action, accelerator));
    ipcMain.handle('ghost:toggle', () => setGhost(!ghost));
}

if (!app.requestSingleInstanceLock()) {
    app.quit();
} else {
    app.on('second-instance', showWindow);

    app.whenReady().then(() => {
        loadSettings();
        registerIpc();
        registerShortcuts();
        createWindow();
        createTray();
        initUpdater({ playing: () => Boolean(mainWindow?.webContents.isCurrentlyAudible()), onReady: refreshTray });
    });

    app.on('before-quit', () => (quitting = true));
    app.on('will-quit', () => {
        globalShortcut.unregisterAll();
        flushSettings();
    });
    app.on('window-all-closed', () => app.quit());
}
