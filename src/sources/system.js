// Known app ids (Windows AppUserModelId) → readable names; anything else falls back to the id's first part.
const APP_NAMES = [
  [/spotify/i, "Spotify"],
  [/deezer/i, "Deezer"],
  [/applemusic|apple\.music|itunes/i, "Apple Music"],
  [/tidal/i, "Tidal"],
  [/opera/i, "Opera"],
  [/chrome/i, "Chrome"],
  [/msedge|microsoftedge/i, "Edge"],
  [/firefox/i, "Firefox"],
  [/brave/i, "Brave"],
  [/zunemusic|media\.player/i, "Lecteur multimédia"],
  [/vlc/i, "VLC"],
];

/** What another app plays on this computer, controlled by Rondo (through electron/mediaBridge.js). */
export default {
  id: "system",
  name: "Sur le PC",
  compact: true,
  playsHidden: true,
  thumbnail: (session) => session.cover,
  appName: (id) => APP_NAMES.find(([re]) => re.test(id))?.[1] ?? id.split(/[.!]/)[0],
};
