import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection, query, orderBy, limit, onSnapshot,
  doc, updateDoc, getDoc, setDoc, serverTimestamp, type Timestamp,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, auth } from '@/config/firebase';
import { pinnedFetch } from '@/security';
import { getCobinarUser } from '@/auth';

/* ────────────────────────────────────────────────────────────────
   Types — mirrors worker/src/index.js's writeMailMessage() field-for-field.
   ──────────────────────────────────────────────────────────────── */
export type SystemFolder = 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam';
export type Category =
  | 'purchases' | 'bills' | 'social' | 'updates' | 'forums' | 'promotions' | '';

export interface MailMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  folder: SystemFolder;
  category: Category;
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  snippet: string;
  read: boolean;
  starred: boolean;
  messageId: string;
  status: 'sent' | 'failed' | 'received';
  avatarUrl: string;
  createdAt: number;
  /** True only for mail written by handleSendMail's cobinar-to-cobinar fast
   *  path — see VerifiedBadge in components.tsx for what this does and
   *  doesn't mean. */
  verified?: boolean;
}

export interface Mailbox {
  address: string;
  displayName: string;
  picture: string;
}

export const FOLDER_LABELS: Record<string, string> = {
  inbox: 'Inbox', starred: 'Starred', sent: 'Sent', drafts: 'Drafts', trash: 'Trash',
  all: 'All Mail', spam: 'Spam',
  purchases: 'Purchases', bills: 'Bills', social: 'Social',
  updates: 'Updates', forums: 'Forums', promotions: 'Promotions',
};
export const CATEGORY_KEYS = ['purchases', 'bills', 'social', 'updates', 'forums', 'promotions'] as const;

/* ────────────────────────────────────────────────────────────────
   Icon path data — ported from the web app's inline SVGs.
   ──────────────────────────────────────────────────────────────── */
export const FOLDER_ICON_PATHS: Record<string, { paths: string[]; filled: boolean }> = {
  inbox: { filled: true, paths: ['M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5v-4h3.5l1.5 2h4l1.5-2H19v4zm0-6H5V5h14v8z'] },
  purchases: { filled: false, paths: ['M4 4h2l1.6 9.6a2 2 0 002 1.7h7.6a2 2 0 002-1.6L20 7H6.4'] },
  bills: { filled: false, paths: ['M8 8h8M8 12h8M8 16h5'] },
  social: {
    filled: true,
    paths: [
      'M9 8a3.2 3.2 0 100-6.4A3.2 3.2 0 009 8z',
      'M17 9.5a2.6 2.6 0 100-5.2 2.6 2.6 0 000 5.2z',
      'M3 20v-1.2C3 15.6 5.7 14 9 14s6 1.6 6 4.8V20H3z',
      'M15.2 14.3c2.6.3 4.8 1.8 4.8 4.5V20h-3.5',
    ],
  },
  updates: { filled: false, paths: ['M6 9a6 6 0 1112 0v4l1.5 3h-15L6 13V9z', 'M10 19a2 2 0 004 0'] },
  forums: { filled: true, paths: ['M4 5h13v9H9l-4 3.5V14H4z', 'M10 9h11v9h-3v3l-4-3h-4z'] },
  promotions: { filled: true, paths: ['M11 3H5a2 2 0 00-2 2v6a2 2 0 00.59 1.41l8 8a2 2 0 002.82 0l6-6a2 2 0 000-2.82l-8-8A2 2 0 0011 3z'] },
  starred: { filled: true, paths: ['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'] },
  sent: { filled: true, paths: ['M2.01 21L23 12 2.01 3 2 10l15 2-15 2z'] },
  drafts: { filled: true, paths: ['M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z'] },
  all: { filled: true, paths: ['M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z'] },
  spam: { filled: false, paths: ['M6.5 6.5l11 11'] },
  trash: { filled: true, paths: ['M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM15.5 4l-1-1h-5l-1 1H5v2h14V4z'] },
  back: { filled: true, paths: ['M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z'] },
  reply: { filled: true, paths: ['M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z'] },
  forward: { filled: true, paths: ['M12 8V4l8 8-8 8v-4c-5 0-8.5 1.6-11 5 1-5 4-10 11-11z'] },
  move: { filled: true, paths: ['M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z'] },
};

const AVATAR_COLOR_KEYS = ['', 'bg-blue', 'bg-green', 'bg-purple', 'bg-red'] as const;
export function avatarColorKey(from: string): (typeof AVATAR_COLOR_KEYS)[number] {
  let h = 0;
  for (let i = 0; i < from.length; i++) h = (h * 31 + from.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLOR_KEYS[Math.abs(h) % AVATAR_COLOR_KEYS.length];
}
export function extractName(from: string): string {
  const m = from.match(/^"?([^"<]+)"?\s*</);
  if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  return from.replace(/<[^>]+>/g, '').trim() || from;
}
export function extractEmail(from: string): string {
  const m = from.match(/<([^>]+)>/);
  return m ? m[1] : from;
}

