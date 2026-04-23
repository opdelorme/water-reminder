import { LocalStorage } from "@raycast/api";

const LAST_FIRE_KEY = "lastFireAt:v1";
const PAUSED_KEY = "paused:v1";
const INTERVAL_KEY = "intervalMinutes:v1";

export const DEFAULT_INTERVAL_MINUTES = 15;
export const INTERVAL_CHOICES = [1, 5, 10, 15, 20, 30, 45, 60, 90, 120];

export async function recordFire(): Promise<void> {
  await LocalStorage.setItem(LAST_FIRE_KEY, String(Date.now()));
}

export async function getLastFireAt(): Promise<number | null> {
  const raw = await LocalStorage.getItem<string>(LAST_FIRE_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function isPaused(): Promise<boolean> {
  const raw = await LocalStorage.getItem<string>(PAUSED_KEY);
  return raw === "1";
}

export async function setPaused(v: boolean): Promise<void> {
  if (v) await LocalStorage.setItem(PAUSED_KEY, "1");
  else await LocalStorage.removeItem(PAUSED_KEY);
}

export async function getIntervalMinutes(): Promise<number> {
  const raw = await LocalStorage.getItem<string>(INTERVAL_KEY);
  if (!raw) return DEFAULT_INTERVAL_MINUTES;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_INTERVAL_MINUTES;
}

export async function setIntervalMinutes(m: number): Promise<void> {
  await LocalStorage.setItem(INTERVAL_KEY, String(m));
}

export function formatCountdown(msUntil: number): string {
  if (msUntil <= 0) return "now";
  const totalSeconds = Math.ceil(msUntil / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m >= 1) return `${m}m`;
  return `${s}s`;
}
