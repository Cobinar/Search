// ═══════════════════════════════════════════════════════════════════════════
//  app/index.tsx — Bloomlili · Root screen (Expo Router)
//  Cobinar Systems · Marc-Arthur Samuel Dalus
//
//  ASSUMPTION — worth confirming: this is written as the Expo Router HOME
//  ROUTE (app/index.tsx), not the bare RN entry point, because "without
//  Expo's default tab bars" only makes sense if you're on the Router
//  template. This file renders directly (no (tabs) group involved), so
//  there's simply no tab bar to remove. If your app/_layout.tsx still wraps
//  routes in <Tabs>, swap it for a plain <Stack screenOptions={{ headerShown:
//  false }}> or <Slot /> — this screen manages its own status/nav bars either
//  way, so it doesn't depend on the parent layout for that.
//
//  If your project is NOT using Expo Router (package.json "main" points at
//  a plain index.tsx / index.js that calls registerRootComponent), the only
//  change needed is: rename the default export's usage to
//  `registerRootComponent(BloomliliRoot)` at the bottom instead of a
//  default export — everything else here is identical either way.
//
//  LAYOUT MODE: set RENDER_MODE below. 'webview' points at your existing
//  bloomlili.com and gets you a working app today. 'native' is a stub for
//  wherever your native-parity RN screens live — wire your real navigator
//  in there when ready. Both share the same edge-to-edge chrome and
//  identity gate, so switching later doesn't touch either of those.
// ═══════════════════════════════════════════════════════════════════════════

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, Pressable, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import * as Application from 'expo-application';
import { WebView, type WebViewErrorEvent, type WebViewHttpErrorEvent } from 'react-native-webview';

// ── Config ───────────────────────────────────────────────────────────────

const RENDER_MODE: 'webview' | 'native' = 'webview';
const WEB_APP_URL = 'https://bloomlili.com';

// Must match android.package / ios.bundleIdentifier in app.json.
const EXPECTED_APP_ID = 'com.cobinar.bloomlili';

const COLORS = {
  bg: '#1C2035',
  surface: '#171B30',
  lime: '#C8FF00',
  text: '#E8ECF8',
  textDim: '#606888',
  error: '#FF5C41',
};

