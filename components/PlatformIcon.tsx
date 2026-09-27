const PLATFORM_STYLE: Record<string, { bg: string; fg: string }> = {
  spotify: { bg: "#1DB954", fg: "#ffffff" },
  appleMusic: { bg: "#fa243c", fg: "#ffffff" },
  youtubeMusic: { bg: "#ff0000", fg: "#ffffff" },
  youtube: { bg: "#ff0000", fg: "#ffffff" },
  amazonMusic: { bg: "#00a8e1", fg: "#ffffff" },
  tidal: { bg: "#1f1c19", fg: "#ffffff" },
  deezer: { bg: "#a238ff", fg: "#ffffff" },
  soundcloud: { bg: "#ff5500", fg: "#ffffff" },
};

export default function PlatformIcon({ platform }: { platform: string }) {
  const style = PLATFORM_STYLE[platform] ?? { bg: "#8a8172", fg: "#ffffff" };
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: style.bg }}
      aria-hidden
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
        {platform === "spotify" ? (
          <path
            d="M12 2a10 10 0 100 20 10 10 0 000-20zm4.59 14.4a.62.62 0 01-.86.21c-2.36-1.44-5.33-1.77-8.83-.97a.62.62 0 11-.28-1.21c3.83-.88 7.12-.5 9.76 1.11.3.18.4.56.21.86zm1.22-2.72a.78.78 0 01-1.07.26c-2.7-1.66-6.82-2.14-10.02-1.17a.78.78 0 11-.45-1.49c3.65-1.11 8.19-.57 11.28 1.33.37.23.49.72.26 1.07zm.11-2.83c-3.24-1.92-8.6-2.1-11.7-1.16a.93.93 0 11-.54-1.78c3.56-1.08 9.47-.87 13.2 1.34a.93.93 0 11-.96 1.6z"
            fill={style.fg}
          />
        ) : (
          <path
            d="M9 18V6l10-2v11.5M9 18a3 3 0 11-6 0 3 3 0 016 0zm10-2.5a3 3 0 11-6 0 3 3 0 016 0z"
            stroke={style.fg}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </span>
  );
}
