/**
 * Embedded YouTube player. Its rules (developers.google.com/youtube/terms/required-minimum-functionality)
 * forbid a player under 200 × 200 px and playback while the window is hidden or minimized,
 * and require the user to accept YouTube's terms before the player is used.
 */
import { thumbnailUrl } from "../utils/youtube";

export default {
  id: "youtube",
  name: "YouTube",
  compact: false,
  playsHidden: false,
  thumbnail: (track) => thumbnailUrl(track.id),
  terms: {
    // Bump when the text below changes: users are asked again.
    version: 1,
    termsUrl: "https://www.youtube.com/t/terms",
    privacyUrl: "https://www.google.com/policies/privacy",
    notice:
      "Ce lien est lu par le lecteur YouTube, grâce aux services d’API YouTube. YouTube (Google) reçoit votre adresse IP et les contenus demandés, et son lecteur peut enregistrer des données sur votre ordinateur.",
  },
};
