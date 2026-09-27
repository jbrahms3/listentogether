import { ListenLink, SpotifyTrack } from "./types";

export type { ListenLink };

const LINKS_CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, { links: ListenLink[]; expiresAt: number }>();

function searchTerm(track: SpotifyTrack): string {
  return `${track.artists.join(" ")} ${track.name}`;
}

async function getAppleMusicLink(track: SpotifyTrack): Promise<ListenLink | null> {
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?entity=song&limit=1&term=${encodeURIComponent(
        searchTerm(track)
      )}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const url = data.results?.[0]?.trackViewUrl;
    return url ? { platform: "appleMusic", label: "Apple Music", url } : null;
  } catch {
    return null;
  }
}

async function getDeezerLink(track: SpotifyTrack): Promise<ListenLink | null> {
  try {
    if (track.isrc) {
      const res = await fetch(`https://api.deezer.com/track/isrc:${track.isrc}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.link) return { platform: "deezer", label: "Deezer", url: data.link };
      }
    }
    const res = await fetch(
      `https://api.deezer.com/search/track?limit=1&q=${encodeURIComponent(searchTerm(track))}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const url = data.data?.[0]?.link;
    return url ? { platform: "deezer", label: "Deezer", url } : null;
  } catch {
    return null;
  }
}

async function getYoutubeLink(track: SpotifyTrack): Promise<ListenLink | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;
  try {
    const params = new URLSearchParams({
      part: "snippet",
      type: "video",
      maxResults: "1",
      q: searchTerm(track),
      key: apiKey,
    });
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const videoId = data.items?.[0]?.id?.videoId;
    return videoId
      ? { platform: "youtube", label: "YouTube", url: `https://www.youtube.com/watch?v=${videoId}` }
      : null;
  } catch {
    return null;
  }
}

export async function getListenLinks(track: SpotifyTrack): Promise<ListenLink[]> {
  const cached = cache.get(track.id);
  if (cached && cached.expiresAt > Date.now()) return cached.links;

  const spotifyLink: ListenLink = {
    platform: "spotify",
    label: "Spotify",
    url: track.externalUrl,
  };

  const [appleMusic, deezer, youtube] = await Promise.all([
    getAppleMusicLink(track),
    getDeezerLink(track),
    getYoutubeLink(track),
  ]);

  const links = [spotifyLink, appleMusic, youtube, deezer].filter(
    (l): l is ListenLink => l !== null
  );

  cache.set(track.id, { links, expiresAt: Date.now() + LINKS_CACHE_TTL_MS });
  return links;
}
