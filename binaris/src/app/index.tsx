/**
 * Binaris — Expo entry point
 *
 * Single-file entry: no navigation library, no tab bar, nothing to opt out
 * of — this IS the whole app. One native screen that hosts a WebView
 * pointed at binaris.cc.
 *
 * Covers, in order below:
 *   1. Anti-impersonation bundle ID check   (expo-application)
 *   2. App Check attestation                (Firebase App Check → Play Integrity / App Attest)
 *   3. Edge-to-edge immersive system UI     (expo-status-bar, expo-navigation-bar)
 *   4. The WebView itself, incl. Google OAuth handoff + Android back button
 *
 * Every native call that touches a platform API is wrapped — the goal is
 * that a missing/misbehaving native module degrades a feature, never
 * crashes the boot sequence.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator, Text, BackHandler } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import * as Application from 'expo-application';
import * as WebBrowser from 'expo-web-browser';
import { WebView } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { registerRootComponent } from 'expo';

/* ════════════════════════════════════════════════════════════════
   CONFIG — placeholders below are guesses from your web project's
   own branding (Cobinar). Confirm/replace before shipping.
   ════════════════════════════════════════════════════════════════ */

// Must match android.package AND ios.bundleIdentifier in app.json exactly.
const EXPECTED_APP_ID = 'com.cobinar.binaris'; // TODO: confirm this is correct

const WEBVIEW_URL = 'https://binaris.cc/';
const ALLOWED_ORIGINS = ['https://binaris.cc', 'https://*.binaris.cc'];

/* ════════════════════════════════════════════════════════════════
   1. ANTI-IMPERSONATION — bundle ID check
   ────────────────────────────────────────────────────────────────
   Read this as a cheap first-line sanity check and a guard against
   accidental misconfiguration — NOT real anti-cloning security.
   Anyone repackaging your APK can delete this check along with
   everything else in the JS bundle; a client-side comparison can't
   stop someone who already controls the client. The actual
   cryptographic guarantee against cloned/modified apps comes from
   step 2 below, verified somewhere the attacker doesn't control:
   your server.
   ════════════════════════════════════════════════════════════════ */
function verifyAppIdentity(): { ok: boolean; actual: string | null } {
  try {
    const actual: string | null = Application.applicationId;
    return { ok: actual === EXPECTED_APP_ID, actual };
  } catch (err) {
    // Can't even read the app ID — fail closed rather than assume it's fine.
    console.warn('[AppIdentity] applicationId read failed:', err);
    return { ok: false, actual: null };
  }
}

/* ════════════════════════════════════════════════════════════════
   2. APP CHECK — real cryptographic attestation
   ────────────────────────────────────────────────────────────────
   Wired to Firebase App Check, which uses Play Integrity on Android
   and App Attest (falling back to DeviceCheck) on iOS under the
   hood — the same platform attestation Expo's own @expo/app-integrity
   wraps directly. App Check is the pragmatic pick here specifically
   because Binaris already uses Firebase for auth: same console, same
   SDK family, and a documented path to verify the resulting token
   from a non-Firebase backend — see functions/api/_middleware.js,
   which is exactly the "cryptographically verify... at the edge"
   piece this whole thing is for.

   Cloudflare Turnstile was the other option on the table, and it's
   worth being direct about why it's not used for this specific job:
   Turnstile proves "a browser-like JS engine solved this challenge,"
   not "this exact signed APK, unmodified, made this request." A
   cloned app that still embeds *some* WebView would sail through a
   Turnstile challenge — Turnstile has no concept of your app's
   identity at all. It's a solid tool for bot-proofing a public web
   form; it isn't built for "is this my real app" the way Play
   Integrity / App Attest are.

   The dynamic import() below is deliberate, not stylistic:
   @react-native-firebase/app-check ships native code that doesn't
   exist in Expo Go, and won't exist in a dev client built before
   this package was added. A static top-level `import` would throw
   during module resolution — before this function, or its try/catch,
   ever runs. That's exactly the cold-boot crash this file exists to
   avoid, so the import has to be deferred inside the try, not hoisted
   to the top of the file.
   ════════════════════════════════════════════════════════════════ */
