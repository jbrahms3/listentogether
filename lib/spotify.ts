import { SpotifyTrack } from "./types";

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_BASE = "https://api.spotify.com/v1";

export type { SpotifyTrack };

let cachedToken: { value: string; expiresAt: number } | null = null;

function getCredentials() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET. Copy .env.local.example to .env.local and fill them in."
    );
  }
  return { clientId, clientSecret };
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5000) {
    return cachedToken.value;
  }
  const { clientId, clientSecret } = getCredentials();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Spotify auth failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.value;
}

async function spotifyFetch(path: string) {
  const token = await getAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Spotify API error (${res.status}) on ${path}: ${body}`);
  }
  return res.json();
}

// Simple in-memory cache for artist genres so we don't re-fetch on every poll.
const genreCache = new Map<string, string[]>();

async function getArtistGenres(artistIds: string[]): Promise<string[]> {
  const uncached = artistIds.filter((id) => !genreCache.has(id));
  if (uncached.length > 0) {
    try {
      const data = await spotifyFetch(`/artists?ids=${uncached.join(",")}`);
      for (const artist of data.artists ?? []) {
        genreCache.set(artist.id, artist.genres ?? []);
      }
    } catch {
      // Some Spotify apps no longer have access to artist genre data.
      // Genre tags are cosmetic, so fail soft and cache an empty result
      // rather than blocking the track lookup that depends on this.
      for (const id of uncached) genreCache.set(id, []);
    }
  }
  const genres = new Set<string>();
  for (const id of artistIds) {
    for (const g of genreCache.get(id) ?? []) genres.add(g);
  }
  return Array.from(genres).slice(0, 3);
}

function mapTrack(raw: any, genres: string[]): SpotifyTrack {
  return {
    id: raw.id,
    name: raw.name,
    durationMs: raw.duration_ms,
    artists: raw.artists.map((a: any) => a.name),
    albumName: raw.album?.name ?? "",
    albumImage: raw.album?.images?.[0]?.url ?? null,
    releaseYear: raw.album?.release_date ? raw.album.release_date.slice(0, 4) : null,
    externalUrl: raw.external_urls?.spotify ?? `https://open.spotify.com/track/${raw.id}`,
    genres,
    isrc: raw.external_ids?.isrc ?? null,
  };
}

const TRACK_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const trackCache = new Map<string, { track: SpotifyTrack; expiresAt: number }>();

function getCachedTrack(id: string): SpotifyTrack | null {
  const entry = trackCache.get(id);
  if (entry && entry.expiresAt > Date.now()) return entry.track;
  return null;
}

function setCachedTrack(track: SpotifyTrack) {
  trackCache.set(track.id, { track, expiresAt: Date.now() + TRACK_CACHE_TTL_MS });
}

export async function getTrack(trackId: string): Promise<SpotifyTrack> {
  const cached = getCachedTrack(trackId);
  if (cached) return cached;
  const raw = await spotifyFetch(`/tracks/${trackId}`);
  const artistIds = raw.artists.map((a: any) => a.id).filter(Boolean);
  const genres = await getArtistGenres(artistIds);
  const track = mapTrack(raw, genres);
  setCachedTrack(track);
  return track;
}

export async function getTracks(trackIds: string[]): Promise<SpotifyTrack[]> {
  if (trackIds.length === 0) return [];
  // Some Spotify apps get 403'd on the batch "Get Several Tracks" endpoint
  // even though the single-track endpoint works fine, so fetch individually
  // (results are cached, so this is cheap after the first load of a track).
  const tracks = await Promise.all(
    trackIds.map(async (id) => {
      try {
        return await getTrack(id);
      } catch {
        return null;
      }
    })
  );
  return tracks.filter((t): t is SpotifyTrack => !!t);
}

export async function searchTrack(query: string): Promise<SpotifyTrack | null> {
  const data = await spotifyFetch(
    `/search?type=track&limit=1&q=${encodeURIComponent(query)}`
  );
  const raw = data.tracks?.items?.[0];
  if (!raw) return null;
  const artistIds = raw.artists.map((a: any) => a.id).filter(Boolean);
  const genres = await getArtistGenres(artistIds);
  const track = mapTrack(raw, genres);
  setCachedTrack(track);
  return track;
}
