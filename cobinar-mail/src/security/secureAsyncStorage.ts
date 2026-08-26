import * as SecureStore from 'expo-secure-store';

/**
 * Firebase's getReactNativePersistence() expects something shaped like
 * AsyncStorage (getItem/setItem/removeItem, all string-in-string-out).
 * The common approach is to hand it @react-native-async-storage/async-storage
 * directly — but that storage is NOT encrypted; it's plain files on iOS
 * and plain SharedPreferences on Android. For an auth session (ID token +
 * refresh token + profile), that means anyone with filesystem access to
 * the device (a backup, a rooted/jailbroken device, another app on a
 * mis-configured Android build) can read it directly.
 *
 * expo-secure-store puts values behind the iOS Keychain / Android Keystore
 * instead — hardware-backed on most devices. The catch: it caps each
 * value at roughly 2048 bytes, and Firebase's persisted blob (ID token +
 * refresh token + full user object) routinely runs 1.5–4KB. Handing that
 * straight to SecureStore either warns or throws, depending on SDK version.
 *
 * So: chunk. Split anything Firebase asks us to store into fixed-size
 * pieces, keep a small manifest recording how many pieces there are, and
 * reassemble on read. CHUNK_CHARS is deliberately conservative (worst-case
 * UTF-8 is 4 bytes/char for astral characters) rather than cutting it close
 * to the real limit — in practice this data is ASCII JWT/JSON, so actual
 * usage is nowhere near the cap.
 */

const CHUNK_CHARS = 500;
const metaKey = (key: string) => `${sanitize(key)}__meta`;
const chunkKey = (key: string, i: number) => `${sanitize(key)}__c${i}`;

// SecureStore keys are restricted to [A-Za-z0-9._-]; Firebase's own keys
// are already safe in practice, but don't trust that silently.
function sanitize(key: string): string {
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
  for (let i = 0; i < count; i++) {
    tasks.push(SecureStore.deleteItemAsync(chunkKey(key, i)).catch(() => {}));
  }
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
          // A chunk is missing — the write was interrupted, or something
          // external cleared one piece. Treat the whole value as absent
          // rather than return a truncated/corrupt string: Firebase will
          // just see "no session" and fall back to a fresh sign-in, which
          // is the safe failure mode here.
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
    for (let i = 0; i < value.length; i += CHUNK_CHARS) {
      chunks.push(value.slice(i, i + CHUNK_CHARS));
    }
    if (chunks.length === 0) chunks.push('');

    // Write the new chunks first, manifest last — if this gets interrupted
    // partway through, the OLD manifest (pointing at the old, still-intact
    // chunks) is still in place, so a concurrent read never sees a mix of
    // old and new data.
    for (let i = 0; i < chunks.length; i++) {
      await SecureStore.setItemAsync(chunkKey(key, i), chunks[i]);
    }
    await SecureStore.setItemAsync(metaKey(key), String(chunks.length));

    // Only now, with the new manifest committed, remove any leftover
    // chunks from a previous, longer value.
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
