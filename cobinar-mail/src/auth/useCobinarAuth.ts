import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { pinnedFetch } from '@/security/pinnedFetch';
import { setCobinarUser } from '@/auth/cobinarUserStore';

WebBrowser.maybeCompleteAuthSession();

// Same client ID webmail/index.html uses — it's a public identifier for
// an OAuth *public* client, not a secret (the actual secret,
// COBINAR_CLIENT_SECRET, only ever lives on the Worker).
const COBINAR_CLIENT_ID = 'cob_fd5d69fbb8d5146726332303166c0631';
const COBINAR_DISCOVERY = {
  authorizationEndpoint: 'https://auth.cobinar.com/oauth/authorize',
};
const API = 'https://api.mail.cobinar.com';

/**
 * Web's version of this flow opens a popup and posts the result back via
 * window.postMessage — there's no equivalent of either concept in a native
 * app. The native-appropriate replacement is expo-auth-session: it opens
 * an in-app browser tab (ASWebAuthenticationSession on iOS, Custom Tabs on
 * Android), and because we ask for the Authorization Code response type,
 * useAuthRequest automatically generates and tracks a PKCE code_verifier/
 * code_challenge pair — nothing to hand-roll.
 *
 * PKCE matters *more* here than it did on web: a custom URL scheme like
 * cobinarmail:// isn't exclusively ours the way an https:// origin is —
 * on Android in particular, another app could in principle register the
 * same scheme and race to intercept the redirect. PKCE means an
 * intercepted `code` is useless without the code_verifier, which never
 * leaves this process except over HTTPS to our own Worker.
 *
 * That said: this only fully closes the loop if auth.cobinar.com's own
 * token endpoint actually validates code_verifier against the
 * code_challenge it was sent. The Worker forwards it either way (see
 * handleCobinarToken), but whether it's *enforced* is a property of an
 * OAuth server this codebase doesn't control — worth confirming with
 * whoever operates it.
 */
export function useCobinarAuth() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const redirectUri = useRef(
    AuthSession.makeRedirectUri({ scheme: 'cobinarmail', path: 'auth-callback' })
  ).current;

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: COBINAR_CLIENT_ID,
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.Code,
    },
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
      if (!data.success) {
        throw new Error(data.error?.message || 'Sign-in failed. Please try again.');
      }
      setCobinarUser(data.user ?? null);
      await signInWithCustomToken(auth, data.firebaseToken);
      // onAuthStateChanged (registered elsewhere) picks it up from here —
      // this hook's job ends at a successful Firebase session.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  }, [redirectUri]);

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      exchangeCode(response.params.code, request?.codeVerifier);
    } else if (response.type === 'error') {
      setError(response.error?.message ?? 'Sign-in was cancelled or failed.');
    }
    // 'dismiss' / 'cancel' / 'locked': the user backed out — nothing to surface as an error.
  }, [response, request, exchangeCode]);

  const signIn = useCallback(() => {
    setError(null);
    promptAsync();
  }, [promptAsync]);

  return { signIn, isSigningIn, error, isReady: !!request };
}
