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
- The **room** ([lib/store.ts](lib/store.ts)) holds the shared queue and a
  `startedAt` timestamp; every client polls `/api/room` every few seconds and
  computes the same elapsed time and progress bar from that timestamp, which
  is what keeps everyone in sync. When a track's duration has elapsed, the
  server rotates it to the back of the queue and starts the next one. Set
  `REDIS_URL` to back this with Redis instead of in-process memory — needed
  as soon as this runs as more than one instance (see "Scaling" below);
  without it, an in-memory fallback is used automatically for local dev.
- **Cross-platform links** ([lib/links.ts](lib/links.ts)) are built directly
  from each service's own public API rather than a third-party aggregator:
  Deezer's `/track/isrc:<isrc>` endpoint does an exact match on the track's
  ISRC (a universal recording ID Spotify already gives us), and Apple Music
  comes from the public iTunes Search API by track/artist name. Both are
  free and need no API key. A YouTube link is added too if you set
  `YOUTUBE_API_KEY` (a free Google Cloud API key).
- **Chat** is a simple polling endpoint (`/api/chat`) backed by the same
  in-memory store. Posting a message requires a **Clerk** account — the
  server checks `auth()` in the route handler and derives the display name
  from the signed-in user itself (never trusting a client-supplied name), so
  messages can't be spoofed. Viewing the room and the track queue stays open
  to everyone; only sending a chat message requires signing in.

Without Redis, state lives in memory on the server process and resets on
restart — fine for a single local instance, not for anything deployed at
scale (see below).

## Setup

1. Create a free application at the
   [Clerk Dashboard](https://dashboard.clerk.com) — any sign-in method
   (email, Google, etc.) works out of the box with no extra configuration.
   Copy its **Publishable key** and **Secret key** from the dashboard's
   "API keys" page.
2. Create a Spotify app at the
   [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) —
   no redirect URI is needed, this only uses the Client Credentials flow.
3. Copy the env file and fill in your credentials:

   ```bash
   cp .env.local.example .env.local
   ```

4. Install dependencies and run the dev server:

   ```bash
   npm install
   npm run dev
   ```

5. Open http://localhost:3000. On first load the room seeds itself by
   searching Spotify for a handful of classical pieces (see
   `DEFAULT_SEED_QUERIES` in `lib/store.ts`) — or set `SEED_TRACK_IDS` in
   `.env.local` to a comma-separated list of Spotify track IDs to start with
   specific tracks instead.

Apple Music and Deezer links work immediately with no extra setup. If you
also want a YouTube link, create a free API key at the
[Google Cloud Console](https://console.cloud.google.com/apis/library/youtube.googleapis.com)
(enable the YouTube Data API v3, then create an API key) and set
`YOUTUBE_API_KEY` in `.env.local`.

## Scaling

By default, the room queue, chat, and presence live in the memory of a
single server process — fine for one instance, broken across more than one
(each replica would seed its own queue and run its own timer, and chat
posted to one instance wouldn't show up on another). Setting `REDIS_URL`
switches `lib/store.ts` over to Redis so all instances share one source of
truth:

- The queue is a Redis list; chat messages and presence are sorted sets
  (scored by timestamp / last-seen), so range queries like "messages since
  X" or "listeners active in the last 20s" stay cheap.
- Advancing the queue when a track finishes runs through a small Lua script
  (`advanceIfElapsed` in [lib/redis.ts](lib/redis.ts)) so it's atomic — two
  instances polling at the same moment can't both rotate the queue and skip
  an extra track.
- Seeding the room on first boot is guarded by a short-lived Redis lock so
  multiple instances starting at once don't all search Spotify and race to
  populate the queue.

On Railway, this is a "Redis" template deployed into the same project, with
`REDIS_URL` added to the app service as a reference variable
(`${{ Redis.REDIS_URL }}`) so it always points at the current instance. It
uses Railway's private network, not a public endpoint.

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
