// ═══════════════════════════════════════════════════════════════════════════
//  lib/AuthContext.tsx — shares {user, profile} across separate route files
//  Cobinar Systems · Marc-Arthur Samuel Dalus
//
//  The single-file version threaded this through props directly. Real
//  screens in separate files can't be prop-drilled the same way — Expo
//  Router mounts each route component itself — so this is the standard,
//  necessary way to share it: _layout.tsx runs the actual
//  onAuthStateChanged + profile-fetch logic once and provides the result;
//  every screen reads it with useBloomAuth() instead of repeating that
//  logic per file.
// ═══════════════════════════════════════════════════════════════════════════

import React, { createContext, useContext } from 'react';
import type { User } from 'firebase/auth';
import type { Profile } from './bloomlili';

type BloomAuthValue = {
  user: User;
  profile: Profile;
  setProfile: (p: Profile) => void;
};

const BloomAuthContext = createContext<BloomAuthValue | null>(null);

export function BloomAuthProvider({ value, children }: { value: BloomAuthValue; children: React.ReactNode }) {
  return <BloomAuthContext.Provider value={value}>{children}</BloomAuthContext.Provider>;
}

// Only ever rendered once _layout.tsx has confirmed a real user + profile
// exist, so throwing here on a missing provider is a real bug to catch
// loudly, not a case to handle gracefully.
export function useBloomAuth(): BloomAuthValue {
  const ctx = useContext(BloomAuthContext);
  if (!ctx) throw new Error('useBloomAuth() called outside BloomAuthProvider — a screen rendered before auth/profile resolved.');
  return ctx;
}
