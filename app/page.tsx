"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import NowPlaying from "@/components/NowPlaying";
import UpNext, { UpNextItem } from "@/components/UpNext";
import ChatPanel from "@/components/ChatPanel";
import { ChatMessage, RoomResponse } from "@/lib/types";

const ROOM_POLL_MS = 4000;
const CHAT_POLL_MS = 2500;

function getOrCreateClientId(): string {
  const key = "lt_client_id";
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(key, id);
  }
  return id;
}

export default function Page() {
  const [room, setRoom] = useState<RoomResponse | null>(null);
  const [displayedElapsed, setDisplayedElapsed] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [name, setName] = useState("");

  const clientIdRef = useRef<string>("");
  const baseRef = useRef({ elapsed: 0, timestamp: Date.now() });
  const lastMessageTsRef = useRef(0);
  const trackIdRef = useRef<string | null>(null);

  useEffect(() => {
    clientIdRef.current = getOrCreateClientId();
    const savedName = window.localStorage.getItem("lt_name");
    if (savedName) setName(savedName);
  }, []);

  const fetchRoom = useCallback(async () => {
    try {
      const res = await fetch("/api/room", {
        headers: {
          "x-client-id": clientIdRef.current,
          "x-client-name": name,
        },
        cache: "no-store",
      });
      const data: RoomResponse = await res.json();
      setRoom(data);
      if (data.track) {
        if (data.track.id !== trackIdRef.current) {
          trackIdRef.current = data.track.id;
        }
        baseRef.current = { elapsed: data.elapsedMs, timestamp: Date.now() };
        setDisplayedElapsed(data.elapsedMs);
      }
    } catch {
      // Network hiccup — the next poll will retry.
    }
  }, [name]);

  const fetchChat = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat?since=${lastMessageTsRef.current}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.messages?.length) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const fresh = data.messages.filter((m: ChatMessage) => !existingIds.has(m.id));
          return fresh.length ? [...prev, ...fresh] : prev;
        });
        lastMessageTsRef.current = data.messages[data.messages.length - 1].ts;
      }
    } catch {
      // Ignore; retried on next interval.
    }
  }, []);

  useEffect(() => {
    fetchRoom();
    const interval = setInterval(fetchRoom, ROOM_POLL_MS);
    return () => clearInterval(interval);
  }, [fetchRoom]);

  useEffect(() => {
    fetchChat();
    const interval = setInterval(fetchChat, CHAT_POLL_MS);
    return () => clearInterval(interval);
  }, [fetchChat]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!room?.track) return;
      const elapsed = baseRef.current.elapsed + (Date.now() - baseRef.current.timestamp);
      setDisplayedElapsed(Math.min(elapsed, room.track.durationMs));
    }, 250);
    return () => clearInterval(interval);
  }, [room?.track]);

  function handleSetName(newName: string) {
    setName(newName);
    window.localStorage.setItem("lt_name", newName);
  }

  async function handleSend(text: string) {
    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, text }),
      });
      fetchChat();
    } catch {
      // The next scheduled poll will retry picking up messages.
    }
  }

  async function handleAddToQueue(query: string) {
    try {
      const res = await fetch("/api/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error ?? "Could not add that track." };
      fetchRoom();
      return {};
    } catch {
      return { error: "Could not reach the server." };
    }
  }

  async function handleSkip() {
    try {
      await fetch("/api/room/skip", { method: "POST" });
      fetchRoom();
    } catch {
      // Retried on next poll regardless.
    }
  }

  const upNextItems: UpNextItem[] = [];
  if (room?.track) {
    let cursor = Math.max(room.track.durationMs - displayedElapsed, 0);
    for (const track of room.upNext) {
      upNextItems.push({ track, startsInMs: cursor });
      cursor += track.durationMs;
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-[1480px]">
      <Header listenerCount={room?.listenerCount ?? 0} />

      <main className="grid grid-cols-1 gap-10 px-6 py-10 sm:px-10 lg:grid-cols-[1fr_400px] lg:gap-14 lg:py-14">
        <section>
          {room?.error && (
            <div className="mb-6 rounded-2xl border border-line bg-white/50 p-5 text-sm text-muted">
              {room.error}
            </div>
          )}

          {room?.track && (
            <NowPlaying
              track={room.track}
              elapsedMs={displayedElapsed}
              links={room.links}
              onSkip={handleSkip}
            />
          )}

          {!room?.track && !room?.error && (
            <p className="text-sm text-muted">Loading the room…</p>
          )}

          <div className="mt-10">
            <UpNext items={upNextItems} onAdd={handleAddToQueue} />
          </div>
        </section>

        <aside className="h-[640px] lg:h-auto">
          <ChatPanel
            messages={messages}
            listeners={room?.listeners ?? []}
            listenerCount={room?.listenerCount ?? 0}
            name={name}
            onSetName={handleSetName}
            onSend={handleSend}
          />
        </aside>
      </main>
    </div>
  );
}
