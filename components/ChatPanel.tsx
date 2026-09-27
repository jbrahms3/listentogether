"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ChatMessage } from "@/lib/types";
import { colorForName, initialFor } from "@/lib/format";

export default function ChatPanel({
  messages,
  listeners,
  listenerCount,
  name,
  onSetName,
  onSend,
}: {
  messages: ChatMessage[];
  listeners: { name: string }[];
  listenerCount: number;
  name: string;
  onSetName: (name: string) => void;
  onSend: (text: string) => void;
}) {
  const [tab, setTab] = useState<"chat" | "listeners">("chat");
  const [draft, setDraft] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tab === "chat" && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, tab]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  }

  function handleNameSubmit(e: FormEvent) {
    e.preventDefault();
    const n = nameDraft.trim();
    if (!n) return;
    onSetName(n);
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-line bg-white/50 shadow-sm">
      <div className="flex border-b border-line px-6 pt-5">
        <button
          onClick={() => setTab("chat")}
          className={`pb-4 font-serif text-xl ${
            tab === "chat" ? "border-b-2 border-ink text-ink" : "text-muted"
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => setTab("listeners")}
          className={`ml-8 pb-4 font-serif text-xl ${
            tab === "listeners" ? "border-b-2 border-ink text-ink" : "text-muted"
          }`}
        >
          Listeners ({listenerCount})
        </button>
      </div>

      {tab === "chat" ? (
        <>
          <div
            ref={scrollRef}
            className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-6 py-5"
          >
            {messages.map((m) => (
              <div key={m.id} className="flex gap-3">
                <span
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium text-ink/70"
                  style={{ backgroundColor: colorForName(m.name) }}
                >
                  {initialFor(m.name)}
                </span>
                <div>
                  <p className="text-sm">
                    <span className="font-medium">{m.name}</span>{" "}
                    <span className="text-xs text-muted">
                      {new Date(m.ts).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[15px] leading-relaxed text-ink/90">{m.text}</p>
                </div>
              </div>
            ))}
          </div>

          {name ? (
            <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-line p-5">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Say something…"
                className="flex-1 rounded-full border border-line bg-paper px-4 py-2.5 text-sm outline-none focus:border-ink/40"
                maxLength={500}
              />
              <button
                type="submit"
                aria-label="Send"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-paper disabled:opacity-40"
                disabled={!draft.trim()}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M4 20l16-8L4 4v6l10 2-10 2v6z" fill="currentColor" />
                </svg>
              </button>
            </form>
          ) : (
            <form onSubmit={handleNameSubmit} className="flex items-center gap-2 border-t border-line p-5">
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                placeholder="Your name, to join the chat…"
                className="flex-1 rounded-full border border-line bg-paper px-4 py-2.5 text-sm outline-none focus:border-ink/40"
                maxLength={40}
                autoFocus
              />
              <button
                type="submit"
                disabled={!nameDraft.trim()}
                className="shrink-0 rounded-full bg-ink px-5 py-2.5 text-sm text-paper disabled:opacity-40"
              >
                Join
              </button>
            </form>
          )}
        </>
      ) : (
        <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {listeners.length === 0 && (
            <p className="text-sm text-muted">No one else is here yet — invite someone in.</p>
          )}
          {listeners.map((l, i) => (
            <div key={`${l.name}-${i}`} className="flex items-center gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium text-ink/70"
                style={{ backgroundColor: colorForName(l.name) }}
              >
                {initialFor(l.name)}
              </span>
              <span className="text-sm">{l.name}</span>
              <span className="ml-auto h-2 w-2 rounded-full bg-green-600/70" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
