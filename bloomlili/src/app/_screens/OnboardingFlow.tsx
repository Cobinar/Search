// app/_screens/OnboardingFlow.tsx — rendered directly by _layout.tsx, not a route.

import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { createProfile, uniqueBloomId, type Profile } from '../../lib/bloomlili';
import { NBButton, NBInput, AvatarGrid, nb } from '../../lib/ui';

type OnboardStep = 'name' | 'avatar' | 'bloomid';

export default function OnboardingFlow({
  db, user, prefilledName, onDone, onError,
}: { db: Firestore; user: User; prefilledName: string; onDone: (p: Profile) => void; onError: (msg: string) => void }) {
  const [step, setStep] = useState<OnboardStep>('name');
  const [name, setName] = useState(prefilledName);
  const [nameErr, setNameErr] = useState<string | null>(null);
  const [avaIdx, setAvaIdx] = useState(0);
  const [bloomId, setBloomId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const goAvatar = useCallback(async () => {
    const v = name.trim();
    if (v.length < 2 || v.length > 32) { setNameErr('Name must be 2–32 characters.'); return; }
    setNameErr(null); setName(v); setStep('avatar');
  }, [name]);

  const goBloomId = useCallback(async () => {
    try {
      const id = bloomId ?? (await uniqueBloomId(db));
      setBloomId(id); setStep('bloomid');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not generate a Bloom ID.');
    }
  }, [db, bloomId, onError]);

  const finish = useCallback(async () => {
    if (!bloomId) return;
    setSaving(true);
    try {
      const profile = await createProfile(db, user, name, bloomId, avaIdx);
      onDone(profile);
    } catch (err) {
      setSaving(false);
      onError(err instanceof Error ? err.message : 'Could not create your profile.');
    }
  }, [db, user, name, bloomId, avaIdx, onDone, onError]);

  if (step === 'name') {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={nb.screenPad} keyboardShouldPersistTaps="handled">
          <Text style={nb.stepTitle}>Your Name</Text>
          <Text style={nb.stepSub}>How others will see you in Bloomlili.</Text>
          <Text style={[nb.label, { marginTop: 14 }]}>Display name</Text>
          <NBInput value={name} onChangeText={setName} placeholder="e.g. Marc" maxLength={32} errorText={nameErr} />
          <View style={{ marginTop: 14 }}><NBButton label="Continue →" onPress={goAvatar} /></View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }
  if (step === 'avatar') {
    return (
      <ScrollView contentContainerStyle={nb.screenPad}>
        <Text style={nb.stepTitle}>Pick an Avatar</Text>
        <Text style={nb.stepSub}>Your chat picture — you can change it later.</Text>
        <AvatarGrid value={avaIdx} onChange={setAvaIdx} />
        <View style={{ marginTop: 16 }}><NBButton label="Looks Good →" onPress={goBloomId} /></View>
      </ScrollView>
    );
  }
  return (
    <ScrollView contentContainerStyle={nb.screenPad}>
      <Text style={nb.stepTitle}>Your Bloom ID</Text>
      <Text style={nb.stepSub}>Permanent unique identifier. Save it to restore your account on any device.</Text>
      <View style={nb.bidBox}><Text style={nb.bidHash}>#</Text><Text style={nb.bidVal}>{bloomId ?? '——————————'}</Text></View>
      <View style={nb.warnBox}><Text style={nb.warnText}>📋 Screenshot this or write it down — you need it to restore your account on a new device.</Text></View>
      <View style={{ marginTop: 16 }}><NBButton label="Done, Enter Bloomlili →" onPress={finish} loading={saving} /></View>
    </ScrollView>
  );
}
