// ═══════════════════════════════════════════════════════════════════════════
//  lib/bloomlili.ts — Shared Firebase, types, helpers, icons, design tokens
//  Cobinar Systems · Marc-Arthur Samuel Dalus
//
//  Everything routes under app/ import from here instead of repeating
//  Firebase init / types / icons in every file. Lives outside app/ on
//  purpose — Expo Router treats every file inside app/ as a route.
//
//  Two corrections from the previous single-file version, both verified
//  against your actual index.html this time, not inferred:
//   - feed post fields are `url` / `type`, not `mediaUrl` / `mediaType` —
//     this was the exact cause of "count is right, grid is blank."
//   - media upload goes through your Worker's POST /api/upload → R2, not
//     Firebase Storage. uploadMedia() below now matches that contract
//     (multipart form: file, app, collection, entityId, slot, optional
//     rule) instead of the Storage calls the old Status feature used.
// ═══════════════════════════════════════════════════════════════════════════

import { getApps, getApp, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  initializeAuth, getAuth, getReactNativePersistence, type Auth, type User,
} from 'firebase/auth';
import {
  getFirestore, doc, getDoc, setDoc, addDoc, deleteDoc, collection, query,
  where, orderBy, limit, getDocs, getCountFromServer, serverTimestamp,
  Timestamp, type Firestore,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const WORKER_BASE_URL = 'https://worker.bloomlili.com';

const firebaseConfig = {
  apiKey: 'AIzaSyBZTtaNWgHc2Uz3FiKLb88K9ZA3aanFxnk',
  authDomain: 'bloomlili-online.firebaseapp.com',
  projectId: 'bloomlili-online',
  storageBucket: 'bloomlili-online.firebasestorage.app',
  messagingSenderId: '235323716439',
  appId: '1:235323716439:web:13932327bdbec94214c412',
};

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
export let fbInitError: string | null = null;

try {
  _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  try {
    _auth = initializeAuth(_app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    _auth = getAuth(_app);
  }
  _db = getFirestore(_app);
} catch (err) {
  fbInitError = err instanceof Error ? err.message : String(err);
}
export const fbAuth = _auth;
export const fbDb = _db;

// ═══════════════════════════════════════════════════════════════════════════
//  Design tokens
// ═══════════════════════════════════════════════════════════════════════════

export const L = {
  bg: '#FFFFFF', ink: '#111111', sub: '#555555', faint: '#AAAAAA',
  lime: '#C8FF00', lime2: '#A8D800', limeDk: '#7FA800',
  error: '#FF3B30', warnBg: '#FFF8D6', coral: '#FF5C41',
};

// ═══════════════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════════════

export type Profile = {
  bloomId: string; displayName: string; avatarIdx: number; avatarUrl: string | null;
  uid: string; email: string | null; authProvider: string; lang: string;
};
export type ParticipantData = { displayName: string; bloomId: string; avatarIdx: number; avatarUrl: string | null };
export type DmDoc = { id: string; participants: string[]; participantData: Record<string, ParticipantData>; createdAt?: Timestamp };
export type MessageDoc = {
  id: string; text?: string; _t?: string; enc: boolean; senderId: string; bloomId?: string;
  displayName?: string; avatarIdx?: number; type: 'text' | 'system'; createdAt: Timestamp | null;
};
// Real feed post shape, verified against the fus-post-btn handler in index.html
export type FeedPost = {
  id: string; uid: string; url?: string; type?: 'image' | 'video';
  title?: string; caption?: string; likeCount?: number; commentCount?: number;
};
export type StatusDoc = { id: string; uid: string; mediaUrl: string; mediaType: 'image' | 'video'; createdAt: Timestamp };

// ═══════════════════════════════════════════════════════════════════════════
//  Avatar presets — exact GRADS / EMOJIS from login.html
// ═══════════════════════════════════════════════════════════════════════════

export const GRADS: [string, string][] = [
  ['#C8FF00', '#F5F2E8'], ['#FFD60A', '#FFF8D6'], ['#FF5C41', '#FFE8E4'],
  ['#A8D800', '#EEF9CC'], ['#FF9F1C', '#FFF3DC'], ['#00C851', '#DCFFE8'],
  ['#0A84FF', '#DCF0FF'], ['#FF375F', '#FFDCE3'], ['#5E5CE6', '#EEEEFF'], ['#32D74B', '#DFFBE5'],
];
export const EMOJIS = ['🌸', '🌊', '⚡', '🌙', '🔥', '💎', '🌿', '🎯', '🦋', '🌈'];

// ═══════════════════════════════════════════════════════════════════════════
//  Spark plans
// ═══════════════════════════════════════════════════════════════════════════

export type SparkPlan = { id: 'lite' | 'pro' | 'ultra'; name: string; cents: number; tagline: string };
export const SPARK_PLANS: SparkPlan[] = [
  { id: 'lite', name: 'Spark Lite', cents: 99, tagline: 'The basics, ad-free.' },
  { id: 'pro', name: 'Spark Pro', cents: 9999, tagline: 'Full Bloom AI access.' },
  { id: 'ultra', name: 'Spark Ultra', cents: 21999, tagline: 'Everything, plus every badge.' },
];
export const money = (cents: number) => (cents / 100).toFixed(2);

// ═══════════════════════════════════════════════════════════════════════════
//  Profile / Bloom ID helpers
// ═══════════════════════════════════════════════════════════════════════════

const BLOOM_ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function genBloomId(): string {
  return Array.from({ length: 10 }, () => BLOOM_ID_CHARS[Math.floor(Math.random() * BLOOM_ID_CHARS.length)]).join('');
}
export async function uniqueBloomId(db: Firestore): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const id = genBloomId();
    const snap = await getDoc(doc(db, 'bloomIds', id));
    if (!snap.exists()) return id;
  }
  return genBloomId();
}
export async function createProfile(db: Firestore, user: User, name: string, bloomId: string, avatarIdx: number): Promise<Profile> {
  const data: Profile = {
    bloomId, displayName: name, avatarIdx, avatarUrl: null, uid: user.uid, email: user.email,
    authProvider: user.providerData?.[0]?.providerId || 'anonymous', lang: 'en',
  };
  await setDoc(doc(db, 'users', user.uid), { ...data, createdAt: serverTimestamp(), lastSeen: serverTimestamp() });
  await setDoc(doc(db, 'bloomIds', bloomId), { uid: user.uid, displayName: name, createdAt: serverTimestamp() });
  return data;
}
export async function saveProfileEdits(db: Firestore, uid: string, updates: Partial<Pick<Profile, 'displayName' | 'avatarIdx' | 'avatarUrl'>>) {
  await setDoc(doc(db, 'users', uid), updates, { merge: true });
}
export async function fetchProfileCounts(db: Firestore, uid: string) {
  const [followersSnap, followingSnap, postsSnap] = await Promise.all([
    getCountFromServer(collection(db, 'users', uid, 'followers')),
    getCountFromServer(collection(db, 'users', uid, 'following')),
    getCountFromServer(query(collection(db, 'feed'), where('uid', '==', uid))),
  ]);
  return { followers: followersSnap.data().count, following: followingSnap.data().count, posts: postsSnap.data().count };
}
export async function fetchOwnFeedPosts(db: Firestore, uid: string): Promise<FeedPost[]> {
  const snap = await getDocs(query(collection(db, 'feed'), where('uid', '==', uid), orderBy('createdAt', 'desc'), limit(30)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FeedPost, 'id'>) }));
}

