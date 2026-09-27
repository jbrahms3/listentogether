"use client";

import Image from "next/image";
import { formatTime } from "@/lib/format";
import { ListenLink, SpotifyTrack } from "@/lib/types";
import PlatformIcon from "./PlatformIcon";

export default function NowPlaying({
  track,
  elapsedMs,
  links,
  onSkip,
}: {
  track: SpotifyTrack;
  elapsedMs: number;
  links: ListenLink[];
  onSkip: () => void;
}) {
  const progress = Math.min(elapsedMs / track.durationMs, 1);
  const shownLinks = links.length > 0 ? links.slice(0, 3) : null;

  return (
    <div>
      <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,360px)_1fr] md:gap-14">
        <div className="aspect-square w-full overflow-hidden rounded-2xl bg-line shadow-sm">
          {track.albumImage ? (
            <Image
              src={track.albumImage}
              alt={track.albumName}
              width={720}
              height={720}
              className="h-full w-full object-cover"
              unoptimized
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted">
              No artwork
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Now listening to</p>
          <h1 className="mt-3 font-serif text-6xl leading-[1.05] md:text-7xl">{track.name}</h1>
          <p className="mt-4 font-serif text-2xl text-ink/85 md:text-[28px]">
            {track.artists.join(", ")}
          </p>
          <p className="mt-2 text-sm text-muted">
            {[track.albumName, track.releaseYear].filter(Boolean).join(" · ")}
          </p>

          {track.genres.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {track.genres.map((genre) => (
                <span
                  key={genre}
                  className="rounded-full border border-line bg-white/60 px-4 py-1.5 text-[13px] capitalize text-ink/70"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          <div className="mt-10">
            <div className="h-[3px] w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-ink transition-[width] duration-300 ease-linear"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-sm text-muted">
              <span>{formatTime(elapsedMs)}</span>
              <span>{formatTime(track.durationMs)}</span>
            </div>
            <div className="mt-1 flex justify-end">
              <button
                onClick={onSkip}
                className="text-xs uppercase tracking-[0.2em] text-muted hover:text-ink"
              >
                Skip →
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 rounded-2xl border border-line bg-white/50 p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">
          Listen on your preferred service
        </p>
        <div className="mt-5 flex flex-col gap-4 sm:flex-row">
          {(shownLinks ?? [{ platform: "spotify", label: "Spotify", url: track.externalUrl }]).map(
            (link) => (
              <a
                key={link.platform}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-between gap-3 rounded-xl border border-line bg-white px-5 py-4 transition hover:border-ink/30 hover:shadow-sm"
              >
                <span className="flex items-center gap-3">
                  <PlatformIcon platform={link.platform} />
                  <span className="font-serif text-lg">{link.label}</span>
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M7 17L17 7M9 7h8v8"
                    stroke="#8f8878"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            )
          )}
        </div>
        <p className="mt-5 flex items-center gap-2 text-[13px] text-muted">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="#8f8878" strokeWidth="1.3" />
            <path d="M12 8v5" stroke="#8f8878" strokeWidth="1.3" strokeLinecap="round" />
            <circle cx="12" cy="16" r="0.6" fill="#8f8878" />
          </svg>
          Open the track and press play to listen with everyone. Use the timer to stay in sync.
        </p>
      </div>
    </div>
  );
}
