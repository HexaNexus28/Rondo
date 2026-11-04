const API_SRC = "https://www.youtube.com/iframe_api";

let apiPromise;

/** Loads the YouTube IFrame API once and resolves with `window.YT`. */
export function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise((resolve) => {
    window.onYouTubeIframeAPIReady = () => resolve(window.YT);
    const script = document.createElement("script");
    script.src = API_SRC;
    document.head.append(script);
  });
  return apiPromise;
}