export const EMAIL_ERR: Record<string, string> = {
  'auth/email-already-in-use': 'Email already registered — switch to Sign In.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/user-not-found': 'No account found — switch to Sign Up.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/invalid-email': 'Invalid email address.',
  'auth/too-many-requests': 'Too many attempts. Wait a moment.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/network-request-failed': 'Network error. Check your connection.',
};
export const ANON_ERR: Record<string, string> = {
  'auth/operation-not-allowed': 'Enable Anonymous sign-in in Firebase Console → Authentication → Sign-in method.',
};
export function errMessage(map: Record<string, string>, err: unknown): string {
  const code = (err as { code?: string })?.code;
  if (code && map[code]) return map[code];
  return err instanceof Error ? err.message : 'Something went wrong.';
}

// ═══════════════════════════════════════════════════════════════════════════
//  Worker API
// ═══════════════════════════════════════════════════════════════════════════

export async function apiPost(auth: Auth, path: string, body: Record<string, unknown>): Promise<any> {
  const user = auth.currentUser;
  if (!user) throw new Error('You need to be signed in to do this.');
  const token = await user.getIdToken();
  const res = await fetch(`${WORKER_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  let decoded: any;
  try {
    decoded = await res.json();
  } catch {
    throw new Error(`Server returned an unexpected response (${res.status}).`);
  }
  if (res.status >= 400 || decoded?.ok === false) {
    throw new Error(decoded?.error?.toString() ?? 'Something went wrong.');
  }
  return decoded;
}

export async function fetchStripePk(): Promise<string> {
  const res = await fetch(`${WORKER_BASE_URL}/api/config`);
  if (!res.ok) throw new Error(`Config request failed (${res.status}).`);
  const body = await res.json();
  if (!body?.stripePk) throw new Error('Worker did not return a Stripe publishable key — check /api/config on the backend.');
  return body.stripePk as string;
}

// ═══════════════════════════════════════════════════════════════════════════
//  Media upload — real contract: POST /api/upload → R2, matches
//  uploadToR2() in index.html exactly (multipart form, not Storage).
// ═══════════════════════════════════════════════════════════════════════════

export async function uploadMedia(
  auth: Auth,
  localUri: string,
  opts: { collection: string; entityId: string; slot: 'image' | 'video'; isAvatarRule?: boolean },
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('You need to be signed in to do this.');
  const token = await user.getIdToken();

  const filename = localUri.split('/').pop() || `upload.${opts.slot === 'video' ? 'mp4' : 'jpg'}`;
  const mimeGuess = opts.slot === 'video' ? 'video/mp4' : 'image/jpeg';

  const form = new FormData();
  // React Native's fetch/FormData accepts this {uri, name, type} shape for files.
  form.append('file', { uri: localUri, name: filename, type: mimeGuess } as unknown as Blob);
  form.append('app', 'bloomlili');
  form.append('collection', opts.collection);
  form.append('entityId', opts.entityId);
  form.append('slot', opts.slot);
  if (opts.isAvatarRule) form.append('rule', 'avatar');

  const res = await fetch(`${WORKER_BASE_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }, // no Content-Type — fetch sets the multipart boundary itself
    body: form,
  });
  let decoded: any;
  try {
    decoded = await res.json();
  } catch {
    throw new Error(`Upload worker returned a non-JSON response (${res.status}).`);
  }
  if (!decoded?.ok || !decoded?.publicUrl) {
    throw new Error(decoded?.error || decoded?.message || `Upload failed (${res.status}).`);
  }
  return decoded.publicUrl as string;
}

