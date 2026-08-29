import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '@/config/firebase';
import { getCobinarUser } from '@/auth/cobinarUserStore';
import type { Mailbox } from '@/data/types';

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

        // Cobinar sign-ins are provisioned server-side by the Worker
        // (handleCobinarToken awaits provisionMailboxFromCobinar before it
        // even responds) — this covers the rare case where this read
        // races ahead of that write settling.
        if (!snap.exists()) {
          await sleep(800);
          snap = await getDoc(ref);
        }

        if (snap.exists()) {
          if (!cancelled) setMailbox(snap.data() as Mailbox);
          return;
        }

        // No doc yet — a Google sign-in (no server-side provisioning step
        // at all) or a Cobinar exchange that genuinely hasn't landed.
        // Create it client-side: sign-in email becomes the mailbox
        // address, same rule as the Cobinar path.
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
        if (!cancelled) {
          setMailbox({
            address: cobinarUser?.address || user.email || '',
            displayName: '',
            picture: '',
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  return { mailbox, loading };
}
