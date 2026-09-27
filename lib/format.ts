export function formatTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const AVATAR_PALETTE = [
  "#d9c6a5",
  "#c3ccb0",
  "#cbb8c9",
  "#b9c9d1",
  "#d8b9a8",
  "#c8c39a",
  "#b6b8c9",
];

export function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

export function initialFor(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function formatMinutesUntil(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60000));
  return `~ ${minutes} min`;
}

export function formatClockTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