// ═══════════════════════════════════════════════════════════════════════════
//  DM helpers — mirrors loadDMs / startDM / sendMsg in index.html
// ═══════════════════════════════════════════════════════════════════════════

export async function loadDms(db: Firestore, myUid: string): Promise<DmDoc[]> {
  const snap = await getDocs(query(collection(db, 'dms'), where('participants', 'array-contains', myUid)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DmDoc, 'id'>) }));
}

export async function findOrCreateDm(db: Firestore, me: Profile, existingDms: DmDoc[], otherBloomId: string): Promise<DmDoc> {
  const cleanId = otherBloomId.trim().toUpperCase();
  const idSnap = await getDoc(doc(db, 'bloomIds', cleanId));
  if (!idSnap.exists()) throw new Error('No account found with that Bloom ID.');
  const otherUid = (idSnap.data() as { uid: string }).uid;
  if (otherUid === me.uid) throw new Error("That's your own Bloom ID.");

  const existing = existingDms.find((d) => d.participants?.includes(otherUid));
  if (existing) return existing;

  const otherSnap = await getDoc(doc(db, 'users', otherUid));
  if (!otherSnap.exists()) throw new Error('User not found.');
  const otherData = otherSnap.data() as Profile;

  const participantData: Record<string, ParticipantData> = {
    [me.uid]: { displayName: me.displayName, bloomId: me.bloomId, avatarIdx: me.avatarIdx, avatarUrl: me.avatarUrl },
    [otherUid]: { displayName: otherData.displayName, bloomId: otherData.bloomId, avatarIdx: otherData.avatarIdx, avatarUrl: otherData.avatarUrl },
  };
  const dmRef = await addDoc(collection(db, 'dms'), { participants: [me.uid, otherUid], participantData, createdAt: serverTimestamp() });
  await addDoc(collection(db, 'dms', dmRef.id, 'messages'), {
    text: `${me.displayName} started a conversation`, _t: `${me.displayName} started a conversation`,
    enc: false, senderId: 'system', createdAt: serverTimestamp(), type: 'system', reactions: {},
  });
  return { id: dmRef.id, participants: [me.uid, otherUid], participantData };
}

export async function sendDmMessage(db: Firestore, dmId: string, me: Profile, text: string) {
  await addDoc(collection(db, 'dms', dmId, 'messages'), {
    text: text.trim(), enc: false, senderId: me.uid, bloomId: me.bloomId,
    displayName: me.displayName, avatarIdx: me.avatarIdx, avatarUrl: me.avatarUrl,
    createdAt: serverTimestamp(), type: 'text', reactions: {},
  });
}

export async function setTyping(db: Firestore, dmId: string, me: Profile, on: boolean) {
  const ref = doc(db, 'dms', dmId, 'typing', me.uid);
  try {
    if (on) await setDoc(ref, { displayName: me.displayName, at: serverTimestamp() });
    else await deleteDoc(ref);
  } catch {
    // typing indicators are a nicety, never worth surfacing an error for
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Status (own story)
// ═══════════════════════════════════════════════════════════════════════════

export async function createStatus(auth: Auth, db: Firestore, uid: string, localUri: string, mediaType: 'image' | 'video') {
  const mediaUrl = await uploadMedia(auth, localUri, { collection: 'status', entityId: `${uid}_${Date.now()}`, slot: mediaType });
  await addDoc(collection(db, 'status'), { uid, mediaUrl, mediaType, createdAt: serverTimestamp() });
}

export async function fetchOwnStatus(db: Firestore, uid: string): Promise<StatusDoc[]> {
  const cutoff = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
  const snap = await getDocs(query(collection(db, 'status'), where('uid', '==', uid), where('createdAt', '>', cutoff), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<StatusDoc, 'id'>) }));
}
