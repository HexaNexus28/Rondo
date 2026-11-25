import { app } from 'electron';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const DEFAULT_SHORTCUTS = {
    toggle: 'Ctrl+Alt+Space',
    next: 'Ctrl+Alt+Right',
    prev: 'Ctrl+Alt+Left',
    volumeUp: 'Ctrl+Alt+Up',
    volumeDown: 'Ctrl+Alt+Down',
    ghost: 'Ctrl+Alt+G',
};

const DEFAULTS = { position: null, fullSize: null, ghostOpacity: 0.5, snap: true };
const SAVE_DELAY_MS = 300;

let file;
let data;
let timer;

export function loadSettings() {
    file = path.join(app.getPath('userData'), 'settings.json');
    let saved = {};
    try {
        saved = JSON.parse(readFileSync(file, 'utf8'));
    } catch {
        // first launch or unreadable file: fall back to defaults
    }
    data = { ...DEFAULTS, ...saved, shortcuts: { ...DEFAULT_SHORTCUTS, ...saved.shortcuts } };
    return data;
}

export const getSettings = () => data;

export function updateSettings(patch) {
    data = { ...data, ...patch };
    clearTimeout(timer);
    timer = setTimeout(flushSettings, SAVE_DELAY_MS);
}

export function flushSettings() {
    clearTimeout(timer);
    writeFileSync(file, JSON.stringify(data, null, 2));
}
