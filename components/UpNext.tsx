"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { formatMinutesUntil } from "@/lib/format";
import { SpotifyTrack } from "@/lib/types";

export interface UpNextItem {
  track: SpotifyTrack;
  startsInMs: number;
}

export default function UpNext({
  items,
  onAdd,
}: {
  items: UpNextItem[];
  onAdd: (query: string) => Promise<{ error?: string } | void>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setBusy(true);
    setStatus(null);
    const result = await onAdd(q);
    setBusy(false);
    if (result?.error) {
      setStatus(result.error);
    } else {
      setStatus(`Added “${q}” to the queue.`);
      setQuery("");
    }
  }

  return (
    <div className="border-t border-line pt-10">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Up next</p>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-muted hover:text-ink"
        >
          Add to queue
          <span className={`transition-transform ${open ? "rotate-45" : ""}`}>+</span>
        </button>
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a track or artist to queue…"
            className="flex-1 rounded-full border border-line bg-white/60 px-4 py-2 text-sm outline-none focus:border-ink/40"
          />
          <button
            type="submit"
            disabled={busy || !query.trim()}
            className="rounded-full bg-ink px-5 py-2 text-sm text-paper disabled:opacity-40"
          >
            {busy ? "Adding…" : "Add"}
          </button>
        </form>
      )}
      {status && <p className="mt-2 text-xs text-muted">{status}</p>}

      <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-3">
        {items.map(({ track, startsInMs }) => (
          <div key={track.id} className="flex items-start gap-4">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-line">
              {track.albumImage && (
                <Image
                  src={track.albumImage}
                  alt={track.albumName}
                  width={112}
                  height={112}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-serif text-lg leading-snug">{track.name}</p>
              <p className="truncate text-sm text-muted">{track.artists.join(", ")}</p>
            </div>
            <span className="shrink-0 self-end text-sm text-muted">
              {formatMinutesUntil(startsInMs)}
            </span>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-muted">Nothing queued yet — add a track above.</p>
        )}
      </div>
    </div>
  );
}
