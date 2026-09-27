import { getRedis } from "./redis";
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

interface MemoryRoom {
  queue: string[]; // Spotify track IDs; queue[0] is "now playing"
  startedAt: number; // epoch ms when the current track started
  messages: ChatMessage[];
  presence: Map<string, PresenceEntry>; // clientId -> presence info
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

const WELCOME_MESSAGE = {
  name: "Listen Together",
  text: "Welcome in — everyone here is hearing the same moment of the same piece.",
};

const PRESENCE_WINDOW_MS = 20_000;
const MAX_MESSAGES = 200;

// Redis keys, namespaced so this can share a Redis instance with other apps.
const K = {
  queue: "lt:queue",
  startedAt: "lt:startedAt",
  seedLock: "lt:seedlock",
  messages: "lt:messages:z",
  presence: "lt:presence:z",
  presenceNames: "lt:presence:names",
};

// --- in-memory fallback, used when REDIS_URL isn't set (local dev) -------

const globalForRoom = globalThis as unknown as { __listenRoom?: MemoryRoom };

function getMemoryRoom(): MemoryRoom {
  if (!globalForRoom.__listenRoom) {
    globalForRoom.__listenRoom = {
      queue: [],
      startedAt: Date.now(),
      messages: [{ id: "welcome", ts: Date.now(), ...WELCOME_MESSAGE }],
      presence: new Map(),
      seeding: null,
    };
  }
  return globalForRoom.__listenRoom;
}

// --- seeding ---------------------------------------------------------------

async function seedTrackIds(): Promise<string[]> {
  const seedIds = (process.env.SEED_TRACK_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (seedIds.length > 0) return seedIds;

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
  return found;
}

export async function ensureSeeded(): Promise<void> {
  const redis = getRedis();

  if (redis) {
    if ((await redis.llen(K.queue)) > 0) return;
    // A short-lived lock keeps multiple instances from all searching Spotify
    // and racing to seed the shared queue at once.
    const acquired = await redis.set(K.seedLock, "1", "PX", 30_000, "NX");
    if (!acquired) return;
    try {
      if ((await redis.llen(K.queue)) > 0) return;
      const ids = await seedTrackIds();
      if (ids.length === 0) return;
      await redis.rpush(K.queue, ...ids);
      await redis.set(K.startedAt, Date.now());
      const welcome: ChatMessage = { id: "welcome", ts: Date.now(), ...WELCOME_MESSAGE };
      await redis.zadd(K.messages, welcome.ts, JSON.stringify(welcome));
    } finally {
      await redis.del(K.seedLock);
    }
    return;
  }

  const room = getMemoryRoom();
  if (room.queue.length > 0) return;
  if (room.seeding) return room.seeding;

  room.seeding = (async () => {
    const ids = await seedTrackIds();
    if (ids.length > 0) {
      room.queue = ids;
      room.startedAt = Date.now();
    }
    room.seeding = null;
  })();

  return room.seeding;
}

// --- queue / playback --------------------------------------------------

export async function getQueue(): Promise<string[]> {
  const redis = getRedis();
  if (redis) return redis.lrange(K.queue, 0, -1);
  return [...getMemoryRoom().queue];
}

export async function getStartedAt(): Promise<number> {
  const redis = getRedis();
  if (redis) return Number((await redis.get(K.startedAt)) ?? Date.now());
  return getMemoryRoom().startedAt;
}

// Rotates the current track to the back of the queue and resets the start
// time, but only if it has actually finished playing. Returns whether it
// advanced. Safe to call from multiple instances at once.
export async function advanceIfElapsed(currentDurationMs: number): Promise<boolean> {
  const redis = getRedis();
  const now = Date.now();

  if (redis) {
    const result = await redis.advanceIfElapsed(K.queue, K.startedAt, now, currentDurationMs);
    return result === 1;
  }

  const room = getMemoryRoom();
  if (now - room.startedAt < currentDurationMs) return false;
  if (room.queue.length > 1) {
    const finished = room.queue.shift()!;
    room.queue.push(finished);
  }
  room.startedAt = now;
  return true;
}

export async function skipCurrent(): Promise<void> {
  const redis = getRedis();
  const now = Date.now();

  if (redis) {
    const len = await redis.llen(K.queue);
    if (len > 1) {
      const head = await redis.lpop(K.queue);
      if (head) await redis.rpush(K.queue, head);
    }
    await redis.set(K.startedAt, now);
    return;
  }

  const room = getMemoryRoom();
  if (room.queue.length > 1) {
    const finished = room.queue.shift()!;
    room.queue.push(finished);
  }
  room.startedAt = now;
}

export async function enqueueTrack(trackId: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.rpush(K.queue, trackId);
    return;
  }
  getMemoryRoom().queue.push(trackId);
}

// --- presence ------------------------------------------------------------

export async function touchPresence(clientId: string, name?: string): Promise<number> {
  const redis = getRedis();
  const now = Date.now();
  const windowStart = now - PRESENCE_WINDOW_MS;

  if (redis) {
    await redis.zadd(K.presence, now, clientId);
    if (name) await redis.hset(K.presenceNames, clientId, name);
    await redis.zremrangebyscore(K.presence, "-inf", windowStart);
    return redis.zcard(K.presence);
  }

  const room = getMemoryRoom();
  const existing = room.presence.get(clientId);
  room.presence.set(clientId, { name: name || existing?.name || "Listener", lastSeen: now });
  for (const [id, entry] of room.presence) {
    if (entry.lastSeen < windowStart) room.presence.delete(id);
  }
  return room.presence.size;
}

export async function getListenerCount(): Promise<number> {
  const redis = getRedis();
  const windowStart = Date.now() - PRESENCE_WINDOW_MS;

  if (redis) {
    await redis.zremrangebyscore(K.presence, "-inf", windowStart);
    return redis.zcard(K.presence);
  }

  const room = getMemoryRoom();
  let count = 0;
  for (const entry of room.presence.values()) {
    if (entry.lastSeen >= windowStart) count++;
  }
  return count;
}

export async function getActiveListeners(): Promise<{ name: string }[]> {
  const redis = getRedis();
  const windowStart = Date.now() - PRESENCE_WINDOW_MS;

  if (redis) {
    await redis.zremrangebyscore(K.presence, "-inf", windowStart);
    const clientIds = await redis.zrange(K.presence, 0, "-1");
    if (clientIds.length === 0) return [];
    const names = await redis.hmget(K.presenceNames, ...clientIds);
    return names.map((name) => ({ name: name || "Listener" }));
  }

  const room = getMemoryRoom();
  const listeners: { name: string }[] = [];
  for (const entry of room.presence.values()) {
    if (entry.lastSeen >= windowStart) listeners.push({ name: entry.name });
  }
  return listeners;
}

// --- chat ------------------------------------------------------------------

export async function addMessage(name: string, text: string): Promise<ChatMessage> {
  const message: ChatMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.slice(0, 40),
    text: text.slice(0, 500),
    ts: Date.now(),
  };

  const redis = getRedis();
  if (redis) {
    await redis.zadd(K.messages, message.ts, JSON.stringify(message));
    await redis.zremrangebyrank(K.messages, 0, -(MAX_MESSAGES + 1));
    return message;
  }

  const room = getMemoryRoom();
  room.messages.push(message);
  if (room.messages.length > MAX_MESSAGES) {
    room.messages.splice(0, room.messages.length - MAX_MESSAGES);
  }
  return message;
}

export async function getMessagesSince(sinceTs: number): Promise<ChatMessage[]> {
  const redis = getRedis();
  if (redis) {
    const raw = await redis.zrangebyscore(K.messages, `(${sinceTs}`, "+inf");
    return raw.map((entry) => JSON.parse(entry));
  }
  return getMemoryRoom().messages.filter((m) => m.ts > sinceTs);
}

export async function getAllMessages(): Promise<ChatMessage[]> {
  const redis = getRedis();
  if (redis) {
    const raw = await redis.zrange(K.messages, 0, "-1");
    return raw.map((entry) => JSON.parse(entry));
  }
  return getMemoryRoom().messages;
}
