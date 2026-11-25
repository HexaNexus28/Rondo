import { app, Notification } from 'electron';
import electronUpdater from 'electron-updater';

const { autoUpdater } = electronUpdater;
const CHECK_EVERY_MS = 6 * 60 * 60 * 1000;

// Packaged builds only: in dev there is no installer to update. The update downloads in the
// background and installs when the app quits, so playback is never interrupted.
export function initUpdater() {
    if (!app.isPackaged) return;

    autoUpdater.on('update-downloaded', ({ version }) => {
        new Notification({
            title: 'Rondo',
            body: `La version ${version} est prête : elle s'installera à la fermeture.`,
        }).show();
    });
    // Offline or GitHub unreachable: nothing the user can act on, try again at the next check.
    autoUpdater.on('error', (error) => console.warn('[updater]', error.message));

    const check = () => autoUpdater.checkForUpdates().catch(() => {});
    check();
    setInterval(check, CHECK_EVERY_MS);
}
