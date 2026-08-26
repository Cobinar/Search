import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '@/config/firebase';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

/**
 * NOTE: this needs a real OAuth client ID before it will work — Google
 * requires separate client IDs per platform (iOS / Android / Web), created
 * in the Google Cloud Console for this Firebase project (cobinar-mail),
 * with the redirect URI below added to each. Firebase's own web client ID
 * (visible in the Firebase console) is NOT the right one to reuse here.
 */
const GOOGLE_CLIENT_ID = 'REPLACE_WITH_GOOGLE_OAUTH_CLIENT_ID';

export function useGoogleAuth() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'cobinarmail', path: 'auth-callback' });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.Code,
    },
    GOOGLE_DISCOVERY
  );

  const exchangeCode = useCallback(async (code: string, codeVerifier?: string) => {
    setIsSigningIn(true);
    setError(null);
    try {
      const tokenResponse = await AuthSession.exchangeCodeAsync(
        {
          clientId: GOOGLE_CLIENT_ID,
          code,
          redirectUri,
          extraParams: codeVerifier ? { code_verifier: codeVerifier } : undefined,
        },
        GOOGLE_DISCOVERY
      );
      if (!tokenResponse.idToken) throw new Error('Google did not return an ID token.');
      const credential = GoogleAuthProvider.credential(tokenResponse.idToken, tokenResponse.accessToken);
      await signInWithCredential(auth, credential);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setIsSigningIn(false);
    }
  }, [redirectUri]);

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      exchangeCode(response.params.code, request?.codeVerifier);
    } else if (response.type === 'error') {
      setError(response.error?.message ?? 'Google sign-in was cancelled or failed.');
    }
  }, [response, request, exchangeCode]);

  const signIn = useCallback(() => {
    setError(null);
    promptAsync();
  }, [promptAsync]);

  return { signIn, isSigningIn, error, isReady: !!request };
}
