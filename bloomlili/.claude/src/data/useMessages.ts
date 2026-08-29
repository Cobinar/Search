import { useEffect, useState } from 'react';
import {
  collection, query, orderBy, limit, onSnapshot,
  doc, updateDoc, type Timestamp,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '@/config/firebase';
import type { MailMessage } from '@/data/types';

export function useMessages(user: User | null) {
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setMessages([]); setLoading(false); return; }

    const q = query(
      collection(db, 'mail', user.uid, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(200)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const next = snap.docs.map((d) => {
          const data = d.data();
          const createdAt = data.createdAt as Timestamp | undefined;
          return {
            id: d.id,
            ...data,
            createdAt: createdAt ? createdAt.toMillis() : Date.now(),
          } as MailMessage;
        });
        setMessages(next);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Messages listener error:', err);
        setError(
          err.code === 'permission-denied'
            ? 'Permission denied — Firestore rules deploying, retry in 30s.'
            : err.message
        );
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  return { messages, loading, error };
}

/** Direct Firestore mutations — same no-worker-round-trip pattern as the
 *  web app's toggleStar/trashCurrentMsg/moveCurrentMsg: these are the
 *  user's own docs, so Firestore security rules authorize the write
 *  without needing to go through the Worker at all. */
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

/** dest: '' (Inbox, clears category), one of CATEGORY_KEYS, or '__spam__' */
export function moveMessage(uid: string, id: string, dest: string) {
  const updates = dest === '__spam__'
    ? { folder: 'spam' as const, category: '' as const }
    : { folder: 'inbox' as const, category: dest };
  return updateDoc(messageDoc(uid, id), updates);
}