async function setupAppCheck(onToken: (token: string) => void): Promise<() => void> {
  if (Platform.OS === 'web') return () => {};

  try {
    const appModule: any = await import('@react-native-firebase/app');
    await import('@react-native-firebase/app-check');
    const firebase = appModule.default ?? appModule;

    const appCheck = firebase.appCheck();
    const provider = appCheck.newReactNativeFirebaseAppCheckProvider();

    provider.configure({
      android: {
        provider: __DEV__ ? 'debug' : 'playIntegrity',
        debugToken: process.env.EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN,
      },
      apple: {
        provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback',
        debugToken: process.env.EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN,
      },
    });

    await appCheck.initializeAppCheck({ provider, isTokenAutoRefreshEnabled: true });

    const pushCurrentToken = async () => {
      try {
        const { token } = await appCheck.getToken();
        onToken(token);
      } catch (err) {
        console.warn('[AppCheck] token fetch failed:', err);
      }
    };

    await pushCurrentToken();

    // isTokenAutoRefreshEnabled keeps a valid token ready under the hood;
    // this just re-reads and re-pushes it periodically. Tokens are
    // typically ~1hr lived, so 45min stays comfortably ahead of expiry
    // without hammering getToken().
    const interval = setInterval(pushCurrentToken, 45 * 60 * 1000);
    return () => clearInterval(interval);
  } catch (err) {
    // Missing native module, app not yet registered in the Firebase
    // console, no network on first launch, whatever — the app must
    // still boot, just without attestation on this session.
    console.warn('[AppCheck] setup failed — continuing without attestation:', err);
    return () => {};
  }
}

/* ════════════════════════════════════════════════════════════════
   3. EDGE-TO-EDGE / IMMERSIVE SYSTEM UI
   ────────────────────────────────────────────────────────────────
   Android 15+ already forces edge-to-edge for apps targeting SDK 35+
   (see app.json's expo-build-properties config), so most of this is
   explicit-for-clarity and cross-version-safety rather than load-
   bearing on the newest OS versions.
   ════════════════════════════════════════════════════════════════ */
async function setupImmersiveSystemBars(): Promise<void> {
  if (Platform.OS !== 'android') return; // expo-navigation-bar is Android-only

  try {
    await NavigationBar.setPositionAsync('absolute'); // bar overlays content instead of pushing it up
    await NavigationBar.setBackgroundColorAsync('#00000000'); // fully transparent
    await NavigationBar.setButtonStyleAsync('dark'); // dark icons — matches Binaris's light theme (#ECEAE7)
  } catch (err) {
    // On Android 15+ with edgeToEdgeEnabled, the OS may already own this
    // behavior and some of these calls can no-op or throw depending on
    // device/OEM skin — either way, non-fatal.
    console.warn('[NavigationBar] setup failed (likely already OS-managed):', err);
  }
}

/* ════════════════════════════════════════════════════════════════
   4. WEBVIEW SCREEN
   ════════════════════════════════════════════════════════════════ */
