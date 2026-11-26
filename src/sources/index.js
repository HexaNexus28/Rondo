import youtube from "./youtube";
import local from "./local";

/**
 * What each music source allows. The UI reads these flags instead of testing for a given platform,
 * so a source that plays in its own app (system media control) can unlock the compact bar and hidden playback.
 */
const SOURCES = { youtube, local };

export const allSources = Object.values(SOURCES);

// Tracks saved before sources existed carry no `source` field: they are all YouTube.
export const sourceOf = (track) => SOURCES[track?.source ?? "youtube"];
