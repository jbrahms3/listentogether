import { searchTrack } from "./spotify";

export interface ChatMessage {
  id: string;
  name: string;
  text: string;
  ts: number;
}

interface PresenceEntry {
  name: string;
  lastSeen: number;
}

interface RoomState {
  queue: string[]; // Spotify track IDs; queue[0] is "now playing"
  startedAt: number; // epoch ms when the current track started
  messages: ChatMessage[];
  presence: Map<string, PresenceEntry>; // clientId -> presence info
  seeded: boolean;
  seeding: Promise<void> | null;
}

const DEFAULT_SEED_QUERIES = [
  "Clair de Lune Debussy",
  "Prelude a l'apres-midi d'un faune Debussy",
  "Rachmaninoff Piano Concerto No 2",
  "Mahler Symphony No 5 Adagietto",
  "The Swan Saint-Saens",
  "Gymnopedie No 1 Satie",
];

const PRESENCE_WINDOW_MS = 20_000;

const globalForRoom = globalThis as unknown as { __listenRoom?: RoomState };

function createRoom(): RoomState {
  return {
    queue: [],
    startedAt: Date.now(),
    messages: [
      {
        id: "welcome",
        name: "Listen Together",
        text: "Welcome in — everyone here is hearing the same moment of the same piece.",
        ts: Date.now(),
      },
    ],
    presence: new Map(),
    seeded: false,
    seeding: null,
  };
}

export function getRoom(): RoomState {
  if (!globalForRoom.__listenRoom) {
    globalForRoom.__listenRoom = createRoom();
  }
  return globalForRoom.__listenRoom;
}

export async function ensureSeeded() {
  const room = getRoom();
  if (room.seeded || room.queue.length > 0) return;
  if (room.seeding) return room.seeding;

  room.seeding = (async () => {
    const seedIds = (process.env.SEED_TRACK_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (seedIds.length > 0) {
      room.queue = seedIds;
    } else {
      const found: string[] = [];
      for (const query of DEFAULT_SEED_QUERIES) {
        try {
          const track = await searchTrack(query);
          if (track) found.push(track.id);
        } catch {
          // Ignore individual lookup failures; we'll retry seeding later
          // if nothing was found at all.
        }
      }
      room.queue = found;
    }

    if (room.queue.length > 0) {
      room.startedAt = Date.now();
      room.seeded = true;
    }
    room.seeding = null;
  })();

  return room.seeding;
}

export function advanceQueue(room: RoomState) {
  if (room.queue.length <= 1) {
    room.startedAt = Date.now();
    return;
  }
  const finished = room.queue.shift()!;
  room.queue.push(finished);
  room.startedAt = Date.now();
}

export function skipCurrent() {
  const room = getRoom();
  advanceQueue(room);
}

export function enqueueTrack(trackId: string) {
  const room = getRoom();
  room.queue.push(trackId);
}

export function touchPresence(clientId: string, name?: string) {
  const room = getRoom();
  const now = Date.now();
  const existing = room.presence.get(clientId);
  room.presence.set(clientId, {
    name: name || existing?.name || "Listener",
    lastSeen: now,
  });
  for (const [id, entry] of room.presence) {
    if (now - entry.lastSeen > PRESENCE_WINDOW_MS) room.presence.delete(id);
  }
  return room.presence.size;
}

export function getListenerCount() {
  const room = getRoom();
  const now = Date.now();
  let count = 0;
  for (const entry of room.presence.values()) {
    if (now - entry.lastSeen <= PRESENCE_WINDOW_MS) count++;
  }
  return count;
}

export function getActiveListeners(): { name: string }[] {
  const room = getRoom();
  const now = Date.now();
  const listeners: { name: string }[] = [];
  for (const entry of room.presence.values()) {
    if (now - entry.lastSeen <= PRESENCE_WINDOW_MS) listeners.push({ name: entry.name });
  }
  return listeners;
}

export function addMessage(name: string, text: string): ChatMessage {
  const room = getRoom();
  const message: ChatMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.slice(0, 40),
    text: text.slice(0, 500),
    ts: Date.now(),
  };
  room.messages.push(message);
  if (room.messages.length > 200) {
    room.messages.splice(0, room.messages.length - 200);
  }
  return message;
}

export function getMessagesSince(sinceTs: number): ChatMessage[] {
  const room = getRoom();
  return room.messages.filter((m) => m.ts > sinceTs);
}

export function getAllMessages(): ChatMessage[] {
  return getRoom().messages;
}
