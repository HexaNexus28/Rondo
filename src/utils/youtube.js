const VIDEO_ID_RE = /^[\w-]{11}$/;
const PLAYLIST_ID_RE = /^(PL|UU|FL|OLAK5uy_)[\w-]+$/;
const PATH_ID_RE = /^\/(?:embed|shorts|live)\/([\w-]{11})/;
const YOUTUBE_HOSTS = ["youtube.com", "music.youtube.com"];

function parseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function hostOf(url) {
  return url.hostname.replace(/^(www|m)\./, "");
}

/** Returns the 11-char video id from a YouTube URL or a bare id, else null. */
export function extractVideoId(input) {
  const value = input.trim();
  if (VIDEO_ID_RE.test(value)) return value;
  const url = parseUrl(value);
  if (!url) return null;
  const host = hostOf(url);
  const id =
    host === "youtu.be"
      ? url.pathname.slice(1, 12)
      : YOUTUBE_HOSTS.includes(host)
        ? (url.searchParams.get("v") ?? url.pathname.match(PATH_ID_RE)?.[1])
        : null;
  return id && VIDEO_ID_RE.test(id) ? id : null;
}

/** Playlist id from a pure playlist URL (no `v=`); mixes ("RD…") are not importable. */
export function extractPlaylistId(input) {
  const url = parseUrl(input.trim());
  if (!url || !YOUTUBE_HOSTS.includes(hostOf(url)) || url.searchParams.has("v")) return null;
  const list = url.searchParams.get("list");
  return list && PLAYLIST_ID_RE.test(list) ? list : null;
}

/**
 * Parses any pasted/dropped text (one or many links, separated by spaces, commas
 * or newlines) into unique video ids and playlist ids.
 */
export function parseLinks(text) {
  const tokens = text.split(/[\s,]+/).filter(Boolean);
  const videoIds = new Set();
  const playlistIds = new Set();
  for (const token of tokens) {
    const playlistId = extractPlaylistId(token);
    if (playlistId) playlistIds.add(playlistId);
    else {
      const videoId = extractVideoId(token);
      if (videoId) videoIds.add(videoId);
    }
  }
  return { videoIds: [...videoIds], playlistIds: [...playlistIds] };
}

export function thumbnailUrl(id) {
  return `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
}

/** Best-effort title lookup; falls back to the id. */
export async function fetchTitle(id) {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://youtu.be/${id}&format=json`,
    );
    if (!res.ok) return id;
    return (await res.json()).title ?? id;
  } catch {
    return id;
  }
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
