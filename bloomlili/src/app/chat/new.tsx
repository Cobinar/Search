// app/chat/new.tsx — start a DM by Bloom ID lookup

import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useBloomAuth } from '../../lib/AuthContext';
import { fbDb, loadDms, findOrCreateDm, L } from '../../lib/bloomlili';
import { ScreenHeader, NBButton, NBInput, nb } from '../../lib/ui';

export default function NewDmScreen() {
  const { profile } = useBloomAuth();
  const router = useRouter();
  const [bloomId, setBloomId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = useCallback(async () => {
    if (bloomId.trim().length !== 10 || !fbDb) { setError('Bloom IDs are 10 characters.'); return; }
    setBusy(true); setError(null);
    try {
      const existing = await loadDms(fbDb, profile.uid);
      const dm = await findOrCreateDm(fbDb, profile, existing, bloomId);
      const otherUid = dm.participants.find((u) => u !== profile.uid)!;
      const other = dm.participantData[otherUid];
      router.replace({ pathname: '/chat/[dmId]', params: { dmId: dm.id, name: other.displayName, avatarIdx: String(other.avatarIdx), avatarUrl: other.avatarUrl ?? '' } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start a conversation.');
    } finally {
      setBusy(false);
    }
  }, [bloomId, profile, router]);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: L.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="New Message" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
        <Text style={nb.stepSub}>Enter their Bloom ID to start a conversation.</Text>
        <Text style={[nb.label, { marginTop: 16 }]}>Bloom ID</Text>
        <NBInput
          value={bloomId}
          onChangeText={(t) => setBloomId(t.toUpperCase())}
          placeholder="XXXXXXXXXX"
          autoCapitalize="characters"
          maxLength={10}
          style={{ fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', letterSpacing: 2 }}
          errorText={error}
        />
        <View style={{ marginTop: 16 }}><NBButton label="Start Conversation" onPress={submit} loading={busy} disabled={bloomId.length !== 10} /></View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
