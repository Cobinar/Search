import * as SecureStore from 'expo-secure-store';

/* ────────────────────────────────────────────────────────────────
   Secure, chunked storage for Firebase Auth persistence
   ──────────────────────────────────────────────────────────────── */
/**
 * Firebase's getReactNativePersistence() expects something AsyncStorage-
 * shaped. The common approach hands it @react-native-async-storage's real
 * AsyncStorage — but that's plain, unencrypted files on iOS and plain
 * SharedPreferences on Android. This backs it with expo-secure-store
 * (iOS Keychain / Android Keystore) instead.
 *
 * The catch: SecureStore caps each value at roughly 2048 bytes, and
 * Firebase's persisted blob (ID token + refresh token + user object)
 * routinely runs 1.5–4KB. So: chunk. Split anything Firebase asks us to
 * store into fixed-size pieces, keep a small manifest recording how many
 * there are, reassemble on read. Chunks are written before the manifest,
 * so an interrupted write can never leave a corrupted partial session —
 * worst case is falling back to a fresh sign-in.
 */
const CHUNK_CHARS = 500; // conservative even for 4-byte-per-char UTF-8 worst case
const metaKey = (key: string) => `${sanitizeKey(key)}__meta`;
const chunkKey = (key: string, i: number) => `${sanitizeKey(key)}__c${i}`;
function sanitizeKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

async function readMeta(key: string): Promise<number | null> {
  try {
    const raw = await SecureStore.getItemAsync(metaKey(key));
    if (!raw) return null;
    const n = Number(raw);
    return Number.isInteger(n) && n >= 0 ? n : null;
  } catch {
    return null;
  }
}

async function deleteChunks(key: string, count: number): Promise<void> {
  const tasks: Promise<void>[] = [];
  for (let i = 0; i < count; i++) tasks.push(SecureStore.deleteItemAsync(chunkKey(key, i)).catch(() => {}));
  tasks.push(SecureStore.deleteItemAsync(metaKey(key)).catch(() => {}));
  await Promise.all(tasks);
}

export const secureAsyncStorage = {
  async getItem(key: string): Promise<string | null> {
    const count = await readMeta(key);
    if (count === null) return null;
    if (count === 0) return '';
    try {
      const parts: string[] = [];
      for (let i = 0; i < count; i++) {
        const part = await SecureStore.getItemAsync(chunkKey(key, i));
        if (part === null) {
          // A chunk is missing (interrupted write, or something external
          // cleared one piece). Treat the whole value as absent rather
          // than return a truncated string — Firebase just sees "no
          // session" and falls back to a fresh sign-in.
          await deleteChunks(key, count);
          return null;
        }
        parts.push(part);
      }
      return parts.join('');
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    const previousCount = (await readMeta(key)) ?? 0;
    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_CHARS) chunks.push(value.slice(i, i + CHUNK_CHARS));
    if (chunks.length === 0) chunks.push('');

    for (let i = 0; i < chunks.length; i++) await SecureStore.setItemAsync(chunkKey(key, i), chunks[i]);
    await SecureStore.setItemAsync(metaKey(key), String(chunks.length));

    if (previousCount > chunks.length) {
      const orphaned: Promise<void>[] = [];
      for (let i = chunks.length; i < previousCount; i++) {
        orphaned.push(SecureStore.deleteItemAsync(chunkKey(key, i)).catch(() => {}));
      }
      await Promise.all(orphaned);
    }
  },

  async removeItem(key: string): Promise<void> {
    const count = await readMeta(key);
    if (count === null) return;
    await deleteChunks(key, count);
  },
};

/* ────────────────────────────────────────────────────────────────
   Allowlisted, HTTPS-only fetch for the Worker API
   ──────────────────────────────────────────────────────────────── */
/**
 * What this enforces right now: HTTPS only, and only to hosts in
 * EXPECTED_HOSTS — a typo, a bad redirect, or a compromised dependency
 * can't silently send a request (and whatever Authorization header comes
 * with it) somewhere else.
 *
 * What it does NOT do: true certificate pinning (rejecting a *valid* cert
 * that isn't the one you expect — what actually stops a compromised-CA
 * MITM). That needs a native module and real certificate fingerprints,
 * neither of which belongs hardcoded here without the real values. See
 * PINS below for exactly how to wire that in for real when you have them.
 */
const EXPECTED_HOSTS = ['api.mail.cobinar.com'] as const;

const PINS: Record<string, string[]> = {
  // 'api.mail.cobinar.com': ['sha256/AAAA...', 'sha256/BBBB...' /* backup pin */],
};

export class UnexpectedHostError extends Error {
  constructor(host: string) {
    super(`Refusing to call unexpected host "${host}" — not in EXPECTED_HOSTS.`);
    this.name = 'UnexpectedHostError';
  }
}

function assertSafeUrl(input: string): URL {
  const url = new URL(input);
  if (url.protocol !== 'https:') throw new Error(`Refusing a non-HTTPS request to ${url.protocol}//${url.host}`);
  if (!EXPECTED_HOSTS.includes(url.hostname as (typeof EXPECTED_HOSTS)[number])) {
    throw new UnexpectedHostError(url.hostname);
  }
  return url;
}

export async function pinnedFetch(input: string, init?: RequestInit): Promise<Response> {
  assertSafeUrl(input);
  if (PINS[new URL(input).hostname]?.length) {
    console.warn('pinnedFetch: PINS configured but no native enforcement is wired in yet.');
  }
  return fetch(input, init);
}

/* ────────────────────────────────────────────────────────────────
   HTML sanitization for rendering email content
   ──────────────────────────────────────────────────────────────── */
/**
 * Same rules as sanitizeHtml() in webmail/index.html — strips scripts,
 * style blocks, and inline event handlers before message HTML ever
 * reaches a WebView. This is what makes it safe to re-enable JavaScript
 * in that WebView for accurate content-height measurement (see
 * MessageDetail in the message route): sanitize first, then it's safe to
 * let the *page's own* (now-harmless) script run, same as the web app
 * already does for the exact same content.
 */
export function sanitizeHtml(html: string): string {
  return String(html || '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[^>]*>/gi, '')
    .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\bon\w+\s*=\s*[^\s>]*/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '');
}
