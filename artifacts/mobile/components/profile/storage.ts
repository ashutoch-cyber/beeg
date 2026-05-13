export const PROFILE_GREEN = "#1a5c3a";

type LocalStorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem?: (key: string) => void;
};

function getStorage(): LocalStorageLike | null {
  const storage = (globalThis as typeof globalThis & { localStorage?: LocalStorageLike }).localStorage;
  return storage ?? null;
}

export function readStorage(key: string): string | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string) {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    // Storage failures should not break the profile UI.
  }
}

export function readJsonStorage<T>(key: string, fallback: T): T {
  const raw = readStorage(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJsonStorage(key: string, value: unknown) {
  writeStorage(key, JSON.stringify(value));
}

export function formatStoredDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
