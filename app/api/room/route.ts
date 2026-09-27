import { NextRequest, NextResponse } from "next/server";
import { getTrack, getTracks, searchTrack } from "@/lib/spotify";
import { getListenLinks } from "@/lib/links";
import {
  advanceQueue,
  ensureSeeded,
  enqueueTrack,
  getActiveListeners,
  getRoom,
  touchPresence,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await ensureSeeded();
    const room = getRoom();

    const clientId = req.headers.get("x-client-id");
    const clientName = req.headers.get("x-client-name") ?? undefined;
    if (clientId) touchPresence(clientId, clientName);

    if (room.queue.length === 0) {
      return NextResponse.json({
        track: null,
        elapsedMs: 0,
        listenerCount: 0,
        listeners: [],
        upNext: [],
        links: [],
        serverTime: Date.now(),
        error:
          "No tracks in the room yet. Add SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET to .env.local and restart the server.",
      });
    }

    let track = await getTrack(room.queue[0]);
    let elapsedMs = Date.now() - room.startedAt;

    // Advance through the queue if the current track has finished, in case
    // no one has polled in a while (e.g. server idle, or a long track ended).
    let guard = 0;
    while (elapsedMs >= track.durationMs && guard < room.queue.length + 1) {
      advanceQueue(room);
      track = await getTrack(room.queue[0]);
      elapsedMs = Date.now() - room.startedAt;
      guard++;
    }

    const listenerCount = Math.max(touchPresence(clientId ?? "anonymous", clientName), 1);
    const listeners = getActiveListeners();

    const [links, upNext] = await Promise.all([
      getListenLinks(track),
      getTracks(room.queue.slice(1, 4)),
    ]);

    return NextResponse.json({
      track,
      elapsedMs,
      listenerCount,
      listeners,
      upNext,
      links,
      serverTime: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unknown error loading the room." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = (body?.query ?? "").trim();
    if (!query) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }
    const track = await searchTrack(query);
    if (!track) {
      return NextResponse.json({ error: "No track found for that search." }, { status: 404 });
    }
    enqueueTrack(track.id);
    return NextResponse.json({ track });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Could not add that track." },
      { status: 500 }
    );
  }
}
