export interface SpotifyTrack {
  id: string;
  name: string;
  durationMs: number;
  artists: string[];
  albumName: string;
  albumImage: string | null;
  releaseYear: string | null;
  externalUrl: string;
  genres: string[];
  isrc: string | null;
}

export interface ListenLink {
  platform: string;
  label: string;
  url: string;
}

export interface ChatMessage {
  id: string;
  name: string;
  text: string;
  ts: number;
}

export interface RoomResponse {
  track: SpotifyTrack | null;
  elapsedMs: number;
  listenerCount: number;
  listeners: { name: string }[];
  upNext: SpotifyTrack[];
  links: ListenLink[];
  serverTime: number;
  error?: string;
}
