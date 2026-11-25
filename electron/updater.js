import { app, Notification } from 'electron';
import electronUpdater from 'electron-updater';
import { getSettings, updateSettings } from './settings.js';

const { autoUpdater } = electronUpdater;
const CHECK_EVERY_MS = 6 * 60 * 60 * 1000;
// An update downloaded earlier is found again within seconds of the launch.
const LAUNCH_WINDOW_MS = 30 * 1000;

let ready = null; // version downloaded and waiting
let isPlaying = () => false;

export const readyVersion = () => ready;

// Silent install, then Rondo opens again on the new version.
export function installUpdate() {
    if (ready) autoUpdater.quitAndInstall(true, true);
}

// Quitting alone is not enough: the X only hides the window, and a Windows shutdown skips the quit handlers.
// So opening Rondo applies the update, unless something is playing. One automatic try per version:
// an installer that keeps failing must not restart the app in a loop.
export function installOnOpen() {
    if (!ready || isPlaying() || getSettings().attemptedUpdate === ready) return false;
    updateSettings({ attemptedUpdate: ready });
    installUpdate();
    return true;
}

// Packaged builds only: in dev there is no installer to update.
export function initUpdater({ playing, onReady }) {
    if (!app.isPackaged) return;
    isPlaying = playing;
    const startedAt = Date.now();

    autoUpdater.on('update-downloaded', ({ version }) => {
        if (ready === version) return;
        ready = version;
        onReady();
        if (Date.now() - startedAt < LAUNCH_WINDOW_MS && installOnOpen()) return;
        const notification = new Notification({
            title: 'Rondo',
            body: `La version ${version} est prête. Cliquez ici pour redémarrer, sinon elle s'installera à la prochaine ouverture.`,
        });
        notification.on('click', installUpdate);
        notification.show();
    });
    // Offline or GitHub unreachable: nothing the user can act on, try again at the next check.
    autoUpdater.on('error', (error) => console.warn('[updater]', error.message));

    const check = () => autoUpdater.checkForUpdates().catch(() => {});
    check();
    setInterval(check, CHECK_EVERY_MS);
}
