import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/config/firebase';

export function useAuthUser() {
  const [user, setUser] = useState<User | null | undefined>(undefined); // undefined = not yet resolved

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  return { user: user ?? null, initializing: user === undefined };
}