/* ────────────────────────────────────────────────────────────────
   Mailbox — reads or client-side provisions mailboxes/{uid}, mirroring
   loadMailbox() from the web app.
   ──────────────────────────────────────────────────────────────── */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function useMailbox(user: User | null) {
  const [mailbox, setMailbox] = useState<Mailbox | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setMailbox(null); setLoading(false); return; }
    let cancelled = false;

    (async () => {
      setLoading(true);
      const cobinarUser = getCobinarUser();
      try {
        const ref = doc(db, 'mailboxes', user.uid);
        let snap = await getDoc(ref);

        if (!snap.exists()) {
          await sleep(800);
          snap = await getDoc(ref);
        }

        if (snap.exists()) {
          if (!cancelled) setMailbox(snap.data() as Mailbox);
          return;
        }

        const address = cobinarUser?.address || user.email || '';
        const data: Mailbox & { uid: string; googleEmail: string } = {
          uid: user.uid,
          address,
          displayName: cobinarUser?.name || user.displayName || address,
          picture: cobinarUser?.picture || user.photoURL || '',
          googleEmail: user.email || '',
        };
        await setDoc(ref, { ...data, createdAt: serverTimestamp() }, { merge: true });
        if (!cancelled) setMailbox(data);
      } catch (err) {
        console.warn('useMailbox: provisioning error (non-fatal):', err);
        if (!cancelled) setMailbox({ address: cobinarUser?.address || user.email || '', displayName: '', picture: '' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  return { mailbox, loading };
}

/* ────────────────────────────────────────────────────────────────
   Messages — real-time listener + an AsyncStorage cache so the inbox
   shows instantly on return visits instead of refetching from scratch.
   ──────────────────────────────────────────────────────────────── */
const cacheKey = (uid: string) => `messages_cache_v1_${uid}`;

async function readMessageCache(uid: string): Promise<MailMessage[] | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(uid));
    return raw ? (JSON.parse(raw) as MailMessage[]) : null;
  } catch {
    return null;
  }
}

function writeMessageCache(uid: string, messages: MailMessage[]): void {
  AsyncStorage.setItem(cacheKey(uid), JSON.stringify(messages)).catch((err) =>
    console.warn('messages cache write failed (non-fatal):', err)
  );
}

export function useMessages(user: User | null) {
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLiveData = useRef(false);

  useEffect(() => {
    if (!user) { setMessages([]); setLoading(false); return; }
    let cancelled = false;
    hasLiveData.current = false;

    readMessageCache(user.uid).then((cached) => {
      if (cancelled || hasLiveData.current || !cached) return;
      setMessages(cached);
      setLoading(false);
    });

    const q = query(collection(db, 'mail', user.uid, 'messages'), orderBy('createdAt', 'desc'), limit(200));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        hasLiveData.current = true;
        const next = snap.docs.map((d) => {
          const data = d.data();
          const createdAt = data.createdAt as Timestamp | undefined;
          return { id: d.id, ...data, createdAt: createdAt ? createdAt.toMillis() : Date.now() } as MailMessage;
        });
        if (cancelled) return;
        setMessages(next);
        setLoading(false);
        setError(null);
        writeMessageCache(user.uid, next);
      },
      (err) => {
        if (cancelled) return;
        console.error('Messages listener error:', err);
        setError(err.code === 'permission-denied' ? 'Permission denied — Firestore rules deploying, retry in 30s.' : err.message);
        setLoading(false);
      }
    );

    return () => { cancelled = true; unsubscribe(); };
  }, [user]);

  return { messages, loading, error };
}

export function messageDoc(uid: string, id: string) {
  return doc(db, 'mail', uid, 'messages', id);
}
export function toggleStar(uid: string, id: string, currentlyStarred: boolean) {
  return updateDoc(messageDoc(uid, id), { starred: !currentlyStarred });
}
export function markRead(uid: string, id: string) {
  return updateDoc(messageDoc(uid, id), { read: true });
}
export function trashMessage(uid: string, id: string) {
  return updateDoc(messageDoc(uid, id), { folder: 'trash' });
}
export function moveMessage(uid: string, id: string, dest: string) {
  const updates = dest === '__spam__'
    ? { folder: 'spam' as const, category: '' as const }
    : { folder: 'inbox' as const, category: dest };
  return updateDoc(messageDoc(uid, id), updates);
}

/* ────────────────────────────────────────────────────────────────
   Worker API client — send mail + AI compose.
   ──────────────────────────────────────────────────────────────── */
const API = 'https://api.mail.cobinar.com';

export class ApiError extends Error {
  code?: string;
  status: number;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function authedPost<T>(path: string, body: unknown): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new ApiError('Not signed in.', 401);
  const idToken = await user.getIdToken();

  const res = await pinnedFetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new ApiError(data.error?.message || 'Request failed.', res.status, data.error?.code);
  return data as T;
}

export interface SendMailResult { success: true; message_id: string; status: string; from: string; delivery: 'internal' | 'external'; }
export function sendMail(params: { to: string; subject: string; html?: string; text?: string }) {
  return authedPost<SendMailResult>('/internal/send-mail', params);
}

export type AiTone = 'professional' | 'friendly' | 'formal' | 'casual' | 'persuasive';
export interface AiComposeResult { success: true; subject: string; html: string; }
export function aiCompose(params: { topic: string; tone?: AiTone }) {
  return authedPost<AiComposeResult>('/internal/ai-compose', params);
}
