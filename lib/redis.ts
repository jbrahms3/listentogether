import Redis from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var __listenRedis: Redis | null | undefined;
}

// The queue/chat/presence backend switches to Redis whenever REDIS_URL is
// set (Railway wires this in automatically once the Redis service is
// attached) so multiple instances share one source of truth. Locally, with
// no REDIS_URL, lib/store.ts falls back to an in-memory store instead --
// no local Redis setup needed for development.
export function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null;

  if (!global.__listenRedis) {
    const client = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
    });
    client.on("error", (err) => {
      console.error("[redis] connection error:", err.message);
    });
    // "advanceIfElapsed" atomically rotates the queue and resets the start
    // time only if the current track has actually finished, so concurrent
    // instances polling at the same moment can't double-advance the queue.
    client.defineCommand("advanceIfElapsed", {
      numberOfKeys: 2,
      lua: `
        local startedAt = tonumber(redis.call('GET', KEYS[2]))
        local now = tonumber(ARGV[1])
        if not startedAt then
          redis.call('SET', KEYS[2], now)
          return 0
        end
        local durationMs = tonumber(ARGV[2])
        if (now - startedAt) >= durationMs then
          local len = redis.call('LLEN', KEYS[1])
          if len > 1 then
            local head = redis.call('LPOP', KEYS[1])
            redis.call('RPUSH', KEYS[1], head)
          end
          redis.call('SET', KEYS[2], now)
          return 1
        end
        return 0
      `,
    });
    global.__listenRedis = client;
  }

  return global.__listenRedis;
}

declare module "ioredis" {
  interface RedisCommander<Context> {
    advanceIfElapsed(
      queueKey: string,
      startedAtKey: string,
      now: number,
      durationMs: number
    ): Promise<number>;
  }
}
