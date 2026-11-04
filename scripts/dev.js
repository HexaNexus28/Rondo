// Starts Vite, waits for it to be ready, then launches Electron pointed at it.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import process from 'node:process';
import { createServer } from 'vite';

const electronPath = createRequire(import.meta.url)('electron');

const server = await createServer({ server: { port: 5173, strictPort: true } });
await server.listen();
const url = server.resolvedUrls.local[0];

const electron = spawn(electronPath, ['.'], {
    stdio: 'inherit',
    env: { ...process.env, VITE_DEV_SERVER_URL: url },
});

electron.on('exit', async () => {
    await server.close();
    process.exit(0);
});
