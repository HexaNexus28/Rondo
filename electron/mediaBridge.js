import { app } from 'electron';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline';

// Native helper (native/media-bridge) that reads and controls what other apps play through Windows media sessions.
const EXE = 'media-bridge.exe';
const RESTART_DELAY_MS = 5000;
const MAX_RESTARTS = 3;
const COMMANDS = new Set(['toggle', 'pause', 'next', 'prev', 'seek']);

const exePath = () => (app.isPackaged
    ? path.join(process.resourcesPath, EXE)
    : path.join(app.getAppPath(), 'native/media-bridge/out', EXE));

// The helper exits when its stdin closes, so it never outlives Rondo.
export function startMediaBridge({ ignoreId, onSessions }) {
    let child = null;
    let restarts = 0;
    let stopping = false;

    const start = () => {
        if (!existsSync(exePath())) return; // dev checkout without `npm run build:bridge`: no piloting
        child = spawn(exePath(), [ignoreId], { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
        createInterface({ input: child.stdout }).on('line', (line) => {
            try {
                onSessions(JSON.parse(line));
            } catch {
                // a partial line while the helper is killed: the next one replaces it
            }
        });
        child.on('error', () => {}); // reported through 'exit'
        child.on('exit', () => {
            child = null;
            if (!stopping && restarts++ < MAX_RESTARTS) setTimeout(start, RESTART_DELAY_MS);
        });
    };
    start();

    return {
        send(command) {
            if (!child || !COMMANDS.has(command?.cmd) || typeof command.id !== 'string') return;
            const position = Number(command.position);
            child.stdin.write(`${JSON.stringify({ cmd: command.cmd, id: command.id, position: Number.isFinite(position) ? position : 0 })}\n`);
        },
        stop() {
            stopping = true;
            child?.stdin.end();
        },
    };
}