function BinarisWebView({ appCheckToken }: { appCheckToken: string | null }) {
  const webviewRef = useRef<any>(null);
  const [canGoBack, setCanGoBack] = useState(false);

  // Android hardware back button should navigate the chat history back,
  // not exit the app — otherwise this doesn't feel like a real app.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      try {
        if (canGoBack && webviewRef.current) {
          webviewRef.current.goBack();
          return true;
        }
      } catch (err) {
        console.warn('[WebView] back navigation failed:', err);
      }
      return false; // let the default (exit/minimize) behavior happen
    });
    return () => sub.remove();
  }, [canGoBack]);

  // Push the App Check token into the page whenever it changes. Reading
  // window.__BINARIS_APP_CHECK_TOKEN__ at fetch-time (see index.html) means
  // this doesn't need to be perfectly synchronized — just eventually set.
  useEffect(() => {
    if (!appCheckToken || !webviewRef.current) return;
    try {
      webviewRef.current.injectJavaScript(
        `window.__BINARIS_APP_CHECK_TOKEN__ = ${JSON.stringify(appCheckToken)}; true;`
      );
    } catch (err) {
      console.warn('[WebView] token injection failed:', err);
    }
  }, [appCheckToken]);

  // Google blocks OAuth consent screens rendered inside an embedded
  // WebView (the "disallowed_useragent" rejection) — this is a Google
  // policy, not a bug, and it won't go away. Hand those URLs to the
  // system browser instead, which Google does allow.
  //
  // NOTE — this stops the hard failure, but doesn't complete the loop
  // on its own: getting back into an *authenticated* WebView session
  // after the system-browser hop depends on exactly how Cobinar/
  // Firebase's redirect flow is wired (firebase-init.js). Worth
  // finishing together rather than guessing — flagging it rather than
  // shipping something that looks done but silently drops the session.
  const handleShouldStartLoad = useCallback((request: ShouldStartLoadRequest): boolean => {
    try {
      const { url } = request;
      if (/accounts\.google\.com/.test(url)) {
        WebBrowser.openAuthSessionAsync(url, WEBVIEW_URL).catch((err: unknown) => {
          console.warn('[OAuth] system browser handoff failed:', err);
        });
        return false; // don't let the embedded WebView itself navigate there
      }
      return true;
    } catch (err) {
      console.warn('[WebView] navigation guard failed — allowing load:', err);
      return true; // fail open on the guard itself; don't block normal navigation over it
    }
  }, []);

  return (
    <WebView
      ref={webviewRef}
      source={{ uri: WEBVIEW_URL }}
      style={styles.webview}
      originWhitelist={ALLOWED_ORIGINS}
      onShouldStartLoadWithRequest={handleShouldStartLoad}
      onNavigationStateChange={(nav: any) => setCanGoBack(!!nav.canGoBack)}
      injectedJavaScriptBeforeContentLoaded={
        appCheckToken
          ? `window.__BINARIS_APP_CHECK_TOKEN__ = ${JSON.stringify(appCheckToken)}; true;`
          : undefined
      }
      // The web app already handles safe areas itself (viewport-fit=cover
      // + env(safe-area-inset-*) in its CSS) — don't double-inset by
      // wrapping this in a SafeAreaView too, or content gets padded twice.
      contentInsetAdjustmentBehavior="never"
      decelerationRate="normal"
      allowsBackForwardNavigationGestures={Platform.OS === 'ios'}
      startInLoadingState
      renderLoading={() => (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" />
        </View>
      )}
    />
  );
}

/* ════════════════════════════════════════════════════════════════
   ROOT APP
   ════════════════════════════════════════════════════════════════ */
type BootState = 'checking' | 'blocked' | 'ready';

function AppInner() {
  const [bootState, setBootState] = useState<BootState>('checking');
  const [appCheckToken, setAppCheckToken] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let cancelled = false;
    let stopAppCheck: (() => void) | undefined;

    (async () => {
      // Run defensively — none of this should be able to take the app down.
      try {
        const identity = verifyAppIdentity();
        if (!identity.ok) {
          if (!cancelled) setBootState('blocked');
          return; // don't set up App Check or render the WebView for a
                   // build that already failed the identity check
        }
      } catch (err) {
        console.warn('[Boot] identity check threw unexpectedly:', err);
        if (!cancelled) setBootState('blocked');
        return;
      }

      try {
        await setupImmersiveSystemBars();
      } catch (err) {
        console.warn('[Boot] system bar setup threw unexpectedly:', err);
        // non-fatal — proceed regardless
      }

      try {
        stopAppCheck = await setupAppCheck((token) => {
          if (!cancelled) setAppCheckToken(token);
        });
      } catch (err) {
        console.warn('[Boot] App Check setup threw unexpectedly:', err);
        // non-fatal — proceed without attestation this session
      }

      if (!cancelled) setBootState('ready');
    })();

    return () => {
      cancelled = true;
      stopAppCheck?.();
    };
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" translucent />

      {bootState === 'checking' && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" />
        </View>
      )}

      {bootState === 'blocked' && (
        <View style={[styles.loadingOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <Text style={styles.blockedTitle}>Can't verify this app</Text>
          <Text style={styles.blockedBody}>
            Please reinstall Binaris from the official App Store or Google Play listing.
          </Text>
        </View>
      )}

      {bootState === 'ready' && <BinarisWebView appCheckToken={appCheckToken} />}
    </View>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <AppInner />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ECEAE7' },
  webview: { flex: 1, backgroundColor: '#ECEAE7' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECEAE7',
    paddingHorizontal: 32,
    gap: 8,
  },
  blockedTitle: { fontSize: 17, fontWeight: '600', color: '#1a1500', textAlign: 'center' },
  blockedBody: { fontSize: 14, color: '#57534e', textAlign: 'center', lineHeight: 20 },
});

registerRootComponent(App);