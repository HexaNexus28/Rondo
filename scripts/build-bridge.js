// Compiles native/media-bridge (C#, native AOT) into native/media-bridge/out/media-bridge.exe.
// The AOT linker locates Visual C++ through vswhere.exe, which the Visual Studio installer does not put on PATH.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const VS_INSTALLER = path.join(process.env['ProgramFiles(x86)'] ?? 'C:/Program Files (x86)', 'Microsoft Visual Studio', 'Installer');

execFileSync('dotnet', ['publish', 'native/media-bridge', '-c', 'Release', '-o', 'native/media-bridge/out'], {
    stdio: 'inherit',
    env: { ...process.env, PATH: `${VS_INSTALLER}${path.delimiter}${process.env.PATH}` },
});
