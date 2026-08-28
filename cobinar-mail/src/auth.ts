import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import {
  onAuthStateChanged, signInWithCustomToken, signInWithCredential,
  GoogleAuthProvider, type User,
} from 'firebase/auth';
import { auth } from '@/config/firebase';
import { pinnedFetch } from '@/security';
import { colors } from '@/theme';

WebBrowser.maybeCompleteAuthSession();

/* ────────────────────────────────────────────────────────────────
   Cobinar user profile — set once at sign-in, read by useMailbox's
   client-side provisioning fallback. Mirrors webmail/index.html's plain
   top-level `let cobinarUser` variable; one object, written once per
   session and read once, doesn't need a state library.
   ──────────────────────────────────────────────────────────────── */
export interface CobinarUserProfile { name?: string; picture?: string; address?: string; email?: string; }
let _cobinarUser: CobinarUserProfile | null = null;
export function setCobinarUser(user: CobinarUserProfile | null): void { _cobinarUser = user; }
export function getCobinarUser(): CobinarUserProfile | null { return _cobinarUser; }

/* ────────────────────────────────────────────────────────────────
   Auth state
   ──────────────────────────────────────────────────────────────── */
export function useAuthUser() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  return { user: user ?? null, initializing: user === undefined };
}

/* ────────────────────────────────────────────────────────────────
   Shared in-app-browser presentation options
   ──────────────────────────────────────────────────────────────── */
/**
 * expo-auth-session opens the OAuth page in an in-app modal browser
 * (ASWebAuthenticationSession on iOS, Custom Tabs on Android) — never a
 * full external browser switch, so the user never really "leaves the
 * app" in the way a plain Linking.openURL would. What's NOT fully
 * matchable: iOS's ASWebAuthenticationSession intentionally exposes no
 * color/branding API at all — Apple keeps that chrome plain specifically
 * so a user can trust it isn't being spoofed by the app it's launched
 * from. Android's Custom Tabs *does* support this, so toolbarColor below
 * takes effect there.
 */
const BROWSER_PRESENTATION: WebBrowser.AuthSessionOpenOptions = {
  toolbarColor: colors.orange,
  controlsColor: colors.white,
  showTitle: true,
};

/* ────────────────────────────────────────────────────────────────
   Cobinar OAuth (PKCE via expo-auth-session)
   ──────────────────────────────────────────────────────────────── */
const COBINAR_CLIENT_ID = 'cob_fd5d69fbb8d5146726332303166c0631';
const COBINAR_DISCOVERY = { authorizationEndpoint: 'https://auth.cobinar.com/oauth/authorize' };
const API = 'https://api.mail.cobinar.com';

export function useCobinarAuth() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const redirectUri = useRef(AuthSession.makeRedirectUri({ scheme: 'cobinarmail', path: 'auth-callback' })).current;

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    { clientId: COBINAR_CLIENT_ID, redirectUri, scopes: ['openid', 'profile', 'email'], responseType: AuthSession.ResponseType.Code },
    COBINAR_DISCOVERY
  );

  const exchangeCode = useCallback(async (code: string, codeVerifier?: string) => {
    setIsSigningIn(true);
    setError(null);
    try {
      const res = await pinnedFetch(`${API}/internal/cobinar-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirect_uri: redirectUri, code_verifier: codeVerifier }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Sign-in failed. Please try again.');
      setCobinarUser(data.user ?? null);
      await signInWithCustomToken(auth, data.firebaseToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
      setIsSigningIn(false);
    }
    // Deliberately not setting isSigningIn(false) on success — the caller
    // screen navigates away as soon as the auth user updates, so there's
    // no moment where the loading screen would flash back to "idle".
  }, [redirectUri]);

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      exchangeCode(response.params.code, request?.codeVerifier);
    } else if (response.type === 'error') {
      setError(response.error?.message ?? 'Sign-in was cancelled or failed.');
      setIsSigningIn(false);
    } else {
      // 'dismiss' / 'cancel' / 'locked' — user backed out of the browser sheet.
      setIsSigningIn(false);
    }
  }, [response, request, exchangeCode]);

  const signIn = useCallback(() => {
    setError(null);
    setIsSigningIn(true);
    promptAsync(BROWSER_PRESENTATION);
  }, [promptAsync]);

  return { signIn, isSigningIn, error, isReady: !!request };
}

/* ────────────────────────────────────────────────────────────────
   Google OAuth ("while testing" path)
   ──────────────────────────────────────────────────────────────── */
const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};
/** Needs a real value — see README.md setup table. */
const GOOGLE_CLIENT_ID = 'REPLACE_WITH_GOOGLE_OAUTH_CLIENT_ID';

export function useGoogleAuth() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const redirectUri = useRef(AuthSession.makeRedirectUri({ scheme: 'cobinarmail', path: 'auth-callback' })).current;

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    { clientId: GOOGLE_CLIENT_ID, redirectUri, scopes: ['openid', 'profile', 'email'], responseType: AuthSession.ResponseType.Code },
    GOOGLE_DISCOVERY
  );

  const exchangeCode = useCallback(async (code: string, codeVerifier?: string) => {
    setIsSigningIn(true);
    setError(null);
    try {
      const tokenResponse = await AuthSession.exchangeCodeAsync(
        { clientId: GOOGLE_CLIENT_ID, code, redirectUri, extraParams: codeVerifier ? { code_verifier: codeVerifier } : undefined },
        GOOGLE_DISCOVERY
      );
      if (!tokenResponse.idToken) throw new Error('Google did not return an ID token.');
      const credential = GoogleAuthProvider.credential(tokenResponse.idToken, tokenResponse.accessToken);
      await signInWithCredential(auth, credential);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
      setIsSigningIn(false);
    }
  }, [redirectUri]);

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      exchangeCode(response.params.code, request?.codeVerifier);
    } else if (response.type === 'error') {
      setError(response.error?.message ?? 'Google sign-in was cancelled or failed.');
      setIsSigningIn(false);
    } else {
      setIsSigningIn(false);
    }
  }, [response, request, exchangeCode]);

  const signIn = useCallback(() => {
    setError(null);
    setIsSigningIn(true);
    promptAsync(BROWSER_PRESENTATION);
  }, [promptAsync]);

  return { signIn, isSigningIn, error, isReady: !!request };
}
