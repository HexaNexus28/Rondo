import { dialog, protocol } from 'electron';
import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { parseFile } from 'music-metadata';

// rondo-file://audio/<encoded path> streams a file, rondo-file://cover/<encoded path> its embedded artwork.
const SCHEME = 'rondo-file';
const AUDIO_TYPES = {
    '.mp3': 'audio/mpeg', '.flac': 'audio/flac', '.m4a': 'audio/mp4', '.aac': 'audio/aac',
    '.ogg': 'audio/ogg', '.opus': 'audio/ogg', '.wav': 'audio/wav', '.webm': 'audio/webm',
};
const RANGE_RE = /bytes=(\d*)-(\d*)/;

const audioType = (file) => AUDIO_TYPES[path.extname(file).toLowerCase()];

// Must run before app 'ready'.
export function registerLocalScheme() {
    protocol.registerSchemesAsPrivileged([
        { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
    ]);
}

// Seeking in an <audio> element sends Range requests: answer them with partial content.
async function serveAudio(file, request) {
    const { size } = await stat(file);
    const match = RANGE_RE.exec(request.headers.get('range') ?? '');
    const start = match?.[1] ? Number(match[1]) : 0;
    const end = match?.[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    const headers = { 'Content-Type': audioType(file), 'Accept-Ranges': 'bytes', 'Content-Length': String(end - start + 1) };
    if (match) headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
    return new Response(Readable.toWeb(createReadStream(file, { start, end })), { status: match ? 206 : 200, headers });
}

async function serveCover(file) {
    const { common } = await parseFile(file, { duration: false });
    const picture = common.picture?.[0];
    if (!picture) return new Response(null, { status: 404 });
    return new Response(picture.data, { headers: { 'Content-Type': picture.format } });
}

// Only audio files are ever served, so the scheme cannot be used to read anything else on the disk.
export function handleLocalScheme() {
    protocol.handle(SCHEME, async (request) => {
        const { host, pathname } = new URL(request.url);
        const file = decodeURIComponent(pathname.slice(1));
        if (!audioType(file)) return new Response(null, { status: 403 });
        try {
            return host === 'cover' ? await serveCover(file) : await serveAudio(file, request);
        } catch {
            return new Response(null, { status: 404 }); // moved or deleted since it was added
        }
    });
}

async function expand(paths) {
    const files = [];
    for (const p of paths) {
        const info = await stat(p).catch(() => null);
        if (info?.isDirectory()) {
            const entries = await readdir(p, { recursive: true });
            files.push(...entries.map((e) => path.join(p, e)).filter(audioType).sort());
        } else if (info && audioType(p)) files.push(p);
    }
    return files;
}

// One track per audio file; title from the tags, else the file name.
export async function describeFiles(paths) {
    const files = await expand(paths);
    return Promise.all(files.map(async (file) => {
        const { common } = await parseFile(file, { duration: false, skipCovers: true }).catch(() => ({ common: {} }));
        const name = common.title ?? path.basename(file, path.extname(file));
        return { source: 'local', id: file, title: common.artist ? `${common.artist} – ${name}` : name };
    }));
}

export async function pickFiles(window) {
    const { canceled, filePaths } = await dialog.showOpenDialog(window, {
        title: 'Ajouter des fichiers audio',
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'Audio', extensions: Object.keys(AUDIO_TYPES).map((e) => e.slice(1)) }],
    });
    return canceled ? [] : describeFiles(filePaths);
}
