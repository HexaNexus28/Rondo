import { loadYouTubeApi } from "./youtubeApi";

const CUED = 5;
const TIMEOUT_MS = 10000;
const OFFSCREEN = "position:fixed;left:-9999px;top:0;width:200px;height:200px;opacity:0;pointer-events:none";

/**
 * Lists the video ids of a public YouTube playlist, with no API key:
 * a throwaway offscreen player cues the playlist, then reports its contents.
 */
export async function fetchPlaylistVideoIds(listId) {
  const YT = await loadYouTubeApi();
  const host = document.createElement("div");
  host.style.cssText = OFFSCREEN;
  const target = document.createElement("div");
  host.append(target);
  document.body.append(host);

  return new Promise((resolve, reject) => {
    let player;
    const finish = (fn, value) => {
      clearTimeout(timer);
      player?.destroy();
      host.remove();
      fn(value);
    };
    const timer = setTimeout(() => finish(reject, new Error("Playlist introuvable ou privée")), TIMEOUT_MS);

    player = new YT.Player(target, {
      host: "https://www.youtube-nocookie.com",
      playerVars: { origin: window.location.origin },
      events: {
        onReady: (e) => e.target.cuePlaylist({ listType: "playlist", list: listId }),
        onStateChange: (e) => {
          if (e.data !== CUED) return;
          const ids = e.target.getPlaylist() ?? [];
          if (ids.length) finish(resolve, ids);
          else finish(reject, new Error("Playlist vide"));
        },
        onError: () => finish(reject, new Error("Playlist introuvable ou privée")),
      },
    });
  });
}
