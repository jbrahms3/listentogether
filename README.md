# Listen Together

A shared listening room: everyone sees the same track, the same synced timer,
and can chat about it while it plays. Playback itself happens on each
listener's own Spotify / Apple Music / YouTube Music — this app keeps
everyone looking at the same moment and gives them the links to press play
together, plus a room to talk about it.

## How it works

- **Spotify Web API** (Client Credentials flow) supplies the track/album
  metadata for the "now playing" card and the queue — no user login needed,
  since the app never plays audio itself.
- A small in-memory **room** on the server holds the shared queue and a
  `startedAt` timestamp; every client polls `/api/room` every few seconds and
  computes the same elapsed time and progress bar from that timestamp, which
  is what keeps everyone in sync. When a track's duration has elapsed, the
  server rotates it to the back of the queue and starts the next one.
- **Cross-platform links** ([lib/links.ts](lib/links.ts)) are built directly
  from each service's own public API rather than a third-party aggregator:
  Deezer's `/track/isrc:<isrc>` endpoint does an exact match on the track's
  ISRC (a universal recording ID Spotify already gives us), and Apple Music
  comes from the public iTunes Search API by track/artist name. Both are
  free and need no API key. A YouTube link is added too if you set
  `YOUTUBE_API_KEY` (a free Google Cloud API key).
- **Chat** is a simple polling endpoint (`/api/chat`) backed by the same
  in-memory store — no accounts, just a display name kept in `localStorage`.

State lives in memory on the server process, so it resets on restart. That's
intentional for a lightweight shared room; swap `lib/store.ts` for a real
database if you need it to persist.

## Setup

1. Create a Spotify app at the
   [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) —
   no redirect URI is needed, this only uses the Client Credentials flow.
2. Copy the env file and fill in your credentials:

   ```bash
   cp .env.local.example .env.local
   ```

3. Install dependencies and run the dev server:

   ```bash
   npm install
   npm run dev
   ```

4. Open http://localhost:3000. On first load the room seeds itself by
   searching Spotify for a handful of classical pieces (see
   `DEFAULT_SEED_QUERIES` in `lib/store.ts`) — or set `SEED_TRACK_IDS` in
   `.env.local` to a comma-separated list of Spotify track IDs to start with
   specific tracks instead.

Apple Music and Deezer links work immediately with no extra setup. If you
also want a YouTube link, create a free API key at the
[Google Cloud Console](https://console.cloud.google.com/apis/library/youtube.googleapis.com)
(enable the YouTube Data API v3, then create an API key) and set
`YOUTUBE_API_KEY` in `.env.local`.

## Notes

- Anyone in the room can add a track to the queue (searches Spotify by your
  query and appends it) or skip the current track — there's no moderation or
  auth layer, matching the "everyone's in this together" spirit of the app.
- The progress bar is purely informational — it doesn't control any
  player. Listeners press play on their own service and use the timer to
  land in the same place.
- Spotify's artist-genres endpoint (used only for the small genre tags under
  the track title) returns 403 for some apps/API tiers. The app treats that
  as non-fatal and just omits the tags rather than failing the whole track
  lookup — see `getArtistGenres` in `lib/spotify.ts`.
- Blind text search for the seed tracks can occasionally match a
  low-quality/mislabeled recording instead of a well-known one (e.g. an
  oddly-credited "Clair de Lune"). If that happens, set `SEED_TRACK_IDS` in
  `.env.local` to the exact Spotify track IDs you want instead.
- Apple Music/YouTube links are matched by track + artist name search (no
  universal ID like ISRC is exposed by their public search APIs), so they
  can occasionally land on a different version (a remix, a cover) than the
  Spotify track playing. Deezer's ISRC-based lookup doesn't have this
  problem.
