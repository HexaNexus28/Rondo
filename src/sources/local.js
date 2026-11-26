// Served by the rondo-file:// scheme of the main process (electron/localFiles.js).
const fileUrl = (kind, path) => `rondo-file://${kind}/${encodeURIComponent(path)}`;

/** Audio files on this computer, played by Rondo itself: no platform rules apply. */
export default {
  id: "local",
  name: "Fichiers locaux",
  compact: true,
  playsHidden: true,
  audioUrl: (track) => fileUrl("audio", track.id),
  thumbnail: (track) => fileUrl("cover", track.id),
};
