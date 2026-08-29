// app/settings.tsx — real separate route, pushed via router.push('/settings')
// from Profile. Being outside the (tabs) group is what makes the tab bar
// genuinely disappear here — no z-index management, it's just how Stack
// screens outside a Tabs group work.

import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { useBloomAuth } from '../lib/AuthContext';
import { fbAuth, L } from '../lib/bloomlili';
import { ScreenHeader, SparkIcon, SignOutIcon, ChevronRight, nb } from '../lib/ui';

export default function SettingsScreen() {
  const { profile } = useBloomAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const doSignOut = useCallback(async () => {
    if (!fbAuth) return;
    setSigningOut(true);
    try { await signOut(fbAuth); } catch (err) { setSigningOut(false); console.warn('[Bloomlili] sign out failed (non-fatal):', err); }
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: L.bg }}>
      <ScreenHeader title="Settings" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={s.sectionLabel}>Account</Text>
        <View style={s.card}>
          <View style={s.row}><Text style={s.rowLabel}>Bloom ID</Text><Text style={s.rowValue}>#{profile.bloomId}</Text></View>
          <View style={s.divider} />
          <View style={s.row}><Text style={s.rowLabel}>Email</Text><Text style={s.rowValue}>{profile.email ?? 'Anonymous account'}</Text></View>
          <View style={s.divider} />
          <View style={s.row}><Text style={s.rowLabel}>Language</Text><Text style={s.rowValue}>{profile.lang === 'en' ? 'English' : profile.lang}</Text></View>
        </View>

        <Text style={s.sectionLabel}>Bloomlili</Text>
        <Pressable onPress={() => router.push('/spark')} style={({ pressed }) => [s.card, s.pressableRow, pressed && nb.btnPressed]}>
          <SparkIcon /><Text style={[s.rowLabel, { flex: 1, marginLeft: 10 }]}>Get Spark Premium</Text><ChevronRight />
        </Pressable>
        <Pressable onPress={doSignOut} disabled={signingOut} style={({ pressed }) => [s.card, s.pressableRow, pressed && nb.btnPressed, { marginTop: 12 }]}>
          {signingOut ? <ActivityIndicator size="small" color={L.error} /> : <SignOutIcon color={L.error} />}
          <Text style={[s.rowLabel, { flex: 1, marginLeft: 10, color: L.error }]}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  sectionLabel: { fontSize: 11, fontWeight: '800', color: L.sub, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginTop: 18 },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 2, borderColor: L.ink, padding: 4 },
  pressableRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12 },
  rowLabel: { fontSize: 13.5, fontWeight: '700', color: L.ink },
  rowValue: { fontSize: 13, color: L.sub, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#EEE', marginHorizontal: 12 },
});
