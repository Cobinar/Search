// ═══════════════════════════════════════════════════════════════════════════
//  app/_layout.tsx — Root layout
//  Cobinar Systems · Marc-Arthur Samuel Dalus
//
//  Owns three things now, in order: the app-identity check (unchanged from
//  before), the auth/profile state machine (moved here from the old
//  single-file index.tsx, since it now needs to gate every route — tabs,
//  settings, spark, chat — not just one file), and providing that resolved
//  {user, profile} via BloomAuthProvider so every screen file can read it
//  with useBloomAuth() instead of the prop-drilling the single-file version
//  used.
// ═══════════════════════════════════════════════════════════════════════════

import 'react-native-reanimated';
import React, { useEffect, useState } from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import * as Application from 'expo-application';
import * as SplashScreen from 'expo-splash-screen';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { fbAuth, fbDb, fbInitError, L, type Profile } from '../lib/bloomlili';
import { BloomAuthProvider } from '../lib/AuthContext';
import AuthFlow from './_screens/AuthFlow';
import OnboardingFlow from './_screens/OnboardingFlow';

SplashScreen.preventAutoHideAsync().catch(() => {});

const EXPECTED_APP_ID = 'com.cobinar.bloomlili';

function useAppIdentityCheck(expectedId: string) {
  const [state, setState] = useState<{ checked: boolean; ok: boolean; actualId: string | null; error: string | null }>(
    { checked: false, ok: false, actualId: null, error: null },
  );
  useEffect(() => {
    try {
      const actualId = Application.applicationId;
      setState({ checked: true, ok: actualId === expectedId, actualId, error: null });
    } catch (err) {
      setState({ checked: true, ok: false, actualId: null, error: err instanceof Error ? err.message : String(err) });
    }
  }, [expectedId]);
  return state;
}

export default function RootLayout() {
  const identity = useAppIdentityCheck(EXPECTED_APP_ID);
  const [authUser, setAuthUser] = useState<User | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [fatalError, setFatalError] = useState<string | null>(fbInitError);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    try {
      NavigationBar.setStyle('dark'); // dark icons — the app is light-themed now
      NavigationBar.setHidden(false);
    } catch (err) {
      console.warn('[Bloomlili] NavigationBar setup failed (non-fatal):', err);
    }
  }, []);

  useEffect(() => {
    if (!fbAuth) return;
    const unsub = onAuthStateChanged(fbAuth, async (user) => {
      setAuthUser(user);
      if (!user) { setProfile(null); return; }
      if (!fbDb) { setFatalError('Firestore did not initialize.'); return; }
      try {
        const snap = await getDoc(doc(fbDb, 'users', user.uid));
        setProfile(snap.exists() ? (snap.data() as Profile) : null);
      } catch (err) {
        setFatalError(
          (err as { code?: string })?.code === 'permission-denied'
            ? 'Firestore rules block access — deploy the updated firestore.rules first.'
            : err instanceof Error ? err.message : 'Could not load your profile.',
        );
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (identity.checked && authUser !== undefined && profile !== undefined) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [identity.checked, authUser, profile]);

  if (!identity.checked || authUser === undefined || (authUser && profile === undefined)) {
    return null; // native splash still showing
  }

  if (!identity.ok) {
    return <UnauthorizedBuildScreen actualId={identity.actualId} error={identity.error} />;
  }
  if (fatalError) {
    return <FatalErrorScreen message={fatalError} />;
  }
  if (!fbAuth || !fbDb) {
    return <FatalErrorScreen message="Firebase did not initialize." />;
  }
  if (!authUser) {
    return (
      <>
        <StatusBar style="dark" />
        <AuthFlow auth={fbAuth} />
      </>
    );
  }
  if (!profile) {
    return (
      <>
        <StatusBar style="dark" />
        <OnboardingFlow db={fbDb} user={authUser} prefilledName={authUser.displayName || ''} onDone={setProfile} onError={setFatalError} />
      </>
    );
  }

  return (
    <BloomAuthProvider value={{ user: authUser, profile, setProfile }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: L.bg } }} />
    </BloomAuthProvider>
  );
}

function UnauthorizedBuildScreen({ actualId, error }: { actualId: string | null; error: string | null }) {
  return (
    <View style={[styles.root, styles.center]}>
      <StatusBar style="dark" />
      <Text style={styles.title}>Unrecognized build</Text>
      <Text style={styles.body}>
        {error
          ? `Could not verify this build (${error}). Continuing anyway would skip the identity check, so this stops here instead.`
          : `This package (${actualId ?? 'unknown'}) does not match the registered Bloomlili app ID (${EXPECTED_APP_ID}). If this is your own dev build, update EXPECTED_APP_ID in _layout.tsx.`}
      </Text>
    </View>
  );
}
function FatalErrorScreen({ message }: { message: string }) {
  return (
    <View style={[styles.root, styles.center]}>
      <StatusBar style="dark" />
      <Text style={styles.title}>Configuration problem</Text>
      <Text style={styles.body}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: L.bg },
  center: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { color: L.ink, fontSize: 18, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  body: { color: L.sub, fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
