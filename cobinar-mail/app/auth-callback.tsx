import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing } from 'react-native-reanimated';
import { NeoButton, Icon } from '@/components';
import { useAuthUser, useCobinarAuth, useGoogleAuth } from '@/auth';
import { colors } from '@/theme';

/**
 * This screen exists specifically so the sign-in flow has ONE stable
 * place to live for its whole duration. Before this existed, the
 * useAuthRequest hook (and its isSigningIn/error state) lived on the
 * sign-in screen itself — meaning if anything triggered navigation before
 * the token exchange finished, that state (and the in-flight hook
 * instance) would be torn down mid-flight. Requesting here, exchanging
 * here, only leaving once it's actually done, is what removes the flash/
 * hiccup rather than just papering over it with a spinner.
 */
export default function AuthCallback() {
  const router = useRouter();
  const { provider } = useLocalSearchParams<{ provider: string }>();
  const { user } = useAuthUser();
  const cobinar = useCobinarAuth();
  const google = useGoogleAuth();
  const started = useRef(false);

  const active = provider === 'google' ? google : cobinar;

  useEffect(() => {
    if (started.current) return;
    if (provider === 'google' && !google.isReady) return;
    if (provider === 'cobinar' && !cobinar.isReady) return;
    started.current = true;
    active.signIn();
    // isReady flips true asynchronously once expo-auth-session finishes
    // preparing the request (generating the PKCE pair, etc.) — waiting
    // for it avoids calling signIn() before it's actually ready to prompt.
  }, [provider, cobinar.isReady, google.isReady]);

  useEffect(() => {
    if (user) router.replace('/inbox/inbox');
  }, [user]);

  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );
  }, []);
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -pulse.value * 3 }, { translateY: -pulse.value * 3 }],
  }));
  const shadowStyle = useAnimatedStyle(() => ({
    top: 6 + pulse.value * 3, left: 6 + pulse.value * 3,
  }));

  function retry() {
    started.current = false;
    router.replace(`/auth-callback?provider=${provider}`);
  }

  return (
    <View style={styles.page}>
      <View style={{ width: 58, height: 58, marginBottom: 24 }}>
        <Animated.View pointerEvents="none" style={[styles.shadow, shadowStyle]} />
        <Animated.View style={[styles.iconBox, iconStyle]}>
          <Icon name="all" size={28} color={colors.white} />
        </Animated.View>
      </View>

      {active.error ? (
        <>
          <Text style={styles.title}>Sign-in didn't go through</Text>
          <Text style={styles.error}>{active.error}</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
            <NeoButton onPress={() => router.replace('/sign-in')}>
              <Text style={styles.btnText}>Back</Text>
            </NeoButton>
            <NeoButton onPress={retry} variant="primary">
              <Text style={[styles.btnText, { color: colors.white }]}>Try again</Text>
            </NeoButton>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.title}>Signing you in…</Text>
          <Text style={styles.subtitle}>
            {provider === 'google' ? 'Connecting your Google account' : 'Connecting your Cobinar account'}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', padding: 32 },
  shadow: { position: 'absolute', width: 58, height: 58, backgroundColor: colors.ink },
  iconBox: {
    width: 58, height: 58, backgroundColor: colors.orange, borderWidth: 3, borderColor: colors.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 6, textAlign: 'center' },
  error: { fontSize: 13, color: colors.red, marginTop: 8, textAlign: 'center', maxWidth: 300 },
  btnText: { fontSize: 14, fontWeight: '700', color: colors.text },
});