// ── Anti-impersonation check ────────────────────────────────────────────
//
// Application.applicationId is a synchronous property, not a promise — but
// it's still a native-module read, and native-module reads can throw on a
// cold boot if the module didn't link correctly in a given build (a real,
// if uncommon, crash class). Wrapping it is cheap insurance, which is the
// whole point of doing it even though it "shouldn't" throw.
//
// Be clear-eyed about what this buys you: it's a client-side check, so it
// stops accidental/lazy repackaging (someone forks the repo, changes
// nothing, rebuilds under your applicationId isn't even possible once you
// own that ID on the stores — see the app.json note) more than it stops a
// determined attacker, who can patch a compiled binary around any client
// check. The thing that actually protects your backend from a modified
// client is server-side attestation — see the App Check / AppIntegrity
// outline that shipped alongside this file.
function useAppIdentityCheck(expectedId: string) {
  const [state, setState] = useState<{
    checked: boolean;
    ok: boolean;
    actualId: string | null;
    error: string | null;
  }>({ checked: false, ok: false, actualId: null, error: null });

  useEffect(() => {
    try {
      const actualId = Application.applicationId;
      setState({
        checked: true,
        ok: actualId === expectedId,
        actualId,
        error: null,
      });
    } catch (err) {
      // Fail CLOSED on Android/iOS (native module misbehaving is itself
      // suspicious), but never crash the app over this — a broken identity
      // check should degrade to a warning screen, not a white screen of death.
      setState({
        checked: true,
        ok: false,
        actualId: null,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, [expectedId]);

  return state;
}

// ── Root screen ─────────────────────────────────────────────────────────

export default function BloomliliRoot() {
  const identity = useAppIdentityCheck(EXPECTED_APP_ID);

  // Edge-to-edge / immersive chrome. These are synchronous native calls too
  // (see NavigationBar/StatusBar docs — .setHidden/.setStyle return void,
  // not a Promise) but native-module calls can still throw on a cold boot
  // if the module isn't linked, so this stays defensive on purpose.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    try {
      NavigationBar.setStyle('light');
      NavigationBar.setHidden(false); // set true instead for full immersive/game-style
    } catch (err) {
      console.warn('[Bloomlili] NavigationBar setup failed (non-fatal):', err);
    }
  }, []);

  if (!identity.checked) {
    return <BootingScreen />;
  }

  if (!identity.ok) {
    return <UnauthorizedBuildScreen actualId={identity.actualId} error={identity.error} />;
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {RENDER_MODE === 'webview' ? <BloomliliWebView /> : <NativeParityStub />}
    </View>
  );
}

// ── Boot / gate screens ─────────────────────────────────────────────────

function BootingScreen() {
  return (
    <View style={[styles.root, styles.center]}>
      <StatusBar style="light" />
      <ActivityIndicator color={COLORS.lime} size="large" />
    </View>
  );
}

function UnauthorizedBuildScreen({
  actualId,
  error,
}: {
  actualId: string | null;
  error: string | null;
}) {
  return (
    <View style={[styles.root, styles.center, { padding: 32 }]}>
      <StatusBar style="light" />
      <Text style={styles.warnTitle}>Unrecognized build</Text>
      <Text style={styles.warnBody}>
        {error
          ? `Could not verify this build (${error}). Continuing anyway would skip the identity check, so this stops here instead.`
          : `This package (${actualId ?? 'unknown'}) does not match the registered Bloomlili app ID (${EXPECTED_APP_ID}). If this is your own dev build, update EXPECTED_APP_ID in index.tsx.`}
      </Text>
    </View>
  );
}

// ── WebView mode ─────────────────────────────────────────────────────────
//
// Cross-subdomain SSO note: cobinar-auth.js's flow (IndexedDB + ?_cob_code=
// redirects) runs inside this WebView's own storage context, same as any
// browser tab — but it needs domStorageEnabled + persistent cookies to
// survive app restarts, both set explicitly below rather than left to
// platform defaults. Google Sign-In is the one thing that will NOT work
// through this WebView even with those on: Google blocks OAuth flows it
// detects running inside an embedded WebView user agent. That one needs a
// native flow (expo-auth-session or @react-native-google-signin/google-signin)
// outside this component, not a WebView workaround.
function BloomliliWebView() {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const handleError = useCallback((e: WebViewErrorEvent) => {
    const desc = e.nativeEvent?.description || 'Failed to load Bloomlili.';
    console.warn('[Bloomlili] WebView error (non-fatal):', desc);
    setLoadError(desc);
  }, []);

  const handleHttpError = useCallback((e: WebViewHttpErrorEvent) => {
    const status = e.nativeEvent?.statusCode;
    console.warn('[Bloomlili] WebView HTTP error (non-fatal):', status);
    if (status && status >= 500) {
      setLoadError(`Server error (${status}). Please try again.`);
    }
  }, []);

  const retry = useCallback(() => {
    setLoadError(null);
    setReloadKey((k) => k + 1);
  }, []);

  const source = useMemo(() => ({ uri: WEB_APP_URL }), []);

  if (loadError) {
    return (
      <View style={[styles.root, styles.center, { padding: 32 }]}>
        <Text style={styles.warnTitle}>Could not load Bloomlili</Text>
        <Text style={styles.warnBody}>{loadError}</Text>
        <Pressable style={styles.retryBtn} onPress={retry}>
          <Text style={styles.retryBtnText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <WebView
      key={reloadKey}
      source={source}
      style={styles.flex}
      containerStyle={styles.flex}
      // Edge-to-edge means content can sit under the status/nav bar area —
      // let index.html's own safe-area CSS handle insets rather than
      // fighting it with WebView-level padding.
      startInLoadingState
      renderLoading={() => (
        <View style={[styles.root, styles.center, StyleSheet.absoluteFill]}>
          <ActivityIndicator color={COLORS.lime} size="large" />
        </View>
      )}
      onError={handleError}
      onHttpError={handleHttpError}
      domStorageEnabled
      sharedCookiesEnabled
      thirdPartyCookiesEnabled
      javaScriptEnabled
      allowsBackForwardNavigationGestures
      // Keep navigation inside your own domains. Widen this if
      // cobinar-auth-portal or other auth hops live on a different
      // registrable domain than bloomlili.com.
      originWhitelist={['https://*.bloomlili.com/*', 'https://*.cobinar.com/*']}
    />
  );
}

// ── Native-parity mode (stub) ───────────────────────────────────────────
function NativeParityStub() {
  return (
    <View style={[styles.root, styles.center]}>
      <StatusBar style="light" />
      <Text style={styles.warnTitle}>Native UI goes here</Text>
      <Text style={styles.warnBody}>
        Swap this for your real navigator/screens. This stub exists so
        RENDER_MODE = 'native' renders something instead of a blank screen
        while you build that out.
      </Text>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  flex: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  warnTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  warnBody: {
    color: COLORS.textDim,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: COLORS.lime,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  retryBtnText: {
    color: '#111',
    fontWeight: '800',
    fontSize: 14,
  },
});